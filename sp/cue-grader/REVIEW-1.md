# REVIEW-1: SPEC-cue-grader.md

Reviewer: Opus 5.5 (claude-opus-5-5), fresh subagent, 2026-10-07. Read-only: no code, no model calls, no git. No question, answer or cue text was printed; only counts and file shapes were read.

## Verdict: CHANGES

The rubric, the blinding and the holdout discipline are sound. Two things block it:
- The launcher reuse it states cannot run as written (B1).
- The reading table has overlapping rows with no precedence (B2).

Six further changes are needed before approval. Budget can drop from 22 to 16 sessions (cap 26) without weakening the reading.

## What I checked against the real files

| Claim | Checked | Result |
|--|--|--|
| `IntelligenceEngine.ts:472-474` logs `t.cues` after `trimCues` | MAIN source | TRUE |
| `interview60.answers.mjs:201`: arm `cues` are raw (stripCueBlock callback, no trim) | MAIN source | TRUE |
| r1 `[Answer] cues:` = 49, h40d = 47 | Grep count | TRUE |
| r1 router: 27 shown=pipeline, 22 shown=live | Grep count | TRUE (plus 2 `shown=-` on `turn=-` lines) |
| Raw arm blocks over the 3×5 limit | node, counts only | r1 HIGH 3/31; h40d HIGH 2/33; h40d captured-high 1/44. Trim matters for a handful only |
| `launch-grader-rd.mjs` "reused by import, never edited" | source | NOT AS STATED (B1) |
| Calibration base `2026-10-01T02-37-41-cuesmoke` | whole-turn worktree | Exists. 22 cue lines, 22 full lines, no judge pairs, no answer grades (I3) |

## Blocking

**B1. §5:146 + §5:154. Dropping the alias probe conflicts with importing the rd gate unchanged.**
- `probeGate()` (`launch-grader-rd.mjs:109-116`) hard-requires `cwdprobe-3` (the alias read) to be clean. Every real launch is refused without it (`:234`).
- Probe records are also checked against `LAUNCHER_SHA12` of the rd launcher (`:92`). Logs go to router-default's folder unless `RD_LOG_DIR` is set, and that seam only works under CAL (`:31-35`).
- `main()` cannot be reused either:
  - its tags are fixed (`blind-N.gX | inapp | high | low | captured-high`);
  - it needs a run folder;
  - it runs `A.dispatchProblem` against the flight dispatch.
