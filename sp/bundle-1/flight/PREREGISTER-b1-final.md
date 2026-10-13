# Pre-registration: b1-final — the reduced bundle's final flight (live40, router ON, attended)

- **Rev 3**, 2026-10-11: fixes `PREREG-REVIEW-2.md` (R-A, m1–m4) only.
- **Rev 2**, 2026-10-11 (Sun), by the Opus registration author. It fixes every finding of `PREREG-REVIEW.md` (on rev 1, sha256 `b04afd51…db640`): R1–R4 required, M1–M7 minor. Written **before any data of this flight exists**: no `b1-final` run folder, no grade.
- **Review.** A separate fresh Opus re-checks this revision; this author does not review itself.
- **Deadline missed.** SPEC §10 named Sat 2026-10-10 as the deadline; this is one day late, stated.
- **Authority.**
  - `SPEC-bundle-1.md` (sha256 `82ee583f…`) §10;
  - `AMENDMENT-A1-reduced-bundle.md` (`4089f6a5…`) §4 skeleton;
  - `USER-RULINGS.md` (`a2a5dbb5…`) items 1–8, plus item 9 when the user signs off (§3.3).
- **Rules of this file.**
  - It is sealed by its sha256 in the arming record.
  - After the run starts nothing here is edited; the result note applies it verbatim.
  - A change before data is a dated amendment at the end, never an edit in place.
  - Ids and counts only, no question or answer text.
