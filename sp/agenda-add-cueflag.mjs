// Records the user's cue ruling (20:00 Fri) after the 18:35 entries of AGENDA.md.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
let i = -1;
lines.forEach((l, k) => { if (l.startsWith('- 18:35 Fri')) i = k; });
if (i < 0 || lines.some((l) => l.startsWith('- 20:00 Fri **CUE RULING'))) { console.log('REFUSED'); process.exit(2); }
lines.splice(i + 1, 0,
    '- 20:00 Fri **CUE RULING (user: "go with the flag, and add cue grading to the agenda")**: cue mode goes OFF BY DEFAULT behind an env flag (not a revert). Evidence before the spec: the current VERBAL_TYPED_PROMPT is byte-identical to the PRE-cue hands-free prompt (dist snapshot main-precue-73d7f01: 12784 bytes, sha 4495445db0c2; calibration: the cue prompt differs at byte 12784), so flag-off = the pre-cue prompt exactly. App use: only WhatToAnswerLLM (4 call sites); typed chat already uses VERBAL_TYPED_PROMPT. Pattern: the hedge flag, read per call. Path: Fable spec -> Opus spec review -> Sonnet implementer (TDD, staged in SP) -> Opus code review -> MAIN commit (commit-main-paths) -> rebuild + dist proof -> smoke via scheduled task (flag unset: no __CUES__ in the log, answers whole). Then the side fixes, one at a time.',
    '- 20:00 Fri **CUE GRADING CONFIRMED by the user** (the 17:36 entry above is the plan). Order: after the flag lands. It is the precondition for cue mode ever coming back on, together with (a) why holdout40 cost +161 thinking tokens where scenario50 cost +55 and (b) whether a cheaper cue rule exists; then a fresh pre-registered measurement with the flag on.');
fs.writeFileSync(F, lines.join('\n'));
console.log('inserted after line', i + 1);
