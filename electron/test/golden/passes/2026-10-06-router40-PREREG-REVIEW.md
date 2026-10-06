VERDICT: APPROVE WITH FIXES

# Review of PREREGISTER-router40.md (fresh Opus reviewer, 2026-10-05, before any call)

**Seal verified.** sha256 of every byte above the seal line (incl. its preceding LF) = `2d38dd89a1bc0fd4e97943cbda07291939afd555db85c31472462bd51860c16f`. The file is LF and 38,271 bytes.

**Re-checked, all equal to the file:** all 24 §0 file hashes (sha256/16); filter `28d6c47b9da4fba6` (mtime 17:12:47); `graderPromptVersion` exists in MAIN's judge; CONTEXT `dd74bbde…3792` (3,545 chars); system `d2afcc1f…5a34` (16,223 chars); `INSTRUCTION + "\n\n" + CONTEXT` → sha12 `cb64434c6c44`, which equals live40-r1.json's `systemSha12`; L38R `LIVE_MODE` `e3c028af…f205`; BLOCK_A `c941c772…475b`, which differs from LIVE_MODE on line 4 only; BLOCK_B `e11c2400…9ad8`; R_SYSTEM A `e87db57f…4a2` (5,560 chars); R_SYSTEM B `4571f563…41c5`. Live40 grader figures (5/46 disagreements, 36 vs 41, 1 wrong) match `L40\grade\RESULT.md`.

**What I read.** I read captured prompts in-process only, and printed hashes, lengths, marker offsets and booleans. I printed no answer text. I made no model call and used no subagent. Scratch scripts are in my session scratchpad.

**My own measurements (used below):**
- **The §3.3 text rules on live40-r1's real answers** give 46 `answer` and RH14 `silent`. Max is 79 words, with 0 malformed and 0 over 80. live40 had 0 early outputs, 0 interrupted items and 0 multi-turn items.
- **S1Q02's captured user turn, by offset:**
  - `USER QUESTION:\n` ends at 3562 and `INTERVIEWER JUST SAID:` starts at 4379, so the gap is 817 chars.
  - Inside it: `DETECTED INTENT` + `ANSWER SHAPE` take **131 chars**. Then comes a **PREVIOUS RESPONSES block of 3 entries** (667 chars; each entry is 208 chars = `n. "` + 200 + `..."`).
- **3.1-lite LOW TTFT in `followup-turn\R` fturn arms** (n = 48, long captured follow-up prompts): p10 3.8 s, p50 8.6 s, p90 11.3 s.
- **3.1-lite mentions in a cuesmoke app log** (`quota-ledger-today.mjs`'s counting unit): 62 for 2026-09-30 and 58 for 2026-10-01 cuesmoke. Both logs have 0 3.1-lite usage lines.

---

## Critical

**C1. The default routing block (variant A) makes reading 4 near-certain. It is also justified by a wrong claim about the user's definition.**
- **The forecast.** The author expects `EASY_caught` ≈ 6 (range 2–12) against a bar of 10. L38R line 5 sends "an explanation" to hard, and 18 of the 20 EASY items are definitions or differences. So row 4 is the forecast before any data. A run whose answer is known spends up to 60 3.1-lite requests on the flight's quota day.
- **The wrong claim.** §3.1 says A's criterion is "the class the user named (one part, one fact, stands alone)". That is L38R's/l38base's class. The user's definition is in AGENDA l.661 (2026-10-03, roadmap step 3) and SET-draft §1, approved 18:35: "single concept, 30-60 words, general knowledge, no back-reference … Live decides in its OWN session with an 80-word cap + always-pipeline replace". That is variant B.
- **Fix, in §3.1:**
  - Make variant B the registered default: "**BLOCK, variant B (registered default)** … **BLOCK, variant A (only if the user picks it before any Live call)**". Swap "(registered default)" accordingly in §11 D1.
  - Replace "the class the user named (one part, one fact, stands alone)" with "L38R's class (one fact, a ≤ 5-word answer); the user's 2026-10-03 definition (SET-draft §1, AGENDA l.661) widens it to one concept answered in 30–60 words, which variant B states".
  - In §7's expectations, add: "Under B, RE18 contains 'your' (B's own hard token) and RE03 names no concept, so `EASY_caught` ≤ 18. RE06 (why), RE09/RE20 (when would you) and RE14 (X or Y) are outside B's literal 'what it is / does / differs' and may go hard. Expected 13–17."
  - This keeps the test informative: the bar of 10 sits inside the plausible range.

