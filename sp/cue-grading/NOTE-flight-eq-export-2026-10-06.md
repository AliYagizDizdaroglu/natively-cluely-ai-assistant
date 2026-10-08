# Controller note, 2026-10-06 05:57 TST (`date`: `Tue Oct  6 05:53:56 TST 2026` at start): the eq export's INCOMPLETE line is the readiness probe's second answer

Written by the Opus author of a dated controller note for the cue-grading registration, **before any cue is graded,
classified or calibrated on FLT data, and before `cue-material-eq.mjs` reads the export.** Read-only apart from this
file and its `.sha256`. No model was called. No cue, answer, question or prompt text was printed or read into this
note. The export JSON was not opened. Text-dependent checks ran in-process and printed only booleans, ids and word
counts.

Inputs, sha256 as read:
- `C\PREREGISTER-cue-grading-rev7.md`: `b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39`
- `C\AMENDMENT-rev7-A1.md`: `6992393e7d6dba219698c14d47aa5878d7a1b4ac58323b086a480cdef870b593`
- `E\NOTE-b10-rev7-A1.md`: `2b6550a5d32a3bd88f1c63dd95d6d852648090777865a40d1a03af3b8be7e47b` (the launcher's `PASSES` line
  12 carries the same sha)
- `E\eq-cues-export.run.txt`: `18406488081bb0ac71d036cb110ba1ed3238e46ab50ac09257e594a195a411fa`
- `E\cues-export-eq.completeness.txt`: `acbba74d85a5a75cec4b900e5d7e3049231f4da4ec47785c11fb19cc6839ab23`
- `E\eq-flight-read.out.txt` (b5): `2e8b0b589318cf60a53de80975ce11c0d10ec858c8238aee3029776ea0d51681`
- `RUN\natively_debug.log`: `163584db6942b7ade2df314ea8550cb1ef9735bc852b65c7c51a81f3122dd380` (equal to the completeness
  file's `LOG` line)
- `RUN\interview60.timeline.json`: `f69287735ddabe8c3c0c7dac832e4cda92f1001380538180f0841251170ebffa`
- `MAIN\electron\test\golden\interview60.run.mjs`: sha256/16 `25bccb34a9b865de`, byte-identical to `git show 56bda9e:`
  (the flown HEAD)

`RUN` = `MAIN\electron\test\golden\interview60.runs\2026-10-06T01-12-56-eq`. `C\HASHES.txt` does not exist yet. This
note is not one of its registered inputs. It records a ruling on how the registered texts apply.

## 1. Finding

**The one unaddressed in-window cue line (`L386` cues, `L395` full) belongs to the harness's readiness probe. It is
the probe's second answer, delivered 4.212 s after `timeline.startedAt`. Its stream started 13.262 s before
`startedAt`, before any roster audio played. It is not a roster answer.**

Evidence (line numbers, timestamps, tags and counts only):

| Line | Time (Z) | vs `startedAt` | What |
|---|---|---|---|
| 229 | 00:03:37.274 | −36.163 s | first `[Main] SystemAudio->STT:`, so the probe audio starts |
| 261 | 00:03:43.151 | −30.286 s | `[IntelligenceEngine] … question: gate=no-cue … turn=1` (probe turn 1) |
| 284 / 291 | 00:03:54.406 / .513 | −19.031 s | probe turn 1 `[Answer] cues:` / `full:`, **outside** the window |
| 334–336 | 00:04:00.170–.175 | −13.262 s | whisper `dispatch` and `runWhatShouldISay`, **`turn=2`** |
| 346–347 | 00:04:00.699–.701 | | `[LLMHelper] … hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms` |
| 353 | 00:04:05.704 | | `[LLMHelper] … hedge: … 5003ms reason=trigger` (the front had stalled, so the back leg started) |
| — | 00:04:13.437 | 0 | `timeline.startedAt`: S1Q01 `playedAt` (startSec 0, clipSecs 12.4445) |
| 381 | 00:04:17.586 | +4.149 s | whisper `dispatch` of an S1Q01 fragment (5 words; a substring of S1Q01's scripted text). **No `runWhatShouldISay` follows it.** The whole-turn machine held it |
| 383–385 | 00:04:17.608–.646 | | `usage: thinking=LOW` (the 3.1-lite back leg), then `hedge: … other=aborted` |
| **386** | **00:04:17.649** | **+4.212 s** | **`[Answer] cues:`, inside the window, addressed by no entry** |
| 393 | 00:04:17.832 | | `[Answer] budget:` |
| 394, 396 | 00:04:17.834–.836 | | `[SessionTracker]` … `size: 2` (the session's second exchange) |
| **395** | **00:04:17.835** | **+4.398 s** | **`[Answer] full:`, the line b10's `EXPORT INCOMPLETE: L395` names** |
| 424 | 00:04:24.021 | | a second S1Q01 fragment `dispatch` (7 words, a substring of S1Q01). No run follows |
| 439–441 | 00:04:26.995–27.000 | +13.563 s | S1Q01's dispatch and **`turn=3`**. b5's first roster window is `WINDOW line 440 item S1Q01 … turn=3`, and the first `judge.pairs` `dispatchedAt` is 00:04:26.995Z |

Corroboration:
- **b5 reader:** `roster windows 40, short 0, STRAY 0`. The turns run 3 → 42 (S1Q01 … S2Q10F, "turn ids increasing
  (40 numeric)"). Turns 1 and 2 are the probe. b5 keys a window on its turn-start diag line. Turn 2's start (L336,
  −13.262 s) lies before the window, so b5 ignores it.
- **b10 keys on the answer line's own timestamp.** Turn 2's `cues`/`full` lines fall after `startedAt`, so b10 counts
  them. That one asymmetry gives 41 in-window cue lines and 41 full lines against 40 entries and 40 ids. It also gives
  `cueBlocks present 41` vs 40, which is the second token, `cueBlocks-count`.
- **The pairs:** `interview60.judge.pairs.json` holds 40 items on 40 ids, every `dispatchedAt` non-null, the earliest
  00:04:26.995Z. No pair belongs to the probe, which matches b10's "40 joined, 0 unjoined".
- **Text containment, booleans only:** the probe turn-2 dispatch question (L334, 12 words) is a substring of **no**
  roster item. L381 and L424 are substrings of S1Q01 only.

**Is this the start-up probe phrase? Yes.** `interview60.run.mjs` (the flown bytes): `auto()` runs `probe()`. After
five flash-lite 200s, `probe()` runs `preflight` as a child (`runPreflight`). `preflight` plays
`probe-continuous.wav` ("a 34s continuous probe", lines 385–394) through the output device. It then polls the debug
log once a second, for up to 20 s, until a `[Main] Live question (…)` line appears, and exits as soon as one does.
`auto()` then calls `appPass()` at once (line 561). `appPass()` writes `startedAt` at the hour's `PlaySync` (lines
432–437). **No step waits for the probe's answers to drain.** The probe audio starts about 36.2 s before `startedAt`
in both runs (h40d −36.384 s, tonight −36.163 s). The hour therefore starts about 2 s after the 34 s probe ends. Any
probe answer whose stream outlives that gap lands inside the window.

**Why h40d's two probe lines fell outside the window and tonight's second did not.** In h40d (`2026-10-02T11-39-41-h40d`,
window from 10:33:52.110Z) the probe's two answers came 4.4 s and 3.6 s after their Live questions. Their cue lines
were at −25.131 s (L268) and −8.137 s (L359), both before `startedAt`. That is the registered "the probe's 2 outside
the window", and A1's 44/1/2 holds: 2 before, 45 in the window = 44 entries + R29's superseded line. Tonight both
probe turns stalled on the hedge's front leg and hit the 5 s trigger (L277: 5007 ms; L353: 5003 ms). Turn 1 still
landed at −19.031 s. Turn 2 began at −13.262 s and took 17.479 s from its dispatch to its cues line (L334 → L386), so
it delivered at +4.212 s. The cause is answer latency on the probe's last turn against a window that opens about 2 s
after the probe audio ends. The roster, the reader and the exporter are not the cause.

## 2. Ruling

**What the registered texts decide:**
- (a) **The probe's lines are never FLT material.** Rev 7 §1F, "Not graded, named", lists "cue lines outside the run
  window (the readiness probe's)". An in-app entry's `id` must be a scenario50 S1/S2 roster id
  (`/^S[12]Q(0[1-9]|10)F?$/`). The forbidden list bans "any id outside the 40 S1+S2 ids". The probe has no roster id,
  no pairs entry and no correctness grade, so it cannot be an entry under any reading.
- (b) **This is not an export miss.** The registered INCOMPLETE rule and the FLT selection rule count **in-app roster
  ids**: "≤ 2 in-app ids named → … `export-missing`; > 2 → FLT VOID (export)", and FLT is "the FIRST eq hour … with an
  export that is COMPLETE or missing ≤ 2 in-app ids". Tonight 0 of 40 roster ids are missing (40 entries, 40 ids, 40
  joined). `L395` and `cueBlocks-count` are not ids. Neither rule makes this hour VOID, and this hour qualifies as FLT.

**What they do not decide.** The registration identifies the probe's lines by their position outside the window and
assumes they fall before it. Its checks then cannot place an in-window probe line:
- "every `[Answer] cues: ` line whose timestamp lies inside `window` is addressed by exactly one entry or named
  `superseded <logLine>`" refuses on L386.
- The `cueBlocks` reconciliation (present − named superseded = non-empty entries) refuses: 41 − 0 ≠ 40.
- The contract's last line is `EXPORT COMPLETE` or `EXPORT INCOMPLETE: <id>[,…]`, and tonight's tokens are not ids.

U3 (A1.3) does not apply. It governs a falsely named `superseded` line, and nothing tonight is named `superseded`
(`superseded 0`). Calling L386 superseded would be false: no later in-window line of the same id replaces it, so U3
itself would refuse it. A1.1's author note covers the analogous case, "the readiness probe's two lines fall inside
h40d's `window`". It sends that case to the user and settles it by a dated amendment, "never by editing the tool to
pass". **So the following is a controller ruling, not a registered decision.** Like every FLT step, it takes effect
only with the user's OK, which §7 step 4 already requires before any grader launches.

**Controller ruling (R1–R4):**
- **R1. Exclusion.** L386/L395 are the readiness probe's (turn 2). They are excluded from FLT as the registered "the
  readiness probe's" class. They are counted, and named by line number in the result note. **The material is the 40
  roster in-app entries** (one per S1/S2 id, all joined to pairs), plus the twins as registered.
- **R2. Not VOID, not `export-missing`.** No roster id is excluded. The INCOMPLETE ≤ 2 / > 2 rule is not triggered,
  per (b).
- **R3. Mechanism, by criterion and never by loosening a check.** An in-window `[Answer] cues: ` line counts as a
  **probe line** if and only if every one of these holds:
  1. Its stream's turn start lies **before** `window.startedAt`. The turn start is the last
     `[IntelligenceEngine] … question: gate=… turn=N` line before the cues line.
  2. Its turn number is lower than the first roster window's turn (b5: `turn=3`).
  3. No export entry addresses it.
  4. No `judge.pairs` `dispatchedAt` lies at or before its turn start.

  A roster line cannot meet criterion 1, because the first roster audio starts at `startedAt` (S1Q01, startSec 0).
  b10 names such a line `probe <logLine>` in the completeness file, one line each, and ends `EXPORT COMPLETE` when
  every roster id has its entry. This change reaches b10 through a dated flight-eq note under A2.5: re-calibrated,
  Opus-reviewed and re-recorded in `instruments.sha256.txt`. `cue-material-eq.mjs` accepts `probe <n>` lines only
  under the criterion above. Its addressing check becomes "addressed by exactly one entry, or named `superseded`, or
  named `probe`". Its `cueBlocks` reconciliation becomes present − superseded − probe = non-empty entries (tonight
  41 − 0 − 1 = 40). The registered checks are otherwise unchanged and refuse on any other mismatch. Calibration cases
  are written before the real export is read:
  - tonight's shape (a pre-window turn delivering after `startedAt`) → accept, probe 1
  - a line named `probe` whose turn starts inside the window → refuse
  - a line named `probe` that an entry addresses → refuse
  - h40d's run → unchanged 44 / superseded 1 / outside 2 / probe 0 (A1.1's known answer stands)

  Until both tools carry this, the consumer refuses tonight's export **as registered**. That refusal is correct, and
  no tool is edited to pass.
