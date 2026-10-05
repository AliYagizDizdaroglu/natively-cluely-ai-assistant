# Amendment A3 to PREREGISTER-flight-eq.md: A2-RECHECK's fixes, the user's 4c ruling, the Task 7b facts (pre-data)

Written **2026-10-05, begun 17:07 TST by `date`** (Opus, amendment author; a separate fresh Opus re-checks it). Built
on the registration (sha256 `9ca3149b…2d14f44`), A1 (`3e3f0ddd…1d863c8`) and A2 (`0bd449be…`, full hash at the end),
all three unedited. **The hour has not flown; no datum exists.** Precedence: **A3 > A2 > A1 > the registration**; every
bar, clause, arm and count not named here stands. The binding user constraints listed in A2's header stand unchanged.

**Inputs besides A2-RECHECK (1 Critical, 5 Important, 14 Minor):**
- **U1, the user's ruling, verbatim** (`E\USER-RULING-4c.txt`, received in chat 2026-10-05 16:58 TST, before any data):
  "rule 4c gets a +1 margin: FAIL only if with-block consensus off-topic exceeds no-block by >= 2 (front leg, G
  sitting)."
- **T1, from the Task 7b review** (`F\build\task-7b-review.md`, the "REVIEW-1 I6" paragraph): G_twin uses the harness's
  own predicate, not "carries the LABEL".
- **T2, Task 9 Step 5b's precondition.** s50m's `interview60.prompts.json` must hold an `S1Q04F` key. I checked it at
  17:0x by printing keys only: 39 keys, `S1Q04F` present.
- **T3, the refusal text.** The built harness (commit a32db47; `interview60.answers.mjs:324` in `eq-build`) prints
  `--no-block: the captured prompt for <id> carries no single well-formed EARLIER QUESTION block immediately before
  INTERVIEWER JUST SAID`.

## 0. Resolutions

