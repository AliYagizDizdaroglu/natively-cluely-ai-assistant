# Re-review: tools 3, 6, 7, fix round 1 (scoped)

Reviewer: fresh Opus, 2026-10-05 ~18:05 TST. Inputs: `tools-367-review.md` (d19d4f74…), the "Fix round 1" section of
`tools-367-report.md`, A5 (A5.1 power, A5.3, A5.5, FINAL list items 3, 5, 6, 7) and A6 (m4). A5 > A4-RECHECK where they
differ (A5.3: "m4 superseded by B-m2").

Rules kept:
- No model call, no subagent, no setting changed.
- Nothing was written in E except this file, and nothing in MAIN.
- No prompt text or key was printed. Probes printed ids, counts, offsets and verdict lines only.
- Every re-run used byte-identical copies in the scratchpad. The prompt copies were deleted afterwards.

| tool | sha256 (verified) | SPEC | QUALITY |
|---|---|---|---|
| `eq-b4-cal.mjs` | `383b031e8319…` | **FAIL** as amended (B-m4 unbuilt; B-m2/m5/m6 built to other wording). **None of these changes the smoke gate's reading** | **CHANGES** |
| `window-eq.mjs` | `ca664e741ad0…` | **PASS** | **APPROVE** |
| `night-gates.ps1` | `f134c428d373…` | **FAIL** (A5.5 N-m3's FAIL rule not built) | **CHANGES** (that item only) |

**Re-runs on copies.** Every output line matched E's cal file except the timestamp, and (f) as noted.
- eq-b4-cal: `CALIBRATION PASSED`, exit 0. All 9 mutants FLIPPED. The 2 M-nostrip mutants stayed UNCHANGED, as the blind
  spot predicts. On my copy (f) read PASS: keys `S1Q04,S1Q04F,S1Q06,S1Q06F,WHY`. E's cal.txt still says
  `(f) NOT RUN`.
- window-eq: `CALIBRATION PASSED (26 cases x 2 time zones, identical; 5 mutants flipped)`. W1 flips 14 cases, all in
  the TZ=UTC pass.
- night-gates: `CALIBRATION PASSED`: 68 PASS, 0 FAIL, 17 FLIPPED, 0 DID NOT FLIP. BOM present, ParseFile 0.
  - Real machine: `NIGHT GATES OK` at 19:30, 21:00 and 01:00.
  - Live powercfg text read through the file is identical to the live script's reading.

---

## The controller's blocking gate: trustworthy, with one caveat for the record

- **Reproduced.** On a byte-identical copy: `TRANSCRIPT OK 5/5 | BLOCK OK 2/2 | LABEL OUTSIDE --g NONE`, exit 0.
- **Same sha.** The gate ran on sha 383b031e: the tool's mtime is 17:45:24, before smoke-run-tmp was made at 17:50.
- **Positive controls on the real smoke bytes (copies).** Each line can fail on these bytes:
  - `--g S1Q04F` → `LABEL OUTSIDE --g S1Q06F`, exit 1.
  - `--g ''` → `LABEL OUTSIDE --g S1Q04F,S1Q06F`.
  - S1Q04F's block copied into WHY → `LABEL OUTSIDE --g WHY`.
  - S1Q04F's trailing separator cut to `\n` → `BLOCK FAIL S1Q04F`.
  - One non-final line of WHY upper-cased → `TRANSCRIPT UNCALIBRATED 1`, exit 3.
  - No 20-character LABEL prefix appears in S1Q04, S1Q06 or WHY.
- **Calibrated lines.**
  - BLOCK: (d), (g), (h), R7, R8 and M-plus3/M-lead.
  - LABEL OUTSIDE: R12, R13 and M-outside.
  - (a) is cue-era only, but the smoke's own TRANSCRIPT OK now shows the builder reproducing current-shape (post-P2)
    captures.
- **Caveat (name it in the arming record).**
  - Both G ids' transcript parts are **one line, the pinned line** (S1Q04F, S1Q06F: 1 line; S1Q06, WHY: 4 lines).
  - So TRANSCRIPT on the G ids lies wholly in the (c″) blind spot. Upper-casing S1Q04F's only line reads OK.
  - For the G ids, b4's evidence is therefore BLOCK OK + LABEL OUTSIDE NONE, plus verify-smoke-prompts' independent
    strip and re-insert (RESULT-smoke-eq.md l. 28–33).
  - TRANSCRIPT 5/5 adds evidence through S1Q06 and WHY.
- **If any eq-b4-cal edit lands before arming**, the sha changes: re-run the gate on the new sha while smoke-run-tmp
  still exists.

---

## (3) eq-b4-cal.mjs: SPEC FAIL (as amended), QUALITY CHANGES

| finding | status |
|---|---|
| B-I1 (A5.5) | **Fixed.** Third line, exit 1. R12/R13 → `LABEL OUTSIDE --g S1Q02`. (a) stays NONE. M-outside flips both. |
| B-I2 | **Fixed.** Header l. 2-4 and 9-15 match A5.5's sentence. (c′) and (c″) are printed as KNOWN BLIND SPOT and read OK. M-nostrip is shown not flipping (b) or (c). |
| B-m1 | **Fixed** (named in the header l. 19-21 and in the report). |
| B-m2 | **Deviates.** The tool appends `; G-ids also failing: <ids>` to the UNCALIBRATED line. That is A4-RECHECK m4's wording, which A5.3 marks as superseded. A5.5 wants a separate line `TRANSCRIPT G ALSO FAILING <ids>` with A3's strings unchanged. The check itself works: R14 passes and M-galso flips. |
| B-m3 | **Fixed.** R7/R8 → BLOCK FAIL; M-lead flips both. The `first === 0` branch is never exercised. |
| B-m4 | **Not built** (implementer item 5). See B4-I1. |
| B-m5 | **Deviates.** A crash → `B4CAL CRASH`, **exit 4**. A5.5 and FINAL item 3 say exit 2. My probe with a missing dist module gave `MODULE_NOT_FOUND`, exit 4, and the work folders were removed. The canary is not echoed. |
| B-m6 | **Deviates.** The tool **refuses** (exit 2) on any REPLAY_BREAK value. A5.5 says "deleted from the builder child's env". The refusal fails closed and loudly. |
| A4-RECHECK m4 | See B-m2. |
| m5 (c′ rule) | **Fixed.** 3rd letter → `q` (`z` if it is already `q`). The filler/ack lists are checked against transcriptCleaner.ts at start. Candidate 1 read OK. |
| m6 (marker-first) | **Built.** Format: `BLOCK FAIL <id> (marker-first marker=<n> label=<n>)`. A5.3 writes `(marker-first) marker=<n> label=<n>`. M-markerfirst flips. **The rule is too broad (B4-I2).** |

### Critical
None.

### Important

**B4-I1. Cal (f) / B-m4 is unbuilt, but A5's FINAL list item 5 registers it as a pre-hour known answer.**
- Registered: `--smoke-ok` three-way equality, and a WHY-less negative → FAIL.
- The substance holds by hand. dir keys = played ids = verify-smoke-prompts' OK ids = `{S1Q04, S1Q04F, S1Q06, S1Q06F,
  WHY}`: my driver copy's (f) PASS; RESULT-smoke-eq.md l. 8, 28–32 and 37.
- Fix (driver only; the tool sha is unchanged, so the gate reading stands):
  - add `--smoke-ok <ids>` and require three-way equality;
  - add the WHY-less negative;
  - re-run the driver in E while smoke-run-tmp exists;
  - put the new `eq-b4-cal.cal.txt` sha into `instruments.sha256.txt`;
  - also drop "f pending the smoke" from the PASS line once (f) runs.

**B4-I2. The marker-first annotation hides a malformed block (post-hour 5d leak).**
- `markerFirst()` tags *any* BLOCK FAIL whose user text has the marker before the LABEL. Under A5.1, a tagged id is
  "reported, not 5d".
- Measured on a copy of the smoke: S1Q04F given a second parent line (the split returns null, a real 5d malformation)
  plus marker text at offset 0 → `BLOCK FAIL S1Q04F (marker-first marker=0 label=3905)`.
- The case A4-RECHECK m6 meant: the block is well-formed and only the round trip fails, because `withEarlierQuestion`
  inserts at the first marker.
- Fix, tested on a copy:
  - compute `rest = sepOk && !s.user.includes(LABEL) && len identity` and `rt = round trip`;
  - tag only when `rest && !rt && markerFirst(user)`.
  - Result: the malformed case reads plain `BLOCK FAIL S1Q04F`. The full driver still PASSES: (mf) is still tagged and
    M-markerfirst still flips.
- Add cal case "(mf2) marker-first + malformed block → untagged BLOCK FAIL", and a mutant (the old rule) that flips it.
- **Before the post-hour run and before eq-gsitting is built; not before arming.** At the smoke gate any BLOCK FAIL
  already means no flight.

**B4-I3. Three ruled departures are needed in a dated note (text only, before arming).**
- (a) exit 4 for a crash. **Rule: keep it.** It meets A5.5's intent ("never exit 1") and tells a crash from a refusal.
- (b) the REPLAY_BREAK refusal. **Rule: keep it.** It is loud, not silent, and fails closed.
- (c) the G-also string. **Rule:** either keep the suffix (A3's prefix `TRANSCRIPT UNCALIBRATED <n>` is intact, and the
  tool's own exit logic uses `startsWith`), or change to A5.5's separate line. Decide before any post-hour reader
  parses it.
- None of the three touches the OK path or tonight's gate.

### Minor
- **B4-m1.** Record the marker-first format as built: the parenthesised form stays unambiguous in a comma-joined list.
  eq-gsitting matches it.
- **B4-m2.** The `first === 0` separator branch and a real I/O crash were never exercised. The missing-module crash I
  probed reads correctly.

---

## (6) window-eq.mjs: SPEC PASS, QUALITY APPROVE

- **W-m1: fixed.**
  - A missing dir and a file → usage, exit 2 (c25, c26).
  - A missing or corrupt timeline inside an existing dir stays UNREADABLE.
  - The W-m1 mutant flips both cases.
- **W-m2: fixed.** W-upper, W-lower, W-A2 and W1 now run in the driver, in both zones. W1 flips only in TZ=UTC (14
  cases), which is the point of the second pass.
- **No regression:** the bounds, strings and exit codes are unchanged, and the 24 old cases read the same.
- **Side observation, not a defect.** `node window-eq.mjs <copy of smoke-run-tmp>` → UNREADABLE, exit 4. The smoke run
  dir's timeline is synthetic (`items` only, no `startedAt`), so the tool is right. Do not point window-eq at it.

### Critical / Important / Minor
None.

---

## (7) night-gates.ps1: SPEC FAIL, QUALITY CHANGES

| finding | status |
|---|---|
| N-I1 + A5.1 power + A4-RECHECK m2 | **Fixed, and stricter than A5.1, which is admissible.** "No battery" also needs BatteryFlag 128. A5.1's cal cases map to: status 2 + offline → 4h; `battery: "error"` → 4g; no battery + line unknown → 4a4; 6 + online → 4b. The mutants on the AC test, the query error and the flag all flip. Real machine: status 2, line online, flag 0 → OK. |
| N-m1 | **Fixed.** Exactly 5 hexes, AC = `[3]` (tx1–tx7, 3 mutants). The parent-key FAIL is 5a/5b, with a mutant. The live text matches the live script. |
| N-m2 | **Fixed.** The earliest of the three pause values (13b–13f, with a mutant). PausedQuality/FeatureStatus are printed. |
| N-m3 | **Half.** The `NIGHT policy: INFO` line is built. **The FAIL rule is not**, and cal i1 asserts the opposite of the registered known answer. |
| N-m4 | **Fixed.** `$At`; the AST scan flips on `$AtText`. |
| N-m5 | **Pending.** The schema is quoted in the instruments note at arming. |

### Critical
None.

### Important

**NG-I1. A5.5 N-m3's FAIL rule is missing.**
- A5.5: "`updates` FAILs if any of these policy values is present: `SetActiveHours`, policy
  `ActiveHoursStart/End`, `ConfigureDeadlineForQualityUpdates`, `ConfigureDeadlineForFeatureUpdates`,
  `SetComplianceDeadline`, `SetDisablePauseUXAccess`, `AlwaysAutoRebootAtScheduledTime`."
- A5 FINAL item 7's known answer: "a policy deadline value → FAIL updates".
- The tool prints these as INFO (l. 27, 263). Case i1 (`SetActiveHours` present) reads `NIGHT GATES OK`.
- The report's premise ("A4 is silent") misses that A5.5 adopted the rule.
- Fix (one condition):
  - `$ovOk = (@($rd.policyOverrides).Count -eq 0)`;
  - `Emit-Gate 'updates' (($hoursOk -or $pauseOk) -and $ovOk) (... + '; policy overrides: ' + $ovTxt)`;
  - change the header (l. 25-27) and the INFO line's "not gated" wording;
  - cal: i1 → `FAIL updates`; add `ConfigureDeadlineForQualityUpdates` alone → `FAIL updates`;
  - add a mutant (`$ovOk = $true`) that flips both.
- **Tonight's reading is unchanged** ("override values present: none").
- After the edit:
  - re-run night-gates.cal.mjs and record the new sha (A2.5);
  - re-run guard-eq-cal, which drives the real script (N-d, X4). Its fake-standby.json already carries the 19 keys
    with no overrides, so N-d should not move.

### Minor
- **NG-m1.** The real-path failure branches (a real WMI failure, a real missing key, a real override value, BatteryFlag
  128) were driven only through fakes. That is stated in the report and stays a residual risk.

---

## Rulings on the implementer's open items 1–5

| # | item | ruling | before arming? |
|---|---|---|---|
| 1 | exit 4 (crash) | A departure from A5.5's "exit 2". Keep 4 by dated note (B4-I3a) | note only |
| 2 | marker-first line starts `BLOCK FAIL`, exit 1 | Correct per A5.3 ("`BLOCK FAIL <id> (marker-first)`"; eq-gsitting refuses "except marker-first"). Fails closed at the smoke gate. **But fix the tagging rule (B4-I2) before any post-hour read.** | no (post-hour) |
| 3 | LABEL OUTSIDE verdict mapping | **Already mapped.** A5.5 B-I1 (smoke gate: any id = no flight) + A6 m4 (post-hour: `--g` built wrong; rebuild and re-run; never 5d). Nothing to build. | no |
| 4 | night-gates FAIL-on-override not built | **Required by A5.5 N-m3 and FINAL item 7 (NG-I1).** | **YES: fix, re-cal, new sha** |
| 5 | new INFO lines / FakeJson schema; B-m4; N-m5; shas | INFO lines are harmless to guard-eq, which reads only the exit code and the last line (`guard-eq.mjs:381-382`). guard-eq-cal's fake already has the 19 keys (17:59). eq-precheck (unbuilt) must use the 19-key schema if it passes fakes. **B-m4 is required (B4-I1, driver only).** N-m5 + instruments shas at the arming record. | **YES for B-m4**; the rest at arming |

**Before tonight's arming:**
- (1) NG-I1, plus a night-gates re-cal and new sha.
- (2) B4-I1 (driver `--smoke-ok` + negative, re-run in E, cal.txt sha).
- (3) A dated note ruling B4-I3 (a)–(c) and the marker-first format, and naming the gate caveat (G ids' one-line
  windows).

No eq-b4-cal tool edit is needed tonight. If one is made anyway, re-run the gate on the new sha.

## Not covered
- Cal (f) and the gate were run on my copies only. E's `eq-b4-cal.cal.txt` still records `(f) NOT RUN`.
- The hour's G ids may have multi-line windows; the smoke cannot show whether TRANSCRIPT will bite there.
- night-gates' real-path failure branches (NG-m1).
- The MDM `PolicyManager\current\device\Update` key, which A5.5 does not require.
- window-eq on a real flight timeline (only s50m and synthetic copies).
- eq-gsitting and eq-precheck are unbuilt, so their parsing of these outputs is unverified.

Throwaway scripts (scratchpad `rr\`): `negs.mjs`, `negs2.mjs`, `mkfix.mjs`, `mut-dist.mjs`, `fix\` (the B4-I2 patched
copy).
