# Task 2 report: LiveRouterSession, instruction constants, profile summary

Status: DONE. Commit cdfb0dd on feat/live-router-a (on top of 7a84d20). Nothing pushed or merged.

## Files
- `LAB\gen-router-instruction.mjs` (new, in LAB); output staged at `stage\task-2\...` and applied.
- WT: `electron/audio/routerInstruction.ts` (generated; instruction 1210 chars sha12 e29bf3810128, block B 724 chars sha12 e11c240063ea), `electron/audio/LiveRouterSession.ts`, `electron/audio/LiveRouterSession.test.ts`, `electron/knowledge/KnowledgeOrchestrator.ts` (+14 lines, `getRouterProfileSummary()` after `getCompactJDHeader()`), `electron/knowledge/KnowledgeOrchestrator.routerProfile.test.ts`.
- Implementation is the plan's code verbatim (generation guard pattern as Task 1).

## Tests
- LiveRouterSession.test.ts: 15 tests (plan cases 1-13, with 10 split into 10a/10b, plus one extra `constants` test pinning both sha256 values and ROUTER_MODEL). routerProfile test: 6 tests. 21/21 pass. GeminiLiveRouter.test.ts (Task 1's, 36) still passes.
- RED (stub first, I4): the stub had the final exports and no-op methods. Result: 14 of 15 session tests failed and 3 of 6 profile tests failed (Full, Name only, Missing data), all in the test body, none from import errors. Quoted examples: `expected [] to include '[Router] session refused reason=model...'`, `expected +0 to be 1` (connect count), `expected 1 to be 3` (Full: the stub returned one line), 10a `expected +0 to be 4`. Cases 4-9, 11, 12 failed with `Cannot read properties of undefined (reading 'params'/'sent')` because the stub never connects (harness `conns[0]` is undefined). That is the stub's missing behaviour, but it is a TypeError in the harness, not a clean assertion. The `constants` test and the Off, No resume and determinism profile tests passed against the stub (they assert things the stub already does: real constants, and '' for Off / No resume).
- First green run had one failure that was my test's error (expected `gen=2` on the live close line; goAway bumps the generation, so the live reconnect is gen=3). Fixed in the test, not the code.
- Mutants (run against the worktree file, restored after; the file is identical to the commit):
  - (a) drop the gen check in onmessage: red, test 9
  - (b) failed on every slow retry: red, test 10a
  - (c) re-read getContext on every connect: red, test 11
  - (d) drop `if (stale) return;` in handleClose: red, test 9
  Script: `%TEMP%\claude\mutants.mjs` (throwaway).

## tsc
- Root config: 0 errors. Electron config: 6 errors, identical to `baseline-tsc-electron.txt`. My first test version added a 7th (implicit any[] on the fake db's getAllNodes); fixed with an annotation.

## Deviations
- Stage id is `task-2` (dispatch) not the plan's `T2`; the gen script's output path was changed to match.
- The profile test's fake db also supplies `getAllNodes()` (the constructor's refreshCache calls it). No vi.mock was needed; constructing KnowledgeOrchestrator with the fake db works.
- Extra `constants` test (not in the plan).

## Concerns
- `LiveRouterSession.write()` quota/failed paths: `onerror` only warns (as the plan code does); a socket error without a close would not trigger a reconnect. Same as the ear.
- Case 13 covers the retry path, but the "stop() during the 1 s wait returns without connecting" branch (`if (this.stopping) return;`) has no test.
- ROUTER_SHAS_OK being false is only exercised through the `shasOk: false` option, not by corrupting the generated constants.
- No live model call was made; the real `defaultConnect` (GoogleGenAI) path is unexercised (Task 3's probe).
