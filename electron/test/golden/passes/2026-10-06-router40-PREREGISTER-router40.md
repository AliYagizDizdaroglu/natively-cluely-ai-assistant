# Pre-registration: router40, the 3.8 Live ROUTER on the live40 set (a comparison, never a ship decision)

Written **2026-10-05, begun 17:14 TST by `date`, sealed 17:31 TST** (Opus, author; a separate fresh Opus reviews it
before any call). **No model call has been made for this test; no datum exists.** Every number below names its
source. After the first Gemini call nothing in this file is edited; a change before data is a dated amendment at the
end. Readings are applied verbatim; there is no renegotiation after data.

Names: `SP` = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`; `R40` = `SP\router40` (this file's folder);
`L40` = `SP\live40`; `MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (read only);
`FR` = `SP\followup-turn\R` (the flight's grader tools, read only, imported never edited). Times are local (UTC+3).

**The request (the user, 2026-10-05, in chat):** run the 3.8 Live ROUTER test on the SAME set as live40 so it can be
compared: 3.8 Live answers the questions it judges easy; everything else (medium and hard) is answered by the text
pipeline model, **gemini-3.1-flash-lite at thinking LOW** (not 3.5-lite: today's 3.5-lite quota is reserved for
tonight's flight). **Zero 3.5-lite calls.**

## 0. Inputs as read (sha256, first 16 hex; full hashes where a run checks them)

| file | sha256/16 | role |
|---|---|---|
| `L40\items.json` | `e531772bdc6e9c23` | the 47 items: id, text, route, class, parent, chain (31 chains) |
| `L40\clips\manifest.json` | `fec8977176325add` | clip path + sha12 per id (19 reused, 28 rendered) |
| `L40\runs\live40-r1.answers.json` | `060cb1e14e596064` | arm A's answers (46 answered; RH14 none) |
| `L40\runs\live40-r1.json` | `4d5fd6d85d14f6f5` | arm A's metrics (firstOutputTextMs etc.) |
| `L40\grade\blind\pairs.blind-1.json` + `keyhold\key.json` | `b252ac7d317e5576` / `b4bd1d4839a765e9` | live40's original grading (for the test–retest line only) |
| `L40\run.mjs`, `mock-session.mjs`, `dry-check.mjs` | `cd042cb3a6d2c42a`, `a465c185e571d292`, `1d11d463a3b56191` | R's runner base |
| `SP\l38r\run.mjs`, `read.mjs` | `227e1a4d3a23234e`, `662346115943ab80` | the routing block, its timing, its reader classes |
| `SP\l38m\pipeline.mjs` | `682322cff0eac761` | L's request + follow-up shape W (L38P/L38M) |
| `R40\turns-for-classifiers.json`, `R40\keyhold\key.json` | `54d9084757c4e114`, `42e1b04f1f60283f` | the 47 turns (T01–T47) and their key |
| `R40\SET-draft.md` | `a01cbd21c020f28d` | the set's EASY/HARD definition (§1–2) and separator draft (§7) |
| `SP\l38base\PREREGISTER-base-rate.md`, `blind\cal-blind.json`, `keyhold\cal-key.json` | `c6c731de0d848981`, `4ea9be1dce1424c7`, `79c53e532e01527f` | the L38R easy definition and its 22-item calibration set |
| `SP\l20d\instruction.txt` | `e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f` | live40's instruction |
| `FR\launch-grader.mjs`, `check-grader-memory.mjs`, `h40d-grader-models.mjs`, `audit-graders.mjs` | `2f096c38016161ed`, `119ea78a433ba47d`, `3626e263f3fac5ba`, `07833cf41bcc1c6e` | grader launch, memory, model and dispatch helpers |
| `SP\quota-ledger-today.mjs` | `77fc722c36da1a68` | the day's lite ledger (read only) |
| MAIN `electron/test/golden/interview60.judge.mjs` | instrument `graderPromptVersion() = 8564ba96369a` (read 17:2x) | rubric + `questionForGrader`, as live40 |
| MAIN `dist-electron/electron/llm/verbalStreamFilter.js` | `28d6c47b9da4fba6` (mtime 2026-10-05 17:12) | L's filter chain; re-hashed at L's start and recorded |

**The profile block.** Both R and L carry live40's CONTEXT block: `MAIN\electron\test\golden\interview60.runs\2026-09-20T11-22-43-s50k\interview60.prompts.json`,
key `S1Q02`, field `user`, the slice from `CONTEXT:` up to (not including) `USER QUESTION:`, trimmed — **sha256
`dd74bbdeaec1be672a652c7fd85dffe5338e25f66d05f4aeaa3fcdeb0fd73792`, 3,545 chars**. Known-answer: `instruction.txt +
"\n\n" + CONTEXT` reproduces live40-r1's recorded `systemSha12` **`cb64434c6c44`** (recomputed 17:2x: equal). L also
sends that record's `system` field (the app's verbal system prompt as captured that hour, **sha256
`d2afcc1f051231da82c244ec2a0372bb1f36c9df2d62fb58c4abe5c0ed935a34`, 16,223 chars**). I read neither text: my only
reads of this file printed hashes, lengths and the all-caps header tokens of S1Q02 (system: IMPORTANT, CONTEXT
PRIORITIZATION RULES, FORBIDDEN, RESPOND BASED ON INTENT, RULES; user: CONTEXT, URL ×2, USER QUESTION, DETECTED
INTENT, ANSWER SHAPE, INTERVIEWER JUST SAID). Harnesses read it in-process and never print or write it.

**Labels already fixed (pre-data).** `R40\blind\verdicts.c1.json` / `.c2.json` (two Opus classifiers, 2026-10-03, the
SET-draft §1 definition): route agrees with the draft label on **47/47** for both (counted 17:2x, ids only). These are
the "live40 groups": **EASY 20** (RE01–RE20); **HARD standalone 11** (RH03, RH04, RH05, RH07, RH09, RH12, RH15, RH17,
RH18, RH19, RH20); **HARD follow-ups 16** = QF 9 (RH01, RH06, RH08, RH11, EF01, EF03, EF04, EF05, EF06) + AF 7 (RH02,
RH10, RH13, RH14, RH16, EF02, EF07).

## 1. The question, and what this is not

On the 47 live40 turns, against live40's bare Live (A) and 3.1-lite LOW alone (L): does "Live answers what it judges
easy, 3.1-lite LOW answers the rest" (R) (a) route as the labels say, (b) keep L's quality and safety, and (c) give
the easy questions a first text clearly earlier than L's? **A comparison, not a ship decision.** The best possible
reading (§7, CANDIDATE) licenses only writing a router design spec and its own flight pre-registration.

## 2. The set (unchanged from live40)

The exact live40 47 items, same ids, texts (`items.json` `text`), clips (manifest paths, PCM hash-checked against
`sha12` before any network call, as live40), the same 31 chains in SET-draft §5 order, one Live session per chain, a
follow-up played `GAP_MS` = 10 s after the previous turn's answer window ended (silence streamed), 1.5 s between
chains. Clips end in ≈ 0.69 s of digital silence (live40 BUILD-REPORT caveat; nothing trimmed, so R's clock equals
A's).

## 3. Arms

| arm | what answers | run? | graded |
|---|---|---|---|
| **A** Live alone | live40-r1's existing 46 answers (L20d instruction + S1Q02 CONTEXT, gemini-3.8-live, 2026-10-03 23:16–23:43); RH14 = no answer | **not re-run** | **re-graded** in this batch |
| **L** 3.1-lite LOW alone | gemini-3.1-flash-lite, thinking LOW, every one of the 47 items, ONE answer per item | yes (§3.4) | yes, once |
| **R** router | gemini-3.8-live with the routing block (§3.1) hears every chain; an item Live **answers** (§3.3 class `answer`) shows Live's text; every other item shows **L's answer for that item** (the same text, no second lite call) | yes (§3.2) | Live-answered texts graded (`RL`); the rest carry L's grade |

Reported beside, computed only: **ORACLE** = A's answer on the 20 EASY + L's answer on the 27 HARD (perfect routing by
the live40 labels with these two answerers; an upper bound for the router idea on this set).

**Design read (primary): parallel.** The pipeline always runs (L38R's additive framing): for a non-Live item R's first
text is L's. The serial reading (lite starts only after Live says "hard") is reported as a second latency line.

### 3.1 R's system instruction — exact

`R_SYSTEM = INSTRUCTION + "\n\n" + CONTEXT + "\n\n" + BLOCK`, i.e. live40's system (sha12 `cb64434c6c44`) with the
block appended exactly where L38R appended its block (after the CONTEXT). `INSTRUCTION` = `l20d\instruction.txt`
(CRLF→LF, sha `e29bf381…`); `CONTEXT` as §0.

**BLOCK, variant A (registered default)** — L38R's block verbatim (`l38r\run.mjs` `LIVE_MODE`, sha256
`e3c028afdd9778874d1fb4220d866ae12d0b0594152dcc32b2361395822cf205`) with **line 4 only** changed:

```
[LIVE MODE]
You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.
When the interviewer finishes a question, decide:
- If it is a SHORT FACTUAL question with ONE part, which the candidate can answer in one line (an either/or choice, a yes/no, a name, a number, a complexity class), answer it as the instructions above say, and nothing else.
- Otherwise (several parts, a design or a scenario, an explanation, an experience question, a follow-up that builds on an earlier answer), say exactly the single word "hard" and nothing else.
Wait until the interviewer has finished the whole question before replying. If what you heard is not a question for the candidate, output nothing.
[END LIVE MODE]
```

BLOCK_A sha256 **`c941c7727c393a2fdeb0f88d179d2c10c26636afb0f7be700d598020cbfb475b`** (LF, no trailing newline);
R_SYSTEM (A) sha256 **`e87db57f383e59bcfb267445eff8e147e593eb8ea2c28a559f799620b6b9b4a2`**, 5,560 chars.
Why only line 4: L38R's line 4 ("reply with that one-line answer only: at most five words…") contradicts live40's
instruction (≈ 60 words for a one-part question) and would make R's easy answers a different deliverable from A's
(not comparable, graded on another shape). The routing criterion (line 4's condition, line 5) is L38R's, unchanged —
the class the user named (one part, one fact, stands alone). "the context below" is kept verbatim from L38R although
the block follows the context (L38R had the same placement and wording).

**BLOCK, variant B (only if the user picks it before any Live call; §11 D1)** — the same frame with lines 4–5 replaced
by router40 SET-draft §7A's wording verbatim:

```
- If the interviewer names ONE concept and asks what it is, what it does, or how it differs from one other concept, with no reference to earlier questions, the candidate, or a situation, answer it in at most 80 words.
- Otherwise say the single word hard. Anything with that / this / it / your / earlier / why that / tell me about → hard.
```

BLOCK_B sha256 `e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8`; R_SYSTEM (B) sha256
`4571f563321f6d9cf738c04b05933016bca9521df5e712142c3472d6009041c5`. Under B the too-long gate is 80 words (§3.3).
The runner refuses to start unless `R_SYSTEM`'s sha equals the chosen variant's, printed in the run file.

### 3.2 R's run parameters

live40's `run.mjs` unchanged except (anchored, §9 P2): system = §3.1; outputs under `R40\runs\`; end-of-answer
detection = **L38R's**: the item ends 6 s after any completed turn (`ANSWER_WORDS` 1), 30 s with no output = silent
(`NO_OUTPUT_MS` 30 000), cap 90 s (live40's 25-word/30 s rule would add ≈ 30 s after every one-word "hard"). Model
`gemini-3.8-live`, `responseModalities ['AUDIO']`, input + output transcription, `contextWindowCompression
slidingWindow` — as live40. Text = output transcription; **audio bytes are counted and discarded: nothing is written
to disk as audio and no playback device is opened** (direct API; nothing reaches the speakers). Retry: ONE re-run of a
chain whose session closes abnormally (code ≠ 1000, a failed connect, or no setupComplete in 10 s) before every played
turn has a generationComplete; the failed attempt's events kept as `<id>~a1` (live40's rule). Key read in-process
from `MAIN\.env` (`GEMINI_API_KEY`, name only), scrubbed from every saved string; the console prints ids and numbers
only. One smoke chain first (`--only C02 --name router40-R-smoke`): mechanics only (session, sha, events, reader runs);
its routing outputs are not read and decide nothing; the block cannot change after it.

### 3.3 R's reader: the route class of each item (computed from text, no judgement)

`T` = the item's output transcription after its clipEnd up to itemDone, concatenated, trimmed (live40's `answerFor`);
`w` = its word count; `first` = its first word, lowercased, letters only. First matching row wins:

| class | rule | shown in R |
|---|---|---|
| `missing` | the item was not played to clipEnd, or its session closed abnormally before any post-clip output, after the chain's one retry | L |
| `silent` | played, session open, `w` = 0 (endReason noOutput or a normal close with nothing) | L |
| `hard` | `first === "hard"` (any case/punctuation; if `w` > 1 it is also flagged `hard+tail`) | L |
| `apology` | `/system error/i` (L38R/live40's error marker) | L |
| `malformed` | contains `<`, `>` or `[`; OR the word "hard" among its first 12 words but not first; OR any 8 consecutive words (lowercased, letters/digits only) shared with `INSTRUCTION` or `BLOCK` (a recital, L38R S2Q02F); OR `w` ≥ 8 with none of {the, a, an, is, are, it, and, of, to, in, for, you, i, that, this, with, on} (another language, L38F) | L |
| `too-long` | `w` > 150 (variant A: L20d's own ceiling; live40 max was 79) / `w` > 80 (variant B, §7A's gate) | L |
| `answer` | everything else (`w` ≥ 1) | **Live's T** |

Early output (output transcription before clipEnd) is counted and listed per item; it does not change the class.

### 3.4 L: the lite request — exact

- `POST https://generativelanguage.googleapis.com/v1alpha/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse`,
  header `x-goog-api-key` (key in-process from `MAIN\.env`), body `{contents:[{role:'user',parts:[{text:USER}]}],
  systemInstruction:{parts:[{text:SYSTEM}]}, generationConfig:{temperature:0.4, maxOutputTokens:65536,
  thinkingConfig:{thinkingLevel:'LOW'}}}` — the app's settings (interview60.answers.mjs `--thinking LOW`, the shipped
  level). The model id is a constant; the script refuses any `--model` (exit 2 before reading the key).
- `SYSTEM` = s50k `S1Q02.system` (sha `d2afcc1f…`, §0): the app's verbal system prompt captured in the record
  live40's profile came from (L38H/L38M sent a captured system prompt the same way).
- `USER` = the app's no-intent shape (`LLMHelper.ts` `CONTEXT:\n…\n\nUSER QUESTION:\n${message}`;
  `WhatToAnswerLLM.earlierQuestion.test.ts:89–90` pin the message parts and trailer):
  ```
  ${CONTEXT}\n\nUSER QUESTION:\n[PREVIOUS RESPONSES (Avoid Repetition):\n1. "${preview}"\n\n]INTERVIEWER JUST SAID:\n${lines.join('\n')}\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):
  ```
  (the bracketed part only for a follow-up). **Known-answer, run 17:2x:** this builder fed S1Q02's own captured
  transcript reproduces S1Q02's captured user turn byte for byte once its intent region (`DETECTED INTENT` +
  `ANSWER SHAPE`, 817 chars) is removed (`true`); one added space → `false`. The intent region is dropped for every
  item: it is S1Q02-specific, no intent classifier runs here, and the app sends this shape when intent is absent.
