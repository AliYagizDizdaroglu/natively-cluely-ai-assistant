# Pre-registration — earlier-question context, offline replay on s50m

Written 2026-09-28 evening, before any model call, before any production code. The design is
`2026-09-28-followup-question-context-design.md` (same folder). This file's filesystem mtime is the
pre-registration timestamp; it is copied into `passes/PREREGISTER-followup-questions.md` by the controller
after MAIN unfreezes (after flight h40c, 2026-09-29) and is not edited afterwards. Nothing here touches
holdout40. MAIN is read only; everything the replay writes lands in the scratchpad.

## 1. Instrument (reused from the 2026-09-26 replay, `passes/2026-09-26-followup-replay/scripts/`)

- Builder: the previous `followup-replay-build.mjs` parse/rebuild path (`splitUser` → `parseBlock` →
  `rebuildUser` through the BUILT `prepareTranscriptForWhatToAnswer` + `pinSettledQuestion` from
  `dist-electron`) for the calibration step; `earlierQuestions.ref.mjs` (this folder) for arm B.
- Blind files: `followup-replay-blind.mjs`'s pattern — per item, the 6 answers (A r1-3, B r1-3) shuffled by a
  seeded rng under keys `${id}#${n}`, key files outside every grader's reach, `question` = `questionForGrader`
  (carries `[Follow-up to: <parent>]`; the h40b note: blind files without the parent cannot grade follow-ups).
  PER_FILE = 4 → 4 files of 4 items (16 items: 7 roster, 6 callbacks, 3 dropped-parent).
- Graders: two independent Opus agents per file, `claude-opus-5-5` read from each agent's transcript
  (`subagents/agent-<id>.jsonl` "model" field), the frozen grader prompt + RUBRIC; `graderPromptVersion()`
  stamp today `8564ba96369a` — re-read on the run day; a different stamp means the instrument moved and the
  run is reported, not decided, until the stamp is understood.
- Decision: a `decide()` in the shape of `followup-replay-decide.mjs`, exported pure, calibrated on synthetic
  verdict sets covering every branch of §7 before it reads a real verdict (rule 8).

## 2. Material

