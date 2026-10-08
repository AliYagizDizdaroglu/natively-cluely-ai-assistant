// Spec-review scratch (read-only over the two seam recordings in ../../seam-probe).
// For every CUT (reference definition) prints: F1 speechFinal, empty finals between F1 and F2, the v3 verdict,
// and — where per-word timings exist (seam 2) — T[0]'s interim span vs F1's segment end and F2's first word start,
// for NORMAL cuts too, so the timestamp idea is seen against cuts where nothing was lost.
//   node review-seam.mjs <stamp>
import fs from 'node:fs';
import path from 'node:path';
import { createRepair, tok } from '../../rule-v3.mjs';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../seam-probe');
const stamp = process.argv[2];
const plan = JSON.parse(fs.readFileSync(path.join(dir, `plan-${stamp}.json`), 'utf8'));
const all = fs.readFileSync(path.join(dir, `events-${stamp}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.kind === 'transcript');
const playOf = (e) => { const end = e.start + e.duration; return plan.plan.find((p, i) => end >= p.startS && end < (plan.plan[i + 1]?.startS ?? Infinity)); };
const hasSeq = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true; return false; };
const r = createRepair();
let lastInterim = null, cut = null, emptyFinals = 0;
const rows = [];
let finalsSF = { true: 0, false: 0 };
for (const e of all) {
    if (!e.text) { if (e.isFinal && cut) emptyFinals++; continue; }
    const res = r.onTranscript(e.text, e.isFinal, e.at);
    if (!e.isFinal) { lastInterim = e; continue; }
    finalsSF[e.speechFinal]++;
    if (cut) {
        const f = tok(e.text), p = playOf(cut.f1), script = p ? tok(plan.script[p.id]) : [];
        const cls = f[0] === cut.T[0] ? 'NORMAL' : res.restored ? 'REPAIRED' : cut.T.length === 1 ? 'TAIL1' : 'OTHER';
        const lost = f[0] === cut.T[0] ? '' : hasSeq(script, [cut.T[0], ...(cut.T.length > 1 ? [] : [f[0]])]) && !hasSeq(tok(cut.f1.text + ' ' + e.text), [cut.T[0]]) ? 'LOST' : 'not-lost';
        let timing = '';
        if (cut.tw && e.words?.length) {
            const [w0, s0, e0] = cut.tw[0], [fw, fs] = e.words[0];
            timing = `T0 ${w0}[${s0.toFixed(2)}-${e0.toFixed(2)}] F1end ${cut.f1end.toFixed(2)} F2first ${fw}@${fs.toFixed(2)} | F2first-T0end ${(fs - e0).toFixed(2)} F2first-F1end ${(fs - cut.f1end).toFixed(2)} T0end-F1end ${(e0 - cut.f1end).toFixed(2)}`;
        }
        rows.push({ play: p ? `${p.id}#${p.play}` : '?', cls, lost, sf: cut.f1.speechFinal, kind: cut.kind, emptyFinals, gap: e.at - cut.f1.at, restored: res.restored, timing, T: cut.T });
    }
    cut = null; emptyFinals = 0;
    if (lastInterim) {
        const iw = tok(lastInterim.text), fw = tok(e.text);
        if (fw.length > 0 && fw.length < iw.length) {
            const s = fw.every((w, i) => w === iw[i]);
            const t = !s && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
            const aligned = Array.isArray(lastInterim.words) && lastInterim.words.length === iw.length;
            if (s || t) cut = { T: iw.slice(fw.length), f1: e, kind: s ? 'strict' : 'tolerant', tw: aligned ? lastInterim.words.slice(fw.length) : null, f1end: e.start + e.duration };
        }
    }
    lastInterim = null;
}
console.log(`finals speechFinal: ${JSON.stringify(finalsSF)}; cuts followed by a final: ${rows.length}`);
const by = {};
for (const x of rows) { const k = `${x.cls} sf=${x.sf}`; by[k] = (by[k] ?? 0) + 1; }
console.log(JSON.stringify(by));
for (const x of rows) if (x.cls !== 'NORMAL' || x.timing) console.log(`${x.play.padEnd(9)} ${x.cls.padEnd(8)} ${x.lost.padEnd(8)} sf=${x.sf} ${x.kind.padEnd(8)} emptyFinalsBetween=${x.emptyFinals} gap=${x.gap} |T|=${x.T.length}${x.restored ? ` restored=${JSON.stringify(x.restored)}` : ''} ${x.timing}`);