- **Main item:** `lines = ["[INTERVIEWER]: " + item.text]`.
- **Follow-up (16)** — L38P/L38M's shape W (`l38m\pipeline.mjs` `promptFor`), with L's OWN answer to the item's
  `parent` (items.json `parent`, one level): `preview` = that answer cut to 200 chars + "..." if longer;
  `lines = ["[INTERVIEWER]: " + parent.text, "[ASSISTANT]: " + parentAnswer.toLowerCase(), "[INTERVIEWER]: " + item.text]`.
  So L runs in chain order and a follow-up is sent after its parent's answer is stored. A parent with no L answer
  (hole) → the follow-up is sent with `lines = [parent line, follow-up line]` and no PREVIOUS RESPONSES, flagged
  `orphan`.
- **Item text = the roster text (items.json), not Live's input transcription.** Why: the ear is not under test; L's
  answers must not depend on R's session, so R's hard path can reuse L's answer with one lite call per item; the app's
  pipeline never receives Live's transcript (it has its own STT); and it is the scripted question the graders grade
  against. Cost: L sees no STT error (an upper bound for the pipeline; named in "not covered").
- Filters: MAIN dist `verbalStreamFilter.js` composed as `interview60.answers.mjs:201` (stripCueBlock innermost,
  filterCodeFences, filterVerbalLines, stripSuggestionBlock, stripSpokenNotation), fed character by character. TTFT =
  ms from request send to the first non-thought text piece; also total ms, thoughtsTokenCount, finishReason, words.
