/**
 * One analysis for one run folder. Used by `run.mjs gate` and by the report,
 * so the verdict and the page cannot disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { INTERVIEW } from './interview60.questions.mjs';
import { overlap, logSince } from './interview60.lib.mjs';

const CONTAMINATED = ['[2026-09-02T16:21:50'];
const ts = (s) => Date.parse(s);
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
// stt life/gap stats are seconds rounded to one decimal, distinct from pct()'s
// unrounded pick — moved verbatim from the report generator.
const q10 = (a, p) => (a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * p))] * 10) / 10 : null);

export function computeRun(dir) {
    return {
        dir,
        ...computeRunFromFiles({
            debugLog: path.join(dir, 'natively_debug.log'),
            diagLog: path.join(dir, 'verbal-diag.log'),
            timelinePath: path.join(dir, 'interview60.timeline.json'),
            answersPath: path.join(dir, 'interview60.answers.json'),
        }),
    };
}

/**
 * Same analysis, with each input named explicitly — the live checkout's files
 * don't follow the run-dir naming convention (debug/diag logs live at the
 * project root, timeline/answers beside this script). computeRun(dir) is a
 * thin wrapper over this for a snapshotted run folder.
 *
 * Returns the RunMetrics contract used by `gate` and the headline numbers
 * (dir, startedAt, endedAt, durationMin, items, heard, answered,
 * answersToNobody, surfacedMax, surfacedMulti, invented, raceLosses,
 * sttCloses, lostUtterances, fragmentChips, coachingAnswers, codingForSpoken,
 * expiryLoops, liveReconnects, detectP50, ttftP90, ttftSource) plus a few
 * extra fields (stats, stt, routes, redirects, hardFails, liveQ, orphanLive,
 * cues, answersPass, detectP90) that only the report's findings/tables prose
 * needs — kept here so that prose and the gate never re-derive the same
 * numbers two different ways.
 */
