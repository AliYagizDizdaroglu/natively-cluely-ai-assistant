### Task 4: The capped Flash sidecar, ready before the flight

**Files:**
- Modify (scratchpad copy): `<SP>\gemma-answers.mjs:314` (`for (let a = 0; a < 4; a++)` → a `GEMMA_MAX_TRIES` env, default 4)
- Create (scratchpad): `<SP>\flash-h40b-sidecar.mjs`, `<SP>\flash-h40b-blind-pairs.mjs`, `<SP>\flash-h40b-score-blind.mjs`, `<SP>\flash-h40b-score-cal.mjs`

**Interfaces:**
- Produces: `<SP>\flash-h40b\interview60.answers.<model>_<tag>.json` per model and rep (tags `def`, `def-r2`, `def-r3`; tier 3 models one rep `def`), `<SP>\flash-h40b\tiers.json` = `{ "1": { model, ids, ok }, "2": {...}, "3": { model: 'gemini-3.6-flash', ids }, "3b": { model: 'gemini-3.5-flash', ids } }`, blind files under `<SP>\flash-h40b\blind\`.

- [ ] **Step 1: The runner's try count** — in `<SP>\gemma-answers.mjs` replace line 314 with:

```js
    const MAX_TRIES = Math.max(1, Number(process.env.GEMMA_MAX_TRIES ?? 4));   // the capped Flash sidecar sets 1: a 429 or 503 is recorded, never retried
    for (let a = 0; a < MAX_TRIES; a++) {
```

- [ ] **Step 2: The sidecar** — `<SP>\flash-h40b-sidecar.mjs`: the tier derivation of `flash-h40a-tiers.mjs` verbatim (misses from h40a's blind verdicts and `h40a-verdicts-inapp.json`, R09 skipped when uncaptured), then:

```js
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const runDir = `${RUNS}/${fs.readdirSync(RUNS).filter((x) => /-h40b$/.test(x)).sort().pop()}`;   // exits NOT READY if none
// the hour is over when both exist (gemma-h40a-sidecar.mjs)
for (const f of ['interview60.prompts.json', 'interview60.timeline.json']) if (!fs.existsSync(`${runDir}/${f}`)) { console.log(`NOT READY: ${f} missing`); process.exit(2); }
const PLAN = {                                             // 20 requests per model per day (2026-09-25)
    '1':  { model: 'gemini-3.8-flash', ids: TIERS[1].ids, reps: ['def', 'def-r2', 'def-r3'] },
    '2':  { model: 'gemini-3.7-flash', ids: TIERS[2].ids, reps: ['def', 'def-r2', 'def-r3'] },
    '3':  { model: 'gemini-3.6-flash', ids: TIERS[3].ids, reps: ['def'] },
    '3b': { model: 'gemini-3.5-flash', ids: TIERS[3].ids, reps: ['def'] },
};
const BUDGET = 18;   // HTTP requests per model today, leaving 2 of the 20 for the runner's own stream-cut retry
const env = { ...process.env, GEMMA_ARMS_DIR: OUT, NATIVELY_ROSTER: 'holdout40', GEMMA_CALL_TIMEOUT_MS: '180000', GEMMA_MIN_GAP_MS: String(gapMs), GEMMA_MAX_TRIES: '1' };
async function tier(t, { model, ids, reps }) {
    let used = 0;
    const captured = ids.filter((id) => capturedIds.has(id));   // the hour may not have captured every tier id
    for (const tag of reps) {
        let todo = captured;
        for (let pass = 1; todo.length && used + todo.length <= BUDGET; pass++) {
            if (pass > 1) await sleep(60000);
            await run(model, tag, todo.join(','));
            used += todo.length;
            const s = answered(model, tag);
            used += todo.filter((id) => s[id]?.cutRetried).length;
            todo = todo.filter((id) => !s[id]?.spoken);
        }
        console.log(`${stamp()} tier ${t} ${model} ${tag}: ${captured.length - todo.length}/${captured.length} answered, ${used}/${BUDGET} requests used${todo.length ? ` (unanswered: ${todo.join(',')})` : ''}`);
    }
    return { model, ids: captured, skipped: ids.filter((id) => !capturedIds.has(id)), requests: used };
}
```

running tiers 1, 2, 3 in parallel (`Promise.all`) and 3b after 3 (same questions, different model, so it could run in parallel too; sequential keeps the console readable), then `tiers.json`. Every other line (the `run` spawn, `answered`, `stamp`, `sleep`, the log files) is the 09-25 tier runner's. A `--dry` prints the plan and the request count per model (tier 1: 6, tier 2: 9, tier 3: 11, tier 3b: 11; all ≤ 18) and exits.

- [ ] **Step 3: Blind pairs, scorer, calibration** — `flash-h40b-blind-pairs.mjs` = `flash-h40a-blind-pairs.mjs` with `RUN` = the h40b run folder, `F = ${SP}/flash-h40b`, tiers from `flash-h40b/tiers.json`, and the per-question loop collecting EVERY Flash arm that covers the id (tier 3 ids get 3.6-flash and 3.5-flash, one answer each) plus the lite arms once; `flash-h40b-score-blind.mjs` = `flash-h40a-score-blind.mjs` with the paths swapped (its totals are already keyed by tier); `flash-h40b-score-cal.mjs` = the h40a calibration with the expectations `gemini-3.8-flash on tier 1: 6/6`, `gemini-3.7-flash on tier 2: 9/9`, `gemini-3.6-flash on tier 3: 11/11`, `gemini-3.5-flash on tier 3b: 11/11`, lite `48/48`, and 0/… for the wrong and weak cases. Calibration runs after the pairs exist (flight day); it must print `CALIBRATION OK` before any verdict is read.

- [ ] **Step 4: Dry-run the sidecar today** — `node "$sp\flash-h40b-sidecar.mjs" --dry` prints `NOT READY` (no h40b run folder yet) — that is the expected answer today; the tier list and budgets are printed before it when a `--plan` flag is given, so add `--plan` to print the tiers and per-model request counts without a run folder: expected 6/9/11/11.

