# router40 harness review (spec compliance + quality)

Reviewer: Opus, fresh session, 2026-10-05 22:31–22:45 TST (`date`). **Read-only**: no file under `R40\` was executed, no model
call was made, no key, prompt or answer text was printed. Calibration outputs (`cal-out\`) were read, not re-run.
Requirements read: registration (seal `2d38dd89…`), A1–A7 (later wins), `USER-RULINGS.txt` (incl. the 22:30 controller line).

## Verdict

**No Critical finding. Nothing found invalidates tonight's `runs\` outputs.** Two Important findings, both in the
read/score side, fixable tomorrow before `build-blind-r40.mjs` runs. The rest are Minor.

- **L (`router40-L`) finished 22:39, COMPLETE, 47 answers, 0 holes, 48 requests** (console). What it sent matches the
  registration: the A1.4 builder byte for byte (P4a known answer), the s50k system prompt, `gemini-3.1-flash-lite` on
  `v1alpha`, `thinkingLevel: 'LOW'`, temperature 0.4, maxOutputTokens 65536. It records TTFT, words and
  `modelVersion` honestly.
- **Schedule risk (not a harness defect).** The 22:30 controller line reversed A7 m4's order to L → R smoke → R full.
  R full's start check needs now + 29.22 min (`remainingR`, cal E3) < 23:15, so **R full must start by 22:45:47**.
  Started later, it refuses with exit 3 and writes nothing. That makes R INCOMPLETE, and re-running it needs a dated
  amendment (A5.1). The order change is also only a USER-RULINGS line, not an amendment (the registration's "a change
  before data is a dated amendment"). It does not change any measurement.

| piece | SPEC | QUALITY | findings |
|---|---|---|---|
| P9 `pre-run-r40.mjs` | PASS | APPROVE | m1 m2 m3 |
| P4 `lite-l.mjs` | PASS | APPROVE | m4 m5 m6 m7 |
| P2 `run-r.mjs` (+ `mock-session-r.mjs`, `dry-check-r.mjs`) | PASS | APPROVE | m8 |
| P3 `read-r.mjs` | **FAIL** (T and `cut` are not bounded by itemDone) | CHANGES | **I1**, m9 |
| P5 `grade\build-blind-r40.mjs` | PASS | APPROVE | m10 m11 |
| P6 `grade\launch-grader-r40.mjs` | PASS | APPROVE | — |
| P7 `grade\audit-r40.mjs` | PASS | APPROVE | (see I2: nothing consumes its verdict) |
| P8 `grade\score-r40.mjs` | **FAIL** (row 1's "grading INCOMPLETE" ignores the P7 audits) | CHANGES | **I2**, m12 m13 m14 m15 |
| P1 `l38base-dispatch.txt` | PASS (byte-identical to Appendix B: 2,048 chars, LF) | APPROVE | — |
| `r40-common.mjs` | PASS (BLOCK_B and R_SYSTEM sha-checked at runtime; THINKING_LEVEL 'LOW') | APPROVE | — |

## The hardest questions, answered

1. **Does lite-l send exactly the registered prompt, model and thinking level, and record ttft, words and model
   honestly?** Yes.
   - `build()` (`lite-l.mjs:20-22`) is A1.4's formula verbatim. `promptFor` (`:25-35`) carries the chain history: the
     interviewer line, then `[ASSISTANT]: <spoken lowercased>` with a preview per earlier turn; an earlier turn with
     no answer leaves only its interviewer line and sets `orphan`.
   - The system prompt is `loadCaptured().system`; its sha and the CONTEXT sha are checked by P9 drift at L's start
     (`pre-run-r40.mjs:283-287`). The filter chain matches `interview60.answers.mjs:201`, fed one character at a time.
   - URL, body and GEN match registration §3.4 + A6. The URL model segment is asserted before every fetch (`:203-204`).
   - TTFT runs from just before `fetch` to the first non-thought text (`:208, :61`).
   - `words` counts the filtered spoken text. `modelVersion` comes from the response and must start with the fixed id,
     else STOP (`:215`).
   - Caveat: TTFT is the successful attempt's only (RH03 tonight took 2 attempts); see m6.
2. **Does run-r use the sealed variant-B instruction and route per the reader's nine classes?** Yes.
   - A real run refuses any variant other than B (`run-r.mjs:24`). `buildRSystem('B')` throws unless BLOCK_B =
     `e11c2400…` and R_SYSTEM = `4571f563…` (`r40-common.mjs:77-89`). The run file records `rSystemSha256`.
   - Model `gemini-3.8-live` is asserted before connect. The connect config matches live40's.
   - L38R timing matches `l38r/run.mjs:25` and its loop exactly.
   - Retry and health STOP: one retry when abnormal and incomplete; 6 abnormal attempts or 3 consecutive bad chains
     stop the run.
   - run-r does not route: R's route is P3's class, applied in P5 and P8 (RL text only for `answer`).
3. **Does read-r classify per A3's cases?** Yes for all 20 A2.5/A3.2 cases, the extra negative controls and the
   live40-r1 known answer (cal 30/30). It deviates on one registered definition (I1).
4. **Does the blinding leak arm or id?** No id, arm or class string reaches a pairs file (`build-blind-r40.mjs:70`).
   The key sits in `grade\keyhold`, outside a grader's allowed paths (dontAsk + absolute rules + no `--add-dir`), and
   P7 flags any mention of `keyhold`/`key.json`. One structural tell is registered by design: L's `heard` equals the
   roster text, A's and RL's are Live transcriptions (m10).
5. **Does score-r40 compute every reading row per the registration?** Each row, walked against `decideReading`
   (`score-r40.mjs:21-27`) and `scoreAll`:
   - row 2: `AF_answered ≥ 1` (class AF and R `answer`) or `wrong_R > wrong_L`. Wrong = any grader correctness 0. R's
     grade is RL if `answer`, else L.
   - row 3: `acc_R ≤ acc_L − 3`. Acceptable = both graders c2 and o2; no answer is not acceptable.
   - row 4: `EASY_caught < 10`, `lead < 1000` or `M ≥ 3`, where lead = p50 L TTFT − p50 R Live first text on R's
     `answer` items. A null lead also reads BUYS NOTHING.
   - row 5: everything else.
   - ORACLE, the per-group quality, the misroute lists, latency (parallel and serial), health and test-retest match §5.
   - Gap: row 1's grading-INCOMPLETE leg (I2).
6. **Fail-open paths.** One in scoring (I2). The rest are Minor and fail open only in edge cases: m1 (known, A7 m3),
   m2, m3, m9, m13.

## Findings

### Important

**I1. `read-r.mjs:59-75`: T, `cut` and the abnormal-close test are not bounded by the item's `itemDone`.**
- What the spec says: registration §3.3 defines T as output "after its clipEnd **up to itemDone**", and A1.5 defines
  `cut` as no turn/generation complete "**before itemDone**".
- What the code does: `after = mine.slice(ci + 1)` runs to the next item's clipStart. Output, a turnComplete or a close
  that arrives in the 10 s gap after itemDone is still credited to the item.
- Effect: under L38R's 30 s no-output rule (live40 used 60 s), a late "Is there anything else…" turn after a finished
  answer would turn `answer` into `malformed` or `too-long`. A silent item whose session then closes abnormally reads
  `missing`, which inflates M (row 4). A capped turn completed in the gap reads as not `cut`.
- run-r's `answerFor`/`turnsFor` have the same unbounded scope, inherited from live40.
- live40-r1 check (read-only, 22:3x): the only post-itemDone events there are 30 chain-end `close(1000)`s, so the
  bound keeps P3b's 46/46.
- **Fix:** in `recordFromEvents`, let `di = mine.findIndex((e, j) => j > ci && e.kind === 'itemDone')`, and change
  line 59 to `after = mine.slice(ci + 1, di < 0 ? undefined : di)`.
  - At lines 71-74, take text from `ans.turns.slice(0, segs.length)` when `ans.turns.length >= segs.length`; use
    `ans.text` only when `ans.turns` is absent (live40).
  - A turn still open at itemDone is `cut` regardless, so late text appended to it changes nothing shown.
- Then re-run `cal-read-r.mjs` (P3a/P3b), and do it **before** `build-blind-r40.mjs`. P5 and P8 both call `readRun`;
  changing the reader between them makes P8 throw "R class is answer but no RL grade".
- **Affects grading/scoring tomorrow only.** The run file keeps every event with its `itemDone`, so tonight's `runs\`
  stays valid.

**I2. `score-r40.mjs:130-140, 157`: `complete.grading` ignores P7.**
- What the spec says (registration §6.1): a session that fails CLEAN/ABSENT/PINNED is re-graded once, and a second
  failure makes grading INCOMPLETE (row 1).
- What the code does: `gradingOk` only checks that the 8 verdict files exist and are valid on their keys. Verdicts from
  a NOT CLEAN, memory-LOADED or unpinned session are scored as complete.
  - `launch-grader-r40.mjs:133` only prints a reminder.
  - `audit-r40.mjs` writes no record that anything reads.
- **Fix:** give `audit-r40.mjs` `--record <grade\audits.jsonl>`, appending `{tag, session, clean, memory, pinned}` per
  session. In `loadReal`, for each `blind-N.gX`, the last record must be `clean && memory === 'ABSENT' && pinned`, and
  its session must match the last line for that slot in `grade\blind\launches.jsonl`; otherwise `gradingOk = false`.
- Add a cal case: 8 valid verdict files plus one NOT CLEAN audit → READING 1.
- **Affects scoring tomorrow only.**

### Minor

**P9 `pre-run-r40.mjs`**
- **m1** (`:71-75`): `readTasks()` uses `-ErrorAction SilentlyContinue`, so a cmdlet failure gives `[]` and the task
  checks pass (A7 m3, recorded, not adopted). Fix: `-ErrorAction Stop` on `Get-ScheduledTask`, and catch only "no
  task matched".
- **m2** (`:77-80, 258-260`): `Win32_Process.CommandLine` is null for elevated or other-user processes, so the
  harness/G-sitting argv checks cannot see them. Fix: report the count of node/pwsh processes with a null CommandLine
  as an INFO line (failing on it would false-positive).
- **m3** (`:247`): only `Running` refuses. A `Natively-*` task in `Queued` passes. Fix: `/^(running|queued)$/i`.

**P4 `lite-l.mjs`**
- **m4** (`:215-216`): the modelVersion STOP is tested before the retry rule. A 200 stream that carries only an error
  event (no modelVersion) STOPs L instead of being retried (§3.4). This fails closed; tonight every stream carried a
  valid modelVersion. Fix: STOP when `modelVersion != null && !startsWith(MODEL)`, or when it is null on a stream with
  a finishReason; otherwise apply the `apiError || !finish` retry first.
- **m5** (`:50-65`): after `done`, a final `data:` line without a trailing newline is never parsed. That would drop
  finishReason/usage and cause a spurious retry. It did not occur tonight (every record has `finish STOP`). Fix: parse
  the leftover `buf` once after the loop.
- **m6** (`:208, :235`): TTFT is the successful attempt's only; the failed attempt and its 8 s backoff are excluded
  (RH03 tonight, attempts 2). Fix: in the result note, list L items with `attempts > 1` beside the TTFT tables, or
  have P8 print them.
- **m7** (`:160-172`): the start line's "recorded same/none" is always printed, because `S.cap` is overwritten at
  line 161 before the print. Cosmetic; true tonight anyway (fresh file). Fix: `const recordedCap = S.cap` before line
  160, then print it.

**P2 `run-r.mjs`**
- **m8** (`:30, :38`): `--dry --name router40-R` without `--out-dir` writes a mock run, `complete: true`, into
  `R40\runs` under the graded name.
  - The real run would then refuse (file exists), so it fails closed.
  - P5 refuses dry runs, but P9 `readArmsComplete` (`pre-run-r40.mjs:191-194`) and P8 `loadReal` (`:157`) accept them.
  - No such file exists. Fix: refuse `--dry` without `--out-dir`; require `dry !== true` in both readers.

**P3 `read-r.mjs`**
- **m9** (`:62`): `abnormalCloseAfterClip` treats a close with an undefined code as normal; `run-r.mjs:307` treats it
  as abnormal. If that happens, a `missing` item reads `silent`, undercounting M (row 4 fails open). Fix:
  `e.kind === 'close' && e.code !== 1000`.
- Observation, no change: the registered row order puts `silent` before `early`, so an item answered entirely before
  clipEnd reads `silent`. Both show L, so only the confusion table moves.
- Observation, no change: a one-word mis-transcription of "hard" (e.g. "Heart.") reads `answer` per the text-only
  rule. Fix: list every `answer` with w ≤ 3 in the result note.

**P5 `build-blind-r40.mjs`**
- **m10** (`:50`): L's `heard` is the roster text (equal to the question for mains). A and RL carry Live transcriptions,
  so a grader can tell "text pipeline" from "Live". This is registered (§6.1) and answer style already differs. Fix:
  name it in the result note's "not covered"; changing it needs an amendment.
- **m11** (`:34`): only `variant === 'B'` is checked. Fix: also require
  `rRun.rSystemSha256 === REGISTERED.B.system`.

**P8 `score-r40.mjs`**
- **m12** (`:63-66`): `lead` takes the two p50s over different item sets when an `answer` item lacks one of the two
  times. None is missing tonight, since L has 0 holes. Fix: pair first —
  `const both = answered.filter(r => Number.isFinite(firstText.R[r.id]) && Number.isFinite(ttft.L[r.id]))`, then both
  p50s over `both`.
- **m13** (`:57, :105`): the l38base table is printed whenever `--l38base` is given, with no calibration status (§6.2:
  not 22/22 → UNCALIBRATED, not read). Fix: `check-classify-r40.mjs` writes `{calibrated, labels}`, and P8 prints
  "UNCALIBRATED" in the title when false.
- **m14** (`:157`): add `&& rRun.dry !== true` (see m8).
- **m15** (`:148`): health `closes` keys an object without `code` as `[object Object]`. Fix: `s.closed?.code ?? (typeof
  s.closed === 'string' ? s.closed : 'none')`.

## Effect on tonight's runs

| finding | invalidates `runs\`? |
|---|---|
| I1 | No. Reader-side: fix and re-calibrate before P5. |
| I2 | No. Scoring-side: add before P8. |
| m4, m5, m7 | No. L completed 47/47 with valid modelVersion and finish on every record. |
| m6 | No. Reporting: RH03's TTFT is its 2nd attempt. |
| m8, m14 | No. No dry file exists in `runs\`. |
| m1–m3 | No. Guard edge cases did not arise (the L run passed its guards with real readers). |
| others | No. |

## Not covered by this review

- No calibration was re-run (forbidden before 23:20). `cal-out\` was read as reported (all 9 pieces PASS; 1 SKIP each
  in P2/P4, the real-clock-inside-window cases).
- `mutation-check.mjs` and the `cal-*.mjs` drivers were skimmed, not line-reviewed.
- Not reviewed: FR's imported helpers beyond the functions used (`claudeArgs`, `probeArgs`, `ownFiles`,
  `verdictFileProblem`, `scan`); the real Live connect path (live40's code, diffed: only registered changes).
- R had not started when this was written, so R's real events were not read. Whether R full starts by 22:45:47 is open.
