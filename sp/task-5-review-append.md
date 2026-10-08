

---

## Re-review (fix round 1)

Reviewed commit: `8482527` (`51caaff..8482527`) — `fix(detector): detectNow shares the
debounce path's single-flight slot and drains the queued trigger`. Ruled R19. Diff:
`review-51caaff..8482527.diff`. Report: `task-5-fix1-report.md`. Scope: only the Important
finding from the first review round, plus its two Minor style/comment items — not a full
re-review.

### Important finding — R19 (single-flight) — ADDRESSED

The fix moves both writers of `this.inflightDetection` onto one private helper,
`startDetection(override?)` (`QuestionDetector.ts`, new, next to `triggerDetection`): it
starts `runDetection(override)`, stores the `.finally`-wrapped promise as the slot, and on
settle clears the slot **only if the slot still holds that exact promise**
(`if (this.inflightDetection === slot) this.inflightDetection = null;`), then drains
`queuedTrigger` exactly as the old `triggerDetection` did. `triggerDetection`'s busy branch
is untouched; its free branch now reads `void this.startDetection();`. `detectNow` no longer
does a single `if`-then-overwrite — it loops: `while (this.inflightDetection) { await it }`,
and only once the loop condition goes false does it start its own detection, through the
same helper.

Walked all three interleavings from the original review against this code:

1. **Drain starts a detection, then detectNow's post-wait write replaces it (both then run
   concurrently).** No longer possible. `detectNow`'s wait is now a `while`, not an `if`: when
   the promise it was awaiting settles, it re-reads `this.inflightDetection` before deciding
   whether to proceed. If the drain (running inside that same settle's `.finally`, which fires
   *before* any other reaction to the same promise — registration order) has already started a
   new detection, the field is non-null again when `detectNow`'s loop re-checks, so it loops
   again and waits on *that* one too, instead of overwriting it. Traced this by hand for T-F1's
   exact scenario (debounce call 1 in flight → second trigger queues → detectNow arrives and
   waits → call 1 settles, drain starts call 2 → detectNow's loop re-checks, sees call 2, waits
   again → call 2 settles → only now does detectNow start call 3) and it matches the test's own
   comments and assertions exactly, including the `resolvers` length progression 1→2→3 gated
   one settle apart.
2. **detectNow's own settle erasing a replacement.** Same mechanism closes this — detectNow
   never writes to the field except through `startDetection`, and `startDetection` is only
   ever called (a) from `triggerDetection`'s free branch, synchronously guarded by a
   just-checked-falsy field with no `await` in between, or (b) from `detectNow` after its
   `while` loop has confirmed the field falsy. No path writes a new value while something else
   still holds the slot.
3. **Queued trigger never drained because detectNow's own `.finally` didn't know about
   `queuedTrigger`.** Closed structurally, not just patched: there is now exactly one
   `.finally` implementation (inside `startDetection`), shared by both callers, so there is no
   longer a second, bespoke cleanup path that could forget to drain the queue. Traced T-F2's
   scenario by hand (detectNow starts call 1 → a debounce trigger queues behind it → call 1
   settles → the *shared* `.finally` drains the queue and starts call 2 immediately, before
   detectNow's own `await` on call 1 even resumes, since the `.finally` was registered on the
   underlying promise before detectNow's continuation was) and it matches.

I also traced two extensions beyond what T-F1/T-F2 exercise directly — two concurrent
`detectNow` calls, and two concurrent `detectNow` calls plus a debounce trigger — both times
by hand, both times the `while`-loop-plus-shared-helper serializes everything into strictly
sequential detections. I did not find a remaining interleaving where two detections run
concurrently or a queued trigger is stranded. One adjacent, lower-severity observation, not a
correctness gap and not something the original review raised: under continuous, unbroken
interviewer speech the `while` loop could keep `detectNow` waiting through several drain
cycles before it ever gets to run its own detection — a liveness/fairness question, not a
data-integrity one, and an inherent trade-off of making detectNow wait its proper turn. Not
raising it as a blocking finding.

### Tests — T-F1 and T-F2 — RED lines judged valid

Verified both mechanically against the pre-fix code by hand, not just by trusting the
report's quoted tail:

- **T-F1** (`resolvers` expected length 2, old code produced 3): on the pre-fix `if`-then-
  unconditional-overwrite `detectNow`, once call 1 settles, the old `triggerDetection`'s own
  `.finally` drains the queue and starts call 2 *before* detectNow's single `await` resumes
  (same registration-order argument as above) — then detectNow's post-await line overwrites
  the field with call 3 regardless. By the time the test flushes microtasks after settling
  call 1, calls 2 and 3 have both been started — `resolvers.length === 3`, exactly what the
  quoted RED shows. This is a direct, mechanistic reproduction of interleaving 1, not an
  incidental or unrelated failure.
- **T-F2** (`detect` expected 2 calls, old code produced 1): on the pre-fix code, detectNow's
  own bespoke `.finally` only nulls the field — it has no `queuedTrigger` check at all — so a
  trigger that queued behind detectNow's own call is simply never drained at settle time.
  `detect` stays called once. Exactly what the quoted RED shows, and exactly interleaving 2.
- The report's Concern #1 (T-F1 failed one assertion earlier than the brief's narrative
  anticipated — at the `resolvers` length checkpoint rather than the later `maxOutstanding`
  one) doesn't weaken this: it's still failing for the same reason, just more immediately.