- **R4. Reported.** The result note names the probe line (L386/L395, turn 2, +4.212 s), names this note with its
  sha256, and states the harness cause in §1.

**Cost if this ruling is wrong:**
- **If L386 were a roster answer** after all, R1 drops one block, at most a double's second answer. Every one of the
  40 roster ids keeps its own entry, and S1Q01's is turn 3 at 00:04:26.995Z. FLT-INAPP's table allows "40 (+ a
  double's second answer)". The loss is ≤ 1 of ≤ 41 in-app blocks (≤ 2.4 %), and no roster id loses its first answer.
  The evidence against this case: the turn started 13.262 s before any roster audio, the tracker reads `size: 2`, the
  question matches no roster text, and S1Q01's fragment dispatches (L381, L424) started no run.
- **If the stricter reading is right** (the export is defective and FLT VOID), the cost of ruling otherwise is grading
  an hour that should have been void. That reading would void a complete 40/40 roster export over a non-roster line
  the registration itself puts outside the material. (b) rejects it on the registered texts.
- **R3's residual risk:** a criterion that is too loose could hide a real roster line. Criterion 1 cannot be met by
  any stream that starts at or after `startedAt`, and R3's refuse-cases test exactly that.

## 3. What the graders receive

These are the blind files `cue-material-eq.mjs` builds once R3 is in place and its checks pass, under neutral ids
(§3), with the frozen instruction files:
- **FLT-INAPP (gating):** 40 blocks, one per S1+S2 roster id, as logged (post-`trimCues`). The export reports
  `empties 0` for the in-app arm. Each block comes with its question (`judge.pairs`) and, in condition B, its pairs
  `answer` for the joined `dispatchedAt`.
