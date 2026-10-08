# Task 8 review: renderer contract (95ed5a6 on c4812f5, live-router-c)

Reviewer: Opus (task reviewer). Brief: PLAN.md 1308-1375 + Global Constraints + Review Focus; spec §4.5 A–E.
Producer checked: live-router-b `electron/services/routerArbiter.ts` (Task 5 after its fix).

**SPEC: PASS  QUALITY: CHANGES**

## What I ran
- `answerMessages.test.ts` + `bubbleMetrics.test.ts` from a temp cwd: 2 files, 47 passed.
- Root tsc on live-router-c: clean (exit 0). I did not re-run the electron tsc; the report says it has the same 6 pre-existing errors.
- A throwaway probe (scratchpad `t8/probe.mts`, node `--experimental-strip-types` on a copy of `answerMessages.ts`) that folds four sequences through the pure functions. The results are quoted below.
- Not run: React, IPC, the app. The NativelyInterface wiring was checked by reading only.

## Spec compliance: PASS
Every rule (0–5) and every Step 1 test the brief lists is present:
- `usesKeyedPath`.
- Keyed replace: rewrites the first bubble of the turn and drops the later ones.
- Keyed token: appends only to a bubble with the same turnId, origin and append.
- Keyed final, with its replace branch and its `finalize(null)` + meta branch.
- `pendingSourceByTurn`, with no relabelling of an existing bubble.
- Per-bubble metrics with M1.
- The "(full answer)" header right before `CueBlock`, styled `overlay-text-muted`.
- The binding flag-off fold test, plus `usesKeyedPath` false for every event of it.

The binding test is calibrated: the implementer broke the gate and saw 3 failures. Nothing extra beyond the two `*For` helpers (Deviation 1, discussed below).

One brief inconsistency, not the implementer's fault. The Interfaces block says TTFT counts from "the live-question arrival". Rule 4 M1 says live-question carries no turnId and is not used. The code follows M1, which is correct.

## Priority 1: flag-off identity — HOLDS (behaviourally)
With the flag off, the arbiter passes events through unchanged: `forward()` with `!enabled` calls `send(ev)`. So no event carries `origin: 'live'` or `append`.

- **Token and final handlers:** `liveTurnsRef` is filled only by an `origin: 'live'` token (NativelyInterface.tsx:863), so it stays empty. `usesKeyedPathFor` is therefore false for every event: `key === null`, so `sm.markFirstToken` and `sm.markDone` run exactly as before.
  - Inside the pure functions, `usesKeyedPath(prev)` is false too, because no bubble has `origin: 'live'`.
  - The only difference is `storedTag`: bubbles carry `turnId` (and `origin` if present). Nothing renders or keys on them. The plan allows this ("plus an ignored turnId").
- **Source handler:** the keyed branch, which skips `sm.setSource`, needs `label === 'gemini-3.8-live'` or a turn in the empty set. No pipeline sentinel label equals that string: the labels are the primary model ids, `(fallback)`, `(hedge)`, `Gemma 4` and `Gemini Flash`. So `sm.setSource` runs as before.
- **Negotiation-coaching token branch:** unchanged.
- **Coaching final:** with `finalize(null)` it gains only `storedTag`.
- **Typed and manual answers** have no `turnId`, so `meta` is undefined and the result is identical.
- **preload / electron.d.ts:** only optional fields are added. The source subscription forwards `turnId` (undefined when absent).
- **Inert additions:** the `useEffect([messages])` clear, the `bubbleMetricsRef` init, and the `label` render (no flag-off message has `label`).

"Byte-identical" holds for behaviour and DOM. The message objects differ only by the stored `turnId`, which the plan allows.

## Priority 2: flag on, cases A–E
- **A (pipeline shown):** non-keyed, today's path plus `turnId`. Cues ride the first token, as today. **Cues do render on routed hard questions (rows 1–4), as the spec intends.**
- **B (Live shown):**
  - Live tokens are keyed and join only a streaming Live bubble of the same turn.
  - The Live final overwrites only that bubble's text, with the same shown text.
  - The arbiter sends no cues on Live tokens, and the keyed path adds cues only from `data.cues`. **So no cues appear on a Live bubble.**
  - The renderer cannot itself surface a garbled or invalid Live answer: it shows only what main sends, and it never merges pipeline text into a Live bubble or Live text into a pipeline bubble on the keyed path. Whether invalid Live text is ever sent is Task 5's job.
