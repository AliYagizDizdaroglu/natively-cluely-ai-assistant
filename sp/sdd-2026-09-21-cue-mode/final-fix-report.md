# Final fix wave report — cue mode whole-branch review

Base: 49183fc0fbd7651b5faec83fd7b2122c7f2ab1bc (feat/whole-turn-answers)
Commit: 1ddb7382f1e5d6c238c4df291f07326a13b69a43 — fix(cues): a reused bubble drops its cues on a coaching card

## Finding addressed

Final whole-branch review's one Important: `NativelyInterface.tsx`'s two
negotiation-coaching bubble-reuse spreads (token handler ~843, finalize
~893) keep a dangling streaming bubble's `cues`, so a superseded cued
answer's cue block can render above a coaching card. Mechanism: the
engine's abort path drops a superseded generation without a final event,
so a spoken answer that was streaming with cues can leave its bubble
dangling (`isStreaming: true`, real `cues`). If the next answer is a
negotiation-coaching short-circuit, both branches reuse that bubble by
spreading the old message, and the finished coaching card renders the old
answer's cue block above it.

## What changed

Two one-line additions (`cues: undefined`) plus one two-line comment each,
in the file's existing voice, mirroring the neighbouring R23 discipline
(same file, line ~902) that already clears `isNegotiationCoaching`/
`negotiationCoachingData` on reuse. Nothing else in the file was touched.

```diff
diff --git a/src/components/NativelyInterface.tsx b/src/components/NativelyInterface.tsx
index f1cde14..c2fdcc0 100644
--- a/src/components/NativelyInterface.tsx
+++ b/src/components/NativelyInterface.tsx
@@ -840,7 +840,9 @@ const NativelyInterface: React.FC<NativelyInterfaceProps> = ({ onEndMeeting, ove
                         const lastMsg = prev[prev.length - 1];
                         if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                             const updated = [...prev];
-                            updated[prev.length - 1] = { ...lastMsg, text: data.token };
+                            // A reused bubble must not carry a superseded answer's cues onto
+                            // a coaching card (mirrors the R23 discipline below).
+                            updated[prev.length - 1] = { ...lastMsg, text: data.token, cues: undefined };
                             return updated;
                         }
                         return [...prev, {
@@ -893,6 +895,9 @@ const NativelyInterface: React.FC<NativelyInterfaceProps> = ({ onEndMeeting, ove
                         isNegotiationCoaching: true,
                         negotiationCoachingData: coachingData,
                         text: '',
+                        // A reused streaming bubble must not carry a superseded answer's
+                        // cues onto a coaching card (mirrors the R23 discipline below).
+                        cues: undefined,
                         metrics: finalMetrics,
                     }
                     : {
```

The non-coaching finalize branch (the `: { ...streaming, text: data.answer,
... }` sibling right below the second hunk) was left untouched, as
directed — finalize must keep the cues on a spoken answer, and
`src/lib/answerMessages.test.ts` ("applyFinalAnswer keeps the cues when
finalize spreads the streaming message", line 291) pins that at the
helper level. `applyAnswerToken` in `src/lib/answerMessages.ts` was not
touched either.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — no output, exit code 0
   (0 errors; matches the pre-existing baseline of 0).
2. `node node_modules/vitest/vitest.mjs run src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx`:

```
 ✓ src/lib/answerMessages.test.ts (23 tests) 17ms
 ✓ src/components/CueBlock.test.tsx (2 tests) 191ms

 Test Files  2 passed (2)
      Tests  25 passed (25)
```

   Exit code 0, 25/25 tests passed — matches the expected "25 tests
   today" baseline exactly.

No component-level test was added or run — nothing renders
`NativelyInterface` today, and a rendering harness for a two-line fix is
disproportionate (controller ruling, `progress.md`). This diff was
verified by type-check + the existing renderer-adjacent unit tests +
manual reading of the quoted diff against the finding, not by a
regression test that exercises the reused-bubble path end to end.

## Files changed

- `src/components/NativelyInterface.tsx` (+6/-1) — the only file in the
  commit. `git status --porcelain` before and after showed no other
  files tracked or untracked touched; staged by name
  (`git add src/components/NativelyInterface.tsx`), never `-A`/`-u`.

## Concerns / residual risk

- This fix clears `cues` only at the two reuse points that spread an
  existing message into a *finished* state (coaching short-circuit). It
  does not, and cannot, retroactively fix the append branch of
  `applyAnswerToken` (`src/lib/answerMessages.ts` line ~65-69): if a
  dangling streaming bubble instead receives another plain streamed
  token (not a coaching short-circuit), that append still can't
  distinguish "next token of the same generation" from "first token of
  an unrelated new generation" without a generation id, so a stale
  `cues` could in principle ride an unrelated append too. This is a
  pre-existing property of the abort-without-final path, out of scope
  for this one-line-finding fix wave, and is recorded here as a residual
  risk rather than fixed (matches the controller's ruling in
  `progress.md`).
- The two added comments both point forward to "the R23 discipline
  below" — accurate at the two edited call sites (R23's comment sits a
  few lines below the second edit, and the first edit's coaching branch
  is a sibling arm of the same handler as R23's). If either block is
  reordered later the "below" wording would need a look, but at HEAD
  1ddb738 it is correct.