**C2. §4's arithmetic is in requests, but the flight's arming read may be in log mentions. In that unit router40 can push the flight under 372.**
- **The tools disagree.** flight-eq A1.1/b9 name `quota-ledger.mjs` for the arming read. That script is a 2026-09-26 h40b-specific script with a hard-coded run folder. A2.2's feasibility read used `quota-ledger-today.mjs`, whose app-log figure is lite *mentions*, "an UPPER bound on requests".
- **Mentions inflate the count.** A cuesmoke logged 58–62 3.1-lite mentions, while A2.2 assumes "≈ 10 per model" for a smoke.
- **In mention units it fails.** 500 − 2 smokes × ~60 − 1 (n5) − N(60) ≈ 319 < 372: no flight. Without router40 it is ≈ 379, which passes. In request units it passes: 500 − 60 − 2×10 − 1 = 419 ≥ 372.
- **Fix, in §4**, as a new bullet before "Gate at L's start":
  > "Before L, the flight's controller names the tool and the unit (requests or log mentions) of the arming read. The inequality is evaluated in that unit: `500 − U − N_router40 − S·2 − 1 ≥ 392`, where S = the per-smoke 3.1-lite count in that unit (measured on the latest cuesmoke log when the unit is mentions; 10 when it is requests), and 2 = the smoke plus its one allowed re-run. CAP' = min(60, the largest N that satisfies it). If CAP' < 52, there is no L tonight."
- **Fix, in the Hand-off bullet**, add: "N is added to the arming read in the arming tool's unit (1 request = 1 unit)."

## Important

**I1. §3.4's known answer describes what it removed wrongly, and it never exercised the PREVIOUS RESPONSES branch that the 16 follow-ups use.**
- The 817 chars are not "`DETECTED INTENT` + `ANSWER SHAPE`". They are those 131 chars plus a 3-entry PREVIOUS RESPONSES block (667 chars).
- I confirmed it: removing all 817 chars and building with no PREVIOUS block gives `true`. So the passing check exercised only the main-item shape.
- The app's block is also multi-entry, while the builder writes one entry.
- **Fix, in §3.4 and in P4 calibration (a):**
  > "(a) the builder on S1Q02, with only its intent region removed (`DETECTED INTENT` + `ANSWER SHAPE`, 131 chars) and its three captured PREVIOUS RESPONSES previews fed back in captured order, → `true`; +1 space → `false`; and the 817-char removal with no previews → `true`. The builder takes a list of previews (`n. "<preview>"`, one per earlier answer, each cut to 200 chars + `...`)."
  - Correct "intent region … 817 chars" to "intent region (131 chars); the 817 chars also held S1Q02's 3-entry PREVIOUS RESPONSES block".

**I2. R's reader (§3.3) has no class for three shapes that would show a fragment as Live's answer.**
- **The three shapes:**
  1. A turn cut off by the 90 s cap, or by an abnormal close after some post-clip output. Today that is `answer` with partial text, because `missing` needs "before any post-clip output".
  2. Early output: an answer begun before clipEnd. T keeps only the tail, yet the item is still classed.
  3. "hard" in a later turn, or after an answer, beyond the first 12 words.
- **Fix:** add these rows, in this order, before `too-long`:
  - "`cut` — the item's last output turn has no turnComplete/generationComplete before itemDone (cap, or a close after post-clip output) → L"
  - "`early` — ≥ 1 word of output transcription before clipEnd → L (a premature answer; live40: 0 of 46)"
- **Fix:** extend `malformed` with "OR the word 'hard' among the last 3 words of T, OR more than one completed turn of which a later one starts with 'hard'".
- **Fix:** add the matching cases to P3's synthetic file (17 cases).

**I3. P3's calibration is all synthetic. Add a real known answer (rule 8).**
- **Fix, P3 calibration (b):**
  > "`read-r.mjs` on `L40\runs\live40-r1.json`'s events, with the §3.3 rules and live40's own itemDone → 46 `answer` + RH14 `silent`, 0 malformed, max 79 words, and every T byte-equal to `live40-r1.answers.json`'s text, 46/46"
- I ran the text-rule half: 46 + 1, 0 malformed, 79. This also shows that the reader drops none of Live's real answers.

