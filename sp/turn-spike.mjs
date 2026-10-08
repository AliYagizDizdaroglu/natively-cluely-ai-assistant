// THROWAWAY SPIKE: would a VAD-gated "interviewer turn" tracker have answered each s50a
// question once, whole, and after the interviewer stopped? Replays the REAL events of a run —
// speech on/off from the clip audio, every Deepgram final, every detector fire (Live and STT,
// as logged at dispatch) — through a prototype of the state machine in the spec, and scores
// the result against the scripted questions. Nothing here touches the app.
//
//   node turn-spike.mjs <run-dir> <tts-dir> [gateMs=1200] [holdMs=2500] [contMs=8000] [settleMs=400]
import fs from 'node:fs';
import path from 'node:path';

const [, , RUN, TTS, gateArg, holdArg, contArg, settleArg] = process.argv;
const GATE = Number(gateArg ?? 1200), HOLD = Number(holdArg ?? 2500), CONT = Number(contArg ?? 8000), SETTLE = Number(settleArg ?? 400);
const ts = (s) => Date.parse(s);
const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
const tl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
// OFFSET_MS: the runner stamps startedMs BEFORE spawning PowerShell + SoundPlayer; measured 2026-09-09:
// PowerShell body runs 0.67–0.89 s after spawn, SoundPlayer adds ~0.2–0.4 s → the audio really starts
// ~1.1 s after startedMs (data-derived 1.06–1.27 s from the probe-vs-app interim/final lags).
const OFFSET = Number(process.env.OFFSET_MS ?? 0);
const items = tl.items.map((i) => ({ ...i, playedAt: tl.startedMs + OFFSET + i.startSec * 1000, spokeEnd: tl.startedMs + OFFSET + (i.startSec + i.clipSecs) * 1000, long: !!i.long || i.level === 'long' }));

// ── speech segments from the audio ──────────────────────────────────────────
function segments(file, at0) {
    const b = fs.readFileSync(file);
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    const pcm = b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4));
    const FR = 480; const n = Math.floor(pcm.length / 2 / FR);
    const sp = new Array(n);
    for (let f = 0; f < n; f++) { let s = 0; for (let k = 0; k < FR; k++) { const v = pcm.readInt16LE((f * FR + k) * 2); s += v * v; } sp[f] = Math.sqrt(s / FR) >= 300; }
    const out = []; let start = null, lastSpeech = null;
    for (let f = 0; f < n; f++) {
        if (sp[f]) { if (start === null) start = f; lastSpeech = f; }
        else if (start !== null && (f - lastSpeech) * 20 >= 250) { out.push({ on: at0 + start * 20, off: at0 + (lastSpeech + 1) * 20 }); start = null; }
    }
    if (start !== null) out.push({ on: at0 + start * 20, off: at0 + (lastSpeech + 1) * 20 });
    return out;
}
const events = [];
for (const it of items) for (const s of segments(path.join(TTS, `${it.id}.wav`), it.playedAt)) { events.push({ at: s.on, type: 'speech', on: true }); events.push({ at: s.off, type: 'speech', on: false }); }

// ── transcript finals and detector fires from the log ───────────────────────
const unq = (s) => JSON.parse(`"${s}"`);
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= tl.startedMs - 2000);
for (const f of finals) events.push({ at: f.at, type: 'final', text: f.text });
// Interims with text: Deepgram always finalises the segment its latest interim belongs to, so
// an interim newer than the last final means a final is still in flight — the gate waits for it.
const interims = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=false, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= tl.startedMs - 2000);
for (const f of interims) events.push({ at: f.at, type: 'interim' });
const dispatchRe = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*? question="((?:[^"\\]|\\.)*)")?/gm;
const logged = [...dbg.matchAll(dispatchRe)].map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: unq(m[4]), verdict: m[5], question: m[6] ? unq(m[6]) : '' })).filter((d) => d.at >= tl.startedMs - 2000);
for (const d of logged) events.push({ at: d.at, type: 'detected', source: d.source, text: d.anchor });
events.sort((a, b) => a.at - b.at || (a.type === 'speech' ? -1 : 1));

