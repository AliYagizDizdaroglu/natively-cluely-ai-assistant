// Appends the base-rate finding to the 3.8 Live line of MEMORY.md and to project_gemini_38_live.md (exact-match anchors, refuses otherwise).
import fs from 'node:fs';
const D = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';
const F = D + 'MEMORY.md';
const s = fs.readFileSync(F, 'utf8');
const anchor = '3.8/3.7 Flash unmeasurable on the free tier (2/20, 3/10 answered)';
if (s.split(anchor).length !== 2) throw new Error('anchor not found once');
if (s.includes('BASE RATE 2026-10-01')) throw new Error('already added');
const add = '; BASE RATE 2026-10-01 20:17 (SP l38base, not yet in MAIN): the router\'s easy class occurs 1/176 on scenario50 + interview60 (two Opus 5.5 graders, 176/176 agreement, definition calibrated 12/12 + 10/10 on the L38R items) = 0 per scenario50 hour -> the router answers ~nothing on the user\'s rosters; the text-call competitor does not depend on an easy class; user to decide whether the router continues';
fs.writeFileSync(F, s.replace(anchor, anchor + add));
const P = D + 'project_gemini_38_live.md';
const p = fs.readFileSync(P, 'utf8');
if (p.includes('## Base rate')) throw new Error('section exists');
fs.writeFileSync(P, p.trimEnd() + `

## Base rate of the router's easy class (2026-10-01 20:17, SP\\l38base\\, descriptive)

Two Opus 5.5 graders classified the 176 non-holdout roster items (scenario50 100, interview60 76) blind by the
L38R definition (one part, one fact in <= 5 words, stands alone, no explanation): EASY 1/176 (interview60 L04F2),
agreement 176/176. Calibration: the same definition called the 12 L38R simple items EASY 12/12 and the 10 hard
10/10, so it is the router's own class. My pre-registered expectation was 10-20%; measured 0.6%. Consequence: on
the user's own rosters the router would answer nothing in a scenario50 hour; its benefit there is ~0 while its
costs (combined ear+router prompt untested, answer-based follow-up hole, Live failure shapes, paid-tier cost) stay.
The text-call competitor is unaffected. Decision left to the user (no threshold was pre-registered, by agreement).
Result note: SP\\l38base\\2026-10-01-base-rate-result.md (to MAIN passes/ with the next docs commit after r4).
`);
console.log('memory updated');