- **C ("(full answer)"):**
  - The append token never joins the Live bubble, because `append` must match (test plus code at answerMessages.ts:689-693).
  - The append final matches only the append bubble.
  - The Live text is not overwritten. The empty cue-only first token (Task 5 fix) opens the append bubble with `text: ''`, the cues and the label. That is correct.
  - The pipeline source event is forwarded before the append tokens (arbiter :296), so the append bubble takes the pipeline label. The head sentinel `WhatToAnswerLLM.ts:321` makes every pipeline stream emit one.
  - **Exception:** see finding I1, which loses the append text in an interleave.
- **D (hidden shadow):** nothing reaches the renderer.
- **E (supersede after Live):** the text is correct. The replace token rewrites the Live bubble as a pipeline bubble and removes the append. The model attribution is wrong (finding I2).

### Coordinator's extra case: a final-only replace (`replace: true`, no tokens) after Live finished
Probe results:
- **Live finished, with a finished append:** result `[q, L: text "Replacement.", origin live, sourceLabel gemini-3.8-live]`. The append is removed.
- **The same, with the append still streaming:** result `[q, L2: "Repl2."]`. The append is removed.

Verdict:
- **Replaced correctly, and nothing of the pipeline is lost.** The keyed final takes the replace branch (answerMessages.ts:799-801), and `finalize` spreads the Live bubble with the new text. `setIsProcessing(false)` still runs.
- **Stale state remains (finding I2):**
  - The rewritten bubble keeps `origin: 'live'` and `sourceLabel: 'gemini-3.8-live'`. The keyed-final replace branch does not apply the meta, unlike the keyed-token replace, which builds a fresh object with the meta fields.
  - Its metrics come from `bubbleMetrics.done(..., 'gemini-3.8-live')`, so the bar names Live for a pipeline answer. TTFT is null, because no `first()` was ever called for `k|pipeline|0`.
  - The ref mirror and `prev` now disagree. The probe gives `usesKeyedPath(prev)` = true and the mirror = false (NativelyInterface.tsx:923 deleted the turn). A later event of that turn would route its text keyed and its metrics through `sm`.

## Findings

**I1 — IMPORTANT (Review Focus 1). A turn k "(full answer)" bubble opened after turn k+1's 🎙 bubble swallows turn k+1's non-keyed pipeline tokens and final, and k's own append text is lost.**
- **Where:**
  - answerMessages.ts:766-773: the non-keyed token joins `lastMsg` when it is streaming, with no turnId check.
  - answerMessages.ts:806-811: the non-keyed final finalizes `lastMsg`.
