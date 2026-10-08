// THROWAWAY: correct the two stale claims in the after9 memory — the root cause was NOT the
// 15s window, and the index line still says 3.5 is ahead of 3.1 (superseded in the body).
import fs from 'node:fs';

const M = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';

// 1. the index line
const idxPath = M + 'MEMORY.md';
let idx = fs.readFileSync(idxPath, 'utf8');
const oldIdx = 'ROOT CAUSE = 15s reconcile window + detector answering halves; Gemma 31B collapsed (19s TTFT), 3.5-flash-lite now ahead of 3.1';
const newIdx = 'root cause CORRECTED in [[long-question-defect]]; Gemma 31B collapsed (19s TTFT); 3.1 beats 3.5 under the frozen grader';
if (!idx.includes(oldIdx)) throw new Error('index anchor missing');
fs.writeFileSync(idxPath, idx.replace(oldIdx, newIdx));

// 2. the body's root-cause section
const p = M + 'project_after9_results.md';
let s = fs.readFileSync(p, 'utf8');
const old1 = '**ROOT CAUSE of all four failing rows — not the Live prompt (that fix worked).** Two mechanisms:';
const new1 = '**ROOT CAUSE — SUPERSEDED 2026-09-08 evening by [[long-question-defect]]. Mechanism 1 below is\n'
    + 'WRONG: widening the window alone changes nothing (L03 stays replaced at 0.22 with a 39s\n'
    + 'window). The reconciler scored against the BEST SINGLE transcript line; joining the window\'s\n'
    + 'lines is the fix, and the sized window is what makes it robust. Fixed in 742b8fd. Mechanism 2\n'
    + '(the doubles) is also mis-stated: they come from the ANSWER path, not from drops, and remain\n'
    + 'OPEN. The original text follows for the record.** Two mechanisms:';
if (!s.includes(old1)) throw new Error('body anchor missing');
s = s.replace(old1, new1);

const old2 = '**Fixes to make (in order)**: size the reconcile window to the text\'s spoken length; let a fuller\nquestion supersede a half-answered one (replace the card, not double); capture on extends too.';
const new2 = '**Fixes as of 2026-09-08 evening**: reconcile window + joined-window corroboration DONE, and\n'
    + 'capture on extends DONE (both in 742b8fd, neither flight-verified). "Let a fuller question\n'
    + 'supersede a half-answered one" was NOT shipped — it targets the drop path, which never produced\n'
    + 'a double; see [[long-question-defect]] for the measurement and the real cause.';
if (!s.includes(old2)) throw new Error('fixes anchor missing');
s = s.replace(old2, new2);

fs.writeFileSync(p, s);
console.log('memory corrected');
