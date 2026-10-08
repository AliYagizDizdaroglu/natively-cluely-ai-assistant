# Task 0 report — Quota ledger step only

Scope: per the controller's note, the suite/tsc baseline steps of Task 0 were already done
elsewhere and were skipped here. This covers only the "Quota ledger" step of
`task-0-brief.md`.

## Files changed

- Created `SP\quota-ledger.mjs` (new, read-only script; no MAIN files touched).
- Created `SP\h40c-baseline\quota-2026-09-26.txt` (script output).
- Created `SP\sdd\2026-09-26-h40c\task-0-report.md` (this file).
- Throwaway exploration scripts in `SP\` (not part of the deliverable, left as scratch):
  `inspect-h40b.mjs`, `inspect-h40b2.mjs`, `inspect-h40b3.mjs`, `inspect-h40b4.mjs`,
  `inspect-h40b5.mjs`, `calibrate-quota-ledger.mjs`.

No MAIN files were read-write touched; MAIN was only read (`git` was not invoked at all —
this task is read-only exploration of already-written JSON/log files, no git status check
was needed for this step).

## What the script does

`SP\quota-ledger.mjs` sums, per lite model (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`),
every source the brief named:

1. **Offline replay arms** — entry counts from the exact `interview60.answers.*.json` files
   the brief lists in the h40b run folder (3.1: `_captured-low{,-r2,-r3}`, `_captured-minimal`,
   `_low`, bare `interview60.answers.json`; 3.5: bare + `_captured-high{,-r2,-r3}` + `_high`).
   Also lists any other `interview60.answers.*.json` present but not in either list, so a
   renamed/extra arm can't silently go uncounted (found: the OpenAI and Qwen arms, correctly
   excluded — not Gemini).
2. **In-app requests** from the h40b run folder's own `natively_debug.log` (the real app
   session, not a replay), via two log-line families: `"verbal stall race: trying <model>"`
   (every request actually sent) and the collapsed `"[LLMHelper] <model> usage: ..."` lines
   (collapsed exactly as `SP\check-smoke-model.mjs` collapses chunk runs, `in>500` = a real
   answer). Prints the calibration sub-count the controller asked for.
3. **Warm-ups** (`"<model> warmed up in Nms"` lines), split by model; `gemma-4-31b-it vision`
   warm-ups are shown but excluded (not a lite Gemini text model).
4. **The chains pass** (`interview60.chains.json`) — confirmed by reading
   `electron/test/golden/interview60.chains.mjs` that its `MODEL` constant is hardcoded to
   `gemini-3.1-flash-lite` (the JSON itself carries no per-entry model field), so every
   `contextual`/`standalone` turn counts as one 3.1-lite request.