export function computeRunFromFiles({ debugLog, diagLog, timelinePath, answersPath }) {
    const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
    const dbg = logSince(debugLog, timeline.startDebug, timeline.endDebug);
    const diag = logSince(diagLog, timeline.startDiag, timeline.endDiag)
        .split('\n').filter((l) => !CONTAMINATED.some((p) => l.startsWith(p))).join('\n');
    const answers = fs.existsSync(answersPath) ? JSON.parse(fs.readFileSync(answersPath, 'utf8')) : null;

    // — parse (moved verbatim from the report generator) —
    const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], mode: m[3], heard: m[4] }));
    const suppressed = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] suppressed duplicate live question \(already surfaced by (\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), by: m[2], heard: m[3] }));
    const whisperFwd = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] forwarding detected-question → renderer \(win=\w+\) intent=(\w+) q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], heard: m[3] }));
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?/gm)]
        .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5], duplicateOf: m[6] ?? null, answered: m[7] === 'true' }));
    const routes = [...diag.matchAll(/^\[(\S+)\] route: ([^\n]+)/gm)].map((m) => ({ at: ts(m[1]), route: m[2].trim() }));
    const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: ts(m[1]), ms: Number(m[2]) }));
    const redirects = [...diag.matchAll(/verbal primary FAILED pre-token: ([^\n]*)/g)].map((m) => m[1]);
    const hardFails = [...diag.matchAll(/generateStream FAILED[^\n]*/g)].map((m) => m[0]);
    const count = (re, s = dbg) => (s.match(re) || []).length;
    // Reconnect cadence: the intervals between "reconnecting" lines. A near-constant
    // interval is a server-side session limit (goAway), not instability.
    const reconnectAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live Mode status: reconnecting/gm)].map((m) => ts(m[1]));
    const reconnectGaps = reconnectAt.slice(1).map((t, i) => (t - reconnectAt[i]) / 1000).sort((a, b) => a - b);
    const stats = {
        reconnects: count(/Live Mode status: reconnecting/g),
        reconnectMedianGapS: reconnectGaps.length ? Math.round(reconnectGaps[Math.floor(reconnectGaps.length / 2)]) : null,
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

    // — the STT socket (Deepgram): closed by the server every ~12 s, all hour —
    const sttClosedAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Closed \(code=1011/gm)].map((m) => ts(m[1]));
    const sttOpenAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Connected/gm)].map((m) => ts(m[1]));
    const sttReconnectAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Reconnecting in/gm)].map((m) => ts(m[1]));
    const sttGaps = sttClosedAt.slice(1).map((t, i) => (t - sttClosedAt[i]) / 1000).sort((a, b) => a - b);
    // lifetime of each socket: its Connected line → its Closed line
    const sttLife = sttClosedAt.map((c) => { const o = sttOpenAt.filter((t) => t < c).pop(); return o ? (c - o) / 1000 : null; }).filter((x) => x != null).sort((a, b) => a - b);
    const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    const partials = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=false, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    // an empty final whose most recent partial (inside 12 s, and after the last real
    // final) had words: Deepgram had the utterance and then dropped it
    const lostUtterances = finals.filter((f) => !f.text).map((f) => {
        const lastPartial = partials.filter((p) => p.at < f.at && f.at - p.at < 12000).pop();
        const lastFinal = finals.filter((g) => g.at < f.at && g.text).pop();
        return lastPartial && (!lastFinal || lastPartial.at > lastFinal.at) ? { at: f.at, text: lastPartial.text } : null;
    }).filter(Boolean);
    const stt = {
        closes: sttClosedAt.length,
        gapMedianS: q10(sttGaps, .5),
        lifeP10: q10(sttLife, .1),
        lifeP90: q10(sttLife, .9),
        finals: finals.filter((f) => f.text).length,
        emptyFinals: finals.filter((f) => !f.text).length,
        finalsAfterReconnect: finals.filter((f) => f.text && sttReconnectAt.some((r) => f.at - r >= 0 && f.at - r <= 3000)),
        lostUtterances,
    };

    // — attribute detections to the questions that were played —
    const hasDispatch = dispatches.length > 0;
    const spoken = timeline.items.filter((i) => i.kind === 'spoken');
    const claimedLive = new Set();
    const claimedDispatches = new Set();
    const items = spoken.map((it) => {
        const spokeEnd = it.playedAt + Math.round(it.clipSecs * 1000);
        const win = (ev) => ev.at >= it.playedAt - 2000 && ev.at <= spokeEnd + 60000;
        const best = (list, key = 'heard') => {
            const c = list.filter(win).map((e) => ({ e, ov: overlap(e[key], it.q) })).sort((a, b) => b.ov - a.ov);
            if (!c.length) return null;
            if (c[0].ov >= 0.3) return c[0].e;
            return c.length === 1 && c[0].ov >= 0.15 ? c[0].e : null;
        };
        if (hasDispatch) {
            const mine = dispatches.filter(win).filter((d) => overlap(d.anchor, it.q) >= 0.15 || overlap(it.q, d.anchor) >= 0.15);
            mine.forEach((d) => claimedDispatches.add(d));
            const ans = mine.find((d) => d.action === 'answer') ?? null;
            const route = ans ? routes.find((r) => r.at >= ans.at && r.at <= ans.at + 4000) ?? null : null;
            const sources = new Set(mine.map((d) => d.source));
            const heardBy = sources.size === 2 ? 'both' : sources.size === 1 ? [...sources][0] : null;
            const surfaced = mine.filter((d) => d.action !== 'drop').length;
            return { ...it, spokeEnd, heardBy, answered: !!(ans && route), answeredAt: ans?.at ?? null,
                detectMs: mine.length ? Math.min(...mine.map((d) => d.at)) - spokeEnd : null,
                dispatches: surfaced, verdict: ans?.verdict ?? mine[0]?.verdict ?? null,
                routeCoding: !!(route && /^CODING/.test(route.route)),
                raceLoss: mine.some((d) => d.action === 'drop' && !d.answered) && !ans };
        }
        // baseline attribution (no dispatch lines): the report's original rule
        const live = best(liveQ);
        if (live) claimedLive.add(live);
        const sup = live ? suppressed.find((s) => Math.abs(s.at - live.at) < 50) ?? null : null;
        const wf = best(whisperFwd);
        const route = live && !sup ? routes.find((r) => r.at >= live.at && r.at <= live.at + 4000) ?? null : null;
        const heardBy = live && wf ? 'both' : live ? 'live' : wf ? 'whisper' : null;
        return { ...it, spokeEnd, heardBy, answered: !!route, answeredAt: live?.at ?? null,
            detectMs: live ? live.at - spokeEnd : wf ? wf.at - spokeEnd : null,
            dispatches: (live && !sup ? 1 : 0) + (wf ? 1 : 0), verdict: null,
            routeCoding: !!(route && /^CODING/.test(route.route)),
            raceLoss: !!(live && sup) };
    });

    // Live lines claimed by no item: an invented question, or a paraphrase too
    // far from anything played to attribute. Never counted as a hit either way.
    // Only meaningful for the baseline rule — a dispatch-based run has already
    // decided, per line, whether a detection was a duplicate or a replacement.
    const orphanLive = hasDispatch ? [] : liveQ.filter((q) => !claimedLive.has(q) && !suppressed.some((s) => Math.abs(s.at - q.at) < 50))
        // compared against every item played, cues included — the cue sentences were spoken aloud too
        .map((q) => ({ ...q, bestOv: Math.max(0, ...timeline.items.map((i) => overlap(q.heard, i.q))) }));
    const invented = hasDispatch ? dispatches.filter((d) => d.verdict === 'replaced').length : orphanLive.filter((q) => q.bestOv < 0.3).length;
    // An answer produced for something that isn't one of the played questions:
    // an orphan Live line (baseline) or an orphan dispatch (after) that still
    // reached an answer/route — the "to nobody" count the gate wants at 0.
    const answersToNobody = hasDispatch
        ? dispatches.filter((d) => d.action === 'answer' && !claimedDispatches.has(d)).length
        : orphanLive.filter((q) => routes.some((r) => r.at >= q.at && r.at <= q.at + 4000)).length;

    const heard = items.filter((i) => i.heardBy !== null).length;
    const answered = items.filter((i) => i.answered).length;
    const raceLosses = items.filter((i) => i.raceLoss).length;
    const codingForSpoken = items.filter((i) => i.answered && i.routeCoding).length;
    // both detectors independently surfacing a chip for the same question —
    // dispatches already folds in the dedupe (a suppressed/dropped source
    // doesn't add to the count), so >1 here is exactly "two chips on screen".
    const surfacedMulti = items.filter((i) => i.dispatches > 1).length;
    const surfacedMax = items.length ? Math.max(...items.map((i) => i.dispatches)) : 0;

    const complete = !!timeline.endedAt;
    const durationMin = complete ? ((ts(timeline.endedAt) - timeline.startedMs) / 60000).toFixed(1) : null;

    const detMs = items.map((i) => i.detectMs).filter((x) => x != null && x > -5000).sort((a, b) => a - b);
    const detectP50 = pct(detMs, .5);
    const detectP90 = pct(detMs, .9);

    // ttft: in-app from verbal-diag's "first token" lines when present (the
    // after-run), else from the answer-only pass's scored ttft (the before-run
    // has neither Live in-app timing nor any way to score it live).
    const ttftSource = firstTokens.length ? 'in-app' : (answers ? 'answer-only' : null);
    const ttftMs = firstTokens.length ? firstTokens.map((f) => f.ms).sort((a, b) => a - b)
        : (answers ? Object.values(answers).filter((v) => v.spoken).map((v) => v.ttft).sort((a, b) => a - b) : []);
    const ttftP90 = pct(ttftMs, .9);

    // — answer-only pass (scored quality) —
    let answersPass = null;
    if (answers) {
        const done = Object.values(answers).filter((v) => v.spoken);
        const tr = Object.values(answers).filter((v) => v.transientError);
        const ttft = done.map((v) => v.ttft).sort((a, b) => a - b), total = done.map((v) => v.total).sort((a, b) => a - b), ws = done.map((v) => v.words).sort((a, b) => a - b);
        const checks = done.length ? Object.keys(done[0].checks) : [];
        answersPass = {
            n: done.length, transient: tr.length,
            ttft: { p50: pct(ttft, .5), p90: pct(ttft, .9), max: ttft.at(-1) },
            total: { p50: pct(total, .5), p90: pct(total, .9), max: total.at(-1) },
            words: { median: pct(ws, .5), max: ws.at(-1), over: ws.filter((w) => w > 70).length },
            checks: Object.fromEntries(checks.map((c) => [c, done.filter((v) => v.checks[c]).length])),
            samples: done.slice(0, 3),
            finish: done.reduce((a, v) => ({ ...a, [v.finish]: (a[v.finish] || 0) + 1 }), {}),
        };
    }

    const cues = timeline.items.filter((i) => i.kind !== 'spoken');

    return {
        startedAt: timeline.startedAt, endedAt: timeline.endedAt, durationMin, items,
        heard, answered, answersToNobody, surfacedMax, surfacedMulti, invented, raceLosses,
        sttCloses: stt.closes, lostUtterances: stt.lostUtterances.length, fragmentChips: stt.finalsAfterReconnect.length,
        coachingAnswers: stats.coachingBlobs, codingForSpoken, expiryLoops: stats.expired, liveReconnects: stats.reconnects,
        detectP50, ttftP90, ttftSource,
        // extra — feed the report's findings prose and tables; not part of the gate
        detectP90, stats, stt, routes, redirects, hardFails, liveQ, orphanLive, cues, answersPass,
    };
}

