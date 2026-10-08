# Task 3 report (Steps 1-2): live-probe.mjs and register-once.ps1

Status: DONE_WITH_CONCERNS. Nothing committed (the files live in LAB). No model call, no network, no scheduled-task cmdlet that writes.

## Files (LAB = natively-lab\sp\router-default)
- `LAB\live-probe.mjs` : `--dist <dir>` (default lane A `dist-electron`), `--dry`, `--dry-break-sha`.
- `LAB\register-once.ps1` : UTF-8 BOM, CRLF. Params -Name -Execute -Argument -WorkingDirectory, exactly one of -At / -InMinutes, -LimitMinutes, -Verify, -Plan. Interactive, StartWhenAvailable not set, read back and asserted (Ready, StartWhenAvailable False, Interactive, one trigger, next run within 60 s of request, action text equal); never starts the task. Parser: 0 errors; `-Plan` and the one-of-two refusal exercised (exit 0 / 2). The real registration path was NOT run (rules).

## Probe design
- Loads built `LiveRouterSession.js`, `routeReader.js`, `GeminiLiveRouter.js` (`resampleTo16kMono`) via createRequire from the dist; asserts ROUTER_MODEL and ROUTER_SHAS_OK, prints both sha12.
- Clips from `sp\live40\clips` (RE05, RH02, RE13, RH16): sha12 checked against `clips\manifest.json` (all 4 match, verified), 24 kHz mono 16-bit checked. Manifest `path` fields point at an old scratchpad, so they are not used.
- 60 ms chunks (1920 B at 16 kHz) at real time, then 25 x 60 ms silence, wait for the turn's end event or 12 s; forced reconnect through the captured real session's `close()` after clip 2; 15 s waits for `state up`.
- Real key: read from MAIN `.env` in-process (router40 run-r.mjs pattern), prints "present", never the value. Real `connectFn` = the same `GoogleGenAI({apiVersion:'v1beta'}).live.connect` as `defaultConnect`, resolved from the dist's node_modules chain.
- Verdict per plan; additionally context sha must equal sha12(FIXTURE) (stronger than "same across connects"). MISMATCH lines do not fail. Output: ids, classes, ms, routes, reasons, word counts, `[Router] session ...` lines only.
- FIXTURE is a made-up 3-line, 127-char summary (Candidate / Skills / Target role), not Task 2's test text.

## Dry design
`--dry` swaps ONLY `realConnect` (and the key). The fake counts non-zero audio runs as utterances and answers the n-th with ORDER[n] (EASY text 21 words or "hard"), so the probe's own code path is untouched. `--dry` still REQUIRES the built dist. `--dry-break-sha` rewrites the context_sha12 of the second connect LOG line (the session computes the sha itself, so the fake cannot change it any other way); this calibrates the comparator, not the session.

## Dry status (Step 2)
The controller's dist does not exist yet, so I calibrated against a THROWAWAY tsc compile of the three modules into `%TEMP%\probe-dist` (outside every repo; `--module commonjs`, not `build:electron`). Results:
- `--dry`: PROBE PASS, exit 0 (4 turns, endKind generationComplete, EASY easy-answer, HARD hard; 2 connects same sha dd1e8cca2021 127 chars; 2 session up).
- `--dry --dry-break-sha`: `PROBE FAIL context sha changed across the forced reconnect`, exit 1.
- Re-run both against the real dist after the controller's build: `node live-probe.mjs --dry --dist <WT-A>\dist-electron` and with `--dry-break-sha`.

## Not exercised
- The real connect branch (key read, `@google/genai` resolution from the dist path, real Live behaviour): needs the build and the scheduled run. `req('@google/genai')` resolves from `<WT-A>\node_modules`; if the dist moves, it may not.
- FAIL branches other than the sha one (no up, no end event, no EASY easy-answer) are by code reading only.

## Concerns
- firstTextMs/firstWordMs are relative to clip end (before the 1.5 s silence), as the plan says; the fake gives negative values, a real model may too if it answers during the silence.
- A late `afterComplete` text for a previous clip is ignored (only new seqs count); a turn that spans two clips would show as a missing turn for one.
- Verdict requires exactly 2 `session connect` lines; an unplanned reconnect (goAway) fails the probe as "N session connect lines".
- Clip RE05 etc. are rendered TTS; the in-app summary non-emptiness stays with Task 17, per the plan's deviation note.
