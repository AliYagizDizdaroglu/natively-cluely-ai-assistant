// amend-prereg-s50m.mjs — append a timestamped, pre-data amendment to the s50m pre-registration
// in the MAIN checkout. Refuses if the amendment is already there or if today's run folder exists
// (which would mean data already landed and the amendment would no longer be honest).
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const FILE = MAIN + '/electron/test/golden/passes/PREREGISTER-s50m.md';
const RUNS = MAIN + '/electron/test/golden/interview60.runs';

const today = new Date();
const stamp = today.toLocaleString('sv-SE').slice(0, 16);
const landed = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter((n) => n.startsWith('2026-09-22')) : [];
if (landed.length) { console.error('refusing: s50m data already exists: ' + landed.join(', ')); process.exit(2); }

const body = `
---

## Amendment — ${stamp} local, before the flight ran

Recorded here rather than applied silently. No s50m data exists yet: the runs folder holds
no 2026-09-22 entry, checked by the script that wrote this.

### 1. Condition 4 is scoped to the candidate

As written, condition 4 demanded zero \`wrong\` verdicts and zero stall-budget overruns in
*every* arm, its own 3.1 twins included. A 3.1 twin producing a wrong answer would therefore
have failed the rule, and failing the rule keeps 3.1. A condition a model can fail in its own
favour decides nothing.

Condition 4 now reads: **zero \`wrong\` verdicts in the live hour and in the three 3.5 HIGH
captured arms, and zero answers past the 10 s stall budget in those same arms.** Wrong answers
and overruns in the 3.1 arms are reported and decide nothing.

Conditions 1 to 3 are untouched. The swap still requires all four.

### 2. Declared in advance, still outside the rule: a latency drift control

The paired arms run back to back in one batch in a fixed order, all five 3.1 arms before all
four 3.5 arms. Batch position is therefore confounded with model, and no cross-model latency
figure from this flight stands on its own.

At grading time, compare TTFT across the three reps *within* each model separately. A flat
trend inside both models means batch drift is small and the cross-model figures are worth
reporting as context. A trend inside either means every cross-model latency comparison from
this hour is discounted to nothing.

This is a diagnostic, not a criterion. Latency stays outside the rule for the same reason
length does: a speed result must not rescue a failed quality claim. The clean measurement
remains a same-window probe alternating the two models request by request, which costs no
flight and has never been run.
`;

const before = fs.readFileSync(FILE, 'utf8');
if (before.includes('## Amendment —')) { console.error('refusing: an amendment section is already present'); process.exit(3); }
fs.writeFileSync(FILE, before.trimEnd() + '\n' + body, 'utf8');
console.log(`appended amendment at ${stamp}; ${Buffer.byteLength(before)} -> ${Buffer.byteLength(fs.readFileSync(FILE, 'utf8'))} bytes`);
