# P2 review: focused-off harness edit (flight-eq ruling 3)

Reviewed: WT eq-build `a32db47..2714838` (`2714838^` = a32db47 confirmed). The committed blobs are byte-identical to the WT files and LF-only. Requirements: AMENDMENT-A2 §A2.10 "P2" (lines 230–235), PREREGISTER line 86.

SPEC: PASS
QUALITY: CHANGES

## Verdict in one line
The code does what ruling 3 asks: with `off`, no full-Flash call site is reachable. The proof only covers `focusedFor`, though. Four mutants of `main()`'s wiring all pass 23/23, and that includes one that logs the `off` line while still flying all four Flash arms. Before READY, one exercise with no network has to prove the wiring (see I1).

## Every full-Flash call site in the flight chain (static read of the whole flow)
| site | model source | under `off` |
|---|---|---|
| `interview60.flight.mjs:366` arms list → `:368` `answers.mjs --model <m>` | `FOCUSED_MODELS` (3.8/3.7/3.6/3.5-flash) | gated by `focusedOnly ?`; `focusedOnly` is `null` (set at `:311`) → no focused arm |
| `:366` ANSWER_MODELS + `paired` | 3.1-lite / 3.5-lite only (`:59`, `:189-209`; test `flight.test.ts` pins them) | runs unchanged (bare arms and twins kept) |
| `:334` `moveAside` over `FOCUSED_MODELS` file names | file renames only, no call | still runs (it was already there; it moves files aside and never deletes) |
| `:348` `focusedArgs` | built, then never used when `focusedOnly` is null | harmless |
| `:315` live-probe.cjs | `NATIVELY_LIVE_MODEL` or 3.1-flash-live-preview (Live, not a full-Flash id) | unchanged |
| `:323` run.mjs auto | probes `gemini-3.1-flash-lite` / `gemini-3.5-flash-lite` only (run.mjs:352,375,377); the app's constants are lite + `gemini-3.1-pro-preview` (LLMHelper.ts:39-47), and the app source has no full-Flash literal outside tests | unchanged |
| `:376` chains.mjs | hard `gemini-3.1-flash-lite` (chains.mjs:32) | unchanged |
| `:382-383` judge `--export`, `:343` prompts.mjs, `:398` pass-record.mjs | no model call | unchanged |
| answers.mjs | `MODEL` = the `--model` arg, with no fallback model (answers.mjs:46-50, 164) | it only gets Flash ids from `:366` |

`FOCUSED_MODELS` / `focusedOnlyFor` / `focusedFor` / `NATIVELY_FLIGHT_FOCUSED` are read nowhere else in WT outside node_modules, .git and dist (grep). Only `flight.mjs` and its two test files read them.

