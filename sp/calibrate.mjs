// Throwaway calibration script — NOT part of the deliverable.
// Runs the OLD report-html.mjs regexes (verbatim) plus candidate NEW-metric
// heuristics against the REAL before-run fixture, to pin exact values before
// writing interview60.metrics.mjs.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-02-before';
const rd = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');

function logSince(file, from, to) {
    if (!fs.existsSync(file)) return '';
    const size = fs.statSync(file).size;
    const end = Math.min(to ?? size, size);
    if (end <= from) return '';
    const fd = fs.openSync(file, 'r');
    try {
        const buf = Buffer.alloc(end - from);
        fs.readSync(fd, buf, 0, buf.length, from);
        return buf.toString('utf8');
    } finally { fs.closeSync(fd); }
}

const timeline = JSON.parse(rd('interview60.timeline.json'));
const answers = JSON.parse(rd('interview60.answers.json'));
const dbg = logSince(path.join(DIR, 'natively_debug.log'), timeline.startDebug, timeline.endDebug);
const CONTAMINATED = ['[2026-09-02T16:21:50'];
const diag = logSince(path.join(DIR, 'verbal-diag.log'), timeline.startDiag, timeline.endDiag)
    .split('\n').filter((l) => !CONTAMINATED.some((p) => l.startsWith(p))).join('\n');

const ts = (s) => Date.parse(s);
const norm = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));
function overlap(a, b) {
    const A = norm(a), B = norm(b);
    if (!A.size) return 0;
    let hit = 0; for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], mode: m[3], heard: m[4] }));
const suppressed = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] suppressed duplicate live question \(already surfaced by (\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), by: m[2], heard: m[3] }));
const whisperFwd = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] forwarding detected-question → renderer \(win=\w+\) intent=(\w+) q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], heard: m[3] }));
const routes = [...diag.matchAll(/^\[(\S+)\] route: ([^\n]+)/gm)].map((m) => ({ at: ts(m[1]), route: m[2].trim() }));
const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?/gm)];
console.log('dispatch lines found:', dispatches.length, '(expect 0 for baseline)');

const count = (re, s = dbg) => (s.match(re) || []).length;
const reconnectAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live Mode status: reconnecting/gm)].map((m) => ts(m[1]));
const stats = {
    reconnects: count(/Live Mode status: reconnecting/g),
    whisperLostRace: count(/suppressed duplicate whisper chip \(already surfaced by live\)/g),
    liveLostRace: count(/suppressed duplicate live question \(already surfaced by whisper\)/g),
    expired: count(/session expired/g),
    liveFailed: count(/Live Mode status: failed/g),
    proAttempts: count(/Structured generation: trying Gemini Pro/g),
    pro429: count(/Transient error \(429\)/g),
    coachingBlobs: count(/__negotiationCoaching/g),
    classifiedNegotiation: count(/Intent classified: negotiation/g),
    classifiedTotal: count(/Intent classified:/g),
};
console.log('stats:', stats);

// suppressed line count (all, raw)
console.log('suppressed.length (raw duplicate-live lines):', suppressed.length);

// STT
const sttClosedAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Closed \(code=1011/gm)].map((m) => ts(m[1]));
const sttOpenAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Connected/gm)].map((m) => ts(m[1]));
const sttReconnectAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Reconnecting in/gm)].map((m) => ts(m[1]));
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
const partials = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=false, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
const lostUtterances = finals.filter((f) => !f.text).map((f) => {
    const lastPartial = partials.filter((p) => p.at < f.at && f.at - p.at < 12000).pop();
    const lastFinal = finals.filter((g) => g.at < f.at && g.text).pop();
    return lastPartial && (!lastFinal || lastPartial.at > lastFinal.at) ? { at: f.at, text: lastPartial.text } : null;
}).filter(Boolean);
console.log('sttClosedAt.length (sttCloses):', sttClosedAt.length);
console.log('lostUtterances.length:', lostUtterances.length);
const finalsAfterReconnect = finals.filter((f) => f.text && sttReconnectAt.some((r) => f.at - r >= 0 && f.at - r <= 3000));
console.log('finalsAfterReconnect (fragment candidates from STT finals):', finalsAfterReconnect.length, finalsAfterReconnect.map(f=>f.text));

