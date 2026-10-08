// Throwaway (2026-09-29), follow-up data only: for every CUT in a seam recording that has per-word
// timings (seam probe 2+), where the next final F2 does NOT start with the interim's first tail word,
// print the timing of the tail word(s) in the interim, the end of F1's segment, and F2's first word.
// Question: does timing separate "the word was lost" (F2's first word starts after the tail word ends)
// from "F2 re-heard the same audio" (F2's first word overlaps the tail word)? Labels from the script.
//   node tail-timing.mjs <stamp>
import fs from 'node:fs';
import path from 'node:path';
import { tok } from './rule-v3.mjs';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'seam-probe');
const stamp = process.argv[2];
const plan = JSON.parse(fs.readFileSync(path.join(dir, `plan-${stamp}.json`), 'utf8'));
const ev = fs.readFileSync(path.join(dir, `events-${stamp}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.kind === 'transcript' && e.text);
if (!ev.some((e) => Array.isArray(e.words) && e.words.length)) { console.log('REFUSED: this recording has no per-word timings'); process.exit(3); }
const playOf = (e) => { const end = e.start + e.duration; return plan.plan.find((p, i) => end >= p.startS && end < (plan.plan[i + 1]?.startS ?? Infinity)); };
const hasSeq = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true; return false; };
let lastInterim = null, cut = null;
for (const e of ev) {
    if (!e.isFinal) { lastInterim = e; continue; }
    if (cut) {
        const f = tok(e.text);
        if (f.length && f[0] !== cut.T[0]) {
            const p = playOf(cut.f1), script = p ? tok(plan.script[p.id]) : [];
            const lost = hasSeq(script, [cut.T[0], f[0]]) ? 'LOST' : 'NOT-LOST';
            const tw = cut.tailWords.map(([w, s, en]) => `${w}[${s.toFixed(2)}-${en.toFixed(2)}]`).join(' ');
            const fw = e.words[0] ? `${e.words[0][0]}[${e.words[0][1].toFixed(2)}-${e.words[0][2].toFixed(2)}]` : '?';
            const gap = e.words[0] && cut.tailWords[0] ? (e.words[0][1] - cut.tailWords[0][2]).toFixed(2) : '?';
            console.log(`${(p ? `${p.id}#${p.play}` : '?').padEnd(9)} ${lost.padEnd(8)} |T|=${cut.T.length} tail ${tw} | F1 ends ${cut.f1End.toFixed(2)} | F2 first ${fw} | F2first.start - tail0.end = ${gap}s`);
        }
    }
    cut = null;
    if (lastInterim) {
        const iw = tok(lastInterim.text), fw = tok(e.text);
        const strict = fw.length > 0 && fw.length < iw.length && fw.every((w, i) => w === iw[i]);
        const tolerant = !strict && fw.length >= 2 && fw.length < iw.length && fw.slice(0, -1).every((w, i) => w === iw[i]);
        // Per-word timings line up with tokens only when Deepgram's words array has one entry per token.
        if ((strict || tolerant) && lastInterim.words.length === iw.length) {
            cut = { T: iw.slice(fw.length), tailWords: lastInterim.words.slice(fw.length), f1: e, f1End: e.start + e.duration };
        }
    }
    lastInterim = null;
}
