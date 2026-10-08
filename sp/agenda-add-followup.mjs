// Appends the follow-up deep dive's findings line after the 18:20 TEMPERATURE entry of AGENDA.md, and the h40d commit.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith('- 18:20 Fri **TEMPERATURE'));
if (i < 0 || lines.some((l) => l.startsWith('- 18:35 Fri'))) { console.log('REFUSED'); process.exit(2); }
lines.splice(i + 1, 0,
    '- 18:35 Fri h40d result note COMMITTED MAIN 2178890 (note + pass record + INDEX + sidecar pre-registration; fact-check 466 claims, all corrections applied).',
    '- 18:35 Fri **FOLLOW-UP DEEP DIVE, Phase 1 DONE** (`followup-deepdive/FINDINGS.md`): root cause = time-based retention (120 s window evicts the parent QUESTION; only a 200-char answer preview survives to 180 s). Classes: evicted+referential (main), parent-present model misses, rare ear/dispatch. The 6c50ec3 wrong (S2Q07F) sits on an item the 01 Oct gate does not fire on; the answer-preview pull is NOT supported as its cause. Fix direction: turn-based retention of QUESTIONS, a gate that knows the parent is actually missing (S2Q09F selection bug), most-recent selection, "do not re-answer" framing (S2Q05F); answer-dependent follow-ups separate. Sat re-run stays as registered; the turn-based design follows with its own Fable spec + Opus review + pre-registered replay (non-holdout).');
fs.writeFileSync(F, lines.join('\n'));
console.log('inserted after line', i + 1);
