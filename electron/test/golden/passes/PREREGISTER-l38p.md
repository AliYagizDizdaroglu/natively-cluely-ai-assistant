# Pre-registration: L38P, the pipeline on L38F's answer-based follow-ups (descriptive; never a ship decision)

Written 2026-10-01 before any call. The user pointed out (16:2x) that L38F judged Live on follow-ups that lean on
an earlier answer, a case the pipeline itself was never measured on, and asked to run this now.

## The question

On L38F's six answer-based chains (AP1–AP6 then AF1–AF6), does today's pipeline answer the follow-up CONSISTENTLY
with its OWN earlier answer to the parent, or does it guess the way Live did?

## Method

- **Model:** `gemini-3.5-flash-lite`, thinkingLevel HIGH (the hedge's first model, the bench's and the follow-up
  replay's model). Non-streaming `generateContent`, key read in-process. One try per call; an error is a hole.
- **System prompt:** s50m's captured system prompt for S1Q03F (pre-cue; the answer's content is what is compared,
  and cue lines summarize the answer). **User turn template:** that prompt's own user turn, with its CONTEXT block
  (the candidate's profile) kept and everything from `USER QUESTION:` rebuilt in the app's exact shape
  (`WhatToAnswerLLM.ts` 220–239, `TemporalContextBuilder.ts` 121–133, seen in s50m S1Q03F/S2Q05F):
  `USER QUESTION:` + the `<intent_and_shape>` block as captured (general) + [PREVIOUS RESPONSES block] +
  `INTERVIEWER JUST SAID:` + transcript + the captured trailer line.
- **Per chain and rep, three calls:**
  1. **Parent:** no PREVIOUS RESPONSES; transcript `[INTERVIEWER]: <AP text>`. Its answer, after the app's filter
     chain (MAIN dist, as et-extract), is the app's earlier answer.
  2. **W (follow-up within the window, like S1Q03F):** PREVIOUS RESPONSES `1. "<first 200 chars of the parent
     answer>..."` (the app's truncation); transcript `[INTERVIEWER]: <AP>` / `[ASSISTANT]: <parent answer,
     lower-cased as the captured line is>` / `[INTERVIEWER]: <AF>`.
  3. **E (parent evicted, roster timing, like S2Q05F):** the same PREVIOUS RESPONSES preview; transcript
     `[INTERVIEWER]: <AF>` only.
- **Reps:** 3. 54 calls on 3.5-lite (today's quota day had 96 before this; Friday's day starts 10:00 tomorrow).
- **Builder check before calls:** a dry run prints, per prompt, the section headers and lengths only, and refuses
  if any old question text from S1Q03F survives in the rebuilt part, or if a section is missing.
- **Grading:** one Opus agent (claude-opus-5-5, verified from its transcript), blind to shape (W/E shuffled under
  anonymous keys). For each item it sees the parent question, the app's parent answer, the follow-up question and
  one follow-up answer, and labels it: CONSISTENT (agrees with, uses or builds on what the parent answer said),
  CONTRADICTS (asserts something the parent answer contradicts), GUESS (answers about something other than what the
  parent answer described, or invents specifics the parent answer does not support), or DEFLECT (declines or asks
  back). Live's four L38F answers to these follow-ups are reported as guesses by construction (Live never saw any
  parent answer).

## Read in advance

- W CONSISTENT in ≥ 15 of 18: the gap is real when the follow-up comes soon after its parent: the pipeline uses its
  own answer and Live cannot. Follow-ups stay on the pipeline for that reason.
- W CONSISTENT in ≤ 12 of 18: the pipeline guesses too, even with its answer in front of it; Live's failure on these
  is not unique, and the L38F verdict's reason is weaker than stated.
- E is reported beside it: at roster timing the app has only a 200-character preview, so E says how blind the
  pipeline is when the parent has left the window.
- Between 13 and 14: mixed; reported as such.

## Not covered

The cue-mode system prompt; the in-app path; Context ON vs OFF; real roster follow-ups; other hours. Six items
only. holdout40 never read.