- **FLT-TWINS-H (gating, pooled):** `captured-high` reps 1–3, 40 / 40 / 40 entries as exported, shown as
  `trimCues(cues, 3, 5).cues` from the FLT display pin, less any twin empties the consumer names.
- **FLT-TWINS-L (reported only):** `captured-low` reps 1–3, 40 / 40 / 40, the same form.
- **Never sent to any grader:** the probe's lines (L284/L291 outside the window; L386/L395 inside it, excluded by R1).
  They have no roster id and no pairs entry, so no probe text can enter a blind file.

## Not covered

- The export JSON was not opened. That no entry addresses L386 is inferred from b10's counts (40 entries, 40 ids,
  40 joined) and its token `L395`. The consumer's run under R3 checks it (refuse-case 3).
- Probe identity is shown by timing, turn number, tracker size, the absence of a pairs entry and roster-text
  non-containment. The probe's own scripted text was not compared: `probe-continuous.wav` has no text file read here.
- Twin empties per rep are not counted here. The consumer counts them.
- R3 is unbuilt and uncalibrated, and needs a dated flight-eq note plus an A2.5 rebuild of b10. Until then nothing
  is graded.
- Harness fix, out of scope and recorded here only: `auto()` has no drain between `preflight` and `appPass()`. The
  window opens about 2 s after the 34 s probe ends, so a probe answer that takes more than ~13 s from its last turn
  start lands in the window. A future flight would need a drain wait, or a window rule keyed on turn start, to avoid
  this.
