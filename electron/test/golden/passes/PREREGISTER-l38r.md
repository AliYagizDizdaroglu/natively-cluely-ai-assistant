# Pre-registration: L38R, the Live router probe (a spike: reported, never a ship decision)

Written 2026-10-01, 15:04 local, before any Live call. The user asked (14:5x) whether 3.8 Live could "take initiative"
on easy questions and leave hard ones to the pipeline, and then whether that path could be probed today.

## The question

Can bare `gemini-3.8-live`, told to answer a short one-part factual question in one line and to say "hard" for
anything else, (a) tell the two apart, (b) put the right answer in that one line, and (c) do it well before the
pipeline's first cue (about 4.7 s today)?

## Method

- **Harness:** `SP\l38r\run.mjs` = `l20c/run.mjs` (ET10's after amendment 1) with only these changes: one Live
  session per item; two clip folders; the ROUTING live-mode block (quoted in the run file as `liveMode`);
  `answerWords` 1 (the first completed turn is the answer: a one-liner is expected); quiet 6 s after any completed
  turn, 30 s with no output = nothing, cap 90 s; one retry per item on an abnormal close before its
  `generationComplete`. Model bare (no thinking), AUDIO output with output transcription, as L20c.
- **System prompt:** the app's captured s50k system prompt for S1Q08 + that pair's CONTEXT block (the candidate's
  profile) + the routing block. The same for every item.
- **Items (22, `items.json`, interleaved order):**
  - simple 12: spike 6's X1–X6 and the probe's F1–F6, rendered to clips with the same local voice and settings as
    scenario50's clips (`make-clips.mjs`, Windows SAPI Microsoft David Desktop, 24 kHz mono), into `l38r\clips`;
  - hard 10: L20/ET38's "hard" group, S1Q02, S1Q02F, S1Q04, S1Q04F, S1Q05, S1Q05F, S1Q07, S1Q07F, S2Q02, S2Q02F, the
    existing scenario50 clips.
- **Reps:** 2 (r1 now, r2 after it, the same afternoon). Live's hours differ, so one rep is never read alone.
- **Extraction:** `et10/et-extract.mjs` unchanged (the calibrated instrument of ET10/L20c/ET38): the answer = the
  first turn of ≥ 1 word, through the app's own filter chain from MAIN's dist; `ttftMs` = the first output
  transcription after the clip's end.
- **Reader:** `read.mjs`, calibrated on a made-up answers file with known counts (`cal-read.mjs`,
  `cal-read.out.txt`; its first run caught a miscount in the EXPECTED values, corrected before any real reading).
  Classes: routed (a one-line answer, ≤ 12 words, not "hard", not an apology), hard (the word alone), nothing,
  apology ("system error"), long (> 12 words), not played.

## Reported, per set and rep

- routed / hard / nothing / apology / long counts;
- simple: the first line carries the answer (`probe-shipped.mjs` TERMS, the same check as the probe); misroutes:
  simple ids marked hard or left unanswered;
- hard: misroutes = hard ids that got an answer, each printed beside the pipeline's first cue (the bench's cue rep 1);
- first word p50 / p90 of the routed answers; words per routed answer;
- every routed simple answer beside the pipeline's first cue (the probe re-run, 3.5-lite HIGH rep 1) with a crude
  "shares a content word" flag (reported; not a correctness measure);
- holes and abnormal closes.

## Read in advance (the bars for "pursue the design as-is"; a spike, so none is a ship gate)

All of these, over both reps:
1. routing on simple: at least 10 of 12 routed in each rep;
2. routing on hard: at most 2 of 10 answered in each rep;
3. the first line carries the answer on at least 90% of the routed simple answers, pooled;
4. first word p50 ≤ 2.5 s over the routed answers, pooled (the pipeline's first cue is about 4.7 s; the in-app path
   would add transcript-to-screen time, not measured here);
5. holes (nothing or apology) on simple: at most 1 per rep.

Any bar missed: the "Live takes initiative" design is not pursued as written; the next measurement is the cheaper
competitor, a parallel 3.1-lite LOW cue-only text call on the same questions, before any design is chosen.
All bars met: a design spec (Fable) with the cost model, reviewed by Opus, after Friday's validation hour; it ships
only through its own pre-registered flight.

## Not covered

- The in-app path (Live transcript → renderer) and its latency; the ear role combined with routing in one prompt;
  typed questions (3.8 Live takes no text input); cost per hour; the room's noise (clean TTS clips, the same voice
  as every scenario50 measurement); Live's bad hours (one afternoon, two reps); how a candidate reacts to a line
  that the pipeline later replaces; holdout40 (never used).

## Day, quota, constraints

- Live quota is separate from the lite models' daily 500; no scheduled task runs until 20:00 (`Natively-probe-live38`,
  20:00–20:20); the calls stay clear of it.
- A live measurement: no build, test or type check runs beside it (the merge's rebuild and gates wait for it).
- No holdout40 file is read or written. Nothing in MAIN or the worktree is written.
