// append-prereg-probe.mjs — the s50m pre-registration's own amendment ends by naming the
// same-window alternating probe as "the clean measurement ... which has never been run".
// It has now been run. Append the result to that document: additive, dated, and it does
// not touch the verdict, which was pre-registered and stands.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes/PREREGISTER-s50m.md';

const SECTION = `
---

## Result of that probe — 2026-09-22 21:34 UTC, after the flight was graded

The last paragraph above called for a same-window probe alternating the two models request
by request, and noted it had never been run. This is that probe.

**Method.** s50m's own 39 captured prompts. For each id, both models issued back to back,
strictly sequential so they never contend, with the order alternating by id to balance any
first-in-pair advantage. Each model's own first token is measured, with **no fallback**, so a
stall is recorded as the long number it really is instead of being capped at the budget. Same
call shape as the harness: \`v1alpha ... :streamGenerateContent\`, temperature 0.4, the same
thinking level each model runs at. Script lives in the session scratchpad, not the repo.

| model | n | p50 | p90 | max | over 10 s | errors |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1-lite LOW | 39 | 6484 ms | 8047 ms | 11658 ms | **1** | 1 (HTTP 503) |
| 3.5-lite HIGH | 39 | 3944 ms | 4549 ms | 5638 ms | **0** | 0 |

Paired over the 38 ids where both returned a token: 3.5-lite faster on **34**, median
difference **−2426 ms**, sign test p = 3e-7. Order control: median first-in-pair 4549 ms
against second-in-pair 4160 ms, so the alternation did not manufacture the gap.

**What this changes.** Condition 4 failed on four stall fallbacks in the live hour, and the
inference drawn from them was that 3.5-lite stalls. Under identical conditions it is 3.1-lite
that breached the budget, once, and 3.1-lite whose p90 of 8.0 s sits near the 10 s budget
while 3.5-lite's sits at 4.5 s. The s50m stall evidence is a property of that hour, not of the
candidate model.

**What this does not change.** The verdict. The rule was fixed before the data existed and is
not renegotiated after it. This probe is also one window of about ten minutes, so it cannot
show that 3.5-lite never stalls, and it says nothing about answer quality.

What it licenses is re-opening the question in a new flight with its own pre-registration,
whose condition 4 measures the **primary's** first token or exempts answers the fallback
served — since with a 10 s stall budget any fallback firing guarantees a TTFT over 10 s, and a
condition worded the way this one was is failed by the safety mechanism working correctly.
`;

let s = readFileSync(P, 'utf8');
if (s.includes('Result of that probe')) { console.log('already present — nothing written'); process.exit(0); }
writeFileSync(P, s.trimEnd() + '\n' + SECTION, 'utf8');
console.log('appended;', Buffer.byteLength(readFileSync(P, 'utf8')), 'bytes now');
