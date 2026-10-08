# Task 12 report: live40 harness (lane D, WT live-router-d)

Status: DONE_WITH_CONCERNS. Commit 51e98d0 on feat/live-router-d (parent 17d199d).

## Files (all under electron/test/golden/)
- new: live40.gen.mjs, live40.clips.mjs, live40.questions.mjs (generated, 47 items), live40.test.ts
- modified: roster.mjs (live40 entry, SAMPLES.live40, `export TTS_NO_RENDER`, header comment line), interview60.build-audio-local.mjs (import + one throw in speak())
- untracked, as plan says (.gitignore does not cover live40 names; I did not edit it and did not add them): live40.wav (55 582 196 bytes), live40-tts-local/

## Tests (live40.test.ts, 11 tests; roster.test.ts 13 still pass: 24/24)
RED first, against stubs (gen/clips exit 99, empty LIVE40, no roster entry): 9 failed, for the right reasons (exit 99 vs expected 1/2/0; "NATIVELY_ROSTER=live40 is not a roster"; TTS_NO_RENDER undefined). Then implemented.
Cases: questions module (47 items, 31 chains, parent precedes child in same chain, E20 H11 QF9 AF7, gapMs 20000, level=route, topic=chain, order equals items.json, header carries sha); gen refuses a one-byte-changed items.json (exit 2, `items.json sha256 <64 hex> refused`) and reproduces the committed module byte for byte; clips: bad sha12 -> exit 1 naming RE05, nothing copied; 22 050 Hz clip with manifest sha made to match -> exit 1 `RE06 ... format`; good run copies 47 clips and .txt == q; builder refuses with `would re-render RE01 — refused (live40 reuses router40's clips)` and writes no wav; build -> `wav:check` exit 0 (`live40.wav matches live40  47 items`), and the SAME wav with 2 s of PCM cut (header length also rewritten, since the check reads the header) -> exit 1 (`live40.wav holds ... min but live40 ...`). That last pair is the rule-8 calibration.
All CLI cases run in a temp copy of the golden folder; nothing touches the real clips or wav. They skip (not pass) if the SP\live40 sources are absent.

## Real build (step 3, run in the worktree)
gen -> `47 items, sha e531772bdc6e`; clips -> 47 copied, 218.0 s, 24 kHz mono 16-bit, whole-file sha12 all match; builder -> `SUSPECT RE11 1.57 w/s, EF06 1.58 w/s` (expected), duration 19.3 min; `NATIVELY_ROSTER=live40 interview60.run.mjs wav:check` -> `live40.wav matches live40  47 items`, exit 0.

## tsc
root 0 errors (baseline 0); electron 6 (baseline 6). First attempt had a 7th (import.meta in the test); fixed with `__dirname`.

## Deviations / concerns
1. Duration: plan/spec says about 19.6 min; the arithmetic 218 + 47 x 20 s = 1158 s = 19.3 min, and the built file is 19.3 min. The plan's figure is off by 0.3 min; the wav matches the formula.
2. `interview60.run.mjs` resolves GEMINI_API_KEY at module load, even for `wav:check` (exits 2 without it). The worktree has no .env, so I ran wav:check (real and in tests) with a dummy `GEMINI_API_KEY=dummy-not-a-key`; no model call is made. The controller's env will have the real key.
3. `.gitignore` does not list live40.wav / live40-tts-local (it lists names per roster). Per plan I left them untracked and did not edit .gitignore; the controller may want to add the two lines (as holdout40 has) so `git status` stays clean.
4. gen/clips scripts hardcode the SP\live40 default path (override with --items / --src). Clips script ignores manifest `path` fields as planned.
5. Not exercised: playing the wav (no audio), the app, the timeline from run.mjs (computeOffsets was read, not run; level/topic are present on every item).