- `verdictFileProblem` (`:120`) is not exported, and it checks `correctness/on_topic/delivery`.
- **Fix:** state that the cue launcher is NEW. It imports only `FLAGS`, `pairsArgs` (with `rubric=` set to the cue rubric), `transcriptModels`, `modelMatchesPin` and `probeRecordProblem`. It composes its own gate: slots 1 and 2, `alias=false`, its own launcher sha, and logs in `LAB\`. The spec should also name the mutation tests that gate must fail on.

**B2. §6:160-164. The reading rows overlap and have no precedence.**
- "One failure axis explains ≥ 50% of the not-good blocks" will almost always hold when not-good is small. For example, with 67 blocks and 6 not-good, 3 sharing G ≤ 1 qualifies. So Keep-ON and Redesign can both be true.
- **Fix:** evaluate in a fixed order: Redesign (wrong / adds-error / empty) → Keep ON → axis-Redesign. Apply the axis clause only when good < 80% and not-good ≥ 5 blocks.
- **Fix:** state the rule when h40d is not run (r1 agreement < 75%, §4.2:128): r1 alone (n ≈ 23) gives no reading, only counts.
- **Fix:** write the count bars as functions of the final n (wrong ≤ floor(0.03·n)). Exclusions will move n.

## Important

**I1. §4.1:115. The router pattern is quoted wrong.**
- The log line is `[Router] turn=N … shown=x`, not `[Router] turn turn=N`. A regex taken from the spec matches 0 lines (I ran it).
- **Fix:** correct the text. The builder's 27/22/0 known-case check would catch it, but the spec is the source the builder reads.

**I2. §1.1:19-23 + §3.2:84. Two real display failures are not anchored, and the "too long" plant tests one that cannot occur.**
- `trimCues` CUTS a > 5-word line mid-phrase (the engine test has a line ending on "and"). It can also yield empty-string lines (`cleaned: ['**'] → ""`), and `CueBlock.tsx` still maps those to rows.
- **Fix, rubric:** add an explicit G 0 anchor for "cut mid-phrase / dangling". Define `""` lines: drop them before grading, count them, and treat an all-`""` block as `empty`.
- **Fix, plants:** over-limit is impossible on displayed blocks. Score it mechanically and replace the "too long" kind with "cut mid-phrase by trimCues" (4 plants, expected weak).

**I3. §3.1:70. The calibration base pool is thin and ungraded.**
- cuesmoke has 22 blocks and no answer grades. A "good" base whose answer is wrong poisons the good bar and the halo bar.
- `MAIN\…\interview60.runs\2026-10-06T01-12-56-eq` is scenario50 with cues on. It has 42 in-app `[Answer] cues:` lines, judge pairs and flight verdicts. Use its in-app blocks: they pair like h40d and are not affected by prompts.json.
- **Fix:** take bases only where the flight answer graded acceptable. Name eq as the primary pool and cuesmoke as the fallback. The s50m "--cues arms" named as the fallback do not exist under that name in MAIN's s50m folder.

**I4. §3.2:81 and :87. Two plants are under-specified.**
- **Halo:** "weak (K 0)" only follows if the planted false claim contradicts a cue line. If it touches a part no cue covers, K stays 2 and the derived verdict is good, so the label check fails for the wrong reason. Specify a contradiction of a cue line.
- **Off-question:** the donor block must not sit in the same file as its own base. Otherwise the grader sees one block twice.
- **Feasibility note:** 32 mutants over 16 bases in 3 files forces exactly 2 mutants per base, one in each other file. The one-line bases cannot host missing-part. The plant author needs this constraint written down.

**I5. §3.4:108. A revision is re-checked on the plants it was revised against.**
- **Fix:** require the 16 fresh plants to pass their own scaled bars separately. A pass on the reused 48 proves little.

**I6. §6 / §0. Only the rubric is frozen, not the reading.**
- **Fix:** record the spec's sha256 (§6 + §1.4) in `LAB\` and the pass record before the first real export. The launcher should refuse if it has changed, as it does for the rubric.

## Minor

- **§1.1:21 / §8:181.** The dist-vs-flown `trimCues` residual is checkable now. Diff `trimCues` in `electron/llm/verbalStreamFilter.ts` between the h40d build (2b0906f line), the r1 build and the dist. If they are identical, close the risk.
- **§4.1:121.** The 0.70 content-check threshold was calibrated on r1 known cases (diag38: RH04 fail, RH08/RE01 pass). Applying it to h40d is mechanical, not tuning. Say so.
- **§2:59.** Present the question, then the cues, then the answer. Ask for R/C/G and V before K (a soft halo control at no cost).
- **§4.3:131.** Worse-of-two inflates `wrong` against the ≤ 2 bar. The "rests on contested" line covers it; keep that line mandatory in the verdict sentence.
- **§3.4:104.** Two Opus graders with one prompt share blind spots, so agreement is reliability, not validity. Add one sentence to §8.
- **§6:158.** r1 excludes 22 Live-shown turns. Report the share of displayed turns that carried a cue block at all: under router-default, many shown answers have no cue.
- **§4.1:115.** r1 and h40d are different builds (d83fdfe lands between them). Pooling is fine, but print per-run beside the pooled figure (already partly stated) and name both builds.

## Answers to the review questions

1. **Rubric.** It grades what the user sees: R, C, G, V and K, with C judged against the domain and not against the answer. That is right. The scales are anchored apart from I2.
2. **Blinding.** It holds. Showing the full answer is justified: K needs it, and it is the real reading situation. Halo is tested in both directions: halo plants (drag down) and filler plants with a good answer (lift up).
3. **Calibration.**
   - The material is scenario50 only. That is correct.
   - The bars catch a rate-everything-good grader (catch 0/24) and a rate-everything-wrong grader (good bar).
   - The bars are justified in the table.
   - Needs I3–I5.
4. **Extraction.**
   - The join goes by content and time, not prompts.json. That is correct.
   - Live turns are excluded. That is correct.
   - Arms are trimmed by the shipped `trimCues`. That is correct.
   - Needs I1 and the `""`-line rule (I2).
5. **Holdout.** It is never used to tune. The rubric is frozen and sha-gated before h40d, and R33 is read-only. Add the I6 freeze.
6. **Budget.** It can be smaller (see below).
7. **Thresholds.** They are reasonable as a direction at n ≈ 67: a 95% interval on 80% is about ±10 pp, and §8 says so. They are written before data. Fix B2 and I6.

## Budget: 16 planned, cap 26 (from 22 / 32)

| Step | Spec | Proposed | Why |
|--|--|--|--|
| Probes | 2 | 2 | cwdprobe-1, -2 pinned; alias dropped (needs B1) |
| Calibration | 6 | 6 | 3 files are forced by the base/mutant split; the agreement bar needs 2 graders |
| r1 | 6 | 4 | in-app (23) 1 file × 2 graders; bare HIGH and bare LOW 1 grader each |
| h40d | 8 | 4 | in-app (44) 1 file × 2; bare HIGH and bare LOW 1 grader each; captured-high dropped |
| Contingency | +10 | +10 | unchanged |

- **Why the arms can take 1 grader:** the reading uses in-app only (§6:158), and arms are "reported beside". rd already graded high, low and captured-high with 1 grader each (`launch-grader-rd.mjs:197`).
- **Why per-source files are fine:** each file then trivially holds one block per id. A single source per file removes cross-source style contrast inside a session.
- **What is lost:** arm numbers carry no second-grader check. Say so beside them.

## The author's open questions

1. **Grade h40d captured-high reps 2–3 (+4 sessions)?** NO. Also drop rep 1:
   - It replays the in-app prompt, so it is a second sample of the in-app cues that feeds no reading row.
   - Its ids depend on the B1-affected capture pairing (a content-filtered subset).
   - It costs 1–2 sessions at 74% weekly usage.
2. **Drop the alias probe?**
   - **What it is:** `cwdprobe-3` launches one `claude -p` with `--model opus` (no `--model-id`). It reads which concrete model the alias resolves to today, for the global rule "confirm what each alias resolves to when a new model is announced". It is reported only and decides nothing.
   - **Safe to drop:** YES. Every grader is pinned to `claude-opus-5-5`, and the pin is re-read from each transcript. That gate, not the alias, protects grading, and no new model has been announced.
   - **Condition:** only if the cue launcher's gate is rewritten not to require it (B1). Importing `probeGate` unchanged would refuse every launch.
3. **Cue-only second pass (§2:64, §8:174)?** NOT NEEDED. The halo plants cover the risk the pass would measure. If real-data bleed must be measured, use 1 extra session: r1 in-app (23 blocks) graded cue-only for R/C/G, compared with the with-answer grades. Do not run a doubled pass.
