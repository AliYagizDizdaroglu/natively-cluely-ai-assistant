// Records the user's follow-up plan (2026-10-02 ~22:55) and moves the slim-prompt A/B to Monday.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
let t = fs.readFileSync(F, 'utf8');
if (t.includes('**FOLLOW-UP PLAN (user: "yes set it up that way")')) { console.log('REFUSED: already recorded'); process.exit(2); }
const lines = t.split('\n');
const i = lines.findIndex((l) => l.startsWith('- 22:33 Fri **3.8 LIVE ET RE-PROBE'));
if (i < 0) { console.log('REFUSED: anchor missing'); process.exit(2); }
lines.splice(i + 1, 0, '- STAMP Fri **FOLLOW-UP PLAN (user: "lets fix the follow-ups and test it on the next flight tomorrow, if safe?" -> told: not safe Saturday (the registration builds nothing before its re-run; the S2Q09F bug cannot be fixed mid-pooling; re-run ~100 + flight ~375 calls on 3.5-lite = the 500 cap; no slack for build/review/smoke/registration) -> "yes set it up that way")**: (1) TONIGHT, zero quota: prepare the ONE pooled s50l re-run per PREREGISTER-followup-questions §7: s50l gate list recomputed and recorded BEFORE calls (same reference files + hashes), callbacks at the same slot ids, §6.2 calibration against the PRE-cue dist snapshot (main-precue-73d7f01), dry run, pooled decide calibrated; Opus review of the prep. (2) SAT after 10:00: quota ledger (>= 150 headroom on 3.5-lite), run, 8 Opus graders, pooled decide -> RESULT. (3a) PASS -> Sat afternoon: build behind NATIVELY_EARLIER_QUESTIONS (OFF by default) in MAIN, TDD per design §10 + the §2 parity test, Sonnet implementer, Opus review, rebuild, dist proof, smoke via scheduled task; Sat evening: the flight\'s pre-registration (Fable) + Opus review (scenario50 S1+S2, flag ON, judged vs s50m/s50l in-app bands + captured twins, zero wrong among gated items); SUN: the flight (fresh quota day; machine quiet; user logged on). (3b) INCONCLUSIVE or FAIL -> the design is dead by its own rule; the turn-based design (questions only, parent-actually-missing gate, most-recent selection, do-not-re-answer framing) gets a Fable spec + Opus review + its own pre-registered replay, then a flight (realistically Tue/Wed). The app\'s default never changes before a flight passes (flag OFF). The SLIM PROMPT A/B moves to MONDAY 5 Oct after 10:00.');
t = lines.join('\n');
const a = "Day: Sunday 4 Oct after 10:00 is now free (the temperature bench was removed 22:26 Fri); not Sat: the follow-up re-run owns 3.5-lite.";
if (!t.includes(a)) { console.log('REFUSED: slim-prompt day anchor missing'); process.exit(2); }
t = t.replace(a, 'Day: MONDAY 5 Oct after 10:00 (moved 22:5x Fri: Sunday is the follow-up flight if Saturday\'s re-run passes; Saturday is the re-run).');
fs.writeFileSync(F, t);
console.log('recorded');