- **Names.**
  - `MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`.
  - `SP` = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`.
  - `B1` = `SP\bundle-1`; `RD` = `SP\router-default`.
  - `r1` = the flight `2026-10-07T00-22-47-router-default-r1`. Its registration is `MAIN\electron\test\golden\passes\PREREGISTER-router-default.md` and its result `passes\2026-10-07-router-default-result.md`.
  - Times are TST (UTC+3). "The reset" = the user's weekly Claude usage reset, Mon 2026-10-12 16:00 TST.

---

## 1. Verdict rules (decided now; read in this order)

| verdict | when (any one line suffices, except PASS) | what it means |
|--|--|--|
| **VOID** (checked first; the re-fly is not spent) | One of these:<br>• the dist proofs after ≠ before (launcher exit 3);<br>• `[Router] session failed` before the 10th dispatch;<br>• router down > **2.0 min** in the run window;<br>• the automated OBS read fails (bar 6);<br>• the hour was "NOT spent", or the user aborted the run;<br>• a **user answer** in §4 that §4 maps to VOID, or no answer within 12 h | The run did not test the build under its conditions. Retry under the same label (§7) |
| **FAIL** | One of these:<br>• any **wrong** shown answer (Live- or pipeline-shown; wrong = EITHER grader gives correctness 0);<br>• any text-half Safety count > 0;<br>• in-app acceptable **≤ 39** of 47;<br>• any cue marker leaked into shown text;<br>• any cue-gate mismatch (bar 4a) | The result is **below r1 beyond grader noise**, or the build broke a safety or core claim. It is not proof that the bundle caused it: the ±2 band is grader noise only, and a live run also re-samples the answers (M1). The FAIL report sets the same-day bare arms beside the in-app numbers. Consequence: §8 |
| **PASS** | All of these:<br>• every bar 1–6 met;<br>• the reader's integrity counts all 0;<br>• both gating graders complete by the §3.4 deadline, pinned, memory ABSENT | The reduced bundle stays in MAIN as it is (9d5bd9e). The router flag's default is **not** decided here: routing is reported only |
| **INCONCLUSIVE** | Anything else. For example:<br>• acceptable 40–41;<br>• latency over a bar;<br>• 2+ doubles;<br>• an item never dispatched;<br>• cue coverage < 90%;<br>• a silent-listener failover with no ear episode;<br>• an UNREADABLE turn;<br>• integrity ≠ 0;<br>• gating grades not complete by the §3.4 deadline | One re-fly (§7). A second INCONCLUSIVE has no automatic outcome: the user rules |

**Why latency never FAILs alone.**
- Free-tier load varies by hour and day, and under load 3.5-lite stalls: the 2026-09-23 latency rule failed at p90 45 000 vs 19 180 ms.
- The bench predicts this build is faster (bar 3).
- So a slow day earns a re-fly, not a revert.

**Why ≤ 39 FAILs but 40–41 is INCONCLUSIVE.**
- Grader noise on identical answers is ±2, so 42 is inside it.
- 40–41 is 1–2 past the band: ambiguous on n = 47.
- 39 is 5 below r1.

---

## 2. The bars

| # | bar | exact rule | source / reason |
|--|--|--|--|
| **1** | **No quality regression vs r1** | in-app acceptable **≥ 42 of 47** AND **0 wrong** across all in-app answers | **r1:** in-app **44/47**, 0 wrong (mains 28/31, follow-ups 16/16), 2 graders on `claude-opus-5-5`.<br>**Grader noise ±2 (grader-only):** bench C, the same 42 answers re-graded in three rounds, scored [38,40,40], [39,39,40] and [39,39,40]. 44 − 2 = 42.<br>**No sampling noise is included** (M1): r1's bare LOW arm had 1 wrong where in-app had 0.<br>The grader pin is r1's, so there is no grader drift between the two runs |
| **2** | **Safety unchanged** | **0 wrong Live-shown answers**: the in-app grades on turns whose decision reads `shown=live`; either grader giving correctness 0 = wrong.<br>AND the reader's text half is all 0:<br>• `SAFETY live: hard-first=0 router-marker=0`;<br>• `SAFETY pipeline: unknown-marker=0 bare-routing-token=0` | **r1:** wrong Live-shown 0 of 21; text half 0/0/0/0.<br>The router instruction is r1's, checked by the dist proof: INSTRUCTION `e29bf3810128`, BLOCK_B `e11c240063ea`.<br>If §3.3 is not signed off, the Live half is also read from the blind L/S export (§3.3 branch B) |
| **3** | **Latency not worse** | the reader's `SPEED shadow_first_token q_src=all`: **p50 ≤ 4100 ms**, **p90 ≤ 5400 ms** | **r1:** p50 **3903**, p90 **4914** (n 47), same reader `router-hour-read.mjs` (sha12 `2d17df40226e`).<br>**p50 tolerance 200 ms** = the SPEC §8 L3 floor (bench C rep p50s 3374 / 3535 / 3425, spread 161).<br>**p90 tolerance ~10% (+486 ms):** a choice, not measured. Nearest-rank p90 of 47 is a single turn, and one slow turn moves it (cost if wrong: a noisy INCONCLUSIVE).<br>**Expected direction: faster** (bench L3: T p50 2879.5 vs C 3425 ms) |
| **4a** | **Cue gate behaves** | one `[Answer] cue rule: sent\|skipped` line per pipeline answer.<br>`skipped` **iff** `cueRuleApplies` is false on that dispatch's heard `question=`, recomputed by `B1\gate-heard.mjs` (sha256 `1a604cd2…`) in `score-b1.mjs`: **0 mismatches** | The gate is deterministic, so a mismatch is a defect.<br>Expected skipped ≈ 23 of 47: r1 and both router-smokes skipped 23/47 on heard text; the b1 smoke skipped 25 of 49, the 2 probes included |
| **4b** | **Cue blocks where sent, none where skipped** | • every `cues: []` is preceded by `cue rule: skipped`;<br>• 0 non-empty blocks on skipped answers;<br>• a well-formed block on **≥ 90%** of sent answers;<br>• 0 blocks over 3×5; malformed 0;<br>• `B1\check-smoke-cues.mjs` v5 (sha256 `c4b6a970…`) reads **CLEAN** | Same thresholds as bench C2 (≥ 18/20) and smoke S-CUE (well-formed 100%, malformed 0, over 0).<br>Measured on every pipeline answer, shown or shadow. Live text carries no cues |
| **4c** | **0 cue markers leaked** | none of `__CUES__`, `__MORE__`, `[CUES FIRST]` or any `__[A-Z][A-Z0-9_]*__` in any shown text: the in-app `answer` fields and the Live texts (`router-live.json`) | The `RD\grade\cuecheck.mjs` form. r1 and the smoke: 0 |
| **5** | **Reliability** | **47/47** roster items answered (a shown answer on the item's first dispatch);<br>**doubles ≤ 1**;<br>**0** dispatched turns with nothing shown;<br>0 failed answers;<br>router down **≤ 2.0 min** (over = VOID);<br>0 `reason=silent-listener` unless an ear episode is logged (≥ 5 uncaptioned interviewer utterances in a row, the `B1\ear-gap3.cjs` method) | **Instruments:**<br>• per item: the play-window `item` on the reader's decision lines;<br>• dispatches, unanswered, doubles, failed answers, session failed: `read-smoke-b1.mjs`'s S-H row form, inside `score-b1.mjs` (expected dispatches = 47 + 2 probes).<br>**Baseline:** the smoke S-H read 49/49, doubles 0.<br>**M5 — r1 does not meet this bar.** By its harness definition r1 had "1 doubles (46 answered of 47 heard)". The bar is stricter than the baseline by the user's choice.<br>**The one rule for bar 5:** any shortfall on it — items answered < 47, doubles > 1, a dispatched turn with nothing shown, a failed answer, a silent-listener failover with no episode — is **INCONCLUSIVE, never FAIL** (router down > 2.0 min is VOID; bar 1 still counts nothing-shown turns as not acceptable). This matches r1's registration, where "0 dispatched turns with nothing shown" was the Fallback bar and only a Safety breach failed. A wrong answer that IS shown stays under bars 1–2.<br>**2.0 min** = r1 §6.2: a reconnect is seconds, a quota wall is minutes |
| **6** | **Observability** | **Automated:** the `observe-session.ps1` log shows electron in a session other than the console in **0** samples, and `[WindowHelper] Switching to OVERLAY` **≥ 1**.<br>**Human:** the user's answer to Q1 (§4) | Smoke OBS: other-session 0, overlay shown 3. The flight is attended (ruling 4) |
| **7** | **Routing: reported only** | HARD shown Live (of 27); EASY caught (of 20); late / no-router-turn; `live_first_ms` p50 | **r1:** HARD misrouted **4/27** (RH04 RH05 RH07 RH08), EASY 17/20, Live first p50 1572 ms.<br>The instruction is r1's, unchanged: no routing claim is made |

**Deviation (M2), stated before data.** A1 §4 item 2 asks for "first-word / TTFT … of pipeline-shown answers". Bar 3 differs on two counts:
- **What it measures:** TTFT only.
- **Which turns:** every in-hour decision, shown or shadow.

Why: r1's 3903 / 4914 is this exact quantity (n 47), and pipeline-shown answers alone would be n ≈ 26. Reported beside bar 3, not gated:
- pipeline-shown-only p50 / p90;
- the cue `sent` / `skipped` split.

**Binding details.**
- **Acceptable / wrong** (r1 §7.1):
  - acceptable = both graders give correctness 2 AND on-topic 2 (delivery is unused);
  - wrong = either grader gives correctness 0;
  - no answer = not acceptable.
- **Per item.** Bar 1 counts the in-app pair of each item's **first** in-hour dispatch, mapped by play window (`OFFSET_MS` 1150).
  - A double's extra answer counts for wrong only.
  - On a `shown=live` turn the in-app pair is the Live text (r1 §7.3 I-2). Bar 1 therefore grades what was shown first, exactly as r1's 44/47 did.
- **Appended turns.** On these, Live is cut and the pipeline's "(full answer)" is appended. The appended text is not in the in-app file, so it is not graded. Any append makes that turn UNREADABLE for the wrong half, so the run is INCONCLUSIVE. r1 had 0 appends.
- **Superseded and unclaimed turns:** r1 §7.3 applies verbatim. An unclaimed or ungradeable replacing answer is UNREADABLE, so the run is INCONCLUSIVE.
- **Fixed by the launcher and proven by the guard:**
  - `NATIVELY_FAULT_DRILL` is absent;
  - router context `b2a43a2159a2`;
  - arms `high,low,captured-high`;
  - HEAD `9d5bd9ea411d…`;
  - typed prompt `4495445db0c2`; `CUE_RULE` `8e15e4e7dd41`.

---

## 3. Grading

### 3.1 Grader and slots
- **Grader settings:**
  - `--model claude-opus-5-5`, `--setting-sources project,local`;
  - memory **ABSENT** on every transcript, else the grade is refused;
  - the model is read from every transcript;
  - r1's dispatch template is used byte-identical (`rd-grader-dispatch.txt`, sha256 `ad35cdef…`);
  - 2 graders on every gating file.
- **Slot order (gating first).** The session count includes retries: r1 lost 3 attempt-1 launches to the usage limit.

| # | slot | graders | role |
|--|--|--|--|
| 1–2 | `cwdprobe-1`, `cwdprobe-2` (pinned) | — | gating: the launcher's probe gate |
| 3 | `cwdprobe-3` (the alias read) | — | gating: the probe gate requires it; it decides nothing |
| 4–5 | `inapp.g1`, `inapp.g2` (47 in-app answers) | 2 | **gating:** bars 1 and 2 |
| 6 | `high` (bare 3.5-lite HIGH, 31 mains) | 1 | reported (the user's rule). r1: 28/31, 0 wrong |
| 7 | `low` (bare 3.1-lite LOW, 31 mains) | 1 | reported (the user's rule). r1: 28/31, 1 wrong (RH19) |
| 8 | `captured-high` | 1 | reported. r1: UNUSABLE (mis-keyed). This is the first reading since the dcefca0 pairing fix |

- **Gating = 5 sessions. The full plan = 8.**
- **Cut order** when §3.2's stop rule bites: `captured-high`, then `low`, then `high`.
- **A cut arm is deferred, not dropped.** It is graded after the reset with the same files and the same pin, and stays reported only.

### 3.2 Session cost: an estimate, with its provenance (R3)
- **No per-session cost has been measured.** The only usage readings in the record are account-wide weekly totals, and every interval holds agent work as well as graders:

| reading | weekly % | `claude -p` graders before the reading | other work in the same interval |
|--|--|--|--|
| 2026-10-07 17:10 | 74 | r1: 13 slots (incl. 3 attempt-2) + first cue grading: 12 sessions | Opus/Sonnet agents (build, reviews) |
| 2026-10-08 ~16:00 | 89 | bench rounds 1–3: 3 × 6 = 18 sessions (round 3 scored 15:57) | spec, routing replay, reviews, build agents |
| 2026-10-11 18:30 | 92 | none | landing, smoke, pre-flight checks, this registration |

- **Upper bound, an estimate.**
  - From 74 → 89% (+15) over 18 grader sessions plus agents: ≤ ~0.8% per session, if all of the delta were graders. The true cost is lower.
  - So 8 sessions ≤ ~6.7% and 5 gating ≤ ~4.2%, against ~8% left.
  - The same ~8% also pays for:
    - deriving and calibrating `launch-grader-b1.mjs` and `score-b1.mjs`;
    - their Opus reviews;
    - this re-check.
  - **"8 fits" is not shown.**
- **Measured during grading (the rule):**
  - (a) The controller reads the usage (`get_usage`, weekly %) right before `cwdprobe-1` and right after `inapp.g2`. The difference ÷ 5 = the measured per-session cost `c`, written into the result.
  - (b) **Stop rule.** A reported arm is launched only if the remaining weekly % is ≥ 2 × `c` + 2% (the margin for the scorer run and the report). Otherwise it is deferred to after the reset.
  - (c) **If the flight lands before the reset, the reported arms (slots 6–8) are graded after the reset by default.** They run earlier only if (b) holds with room for all three.
- **Not counted in the 8:** the Opus agent reviews (they are not `claude -p`). The controller schedules them, and they come before any grader.

### 3.3 Cuts of SPEC requirements — PENDING THE USER'S SIGN-OFF (R2)
**What is cut.** The user approved the SPEC (ruling 5), so this file cannot waive the following by itself:
- the **per-id no-cue twins** (SPEC §10; A1 §4 item 1): the generated launcher flies r1's arms only;
- **in-app cue-content grading** (SPEC §10; A1 §4 item 3; the user's rule "grade a feature's own output", 2026-10-02);
- the **blind L/S export**, r1's instrument for Live-shown safety.

**The question.** The user was asked whether to leave them for after the reset. Their answer is recorded **before arming** as USER-RULINGS item 9, one line per cut, quoted. With no recorded answer the flight is not armed.

**Branch A — signed off ("leave them for after the reset").** All three run after the reset, as **reported only, never changing the verdict**:
- **Twins:** made offline from the run's own `interview60.prompts.json`, by `answers.mjs --no-cues --only <cueRuleIds>` on 3.5-lite HIGH, 3 reps. Gemini quota only; then 1 grader per rep = **3 sessions**.
- **Cue content:** the `SP\cue-grader` kit (rubric `fce7ac5bb1e3`, calibrated on r1), 2 graders = **2 sessions** plus its own probes (≤ 3).
- **Blind L/S:** `RD\build-blind-rd.mjs` relabelled `b1-final`, 2 graders per file. r1 needed 4 files = **8 sessions**; this run's file count comes from its export.
- **Total after the reset:** ≤ ~16 sessions.

**Branch B — not signed off.** All three are graded with the flight:
- The twins and cue content stay reported.
- **The blind L/S export becomes gating for bar 2's Live half** (r1's instrument), **in addition to** the in-app grades: a Live answer graded wrong by EITHER of the 2 blind graders of its file, or by EITHER of the 2 in-app graders, is a wrong shown answer (FAIL). Bar 1 stays on the in-app file.
- **Extra sessions:** twins 3 + cue content 2 (+ ≤ 3 probes) + blind ≤ 8 = **≤ 16**. Gating becomes 5 + ≤ 8 = **≤ 13**.
- This cannot fit before the reset, so the gating grading of a pre-reset flight then waits for the reset (§3.4).

### 3.4 Gating deadline (R4)
- **Start:** the gating graders start within **2 h** after the last §4 answer.
- **Attempts:** each gating slot gets at most **2 attempts**.
- **Usage block:** if usage blocks a slot (a usage refusal, or the remaining weekly % is below 2 × 0.8% = 1.6%, the §3.2 upper bound, since `c` is not yet measured while gating runs), gating waits for the reset, and **the verdict waits too**.
- **Deadline:** both gating graders (and, in branch B, every blind file) must be complete, pinned and memory ABSENT by the later of:
  - **run end + 24 h**;
  - **the reset + 6 h**, i.e. Mon 2026-10-12 22:00 TST, for a flight before the reset.
- **Missed deadline:** the run is **INCONCLUSIVE**. No later grade changes that.

### 3.5 Tools
The kit is reused; a derived copy is made only where the label or the bars force it.
- **Grader launcher.** `RD\grade\launch-grader-rd.mjs` (sha256 `edfef2aa…`) → `B1\flight\grade\launch-grader-b1.mjs`:
  - label `b1-final`;
  - tags `inapp.g1|g2`, `high`, `low`, `captured-high`;
  - no blind-file blocker in branch A;
  - the probe gate, the pin, the memory and hash-binding checks unchanged;
  - it prints the session count before each launch.
- **Scorer.** `RD\grade\score-rd.mjs` (sha12 `50e0bc95bfb0`) → `score-b1.mjs`. It applies §1–§2 of this file and nothing else, and keeps score-rd's pin, memory and hash-binding refusals. It runs, itself:
  - `router-hour-read.mjs <run> --down-limit-min 2`;
  - `check-smoke-cues.mjs` and `gate-heard.mjs`;
  - the S-H and OBS row forms of `read-smoke-b1.mjs` (sha256 `a2cb436e…`).
- **Before any grader launches,** both derived files are:
  - **calibrated by breaking each bar once** (one known-answer case per FAIL / INCONCLUSIVE / VOID line);
  - **Opus-reviewed**.

  Their sha256 go in the arming record.

---

## 4. The user's confirmations (R1): fixed questions, asked before any output is opened

- **When.** Right after playback ends. Before the answers, the controller may read only:
  - the Task Scheduler last-result of `Natively-flight-b1`;
  - whether `interview60.flight.done.json` exists.

  **No reader, scorer, grade, log or run-folder file is opened before the user has answered.**
- **Asked verbatim, in one message:**
  - **Q1.** "Did the overlay show the answers on your desktop for the whole playback? Answer yes, or no with the clock times it was missing."
  - **Q2.** "From 15 minutes before the start to the end of playback, did any other sound play on this computer (video, call, music, notification sounds)? Answer no, or yes with what and when."
  - **Q3.** "During playback, did you type into or click on the app or its overlay? Answer no, or yes with when."
- **Recording.** The answers are quoted **verbatim** in the result note. No later report or recollection changes the verdict.
- **What each answer does (decided now; VOID only where named):**

| answer | effect |
|--|--|
| Q1 "yes" | bar 6's human half met |
| Q1 "no", or any gap with clock times **during playback** | **VOID** |
| Q2 "no" | met |
| Q2 "yes", with the sound **during playback** | **VOID** (system audio hears everything) |
| Q2 "yes", **only before playback started** | reported only |
| Q3 "no" | met |
| Q3 "yes", **during playback** | **VOID** |
| Q1 "not sure" | bar 6's human half **not met** → **INCONCLUSIVE** (PASS needs a "yes") |
| Q2 or Q3 "not sure" | reported only; the run is read on its bars |
| any one of Q1–Q3 unanswered within **12 h** after playback ends | **VOID** |

- **Other notes.** Anything else the user reports (odd answers, slow answers, overlay layout) is reported in the result and gates nothing.

---

## 5. The run

- **Freeze MAIN (M6).** From registration until the arms finish, nothing lands in MAIN:
  - no commit by any session;
  - no vitest, tsc, build or npm.

  The guard pins HEAD 9d5bd9e, so a commit before T makes it refuse, and the window becomes a retry. The controller tells the user and the peer sessions before registering.
- **Register** (only after the user names the window and §3.3 is answered). The user, or the controller on the user's go, runs:

  `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\bundle-1\smoke\register-b1.ps1" -Kind flight -Which all -T "yyyy-MM-dd HH:mm"`

  This registers the dry twin, `Natively-flight-b1` (once at T) and the precheck (at T−6). It is never started by hand or from a Claude session.
