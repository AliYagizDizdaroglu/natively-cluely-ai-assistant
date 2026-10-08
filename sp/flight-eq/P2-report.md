# P2 report: focused-off harness edit (flight-eq ruling 3)

Commit 2714838 on build/earlier-question (WT eq-build, parent a32db47). Status clean after commit. `WT\node_modules\.vite` deleted.

## Files
- `electron/test/golden/interview60.flight.mjs`: +17/-2 (LF kept, `node --check` exit 0)
  - exported pure `focusedFor(roster, env)`: `env.NATIVELY_FLIGHT_FOCUSED` exactly `off` -> `null`; undefined or `''` -> `focusedOnlyFor(roster)` (unchanged); anything else -> throws `NATIVELY_FLIGHT_FOCUSED="<value>" is not recognised: set it to "off" or leave it unset`
  - `main()` calls it right after the `ROSTER` log, before the `.env` check, the probe and the hour; a throw logs `ABORT <message>` and returns 2 (exit 2)
  - the old `const focusedOnly = focusedOnlyFor(ROSTER_NAME)` is replaced by that early value; the log is now `FOCUSED  off by NATIVELY_FLIGHT_FOCUSED=off - skipping the 4 focused arms` when the env is `off` (`${FOCUSED_MODELS.length}` = 4; two spaces after FOCUSED, matching A2 §A2.10 and the existing line), else the old "has no focused five" line, unchanged
- `electron/test/golden/interview60.flight.focused.test.ts` (new, 3 tests): off -> null (scenario50, holdout40); `''`/unset -> `S1Q02,S1Q08,S2Q02,S1Q07,S1Q06` (5 ids), holdout40 unset -> null; `yes`/`OFF`/`on` throw naming the value
- Importing the module does not run the flight: main is guarded by the existing `process.argv[1] === import.meta.url` check.

## Results (MAIN's vitest, cwd `sp\eq-tmp`, `--root WT`)
- Red before implementation: 3/3 failed (`focusedFor is not a function`).
- Green: focused test 3/3 + existing `interview60.flight.test.ts` 20/20 = 23/23.
- Calibration, with sha256 restore check:
  - `off` branch removed -> the off test FAILS (1 failed, 22 passed)
  - throw branch replaced by `return null` -> the throw test FAILS
  - unset branch returning null -> the unset test FAILS
  - restored byte-identical (sha256 5CE2F336...6405, before = after), green again 23/23

## Not exercised / concerns
- The exit-2 path in `main()` and the `FOCUSED  off ...` log line are not exercised by a test or a run (a run would execute the launcher, which is forbidden here, and it writes a gitignored log). Only `focusedFor`'s throw and null are proven. The log string was read against the A2 text, not run. Proof is still the planned post-hour one: the off line present and no `3.x-flash` arm line in the launcher log.
- With `off`, line 319's `moveAside` of the old focused answer files still runs (pre-existing behaviour; it moves stale files aside, never deletes). `done.json` records `focusedOnly: null` as it does for a roster with no five.
- A3's P2 entry (FINAL list item 2) adds nothing beyond A2: a separate MAIN commit, known answer = the vitest fails with the branch reverted. The MAIN landing (shared-index recipe, after LANDED) and the `launch-eq-src.txt` setting are not done here.
- `.env` scan names (A3 m12) is a separate piece (P6), untouched.