- Retries: an attempt that gets HTTP 429/5xx, a fetch error, or a stream ending with no finishReason is retried after
  8 s × attempt, at most **3 attempts per item**; every attempt counts against the cap (§4). An item with no answer
  after 3 attempts is an L hole (not acceptable; R shows no answer there too). Three consecutive items ending as holes
  = STOP (an outage), L INCOMPLETE. 1.5 s between calls. Output `R40\runs\router40-L.answers.json` (written after
  every item; per item: id, spoken, words, ttft, total, thoughts, finish, attempts, orphan, prompt sha12).

## 4. Quota: the cap and its counter (3.1-lite only; 3.5-lite = 0)

- Day: 2026-10-05 10:00 → 2026-10-06 10:00 (reset 10:00 local). 500 requests/day/model.
- The flight needs ≥ 372 headroom on 3.1-lite at arming (flight-eq A2.2); the user adds a 20 margin after the flight's
  smoke (≈ 10 per model, A2.2) and the n5 call (1, A2.2; counted here on 3.1 to be safe):
  `500 − used_other − router40 − 10 − 1 ≥ 392` ⇒ `used_other + router40 ≤ 97`.
- `quota-ledger-today.mjs 2026-10-05T07:00:00.000Z`, read **17:22**: 0 app-log lines since the reset, 0 lite mentions;
  4 files listed, all code (earlierQuestionArm.mjs/.test.ts, interview60.answers.mjs, task-8-arm.txt), none a call record.
