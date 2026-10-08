// Throwaway (2026-09-29): read an app hour for the boundary repair (run folder of interview60.run.mjs auto).
//   1. every "boundary repair: restored" line the APP logged;
//   2. the reference rule (rule-v4.mjs) replayed over the same hour's RAW Deepgram lines with the v4 wiring
//      (a fresh state per "[DeepgramStreaming] Connected", clear() on an empty FINAL and on the app's
//      "[Main] turn: deepgram utterance-end" line): the app's repairs must equal the reference's one for one
//      (same words, same order) — the in-app module on live data, not only on the recordings. speech_final is
//      never logged, so a reference-only repair can be the app refusing a cut on speech_final: read that case
//      by hand before calling it a defect;
//   3. per repair: the scripted question playing, and the first answer dispatched after it — does the
//      dispatched question now hold the restored word(s)?
// (The |T| == 1 residual of the same hour: variants-scan.mjs, which reads every run folder.)
// Exit 0 when (2) matches and every repair's words reach a dispatched question; 1 on an app-only repair, an
// unreached repair, or no app repair at all while the reference has some; 4 when the only mismatches are
// reference-only (read by hand: speech_final?); 3 when the hour holds no repair at all (inconclusive).
//   node br1-read.mjs <run folder>
import fs from 'node:fs';
import path from 'node:path';
import { createRepair, tok } from './rule-v4.mjs';

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, 'natively_debug.log'))) { console.log('usage: br1-read.mjs <run folder with natively_debug.log>'); process.exit(2); }
const unq = (s) => JSON.parse(`"${s}"`);
const lines = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split('\n');
let items = [];
try { items = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items ?? []; } catch { console.log('WARN no timeline: items unknown'); }
const playing = (atMs) => items.find((i) => atMs >= i.playedAt - 500 && atMs <= i.playedAt + (i.clipSecs ?? 0) * 1000 + 3000);