5. **`SP\flash-h40b\*.json`** (incl. its `blind\` subdir) — scanned every `"model"` field
   found rather than trusting the brief's "full-Flash only" characterization; confirmed 0
   lite-model hits (all values are `gemini-3.5/3.6/3.7/3.8-flash*` or `claude-opus-5`, the
   judge model).
6. **MAIN's repo-root `natively_debug.log`** — deduplicated against the h40b run folder's
   copy of the same session by only counting lines timestamped at/after
   `2026-09-26T11:40:00Z`; confirmed 0 (the root log's last line is `11:39:53.430Z`, i.e.
   nothing exists past the cutoff at all).

Sources deliberately **not** counted, with reasons printed in the ledger's own output:
`verbal-diag.log`/`verbal-prompts.log` (same in-app requests as `natively_debug.log`, would
double-count), `interview60.judge*`/`*.pairs.*`/`*.verdicts.*` (grader is `claude-opus-5-5`,
not Gemini), the OpenAI/Qwen arm files, gemma vision warm-ups, and any activity before the
app session started at `2026-09-26T10:32:03.254Z` (assumed zero — not measured; no source in
scope reaches earlier, and h40b is the only `interview60.runs` folder dated 2026-09-26).

## Calibration sub-count (as the controller asked to have printed)

From the h40b run folder's `natively_debug.log`:

- `"trying gemini-3.1-flash-lite"` lines: **46**
- `"gemini-3.1-flash-lite stalled after 10000ms"` WARN lines: **5**
- `"verbal primary failed before first token"` (503) WARN lines: **1**
- Completed-with-usage-response landings on 3.1-lite (`in>500`): **40**
- Completed-with-usage-response landings on 3.5-lite (`in>500`): **6**
- Reconciliation: `46 - 1 (503) - 5 (stalled) = 40`, which matches the measured 40 landed-on-3.1
  exactly (script prints `MATCHES`). `6` landed-on-3.5 matches `1 + 5` exactly (`MATCHES`).

This differs from the controller's stated expectation of "near 44 answers on 3.1-lite" — the
measured, self-consistent number is **40**, not 44. The **46/1/5** sub-counts (attempts,
503-fallback, stall-fallback) match the controller's expectation exactly; only the derived
"landed on 3.1" figure differs (40 vs. "near 44"), and 46 − 1 − 5 arithmetically has to be 40,
not 44, so I'm reporting the measured 40 rather than forcing a match to the rough estimate.
Flagging this as a concern below in case the controller's "44" came from a different
counting rule I haven't reconstructed.

## Grand totals (headroom against 500/model/day)

```
gemini-3.1-flash-lite    total =  314   headroom = 500 - 314 = 186
gemini-3.5-flash-lite    total =  210   headroom = 500 - 210 = 290
```

Breakdown for 3.1-lite: 242 (offline arms) + 46 (in-app, conservative — see assumption below)
+ 1 (warm-up) + 25 (chains) + 0 (flash-h40b) + 0 (root-log tail) = 314.
Breakdown for 3.5-lite: 198 (offline arms) + 6 (in-app, all usage-confirmed) + 6 (warm-ups)
+ 0 + 0 = 210.

Both land inside the brief's stated order-of-magnitude expectations (3.1-lite 300-350,
3.5-lite ~215).

## Assumption flagged (stated explicitly, not resolved)

Whether a 3.1-lite request that got a 503 or that the client gave up on after a 10 s stall
still consumes a slot against Google's daily quota cannot be observed from these logs (Google
doesn't expose a per-request "did this count" flag). The ledger takes the **conservative**
reading — it counts all 46 "trying" attempts against the 3.1-lite total, not just the 40 that
completed — so the headroom figure errs toward understating headroom rather than overstating
it. The script prints the non-conservative alternative (40, i.e. 6 fewer) alongside it so the
controller can pick either.

## Rule-8 calibration

The ledger's internal reconciliation self-check (`... (MATCHES)` / `(DOES NOT MATCH)`) is a
check that decides something, so it was calibrated on both a known-good and a deliberately
broken case, using the real `parseInAppLog()` function (imported from `quota-ledger.mjs`, not
reimplemented) via `SP\calibrate-quota-ledger.mjs`:

- **Known-good** synthetic log (2 "trying" attempts, 1 stall-fallback, 1 clean landing) →
  `reconcile31=true reconcile35=true`.
- **Deliberately broken** synthetic log (same log plus one extra unresolved "trying" line with
  no matching stall/503/landing) → `reconcile31=false`, i.e. the check correctly flagged the
  gap instead of always reporting MATCHES.

Ran and passed:
```
Case A (known-good): trying31=2 stalled=1 primaryFailed=0 landed31=1 landed35=1 -> reconcile31=true reconcile35=true
Case B (deliberately broken, +1 unresolved "trying" line): trying31=3 stalled=1 primaryFailed=0 landed31=1 -> reconcile31=false

CALIBRATION OK: the reconciliation check matches on a known-good log and correctly
flags a mismatch (DOES NOT MATCH) on a deliberately broken one.
```

Separately, a real bug was caught and fixed during development (not a staged calibration, an
actual defect): the first version of `parseInAppLog()` only extracted/filtered the timestamp
for `usage:` lines, so the MAIN-root-log dedup filter (`minTimeZ`) silently did NOT apply to
the `"trying"`/`"stalled"`/warm-up line families — running it against the root log wrongly
reported 46 post-cutoff 3.1-lite requests (a full re-count of the whole session, defeating the
dedup). Fixed by extracting the leading ISO timestamp once per line and filtering all five
line families on it uniformly; re-ran and confirmed 0/0/0/0 for the root-log section, matching
the independently-verified fact that the root log's last line is `11:39:53.430Z` (before the
`11:40:00Z` cutoff).

## Open concerns

- The 44-vs-40 discrepancy noted above under "Calibration sub-count" — worth the controller
  double-checking against whatever produced the original "near 44" estimate.
- The conservative-vs-completed-only choice for 3.1-lite in-app counting (46 vs 40) is a
  judgment call under genuine uncertainty about Google's billing behavior for failed/stalled
  requests; both numbers are printed so Task 6 can use either.
- This is a manual, one-off script (not wired into any test suite or CI); running it again
  tomorrow against a stale `RUN_DIR`/date constants would silently report today's numbers
  again unless someone updates the hardcoded date/paths — it was written for this specific
  quota check, not as a reusable tool, per the brief's scope.
