# R2-PREP: harness prep for the b1-final-r2 re-fly (2026-10-13)

No app start, no task registration, no model/API call, no .env read, MAIN's git untouched (one read-only `rev-parse HEAD`).
MAIN HEAD = 999b5152ead850363875e9e23956c9860706dc04.

## Files changed (diff line counts vs the backups in flight\r2bak\)
| file | + / - lines | change |
|---|---|---|
| smoke\gen-launchers-b1.mjs | +5 / -3 | `--label` (default b1-final; exactly b1-final or b1-final-r2, else exit 2). Sets the FLIGHT run label only; the smoke keeps b1-smoke |
| flight\grade\launch-grader-b1.mjs | +10 / -7 | `--label` (same two values; refused otherwise, also when it has no value). Folder check uses the label. r2 grading, verdicts and logs go to flight\grade-r2\{grading,verdicts,launches.jsonl,...}; b1-final paths unchanged |
| flight\grade\score-b1.mjs | +3 / -2 | `--label` (same). Folder check and the check-smoke-cues label use it; default --grade-dir = flight\grade-r2 for r2 |
| smoke\guard-b1.mjs, register-b1.ps1 | none | Neither checks the run label (guard is by --kind; tasks are Natively-flight-b1*). Task names kept: one flight at a time |
| flight\launch-b1-flight.cmd, launch-b1-flight-dry.cmd | regenerated | commit 999b5152..., flight.mjs label b1-final-r2 |

Backups of the five pre-edit files: flight\r2bak\. Scorer and launcher otherwise byte-identical in logic.

## Calibration / checks (commands and exits)
- Generator default regen (no --label) to a temp dir: both flight .cmd byte-identical to the pre-edit files (fc /b, equal hash). Smoke launchers regenerate to the hashes logged by the 2026-10-09 smoke (2ff6aaa1... smoke, b0d7fb4d... dry). My first real regen overwrote the two smoke launchers with commit 999b5152; they were restored (hashes verified).
- `gen-launchers-b1.mjs --label b1-final-r3` and `--label foo`: exit 2. Smoke launchers unchanged by --label.
- Generator's own read-back checks (ASCII, CRLF, parentheses in echo): passed in the real regen, exit 0.
- Grader launcher `--plan` (fake folders under %TEMP%\r2runs):
  - `<stamp>-b1-final-r2` with `--label b1-final-r2`: name accepted; plan paths -> ..\grade-r2\verdicts\...; exit 3 (blocked only by missing pairs files and the probe gate, as expected on a fake folder).
  - `<stamp>-b1-final` with `--label b1-final-r2`: REFUSED, exit 2.
  - `<stamp>-router-default-r1` with `--label b1-final-r2`: REFUSED, exit 2.
  - r2 folder with the default label: REFUSED, exit 2. b1-final folder with the default label: accepted (paths in flight\grade, unchanged). `--label b1-final-r3` and `--label` with no value: REFUSED, exit 2. flight\grade-r2 was not created by --plan.
- Scorer: b1-final folder + `--label b1-final-r2`: REFUSED exit 2; r2 folder + default label: REFUSED exit 2; `--label x`: REFUSED exit 2; r2 folder + r2 label: passes the name check, then REFUSED by the reader (no timeline in the fake folder), exit 2.
- `node cal-score-b1.mjs --quiet`: `CAL PASSED: 103 checks, 0 bad`, exit 0 (includes its existing "suffix b1-final-r2 refused" case under the default label).
- `node mutants-score-b1.mjs`: exit 1, crashes copying `reader-template.txt` (absent from flight\grade). Unrelated to this change; NOT RUN to completion. The stray `mut\` dir it created was removed.
- Launcher guard: dry env taken from the regenerated dry .cmd, `node guard-b1.mjs --kind flight --dry` from MAIN, T 2026-10-14 01:00, exit 0.

## Launcher sha256
- launch-b1-flight.cmd      715003CF719452E1EB8864BDD4C988C7017A625ED3F35D325CD42BBF7AD48326
- launch-b1-flight-dry.cmd  FEA17D6F80384100F2DA1431E5E03DC19BDA51D685F28B537E7DF637933A1A4F

## Guard line (dry twin, flight)
GUARD OK: flight (dry twin), roster live40 (47 items), no model or thinking override, gemini-3.1-flash-lite LOW with the gemini-3.5-flash-lite fallback at HIGH, hedge ON by default (trigger 5000ms), follow-up parent OFF, router flag exactly 1, earlier question unset, fault drill ABSENT, dist proofs b1-proofs ALL PASSED (router instruction e29bf3810128, typed 4495445db0c2, cue rule 8e15e4e7dd41, markers, dist newer than source), T 2026-10-14 01:00 (clock window not checked (dry twin)), HEAD pinned at 999b5152ead850363875e9e23956c9860706dc04, tree clean but for the allowlisted paths present [...], arms exactly high,low,captured-high, focused arms OFF, host: no app, port 5180 free, no other Natively task running, no orphaned tail, session 1 = console 1, quota headroom 316 on 3.5-lite (>= 224) and 344 on 3.1-lite (>= 90) from the ledger reset 2026-10-12T07:00:00.000Z with 150 script requests, knowledge mode ON, night gates OK, precheck not required (dry twin), .env carries none of the guarded names

## Not shown / caveats
- Launcher sha12 changed (ee38b373a6a7 -> 36d450eefaa8). Existing b1-final probe and grade records in flight\grade are bound to the old sha, so with the edited launcher/scorer they read as "another launcher version" (plan shows it). Re-scoring b1-final needs the originals in flight\r2bak\. r2 starts with an empty grade-r2 and needs its own cwdprobe-1/2/3 (the plan shows the gate BLOCKED until then).
- The launcher log b1-flight.launcher.log and observe log are shared with b1-final (same stem); the scorer reads from the last `=== LAUNCHER b1-flight start`, so the r2 start is the one read. The r2 flight must start with b1-flight.observe.log handled by the user's choice (it is overwritten/appended by the sampler as before).
- MAIN's interview60.flight.mjs accepts any label argument (not changed); the end-to-end flight with label b1-final-r2 and the real scorer on a real r2 folder were not exercised.
- Task names stay Natively-flight-b1*; the generated cmd's header comment now says run label b1-final-r2.
