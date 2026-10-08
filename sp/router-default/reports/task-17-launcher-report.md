# Task 17 (file step): router smoke launcher

Status: DONE_WITH_CONCERNS (concerns below). The .cmd was NOT run.

Files (LAB = natively-lab\sp\router-default):
- gen-launch-router-smoke.mjs: writes launch-router-smoke.cmd (68 lines, 3713 bytes, ASCII, CRLF 68, bare LF 0, bare CR 0, bytes above 126: 0), reads it back byte by byte and line by line (equal true). Lints before writing: balanced if-blocks, no unexpanded placeholders or @@, ASCII, no trailing space, no special characters in rem lines or in echoes inside if-blocks.
- launch-router-smoke.cmd (generated).
- gen-launch-router-smoke.cal.mjs: asserts the 3 set names, the 32 cleared names (its own independent list), absence of NATIVELY_FLIGHT_FOCUSED, and the wav:check / auto router-smoke / app:stop / log lines. Result: real file PASS; 39/39 mutants caught (each set line removed, ROSTER changed to scenario50, FLIGHT_FOCUSED added, label changed, app:stop removed). CALIBRATION: PASS.

Launcher: finds MAIN by wildcard (`for /d ... Masa*` plus a .git check, as register-rd.ps1 does) so the file stays ASCII; exit 9 if interview60.run.mjs is not found; exit 8 no live40.wav; exit 6 harness lacks process.on('exit', appStop); sets ROUTER=1, ROSTER=live40, STT=deepgram; clears the flight-eq names (minus those flight-eq sets) plus EARLIER_QUESTION, FLIGHT_ARMS, LIVE_MODEL, SCENARIOS; wav:check (exit 5 on failure); `auto router-smoke`; then `app:stop`; exits with the auto run's code.

Deviations and concerns:
1. Log path: the task says MAIN\interview60.runs\..., but that folder does not exist; runs live in MAIN\electron\test\golden\interview60.runs (flight launchers use it). The launcher logs there.
2. Key wrapper: launch-eq.cmd and the rd launcher use none (the scheduled task runs in the user's session; the app reads its own credentials), so none was added. Memory says a key wrapper is needed for WORKTREE launchers only; this one runs in MAIN. Not shown: that the app finds its keys when Task 17 step 2 registers it.
3. The cleared-name list was copied from flight-eq's common section (it equals the rd launcher's list), not re-derived from app source.
4. Not exercised: the .cmd itself (never run, per instruction), so the wildcard cd, findstr guard and exit codes are linted but unrun under cmd.