// items attribution (baseline rule, exact copy)
const spoken = timeline.items.filter((i) => i.kind === 'spoken');
const items = spoken.map((it) => {
    const spokeEnd = it.playedAt + Math.round(it.clipSecs * 1000);
    const win = (ev) => ev.at >= it.playedAt - 2000 && ev.at <= spokeEnd + 60000;
    const best = (list, key = 'heard') => {
        const c = list.filter(win).map((e) => ({ e, ov: overlap(e[key], it.q) })).sort((a, b) => b.ov - a.ov);
        if (!c.length) return null;
        if (c[0].ov >= 0.3) return c[0].e;
        return c.length === 1 && c[0].ov >= 0.15 ? c[0].e : null;
    };
    const live = best(liveQ);
    const sup = live ? suppressed.find((s) => Math.abs(s.at - live.at) < 50) ?? null : null;
    const wf = best(whisperFwd);
    const route = live && !sup ? routes.find((r) => r.at >= live.at && r.at <= live.at + 4000) ?? null : null;
    const heardBy = live && wf ? 'both' : live ? 'live' : wf ? 'whisper' : null;
    return { ...it, spokeEnd, heardBy, answered: !!route, answeredAt: live?.at ?? null,
        detectMs: live ? live.at - spokeEnd : wf ? wf.at - spokeEnd : null,
        dispatches: (live && !sup ? 1 : 0) + (wf ? 1 : 0), verdict: null, route,
        routeCoding: !!(route && /^CODING/.test(route.route)),
        raceLoss: !!(live && sup) };
});

console.log('\n=== items.length', items.length);
console.log('heard (heardBy != null):', items.filter(i => i.heardBy !== null).length);
console.log('answered:', items.filter(i => i.answered).length);
console.log('heardBy null ids:', items.filter(i => i.heardBy === null).map(i => i.id));
console.log('raceLoss (per-item, live&&sup) count:', items.filter(i => i.raceLoss).length);
console.log('codingForSpoken (answered && routeCoding):', items.filter(i => i.answered && i.routeCoding).length);
console.log('surfacedMulti (dispatches===2):', items.filter(i => i.dispatches === 2).length);

// doubleChips old definition
const claimed = new Set(items.map((i) => i.live).filter(Boolean));
// need live/wf refs -> recompute with them retained
const items2 = spoken.map((it) => {
    const spokeEnd = it.playedAt + Math.round(it.clipSecs * 1000);
    const win = (ev) => ev.at >= it.playedAt - 2000 && ev.at <= spokeEnd + 60000;
    const best = (list, key = 'heard') => {
        const c = list.filter(win).map((e) => ({ e, ov: overlap(e[key], it.q) })).sort((a, b) => b.ov - a.ov);
        if (!c.length) return null;
        if (c[0].ov >= 0.3) return c[0].e;
        return c.length === 1 && c[0].ov >= 0.15 ? c[0].e : null;
    };
    const live = best(liveQ);
    const sup = live ? suppressed.find((s) => Math.abs(s.at - live.at) < 50) ?? null : null;
    const wf = best(whisperFwd);
    return { ...it, live, sup, wf };
});
const claimed2 = new Set(items2.map((i) => i.live).filter(Boolean));
const orphanLive = liveQ.filter((q) => !claimed2.has(q) && !suppressed.some((s) => Math.abs(s.at - q.at) < 50))
    .map((q) => ({ ...q, bestOv: Math.max(0, ...timeline.items.map((i) => overlap(q.heard, i.q))) }));
const invented = orphanLive.filter((q) => q.bestOv < 0.3);
const doubleChips = items2.filter((i) => i.live && i.wf && !i.sup);
console.log('orphanLive.length:', orphanLive.length);
console.log('invented.length:', invented.length, invented.map(q=>q.heard));
console.log('doubleChips.length:', doubleChips.length);

// answersToNobody candidate: orphanLive entries that got a route within 4s
const answersToNobody = orphanLive.filter((q) => routes.some((r) => r.at >= q.at && r.at <= q.at + 4000)).length;
console.log('answersToNobody candidate (orphanLive w/ a route in 4s):', answersToNobody);

// whisperFwd fragment candidates: texts that look like a fragment (start with And/So/pronoun-verb, no clear subject)
console.log('\n=== whisperFwd texts (all', whisperFwd.length, ') ===');
whisperFwd.forEach((w, i) => console.log(i, JSON.stringify(w.heard)));

console.log('\n=== liveQ texts (all', liveQ.length, ') ===');
liveQ.forEach((w, i) => console.log(i, w.intent, JSON.stringify(w.heard)));

// diag route lines & first token presence
console.log('\nroutes.length', routes.length, 'CODING routes:', routes.filter(r=>/^CODING/.test(r.route)).length);
const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)];
console.log('firstTokens.length (expect 0 for before-run):', firstTokens.length);

// answers-based ttft (answer-only pass)
const done = Object.values(answers).filter((v) => v.spoken);
const ttftArr = done.map((v) => v.ttft).sort((a,b)=>a-b);
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
console.log('answers ttft p90:', pct(ttftArr, .9), 'n done:', done.length);

const detMs = items.map(i=>i.detectMs).filter(x=>x!=null && x > -5000).sort((a,b)=>a-b);
console.log('detectP50 (old detMs p50):', pct(detMs,.5));
