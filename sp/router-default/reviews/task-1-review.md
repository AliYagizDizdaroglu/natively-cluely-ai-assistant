# Task 1 review (Opus): ear reconnect generation guard + model parameter

Reviewed: WT live-router-a at 7a84d20 (feat/live-router-a HEAD, read from the worktree's gitdir), `reviews/task-1.diff`,
`reports/task-1-report.md`, PLAN.md Task 1 (294-448), SPEC §7.3 (530-549) and §5 line 434, DIAG Q1.

**SPEC: PASS  QUALITY: CHANGES** (code correct; tests do not isolate three of the four guards)

## Evidence I ran
- `GeminiLiveRouter.test.ts` in WT from $TEMP: **36/36 pass**.
- `tsc -p electron/tsconfig.json`: **6 errors**, the baseline set (GeminiLiveRouter.ts(125) is pre-existing; the diff starts at line 252). Root tsc not re-run (report: clean).
- Mutation sweep on a scratch copy (scratchpad `t1/`, `mut.mjs`): each guard removed alone, run against the plan's 36 tests plus 4 sharper candidate tests (S1-S4, below).

| Mutant (removed alone) | Plan's 36 tests | Sharper test that goes red |
|--|--|--|
| M1 `gen !== this.generation` in connect's late-session check | green | S1 |
| M2 `this.generation++` in `stop()` | green | S2 |
| M3 `this.generation++` in the goAway handler | **green** | S4 |
| M4 `if (this.reconnectTimer) return` in `scheduleReconnect` | **green** | S3 |
| M5 `if (stale) return` in `handleClose` | red (stale-onclose test) | - |
| M6 gen check in `onmessage` | green | S2 |
| M7 gen check in `onopen` | green | S2 |
| M8 `code=` dropped from the close line | red (close-code test) | S4 |
| M3+M4 together | red (goAway test + stale-onclose test) | S3, S4 |
| connect late-session check removed entirely (gen + stopping) | red (pin 1) | S1 |

## The four checks the dispatch named
1. **goAway marks the old session stale before close:** implemented (GeminiLiveRouter.ts goAway block: `this.session = null; this.generation++;` then `session?.close()`). **Not isolated by any test** (M3 green on all 36).
2. **Stale callbacks do nothing:** implemented for onopen, onmessage, onclose, and the late resolved session. Only the `handleClose` stale return is isolated (M5). onopen/onmessage gates (M6, M7) survive the suite.
3. **No reconnect while one is pending:** implemented (`scheduleReconnect` second line; `scheduleSlowRetry` already guarded; the quota path clears and replaces its own timer, non-stale only). **Not isolated** (M4 green).
4. **Close code logged:** `[LiveRouter] close gen=<n> code=<n|-> reason=<…> stale=<yes|no>` on every onclose and on the connect-throw path; matches SPEC line 434. Pinned (M8 red).

## Findings

**IMPORTANT 1 - the headline goAway test is also a two-guard pin.** GeminiLiveRouter.test.ts "a goAway gives exactly one reconnect" goes red only when M3 and M4 are removed together: with either alone, the other absorbs the second `scheduleReconnect`. The report flags only the two labelled regression pins, so the controller does not know that the DIAG's own test (SPEC 544) proves neither guard individually. Rests on: REVIEWER-RULES "tests that would fail if the behaviour were absent"; PLAN 75 (a test counts once broken and seen to fail).
- Why it matters: without M3, the goAway close is non-stale. It logs `stale=no`, which Task 14's stale-close tally and the smoke's "no `connection closed` after a goAway" check would misread. A quota-reason close in that window would also replace the pending 300 ms reconnect with a 5 s backoff.
- Fix: add S4 (after goAway, the old session's close line reads `gen=1 code=1000 reason=connection closed stale=yes`) and S3 (two `scheduleReconnect` calls give one connect; it has to call the private method, because once M3 is in place the double is unreachable through public paths).

**IMPORTANT 2 - the two regression pins: not acceptable as written; sharper tests exist and are cheap.** Both pins go red only when the `stopping` path is removed too, so they prove nothing about the generation terms. The terms have real roles that `stopping` does not cover:
- **Pin 1 (M1).** The gen term matters when a newer connect starts while an older one is still in flight, with no stop. Example: the in-flight session's onclose fires (current gen), a reconnect fires, and then the first promise resolves late. Without the term, the late session is adopted and the newer one is orphaned, which is the DIAG mechanism. S1 reproduces this and goes red on M1 alone.
- **Pin 2 (M2).** `stopping` guards `handleClose` but neither `onopen` nor `handleMessage`. Without `generation++` in `stop()`, a late `onopen` after stop sets state `connected`, and a late `toolCall` emits `question` after the meeting ended. S2 (after stop: late onopen + late handle_question toolCall, so state stays `stopped` and no `question` fires) goes red on M2, M6 and M7 each alone. That makes it the only test covering the onmessage/onopen gates.
- Recommendation: add S1, S2, S3 and S4 to the new describe. They are verified: 40/40 green on 7a84d20, and each goes red on its mutant alone (table above). Source: `scratchpad\t1\electron\audio\sharp.test.ts`, about 70 lines. Keep the plan's two pins; they still pin the `stopping` path.

**MINOR 1 - report inaccuracy.** The report says the stale-onclose test showed "4 connects vs 2" before impl; the plan expected 3. Harmless (old code double-reconnects plus the orphan's close), but the quoted failure should match what was seen. No action needed beyond accuracy.

**MINOR 2 - `GeminiLiveRouter.test.ts` lacks a trailing newline** (diff: "No newline at end of file"). Cosmetic.

**MINOR 3 (for Task 11, not Task 1) - `LIVE_ROUTER_MODEL` honours `NATIVELY_LIVE_MODEL`** (GeminiLiveRouter.ts:61-62). Task 11's `shouldFailOver` compares the model to the literal `gemini-3.1-flash-live-preview`, so an env override silently disables failover. Task 11's author should know this; it is not a Task 1 defect.

## Interfaces downstream tasks rely on (all present as named)
- **Task 2:** `resampleTo16kMono`, `LiveConnectFn` and `LiveSessionLike` are exported (GeminiLiveRouter.ts:147, 221, 229). Task 2 re-implements the guard pattern rather than importing it, so the only coupling is these types. They match Task 2's usage, and its fakes must supply `sendToolResponse` to satisfy `LiveSessionLike`.
- **Task 11:**
  - `new GeminiLiveRouter(getApiKey, connectFn?, model?)` and `getModel()` exist.
  - `'status'` still emits `{ state, reason? }`, and `'failed'` keeps the reason (`setState('failed', reason)` and `'No Gemini API key configured'` are unchanged).
  - `main.ts` `startLiveRouter()` (2200) takes no model yet. That is Task 11's own step 3.
  - `stopLiveRouter()` calls `stop()`, which now bumps the generation, so the 3.1 instance's late callbacks are inert once failover replaces it.

## Not shown
- No live reconnect observed; the ~6/h effect is the smoke's to prove (SPEC 547).
- The real SDK's ordering of onopen/onclose relative to `live.connect` resolving is not probed. S1's "onclose before resolve" sequence is a constructed case.
- Root tsc was not re-run.

## Re-review

**Scope:** fix round 1, branch head 2873a76 (read from the worktree's ref). It changes tests only: `GeminiLiveRouter.ts` is
byte-identical to the 7a84d20 copy reviewed above.

**SPEC: PASS  QUALITY: APPROVE**

**What I ran.** The same mutation sweep (scratchpad `t1/mut.mjs`) against the new `GeminiLiveRouter.test.ts`, with my
scratch S1–S4 file removed so that only the committed tests ran. Unmutated, it passes 40/40.

**Every row of the implementer's table holds**, each guard removed alone (one test red, 39/40):

| Guard removed | Test that goes red |
|--|--|
| M1 | S1 |
| M2 | S2 |
| M3 | S4 |
| M4 | S3a |
| M5 | stale-onclose |
| M6 | S2 |
| M7 | S2 |

Also checked:
- M8 (`code=` dropped from the close line) turns 2 tests red: close-code and S4.
- M3 and M4 removed together turn 4 tests red, the goAway test among them.

**Prior findings**
- IMPORTANT 1 and IMPORTANT 2 are resolved.
  - The pins are now labelled as covering the `stopping` path only (test lines 595 and 609).
  - Each guard term now has a test that isolates it.
- MINOR 2 (trailing newline): fixed.
- MINOR 1 (report wording) and MINOR 3 (for Task 11): unchanged and not blocking.

**New MINOR.** The test title `'S3a second scheduleReconnect…'` is missing a space. It is cosmetic, carried over from
my scratch file.

**Not shown**
- No live reconnect was observed.
- tsc was not re-run. Only tests changed, so no source types are affected.
