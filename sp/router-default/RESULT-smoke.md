# Router-default smoke result (Task 17, checkpoint 3)

Smoke flown from MAIN 19937ab (build 2026-10-07 01:37), scheduled task `Natively-router-smoke`, label `router-smoke`,
run folder `electron/test/golden/interview60.runs/2026-10-06T23-01-59-router-smoke` (01:40 -> 02:02 TST).
Reader output: `LAB\SMOKE-READ.txt` (reader `router-hour-read.mjs` sha12 2d17df40226e, `--down-limit-min 2`).

Earlier attempts:
- 00:58: launcher exit 8, `live40.wav` absent in MAIN (gitignored asset). Fixed by copying `live40.wav`
  (sha256/12 F6DF5D53E8D8) and `live40-tts-local\` (94 files) from the lane D worktree; `wav:check` PASS, 47 items.
- 01:03 (folder 2026-10-06T22-25-42-router-smoke, MAIN 4511f20): CHECKPOINT DEFECT, 43/47 decisions late (router first
  word 2.9-6.3 s after Q). Root cause: the native SilenceSuppressor thins silence to one 20 ms zero frame per 100 ms and
  the router was fed that stream, so Gemini Live's end of turn (audio time) came seconds late. Fix 19937ab: the router
  session pads zero PCM up to real time around all-zero chunks only (Opus-reviewed, APPROVE). Same observation after
  the fix: late 43 -> 12, Live shown 1 -> 20, live_first p50 3705 -> 1541 ms, EASY caught 1/20 -> 17/20.

## Items

1. `[Router]` line kinds seen: `flag` (on), `ear model` (gemini-3.1-flash-live-preview), `session connect` (1),
   `session up` (1), `dispatch turn` (49), `turn` decisions (49 + 2 unpaired). Never reached: `session failed`,
   `ear failover` (either form), `superseded`, `undispatched`, router reconnect (quota or ordinary), router close.
2. `[LiveRouter] close` (ear): 2 closes, both `stale=yes`; no `stale=no` close; router closes 0.
3. Cases as they occurred: A (Live shown, valid easy answer, no append) 20; pipeline shown 27 (hard 13, late 12,
   no-router-turn 2); C (append) 0; D/E (supersede) 0. Overlay screenshots not taken (the user asleep, no computer-use
   grant): log only, residual.
4. Both capture files exist (live 20, shadow 20, appended 0; reader MATCH, file MATCH). A hidden shadow's `words`
   (RE01, 71) is among the `[Answer] budget: words=` values.
5. History rule: for a shown=live turn (RE01, 30 words) an `[Answer] full:` line with the Live answer's word count exists
   (word counts only, no text read into this record).
6. Play-window attribution: 47 decisions in the hour, all mapped; 2 outside the hour (probe).
7. The gap: 49 dispatches, 49 answer ends, 0 overruns (`build\gap-check.mjs`, self-test PASS). gapMs stays 20 000;
   no wav rebuild.
8. context_sha12=b2a43a2159a2 context_chars=266 (one connect, so the same on every connect).
9. Residual branches not reached: router reconnect and its context re-send, session failed / VOID, ear failover,
   append (case C), supersede (D/E), undispatched pass-through, superseded diag line, quota close.

## Reader bars (pre-grade)

Safety (text half) PASS; Fallback PASS; Speed PASS (live_first p50 1541.5 ms, n 20); Routing FAIL: EASY caught 17/20
(>= 13 PASS) but HARD misrouted 3/27 (> 1): RH04, RH08, RH09 shown Live. Integrity counts all 0; captures MATCH.

## Checkpoint 3

No Safety-class defect (no shown hard first word, no marker in either set, no `sent=0`), integrity counts 0: CLEAN.
The HARD misroutes are the router model's routing, measured by the flight's Routing bar; the router is NOT tuned on
this smoke (it plays the flight's own roster). If the flight reproduces them, Routing FAILs and the verdict is
INCONCLUSIVE (Safety decides separately on the graded Live answers).

Quota after the smokes (ledger 22:37Z, before smoke 3): used35=50 used31=3; smoke 3 adds about the same.
