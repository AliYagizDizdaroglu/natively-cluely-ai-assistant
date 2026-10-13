# D2 code review (18c1c4d5 vs D2-SPEC rev 2 + re-check N1/N2)

Reviewer: Opus, 2026-10-12. Read-only: `git show 18c1c4d5` (wt-d1), the spec, spec review, and D2.report.md. No app, no model call, no .env, no tests run.

**Verdict: CHANGES (one Required, small).** The wiring matches the spec, and so do the rule, the per-socket provenance, N1 and the calibration. One normalization defect silently disables the G10 clause for non-Latin scripts.

## Required

**Q1. `wordsOf` drops every non-ASCII letter, so for non-Latin languages G10 (textSince) is always satisfied.**
- `DeepgramStreamingSTT.ts` (new l.~214): `t.toLowerCase().match(/[a-z0-9']+/g)`. For Cyrillic, Greek, CJK, Arabic and similar scripts every interim normalizes to `''`. As a result `words !== lastInterimWords` is false after the first interim, `changedAt` freezes at the onset, and the final (`''` = `''`) reports `textSinceAt = changedAt`. Turkish/Spanish words are mangled too ("çalış" becomes "al"), so the comparison gets weaker but is not fully disabled.
- Why this matters: G10 is the **only** guard for new speech that starts *after* the close and gets merged into a stalled interim. A voice-on after the close is excluded by design (N1), and the answered clause does not apply. So in a non-English session a stalled interim, plus a new question merged into its final after the close, is absorbed: the question is lost. `languageCode` is user-settable (`setRecognitionLanguage`, 'multi').
- Fix: `/[\p{L}\p{N}']+/gu`, the same in `turnDispatch.ts` `wordsOf` (there it only fails safe: `!q → false`). Add one provenance test with a non-Latin interim → changed final, so that `textSinceAt` = the final's arrival.

## Minor

- **M1. Supersede never prunes `voiceOnsAfterDispatch`.** On a supersede, `t.dispatched.at` moves forward, but the voice-ons of the continuation (between the first dispatch and the supersede) stay in the list. So any turn that had a continuation never absorbs. This is the safe direction and only a coverage gap; the spec's "(dispatchAt, closedAt]" arguably meant the latest dispatch. Either filter `v > t.dispatched.at` at `close()`, or name the gap in the spec's §5.
- **M2. The main.ts wiring has no test seam.** Four things are proven only by the modelled replay, not by any test that crosses main.ts: `turn.answered(d.turnId)` in the answer branch, the provenance passthrough (both fields required), `voiceHeard` on speech-started, and the late-final chip drop in the mark block. Reading them against the code:
  - **answered:** called only in the answer branch. Turn dispatches carry `resolving: true` (`turnDispatchInput`), so liveHold and fragmentHold never hold them. The only non-answer exits are the `isFragment` drop and the chipDeduper drop, and neither calls `answered`. This is correct.
  - **R21:** the re-routed supersede reaches the answer branch with the current id. The plain supersede is already answered. The hedge and router legs all run inside `answerDetection`, after the call. In auto mode no Live answer bypasses the branch (Live answers only mark).
  - **What remains is the residual risk the spec accepted:** a failed or aborted `answerDetection` still counts as answered.
  - **Recommendation:** keep the spec's live exercise (grep `turn: late-final absorbed` and `verdict=late-final`) as the only proof of the seams.
- **M3. `isLateFinalChip` is a substring containment test.** A short real chip (for example a single word that appears inside the absorbed tail), arriving within 5 s, is dropped as a mark. It is not lost: the unmarked turn still reaches `classify` at quiet. It is slower, though (one classify round-trip). Name it in §5.
- **M4. `absorbedFinals` is not cleared in `resetTurn`/meeting stop.** Harmless, because of the 5 s window and the 60 s prune. For hygiene only.
- **M5. G5 isolates the onset clause with `textSinceAt = closedAt − 1`,** an input the real client cannot produce. The report says so. The onset clause is redundant in production (`textSinceAt ≥ onsetAt`); that is acceptable.
- **M6. The transcript handler itself is not `stale()`-gated** (pre-existing; only Open, SpeechStarted, UtteranceEnd and Close are). Provenance is closure-local, so a replaced socket's late final carries its own socket's onset. That is correct for D2, and the spec's "stale()-gated" wording is met by construction.

## Hunt items, one line each

1. **answered():** correct site, correct id (`snapshot().id` at dispatch). Drop paths never call it, and holds cannot apply to turn dispatches. See M2.
2. **Voice-on:** speech-started → `voiceHeard`, plus VAD `speech(true)`; both are recorded only on the open dispatched turn after its dispatch. N1: these are snapshotted at `close()` with `v <= closedAt`. A lazy `reopenIfStale` close uses the moment the turn became stale. A voice-on after the close opens or joins the next turn and never reaches `lastClosed`. Correct.
3. **Deepgram per socket:** state lives in the per-connect closure beside `boundaryRepair`. A restart starts empty, every final resets the state (empty finals included), and a final with no interim carries no fields, so it never absorbs. Correct. Q1 is the exception.
4. **N2:** the raw interim is compared with the raw final, by words, before `boundaryRepair`. Correct apart from Q1.
5. **Real words lost:** Q1 (non-Latin, merged after the close). A failed answer after dispatch is the accepted residual. Supersede: safe direction (M1). No other path found.
6. **Tests:** the RED list in the report shows the R1, G5, G6, G7 and G9b guards failing on the old code. The mutation table flips every clause; G8 fails on the rev-1 rule. Provenance tests cover reset and restart.

Not shown: nothing was run; tests and replay numbers are taken from the report; main.ts was read at 18c1c4d5 only around the touched sites.

## Re-review 1 (6ae65275, fix for Q1)

Reviewer: Opus, 2026-10-12. Read-only: `git show 6ae65275` only. Nothing was run.

**Verdict: APPROVE.**
- Both `wordsOf` helpers (`DeepgramStreamingSTT.ts` l.214, `turnDispatch.ts` l.21) now use `/[\p{L}\p{N}']+/gu`: the `u` flag is present, and `toLowerCase()` runs before the match in both, so the normalization is identical on both sides.
- Tests discriminate. On the old regex, the Cyrillic provenance case normalizes interim and final to `''`, so `textSinceAt` stays at the onset (T+100) and the case goes red. The chip case `isLateFinalChip('ваши причины', ru)` returns `false` through `!q`, so the case goes red. The Turkish provenance case does NOT discriminate: on the old regex "al imdi" ≠ "al imdi i in neden", so it already passed (as the implementer says). It is harmless as a regression pin.
- Scope: 4 files, +17/−2, consisting of the two regex lines and the tests. Nothing else changed.
- Minor (not required): `\p{M}` is excluded, so combining marks split words. This affects Devanagari/Thai vowel signs, and Turkish "İ" lowercases to i + U+0307. The split is consistent on both sides of every comparison, so G10 and containment still work. `[\p{L}\p{M}\p{N}']` would keep such words whole.

Not shown: the tests were not run (the red→green result is taken from the commit message); the replay "33 logs unchanged" was not checked.