## Checks
- **Unset / empty = today, byte for byte:** `focusedFor` returns `focusedOnlyFor(ROSTER_NAME)`, the same value the old `:346` computed. `ROSTER_NAME` is a module constant, so moving the call earlier changes nothing. No new log line is written. The "has no focused five" line is identical to the parent's (checked with a script).
- **Other values exit 2 before any app start or network call:** `:311` runs before the `.env` check (`:312`), the probe (`:315`) and auto (`:323`). The only things that run before it are `gitHead()` (a local `git rev-parse`) and two log appends. `ABORT NATIVELY_FLIGHT_FOCUSED="yes" is not recognised…` names the value. Case is strict, so `OFF` throws.
- **Log line exact:** the rendered text is `FOCUSED  off by NATIVELY_FLIGHT_FOCUSED=off - skipping the 4 focused arms`, which equals A2's wrapped text joined (exact match, ASCII only).
- **Bare arms and twins the registration requires:** the 3.1-lite and 3.5-lite untagged arms, `low`, `high`, `captured-low`×3, `captured-high`×3, `captured-no-cues-high`×3 (still `when: hasCueRule`) and `captured-minimal` are all unchanged and independent of `focusedOnly`. The registration's G-only arms (`captured-high-r4/-r5`, `captured-no-block-*`) are not in the flight before or after this edit, so P2 does not touch them.
- **Tests (MAIN vitest, cwd `SP\eq-tmp`, `--root SP\eq-tmp\p2rev`, a copy of WT's golden + llm dirs):** 23/23 green (focused 3 + flight 20).
- **Mutants (on the copy, restored, sha 5ce2f336… before = after):**
  | mutant | result |
  |---|---|
  | M1 `off` branch removed | 1 failed ✓ |
  | M2 throw → `return null` | 1 failed ✓ |
  | M3 unset → `null` | 1 failed ✓ |
  | M4 `main` uses `focusedOnlyFor(ROSTER_NAME)` (ignores env) | **23 passed** |
  | M5 `:366` ungated (`true ?`) | **23 passed** |
  | M6 catch swallows (no exit 2) | **23 passed** |
  | M7 `off` log line removed | **23 passed** |

## Findings

### Critical
None.

### Important
- **I1 `interview60.flight.mjs:311,346,366`: the effect itself (no Flash arm under `off`, exit 2 on a bad value, the `off` line) is proven by nothing.** The vitest that A2 names only proves `focusedFor`. M4–M7 survive. M4 is the worst case: the log says `FOCUSED  off …` while the four Flash arms fly. The registration promises that no full-Flash quota is spent, but the only check it names comes after the hour, once that quota would already be gone. The report says so itself ("Not exercised"). Rule 7 asks for one exercise of a new path before anything depends on it. The cheapest proof needs no code change and no network: `node interview60.flight.mjs p2dry --dry-run` on a throwaway copy (empty `.env`, no key; `run()` spawns nothing when dry, and `moveAside`, done.json and the prompts read are all `!dry`-gated), three times:
  - `NATIVELY_FLIGHT_FOCUSED=off`: the `off` line is present, no `RUN … answers.mjs --model gemini-3.[5-8]-flash` line appears, and the bare and paired RUN lines are present.
  - unset (the calibration with a known answer): exactly 4 such Flash RUN lines.
  - `yes`: the `ABORT …"yes"…` line, exit code 2, and no `RUN` line at all.

  Record the three logs. If the P7 dry launcher already runs the flight's `--dry-run` with the A2 env, reading its log this way meets the off leg, but the unset and `yes` legs still need to be run. If the dispatch forbids even a dry run of the flight script, hand this exercise to the session that owns P7.

### Minor
- **m1 `interview60.flight.mjs:346`:** the `off` log line re-reads `process.env` instead of following the value that gates the arms (`focusedOnly`, `:366`). There are two sources of truth, and M4 shows they can disagree. A single `const focusedOff = process.env.NATIVELY_FLIGHT_FOCUSED === 'off'` next to `:311`, or having the log derive from the same decision, would make the log line evidence of the gate rather than of the env.
- **m2 `interview60.flight.mjs:390`:** done.json records `focusedOnly: null` for both `off` and "roster has none", so the pass record cannot say why the arms are absent. The launcher log carries the reason, and that log is the registered proof, so this is acceptable. Note it in the pass record.
- **m3 `interview60.flight.focused.test.ts:27`:** the file has no trailing newline. The other 13 `*.test.ts` in the dir end with one.

## Not shown
- `main()` was not executed in any mode (the dispatch forbade running the flight). The wiring rests on my static read plus I1's still-pending exercise.
- The app's in-hour model choice comes from its saved settings and env (e.g. `NATIVELY_VERBAL_PRIMARY_MODEL`). That sits outside P2, and a full-Flash id there would not be stopped by this flag. No such literal exists in the app source.
- MAIN landing and the `launch-eq-src.txt` setting are not done yet (out of P2's commit by design). The guard's g3 (P6) is where `off` is enforced exactly.
- Leftover: `SP\eq-tmp\p2rev\` (a copy, with a `node_modules` junction to MAIN's node_modules; delete the junction with `rmdir`, not a recursive delete), plus `p2rev-setup.mjs`, `p2rev-run.ps1` and `p2rev-mut.mjs` in `SP\eq-tmp`.
