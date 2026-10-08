// Records the user's cue ruling (2026-10-02 20:00) in the cue memory and its index line.
import fs from 'node:fs';
const D = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';
const f = D + 'project_cue_mode_next.md';
let t = fs.readFileSync(f, 'utf8');
if (t.includes('RULING 2026-10-02 20:00')) { console.log('REFUSED'); process.exit(2); }
t = t.replace(/\n---\n/, `\n---\n\n**RULING 2026-10-02 20:00 (user: "go with the flag, and add cue grading to the agenda"):** cue mode goes OFF BY
DEFAULT behind an env flag, not a revert. The user asked first "do we only have speed concerns here" — answer given:
the only FAILED rule is speed (2c thinking tokens), but the real concern is a measured cost against an UNMEASURED
benefit (cues never graded; R33's cue repeated its wrong answer; +55 vs +161 unexplained; bench cue reps −2/−3/−3).
Proven before the spec: current VERBAL_TYPED_PROMPT == pre-cue hands-free prompt byte for byte (12784 B, sha
4495445db0c2; SP cue-flag/precue-identity.mjs, calibrated). Spec by Fable in SP cue-flag/. Cue mode returns only after
cue grading + the +161/+55 answer + a fresh pre-registered measurement with the flag on.
`);
fs.writeFileSync(f, t);
const M = D + 'MEMORY.md';
const ls = fs.readFileSync(M, 'utf8').split('\n');
const k = ls.findIndex((l) => l.startsWith('- [Cue mode next]'));
if (k < 0) { console.log('REFUSED index'); process.exit(2); }
ls[k] = ls[k].replace("the user's ruling (flag vs revert) is pending", 'RULED 2026-10-02: OFF by default behind an env flag (not a revert); cue grading first before it returns');
fs.writeFileSync(M, ls.join('\n'));
console.log('ok', ls[k].includes('RULED'));