| item | resolution | binds at |
|---|---|---|
| **C1** `eq-b4-cal` cannot see the block | ADOPTED with one correction (BLOCK's length identity is `+ 2`, not `+ 3`). Two checks, TRANSCRIPT and BLOCK; five cal cases plus a smoke-adapter case. 5d redefined. **The pre-arming run on the smoke's segment 1 is restored as a blocking gate. A2.9's waiver is withdrawn.** | b4, rule 5d, §5 item 1 (A3.1) |
| **I1** pinned grader id has no tool | ADOPTED: `launch-grader.mjs --model-id`; `--add-dir` becomes a source check; three cal cases; a third dry probe reads the alias | b8, A2.7 (A3.5) |
| **I2** §11 cannot be filled at arming | ADOPTED: the arming fill goes to `E\ARMING-flight-eq.md` outside MAIN. The registered HEAD is the `passes/` commit, with §11 unfilled | §11, A2.8 m4/m5 (A3.6) |
| **I3** §5 item 1 silent under 1(j)(k) | ADOPTED as worded, plus 5d's malformed-block case | §5 item 1 (A3.2) |
| **I4a** P8 dummy trigger contradicts itself | ADOPTED. The precheck starts the dry twin itself and stamps after it ends (wait ≤ 240 s) | P8 (A3.7) |
| **I4b** g5 needs a clock | ADOPTED: `--now <iso>`, calibration only | P6 (A3.7) |
| **I4c** g1 empty | ADOPTED as worded | P6 (A3.7) |
| **I4d** +03:00 untested | ADOPTED: the cal is re-run under `TZ=UTC` | P4 (A3.7) |
| **I4e** power-events has no sleep case | ADOPTED as worded | power-events (A3.7) |
| **I4f** G-sitting refusals uncalibrated | ADOPTED as worded | eq-gsitting (A3.7) |
| **I5** 4c price has no decision point | RESOLVED by U1 (ruled 16:58). The new price is computed and the union estimate quoted; the arming record quotes U1 | rule 4c (A3.3) |
| **m1** ladder names collide | ADOPTED: "§5 item 2-NG", "§5 item 2-OF" | §5 (A3.2) |
| **m2** unreadable startedAt | ADOPTED: = §5 item 5 | A2.3 (A3.2) |
| **m3** 2c FAILs when ungated | ADOPTED: "when 2c gates" | §5 item 1 (A3.2) |
| **m4** span rule wrong | ADOPTED: per-rep start gap ≤ 15 min; the order is counterbalanced | A2.2 (A3.4) |
| **m5** "(of 4)", rep re-run | ADOPTED | reg. counting rulings (A3.4) |
| **m6** A1.1/A1.4 departure text | ADOPTED: replaced by A2.2 | A1.1, A1.4 (A3.4) |
| **m7** K1 signature unnamed | ADOPTED: `[Main] screen reference: captured ` (`main.ts:2189`, verified); 1(e) uses the same test | A2.4 (A3.1b) |
| **m8** `short` window with gate=block | ADOPTED as worded | A2.4 (A3.1b) |
| **m9** 4d needs an inserted block | ADOPTED: built-not-inserted main + wrong = 4e (2-OF) | rule 4d (A3.2) |
| **m10** whole-item split | ADOPTED: ≤ 4 ids per front file, ≤ 7 per back file | A2.7 (A3.5) |
| **m11** probes need the pin | ADOPTED via I1 | A2.7 (A3.5) |
| **m12** `.env` scan names | ADOPTED: + `NATIVELY_FLIGHT_FOCUSED`, `NATIVELY_EQ_T` | P6 (A3.7) |
| **m13** missing ActiveHours; RebootRequired-only | ADOPTED | P5 (A3.7) |
| **m14** window +59 s | ADOPTED, stricter: `startedAt ≤ 2026-10-05T22:30:00.000Z` (01:30:00 exactly) | A2.3 (A3.2) |
| **U1** 4c +1 margin | APPLIED as ruled; price recomputed | rule 4c (A3.3) |
| **T1** G_twin predicate | APPLIED. The same predicate decides "inserted" for G and 1(e). A LABEL present but malformed = 5d. An exit 2 from `--no-block --only <G_twin>` is a tool defect, never a VOID by itself | A2.4 (A3.1b) |
| **T2** Step 5b precondition | APPLIED, with the scenario50 env prefix | Task 9 Step 5b (A3.6) |
| **T3** refusal text | APPLIED: the string replaces A2.8's | A2.8 n4 (A3.6) |
| **FR-I3** (final review) uncaptured routes would read UNEXPLAINED | ADOPTED, reader only, no code change tonight: named causes `fast-route` (in G, out of G_twin) and `knowledge-short-circuit` (built, not inserted, out of G); neither is VOID; 1(e) and G use them; three cal cases + one real-shape case | A2.4, rule 1(e) (A3.1b) |
| **FR-I2** (final review) n5 call has no adapter | ADOPTED: ONE smoke run dir `E\smoke-run-tmp\` built once (timeline from `played.json` incl. WHY → `interview60.prompts.mjs`), used by both `eq-b4-cal` and the n5 call; `eq-b4-cal`'s internal `--smoke` adapter dropped | A3.1a, final list steps 4–5 |

## A3.1 b4's last clause, rebuilt (C1), and the predicate (T1)

**A3.1a `E\eq-b4-cal.mjs`** replaces A2.9's body after its first sentence.

Usage: `node eq-b4-cal.mjs <run-dir> --g <ids>` (`--g ''` = none). For the smoke, `<run-dir>` is the one smoke run dir
built once by the smoke run dir builder (below). It prints ids and counts only, never a prompt.

Method:
- It copies `interview60.prompts.json`, the debug log and the timeline into `E\b4cal-tmp\`. That folder is never
  committed and is deleted on exit.
- **The smoke run dir (FR-I2): ONE prompts map, built once, shared by `eq-b4-cal` and the n5 call.** It is a throwaway
  `F\smoke\smoke-rundir.mjs`, part of step 4 of the final list. It builds `E\smoke-run-tmp\` (in L, never committed):
  1. Copy segment 1's two logs into the dir as `natively_debug.log` and `verbal-prompts.log`.
  2. Write `interview60.timeline.json` = `{ items: played.map(p => ({ id: p.id, kind: 'spoken', playedAt: p.startedMs })) }`.
     **WHY's entry is kept**, so S1Q06F's window ends at WHY's start.
  3. Run `node electron\test\golden\interview60.prompts.mjs E\smoke-run-tmp` from MAIN. It prints keys and counts only.

  **Known answer:** the prompts keys are exactly S1Q04, S1Q04F, S1Q06, S1Q06F, WHY, which are also
  `verify-smoke-prompts.mjs`'s five `OK` ids. The dir is deleted after steps 4–5 of the final list. c2's builder in
  `--calibrate` mode reads only `prompts.json` (builder l. 98–117); it only checks that the debug log and timeline exist
  (l. 41–45).
- The strip and re-insert functions are imported from MAIN's `electron/test/golden/earlierQuestionArm.mjs`, the module
  the harness itself imports.

Two readings:
1. **TRANSCRIPT.** In the copy, each `--g` id's `user` is replaced by `splitEarlierQuestion(user, LABEL).user`. Then
   `followup-replay-build.mjs <tmp> <tmp-out> --calibrate` runs on it.
   - every id reproduces → `TRANSCRIPT OK n/n`;
   - only `--g` ids fail → `TRANSCRIPT DIFF <ids>`;
   - any non-G id fails → `TRANSCRIPT UNCALIBRATED <count>`.
2. **BLOCK.** For each `--g` id, all of these must hold, else `BLOCK FAIL <ids>`:
   - `s = splitEarlierQuestion(user, LABEL)` is non-null;
   - `s.user` holds no LABEL;
   - `withEarlierQuestion(s.user, s.block) === user`;
   - `user.length − s.user.length === s.block.length + 2`.

   **Correction to the re-check:** the module removes `${block}\n\n` (`earlierQuestionArm.mjs`: `removed = block +
   '\n\n'`). The difference is therefore + 2, not + 3. With + 3, case (b) would fail on correct bytes.

**Rule 5d (redefined):** TRANSCRIPT DIFF or BLOCK FAIL on any G_twin id. Live, a `gate=block` capture whose LABEL is
present but for which `splitEarlierQuestion` returns null is also 5d (T1/A3.1b). 5d is a feature-attributable FAIL:
"the block changed bytes it must not touch, live". TRANSCRIPT UNCALIBRATED on the hour is reported only, because b4 was
already met before arming (below).

**Named in §9:** the flag-off identity of the part BEFORE the marker is not checked live. It rests on c3, Task 5's
characterization test and `parity-dist`.

**Calibration** (`E\eq-b4-cal.cal.txt`) on `interview60.runs\2026-10-01T02-37-41-cuesmoke` (non-holdout):
- (a) unmodified, `--g ''` → `TRANSCRIPT OK n/n`;
- (b) id X given a synthetic block via `withEarlierQuestion`, `--g X` → `TRANSCRIPT OK` + `BLOCK OK`;
- (c) as (b), with one character changed in X's transcript part → `TRANSCRIPT DIFF X`;
- (d) as (b), with the block's trailing `\n\n` reduced to `\n` → `BLOCK FAIL X`;
- (e) one non-G id's transcript part changed → `TRANSCRIPT UNCALIBRATED 1`;
- (f, the smoke run dir) `E\smoke-run-tmp\`'s prompts keys must equal `verify-smoke-prompts.mjs`'s five `OK` ids.

**Before arming, a blocking gate (registration b4 restored):** `eq-b4-cal.mjs E\smoke-run-tmp --g S1Q04F,S1Q06F` must
read `TRANSCRIPT OK` + `BLOCK OK`. **DIFF, BLOCK FAIL or UNCALIBRATED there = b4 not met = no flight
tonight.** The only way back is a builder fix, re-calibrated (a)–(f), then a re-run. A2.9's §11 waiver is withdrawn
because it weakened a pre-arming gate. Cal (a) needs no quota and no smoke, so it runs first; it is the early warning
that the builder does not reproduce the current prompt shape.

**After the hour, before the G sitting:** `eq-b4-cal.mjs <run-dir> --g <G_twin>`. DIFF or BLOCK FAIL = 5d. UNCALIBRATED
is reported.

**A3.1b The predicate (T1, m7, m8):**
- **Inserted.** A per-dispatch capture counts as "inserted" iff `splitEarlierQuestion(capture.user, LABEL) !== null`,
  using MAIN's `earlierQuestionArm.mjs` at the registered HEAD (the module the harness runs).
- **G_twin = {id ∈ G : `splitEarlierQuestion(prompts[id].user, LABEL) !== null`}.** An exit 2 from `--no-block --only
  <G_twin>` is then a tool defect. It is found, fixed, recorded in `instruments.sha256.txt` (A2.5), re-run and named.
  It is never a VOID by itself.
- **A gate=block window with no inserted capture** reads by its signature. The first match decides:
  - **Screenshot case (K1).** The window carries `[Main] screen reference: captured ` (the line immediately before its
    pinned-question line, with no other pinned line between them). → built-not-inserted `coding`: out of G, and a G\*
    miss in 1(c).
  - **`knowledge-short-circuit` (FR-I3; `LLMHelper.ts:2449-2457`).** The window carries `Knowledge mode (stream):
    returning generated intro response` or a `__negotiationCoaching` answer. No model call is made and nothing is
    captured. → built, not inserted: out of G, a G\* miss in 1(c), not VOID. A main read this way is not under 4d.
  - **`fast-route` (FR-I3; `WhatToAnswerLLM.ts:338-346` → `LLMHelper.streamVerbalWithGeminiFlash`).** The window carries
    `runWhatShouldISay: intent override → behavioral`, or verbal-diag `route: FAST-OVERRIDE` / `BEHAVIORAL`. The block
    is inserted but never captured. → **in G** (3b, 4a, 4d read it; it counts as reached for 1(c)); **out of G_twin**
    (cause `fast-route`); not VOID.
  - **No signature, LABEL present but malformed.** → 5d.
  - **No signature, LABEL absent or no capture.** → `UNEXPLAINED` = VOID 1(e).
  - Only the `captured` screenshot line counts. A `capture failed` warn leaves the intent verbal.
  - **G (completed):** ids with a run-window `gate=block` window that is inserted (a well-formed capture) or `fast-route`.
  - **1(e) recast.** "Every `gate=block` window that carries none of the screenshot, `knowledge-short-circuit` and
    `fast-route` signatures has an inserted capture, and every inserted capture has a `gate=block` window."
  - **Calibration cases for the reader (b5):**
    - a synthetic gate=block window with the behavioral override line and no capture → `fast-route`, in G, out of
      G_twin, VOID 0;
    - a synthetic gate=block window with the intro-response line → `knowledge-short-circuit`, out of G, VOID 0;
    - the same windows with the signature line removed → `UNEXPLAINED`, VOID 1(e) (the flip);
    - **real shape:** on s50m's and s50l's logs, the signature parser finds the `intent override → behavioral` lines
      both logs hold (1 each, at S1Q01) and nothing else.
  - No code change tonight. Capturing on the fast route would change `interview60.prompts.json` coverage against every
    prior hour (final review I3).
  - The screenshot line quotes 60 characters of the question. The reader matches the line's prefix and never prints the
    rest.
- **m8:** a `short` window that reads `gate=block` is excluded from G and named. Its answer is still read under 4a.

## A3.2 The verdict ladder, tidied (I3, m1, m2, m3, m9, m14)

- **m1.** A2's "2a. FAIL (no gain)" is **§5 item 2-NG**. The registration's "2b. other FAIL" is **§5 item 2-OF**.
  "2a/2b" without "item" always means rule 2's clauses.
- **I3.** §5 item 1's FAILs are also read under 1(i) (except a 5b wrong referent whose parent is a STRAY text), 1(j)
  and 1(k). As before, they are not read under 1(d) or 1(e).
- **m3.** In §5 item 1, "2c stall, 2c median > +1000" reads "2c stall and 2c median > +1000 **when 2c gates (A3.4)**".
  An ungated 2c is reported.
- **5d**'s place in item 1 is unchanged (A2.1); A3.1a redefines it.
- **m9.** 4d's feature-attributable FAIL needs a main whose block was **inserted** (A3.1b). A built-not-inserted main
  with a wrong answer is 4e, i.e. §5 item 2-OF.
- **m2.** An unreadable `startedAt` = §5 item 5 (NO LATENCY VERDICT; the hour cannot PASS).
- **m14.** The window becomes **in ⇔ 2026-10-05T16:30:00.000Z ≤ startedAt ≤ 2026-10-05T22:30:00.000Z** (19:30:00 to
  01:30:00 local). This is stricter than A2's `< 22:31`. It costs nothing, since T ≤ 01:00 and playback starts ~6 min
  after T.

## A3.3 Rule 4c, as the user ruled (U1, I5)

**4c (front leg, G sitting, on G_twin):** consensus off-topic block − no-block **≥ +2 = feature-attributable FAIL;
≤ +1 = PASS.** A +1 is reported with its rows. It is not INCONCLUSIVE, since U1 sets the line and A2's closing line
applies only to a breached bar.

**False-FAIL price**, computed with `falsefail-eq.mjs`'s model (scratch script; calibration line reproduced the
replay's 30.9 %). The model assumes no effect and independent arms; p is the off-topic rate per pair per arm.

| p | 15 pairs | 16 pairs | **20 pairs** | 24 pairs | old bar (+1), 20 pairs |
|---|---|---|---|---|---|
| 5 % | 9.3 % | 10.0 % | **12.6 %** | 14.9 % | 34.5 % |
| 10 % | 17.3 % | 18.1 % | **20.8 %** | 23.0 % | 39.3 % |
| 20 % | 24.5 % | 25.2 % | **27.5 %** | 29.3 % | 42.1 % |

**Union with 4b, an estimate:** if 4b and 4c were independent, the chance that either fails is about **25–37 %** with
4b at a 0.5 % wrong rate, and **33–45 %** at 1 %, across 4c's 5–20 %. They are not independent: `on_topic 0` counts in
both, so the true union is lower.

This replaces A2.11's 4c line and resolves I5. The arming record quotes U1 verbatim.

## A3.4 The G sitting, tightened (m4, m5, m6)

**Counterbalanced order (replaces A2.2's table order):**
- Front, reps 1, 3, 5: `captured-g-high-rk` then `captured-no-block-high-rk`.
- Front, reps 2, 4: `captured-no-block-high-rk` then `captured-g-high-rk`.
- Back: rep 1 block first, rep 2 no-block first, rep 3 block first.

**The 2c condition (replaces A2.2's 90-min span):**
- 2c gates iff, for every front rep, its two steps start ≤ 15 min apart, per `E\gsitting.log`.
- Otherwise 2c is reported, and the reps that broke the condition are named.
- The span of the whole sitting no longer matters.

**m5.**
- The registration's hole ruling "more than 1 true hole on G (of 4)" reads "(of |G_twin|)".
- A rep's hole re-run re-runs **both** of that rep's steps back to back, under the 15-min condition, with fresh tags
  `…-rk-b`. Tags are never reused: the harness resumes by id and stamps no variant (7b review m4).

**m6.** A1.1's "else §6's named next-day departure (2c reported)" and A1.4's "by 10:00 … else §6's departure" are both
replaced by A2.2. The sitting moves whole to the next quota day, and every clause still gates.

## A3.5 Graders (I1, m10, m11)

- **I1, `F\R\launch-grader.mjs --model-id <id>`:**
  - The default stays `opus`, so other users are unchanged. Today `FLAGS` hard-codes `'--model', 'opus'` (l. 87);
    `--model-id` substitutes the id into it.
  - Every grader and both probes of this hour pass `--model-id claude-opus-5-5`, and the argv line the launcher already
    prints shows it.
  - **The `--add-dir` check is a source check:** `grep -c add-dir` over the `FLAGS` and `probeArgs` lines must be 0. That
    count is recorded in `instruments.sha256.txt`.
  - **Calibration:**
    - `--dry-run --model-id claude-opus-5-5` → the argv shows the id;
    - `--model-id` absent → the argv shows `opus`;
    - `cwdprobe-1 --probe --model-id claude-opus-5-5` → the transcript's model is `claude-opus-5-5`.
  - The alias's resolution is read once, by a third, dry probe, and reported. It does not decide anything.
- **m11.** A2.7's "both transcripts must read `claude-opus-5-5`" applies because the probes carry the pin.
- **m10.** The two front blind files split by **whole items**, so each file holds both arms of its items (the premise
  of reg. §6):
  - front: ≤ 4 ids per file (≤ 40 answers);
  - back: ≤ 7 ids per file (≤ 42 answers);
  - examples: |G_twin| = 4 → front 2 + 2 ids; 5 → 3 + 2; 7 → 4 + 3.
  - Three files and 20 graders hold for |G_twin| ≤ 7. Beyond that, A2.7's split rule applies and is named.

## A3.6 Bookkeeping (I2, T2, T3)

- **I2, the arming record:**
  - The arming fill (§11 "Filled at arming") is written to **`E\ARMING-flight-eq.md`, outside MAIN**.
  - The launcher prints its sha256 after the shas of the `passes/` files, and the precheck prints it too.
  - It is committed to `passes/` as `flight-eq-ARMING.md` together with the result note.
  - **The registered HEAD is the `passes/` commit (registration with §11 unfilled + A1 + A2 + A3).** m4's "sha before
    §11 is filled" is then simply the committed sha.
  - The arming record holds: §11's fields, the ledger reading against ≥ 475 / ≥ 372, the night-gate lines, U1 verbatim,
    the smoke's b4 reading (A3.1a), the shas of the registration, A1, A2 and A3, and T read back.
- **T2, Task 9 Step 5b:**
  - Precondition: s50m's `interview60.prompts.json` keys include `S1Q04F`. Print keys only. Checked 17:0x: present, of
    39.
  - Run with `NATIVELY_ROSTER=scenario50` and `NATIVELY_SCENARIOS=S1,S2` set, and clear both after.
  - Required: exit 2 **and** stderr containing T3's text for `S1Q04F`.
- **T3.** The string pinned by A2.8 n4 (4) and plan re-check N2 becomes `--no-block: the captured prompt for S1Q04F
  carries no single well-formed EARLIER QUESTION block immediately before INTERVIEWER JUST SAID`.

## A3.7 Contract fixes to A2.10 (I4, m12, m13)

- **P4 `window-eq.mjs` (m14, I4d).**
  - Bounds as in A3.2.
  - Calibration cases:
    - 22:30:00.000Z → in;
    - 22:30:00.001Z → out;
    - 22:31:00.000Z → out.
  - A2's other cases stand. The whole calibration file is run a second time with `TZ=UTC` set and must give identical
    lines.
- **P5 `night-gates.ps1` (m13).**
  - Missing ActiveHoursStart/End values make `updates` FAIL unless the pause covers [At−30 min, At+5 h].
  - New calibration cases:
    - a fake with `RebootRequired` only → FAIL reboot;
    - a fake with no ActiveHours values and no pause → FAIL updates;
    - the same with a pause → OK.
- **P6 `guard-eq.mjs`.**
  - **g1 (I4c).** The `parity-dist` child output must contain both exact lines: `EARLIER-QUESTION REF TESTS: 47/47
    passed` and `PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows;
    mismatches 0`. In addition, `F\smoke\RESULT-smoke-eq.md` must hold the WHY line and two block lines with chars in
    200..578.
  - **g5 (I4b).** `--now <iso>` exists for calibration only; the launcher never passes it.
  - **m12.** The `.env` name scan adds `NATIVELY_FLIGHT_FOCUSED` and `NATIVELY_EQ_T`.
  - **New calibration cases:**
    - a parity stub that prints the old line (without `+ 117 …`) and exits 0 → `GUARD FAILED g1`;
    - a precheck stamp at T−7 with now = T+1 → accepted;
    - now = T+11 → `GUARD FAILED`;
    - `NATIVELY_EQ_T` 19:29 → `GUARD FAILED`;
    - `NATIVELY_EQ_T` 01:01 on the 6th → `GUARD FAILED`;
    - `.env` naming `NATIVELY_EQ_T` → `GUARD FAILED`.
- **P8 `eq-precheck.ps1` (I4a).**
  - The precheck itself starts the dry twin (`Start-ScheduledTask`, as `h40d-precheck.ps1:62`). It waits up to 240 s
    (h40d waited 120 s; this guard adds night-gates and parity-dist). It writes its `PRECHECK OK|FAILED` stamp only
    after the dry run ends. A dry run still running at 240 s = FAIL `dry-timeout`.
  - Calibration uses a dummy `Natively-flight-eqcal` whose trigger is At + 6 min, with At = now + 2 min. Its action is
    `cmd /c exit 0`, and it is deleted after.
  - A2's other calibration cases stand.
- **`power-events.ps1` (I4e).** Calibration:
  - 2026-09-23 03:25–04:05 local → ≥ 1 (Kernel-Power 42/107);
  - h40d's run window (2026-10-02, start to end from its timeline) → 0.
- **`eq-gsitting.ps1` (I4f).**
  - `-WhatIf` with a fake b4cal file reading DIFF → refuses;
  - `-WhatIf` with a ledger stub below m6's bars → refuses;
  - `-WhatIf` clean → prints the 16 lines in A3.4's order.

## Hashes as read (sha256, node `crypto`)

- `PREREGISTER-flight-eq.md` `9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44`
- `AMENDMENT-A1.md` `3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8`
- `AMENDMENT-A2.md` `0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e`

## FINAL pre-hour pieces, in dependency order (supersedes A2's list)

Each piece needs Opus review READY ("Per task"). The known-answer case of each calibration must flip, or the piece has
not passed.

1. **Build and land (plan Tasks 6, 7, 7b, 8 → Task 9):** LANDED with `--no-block` inside it, the guarded dist build and
   the four markers.
   - Known answers:
     - `EQ_DIST_BREAK=1` → ≥ 21 MISMATCH lines, exit 1;
     - a missing fixture → `PARITY DIST: FAIL`;
     - `REPLAY_BREAK=1` → c2 fails;
     - Step 5b (T2 precondition, scenario50 env) → exit 2 with T3's text.
2. **P2, the focused-off harness edit** (separate MAIN commit). Known answer: the vitest fails with the branch reverted.
3. **`eq-b4-cal.mjs` and its calibration on cuesmoke.** Known answers: (b) OK + BLOCK OK, (c) DIFF X, (d) BLOCK FAIL X,
   (e) UNCALIBRATED. Cal (a) not n/n = an early stop (A3.1a).
4. **The smoke (Task 10), then the smoke run dir, built ONCE** (`F\smoke\smoke-rundir.mjs` → `E\smoke-run-tmp\`,
   A3.1a).
   - Known answers: `check-smoke-eq`'s synthetic calibration (S1Q04F flipped to `no-cue` → FAILED; WHY given
     `gate=block` → FAILED); the run dir's prompts keys = the five played ids = Step 6's five `OK` ids (cal f).
   - Required live: both segments `CHECK CLEAN`, the WHY line, and Step 6's flipped-pairing FAIL.
5. **Two readings on that ONE dir, then delete it.**
   - (i) `eq-b4-cal.mjs E\smoke-run-tmp --g S1Q04F,S1Q06F` must read OK + BLOCK OK; anything else = no flight.
   - (ii) The n5 accept-path call (1 request; final review I2), from MAIN:
     `$env:NATIVELY_ROSTER='scenario50'; $env:NATIVELY_SCENARIOS='S1,S2'; node electron\test\golden\interview60.answers.mjs
     --captured E\smoke-run-tmp\interview60.prompts.json --tag nb-accept-probe --no-block --only S1Q04F --limit 1`.
     - Must print the header `block=stripped from the captured prompt` and give one answer.
     - Known answer for the refusal side: the same call with `--only S1Q04` (no block) → exit 2 with T3's text and no
       request.
   - Afterwards: delete `interview60.answers.*nb-accept-probe*`, then the dir, then clear both env names.
6. **P4 `window-eq.mjs`.** Known answers: 22:30:00.000Z in / 22:30:00.001Z out; 16:29:59.999Z out; identical output
   under `TZ=UTC`.
7. **P5 `night-gates.ps1`.** Known answers: standby 0x384 → FAIL; RebootRequired-only → FAIL; active 18→5 at 01:00 →
   FAIL; the pause → OK.
8. **P6 `guard-eq.mjs`** (registration + g1–g5 + m12). Known answers: every premise broken once → `GUARD FAILED`; the
   old parity line → g1 FAILED; `--now` T+11 → FAILED; the true environment → `GUARD OK`.
9. **The `passes/` commit** (registration with §11 unfilled + A1 + A2 + A3) = the registered HEAD. Known answer: the
   guard with HEAD moved by a dummy commit → FAILED (part of 8's file, re-run here at the real HEAD).
10. **P7 launchers** (gen-launchers; ASCII + CRLF; prints the shas of the passes files and of `ARMING-flight-eq.md`;
    `--require-precheck` only in the real one). Known answers: the guards-only chain prints `GUARDS_ALL_PASSED`; the
    mangled-marker copy exits with its code and writes the error-log line.
11. **The dry task registered and run.** Known answer: its log holds `GUARD OK` and `NIGHT GATES OK`. Requires the
    `%TEMP%` error log to be absent afterwards.
12. **P8 `eq-precheck.ps1`, calibrated on the dummy task.** Known answers: clean → OK (eqcal stays Ready); `-FakeFail
    port` → FAILED and eqcal Disabled; `-At '00:09'` → exit 2.
13. **P9: register the flight task at T and the precheck task at T − 6.** Known answer: StartWhenAvailable False, and
    both next run times read back.
14. **Arming.** `E\ARMING-flight-eq.md` is written: ledger ≥ 475 / ≥ 372, falsefail DONE, U1 quoted, the smoke b4
    reading, the night-gate lines; nothing Running, no Electron or tail.exe, no error log.

**Recommended pre-hour** (allowed post-hour under A2.5):
- **b5 `eq-flight-read.mjs`**, with A2's and A3.1b's calibration cases (startup line only → 0 diag lines; both
  `gate=error` shapes; s50m STRAY 0; the run5 log STRAY ≥ 1; screenshot/UNEXPLAINED/malformed synthetic windows).
- **`launch-grader.mjs --model-id`**, with I1's three calibration cases.

**Not covered:**
- None of these tools exists yet, so no calibration has run. My runs were: the price script, the s50m key check (keys
  only) and code reads of `earlierQuestionArm.mjs`, the builder, `launch-grader.mjs` and `main.ts:2189`.
- Whether cal (a) on cuesmoke and the smoke's b4 reading come out OK is unknown. A miss means no flight tonight, by
  design.
- The 4c/4b union figure is an independence estimate.
- The dry-twin duration inside 240 s is unmeasured.
- Whether `sameAnchor` gives false STRAYs on a clean hour is settled only by s50m's calibration.
