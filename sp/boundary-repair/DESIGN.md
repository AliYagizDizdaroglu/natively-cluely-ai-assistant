# Deepgram boundary repair: design brief v3 (2026-09-29, controller: Opus session; approved direction: the user's "work on suggested fixes")

v3 supersedes v1 (16:32). v1's rule ("exactly one skipped word, at least 2 matching words") was built on
the 17 losses a first scan found; the seam probe and a variant scan (both below) showed it would repair 1
of the 6 losses Deepgram produced live at the seam. v2 widened it and FAILED validation on holdout; v3 is
v2 minus the two branches that failed. The reference implementation is `rule-v3.mjs` (this folder): the
TypeScript module must reproduce it event for event.

## Symptom (flight h40c, R22; the class is general)
Deepgram's interim transcript held a word that neither of the two finals that followed it contains:

```
11:19:27.809Z interim: "How do you cut hallucinations in a rag answer without just making"
11:19:27.826Z FINAL  : "How do you cut"
11:19:29.373Z FINAL  : "in a rag answer without just making it refuse?"
```

The interviewer turn joins finals verbatim (`interviewerTurn.ts` `textOf`), so the app answered
"How do you cut in a rag answer without just making it refuse?" and all six captured replays of that
prompt were weak (the models answered about refusals, not hallucinations).

## Root cause, reproduced at the seam
Deepgram (nova-3, `endpointing: 300`, `interim_results: true`, `smart_format: true`) sometimes finalizes
a segment short of its own latest interim and starts the next segment after a word that then appears in
no final. `seam-probe.mjs` streamed 4 non-holdout clips x 5 plays (real time, the app's exact options,
2026-09-29 16:36) straight to Deepgram, no app code involved: 6 of 20 plays lost a word this way
("prefer", "infrastructure", "service" x3, "support"). So the loss is Deepgram's, not the app's; the app
uses finals only, so the word is gone before any app logic sees it.

## Evidence for the rule (`variants-scan.mjs`, `rule-sim.mjs`, read-only over every run log)
A CUT is a final F1 whose tokens equal its preceding interim I's first |F1| tokens (strict), or all but
F1's last (tolerant: Deepgram re-spells the word at the cut, "RAC" -> "Rag", 5 of 5 seam plays of S2Q07).
T = I's tokens after F1. Classes of the next final F2, non-holdout logs:
- NORMAL 527: F2 starts with T[0] (the word just moved to the next segment).
- F2 resumes T after skipping 1-2 words: 26 (18 with >= 2 matching words, 7 with 1, 1 skipping 2) —
  all 26 TRUE against the scripted question.
