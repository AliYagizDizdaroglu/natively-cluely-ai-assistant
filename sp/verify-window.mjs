// THROWAWAY verification: replay the REAL reconcileLiveQuestion over the REAL interviewer
// transcript from after9, at the real Live-event timestamps, with the old fixed 15s window
// and the new sized one. Rebuilds recentInterviewerSpeech exactly as IntelligenceManager
// does (interims included, non-empty only, last 40 entries).
//
// Live's claim: taken from the dispatch line, which logs the question untruncated — that is
// Live's own text for every long question except L03, whose text the reconciler had already
// REPLACED before it was logged. L03 therefore uses the roster sentence as a stand-in, which
// is what Live was supposed to report, not what it did.
//
// Calibration: the OLD window must reproduce what the hour actually did (L03 replaced,
// the rest kept) or this replay is not modelling the app.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = path.join(ROOT, 'electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9');
const BUNDLE = process.argv[2];
const require = createRequire(import.meta.url);
const { reconcileLiveQuestion, reconcileWindowMs } = require(path.join(BUNDLE, 'questionReconcile.js'));

const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
const tl = JSON.parse(fs.readFileSync(path.join(D, 'interview60.timeline.json'), 'utf8')).items;

// The interviewer transcript, finals and interims, in order.
const speech = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
    if (!m) continue;
    let text; try { text = JSON.parse('"' + m[3] + '"'); } catch { text = m[3]; }
    if (!text.trim()) continue;
    speech.push({ text, at: Date.parse(m[1]), final: m[2] === 'true' });
}

// Live's dispatched text per long question: the dispatch line whose source is live.
const dispatch = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=live .*? question=("(?:[^"\\]|\\.)*")$/);
    if (m) dispatch.push({ at: Date.parse(m[1]), action: m[2], q: JSON.parse(m[3]) });
}

// IntelligenceManager keeps only the last 40 entries; reproduce that.
const bufferAt = (t) => {
    const seen = [];
    for (const s of speech) { if (s.at > t) break; seen.push(s); if (seen.length > 40) seen.shift(); }
    return seen;
};
const windowed = (t, ms) => bufferAt(t).filter((s) => s.at >= t - ms);

console.log('question  live_words   OLD 15s window          NEW sized window');
for (const it of tl) {
    if (it.level !== 'long') continue;
    const end = it.playedAt + it.clipSecs * 1000;
    const d = dispatch.find((x) => x.at >= it.playedAt && x.at < end + 20000);
    if (!d) { console.log(it.id + ': no live dispatch found'); continue; }
    // L03's logged text is the replacement, not Live's claim: substitute the roster sentence.
    const substituted = it.id === 'L03';
    const claim = substituted ? it.q : d.q;
    const w = reconcileWindowMs(claim);
    const oldR = reconcileLiveQuestion(claim, windowed(d.at, 15_000));
    const newR = reconcileLiveQuestion(claim, windowed(d.at, w));
    const fmt = (r) => `${r.verdict.padEnd(12)} score ${r.score.toFixed(2)}`;
    console.log(
        it.id.padEnd(9),
        String((claim.match(/[A-Za-z0-9']+/g) ?? []).length).padStart(5) + (substituted ? '*' : ' '),
        '  ' + fmt(oldR).padEnd(24), fmt(newR), ` (window ${Math.round(w / 1000)}s)`,
    );
    if (oldR.verdict === 'replaced') console.log('             OLD kept instead: ' + JSON.stringify(oldR.text));
    if (newR.verdict === 'replaced') console.log('             NEW kept instead: ' + JSON.stringify(newR.text));
}
console.log('\n* L03 uses the roster sentence: the log holds the replacement, not Live\'s own claim.');

// Blast radius on the other 70 spoken items: does any verdict change?
let changed = 0, total = 0;
for (const d of dispatch) {
    const w = reconcileWindowMs(d.q);
    if (w === 15_000) continue;
    total++;
    const a = reconcileLiveQuestion(d.q, windowed(d.at, 15_000));
    const b = reconcileLiveQuestion(d.q, windowed(d.at, w));
    if (a.verdict !== b.verdict || a.text !== b.text) {
        changed++;
        console.log(`CHANGED  ${new Date(d.at).toISOString().slice(11, 19)}  ${a.verdict} -> ${b.verdict}  ${JSON.stringify(d.q.slice(0, 70))}`);
    }
}
console.log(`\nLive dispatches whose window widened at all: ${total}; verdict or text changed: ${changed}`);
