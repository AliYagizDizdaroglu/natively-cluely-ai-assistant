# wb-fix-a report (whole-branch review fix cluster A)

Worktree live-router, branch feat/live-router, from dae41f9. Staging id wb-fix-a. Git through PowerShell (coordinator-authorized).

## Commits
| sha | items |
|---|---|
| 4757002 | I-1 |
| fa39d86 | m-1 |
| 2d34cbe | m-2, m-3, m-4 |
| 9fbdf5b | m-5 |

## The exact I-1 rule (for the LAB hour reader fixer)
The first word is the first whitespace-delimited token whose letters-only form is non-empty, where letters-only = `tok.toLowerCase().replace(/[^a-z]/g, '')` (ASCII a-z only). Letterless leading tokens (`"`, `...`, `—`, `-`, `1.`) are skipped, only while they come before it.
- Complete: whitespace follows that token, or the turn has ended. Otherwise there is no first word yet (null).
- No letter token at all -> null.
- The hard test is unchanged: `^(hard)+$` on that token's letters-only form; clean = exactly `hard`.
- Implementation: `completeFirstWord` in routeReader.ts. The arbiter needed no edit because every first-word use (lines 132, 194, 211, 433) goes through it.
- Examples: `" hard` -> hard; `... hard` -> hard; `- Hard.` -> `Hard.`; `1. hard` -> hard; `" hard` while streaming -> null.
- Note `1.` or `"` is still counted as a token by `tokensOf` (word counts, marker, 80/8 limits unchanged).

## Tests (RED seen first, right reason)
- I-1: routeReader edge test + arbiter `it.each` (`" hard`, `... hard x8`). RED: `completeFirstWord('" hard')` gave `"`; the arbiter showed Live with `... hard` text. GREEN after. Replay: still 20 live / 27 pipeline, late RH07,RH17 (shownLive 20, shownPipeline 27, hardRows 25).
- m-1: wiring test with a `currentTurnId` dep (current = 4 and null -> dispatch time, `final`). RED: the other turn's speech end (900) was used. The wiring dep `currentTurnId()` is new; main.ts passes `() => this.turn.snapshot().id`. The second WiringDeps construction in the wiring test file was updated.
- m-2: unknown-turn pass-through test (one `[Router] undispatched turn=7 kind=source` line, 6 events, send/history as flag off, dispatchCount 0) + "opened but not dispatched is still held". RED: events were held, no line. Mutant (log-once check removed) -> the test fails (1 failed); restored.
- m-3: cue-only token then a replacing token keeps `replace`. RED: replace dropped. The duplicated comment was removed.
- m-4: renamed to "...its first token sent with replace:false (nothing shown yet)".
- m-5: the `ear failover disabled reason=NATIVELY_LIVE_MODEL ...` line passes the gate; `from=` still fails (the existing test). RED: it failed before the fix.

## Final checks
- Router files from a temp cwd: routeReader 18, routerArbiter 65, replay 3, routerWiring 24, earFailover 18, LiveRouterSession 20, routerHarness 55 (203 in 7 files), plus src/lib/answerMessages.test.ts 54/54. All pass.
- tsc: root 0 errors; electron 6 (the baseline: GeminiLiveRouter 125, ipcHandlers 3436x2/3439, KnowledgeOrchestrator 349/351).
- No build, no full suite, no app, no model calls.

## Deviation and concerns
- **m-2 scope narrowed.** Existing tests (row 1, I-3) legitimately forward pipeline events for an opened-but-not-yet-dispatched turn and expect them held until dispatch. So the pass-through + diag line applies only to turns the arbiter has no record of (never opened, or evicted past KEEP_TURNS), which is the reachable case in the review. A turn that is opened and never dispatched is still held and logs nothing; the review's "held forever" for that case is not addressed.
- The log-once set (`undispatchedLogged`) grows by one id per such turn; fine per meeting.
- m-3 test only covers the pipeline-mode replace path.
- Unexercised: the main.ts `currentTurnId` wiring (one line, covered by tsc only; no app run).