- **Launcher.** `B1\flight\launch-b1-flight.cmd`, sha256 `045dceaca6ccea020adb2b80837dadb7d88a24fe2c50803de656324f82fff9c4`.
- **Label.** `b1-final`. The graded folder is the first non-VOID `<stamp>-b1-final`, in stamp order.
- **Tree.** MAIN @ **9d5bd9e**: cue gate, cue-trim, silent-ear failover, harness overlay, and r1's router instruction.
- **Guard.** `guard-b1.mjs` (sha256 `8678a534…`) checks:
  - HEAD pinned and the tree clean;
  - quota headroom ≥ 1.5 × need on each lite (`NATIVELY_B1_EXTRA_REQUESTS=150`);
  - the drill unset;
  - knowledge mode ON.
- **Dist proofs.** `b1-proofs.mjs` (`7624761e…`) runs before and after.
- **Audio.** `live40.wav`: 47 items in 31 chains (20 EASY / 27 HARD), 20 000 ms gaps, ~19.3 min. It is the same wav r1 and the smoke flew.
- **Attended (ruling 4).** The user is logged on and watches; the machine stays quiet from T−15 to the end of playback; hands off the app (§6).

---

## 6. Watch sheet (for the user)

- **What this flight is NOT.** **There is no fault drill:** no deliberate router drop, no ear mute. A pause or a switch you see is real; note its clock time.
- **Timing.**
  - The task starts at T.
  - A few minutes of preflight follow: app start, the Live sessions, 2 probe questions (answered on the overlay).
  - Then playback: about **19.3 min**, **47 questions**, one every ~20–25 s.