- **Probe:** `[🎙k, Live k, 🎙k+1, P(k+1) streaming "P1 "]`, then a k append token "FULL k ", then a k+1 token "P2", then the k+1 final "P1 P2.". The result:
  - k+1's own bubble is stuck `isStreaming` with "P1 ";
  - the k "(full answer)" bubble (append, label, k's cues) now reads "P1 P2.", so k's full answer is gone;
  - k+1's answer is shown under turn k's header.
- **How it happens:** k's pipeline is aborted at k+1's dispatch, so k's append bubble never gets a final and stays `isStreaming` forever. Today the 🎙 bubble of a new turn shields the next turn from an orphaned streaming bubble. An append opened after that 🎙 bubble breaks the shield.
- **When it is reachable:** whenever k's Live display is still active at k+1's dispatch and then fails. Examples: the 10 s cap (Q_k + 10 000) after a quick follow-up, or a late marker / too-long.
- **Fix, flag-off identical (flag-off has no such bubbles):** in the non-keyed branch, do not join or finalize a `lastMsg` that is keyed, i.e. `lastMsg.append === true || lastMsg.origin === 'live'`. Open a new bubble or append `finalize(null)` instead.
- **Pin it** with a test of exactly the probe sequence.

**I2 — IMPORTANT (case E, implementer concern 2, the coordinator's final-only case). A superseded bubble is attributed to `gemini-3.8-live`.**
- **Two causes:**
  - **(a) Renderer.** `pendingSourceByTurn` keeps the Live label across a replace (NativelyInterface.tsx:859/920 read it at creation). The keyed-final replace branch keeps the Live bubble's `origin` and `sourceLabel` (answerMessages.ts:801 `finalize(prev[first])` with no meta).
  - **(b) Producer, confirmed in routerArbiter.ts.** After `finishLive`, `t.mode` stays `'live'`. The replacing stream's source sentinel arrives before its replace token or final, so `route()` holds it, and then `onSupersede` runs `t.held = []` (:372) and drops it. In `pending` mode the same function keeps the latest held source (:362-363), but not in live/appended mode. So the pipeline's real label never reaches the renderer in case E.
- **Effect:**
  - Final-only replace: the bar shows `gemini-3.8-live` with TTFT null.
  - Token-stream replace: the final goes through `sm`, whose source was not set by this stream. It shows `…` (set at live-question) or a stale label.
- **Fix:**
  - Task 5: keep and re-emit the latest held source in `onSupersede` for live/appended mode.
  - Task 8: on a keyed replace, clear `pendingSourceByTurn` for the turn (or set it from the next source). In the keyed-final replace branch, apply `keyedFields(meta)` over `finalize(prev[first])`, so origin becomes `pipeline` and the mirror and `prev` agree again.

**M1 — MINOR (implementer concern 1). After a token-stream supersede the metrics switch back to `sm`.**
- This follows the B2 gate literally: the rewritten bubble is no longer Live, so later events are off the keyed path. The spec's text is met.
- Cost:
  - the replace token's `first()` sits in `bubbleMetrics` forever;
  - the bubble's TTFT is measured by `sm` from the supersede's live-question to the second token (one token late), not from M1's turn start.
- Accept, or start `sm` on the keyed replace token. Do not keep the turn keyed through the ref: that would split the mirror from `prev` (see M2).

**M2 — MINOR (Deviation 1: the synchronous `usesKeyedPathFor` / `usesKeyedSourceFor` Set). The reasoning is sound; the mirror can drift in two places.**
- `usesKeyedPathFor` is sound: the sm-vs-bubbleMetrics choice is made before React runs the updater, and React applies queued updaters in order, so the mirror and the in-updater `usesKeyedPath(prev)` agree in the normal sequences A–E.
- They drift in two places:
  - **(a)** A Live bubble created by a Live final with no Live token. The final handler (NativelyInterface.tsx:916-924) never adds an `origin: 'live'` final's turn to the Set, so `prev` says keyed and the mirror does not. Reachable only if `shownText` is empty at `closeLive`.
  - **(b)** The final-only replace (I2): the Set entry is deleted but the bubble keeps `origin: 'live'`.
- In both, the text stays right; only metrics and source routing diverge.
- Fix: add the turn on any `origin === 'live'` event, final included. The fix for I2 cures (b).
- The text-routing decision correctly stays in the pure `usesKeyedPath`, which keeps flag-off identity provable.

**M3 — MINOR. An append final with no append token opens an append bubble without the "(full answer)" header.**
- answerMessages.ts:803: the final's meta carries no `label`. Probe: `label=undefined`.
- Reachable only if every held append token was filtered empty without cues.
- Fix: default `label: '(full answer)'` when `meta.append` in the keyed final's `finalize(null)` branch.

**M4 — MINOR (implementer concerns 3 and 4). Small leaks across a session.**
- `bubbleMetrics.turnStart` is never cleared: one entry per Live turn.
- `firstTs` and `bubbleSourceRef` keep orphaned keys for aborted bubbles and supersede tokens.
- `liveTurnsRef` clears only on an empty chat. Turn ids that restart without a clear would mis-route metrics but not text.
- Acceptable for one meeting. Clearing all four together with `liveTurnsRef` costs one line.

## Implementer's concerns: answers
1. **Case E metrics switch back to `sm`:** acceptable per the spec (M1). The real problem in case E is the attribution (I2), not the timing.
2. **A superseded bubble keeps `gemini-3.8-live`:** confirmed, and worse than the report says. The pipeline does send a head source on every stream (`WhatToAnswerLLM.ts:321`), but the arbiter drops it on a supersede from live mode. Fix on both sides (I2).
3. **The Set deviation:** approved, with the two drift points in M2.
4. **No component test for `NativelyInterface.tsx`:** see below.

## Covering NativelyInterface (it has no test today)
**Minimal unit test (feasible: `@testing-library/react` and `jsdom` are already devDependencies).**
- Render `NativelyInterface` with `window.electronAPI` set to a Proxy:
  - every `on*` call stores its callback and returns a no-op unsubscribe;
  - every invoke resolves `undefined`.
- Then drive the three callbacks and assert on the DOM and the metrics bar:
  - **(1) Flag-off sequence (the binding fold) with `turnId`s.** Assert one answer bubble per turn and the bar label coming from `sm`, with `setSource` fired via a plain source event.
  - **(2) Case C.**
    - Events: Live source, then 2 live tokens, then the Live final, then the pipeline source "X", then an append token with label and cues, then the append final.
    - Assert: two bubbles; the Live text unchanged; "(full answer)" sits above the cue block in the second bubble; the bars read `gemini-3.8-live` and "X".
  - **(3) Case E final-only.** Assert one bubble with the replacement text and the bar not reading `gemini-3.8-live` (it fails today: I2).
  - **(4) The I1 interleave.**

**Task 17 smoke observation (live).** On a flag-on smoke, screenshot or dump `messages` for:
- one case C turn: two bubbles, the header present, the Live text intact, the bars naming Live and then the pipeline model;
- one supersede-after-Live turn: one bubble, the pipeline model on the bar, no "(full answer)" left.

Cross-check each against the turn's `[Router]` decision line.

## Not shown
- The React wiring was not executed: the `sm`/bubbleMetrics routing, the ref mirror, the header render and the metrics-bar text are checked by reading only.
- I1's live frequency is unmeasured. It needs k's Live display to outlive k+1's dispatch; whether the router session's interruption usually ends k first is unknown.
- I did not re-run the electron tsc.
- I2(b) is a Task 5 (live-router-b) defect. It is routed here because it surfaces in the renderer.

## Re-review (fix1: c88dd40 on 95ed5a6)

**SPEC: PASS  QUALITY: CHANGES**

### What I ran
- `answerMessages.test.ts`, `bubbleMetrics.test.ts` and `NativelyInterface.router.test.tsx` from a temp cwd: 3 files, 60 passed.
- Root tsc on live-router-c: exit 0.
- Probe `scratchpad/t8/probe2.mts`: four sequences folded through the fix1 `answerMessages.ts`. The results are quoted below.
- I did not mutate the component tests; the report's mutant runs are taken as stated.

### Status of the round-1 findings
| finding | status | evidence |
|--|--|--|
| I1 (a token or final joins another turn's keyed bubble) | **RESOLVED for tokens and plain finals.** One sibling path is still open (R1 below). | `unkeyedStreamingTarget`; pure tests + component interleave test. Mutant per the report: 3 pure + 1 component failures. |
| I2 renderer (Live label / origin kept on a supersede) | **PARTLY RESOLVED.** A final-only replace with no source now shows "…" and `origin: 'pipeline'`. Two gaps remain (N1, N2). | answerMessages.ts replace branch writes `keyedFields` + an explicit `label`/`sourceLabel`; `sourceForBubble` drops a pending Live label. |
| M2 (mirror drift) | **RESOLVED.** | An `origin: 'live'` final adds its turn to the Set. The replace branch now rewrites origin to `pipeline`, so the mirror and `prev` agree again. Component M2 test. |
| M3 (append final with no token has no header) | **RESOLVED.** | The `finalize(null)` branch defaults `label` to `'(full answer)'` when `append`. Pure test. |
| Component test | **RESOLVED.** | The real component is rendered in jsdom with a Proxy `electronAPI`. Six tests: mount, flag-off, case C, final-only case E, M2, I1. |
| M1, M4 | Untouched, as allowed (MINOR). | |

### Flag-off identity: HOLDS
- `unkeyedStreamingTarget` returns exactly the last message when that message is not keyed. Flag-off never has keyed bubbles (no `origin: 'live'` and no `append` reach the renderer).
- The keyed replace-final rewrite, the M3 label and the `'…'` default in `done` are all inside keyed branches.
- The final handler's new `liveTurnsRef.add` needs `origin === 'live'`.
- The binding fold and its gate test pass unmodified. The new component flag-off test checks the bars through `sm`.

### Task 6 points
- **Read-then-clear order: correct in code.** `sourceForBubble` reads `pendingSourceByTurn` before it deletes, so a source forwarded ahead of the replace token reaches the rewritten bubble's `sourceLabel`.
  - **But on a token-stream supersede that label never reaches the screen (N1).** The keyed replace token deletes the turn from `liveTurnsRef`, so every later token and the final run through `sm`. `sm`'s source was never set by this stream: the forwarded source event went down the keyed branch, which skips `sm.setSource`. The bar therefore reads `sm`'s "…" (or whatever `sm` last held), not the forwarded label.
  - In effect, the arbiter-forwarded source is still thrown away for the common case E shape. Only the final-only shape displays it.
- **No source → neutral placeholder: holds for a plain B → E turn, fails after an append (N2).**
  - A final-only replace with no source after a Live-only turn: the pending Live label is dropped, so the bar shows "…". Correct.
  - A token replace with no source: the bar comes from `sm`, which shows "…". Correct by accident (see N1).
  - **Case C followed by a final-only E, with no source:** the pending label is still the append stream's source (for example `Gemini Flash 3.1`). `sourceForBubble` drops only the Live label, so the replacement shows the **old** append label. The report admits this caveat. After fix3 the arbiter forwards a held source only when it is the last held item, so "no source for the replacing stream" becomes a normal case and the old label shows.

### New findings

**R1 — IMPORTANT (I1 class, renderer). A non-keyed REPLACE token overwrites another turn's keyed bubble.**
- Where: the non-keyed replace branch (answerMessages.ts:182-192, and the final's twin at :246-251) still targets `lastIndexWhere(intent === 'what_to_answer')`. It skips neither keyed bubbles nor other turns.
- Probe (I1 precondition, then turn k+1, routed to the pipeline, supersedes):
  - starting state `[🎙k, Live k, 🎙k+1, P(k+1) "P1 " streaming, A(k) "(full answer)" "FULL k " streaming]`;
  - k+1 sends a replace token "NEW ";
  - result: `Ak` becomes `turnId 2, origin pipeline, no append, no label, "NEW "`. **k's full answer is gone**, and k+1's own bubble `P` stays stuck streaming with "P1 ".
- Fix, flag-off identical: in that branch, skip `isKeyedBubble` bubbles (`lastIndexWhere(m => m.intent === 'what_to_answer' && !isKeyedBubble(m))`).
- Pin it with the probe sequence.

**R2 — IMPORTANT (producer, route to Task 5; the renderer only exposes it). The first token a turn ever shows can carry `replace: true`, and it then overwrites the PREVIOUS turn's answer.**
- Probe:
  - `[Live k (finished), 🎙k+1]`, then k+1 sends a replace token: `Lk` becomes k+1's "NEW ". **The Live answer of turn k is lost.**
  - The same happens with a plain pipeline bubble of turn k.
- How it happens: a supersede while the turn is `pending` makes `onSupersede` drop the head's held tokens (routerArbiter.ts:361-364). The replace token is then held, and released with `replace: true` (`sendPipeline` keeps `o.p.replace`).
  - The same holds after a row-5 decision before any Live token was emitted: the stripper holds a partial word, so no Live bubble exists yet.
- Flag-off produces this only when a head was aborted before its first token. That is a pre-existing case, so a renderer-side guard would break strict flag-off identity.
- Fix in the arbiter: when it releases a turn that has shown nothing yet, send the first released token and the final with `replace: false`.

**N1 — IMPORTANT (I2 incomplete). On a token-stream supersede, the bar never shows the replacing stream's model.**
- Details are under "Task 6 points" above. No component test covers case E with tokens, or with a forwarded source.
- Fix: on a keyed supersede token, call `sm.setSource(meta.sourceLabel ?? '…')` and `sm.markFirstToken(data.token)`, so the `sm` path that takes over carries the right label and TTFT.
- Pin it with a component test: source X, then a replace token, a token, and a replace final. The bar must contain X.

**N2 — MINOR→IMPORTANT once fix3 lands. A stale append label after case C → E with no source.**
- Fix: consume the pending label at EVERY keyed bubble creation (read, then delete, in `sourceForBubble` regardless of `supersede`).
  - A later stream's bubble then sees only a source sent after the last bubble opened, so no source means "…".
  - This keeps the read-then-clear order, so a source forwarded right before the replace token is still used.
- Pin it with a component test: case C, then a final-only replace with no source. The bar must be "…".

**N3 — MINOR. With a keyed last message, a token or final with no turnId (typed or manual on this channel) falls back to ANY older streaming unkeyed bubble.**
- Probe: an aborted orphan "aborted j" far up the list becomes "aborted jmanual".
- Cause: in `unkeyedStreamingTarget`, the `meta?.turnId == null || b.turnId == null` clauses.
- Fix: when the last message is keyed and there is no `meta.turnId`, return -1 so a new bubble opens.

### Not shown
- React state ordering was exercised only in jsdom; Electron IPC and the lane-B arbiter fix3 were not.
- R2's frequency is unmeasured: it needs a supersede before the decision, or before the first Live token.
- N1 and N2 are analysed from code, with no failing test written by me.

SPEC: PASS  QUALITY: CHANGES

## Re-review 2 (fix2: 67939e2 on c88dd40)

**SPEC: PASS  QUALITY: APPROVE**

### What I ran
- `answerMessages.test.ts`, `bubbleMetrics.test.ts` and `NativelyInterface.router.test.tsx` from a temp cwd: 3 files, 68 passed.
- Root tsc on live-router-c: exit 0.
- Both probes (`scratchpad/t8/probe.mts` and `probe2.mts`, eight sequences) re-run against the fix2 `answerMessages.ts`.
- Lane-B `routerArbiter.ts:350` read for the R2 guard: `!t.visible && … o.p.replace` clears `replace` on a turn's first visible token or final.

### Probe results, before → after
| sequence | fix1 | fix2 |
|--|--|--|
| I1 leak (k append opened after k+1's bubble) | fixed | still fixed: k+1 "P1 P2." in its own bubble; k's "(full answer)" keeps "FULL k " |
| **R1** (k+1 replace token after k's append) | k's append overwritten | **fixed:** `P` becomes "NEW "; `Ak` keeps "FULL k " under "(full answer)"; `Lk` untouched |
| R2 (first shown token is a replace; previous turn Live) | Live k overwritten | renderer: `Lk` untouched, a new bubble opens (the R1 guard skips keyed bubbles); the arbiter now never sends this shape |
| R3 (same shape; previous turn is a plain pipeline bubble) | overwritten | still overwritten in the pure function. This is today's flag-off behaviour, so it is left unchanged; it is unreachable from the arbiter after 16868de |
| **N3** (no-turnId token, keyed last bubble, old orphan) | joined the orphan | **fixed:** a new bubble opens; the orphan is untouched |
| final-only replace, with and without a streaming append | correct text, stale origin | correct text, `origin: 'pipeline'`, append removed; prev gate and mirror agree (false/false) |
| append final with no token | — | header `(full answer)` present |

### Findings
- **R1 resolved.** Both non-keyed replace branches skip `isKeyedBubble`. Pins cover the token, the final, and an "only keyed bubbles" state; the report's mutants (2 + 1) fail.
- **N1 resolved.**
  - The keyed replace token now calls `sm.setSource(meta.sourceLabel ?? '…')` and `sm.markFirstToken`, so the `sm` path that takes over shows the forwarded label and a TTFT. Two component pins: a forwarded label appears with TTFT; no source gives "…", never Live.
  - `sm.markFirstToken` is safe: `sm`'s first-token mark was reset at the turn's live-question and nothing keyed sets it.
- **N2 resolved.** `sourceForBubble` now consumes the pending label at every keyed bubble's creation, still reading before it deletes, so the Task 6 order holds.
  - Every keyed bubble consumes it: the Live bubble consumes the Live label, and the append bubble consumes the pipeline label that the arbiter sends just before it.
  - So a replacing stream with no source shows "…" (component pin: case C, then a final-only replace).
  - A source forwarded just before the replace token is still used (the N1 pin).
- **N3 resolved.** With a keyed last bubble and no `turnId`, the fallback returns -1. Pins for the token and the final.
- **Flag-off identity: holds.** Every new condition is either inside a keyed branch or depends on `isKeyedBubble`, which is never true with the flag off. The `meta.turnId == null` early return sits behind a keyed last message. The binding fold, its gate test and the component flag-off test pass unmodified.
- **Nothing new found.**
  - Residual: R3 remains in the pure function by design (strict flag-off identity). It now depends on the lane-B `t.visible` guard, so Task 15/16 integration must keep that guard.
  - M1 and M4 are unchanged (MINOR, accepted).

### Not shown
- Electron IPC and the lane-B arbiter were not exercised end to end; R2 is closed only by reading 16868de's guard.
- The component tests run in jsdom, not Electron.

SPEC: PASS  QUALITY: APPROVE