**I4. The counter refuses at the HARD CAP of 60, not at CAP'.**
- With U = 30, CAP' = 60. With U = 40, CAP' = 57, yet the script would still allow 60.
- **Fix, in §4 "Counter":**
  > "`lite-l.mjs` requires `--cap <CAP'>` as printed by P9; it refuses a missing cap or a cap > 60, records the cap in its answers file, and refuses at counter lines ≥ that cap. A restart reuses the recorded cap and never raises it."
- Add a matching P4 calibration: "`--cap 61` → exit 2; no `--cap` → exit 2".

**I5. The guards and the deadline are checked only when a piece starts. T can still land before 21:00.**
- A4.6 sets T = the first quarter-hour ≥ now + 45 min, never earlier than 19:30. The controller chooses T during router40's window. A running L or R cannot learn that the deadline has moved to T − 30 min. Nor can it see a flight smoke that starts mid-run.
- **Fix, in §8:**
  > "Before every L item and every R chain, the harness re-runs P9's machine checks: no `Natively-*` task Running, no electron.exe/tail.exe, and now < deadline. Here deadline = min(20:30, T_reg − 30 min), and T_reg = the earliest Next Run Time of any `Natively-*` scheduled task (`schtasks /query /fo csv`, names + times only). A FAIL saves and exits (arm INCOMPLETE, as at 20:30)."
- Add the P9 calibration: "a stub task list with Next Run 20:15 → deadline 19:45".

**I6. Row 2's `wrong_R > wrong_L` clause has a false-fail price that is unstated.**
- The flight's registration priced its bars; this one does not.
- At equal quality, with a per-item "any grader c = 0" rate of 1–2 % (live40: 1/46 overall, 0/20 on EASY), k ≈ 15 Live-answered items and independent arms, P(wrong_RL > wrong_L) ≈ **12 % (p = 1 %) to 20 % (p = 2 %)**.
- **Fix:** append to the noise caveat:
  > "Price of row 2's wrong clause at equal quality: ≈ 12–20 % (k ≈ 15, per-item wrong 1–2 %), accepted as the cost of holding wrong strictly; the bar does not move."
- The bar itself is fine. The user should see the price.

## Minor

- **m1. The clock sentence in §5.** Replace "both differences favour the pipeline in this table" with:
  > "the Live clock omits the ≈ 0.69 s tail (favours Live); the lite clock omits the gate (≈ 0.6 s) and the whole-turn hold (VAD 1.2 s + hold), which favour the pipeline by more; net, the measured lead is close to a lower bound of the in-app lead (not measured)."
- **m2. The L TTFT expectation in §7.** The registered 1.5–3.5 s has no data behind it. The last 48 measured 3.1-lite LOW TTFTs have p50 8.6 s (fturn arms, long prompts). Record "lead ≥ 1 s likely; the coverage clause is the binding one" so the reading is not a surprise.
- **m3. Two gaps in "Not covered".**
  - RH11 (parent RH09, after RH10) and RH14 (parent RH12, after RH13): the one-level shape drops the intervening turn that Live heard.
  - The composed R follow-ups after a Live-answered parent (up to 9; AF: EF02, EF07, RH02) are built on L's parent answer, not the one shown. No reading depends on this, because R and L share those texts.
- **m4. P4 seams (rule 7).**
  - Record the response's `modelVersion` per item; anything that is not `gemini-3.1-flash-lite*` → STOP (this proves 0 3.5-lite at the boundary).
  - Refuse a real run when `R40_FAKE_FETCH` or a counter-path override is set.
  - Take an O_EXCL lock file so two `lite-l` processes cannot both pass the cap check.
  - Specify restart as a resume: skip items that have an answer, never re-ask.
- **m5. The definition of U in §4 Gate.**
  - Exclude router40's own `lite-quota.answers.jsonl` from U; it is already counted against the cap.
  - Make "entries of any listed file that holds 3.1 calls" mechanical: for an answers file, count entries whose model is 3.1. For any other listed file outside R40, P9 FAILs and asks.
- **m6. P6 `--classify` (c3/c4) has no calibration.** FR's `ownFiles` accepts only `blind-N.gX`.
  - Add a dry-run known answer: the argv shows Read TURNS, Read CAL, Edit OUT; `claude-opus-5-5`; no Bash; no `--add-dir`.
  - Make P7 audit c3/c4 against those three paths.
  - §6.2 decides nothing, so it can be built after the flight.
