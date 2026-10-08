# Amendment A5 to PREREGISTER-router40.md: router40 runs TONIGHT (pre-data)

Written **2026-10-05, begun 21:41 TST by `date`** (Opus, the registration's author). **No router40 model call has
been made; no datum exists.** The registration and A1–A4 are unedited. Precedence: **A5 > A4 > A3 > A2 > A1 > the
registration**; every rule A5 does not name stands.

**Read as (sha256, whole file):** registration `5b7daaee1ed6ce6661f1b2be4b00b581e8862d72ece6a463dc6d4f919b446057`;
A1 `132739e6e85f657cf9526a30e2e3fb10a241fcaf5c4aa83c3089d8cd1a11f8aa`; A2 `10d0ea591d7b7983fcface37d8f42a735bc2e3baa55c263c452c9fa1c3ccc821`;
A3 `a5332d1a963b34de724250167cf7ab147a892d26a13f6050eaeb14487b7b8040`; A4 `9adb82268e0a87b5516e88c8eaa6f9890f25b38ae03b9a74e47d2a1e097ccfd7`;
`USER-RULINGS.txt` `8e5e3b40c42919f0054f164d5fccb597ce91ba5ab0b0ac742e04f1aee68e487f`. The built harness
(`BUILD-REPORT.tail.md`, pieces dated 18:13–19:02) is read as it stands; A5.6 lists what in it must change.

**U2, the user's ruling (in chat, 2026-10-05 ~21:45 TST, relayed by the controller):** run router40 TONIGHT with
3.1-lite LOW ("backup 3.1's won't spend that many calls … we can do the 3.8 router now using 3.1 lite low").

**U3, the user's second ruling (in chat ~21:45, before any call, relayed):** the text model for medium/hard is
**gemini-3.1-flash-lite at thinking HIGH**, not LOW ("3.8 as ear and answer for easy ones, 3.1 lite high for medium and
hard ones"). U2's "3.1-lite LOW" is superseded by U3 (A5.7).

**K4, the controller's facts (relayed with U2):** the flight's arming ledger (`SP\quota-ledger-today.mjs`) counts
lite-model MENTIONS in the app's `natively_debug.log` and lists model-call files; at 21:41 it read 3.1-lite 12 /
3.5-lite 22 mentions. router40's calls never pass through the app log, so they cannot lower the flight's arming reading
(C2 is moot in that unit). Real 3.1-lite requests today ≈ < 20 (smoke + 1 n5 call) + router40 ≤ 60 + flight ≈ 270 <
500. The flight (flight-eq) arms later tonight; its T is not yet chosen and will be ≥ the router run's end + 30 min.

## 0. Resolutions

| item | ruling | where |
|---|---|---|
| A1.2 / A2.1 / A2.2 day split and date gates (R, L) | **SUPERSEDED**: R and L run tonight inside the window [2026-10-05 21:45, 23:15) local | A5.1 |
| L's thinking level (registration §3.4, every amendment) | **HIGH** (U3): L is a 3.1-lite HIGH arm, no longer the app's shipped LOW back leg | A5.7 |
| Order (A2.1) | **The R smoke (C02) first; then R full and L run concurrently** (different models, different quotas); A3.4 m6 narrows to "no second process of the same piece" | A5.1 |
| Deadline (A2.4 guard 4, A3.1) | **Tonight:** `deadline = min(23:15, T_any − 30 min)`; the guard's `est` becomes the arm's **remaining** estimate | A5.2 |
| F line (A2.3, A3.3) | **Not required tonight**; replaced by one fixed controller line `TONIGHT 2026-10-05: flight-eq not armed; G sitting none` | A5.3 |
| "User told" line (m8, A3.5 m2) | **Not required tonight** (U2 is the user's own ruling; nothing to tell); the tonight line takes its place | A5.3 |
| CAP' from the ledger (A1.3, A2.3) | **Tonight: CAP' = 60** (fixed, K4); the ledger is read and recorded, not a gate; `--cap 60` + the write-ahead counter stand | A5.4 |
| U window = 2026-10-06T07:00Z (A2.2) | **Tonight:** the quota day 2026-10-05T07:00Z (recorded) | A5.4 |
| 3.5-lite / full Flash | **0**, unchanged (L's four id pins, R's `gemini-3.8-live` assert) | — |
| Grading (A2.1, A2.2 `grade` gate) | **Tonight** after both arms are complete, if every launch passes A5.2 before 23:15; **otherwise tomorrow** under A2/A3's `grade` rules unchanged (≥ 2026-10-06 10:00, F line required) | A5.5 |
| Hand-off | `router40 3.1-lite requests sent: N` goes to the flight's controller for the arming record (quoted there), as soon as L ends | A5.4 |
| Not complete tonight | an arm not complete when its guard refuses is INCOMPLETE; nothing resumes without a dated amendment | A5.1 |

## A5.1 The window and the order

- **Window:** every R and L start, chain attempt and item requires **2026-10-05 21:45:00 ≤ now < 2026-10-05 23:15:00
  local** (and A5.2's deadline). Before 21:45 or from 23:15 on, R and L refuse; there is no 2026-10-06 window for R or
  L any more (A2.2's arm gates for R and L are withdrawn).
- **Order:** the R smoke (`--only C02 --name router40-R-smoke`) → then **R full (`router40-R`) and L
  (`lite-l.mjs`, 47 items) started together and run concurrently**. Why: at HIGH, L's realistic duration is ≈ 32 min
  (A5.2), so sequential L + smoke + R ≈ 63 min would not fit the 23:15 window from a ~22:05 start; in parallel the
  total is ≈ 4 + max(27, 32) ≈ 36 min, and the flight's T can be chosen sooner. R and L call different models on
  different quotas and share nothing but the key. **A3.4 m6 becomes:** no second process of the same piece (a
  `run-r.mjs` refuses another `run-r.mjs`; a `lite-l.mjs` another `lite-l.mjs`); a grader/classifier launch still
  refuses while any `run-r.mjs` or `lite-l.mjs` runs. Cost, named: L's TTFT is measured while R streams audio on the
  same machine and network (the effect is expected to be negligible; not measured).
- **Incomplete:** an arm whose guard refuses mid-run saves and exits INCOMPLETE (A2.4). L's counter and R's stopped-run
  naming (`router40-R-<hhmm>`, never graded, A2.1 m4) stand. Resuming L or re-running R on another day needs a dated
  amendment (the window above does not reopen).

## A5.2 The deadline and the estimate (tonight)

Before every L item, every R chain attempt (retries included) and every grader/classifier launch, the guard requires
`now + est < deadline`, with:
- `deadline = min(2026-10-05 23:15:00 local, T_any − 30 min)`, `T_any` = the earliest NextRunTime of any `Natively-*`
  task (this includes every `Natively-flight-eq*` task; none → no task bound);
- **`est` = the arm's remaining estimate** (replaces the per-chain / per-item est of A2.4 guard 4):
  - R: the current chain's worst-case est (A2.4: clips' seconds + 90 s per turn + 10 s per gap + 10 s) + for every
    later chain its realistic est (clips' seconds + 25 s per turn + 10 s per gap + 2 s; Σ over 31 chains ≈ live40's
    measured 26.6 min);
  - L: 120 s for the current item + 40 s for every later item (HIGH thinking, A5.7);
  - a grader or classifier launch: 25 min (FR's timeout), unchanged.
- A2.4's "R starts only if now + Σ of all 31 chains' worst-case est < deadline" is replaced by the same check with the
  remaining estimate above (the realistic sum for chains after the first).
- Every other A2.4/A3.4 guard stands: no `Natively-*` task Running, no electron.exe/tail.exe, no other router40
  harness process, the G-sitting process and `gsitting.log` checks (a missing log passes, as for `none today`; an
  open STEP or a matching process FAILs), input drift at each arm's start, the stub refusal in real runs.

## A5.3 The tonight line (replaces the F line and the told line for R and L)

- `USER-RULINGS.txt` must hold **exactly one** line whose trimmed text equals
  `TONIGHT 2026-10-05: flight-eq not armed; G sitting none` (ASCII; lines split on `/\r?\n/`, UTF-8; appended by the
  controller with node or `-Encoding utf8`). Zero, two, or a near-miss line beginning `TONIGHT ` that is not exactly
  this → FAIL for R and L.
- The line's "not armed" claim is not trusted alone: A5.2's `T_any` read before every chain and item refuses as soon as
  any `Natively-flight-eq*` task's NextRunTime is earlier than now + remaining est + 30 min, and "no `Natively-*` task
  Running" refuses while any flight task runs.
- Tonight the F line, its regex and the "user told" line are not read for R and L (they stay in force for tomorrow's
  grading, A5.5).

## A5.4 L tonight: cap, ledger, hand-off

- L's request carries `thinkingConfig: { thinkingLevel: 'HIGH' }` (A5.7); everything else in its request is
  registration §3.4's.
- **CAP' = 60** tonight; `lite-l.mjs --cap 60`; the write-ahead counter `runs\lite-quota.answers.jsonl`, the 3-attempt
  rule, the O_EXCL lock, the modelVersion STOP and the min(recorded, new) restart rule stand.
- P9 runs `quota-ledger-today.mjs` for the 2026-10-05T07:00Z quota day and **records** its 3.1-lite and 3.5-lite
  mention counts and its listed files in the run's console output; tonight it gates nothing (no U, F, LEDGER-OK or
  CAP' arithmetic). Reason: K4 — router40 requests are absent from the ledger's unit, and the real-request total
  (≈ 270 incl. router40's 60) is below 500.
- When L ends (complete or not), its last line `router40 3.1-lite requests sent: N` is given to the flight's controller,
  who quotes it in the arming record.

## A5.5 Grading

- **Tonight:** only after `router40-L` and `router40-R` are both complete; each of the 8 grader launches and the 2
  classifier launches passes A5.2 (deadline, est 25 min), the tonight line and the machine guards. A launch that would
  not pass → that grading waits for tomorrow.
- **Tomorrow:** A2.2/A3's `grade` rules unchanged (≥ 2026-10-06 10:00 local, the F line, the guards). Everything of
  §6 (one blind batch, 8 sessions, pinned id, no Bash, no `--add-dir`, ABSENT/PINNED/CLEAN, one re-grade) stands.

## A5.7 L at thinking HIGH (U3): what it changes against the registration

- **The arm:** registration §3 "L 3.1-lite LOW alone", §3.4's `thinkingLevel:'LOW'` ("the app's settings … the shipped
  level"), and every "LOW" naming L in A1–A4 read **HIGH**. Model, prompt, filters, temperature 0.4, maxOutputTokens
  65536, retries and cap are unchanged.
- **The comparison to the app:** the app's hedge back leg sends 3.1-lite at LOW (the shipped level). L is now a
  **3.1-lite HIGH arm, not the app's shipped back leg**: R's hard path and the L arm measure "3.8 Live + 3.1-lite HIGH"
  and "3.1-lite HIGH alone", and neither is the shipped pipeline's 3.1 leg. The readings (§7, A1–A4) are unchanged in
  form; a CANDIDATE reading would license a design whose text leg is 3.1-lite HIGH, and its quality/latency against the
  shipped LOW leg is not measured here.
- **Latency expectations:** A1.7 m2's "L TTFT p50 3–9 s (LOW)" is replaced by **"L TTFT p50 5–20 s at HIGH; no
  3.1-lite HIGH measurement on these prompts exists, so this range is a guess"**. Consequences: `lead ≥ 1 s` (row 4)
  becomes even more likely, so the coverage clause stays the binding one; L's per-attempt abort at 90 s may now fire
  on long answers (each abort is a counted attempt, at most 3 per item; holes are reported); the composed R first text
  on hard items moves later by the same amount.
- **Quality expectations:** §7's L expectations were written for LOW; at HIGH they may be higher, especially on the 11
  HARD standalone items. Recorded so a difference is not a surprise; no threshold moves.
- **Quota:** unchanged in count (one request per attempt, cap 60); thinking tokens do not change the request count.

## A5.6 What changes in the harness (code + cases); everything else stands

| piece | change | cases replaced → new known answers |
|---|---|---|
| `r40-common.mjs` | add `TONIGHT_START = 2026-10-05 21:45 local`, `TONIGHT_END = 2026-10-05 23:15 local`, `TONIGHT_QUOTA_START_ISO = '2026-10-05T07:00:00.000Z'`, `TONIGHT_LINE`; `GATE_START` (10-06 10:00) is kept for `grade` only | — |
| **P9** `pre-run-r40.mjs` | arms R and L: the date gate becomes the A5.1 window; the U-window row becomes "quota window is 2026-10-05T07:00Z" (recorded); the F-line rows and the told row are replaced for R and L by the tonight-line row; the ledger section records and does not gate, CAP' = 60; the deadline = A5.2 with `est` passed in by the caller (remaining). `grade`: tonight = A5.5 (both arms complete + A5.2 + the tonight line), tomorrow = unchanged | **Date, replaced:** `L 10-06 09:59 FAIL`, `L 10-05 19:00 FAIL`, `R 10-05 19:00 FAIL`, `L 10-06 10:01 → CAP' 60 PASS`, `clock 10-07 10:01 FAIL (U window)`, `R 10-07 10:01 FAIL` → **new:** `--arm L --now 2026-10-05T21:44` → FAIL; `--arm L --now 2026-10-05T22:00` + tonight line → PASS, CAP' 60, window 2026-10-05T07:00Z recorded; `--arm R --now 2026-10-05T22:00` + tonight line, est 31 min → PASS; `--arm R --now 2026-10-05T23:15` → FAIL; `--arm L --now 2026-10-05T23:14`, est 120 s → FAIL; `--arm R --now 2026-10-06T10:01` → FAIL; `--arm L --now 2026-10-06T00:30` → FAIL. **Grade:** `--arm grade --now 2026-10-05T22:30`, both arms complete, tonight line → PASS; same with L incomplete → FAIL; `--arm grade --now 2026-10-05T22:55` (est 25 min passes 23:15) → FAIL; `--arm grade --now 2026-10-06T09:59` → FAIL (kept); `--arm grade --now 2026-10-06T10:01` + valid F line → PASS. **F line → tonight line (R, L):** the F-line cases (none / wrong date / two / −5 / 501 / ASCII hyphens / CRLF / valid) and `--arm R, no F line → FAIL` stop applying to R and L and are kept only for tomorrow's `grade`; **new:** no tonight line → FAIL; the exact line → PASS; the exact line ending in CRLF → PASS; two tonight lines → FAIL; `TONIGHT 2026-10-06: flight-eq not armed; G sitting none` → FAIL; `TONIGHT 2026-10-05: flight-eq armed` (a near miss) → FAIL. **Told:** `the 17:58 line → PASS / without it → R FAIL` no longer applies to R tonight; **new:** R tonight with the tonight line and no told line → PASS. **Ledger/CAP':** the U/F/LEDGER-OK/CAP' cases (U 40/400/420, ledger exit 1, no count line, model-less answers file, LEDGER-OK variants) are not gates tonight and not run as such; **new:** stub ledger exit 1 tonight → L still PASS with the failure recorded; stub ledger text → its 3.1-lite and 3.5-lite mention counts appear in the output. **Flight task (A5.2):** stub `Natively-flight-eq` NextRunTime 23:00, now 22:00, remaining est 40 min → FAIL; NextRunTime 23:30, same → PASS; NextRunTime 23:30, now 22:30, est 40 min → FAIL (23:15 cap); a stub `Natively-flight-eq` Running → FAIL. **m6 narrowed (A5.1):** a stub process list with a `lite-l.mjs` node argv, `--arm R` → PASS (was FAIL); with another `run-r.mjs`, `--arm R` → FAIL; `--arm L` with a `run-r.mjs` → PASS; `--arm L` with another `lite-l.mjs` → FAIL; `--arm grade` with either → FAIL. Every other P9 case stands (machine, G sitting, drift, stub refusal in real mode: its example time becomes `--now 2026-10-05T22:00` → exit 2) |
| **P2** `run-r.mjs` (+ `dry-check-r.mjs`) | the guard is called with the remaining estimate (A5.2); the start check uses it; the stub base time default becomes `2026-10-05T22:00` | the A3.1 case is re-based: Σ-est fits at start at 22:00; a stub task list that, after chain 1, gains a `Natively-flight-eq` task whose NextRunTime puts now + remaining est + 30 min past it → exactly 1 chain runs, INCOMPLETE; **new:** a stub clock reaching 23:15 before chain k → chains 1..k−1 only; a stub clock before 21:45 → no chain starts (replaces "before 2026-10-06 10:00"); real mode with `--now 2026-10-05T22:00` → exit 2. Every other P2 case stands |
| **P4** `lite-l.mjs` | the pinned generation config's `thinkingLevel` becomes `'HIGH'` (U3, A5.7); the start guard is P9 tonight (no ledger gate, CAP' 60); the per-item guard is called with the remaining estimate (120 s + 40 s × later items) | **new (U3):** stub fetch capturing the request body → `generationConfig` = `{temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: {thinkingLevel: 'HIGH'}}` exactly, model `gemini-3.1-flash-lite`; a mutated copy with `'LOW'` → that case FAILs (known negative); every saved L record carries `thinking: 'HIGH'`. (m) re-based: a stub task list gaining a `Natively-flight-eq` task after item 2 whose NextRunTime fails A5.2 → exactly 2 items, INCOMPLETE; **new:** a stub clock reaching 23:15 before item k → items 1..k−1 only; a stub clock before 21:45 → no item asked (replaces "before 2026-10-06 10:00"); `--cap 60` with P9 tonight → runs at 60; real mode with `--now 2026-10-05T22:00` → exit 2. Every other P4 case stands |
| **P6** `launch-grader-r40.mjs` | its guard is P9 `grade` per A5.5 | **replaced:** "a stub clock before 2026-10-06 10:00 → REFUSED" → **new:** `2026-10-05T22:30` with both arms complete + tonight line → allowed (dry-run); with R incomplete → REFUSED; `2026-10-06T09:59` → REFUSED; real mode with `--now 2026-10-05T22:30` → exit 2. Every other P6 case stands |
| P1, P3, P5, P7, P8 | none | none |

All changed and new cases must pass before the first tonight call (A2/A3's rule: every case passes before use).

**Not covered:** none of A5.6's changes or cases exists yet; the realistic per-turn (25 s) and per-item (40 s at
HIGH) estimates are mine, from live40's 26.6 min and a guessed HIGH TTFT, not measured on this harness; 3.1-lite HIGH
has no measurement on these prompts (latency, abort rate at 90 s, quality); L is not the app's shipped LOW leg;
L's TTFT is measured concurrently with R's audio stream; K4's request
total is the controller's estimate; router40 now shares the 2026-10-05 quota day with the flight's own 3.1-lite traffic
(rate-limit contention is not possible while L runs, since the flight has not armed, but the day's total is shared);
A, L and R still come from two days (A 2026-10-03; L and R tonight) and two clocks.
sha256 (of every byte above this line): 7b8f78fd065e41a7060397f63df2c4611d400c24b812149e1e3f6c09ae2a9896