- **What normal looks like:**
  - **Questions.** Each question is heard; an answer appears a moment after the question ends.
  - **Live answers, on roughly 20 of the 47 turns:** short (~36 words), appearing **~1.5–2 s** after the question.
  - **Pipeline answers, on the other turns:** appear in **~4 s**, longer.
  - **Cue lines** (the short lines above or with an answer) appear **only on pipeline answers to long or many-part questions**. Short single-part questions and Live answers have **none**: that is the cue gate working, not a fault.
  - Now and then an answer may be replaced or extended ("(full answer)"): this is normal.
- **Hands off.** Do not type, click or move the overlay, **even if it vanishes or looks stuck.** Write down the clock time instead.
- **Abort** only if something is clearly wrong with the machine. Tell the controller, or end the task in Task Scheduler (`Natively-flight-b1` → End). An abort is a **VOID**: a retry in a new window, not a re-fly.
- **Afterwards.** The controller asks you three questions (§4) before looking at any result. Your other notes are reported and gate nothing.

---

## 7. Reported only (gate nothing)

- Routing (bar 7) against r1's list, naming the misroutes that repeat r1's RH04 / RH08.
- Mains vs follow-ups acceptable (r1: 28/31 and 16/16).
- Bars 1–3 split by cue `sent` / `skipped` and by `shown=live` / `pipeline`. Bar 3 is also given on pipeline-shown turns only (M2).
- Gate agreement with the frozen no-cue list: r1 had 23 heard ids, and RH16 has flipped before.
- `hedge won by`, per model; latency by `q_src`.
- Ear failovers and `ear silent … no-failover-left` lines, with their evidence.
- The bare and captured arms (§3) beside r1's. A drop shared by in-app and the bare arms points at model or day drift; the verdict is unchanged by it.
- §3.2's measured `c`, and the usage readings.

