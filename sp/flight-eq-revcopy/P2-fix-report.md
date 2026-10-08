# P2 fix round: m1, m3, I1

Commit `f04a42a` on build/earlier-question (parent 2714838): "test(flight): the focused-off log line reads the gating value". Trailer: Co-Authored-By: Claude Opus 5.5. WT status clean after; `node_modules\.vite` deleted (an empty `node_modules` dir remains, 0 entries).

## Edits (written by a node script that asserted one anchor per replacement)
- m1 `interview60.flight.mjs:310-313,348`: `main()` reads the env once into `focusedEnv = { NATIVELY_FLIGHT_FOCUSED: process.env.NATIVELY_FLIGHT_FOCUSED }`. `focusedFor(ROSTER_NAME, focusedEnv)` gates the arms; the `FOCUSED  off …` line tests `focusedEnv.NATIVELY_FLIGHT_FOCUSED === 'off'`. There is no second env read of that variable.
- m3 `interview60.flight.focused.test.ts`: trailing newline added.
- m2 left, as told.

## Tests (MAIN vitest from SP\eq-tmp, --root WT)
`interview60.flight.focused.test.ts` 3 passed, `interview60.flight.test.ts` 20 passed: 23/23.

## I1: dry-run read (before any run)
`--dry-run` starts no app, electron, scheduled task, network call or model call:
- Imports (`:39-43`): fs, path, child_process, url, `roster.mjs`. `roster.mjs:23-25` imports only the three question files; a grep of all four found no fetch/http/spawn/exec/readFileSync.
- `run()` `:268-272`: logs `RUN`, then `if (dry) return Promise.resolve(0)` before any `spawn` (`:275`).
- Probe `:315`, auto `:323`, prompts `:343`, answers `:368`, chains `:376`, judge `:382-383`, pass-record `:398` all go through `run(..., { dry })`. `liveModel` is the default without a probe (`:316`).
- `moveAside` `:334`, prompts JSON read `:349`, copyFileSync `:371-378`, done.json `:395` are all `!dry`-gated.
- Local effects only: `gitHead()` `:296` (local `git rev-parse`), `log()` `:261-265` appends to the log file beside the script, `fs.existsSync(.env)` `:312`.

## I1: dry-run proof
Setup: a fresh copy of the 37 top-level .mjs/.cjs/.json files of `electron/test/golden` at WT HEAD f04a42a (read with `git show HEAD:`, so the committed bytes), under `SP\eq-tmp\p2dry`, with an EMPTY `.env` (0 bytes), a stub package.json and no node_modules. No key variables in the shell env either (checked: no NATIVELY/GEMINI/GROQ/KEY names). Env: NATIVELY_ROSTER=scenario50, NATIVELY_SCENARIOS=S1,S2. Script: `node electron\test\golden\interview60.flight.mjs p2dry --dry-run`. Logs: `P2-dryrun-{off,unset,yes}.txt` (scanned for AIza / sk- / gsk_ / API_KEY= / Bearer: 0 hits; they contain no prompt text, only command lines).

| leg | exit | full-Flash RUN lines (`--model gemini-3.[5-8]-flash `) | bare lite RUN | paired (`--tag`) RUN | FOCUSED line | ABORT | RUN total |
|---|---|---|---|---|---|---|---|
| `off` | 0 | **0** | 2 | 12 | `FOCUSED  off by NATIVELY_FLIGHT_FOCUSED=off - skipping the 4 focused arms` | 0 | 34 |
| unset | 0 | **4** (3.8, 3.7, 3.6, 3.5-flash, each `--only S1Q02,S1Q08,S2Q02,S1Q07,S1Q06 --captured …`) | 2 | 12 | none | 0 | 42 |
| `yes` | **2** | 0 | 0 | 0 | none | `ABORT NATIVELY_FLIGHT_FOCUSED="yes" is not recognised: set it to "off" or leave it unset` | **0** (3 log lines in all) |

- Calibration: the unset leg is the known-answer case. The same regex finds exactly 4 there and 0 under `off`, so it would have shown a Flash arm.
- The `off` line comes from `focusedEnv`, the value that also gates `:366`, so the M4 gap (line says off while arms fly) cannot occur with this wiring.
- The `off` vs unset RUN totals differ by 8: 4 answers lines plus 4 judge `--answers` exports, the arms' own files.

## Cleanup
- `p2dry` had no reparse points; removed with a recursive delete (nothing to follow).
- The reviewer's `SP\eq-tmp\p2rev\node_modules` junction (target: MAIN node_modules) removed with `cmd /c rmdir`; MAIN `node_modules\vitest\vitest.mjs` still present; `p2rev` then had 0 reparse points and was removed.
- `p2rev-setup.mjs`, `p2rev-run.ps1`, `p2rev-mut.mjs` in `SP\eq-tmp` are the reviewer's and left alone.

## Not shown
- The dry run proves the wiring and the logged commands, not what a live `answers.mjs` would do given a Flash id; that rests on the static read that no other site passes one.
- The roster env was the reviewer's case (scenario50 S1,S2); `off` on a roster with no focused five (holdout40) is covered by the unit test only, not by a dry run.
- Mutants M4-M7 were not re-run; the dry run is what covers them (it would fail M4, M5 and M7 by output, and M6 by exit code).
- Edits to `eq-build` went through a node script and PowerShell `git -C` because this session's Edit tool is isolated to the whole-turn worktree; the controller authorised that in chat.