- Confirmed both tests pass on the fixed code myself (see command tail below), and confirmed
  the diff makes no changes to the file's original 5 `detectNow` tests (added-only hunk, no
  `-` lines touch them) — consistent with "5 passed" in the report's own quoted RED.

### Debounce path — unchanged beyond the shared helper

For the case that matters (`detectNow` never called — today's production behavior, and
`suggest`/`off` modes) `startDetection`'s guard `if (this.inflightDetection === slot)` is
checking the slot against itself, since nothing else ever writes the field — so it always
clears, exactly as the old unconditional `this.inflightDetection = null;` did. Byte-for-byte
same busy-branch (log line, `queuedTrigger = true`, return). Same no-override semantics into
`runDetection` (`startDetection()` called with no args ≡ old `runDetection()` called with no
args). `runDetection` and `runDegradedDetection` themselves are untouched — confirmed both by
reading the diff (it stops emitting hunks at `runDetection`'s signature; everything after is
unchanged context) and by the report's own claim.

### Minors — both closed

- **Explicit `public` modifier**: removed from both `detectNow` (`QuestionDetector.ts`) and
  `detectQuestionNow` (`IntelligenceManager.ts`) — confirmed in the diff (`-public async
  detectNow` / `+async detectNow`, `-public detectQuestionNow` / `+detectQuestionNow`). Both
  files now have zero methods with an explicit `public` modifier — consistent.
- **`dedupCache`-sharing comment**: added to `detectNow`'s doc comment — "The dedup cache is
  shared with the debounce path on purpose — a question the turn classified must not chip
  again when the debounce path sees the same finals." Directly addresses the suggestion.
- (The third original Minor — the report's slightly imprecise stated reason for widening
  `inflightDetection`'s type — was about documentation-of-reasoning in the *original* report,
  not a code defect; nothing to fix, not re-checked here.)

### New findings

None.

### Commands run (this round)

`node node_modules/vitest/vitest.mjs run electron/services/QuestionDetector.detectNow.test.ts electron/services/QuestionDetector.test.ts`:
```
 ✓ electron/services/QuestionDetector.test.ts (28 tests) 122ms

 Test Files  2 passed (2)
      Tests  35 passed (35)
```

`node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` (exit 2, expected — same six pre-existing errors, nothing new):
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3430,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3430,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```

Commit trailer (`git log -1 --format=%B 8482527`) present and correct. File scope confirmed
via `git diff --name-status 51caaff 8482527`: exactly the three expected files, nothing else.
Per instruction, did not run the full suite this round.

## Updated verdict

- Spec compliance: Pass (unchanged from the original review).
- Task quality: **Approved.** The Important finding (R19) is closed by a structural fix
  (one shared owner of the in-flight slot) rather than a narrow patch, verified by hand
  against all three original interleavings plus two untested extensions; both minors are
  closed; no regressions in the targeted tests or the tsc gate.