Run `electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/`: `interview60.prompts.json` (39
captured `{system, user, model, at}` pairs — every id the app answered that hour and captured; S1Q01 was not
captured), `natively_debug.log` (the 42 `dispatch: answer|supersede` lines, whose `question=` texts are the
pinned questions, in order — the session's answered-question list), `interview60.timeline.json` (play times).

**Arm A** = the captured `user` and `system` exactly as sent. **Arm B** = the same `system`, and `user` with
the design's block inserted by the reference implementation: `insertBlock(userA, block)` = userA with
`${block}\n\n` immediately before `INTERVIEWER JUST SAID:\n`. Checked today (`stamp.mjs`): for all 16 items
(7 roster, 6 callbacks, 3 dropped-parent), userB minus that insertion is userA byte for byte.

**Only gated items differ.** The gate was run over all 39 pinned questions with the session's answered list
cut at each id's own dispatch line and the window's `[INTERVIEWER]` lines before the pinned line
(`gate-report.mjs` §2). It fires on 8; one of them (S2Q01F) has nothing to add because its parent is still
in the window, so its arm B equals arm A. **32 ids are byte-identical between arms and are neither generated
nor graded.** 7 roster ids differ:

| id | kind | cue | lines | block chars | block sha256/12 |
|---|---|---|---|---|---|
| S1Q04F | follow-up of S1Q04 | constraint | 1 (parent) | 576 | 8a58894a5e5f |
| S1Q06F | follow-up of S1Q06 | pronoun | 1 (parent) | 556 | 03260be280dc |
| S1Q08 | main ("extend that design") | reference | 1 (grandparent S1Q07; parent S1Q07F in window) | 360 | c4cd0f676d8b |
| S2Q05F | follow-up of S2Q05 | pronoun | 1 (parent) | 500 | b2e08983d0f0 |
| S2Q08 | main ("extend that service") | reference | 1 (grandparent S2Q07) | 358 | 9d8317a2e9dc |
| S2Q08F | follow-up of S2Q08 | pronoun | 1 (parent) | 471 | c30c95b3155a |
| S2Q09F | follow-up of S2Q09 | reference | 1 (grandparent S2Q08F; parent in window) | 284 | 5df9928795ce |

Recorded material, all in this folder and frozen with this pre-registration (a change to the gate, the
selector, the caps or the label is a new design and a new pre-registration, never a tuning step inside this
one):
- `s50m-gated.json` — sha256 1aa4b3a57eea2062357b4e80b57a914ffb2303772ec2a3273390f2b2382b70b5, 440,661 bytes:
  per item (16) `current`, `cue`, `block`, `blockSha`, `userA`, `userB`, `system`.
- `parity-fixture.json` — sha256 f61c4607697743a1058d9fc8be38fbec0783c459a1968a8972f343b6de505302, 312,424
  bytes: 48 entries (all 39 s50m ids, the 6 callbacks, the 3 dropped-parent cases), each with its inputs
  (`current`, `answered`, `windowLines`, `now`) and the expected cue and block — a block for 16, '' for 32.
- `earlierQuestions.ref.mjs` — sha256 0459f578e47706424df0c41684a46c041fa52109923c1eb25df1c484d0dda256.
- `gate-report.mjs` — sha256 b23b9219826b98d92a79465455b95e69d9c8d7ce35207ae67319f53dd463bf79.

Note on what this set covers: S1Q04F and S2Q05F are the two items the 6c50ec3 replay LOST (wYY→www, YYY→Yww)
and S1Q06F and S2Q08F two of the three it WON (www→YYY); S1Q08, S2Q08, S2Q09F are new. S2Q06F (the third win)
is not gated: STT heard "Extended to retry…" and the gate finds no cue — it gets today's prompt, by design.
The three holdout sentences quoted in the brief (R02F, R09F, R11F) were seen during design; they are in no
calibration set here, and a later holdout reading of those follow-ups carries that bias and must say so.

**Parity clause, silence included.** The later app implementation must reproduce the reference byte for
byte on the same inputs — where it adds a block and where it stays silent. The unit-test fixture is
`parity-fixture.json` as recorded: for each of the 48 entries the built module's `(cue, block)` must equal
the expected pair — the recorded block bytes for the 16 that get one, '' for the 32 that do not (S2Q01F,
whose gate fires but whose parent is still in the window, among them). That is what proves the built gate
stays silent where the reference did. `stamp.mjs` re-derives all 48 entries from their inputs with the
reference (`PARITY FIXTURE OK`) and proves the check can fail on a corrupted parent text. Without a green
parity test the replay's result does not transfer to the build.

## 3. Callbacks (descriptive arm; wrong answers count in §7 clause 1)

Our rosters have no callbacks — every follow-up points at the previous question — so six are written here,
verbatim, each referring to a scenario50 question asked ≥ 10 minutes earlier in s50m. Named-topic and vague
references are mixed. A callback's arm A is the captured prompt of a real slot (an id without a Live block)
with the trailing run of `[INTERVIEWER]` lines (the slot's own question as STT heard it, plus its pinned
line) replaced by the callback pinned as the single last line; the slot's context block and PREVIOUS
RESPONSES preview stay as captured (the interviewer asks the callback right after that answer). Arm B = A +
the block, built by the reference selector with the answered list cut at the slot's dispatch and the window =
the slot's remaining lines. Play time of the referenced question is from `interview60.timeline.json`.

| key | slot (dispatch UTC) | refers to | minutes earlier | kind | lines in B | block chars | sha256/12 |
|---|---|---|---|---|---|---|---|
| C1 | S1Q09F (07:44:42) | S1Q04 | 22.7 | named | 2 (S1Q04 + S1Q08 noise) | 562 | 2326893467f7 |
| C2 | S1Q10F (07:47:43) | S1Q06 | 17.1 | named | 2 (S1Q06 + S1Q07 noise) | 561 | 9252786884b9 |
| C3 | S1Q07F (07:37:47) | S1Q03 | 18.5 | vague | 3 (S1Q03 + S1Q04 noise + parent S1Q07) | 908 | 022421810e54 |
| C4 | S2Q03F (07:55:34) | S1Q04 | 33.6 | vague | 1 (S1Q04) | 363 | 4d19e1abc3f4 |
| C5 | S2Q08F (08:16:04) | S2Q04 | 19.5 | named | 3 (S2Q04 + S2Q04F + parent S2Q08) | 808 | 8b88b0c346ea |
| C6 | S2Q06F (08:08:08) | S2Q02F | 15.4 | vague | 2 (S2Q02F + parent S2Q06) | 613 | e6d53217d410 |

Texts:
- C1: "Going back to the evaluate top k function from earlier, how would you make it work for multi-class labels?"
- C2: "Back to the point-in-time SQL feature you wrote: how would you compute it for a ninety-day window instead of thirty?"
- C3: "You mentioned a retention campaign earlier. How would you measure its uplift?"
- C4: "Going back to what you said about the tie rule, would that still hold with float scores from two models?"
- C5: "Going back to reciprocal rank fusion, how would you tune the constant c?"
- C6: "Earlier you mentioned ablations. Which one would you run first, and why?"

In every case the referenced question was selected by the reference selector (`refSelected=yes` in
`gate-report.out.txt` §5). Grading: the grader's `question` = `<callback> [Follow-up to: <referenced roster
question>]` (the same framing `questionForGrader` gives a chained follow-up), `heard` = the callback. Reported
separately from the roster items, descriptively: acceptable/weak/wrong per arm, and whether the answer
addressed the referenced topic. They do not enter clause 5's gain count; their wrong answers enter clause 1.

## 3b. Dropped-parent cases (descriptive arm; wrong and off-topic answers count in §7 clauses 1 and 2)

The error the design cannot prevent: the interviewer asked the parent, the app never answered it (dropped,
held, lost by both ears), so the follow-up's "parent" line is the previous ANSWERED question — the wrong
referent. Three gated follow-ups are replayed as if their true parent had never been answered:

| key | item | true parent (never answered) | stand-in parent line | its dispatch, before the follow-up | block chars | sha256/12 |
|---|---|---|---|---|---|---|
| D1 | S1Q06F | S1Q06 | S1Q05F "Customers appear in multiple snapshots…" | 245 s | 289 | cef7cd851c2d |
| D2 | S2Q05F | S2Q05 | S2Q04F "Why might you use Rank Fusion…" | 247 s | 301 | ae548433d83d |
| D3 | S2Q08F | S2Q08 | S2Q07F "A user loses access to a document…" | 237 s | 272 | 617edb222ab3 |

Arm A is built faithfully for that situation, not approximated: with the parent never answered, the app
would hold no answer newer than 180 s at the follow-up (the stand-in's answer is 237-247 s old), so the
`PREVIOUS RESPONSES (Avoid Repetition):` part — which in the capture holds exactly one response, the true
parent's — would not exist; arm A is the captured prompt with exactly that part removed (`gate-report.mjs`
`withoutPreview`, which refuses if the part holds any other number of responses or if a stand-in were
young enough to have a preview). The transcript window is the captured one: it already holds only the
follow-up's line (the true parent was evicted at 120 s either way). Arm B = that arm A plus the block built
from the answered list with the true parent removed (`parity-fixture.json` D1-D3 record those inputs).
Grading: the grader's `question` is the follow-up WITH its true parent (`questionForGrader`), because the
interviewer did ask it — the measurement is whether a wrong parent line makes the answer wrong or off-topic
relative to the real question, against an arm A that has no context at all. Reported separately; their wrong
and off-topic counts enter clauses 1 and 2; they do not enter clause 5.

## 4. Model and settings

The shipped front model after flight h40c (2026-09-29 13:30, the same rule as the cue bench):

| h40c verdict | model and thinking | matches the s50m control arms |
|---|---|---|
| PASS (hedge becomes default; 3.5-lite HIGH is the front leg) | `gemini-3.5-flash-lite`, thinkingLevel HIGH | `captured-high`, `-r2`, `-r3` |
| FAIL, VOID or INCOMPLETE | `gemini-3.1-flash-lite`, thinkingLevel LOW | `captured-low`, `-r2`, `-r3` |

Request shape exactly as `interview60.answers.mjs` sends a captured prompt: `contents = [{ role: 'user',
parts: [{ text: user }] }]`, `systemInstruction = { parts: [{ text: system }] }`, `generationConfig =
{ temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel } }`, SSE streaming
(`streamGenerateContent?alt=sse`), the shipped filter chain (`filterCodeFences → filterVerbalLines →
stripSuggestionBlock → stripSpokenNotation`) fed character by character, records `spoken, words, ttft, total,
finish, rawLen, raw, thoughts`. A 429/5xx is retried up to 4 times and never scored as a model failure; an
item still missing after retries is an incomplete pair and leaves the decision (reported by name).

3 reps per arm. **Interleaving for fair timing:** the runner walks the 16 items in a fixed order; for each
item and rep r it issues the two arms back to back, A then B when (itemIndex + r) is even, B then A when odd,
with the same fixed pause between all calls. So every paired difference is measured minutes apart, not
hours, and time-of-day drift (measured today on the previous replay: rep p50s 4.3-6.1 s on identical prompts)
cancels in the pair. The runner is a scratchpad script (`followup-questions-run.mjs`, a copy of
`answerStreamedGemini` from `interview60.answers.mjs` that reads `s50m-gated.json` and writes
`interview60.answers.<model>_fquestions-<arm>-r<rep>.json`); it must pass a `--dry-run` (prints the call
order and byte counts, makes no call) before the first request. The key is read in-process from MAIN's `.env`
by the same regex the answers pass uses and never printed.

## 5. Grading

Blind, paired: per item the six answers shuffled under anonymous keys (§1). Each pairs file is graded by TWO
Opus agents independently (`claude-opus-5-5`, verified in transcripts), frozen rubric. Per answer and grader,
`verdictOf` gives wrong/acceptable/weak from `{correctness, on_topic, delivery}`.

Consensus definitions (both graders): **wrong** = both `correctness = 0`; **off-topic** = both
`on_topic ≤ 1`; **acceptable** = both graders' `verdictOf` = acceptable. Either-grader and mean-of-graders
counts are reported beside them, never decided on. Follow-ups are graded WITH their parent in the `question`
field; the two mains (S1Q08, S2Q08) are graded as the standard judge grades mains (bare), the same for both
arms.

## 6. Preconditions (before any model call)

1. h40c's verdict is known and the model row of §4 is fixed and written into the run log.
2. Calibration: `followup-replay-build.mjs --calibrate` against s50m's 39 prompts prints
   `CALIBRATION OK 39/39` (flag-off rebuild reproduces every captured prompt byte for byte), and with
   `REPLAY_BREAK=1` it prints a MISMATCH (the check can fail). This builder imports MAIN's `dist-electron`
   (the cleaner, the pinning, `withParentExchange`), so it must be run BEFORE cue mode is merged into MAIN
   (planned Thu 2026-10-01) or re-passed after the merge; if the merged build no longer reproduces the
   pre-cue prompts, run it against a dist compiled at 0e1e8b2 (a worktree checkout) — arm B's own bytes are a
   marker insertion into captured bytes and never depend on `dist-electron`. Never skip the step.
3. The gate list of §2, the callbacks of §3 and the dropped-parent cases of §3b are recorded (this file);
   `stamp.mjs` prints `ARMS OK`, `PARITY FIXTURE OK: 48 entries`, its corrupted-input line, and the four
   sha256 values of §2.
4. `decide()` passes its synthetic calibration for every branch of §7.
5. Quota (§8) and day rule hold; the ledger line is pasted into the run log.

## 7. Decision rule — fixed order, the user's worries first

Computed over the 16 items × 3 reps = 48 (item, rep) pairs where both arms have an answer (an incomplete pair
is excluded and named). "Roster pairs" = the 7 roster items × 3 = 21; "callback pairs" = 18;
"dropped-parent pairs" = 9.

1. **No new wrong answers.** consensus-wrong(B) ≤ consensus-wrong(A) over ALL 48 pairs — callbacks and
   dropped-parent cases included. Otherwise **FAIL**, whatever follows.
2. **No rise in off-topic answers.** consensus-off-topic(B) ≤ consensus-off-topic(A) over all 48 pairs. An
   answer that answers an earlier question instead of the current one is off-topic by the rubric's own
   definition (on_topic 0/1) and counts here. Otherwise **FAIL**.
3. **Not later.** First-token time, paired (B − A, same item and rep, interleaved), n = 48:
   - 3a. median of paired differences ≤ +500 ms → holds; > +1000 ms → **FAIL**; in between → INCONCLUSIVE.
   - 3b. p90 of B's TTFT ≤ p90 of A's TTFT + 2000 ms → holds; otherwise → INCONCLUSIVE (a p90 of 48 values is
     one Google-side stall: h40b had five 13.6-29.9 s stalls in an hour).
   - 3c. answers with TTFT > 10 s (the app's stall bar): count(B) ≤ count(A) + 3 → holds (2 per 39 pairs,
     pro rata rounded up); otherwise **FAIL**.
   Percentiles: element `min(n-1, floor(n·p))` of the ascending list (h40c's method).
   Justification: the block adds ≤ 250 tokens to a ~5,500-token request, an expected prefill cost under
   100 ms; the measured noise on IDENTICAL prompts (previous replay, six files) is a paired-median TTFT
   difference of −1.7 to +2.0 s between reps run hours apart, and +389 ms for a ~600-char heavier arm. With
   interleaving the drift cancels; the standard error of a median of 48 paired differences whose spread is
   ~1.5 s is ≈ 0.3 s, so +500 ms passes a real +100 ms effect with margin and +1000 ms fails a real one-
   second slowdown. Raw p50/p90 per arm are reported beside the rule.
4. **Not longer.** median of paired word differences (B − A) ≤ +5 → holds; > +10 → **FAIL**; in between →
   INCONCLUSIVE. Justification: on identical prompts the rep-to-rep paired median moved 0 to −8 words; the
   6c50ec3 arm (a whole previous answer in the prompt) added +9 to +11 per rep, the inflation this design
   must not reproduce. B's and A's words p50 are reported.
5. **Gain, roster pairs only (21).** Δ = consensus-acceptable(B) − consensus-acceptable(A):
   Δ ≥ +4 → **PASS**; Δ ≤ +1 → **FAIL** (the block does not buy enough to carry any risk); +2 or +3 →
   **INCONCLUSIVE**. Noise floor: ±4 acceptable on 38 items between two samples of the identical prompt ≈
   ±2 on 21; +4 is twice that.

Outcome: FAIL on any FAIL clause; PASS only when 1, 2, 3a, 3b, 3c, 4 hold and 5 reads PASS; INCONCLUSIVE
otherwise. **One pooled re-run is allowed** on s50l (`interview60.runs/2026-09-21T08-22-34-s50l`), after the
quota resets, with the gate list recomputed on s50l's captured prompts and recorded BEFORE its calls (same
reference files, same hashes), the six callbacks placed at the same slot ids; the pooled result over both
runs is read by the same rule over the pooled pairs. Clauses 1, 2, 3a, 3b and 4 are unchanged (they are
counts compared between arms, or medians). Clause 3c's allowance is 2 per 39 pairs, pro rata rounded up.
Clause 5's bars scale with the pooled roster pairs: PASS at Δ ≥ 4/21 of them and FAIL at Δ ≤ 1/21 of them,
both rounded up (for 42 pooled roster pairs: PASS ≥ +8, FAIL ≤ +2). A second INCONCLUSIVE is a FAIL.

## 8. Budget, quota, day

- Requests: 16 items × 3 reps × 2 arms = 96, plus retries; plan 120 on the chosen lite model. Grading: 4
  files × 2 graders = 8 Opus agents.
- Quota rule: the lite models have 500 requests/model/day, reset 10:00 local. Run only after 10:00 local on a
  day with NO flight and NO cue bench (2026-09-29 is h40c; 2026-09-30 is the cue bench day) and only after
  h40c's verdict fixes the model — so the earliest day is Thursday 2026-10-01, at the user's call. Before the
  first call the quota ledger (`quota-ledger.mjs`, adapted to that day's run folders) must show ≥ 150 headroom
  on the chosen model; otherwise wait for the reset.
- Sequencing: on that Thursday the replay's calibration (§6 item 2) must run before cue mode is merged into
  MAIN, or be re-passed after the merge as §6 says. The scenario50 flight a PASS licenses comes after cue
  mode's validation hour (one variable per flight), so its twins will carry cues; see §11.
- No holdout40 file is read or written by any step.

## 9. Evidence kept

In a scratchpad folder `followup-questions/`, then copied by the controller into
`passes/<date>-followup-questions/` after the freeze: `prompts.A.json`, `prompts.B.json` (from
`s50m-gated.json`), `parity-fixture.json`, the six answer files, the four `blind/pairs.blind-N.json` and
`blind/key.blind-N.json`, `blind/verdicts.blind-N.<grader>.json` (two per file), `RESULT.txt` (the `decide()`
output verbatim), the grader model ids and rubric stamp, the run log with the calibration, stamp and quota
lines, and this pre-registration's recorded mtime. The result note
`passes/<date>-followup-questions-result.md` applies §7 verbatim and lists per-item verdicts in the `wYY`
notation of the previous result, with the callbacks and the dropped-parent cases in their own tables.

## 10. What each outcome licenses

- **PASS**: build the design behind `NATIVELY_EARLIER_QUESTIONS` in MAIN after h40c, TDD as listed in the
  design §10, with the parity test of §2 green; then its own pre-registered flight on scenario50 (S1+S2, flag
  ON, judged against the s50m/s50l in-app bands and the captured twins, zero wrong among the gated items as a
  clause); holdout40 only after that flight passes, and never as a tuning target. A PASS here is not a ship
  decision.
- **FAIL**: the flag is never built; the design is re-examined against the per-item verdicts (which items
  went wrong or off-topic, and what the block contained) — and any change is a new pre-registration.
- **INCONCLUSIVE**: the one pooled re-run of §7; nothing is built before it.

## 11. Not covered

- The effect on holdout40's five parentless follow-ups (R02F R04F R09F R11F R13F): a holdout is measured only
  after a scenario50 flight, and never tuned on.
- Gate misses (S2Q06F's "Extended to", S5Q04F-like questions): they get today's prompt; the replay measures
  the gated set, not recall.
- Questions the app never answered: the three dropped-parent cases (§3b) measure the wrong-parent line on
  three follow-ups; other shapes of it (a held question resolved late, a parent lost mid-sentence) are not
  in this material.
- The Live-ear paraphrase pinned as the current question (a "regarding … discussed previously" rendering):
  no s50m capture has one on a gated item.
- In-app latency: the replay times the request, not the app's gate (its `ms=` diag field is read in the
  flight).
- Cue mode: these are pre-cue s50m prompts (0e1e8b2's prompt shape). The scenario50 flight a PASS licenses
  comes after cue mode's validation hour and its twins will carry cues, so the block's behaviour beside a cue
  block is measured there, not here.
- Holdout bias: the three holdout sentences quoted in the brief were seen during design; any later holdout
  reading of R02F, R09F and R11F must say so.