## 8. Retry, re-fly, and what a FAIL means

- **VOID → retry.**
  - Same label `b1-final`, same HEAD.
  - A fresh arming: guard, precheck and dry twin, re-registered with the command in §5.
  - In a window the user names.
  - It is not a re-fly.
- **INCONCLUSIVE → one re-fly.**
  - Label `b1-final-r2`. The launcher is regenerated by `gen-launchers-b1.mjs`; the derived grader launcher's label changes by a dated amendment.
  - Same HEAD 9d5bd9e, and **no change** to code, prompts, router instruction, bars or graders.
  - Bar 3's reference stays r1.
- **A second INCONCLUSIVE:** no automatic outcome. The controller reports, and the user rules.
- **FAIL: the user decides.**
  - The controller reports it with ids and counts, and with the same-day bare arms beside it (M1).
  - It proposes reverting the bundle's code in MAIN to **dcefca0**.
  - Nothing is reverted without the user's explicit yes in chat. A revert is made as new revert commits: history kept, no reset, no push. The pass records, this registration and the result stay.
  - The user may choose a partial revert instead (for example, keep the silent-ear failover, whose only live evidence is the smoke's D2 PASS), or order a diagnosis first.

---

## 9. Not shown

- **One run, n = 47.**
  - Bar 1's band is grader noise only.
  - Answer-sampling noise is unmeasured: a FAIL can come from sampling alone (M1), and a true 1–2-item loss is invisible.
- **The gate's quality cost is not graded before the verdict.** The gate drops cues on 10 of 27 HARD items (SPEC §3.1). Cue content and the twins are graded after the reset at best (§3.3 A).
- **Live-shown safety (branch A)** rests on the 2 in-app graders. They see Live and pipeline answers in one file, where length partly reveals the arm (r1 §7.6 M3). This is not r1's blind L/S export.
- **Session cost is an upper-bound estimate** (§3.2) until it is measured during grading.
- **Untested in this flight:**
  - router-drop and ear-mute (cited from the smoke: D1 and D2 PASS);
  - the ear's status-`failed` failover (D8, test-only);
  - quota closes, append and supersede, unless they happen;
  - typed chat (`VERBAL_TYPED_PROMPT` is back to `4495445db0c2`, not benched).
- **Synthetic TTS audio.** Real speech's punctuation can flip the gate either way (RH16 did). Real-interview silent-ear behaviour is unmeasured.
- **The latency comparison spans days.** r1 flew 2026-10-07 at 03:00, and free-tier load differs by hour and day. The p90 tolerance is a choice.
- **The bar-5 baseline is stricter than r1** (M5).
- **Router context** is the smoke's `b2a43a2159a2`. No routing claim is made.
- **Instruments not yet run or not yet built:**
  - `observe-session.ps1` and `gate-heard.mjs` were not run for this file;
  - the quota figure `NATIVELY_B1_EXTRA_REQUESTS=150` was not re-derived here;
  - `score-b1.mjs` and `launch-grader-b1.mjs` do not exist yet (§3.5).

## 10. Filled at arming (nothing above is edited)

- `<<ARMING: T, yyyy-MM-dd HH:mm TST, named by the user>>`
- `<<ARMING: this file's sha256>>`
- `<<ARMING: USER-RULINGS item 9 quoted; branch A or B>>`
- `<<ARMING: launch-grader-b1.mjs and score-b1.mjs sha256 and calibration outputs>>`
- `<<ARMING: the guard OK line; quota headroom 3.5 / 3.1>>`
- `<<ARMING: the weekly usage % at arming>>`
- `<<ARMING: the re-check verdict on this file>>`
- `<<ARMING: the MAIN freeze, announced>>`

## Amendments

(none)