- **m7. The slot lock.** Setting `TURN_GRADING_DIR` gives router40's graders a slot lock separate from the flight's. "Never interleaved" (§8) is then the only guard. P6 should refuse while any flight grader slot holds a live pid.
- **m8. The grading time in §8.** "all 10 sessions can start by 20:15" → "can finish by 20:30". Ten sessions at ≤ 2 at a time do not finish in 15 min.
- **m9. Divergence from SET-draft.** SET-draft §7 makes false EASY on the 27 HARD turns the primary reading, while §7 here gates only AF and outcomes. Add one sentence saying so and why: a false EASY costs only through wrong/acceptable, which rows 2–3 hold.
- **m10. The "20 margin" in §4** is attributed to the user, but I found no source in AGENDA or flight-eq. Cite the chat time, or call it the author's margin.

## The checks asked for

1. **Readings table.**
   - It is total: row 5 is the complement of rows 1–4. The order is sensible: incomplete, then safety, then quality, then benefit.
   - The quality bar is noise-justified. SD ≈ 1.7 matches my 1.64 for k = 15 at p = 0.1, and the false-fail of "≤ −3" is ≈ 6 %.
   - Wrong is strict and its price is unstated (I6).
   - Under variant A, row 4 is pre-judged (C1). Under B the test is informative.
2. **Cap and counter.**
   - Write-ahead plus refuse-at-cap is sound, but the cap must be CAP' (I4).
   - The counter cannot spend 3.5-lite: the model is a constant, `--model` is refused, there is a grep check, and m4 adds the `modelVersion` seam check.
   - The quota unit at arming is the open risk (C2).
3. **Fairness of the lite prompt.**
   - The shape is the app's. Graders grade the roster text, so the roster-text advantage is named.
   - The follow-up branch was not calibrated (I1). Third-in-chain items and composed-R parents are named gaps (m3).
   - It is reproducible through the per-item prompt sha12 and the recorded system/filter shas.
4. **R's fallbacks.** They are complete for one clean turn, and every one is checkable from transcript plus events. They are missing cut, early and late "hard" (I2).
5. **Grading recipe.**
   - It matches FR: `claudeArgs` gives Read pairs, Read rubric and Edit verdicts; slots `blind-N.gX` are accepted by `ownFiles`.
   - Files are whole items, with ≤ 36 answers each.
   - The checks are exit 0, `verdictFileProblem`, ABSENT, PINNED and CLEAN.
   - One residual: `heard` differs by arm (roster text vs STT), so a grader can tell L's answers apart from Live's. That is acceptable, because it keeps A comparable to live40.
6. **Harness pieces.**
   - Each has a known answer, except P6's classify mode (m6). P3 needs a real-data case (I3), and P4(a) is mis-aimed (I1).
   - The critical path (P9, P4, P2, P3) is buildable in ≈ 45–60 min with calibrations. That fits if the user answers by ≈ 18:15: L must start by 20:05 and R by 19:50.
   - P1 and P5–P8 can wait until after the flight; they use no Gemini quota.

## D1–D4

- **D1 — B.** It is the user's own 2026-10-03 router definition, with the 80-word cap. A forecasts reading 4 (≈ 6 caught against a bar of 10), so A would spend quota to confirm a known answer.
- **D2 — the default: 4 whole-item files × g1/g2 = 8 sessions.** Files stay at ≤ 36 answers, within the flight's tested 44. A 100–140-answer file has never been graded, and two grades per answer keeps live40's acceptable rule.
- **D3 — yes, with C2's condition.** The user's go-ahead is quoted in the flight's arming record, the controller names the arming tool's unit before L, and N is added in that unit. A2.2's sentence becomes false, so it is recorded, not edited. In requests the headroom holds: 500 − 60 − 2×10 − 1 = 419 ≥ 372. In mentions it may not, which is why the unit must be named.
- **D4 — ask the controller to register T ≥ 21:00 while router40 runs, and build I5's per-chain T read.** A4.6 lets T be as early as 19:30, and a running harness cannot otherwise see a T registered mid-run.

**Not shown:**
- I did not run the author's P-calibrations; no harness exists.
- The price in I6 assumes independent arms and binomial errors.
- C2's per-smoke mention count comes from two earlier cuesmoke logs, not tonight's smoke.
- Whether the flight controller arms by requests or by mentions is unknown to me; that is exactly what C2 asks them to state.
- B's ≤ 18 ceiling is my reading of its literal text, not a measurement.