const appRepairs = [], refRepairs = [], dispatches = [], hedge = { startup: [], wonBy: {} };
// refNC: the same reference WITHOUT any clear() — the difference is what the pause rule cost this hour
// (DESIGN §10.6: count the pauses between a cut and its next final).
const noClear = [];
let ref = createRepair(), refNC = createRepair(), lastPause = null;
for (const l of lines) {
    const ts = Date.parse(l.slice(0, 24));
    if (l.includes('[DeepgramStreaming] Connected')) { ref = createRepair(); refNC = createRepair(); continue; }
    if (/ \[LOG\] \[Main\] turn: deepgram utterance-end /.test(l)) { ref.clear(); lastPause = 'utterance-end'; continue; }
    let h = l.match(/\[Main\] verbal hedge: (on trigger=\d+ms|off)/);
    if (h) { hedge.startup.push(h[1]); continue; }
    h = l.match(/\[LLMHelper\] verbal hedge: won by (\S+) at \d+ms; other=/); // h40c-hedge-stats.mjs's form
    if (h) { hedge.wonBy[h[1]] = (hedge.wonBy[h[1]] ?? 0) + 1; continue; }
    let m = l.match(/\[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
    if (m) {
        // (empty) is how the adapter logs an undefined transcript; "" an empty one: an empty FINAL clears
        const text = m[2] === '(empty)' ? '' : unq(m[2]);
        if (!text) { if (m[1] === 'true') { ref.clear(); lastPause = 'empty final'; } continue; }
        const r = ref.onTranscript(text, m[1] === 'true', ts);
        if (r.restored) refRepairs.push({ at: ts, words: r.restored.join(' '), f2: text });
        const nc = refNC.onTranscript(text, m[1] === 'true', ts);
        if (nc.restored && !r.restored) noClear.push({ at: ts, words: nc.restored.join(' '), f2: text, pause: lastPause });
        if (m[1] === 'true') lastPause = null;
        continue;
    }
    m = l.match(/\[DeepgramStreaming\] boundary repair: restored "(.*?)" before "(.*)"/);
    if (m) { appRepairs.push({ at: ts, words: m[1], before: m[2] }); continue; }
    m = l.match(/\[Main\] dispatch: answer source=(\S+) .*question="(.*)"$/);
    if (m) dispatches.push({ at: ts, source: m[1], q: m[2] });
}
console.log(`app repair lines ${appRepairs.length}; reference repairs on the same raw events ${refRepairs.length}`);
// Pair by time and words, not by position: one reference-only repair (a speech_final refusal) must not
// shift every later pair. APP-ONLY = the app restored what the reference would not: a defect. REF-ONLY =
// the reference restored and the app did not: speech_final (unlogged) or a defect — read it by hand.
const hhmm = (at) => new Date(at).toISOString().slice(11, 23);
const used = new Set();
let appOnly = 0, refOnly = 0;
const rows = [];
for (const a of appRepairs) {
    const j = refRepairs.findIndex((r, k) => !used.has(k) && r.words === a.words && Math.abs(a.at - r.at) < 1000);
    if (j >= 0) { used.add(j); rows.push({ at: a.at, line: `MATCH    app "${a.words}" @${hhmm(a.at)} | ref "${refRepairs[j].words}" before "${refRepairs[j].f2.slice(0, 40)}" @${hhmm(refRepairs[j].at)}` }); }
    else { appOnly++; rows.push({ at: a.at, line: `APP-ONLY app "${a.words}" before "${a.before}" @${hhmm(a.at)} | ref - (DEFECT: the app restored what rule v4 would not)` }); }
}
refRepairs.forEach((r, k) => { if (!used.has(k)) { refOnly++; rows.push({ at: r.at, line: `REF-ONLY app - | ref "${r.words}" before "${r.f2.slice(0, 40)}" @${hhmm(r.at)} (speech_final on the cut final, or a defect: read by hand)` }); } });
rows.sort((x, y) => x.at - y.at).forEach((r) => console.log(r.line));
const mismatch = appOnly + refOnly;
// "Holds" = the restored word(s) directly followed by the first two tokens of the final they were put
// before, contiguous in the dispatched question: a bare word test passes on "and"/"to" by accident.
const hasSeq = (hay, needle) => {
    for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true;
    return false;
};
let reached = 0;
for (const a of appRepairs) {
    const item = playing(a.at);
    const d = dispatches.find((x) => x.at >= a.at);
    const ok = d && hasSeq(tok(d.q), [...tok(a.words), ...tok(a.before).slice(0, 2)]);
    if (ok) reached++;
    console.log(`\n"${a.words}" @${new Date(a.at).toISOString().slice(11, 23)}  item ${item ? `${item.id}: ${item.q.slice(0, 100)}` : '(none playing)'}`);
    console.log(`   next answer dispatch ${d ? `+${d.at - a.at} ms source=${d.source}: ${d.q.slice(0, 140)}` : '(none)'}  -> ${ok ? 'HOLDS the restored word(s)' : 'does NOT hold them'}`);
}
// The pause rule's cost: repairs the reference makes only when no clear() is applied (read each by hand: a
// pause between a cut and its next final is the rule working as designed, not a defect).
console.log(`\nPAUSE RULE: ${noClear.length} repair(s) the reference makes only without clear()${noClear.length ? ':' : ''}`);
for (const p of noClear) console.log(`   "${p.words}" before "${p.f2.slice(0, 40)}" @${new Date(p.at).toISOString().slice(11, 23)} — the last pause before it: ${p.pause ?? '(none logged since the cut: speech_final?)'}`);
// The committed extractor on this hour's REAL repair lines: it must parse the whole log without refusing, and
// every app repair must come back as a final that starts with the restored words (Task 5, finalsFrom).
let extractorOk = true;
try {
    const { finalsFrom } = await import('file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.turns-finals.mjs');
    const finals = finalsFrom(lines.join('\n'), 0);
    const carried = appRepairs.filter((a) => finals.some((f) => Math.abs(f.at - a.at) < 1000 && f.text.startsWith(`${a.words} `)));
    extractorOk = carried.length === appRepairs.length;
    console.log(`EXTRACTOR finalsFrom: ${finals.length} finals parsed, no refusal; app repairs replayed as "<restored> <raw>": ${carried.length}/${appRepairs.length}`);
} catch (e) { extractorOk = false; console.log(`EXTRACTOR finalsFrom REFUSED or failed: ${e.message}`); }
console.log(`\nHEDGE (the default flip, live): startup line(s) ${hedge.startup.length ? hedge.startup.join(', ') : 'NONE FOUND'}; answers won by ${Object.entries(hedge.wonBy).map(([k, v]) => `${k} ${v}`).join(', ') || 'none logged'}`);
console.log(`\nSUMMARY app ${appRepairs.length} / reference ${refRepairs.length}, app-only ${appOnly}, ref-only ${refOnly}; repairs reaching a dispatched question ${reached}/${appRepairs.length}`);
if (!appRepairs.length && !refRepairs.length) { console.log('INCONCLUSIVE: no repair this hour'); process.exit(3); }
// No app repair at all while the reference has some: the module is not running (a pre-fix build), not speech_final.
if (appOnly || reached < appRepairs.length || !appRepairs.length || !extractorOk) process.exit(1);
if (refOnly) { console.log(`READ BY HAND: ${refOnly} reference-only repair(s), every app repair matched and reached its dispatch`); process.exit(4); }
process.exit(0);
