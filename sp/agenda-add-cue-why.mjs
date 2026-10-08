// Adds the cue ruling's evidence and objective right after the 20:00 CUE RULING entry of AGENDA.md.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith('- 20:00 Fri **CUE RULING'));
if (i < 0 || lines.some((l) => l.startsWith('  - **OBJECTIVE (cue flag)**'))) { console.log('REFUSED'); process.exit(2); }
lines.splice(i + 1, 0,
    '  - **OBJECTIVE (cue flag)**: stop paying a measured cost for an unmeasured benefit, without losing the work. Flag UNSET (the default) = the app behaves exactly as before cue mode (the pre-cue prompt byte for byte, answers whole, no cue lines); flag ON = exactly what h40d flew. Done when: tests pin both modes, the new dist passes precue-identity.mjs, a scheduled-task smoke with the flag unset shows answers whole and no `__CUES__`, Opus review approves. Not in scope: cue grading, the +55/+161 question, prompt wording, the side fixes.',
    '  - **EVIDENCE (why off by default; h40d result note MAIN 2178890)**: (1) the FAILED pre-registered rule 2c: with the cue rule, 3.5-lite HIGH thinks 899 vs 738 tokens on the hour\'s own bytes (+161; bar +150) = ~0.47 s later first word per answer (estimate at the registered ~2.9 ms/token; offline TTFT p50 3973 vs 3414 ms); (2) little headroom: the on-screen clock passed 2a at 4.878 s against 5.100 s; (3) the cost is unpredictable: scenario50 bench +55, holdout40 +161, cause unknown; (4) the benefit is UNMEASURED: no grader has read a cue, whether cues help the candidate speak was never measured, R33\'s cue repeated its wrong answer; (5) a weak quality signal against: the cue bench rated cue answers lower in all 3 reps (-2/-3/-3 of 39, within noise) and 3c cannot exclude a bench-size cost. What held: 3c answer quality PASS, rule 4 cue shape CLEAN in-app, the offers-before-answer fix (d83fdfe). The user asked "do we only have speed concerns here": the failed rule is speed; the concern is cost vs unmeasured value.');
fs.writeFileSync(F, lines.join('\n'));
console.log('inserted after line', i + 1);
