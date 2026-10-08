# PREREGISTER — ET10: gemini-3.8-live-extended-thinking on the 10 hardest scenario50 items

Written 2026-09-27, before any ET10 audio is played. The rule below is not changed after the data exists.

## Question

Can `gemini-3.8-live-extended-thinking` do these two things on the hardest scenario50 questions?
- Answer at least as well as the app does, hearing the interviewer's audio directly.
- Start its real answer sooner than the app does.

## Items (10)

- The five mains of the s50l focused re-pick, plus their follow-ups: S1Q02, S1Q02F, S1Q04, S1Q04F, S1Q05, S1Q05F, S1Q07, S1Q07F, S2Q02, S2Q02F.
- The five mains were the hardest on captured bytes in s50l's fixed-chain arms.
- The set is scenario50 only. holdout40 is not touched.

## Arms

- **ET-low and ET-high.** These are `thinkingConfig.thinkingLevel` low and high.
  - One Live session per main+follow-up pair: 5 sessions per arm, arms run one after the other.
  - The system instruction has three parts:
    - the app's captured s50k system prompt;
    - that pair's MAIN question's captured CONTEXT block;
    - the LIVE MODE block of the 2026-09-27 spike, verbatim.
  - Output modality is AUDIO plus outputAudioTranscription, since TEXT is rejected by this model.
  - Input audio is the scenario50-tts-local clips, resampled to 16 kHz and streamed in real time in 60 ms chunks.
  - After each clip, silence is streamed until the answer turn completes. The answer turn is one with ≥ 12 words, or a system-error message; after it, the harness waits 4 s of quiet. The cap is 120 s.
  - The next clip never starts while the model speaks, so there is no barge-in.
- **App comparator.** s50k (2026-09-20), the last in-app hour on the shipped model, 3.1-flash-lite LOW:
  - `app-inapp` is the live hour's answers;
  - `app-twin1..3` are the captured-low reps, i.e. the same app bytes replayed offline three times.

## Answer text

- **ET:** the output transcription, with these parts dropped:
  - holding turns: a turn of < 12 words that ends before the first ≥ 12-word turn;
  - output that arrives before the question's last audio chunk.
- The remaining ET text then goes through the app's own filter chain, the one the offline twins ran: filterCodeFences → filterVerbalLines → stripSuggestionBlock → stripSpokenNotation, loaded from MAIN's built dist.
- **App:** answers as recorded in the s50k pairs files.

## Grading

- The frozen rubric is used verbatim from s50k's pairs file.
- Grading is blind. Each item's 6 answers (4 app, 2 ET) are put in a seeded random order under keys `id#1..#6`. The key file is never shown to a grader.
- Two independent graders, each claude-opus-5-5 (Agent tool, model opus), each grade all 60 answers.
- acceptable = correctness 2 && on_topic 2 && delivery ≥ 1. wrong = correctness 0.

## TTFT

- **ET:** the first transcript word of the first substantive turn (≥ 12 words, or the system-error message), minus the time the question's last audio chunk was sent.
- **App:** the s50k in-app first token, minus the question's end (playsync clock).
  - This was computed by `app-baseline.mjs` before this file was written.
  - Over these 10 items: **p50 7472 ms, p90 9441 ms.**
  - The median includes the app's detection, about 1.4 s.

## Decision rule

The rule is applied per ET arm. ALL three conditions must hold to call it "worth an in-app prototype on its own pre-registered hour":
1. **Quality:** its acceptable count, averaged over the two graders, is ≥ the BEST app arm's mean acceptable. The best app arm is the top of the four-sample app band, on the same 10 items and the same two graders.
2. **Safety:** zero wrong by either grader, and zero system-error or empty answers.
3. **Speed:** its substantive-answer TTFT median is ≤ 7472 ms.

If any condition fails for both arms, the verdict is NOT VIABLE:
- no app path is built;
- the question stays closed until a new model version.

## Reported outside the rule

- the holding-line time;
- the time to the last word (answer complete);
- words and thought tokens;
- the graders' agreement;
- the per-question table;
- the previous (s50k) verdicts of the app arms, for reference only.

## AMENDMENT 1

Written 2026-09-27 18:12. At that point no ET10 answer had been graded or scored. This is a HARNESS fix; the decision rule above is unchanged.

**What happened on the first run (low, pair 1):**
- The model's holding line on S1Q02F was exactly 12 words: "To determine if this model is useful, we need a deeper analysis."
- That met the "≥ 12 words" rule, so the harness waited 4 s, ended the item and closed the session before the real answer arrived. That is a harness defect, not a model result.
- The run was stopped. It is kept as `runs/aborted-low-1.json` and never scored. Both arms re-run from scratch.

**Superseding parameters for the harness wait:**
- After a turn of ≥ 25 words or a system-error message: 6 s of quiet.
- After any shorter turn: 30 s of quiet. A holding line can reach 12 words, and in the spike the thinking after it took up to 12 s at low.
- No output at all for 60 s: no answer.
- Cap: 150 s.

**Superseding definitions for answer text and TTFT:**
- The answer starts at the first post-question turn of ≥ 25 words or a system-error message. If there is none, the last turn is the answer.
- The turns before it are holding lines.
- TTFT = the first word of that turn.
- Calibrated on the 2026-09-27 spike run, whose turn structure was known: all 10 answer starts reproduced exactly, the holding lines were found on 9/10 and the premature fragments dropped, and a pre-amendment file is refused.

## Not covered (residual risks)

- **Sampling.** Each ET arm has one rep, and ±2 of 10 is plausible sampling noise. n = 10 detects only large differences.
- **Stimulus.** The TTS voice is not a human voice.
- **Session length.** Sessions cover one pair each, not a 60-minute session, so goAway/resumption and context growth are untested.
- **Barge-in.** Backchannels during an answer are untested, because the harness waits.
- **Comparator timing.** The app comparator is from 2026-09-20, a different day and load. Its twins were replayed on scripted bytes, while ET heard audio.
- **Context.** ET gets the CONTEXT block of the pair's main question only.