- **HARD CAP = 60 requests to gemini-3.1-flash-lite** (47 + 13 retries). At `used_other` = 0 it leaves 37 for
  anything else before arming. Expected use: 47–50.
- **Counter:** `R40\runs\lite-quota.answers.jsonl` (the name matches the ledger's file pattern, so the ledger lists it).
  One line `{n, id, attempt, at}` is appended and flushed **before** each fetch is issued (write-ahead: a crash never
  under-counts); before every attempt the script counts the file's lines and refuses at ≥ CAP (exit 3, `CAP REACHED`,
  L INCOMPLETE). The counter persists across restarts; it is never truncated.
- **Gate at L's start (P9):** re-read the ledger; `U` = its 3.1-lite mention count since the reset (an upper bound) +
  the entries of any listed file that holds 3.1 calls. `CAP' = min(60, 97 − U)`. Start only if `CAP' ≥ 52` (47 + 5);
  else no L tonight and router40 waits for a quota day with no flight.
- **Hand-off (the ledger cannot see this):** `quota-ledger-today.mjs` counts app-log lines and only LISTS files, so a
  harness call is invisible to its count. The result line `router40 3.1-lite requests sent: N` (the counter's line
  count + the file's sha) goes to the flight's controller, to be ADDED to the arming ledger read. (See §11 D3 on A2.2.)

## 5. Metrics

**Routing (R).** Per item its §3.3 class. Tables: rows = live40 class (E 20, H 11, QF 9, AF 7; plus the groups EASY
20 / HARD standalone 11 / HARD follow-ups 16), columns = the seven classes. EASY caught = `answer` on E; HARD kept away
= not `answer` on HARD (exact "hard" reported apart). `missing` items are excluded from denominators and listed.
Second axis: the same table by **l38base labels** (§6.2; consensus EASY = both classifiers EASY, "split" row for
disagreements).

**Quality, per arm (A, L, R, ORACLE), per group and all 47** — live40's rule: **acceptable** = both graders
correctness 2 AND on_topic 2 (delivery not used); **wrong** = any grader correctness 0; no answer = not acceptable.
R's grade per item = RL's grade if `answer`, else L's. Paired lists: items where R and L differ; R vs A on HARD (does
routing hard to lite fix Live's hard losses); A vs L.

**Misroute costs.** False EASY (a HARD item R answered): per item R vs L grade (Δ acceptable, Δ wrong); AF answered
listed first; QF answered listed apart (a rule miss, not unsafe — SET-draft §2). False HARD (an EASY item not
answered): count; latency cost = L TTFT − A's first text on that item; quality = L vs A grade.

**Latency.** Live first text = `firstOutputTextMs` since clipEnd (live40's clock and metric) for R's `answer` items,
beside A's on the same items; "hard" decision time = `firstOutputTextMs` of `hard` items; L TTFT (since request send)
p50/p90 per group; **lead** = p50(L TTFT on R's `answer` items) − p50(R Live first text on the same items); composed
R first text (parallel = Live's or L's TTFT; serial = Live's "hard" time + L TTFT) p50/p90. The two clocks differ: the
Live clock starts ≈ 0.7 s after the last speech sample (tail), the lite clock excludes the app's own question-end →
request time (gate ≈ 0.6 s; whole-turn hold); both differences favour the pipeline in this table, so the measured lead
is close to a lower bound of the in-app lead (not measured).

**Health.** Chains needing a retry, close codes (1000 / 1011 / 1006 / other), connect failures, `missing` count M.

**Test–retest.** A's new consensus grades vs live40's original (36/46 acceptable): same/different per item.

## 6. Grading and labelling

### 6.1 ONE blind grading batch

- Answers: A 46 + L ≤ 47 + RL (R's `answer` texts, k ≤ 47). L is graded once; R's non-answer items reuse it.
- **Files:** split by **whole items** (every answer of an item in the same file, as flight-eq A3.5 m10), 47 items in
  live40 chain order cut into 4 files of 12/12/12/11 items (≤ 36 answers each; flight practice ≤ 44 per file).
  Within a file, answers shuffled with seed `blind:router40:r1`; neutral keys `q01…`; arm, id and class only in
  `R40\grade\keyhold\key.json` (outside the blind folder; no grader is allowed to read it).
- **Item shape** = live40's `build-blind.mjs`: `{key, id: key, kind:'spoken', level:null, topic:null, question,
  heard, source:'answers-pass', answer}`; `question` = MAIN `questionForGrader` (a follow-up carries `[Follow-up to:
  <parent>]`), checked equal to live40's question for every A item (46/46); `heard` = what that arm heard (A: live40's
  input transcription; RL: R's input transcription; L: the roster text it was sent).
- **Graders:** two grades per answer (`g1`, `g2`), each file graded by a fresh `g1` session and a fresh `g2` session =
  **8 sessions**, ≤ 2 at a time. `claude -p` with **`--model claude-opus-5-5`** (pinned id), `--tools Read,Write,Edit`,
  `--permission-mode dontAsk`, `--strict-mcp-config`, **no `--add-dir`, no Bash**; allowed: Read of its own pairs file
  and the rubric (`MAIN\electron\test\golden\interview60.grader-prompt.md`), Edit of its own verdicts file (FR's
  `claudeArgs` rule set). Prompt = the h40d dispatch text (`audit-graders.mjs` `DISPATCH_FILE`) with only the pairs
  path, the verdicts path and the tag substituted (FR `buildPrompt`, checked by `dispatchProblem`). cwd = a fresh
  folder `R40\grade\grading\<slot>-a<k>` (outside MAIN and the worktree; never reused; its projects folder must hold
  no .jsonl and no memory before launch). **This is the flight's recipe (flight-eq A2.7/A3.5), not live40's: live40's
  launcher allowed `Bash(node -e *)` and `--add-dir` and passed the alias `opus`** (its g1 and g2 each used Bash once).
- **Checks per session (all must hold):** exit 0 and a verdicts file valid on its pairs' keys (FR `verdictFileProblem`);
  memory **ABSENT** (`check-grader-memory.mjs`, projectMemory 0, claudeMem 0); model **PINNED** (`h40d-grader-models.mjs`
  reads only `claude-opus-5-5` in the transcript); tool audit **CLEAN** (P7: tools ⊆ {Read, Write, Edit}, every path
  one of its three allowed files, no mention of `keyhold`/`key.json`). A failed check = that file re-graded ONCE by a
  fresh session of the same role; a second failure = grading INCOMPLETE (§7).
- Grading runs only after L and R are complete (or declared INCOMPLETE). Grades are the graders'; nothing is re-graded
  by hand.

### 6.2 l38base labels (descriptive axis only)

Two fresh Opus classifier sessions (`c3`, `c4`; same launcher, pinned id, no Bash, no --add-dir), BEFORE scoring and
blind to every answer, classify the 47 turns of `R40\turns-for-classifiers.json` AND the 22 turns of
`SP\l38base\blind\cal-blind.json` with the dispatch text of Appendix B (l38base's definition verbatim). Calibration
(known answer, `cal-key.json`): 12 `simple` → EASY, 10 `hard` → HARD. A classifier that is not 22/22 on the cal turns
makes the l38base axis **UNCALIBRATED** (reported, not read). No reading in §7 uses this axis.

## 7. Readings — registered now, applied verbatim (first matching row wins)

Inputs: consensus grades (§6.1), §3.3 classes, metrics. `acc_X` / `wrong_X` = counts over all 47 items.
`EASY_caught` = R `answer` on the 20 EASY. `AF_answered` = R `answer` on the 7 AF. `M` = `missing` count.

| # | reading | condition | what it means |
|---|---|---|---|
| 1 | **INCOMPLETE** | L or R not complete (cap, stop, deadline, health stop), or grading INCOMPLETE | no reading below; completed parts reported (A vs L if both graded) |
| 2 | **NOT SAFE** | `AF_answered ≥ 1` OR `wrong_R > wrong_L` | no router flight registration; the router on this set stops unless the user reopens it |
| 3 | **COSTS QUALITY** | `acc_R ≤ acc_L − 3` | no registration |
| 4 | **BUYS NOTHING** | `EASY_caught < 10` OR `lead < 1000 ms` OR `M ≥ 3` | no registration; the measured coverage/lead reported |
| 5 | **CANDIDATE** | none of 1–4 (so `acc_R ≥ acc_L − 2`, no AF answered, wrong not above L, ≥ 10 of 20 easy caught, lead ≥ 1.0 s, M ≤ 2) | licenses WRITING a router design spec (Opus) + Opus review + its own flight pre-registration; nothing ships from this test |

**Noise caveat (part of the rule, not an escape from it).** n = 20 EASY and 27 HARD; live40's two graders differed on
5 of 46 (g1 36 vs g2 41 acceptable; all five g1 c1 vs g2 c2). R and L share every non-`answer` item, so `acc_R − acc_L`
comes only from the k Live-answered items; on k ≈ 15 with ~10% weak answers per arm its SD is ≈ 1.7 items. Hence a
difference of 1–2 is read as "no detectable difference" (row 3 needs 3), while **wrong** is held strictly (row 2: one
extra wrong line on screen is the cost the router exists to avoid). Thresholds are fixed here; none moves after data.

**Descriptive, decides nothing:** R vs A on HARD; A vs L; ORACLE; test–retest of A; the l38base axis; QF answered;
early outputs; serial-design latency.

**My expectations, recorded before data (so a surprise is visible):** variant A: `EASY_caught` ≈ 6 (range 2–12; the
L38R criterion lists "an explanation" as hard, and most of the 20 are definitions), HARD answered ≤ 2 of 27, AF 0–1;
L: acceptable EASY 18–20, HARD standalone 5–8 of 11, follow-ups 11–14 of 16, TTFT p50 1.5–3.5 s. Most likely reading
under A: 4 BUYS NOTHING. Under B: `EASY_caught` 14–19, false EASY 1–3 (the short traps), reading 2/4/5 all plausible.

## 8. Safety, timing, Live health

- **Audio:** none played or saved (§3.2); clips are streamed as PCM from files.
- **The flight comes first.** Nothing of router40 runs during the flight's smoke, precheck or hour. Before each piece
  (L, R smoke, R full, grading) the pre-run guard (P9) must read: no `Natively-*` scheduled task Running, no
  electron.exe, no tail.exe, and now < the deadline. **Deadline 20:30** (the user's; it assumes the flight's T ≥ 21:00 —
  if the controller registers T earlier, the deadline becomes T − 30 min).
- **Latest starts:** L by 20:05 (≈ 5–8 min); R full run by 19:50 (live40 took 26.6 min; R's waits are shorter); a run
  that cannot start in time does not start (L and R are then postponed to a later quota day with no flight, same
  files and texts; an R postponement needs no lite quota). Inside a run, no new item/chain starts after 20:25, and at
  20:30 a running harness saves and exits (SIGINT handler, as live40): its unfinished items make the arm INCOMPLETE.
- **Grading** (Claude only, no Gemini): before 20:30 only if all 10 sessions can start by 20:15; otherwise after the
  flight's hour has ended and after the flight's own graders have finished (never interleaved with them).
- **Live health** (Google 1011, local 1006): a chain is retried once (§3.2). **Health STOP** during R: 3 consecutive
  chains still abnormal after their retry, OR ≥ 6 abnormal chain attempts in total (≈ 20% of 31) → R stops, R
  INCOMPLETE (reading 1), the run is kept and never graded; R may be re-run whole, under a new name, on another day.
  Without a stop: `missing` items (definition §3.3) show L's answer in R (the design's fallback), are excluded from the
  routing denominators, and `M ≥ 3` blocks CANDIDATE (row 4). live40's baseline: 31 sessions, 0 abnormal, 0 retries.
- No build, test or type check runs beside a Live or lite run. Nothing in MAIN or the worktree is written.

## 9. Throwaway harness pieces (one Sonnet implementer; reuse by anchored changes; each with a known-answer check)

All under `R40\`; sources copied, never edited in place. Critical path first (P9, P4, P2, P3); the grading pieces
(P5–P8, P1) can be built while L and R run. Estimate: 30–45 min including calibrations.

| piece | built from | anchored changes | calibration (known answer; must pass before use) |
|---|---|---|---|
| **P9** `pre-run-r40.mjs` | new, small | prints PASS/FAIL lines: clock vs deadline/latest start; ledger → U, CAP'; no `Natively-*` Running (`schtasks /query /fo csv`, names + status only), no electron.exe/tail.exe; every §0 hash; judge instrument `8564ba96369a`; filter sha recorded | `--now` 20:26 → FAIL; a stub ledger text with U = 40 → CAP' 57 PASS; U = 50 → CAP' 47 FAIL; a changed hash (temp copy) → FAIL |
| **P4** `lite-l.mjs` | `l38m\pipeline.mjs` `ask()` + `interview60.answers.mjs` filter chain | model constant 3.1-lite + LOW; §3.4 builder; chain order; write-ahead counter + CAP; retries; deadline; `--dry` prints id, parent, prompt sha12, chars (no key read) | (a) builder on S1Q02 → `true`, +1 space → `false` (as run 17:2x); (b) stub fetch (`R40_FAKE_FETCH`, no network), CAP 3 in a temp dir → 3 counter lines then `CAP REACHED` exit 3; (c) stub 503, 503, OK → 3 attempts counted, answer kept; (d) stub stream without finishReason → retried; (e) `--model gemini-3.5-flash-lite` → exit 2, key never read; (f) the file contains no `3.5` (grep 0); (g) `--dry`: 16 follow-ups carry PREVIOUS RESPONSES, 31 mains do not |
| **P2** `run-r.mjs` (+ `mock-session-r.mjs`, `dry-check-r.mjs`) | `L40\run.mjs`, `mock-session.mjs`, `dry-check.mjs` | system = §3.1 with sha guard (`--variant A|B`); L38R timing; outputs to `R40\runs`; items/clips read from L40 (read only); deadline guard; health STOP; mock gains a per-id reply script ("hard" / 40 words / silent) | `--dry --dry-fail C05`: 47 turns in §5 order, 16 gaps 10 s, C05 retried once, "hard" items end 6 s after their turn, silent items end at 30 s; wrong `--variant` sha → exit 2; `--deadline` in the past → no chain starts; mock "3 consecutive abnormal" → health STOP |
| **P3** `read-r.mjs` (+ `cal-read-r.mjs`) | `l38r\read.mjs` classes, extended to §3.3 | §3.3 rules; confusion tables by live40 class and by l38base labels; prints ids, classes, counts only | a synthetic answers file of 14 crafted items, one per edge: `hard`, `Hard.`, `HARD! A Docker image is…` (hard+tail), `<system> hard </system>` (malformed), "This is hard to say…" (malformed), an 8-word recital of BLOCK (malformed), a Spanish sentence (malformed), 151 words (too-long, A), 150 words (answer), 81 words (too-long under B only), "" (silent), "system error" (apology), not played (missing), a 40-word answer → 14/14; one flipped expectation → reported mismatch |
| **P5** `grade\build-blind-r40.mjs` | `L40\grade\build-blind.mjs` | three arms; whole-item split 12/12/12/11; seed; keyhold | A's 46 questions equal live40 `pairs.blind-1.json`'s via its key (46/46); answer counts per arm = run files; no item id, arm or class string in any blind file (grep) |
| **P6** `grade\launch-grader-r40.mjs` | imports FR `launch-grader.mjs` helpers (`buildPrompt`, `claudeArgs`, `launchAttempt`, `launchRecord`, …) | process env `TURN_GRADING_DIR = R40\grade\grading` set BEFORE the dynamic import (FR reads it at import: own cwds and slot lock, nothing written under FR); swaps exactly one `'--model','opus'` → `'claude-opus-5-5'` (asserts one occurrence); slots `blind-1..4.g1|g2`; `--classify c3|c4` mode for §6.2 | `--dry-run`: argv shows `--model claude-opus-5-5`, `--tools Read,Write,Edit`, zero `--add-dir`, cwd outside MAIN/worktree and fresh; an existing cwd → REFUSED |
| **P7** `grade\audit-r40.mjs` | `L40\grade\audit-tools.mjs` + FR `check-grader-memory.mjs` `scan` + `h40d-grader-models.mjs` | CLEAN / ABSENT / PINNED per session | live40 g1 (session `9856e006…`, used Bash ×1) → NOT CLEAN (known positive); one FR grader session that `FR\audit-graders.out.txt` lists as clean → CLEAN |
| **P8** `grade\score-r40.mjs` (+ `cal-score-r40.mjs`) | `L40\grade\score.mjs` | §5 tables, ORACLE, misroute costs, latency, test–retest, §7 reading | synthetic verdicts/classes/latencies built to hit each §7 row once (INCOMPLETE, NOT SAFE by AF, NOT SAFE by wrong, COSTS QUALITY, BUYS NOTHING by coverage, by lead, by M, CANDIDATE) → each prints its expected reading |
| **P1** `l38base-dispatch.txt` | Appendix B, exact | paths substituted only | the cal part of §6.2 (22/22) is its calibration |

## 10. Order of the day

1. This file → fresh Opus review → the user's answers to §11 (D1 at least) → amendment if any, all before any call.
2. Build P1–P9; every calibration passes; an Opus code review of the diff against this file.
3. P9 → **L** (`lite-l.mjs`).
4. P9 → **R smoke** C02 → P9 → **R full** (31 chains).
5. P6 `--classify c3`, `c4` (any time before scoring; Claude only).
6. P5 → 8 grader sessions (P6) → P7 audits → P8 → result note `R40\RESULT-router40.md` (the reading, the tables,
   `router40 3.1-lite requests sent: N`).

## 11. For the user to decide (before any call)

- **D1 — routing block.** A (default): L38R's criterion verbatim, only the answer-length line adapted to live40's
  instruction. B: router40 SET-draft §7A's criterion (one named concept, ≤ 80 words) — the separator that set was
  written for. My expectation is that A routes few of the 20 definitional easy items (reading 4 likely); B tests the
  set's own easy class. One word chooses; both texts and shas are above.
- **D2 — grader split.** Default 4 whole-item files × g1/g2 = 8 sessions (two grades per answer; ≤ 36 answers per
  file). Literal alternative: 2 sessions each grading all ≈ 100–140 answers in one file (larger than any file graded
  so far: live40 46, the flight's cap 44).
- **D3 — flight-eq A2.2 says** "no other lite replay or flight runs on [today's quota day] besides the smoke(s), n5's
  call and this flight". L makes that false (≤ 60 3.1-lite requests, 0 on 3.5-lite). The flight's arming record should
  quote the user's go-ahead and router40's counter N (the ledger tool cannot count harness calls). Not edited here.
- **D4 — the flight's T.** A1 allows T from 19:30; this file's 20:30 deadline assumes T ≥ 21:00 (the user's
  "~21:00–00:00"). An earlier T moves the deadline to T − 30 min.

## Appendix B — the l38base classifier dispatch (P1), exact; `<TURNS>`, `<CAL>`, `<OUT>` substituted with absolute paths

```
You are one of two independent classifiers for interview questions. The other classifier gets this same text; you never see its output. Read only the two input files named below and write only the output file named below; make no model or network call.

INPUT 1: <TURNS>. It lists 47 interviewer turns in the order they are spoken, each with a neutral id (T01..T47) and the spoken text. A follow-up turn carries "parent": the earlier question it follows, exactly as a listener in the same session would have heard it. The candidate's answers are never shown.
INPUT 2: <CAL>. It lists 22 more turns, each with a key, the question, and "earlierQuestion" (the earlier question for a follow-up, else empty).

TASK: label EVERY turn of both inputs EASY or HARD, applying this definition literally.

EASY = all of:
1. one part: a single thing is asked (no "and", no list of sub-questions, no "what … and why");
2. the correct answer is one fact statable in ≤ 5 words: a term, a number, a yes/no, a name, a choice between two named options ("Batch or online?" → "Batch");
3. it stands alone: it does not depend on what the candidate said or did ("your approach", "that call", "how long did it take you", "why did you choose") and does not ask about the candidate's experience or CV;
4. it asks for no explanation, justification, design, comparison of trade-offs, walkthrough, or code ("why", "how would you", "walk me through", "design", "compare", "explain" → HARD, unless the sentence still reduces to naming one thing).
Everything else is HARD. When in doubt, HARD (the router's cost of a wrong EASY is an unsafe line on screen; the cost of a wrong HARD is nothing).
Follow-ups are classified on their own text with the parent's text shown, as the router hears it (same session).

OUTPUT: one JSON object, nothing else, with every one of the 47 T ids and every one of the 22 keys:
{ "T01": { "route": "EASY" | "HARD", "reason": "<= 12 words" }, ..., "<key>": { "route": ..., "reason": ... } }
Write it to <OUT> and also return it as your final message.
```

(Definition clauses 1–4 and the two sentences after them are `PREREGISTER-base-rate.md` §Definition verbatim, its
line wraps joined; the last definition sentence is its §Sets follow-up rule; the frame follows
`R40\classifier-dispatch.txt`.)

**Not covered:** the in-app path (Live transcript → screen, the pipeline's STT, gate and whole-turn hold — both clocks
here are offline); STT errors on L (it gets the roster text); the app's current shipped prompt (cue rule and later
edits; L sends the s50k-captured system prompt and no intent header); Live's day-to-day variance (A ran 2026-10-03, R
runs today: one rep each, no repeat); a router session sharing the ear's prompt (L38M: it cannot); typed questions;
paid-tier cost and Live quota limits; real interviewers and noisy rooms (SAPI clips); 3.5-lite HIGH as the hard path
(excluded today by quota); the l38base axis beyond its 22-item calibration; holdout40 (never read).
sha256 (of every byte above this line): 2d38dd89a1bc0fd4e97943cbda07291939afd555db85c31472462bd51860c16f
