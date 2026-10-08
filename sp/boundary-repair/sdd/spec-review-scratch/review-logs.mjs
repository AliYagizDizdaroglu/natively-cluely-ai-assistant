// Spec-review scratch (read-only over MAIN's run logs). Replays rule-v3.mjs exactly as rule-sim.mjs does
// (empties skipped) and reports, per repair: gap, k, m, cut kind, an empty final between F1 and F2 (raw
// stream), and a stricter label (script holds F1.last + restored + F2[0..2)). Then lists every tolerant cut
// whose F1 ends in a digit token (the smart_format merge shape) with what v3 would do if the window allowed.
// Holdout runs are only counted, never printed.
import fs from 'node:fs';
import path from 'node:path';
import { createRepair, tok, WINDOW_MS } from '../../rule-v3.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const hasSeq = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true; return false; };
const RE = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/;

const repairs = [], digitTolerant = [], stats = { other: { cuts: 0, tolerant: 0 }, holdout: { cuts: 0, tolerant: 0 } };
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const bucket = /h40/.test(dir) ? 'holdout' : 'other';
    let items = [];
    try { items = JSON.parse(fs.readFileSync(path.join(RUNS, dir, 'interview60.timeline.json'), 'utf8')).items ?? []; } catch { }
    const playing = (atMs) => items.find((i) => atMs >= i.playedAt - 500 && atMs <= i.playedAt + (i.clipSecs ?? 0) * 1000 + 3000);
    const r = createRepair();
    // our own shadow of the cut, to report k/m/kind and raw-stream empties
    let lastInterim = null, cut = null, emptyFinalSinceCut = 0;
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(RE); if (!m) continue;
        const text = unq(m[3]), at = Date.parse(m[1]), isFinal = m[2] === 'true';
        if (!text) { if (isFinal && cut) emptyFinalSinceCut++; continue; }
        const res = r.onTranscript(text, isFinal, at);
        if (!isFinal) { lastInterim = { text, at }; continue; }
        if (res.restored) {
            const f = tok(text), k = res.restored.length, m2 = Math.min(2, cut.T.length - k);
            const item = playing(cut.at);
            const f1last = tok(cut.f1).slice(-1);
            const loose = !item ? 'UNKNOWN' : hasSeq(tok(item.q), [...tok(res.restored.join(' ')), f[0]]) ? 'TRUE' : 'FALSE';
            const strict = !item ? 'UNKNOWN' : hasSeq(tok(item.q), [...f1last, ...tok(res.restored.join(' ')), ...f.slice(0, 2)]) ? 'TRUE' : 'FALSE';
            repairs.push({ bucket, dir, gap: at - cut.at, k, m: m2, kind: cut.kind, T: cut.T.length, emptyBetween: emptyFinalSinceCut, loose, strict, restored: res.restored.join(' '), f1: cut.f1, f2: text, i: cut.i });
        }
        // shadow cut detection (same as the reference)
        cut = null; emptyFinalSinceCut = 0;
        if (lastInterim) {
            const iw = tok(lastInterim.text), fw = tok(text);
            if (fw.length > 0 && fw.length < iw.length) {
                const s = fw.every((w, i) => w === iw[i]);
                const t = !s && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                if (s || t) {
                    stats[bucket].cuts++; if (t) stats[bucket].tolerant++;
                    cut = { T: iw.slice(fw.length), at, f1: text, i: lastInterim.text, kind: s ? 'strict' : 'tolerant' };
                    if (t && /\d/.test(fw[fw.length - 1])) digitTolerant.push({ bucket, dir, cut, next: null });
                }
            }
        }
        // attach the next non-empty final to the most recent digit-tolerant cut of this run
        const dt = digitTolerant[digitTolerant.length - 1];
        if (dt && dt.dir === dir && dt.next === null && dt.cut !== cut && dt.cut.at < at) dt.next = { text, gap: at - dt.cut.at };
        lastInterim = null;
    }
}
const other = repairs.filter((x) => x.bucket === 'other');
console.log(`v3 repairs: non-holdout ${other.length}, holdout ${repairs.length - other.length}; WINDOW_MS=${WINDOW_MS}`);
for (const x of other) console.log(`${x.loose}/${x.strict.padEnd(7)} gap ${String(x.gap).padStart(5)} k=${x.k} m=${x.m} |T|=${x.T} ${x.kind.padEnd(8)} emptyFinalsBetween=${x.emptyBetween} ${x.dir.slice(0, 22)} restored "${x.restored}"\n      I : ${JSON.stringify(x.i)}\n      F1: ${JSON.stringify(x.f1)}\n      F2: ${JSON.stringify(x.f2.slice(0, 80))}`);
const gaps = other.map((x) => x.gap).sort((a, b) => a - b);
console.log(`non-holdout repair gaps: min ${gaps[0]} max ${gaps[gaps.length - 1]}; m=1 repairs ${other.filter((x) => x.m === 1).length}; with empty final between ${other.filter((x) => x.emptyBetween > 0).length}`);
const hold = repairs.filter((x) => x.bucket === 'holdout');
console.log(`holdout (counts only): repairs ${hold.length}, max gap ${Math.max(...hold.map((x) => x.gap))}, strict-label FALSE ${hold.filter((x) => x.strict === 'FALSE').length}, empty final between ${hold.filter((x) => x.emptyBetween > 0).length}`);
console.log(`cuts: ${JSON.stringify(stats)}`);
console.log(`\ntolerant cuts whose F1 ends in a digit token: non-holdout ${digitTolerant.filter((d) => d.bucket === 'other').length}, holdout ${digitTolerant.filter((d) => d.bucket === 'holdout').length}`);
for (const d of digitTolerant.filter((x) => x.bucket === 'other')) {
    // counterfactual: what v3 does with this cut if F2 arrived inside the window
    const r = createRepair();
    r.onTranscript(d.cut.i, false, 0); r.onTranscript(d.cut.f1, true, 1);
    const cf = d.next ? r.onTranscript(d.next.text, true, 2) : null;
    console.log(`  ${d.dir.slice(0, 22)} T=${JSON.stringify(d.cut.T)} gap=${d.next?.gap}\n      I : ${JSON.stringify(d.cut.i)}\n      F1: ${JSON.stringify(d.cut.f1)}\n      F2: ${JSON.stringify(d.next?.text.slice(0, 80))}\n      v3 inside window -> ${cf?.restored ? `RESTORES ${JSON.stringify(cf.restored)}` : 'no repair'}`);
}