export const GATE = [
    { key: 'answered', label: 'Answered hands-free', before: '26/52', pass: (m) => m.answered >= 50 && m.answersToNobody === 0, show: (m) => `${m.answered}/${m.items.length}, ${m.answersToNobody} to nobody` },
    { key: 'heard', label: 'Heard by either detector', before: '51/52', pass: (m) => m.heard >= 51, show: (m) => `${m.heard}/${m.items.length}` },
    { key: 'surfaced', label: 'Surfaced detections per question', before: '12 doubles, 1 invented', pass: (m) => m.surfacedMulti === 0 && m.invented === 0, show: (m) => `${m.surfacedMulti} doubles, ${m.invented} invented` },
    { key: 'stt', label: 'STT socket closes / lost utterances / fragment chips', before: '299 / 2 / 5', pass: (m) => m.sttCloses <= 5 && m.lostUtterances === 0 && m.fragmentChips === 0, show: (m) => `${m.sttCloses} / ${m.lostUtterances} / ${m.fragmentChips}` },
    { key: 'coaching', label: 'Technical questions answered via the coaching path', before: '25', pass: (m) => m.coachingAnswers === 0, show: (m) => String(m.coachingAnswers) },
    { key: 'coding', label: 'Spoken questions routed CODING', before: '4 routes (2 of them screenshot cues)', pass: (m) => m.codingForSpoken === 0, show: (m) => String(m.codingForSpoken) },
    { key: 'expiry', label: 'Live expiry loops', before: '0', pass: (m) => m.expiryLoops === 0, show: (m) => String(m.expiryLoops) },
    { key: 'latency', label: 'Answer TTFT p90 · detect p50', before: '3.7 s (answer-only pass) · 4.1 s', pass: (m) => (m.ttftP90 ?? Infinity) <= 5000 && (m.detectP50 ?? Infinity) <= 5000, show: (m) => `${m.ttftP90 == null ? '—' : (m.ttftP90 / 1000).toFixed(1) + ' s'}${m.ttftSource === 'answer-only' ? ' (answer-only pass)' : ''} · ${m.detectP50 == null ? '—' : (m.detectP50 / 1000).toFixed(1) + ' s'}` },
];

export function evaluateGate(m) {
    const rows = GATE.map((g) => ({ label: g.label, before: g.before, value: g.show(m), pass: g.pass(m) }));
    return { rows, pass: rows.every((r) => r.pass) };
}