// ── the tracker prototype ───────────────────────────────────────────────────
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'your', 'you', 'we', 'our', 'my', 'i', 'would', 'how', 'what', 'which', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'should']);
const words = (s) => (s.toLowerCase().match(/[a-z0-9']+/g) ?? []);
const content = (s) => new Set(words(s).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script, text) => { const a = content(script), b = content(text); let hit = 0; for (const w of a) if (b.has(w)) hit++; return a.size ? hit / a.size : 1; };
const TRAIL = /\b(and|or|so|but|because|with|for|to|of|the|a|an|then|also|plus|versus|vs|including|like|such as|as)\s*$/i;
function finished(text) {
    const t = text.trim();
    const w = words(t);
    if (w.length < 4) return false;
    if (!/[.?!]$/.test(t)) return false;
    if (/,$/.test(t) || TRAIL.test(t.replace(/[.?!]$/, ''))) return false;
    const sentences = t.split(/(?<=[.?!])\s+/).filter(Boolean);
    if (sentences.length === 1 && /\.$/.test(t) && w.length <= 6) return false;   // a lead-in: "Let's do some code."
    return true;
}
let turn = null; const out = []; const turnLog = [];
const joined = () => turn.finals.map((f) => f.text).join(' ');
function openTurn(at) { turn = { startedAt: at, finals: [], lastSpeechAt: at, lastFinalAt: 0, lastInterimAt: 0, speaking: false, detected: false, dispatchedAt: null, pendingAfterDispatch: false }; }
const FINAL_WAIT_CAP = 2500;   // never wait longer than this for an in-flight final
function tick(now) {
    if (!turn) return;
    const finalInFlight = !process.env.NO_INFLIGHT && turn.lastInterimAt > turn.lastFinalAt && now - turn.lastInterimAt < FINAL_WAIT_CAP;
    const quiet = !turn.speaking && now - turn.lastSpeechAt >= GATE && now - turn.lastFinalAt >= SETTLE && !finalInFlight;
    if (turn.detected && !turn.dispatchedAt && quiet && turn.finals.length) {
        const text = joined();
        const fin = finished(text);
        if (fin || now - turn.lastSpeechAt >= GATE + HOLD) {
            out.push({ at: now, kind: 'dispatch', text, gate: now - turn.lastSpeechAt, finished: fin });
            turn.dispatchedAt = now; turn.pendingAfterDispatch = false;
        }
    } else if (turn.dispatchedAt && turn.pendingAfterDispatch && quiet) {
        const text = joined();
        out.push({ at: now, kind: 'supersede', text, gate: now - turn.lastSpeechAt, finished: finished(text) });
        turn.pendingAfterDispatch = false;
    }
    if (turn.dispatchedAt && !turn.speaking && now - turn.lastSpeechAt >= CONT && !turn.pendingAfterDispatch) { turnLog.push({ closedAt: now, finals: turn.finals.length }); turn = null; }
    else if (!turn.dispatchedAt && !turn.detected && !turn.speaking && now - turn.lastSpeechAt >= CONT) { turn = null; }
}
function nextTimer(after) {
    if (!turn || turn.speaking) return Infinity;
    const base = turn.lastSpeechAt;
    const c = [base + GATE, base + GATE + HOLD, base + CONT, turn.lastFinalAt + SETTLE, turn.lastInterimAt + FINAL_WAIT_CAP].filter((t) => Number.isFinite(t) && t > after);
    return c.length ? Math.min(...c) : Infinity;
}
let clock = events[0]?.at ?? 0;
for (let i = 0; i < events.length; i++) {
    const e = events[i];
    // fire timers that expire before this event
    for (let guard = 0; guard < 50; guard++) { const t = nextTimer(clock); if (t <= e.at) { clock = t; tick(clock); } else break; }
    clock = e.at;
    if (e.type === 'speech') {
        if (e.on) { if (turn && turn.dispatchedAt && !turn.pendingAfterDispatch && clock - turn.lastSpeechAt >= CONT) turn = null; if (!turn) openTurn(clock); turn.speaking = true; turn.lastSpeechAt = clock; }
        else if (turn) { turn.speaking = false; turn.lastSpeechAt = clock; }
    } else if (e.type === 'final') {
        if (!turn) openTurn(clock);
        turn.finals.push({ at: clock, text: e.text }); turn.lastFinalAt = clock;
        if (turn.dispatchedAt) turn.pendingAfterDispatch = true;
    } else if (e.type === 'interim') {
        if (turn) turn.lastInterimAt = clock;
    } else if (e.type === 'detected') {
        if (!turn) openTurn(clock);
        turn.detected = true;
    }
    tick(clock);
}
for (let guard = 0; guard < 50; guard++) { const t = nextTimer(clock); if (!Number.isFinite(t)) break; clock = t; tick(clock); }

// ── scoring: prototype vs what the app actually did ─────────────────────────
const spoken = items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
const windowOf = (it, k) => ({ from: it.playedAt - 2000, to: (items[k + 1]?.playedAt ?? it.spokeEnd + 90000) - 2000 });
const lagSamples = [], lagVoice = [], latVoice = [], trailing = [], onsetLag = [], actLatAll = [], actLatOnTime = [];
let once = 0, none = 0, multi = 0, supers = 0, early = 0, longs = 0, longWhole = 0, actualMulti = 0, actualEarly = 0, actualLongWhole = 0;
const lat = [], rows = [];
for (let k = 0; k < items.length; k++) {
    const it = items[k]; if ((it.kind ?? 'spoken') !== 'spoken') continue;
    const w = windowOf(it, k);
    const mine = out.filter((d) => d.at >= w.from && d.at < w.to);
    const disp = mine.filter((d) => d.kind === 'dispatch'), sup = mine.filter((d) => d.kind === 'supersede');
    const actual = logged.filter((d) => d.action === 'answer' && d.at >= w.from && d.at < w.to);
    const actualText = logged.filter((d) => (d.action === 'answer' || d.action === 'extend') && d.at >= w.from && d.at < w.to).map((d) => d.question || d.anchor).join(' ');
    const lastFinal = finals.filter((f) => f.at >= it.playedAt && f.at <= it.spokeEnd + 6000).at(-1);
    if (lastFinal) lagSamples.push(lastFinal.at - it.spokeEnd);
    // the same two numbers measured from the moment the VOICE stops (the clip carries trailing silence)
    const voiceOff = events.filter((e) => e.type === 'speech' && !e.on && e.at >= it.playedAt && e.at <= it.spokeEnd + 500).at(-1)?.at ?? it.spokeEnd;
    if (lastFinal) lagVoice.push(lastFinal.at - voiceOff);
    if (disp.length) latVoice.push(disp[0].at - voiceOff);
    trailing.push(it.spokeEnd - voiceOff);
    // what the app actually did, on the same clock: first answer dispatch after the voice stops
    if (actual.length) { actLatAll.push(actual[0].at - voiceOff); if (actual[0].at >= voiceOff) actLatOnTime.push(actual[0].at - voiceOff); }
    // input-side latency probe: voice onset of the clip → first interim with text
    const onset = events.find((e) => e.type === 'speech' && e.on && e.at >= it.playedAt)?.at;
    const firstInterim = onset ? interims.find((f) => f.at >= onset && f.at <= it.spokeEnd + 3000) : null;
    if (onset && firstInterim) onsetLag.push(firstInterim.at - onset);
    if (disp.length === 1) once++; else if (disp.length === 0) none++; else multi++;
    supers += sup.length;
    const finalText = (sup.at(-1) ?? disp.at(-1))?.text ?? '';
    const cov = coverage(it.q, finalText), acov = coverage(it.q, actualText);
    if (disp.length && disp[0].at < it.spokeEnd) early++;
    if (actual.length > 1) actualMulti++;
    if (actual.some((d) => d.at < it.spokeEnd)) actualEarly++;
    if (it.long) { longs++; if (cov >= 0.8) longWhole++; if (acov >= 0.8) actualLongWhole++; }
    if (disp.length) lat.push(disp[0].at - it.spokeEnd);
    const flag = disp.length !== 1 || sup.length || (it.long && cov < 0.8) || (disp.length && disp[0].at < it.spokeEnd);
    rows.push(`  ${it.id.padEnd(7)} ${String(it.level).padEnd(11)} proto: ${disp.length} dispatch ${sup.length} supersede, first ${disp.length ? ((disp[0].at - it.spokeEnd) / 1000).toFixed(1) + ' s' : '—'} after clip end${disp.length ? `, gate ${(disp[0].gate / 1000).toFixed(1)} s, ${disp[0].finished ? 'finished' : 'held'}` : ''}, coverage ${(cov * 100).toFixed(0)} %   | actual: ${actual.length} answers, ${actual.some((d) => d.at < it.spokeEnd) ? 'early' : 'on time'}, coverage ${(acov * 100).toFixed(0)} %${flag ? '   <<' : ''}`);
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[Math.min(s.length - 1, Math.floor(p * s.length))] / 1000).toFixed(2) : '—'; };
console.log(`${path.basename(RUN)}  gate ${GATE} ms, unfinished hold ${HOLD} ms, continuation ${CONT} ms, transcript settle ${SETTLE} ms`);
console.log(`events: ${events.filter((e) => e.type === 'speech' && e.on).length} speech segments, ${finals.length} finals, ${logged.length} detector fires (${logged.filter((d) => d.source === 'live').length} live)`);
console.log(`\nlast-final lag after the clip's speech ends: p50 ${pct(lagSamples, .5)} s  p90 ${pct(lagSamples, .9)} s  max ${pct(lagSamples, 1)} s   (n=${lagSamples.length})`);
console.log(`\n                          prototype     actual run`);
console.log(`items answered once       ${String(once).padStart(3)} / ${spoken.length}        ${spoken.length - actualMulti - 0} / ${spoken.length} (with ${actualMulti} doubled)`);
console.log(`items answered twice+     ${String(multi).padStart(3)}              ${actualMulti}`);
console.log(`items never answered      ${String(none).padStart(3)}`);
console.log(`supersedes (in place)     ${String(supers).padStart(3)}`);
console.log(`dispatched before clip end${String(early).padStart(3)}              ${actualEarly}`);
console.log(`long answered whole       ${String(longWhole).padStart(3)} / ${longs}         ${actualLongWhole} / ${longs}`);
console.log(`first dispatch after clip end: p50 ${pct(lat, .5)} s  p90 ${pct(lat, .9)} s  max ${pct(lat, 1)} s`);
console.log(`\nmeasured from the moment the voice stops (clips carry p50 ${pct(trailing, .5)} s of trailing silence):`);
console.log(`  last Deepgram final arrives:  p50 ${pct(lagVoice, .5)} s  p90 ${pct(lagVoice, .9)} s  max ${pct(lagVoice, 1)} s`);
console.log(`  prototype dispatches:         p50 ${pct(latVoice, .5)} s  p90 ${pct(latVoice, .9)} s  max ${pct(latVoice, 1)} s`);
console.log(`  actual app, all first answers: p50 ${pct(actLatAll, .5)} s  p90 ${pct(actLatAll, .9)} s  (n=${actLatAll.length}; negative = before the voice stopped)`);
console.log(`  actual app, only answers after the voice stopped: p50 ${pct(actLatOnTime, .5)} s  p90 ${pct(actLatOnTime, .9)} s  max ${pct(actLatOnTime, 1)} s  (n=${actLatOnTime.length})`);
console.log(`  first interim after the clip's voice onset: p50 ${pct(onsetLag, .5)} s  p90 ${pct(onsetLag, .9)} s  min ${pct(onsetLag, 0)} s  (n=${onsetLag.length})`);
console.log('\nper item (<< marks anything not "once, on time, whole"):');
console.log(rows.join('\n'));
