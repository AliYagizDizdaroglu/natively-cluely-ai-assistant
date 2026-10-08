// Rule-8 calibration for the M7 fix in h40c-hedge-stats.mjs: proves the "last label in window /
// won-by" attribution matters by recomputing the synthetic fixture's per-answer labels with the
// NAIVE "first answer-source line in window" rule the review flagged, and showing it gets the
// wrong answer (100% gemini-3.1-flash-lite, the head label, instead of the true 67%/33% split
// the hedge actually produced). Throwaway, scratchpad-only.
import fs from 'node:fs';
const dbg = fs.readFileSync(process.argv[2], 'utf8');
const dispatchRe = /^\S+ \[LOG\] \[Main\] dispatch: answer /gm;
const dispatches = [...dbg.matchAll(dispatchRe)];
const answerSource = [...dbg.matchAll(/^\S+ \[LOG\] \[Main\] answer source: (.+)$/gm)];
const naive = {};
for (let i = 0; i < dispatches.length; i++) {
    const start = dispatches[i].index;
    const end = i + 1 < dispatches.length ? dispatches[i + 1].index : dbg.length;
    const inWindow = answerSource.filter((m) => m.index >= start && m.index < end);
    const label = inWindow.length ? inWindow[0][1].trim() : null; // FIRST, not last
    if (label) naive[label] = (naive[label] || 0) + 1;
}
console.log('naive (first-line) attribution:', JSON.stringify(naive));
console.log('this is what M7 flagged as wrong: it always shows the head label, never the hedge winner');