- |T| == 1 and F2 does not start with T[0]: 49 — mixed. Real losses ("between", "infrastructure",
  "with", "service", the warm-up's "scaling") AND Deepgram re-hearing the same audio at F2's start
  ("schedule" -> "scheduled", "end" -> "endpoints", "fifteen" -> "15%") AND turn boundaries (interim
  "... upstream API?" then F2 "Your training image is eight gigabytes." = the next question).
v2 repaired that |T| == 1 class unless the two words were "variants" (prefix / 4-char stem / numbers),
and accepted a spelled number as equal to any digit token in the resumption evidence. On non-holdout:
34 TRUE, 0 FALSE (+15 warm-up, right by inspection). On holdout, as validation: 4 TRUE, **4 FALSE** —
"two" before "to answer" (x2), "fee" before "feature", "four point" before "4.1%" (the number rule matched
"one" to "4"). The variant filter was fitted to the non-holdout cases and did not generalize.
v3 = v2 without both: non-holdout **25 repairs, 25 TRUE, 0 FALSE**; holdout 4 repairs, 4 TRUE (not an
independent validation any more: v2's holdout failures chose what v3 removed); seam recording: repairs 4 of
the 6 lost words, inserts nothing else.

## Fix (v3)
A pure module `electron/audio/deepgramBoundaryRepair.ts`, used by `DeepgramStreamingSTT` in its
Transcript handler after the empty-transcript return and before `this.emit('transcript', …)`:
- keeps the latest interim text (cleared after every final);
- on a final F1: if F1 is a CUT of the latest interim (strict or tolerant, |F1| >= 2 for tolerant, and
  the interim longer than F1), remember T (normalized tokens after |F1|), Traw (the same words in the
  interim's own spelling, punctuation dropped) and F1's arrival time; otherwise remember nothing;
- on the next final F2 (and only the next: any final clears the remembered cut), if it arrives within
  5000 ms of F1 and its first token is not T[0]: for k = 1, then 2 (k < |T|), with m = min(2, |T| - k),
  if F2's first m tokens EXACTLY equal T[k .. k+m), emit `Traw[0..k).join(' ') + ' ' + F2` and log
  `[DeepgramStreaming] boundary repair: restored "<words>" before "<first 40 chars of F2>"`;
  first k that matches wins; otherwise F2 unchanged;
- interims, and every final that does not match, pass through unchanged (today's behaviour).
Normalization for comparison only: thousands commas between digits removed ("10,000" -> "10000"),
lowercase, tokens `[a-z0-9']+`. Traw uses the same token regex without lowercasing on the same
comma-stripped text, so it lines up index for index with the normalized tokens.
Constants and their provenance (comments in the code): 5000 ms = observed max F1->F2 gap among repaired
losses 4441 ms, with margin (it keeps a tail from being glued onto the next, unrelated utterance);
k <= 2 = the largest skip observed (1 case of 2, 25 of 1); m = min(2, available) = the evidence every
observed loss provides, and with 1 word only when the interim holds no more.
Deliberately NOT repaired (documented residual, pinned by tests): the |T| == 1 class (half the losses,
text alone cannot decide it — the follow-up is Deepgram's per-word timestamps, to be measured at the
seam first), and resumption evidence that differs only by number formatting ("eighty" vs "84%").
Per connection: the repair state belongs to one live socket (created where `connect()` wires the
handlers), so a restarted socket never repairs across the restart.
Out of scope: Live supersede, keyterms, isFragment (R05), the turn machine, the prompt.

## Where
MAIN, branch `fix/coding-style-suffix-all-gemini`. The cue-mode branch (feat/whole-turn-answers) does not
touch `electron/audio/DeepgramStreamingSTT.ts` (checked: merge-base f3c7c8e), so no merge conflict.
Both Deepgram instances (interviewer and candidate mic) get the repair; harmless on the mic.
The existing `Transcript event — isFinal=…, text="…"` log line keeps logging Deepgram's RAW text (so the
offline scans keep working on future logs); the repair adds its own line.

## Verification (rules 5, 7, 8 of the global CLAUDE.md)
1. TDD unit tests of the pure module (fail first), fixtures copied VERBATIM from `fixtures-v3.json`
   (non-holdout, extracted from the logs with the reference's expected output): the 15 distinct
   positives, and the negatives — NORMAL cuts, the |T| == 1 class both re-heard ("schedule" /
   "scheduled retraining.", "fifteen" / "15% …") and really lost ("between" / "training and serving?",
   pinned as NOT repaired), the number-formatted resumption ("eighty" / "by 84% …"), a turn boundary
   ("… upstream API?" / "Your training image is eight gigabytes."), the tolerant re-cover ("… explain why
   XG" then "XGBoost was suitable …"), plus a seam tolerant positive (interim "Design a multi tenant RAC
   service over", F1 "Design a multi tenant Rag", F2 "over 10,000,000 documents, it has to support
   document updates" -> "service over 10,000,000 …"), a gap of 5001 ms, a final that is not a prefix of its
   interim, an interim-only stream, and the R22 sequence as the symptom test. One adapter-level test with
   a fake socket: the emitted 'transcript' event carries the repaired text, the raw text is still logged,
   and a reconnect starts a fresh repair state.
2. Offline replay (controller): the BUILT module over every run log and the seam recording must produce
   exactly `rule-v3.mjs`'s output (25 + 4 repairs on the logs, 4 on the seam recording, same texts).
3. Live at the Deepgram seam: a fresh seam probe on other non-holdout clips (a new recording: fresh data
   for v3), built module applied, before/after against the script.
4. Live, through the app (scheduled task, never from a Claude session): a scenario50 S1+S2 hour on the
   rebuilt MAIN tonight, finishing well before the 05:00 cue smoke; every `boundary repair:` line read
   against the scripted question playing, and the dispatched `question=` of each repaired item.
