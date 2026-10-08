# b5 / b10 review (Opus, 2026-10-06 00:39–00:50 TST; read-only except this file)

**Verdict: NOT READY. 2 BLOCKING, 11 IMPORTANT, 7 MINOR.** The registered known cases are all run and each one gives its registered answer. One exception is a defect rather than a mismatch: the flag-off cases read exit 0 with no VOID named (B1). Some loud-failure paths are missing (B1, I3, I4, I5). Some error paths can print cue, answer or prompt text (B2).

Under review (sha256/12 recomputed, all equal to the build report): `eq-flight-read.mjs` 84ff2fa12719, cal txt 420c60319421, cal driver 6bfcc612b7ce; `eq-cues-export.mjs` 2ee308d261f1, cal txt fb0cc5cf7c6f, cal driver df84b9147509. Contract files: cue-grading rev7 b1a41225…1f39 and rev7-A1 6992393e…b593, both matching the hashes the NOTE cites.

## BLOCKING

- **B1 (b5): a flag-off hour reads "no VOID/FAIL", exit 0.** 1(a) is flagged VOID only when `earlier question: on` (l.83). When there are no diag lines, the reader prints `NOT EXERCISED (flag off)` with no flag (l.183), and 1(c) is skipped (l.234). Registration 1(a) says any startup mismatch is VOID, and 1(c) says NOT EXERCISED is VOID. The cal locks in the defect: seg 2, s50m and s50l all expect exit 0. A startup line that is ABSENT (for example a rotated debug log; `natively_debug.log.1` exists in the repo) takes the same silent path. Fix: on a run folder, startup ≠ registered → VOID 1(a), and zero diag lines → VOID 1(c). The known cases should still print NOT EXERCISED, but with the VOID named and exit 1.
- **B2 (both tools): error paths print raw exception text.** b5 l.337 and b10 l.336 print 3 stack lines. b10 l.275 puts `e.message` (80 chars) from metrics.mjs into stdout AND into the completeness file. Under Node 22 (the launcher logs show v22.19.0), a JSON.parse unexpected-token error quotes a piece of the input. Reachable sources:
  - b10 handles an unparseable `[Answer] cues:` line (l.135) and then re-parses it without a guard in selfCheck (l.232). The result is a crash that prints part of the cue text, instead of the intended INCOMPLETE.
  - b10: the twin answer files (l.162, l.238), the pairs file (l.260), and metrics.mjs reading `interview60.answers.json`.
  - b5: `interview60.prompts.json` (l.329, captured prompts) and `--played`.

  Fix: print only the error class and file name. In selfCheck, catch the parse failure and refuse or flag INCOMPLETE naming the line number. Calibrate with a malformed-line fixture. I ran no node for this; the claim rests on V8's error format.

## IMPORTANT

- **I1 (b10, ruling 2) the twin completeness clause can never fail.** `answered` and `entryIds` both come from the same file's records (l.163–176), so a short twin file, i.e. A2.6's interrupted arm, still reads COMPLETE. No cal case removes a record. The registered "44/44 per rep" is counted against the roster. Fix: compare each rep against the ids the arm was asked (the roster's 40, or the `--only` list), and name missing ids and `absent` (transientError) ids. Keeping R09's block-only record is correct.
- **I2 (b10) a `superseded` line is written for any earlier cues line in the stretch, whatever its id** (l.127). NOTE-b10-rev7-A1 binds: "written only for a stream that a later in-window cues line of the same id replaces". The consumer's U3 check refuses an export that breaks this. Fix: compare `windowIdAt(c.t)` with the entry id; a different id → undelivered, INCOMPLETE, named. Add a cal case.
- **I3 (b10) the cueBlocks equality can be SKIPPED and the export still reads COMPLETE** (l.268–296). This happens with no `verbal-diag.log` or when metrics.mjs throws. The registered completeness check requires that equality. SKIPPED should make the export INCOMPLETE (`cueBlocks-unread`) or refuse it.
- **I4 (b5, ruling 8 + exit semantics) missing inputs pass silently, and INCOMPLETE does not count.**
  - No `verbal-prompts.log`: G is built from the diag lines alone and 1(e) is not read, yet exit is 0. The cal's "clean synthetic hour, no captures" case passes because it expects exit 0.
  - No `interview60.prompts.json`: G_twin is "unavailable" with no flag raised.
  - |G_twin| < 3 is printed as INCOMPLETE but tagged NAMED, so exit is 0 and the summary line says "no VOID/FAIL clause".

  Fix: name `1(e) UNREAD`, `G_twin UNREAD` and INCOMPLETE in the summary, and exit non-zero.
- **I5 (b5) `readCaptures` (l.309) silently drops JSONL lines it cannot parse.** A truncated LABEL capture then disappears from 1(e)'s second half and from 5d. Count and name dropped lines; more than 0 means 1(e) cannot be read.
- **I6 (b5) 5d only checks the paired capture of each block window** (l.134–136), plus LABEL captures in non-block windows (l.215). A second LABEL capture inside a block window (the hedge back leg, the case ruling 7 itself names) is never checked with `splitEarlierQuestion`, so a malformed one is never read as 5d. A4.1 says 5d is read first, on every capture that carries the LABEL. Fix: split every in-window LABEL capture.
- **I7 (b5) the cause map is keyed by item id** (l.190–198), so with two `gate=block` windows for one id the second window's cause overwrites the first. `gstarRead` (l.229) and the G_twin fast-route test (l.243) then read the overwritten cause. Example: windows inserted + UNEXPLAINED → an id that is in G is read as a G\* miss, which can flip 1(c). The BLOCK lines also print the wrong cause. Fix: key by log line. 5c expects duplicate ledger entries, yet no cal case has two block windows for one id.
- **I8 (b5) the 4d text attributes the wrong FAIL** (l.264). A main whose block is `fast-route` or `malformed` is labelled "a wrong answer here is 4e". A3.1b puts fast-route in G and under 4d. A malformed block was inserted, so it is 5d + 4d. Only knowledge-short-circuit and coding blocks belong to 4e.
- **I9 (b5) 4d requires "its parent identified (rule 5)"**, but `--referents` prints only `UNKNOWN expected parent` for a main that has no chain (l.284). It drops the matched ids and does not name the line. Fix: print the match ids for every block window, NAMED for mains and for unplaced windows.
- **I10 (b5, ruling 5 + l.195) two signature rules depart from A4.2's text.**
  - The debug-log override line alone counts as `fast-route`. A4.2 m4 makes the verbal-diag `route:` line THE signature and the debug line only optional corroboration. As built, a window that should read UNEXPLAINED (VOID 1(e)) can read fast-route instead.
  - Ruling 5 reads the override line after the pinned line, against A4.2 m3's literal "before". The s50m/s50l real shape supports the builder here.

  Both need a dated note. Alternatively, require the verbal-diag line for fast-route.
- **I11 the A4.3a/A5.1 leak checker is not built.** The completeness file and the cue summaries cannot be quoted until it exists and has its own calibration (whole cue, first 30 chars, h40d summary).

## MINOR

- **m1 ruling 4 (`short` before roster)** contradicts A2.4's order but follows A2's own WHY known answer, so the registration contradicts itself. Record this in a dated note. Risk is low: s50m/s50l show 0 short windows of 40 and 41.
- **m2 ruling 3:** the join re-implements the judge's claim rule rather than using `wonby-join.mjs`, which joins won-by lines in [d−1 s, d+25 s]. On h40d the results are the same (44 of 44 joined). Record it. An `extend` continuation makes the tool's own validator refuse the whole export, so nothing is written, instead of naming it INCOMPLETE. h40d, s50m and s50l had 0 extend dispatches.
- **m3 (b5) block chars 200..578 are never checked.** §3 says "the reader accepts 200–577" and A2.8 sets 578. The cal line claims "block chars within 200..578" on the smoke, but the tool never tests the range.
- **m4 (b5) a window with more than one diag line uses only `diags[0]`** for the gate and for G. A later `gate=block` in the same window is printed as `diag-lines=n` but not named.
- **m5 (b5) the two halves of 1(e) pair captures to windows differently.** The second half uses `t <= window.t + 1000` (l.213); the first uses `pairCapturesToDispatches`. Use one pairing.
- **m6 (b5) WRONG REFERENT names a direction only.** The registered "cause placed in the log" is left to a reading by hand.
- **m7 override flags can change registered values without warning.** On a real folder, `--gstar`, `--gstar-min` and `--twin-min` (b5) and `--id-re`, `--no-pairs` and `--no-twins` (b10) change registered floors or the contract and can still read COMPLETE / no VOID. Refuse them, or print a NON-REGISTERED banner.

## The 8 rulings

| # | Judgment |
|---|---|
| 1 | Consistent: it reconciles §7.b10's "missing line → INCOMPLETE" with rev 6's `missing` class |
| 2 | Contradicts §7.b10: the twin check can never fail (I1). Keeping R09 is right |
| 3 | Departs from the literal "wonby-join" join; same result on h40d; needs a note (m2) |
| 4 | Contradicts A2.4's order; justified by A2's own known answer; needs a note (m1) |
| 5 | Contradicts A4.2 m3's literal text for the override line, with real-log evidence; needs a note. Its pairing with the debug-line-alone fast-route departs from m4 (I10) |
| 6 | Consistent (A4.2's 23 reproduced) |
| 7 | Consistent with A4.1's final 1(e) |
| 8 | Not a text contradiction, but 1(e) unread passes silently (I4) |

## Known cases

Registered and run, each with its registered answer:
- **b5:** smoke seg 1 and seg 2; s50m and s50l, which replace h40d per A2; run5; every synthetic case in A2, A3.1b, A4.1, A4.2, A5.1(ii) and A6 m3.
- **b10:** h40d at 44/1/2/0, the NOTE's answer; twins 44/44; cuesmoke 20/20; empty block beside a failed answer; missing line → INCOMPLETE; forbidden field; twin self-check; producer cases (i)–(iv); the U2 ARMING cases.

Pending by design: A6 case (i) on the real hour, and the cue-grading consumer's F4 run on `b10cal-out\h40d\`.

**Not shown:**
- I did not re-run either calibration. I read the cal outputs and checked their hashes.
- B2's leak rests on Node 22's JSON error format, which I did not test.
- I opened nothing under `b10cal-out\`.
- No cue, answer or prompt text was read or printed.
- The real launcher log's ARMING line is untested. The dry log's ARMING line is node-written LF with no trailing space, and the real flight logs carry ISO-Z lines, so the "before startedAt" break should work.

## Re-review (Opus, 2026-10-06 00:59–01:06 TST; scoped to the fix round)

**Verdict: READY in code, on one condition: a dated note fixing the stale fast-route text, before first use (I12).** B1, B2 and I1–I10 are closed. m7 cannot fire by accident. Nothing new rises above MINOR.

**Shas recomputed, all equal to the fix summary:** `eq-flight-read.mjs` 53151846367b (cal txt c895b360fbc8); `eq-cues-export.mjs` 952182ae4eea (cal txt 16fce1aae09e); NOTE-post-hour-tools 059aeda5; `cue-leak-check.mjs` e3fb5ebd4054. **Both cal drivers re-run into my scratchpad:** b5 90/0 and b10 101/0, exit 0. Their PASS/FAIL lines are identical to the stored cal txts (diff 0). The h40d known answer (44/1/2/0, twins 44/44) still passes.

### Closed (each confirmed in code and by its new cal case)
- **B1:** any startup mismatch, ABSENT included, is now VOID 1(a), and zero diag lines is VOID 1(c) (l.84–87, 184–188). Seg 2, s50m and s50l now exit 1 with NOT EXERCISED printed.
- **B2:** every JSON read goes through `readJson`, which reports only the error class and file name. An unparseable cues line is refused by log line number before selfCheck runs (b10 l.118–119). Dropped capture lines are counted by index. The crash, metrics and windowFrom messages are fixed text or `safeErr` (class + file:line). Residual: m8 below.
- **I1:** "asked" ids now come from the `prompts.json` keys, else the timeline items. The diff runs both ways, and `absent` ids are named. A short twin file → INCOMPLETE (cal 65, 66).
- **I2:** a `superseded` line is written only when the earlier cues line's play-window id equals the answer's; otherwise it is `undelivered` → INCOMPLETE (cal 67).
- **I3:** an unread cueBlocks equality → `cueBlocks-unread` INCOMPLETE.
- **I4:** INCOMPLETE now counts in the exit code and the summary line. A missing prompts or captures file → INCOMPLETE `UNREAD`.
- **I5:** unparseable capture lines → INCOMPLETE 1(e), named by index.
- **I6:** every in-window LABEL capture in a block window is checked for 5d.
- **I7:** causes are keyed by log line. G\*, G_twin and BLOCK lines read the cause per window.
- **I8, I9:** 4d/4e attribution text now follows the cause. A parent is printed and NAMED for mains and unplaced windows.
- **I10:** fast-route needs the verbal-diag `route:` line. The debug-log override line alone → UNEXPLAINED (cal 20).
- **m3, m4:** done. **m7:** see below.
- **I11:** `cue-leak-check.mjs` is built with A5.1's cases (whole cue, first 30 chars, short cue matched whole, h40d summaries `leak 0`). Its own Opus review and its `instruments.sha256.txt` line (NOTE (e)) were not part of this review.

### m7, the env marker: cannot be set by accident on the real run
- `EQ_CAL_OVERRIDES` is set only in the child-spawn env of the two cal drivers (b5 cal l.25, b10 cal l.26). It appears in no launcher, `.cmd`, `.ps1` or MAIN golden script. It is unset in the shell (`[unset]`).
- The marker alone changes nothing: the run must also pass an override flag. With both, a `NON-REGISTERED` banner prints.
- Without the marker the flags are refused (exit 2, nothing written). Mutants M26 (b5) and M13 (b10) flip.
- Residual: `--out-dir` is not gated. That is harmless, since the consumer reads only E's fixed paths.

### Open
- **I12 IMPORTANT (paper, no code change):** the sealed NOTE-post-hour-tools (a)3 part 2 still says "As built, the debug-log override line alone also reads `fast-route`", and promises a result-note line for such windows. That no longer matches the code: after the I10 fix such a window reads UNEXPLAINED = VOID 1(e).
  - The registered texts disagree with each other. A3.1b's synthetic cal case expects the override line alone → fast-route. A4.2 m4, the later text, makes the verbal-diag line THE signature.
  - The tool follows m4, and its cal replaced A3.1b's case. A dated note must say which text governs before the reader's first run on the hour, because the choice moves a VOID.
  - Risk on the hour is low: in s50m and s50l the two lines co-occur, 1 each.
- **m8 MINOR:** `safeErr` scans the whole stack with `/m` (l.333 b5, l.58 b10). If an unexpected error's message spans lines (a JSON excerpt holding a newline), one whitespace-free token ending in `:d:d` could be printed. Restrict the match to `    at ` lines. JSON reads no longer reach it, so only an internal throw (metrics.mjs) could.
- **m9 MINOR:** one malformed in-window cues line now refuses the whole b10 export rather than naming ≤ 2 ids. This fails closed, and the consumer would refuse it anyway.
- **m10 MINOR:** I2 compares the superseded line's id with the dispatch's play-window id, not the entry's `pair.id`. They were equal in every case seen.
- **m11 MINOR, pre-existing, cue-grading side:** b10 marks `undelivered` lines INCOMPLETE and writes the export. The consumer's rev7 T2 check, "every in-window cues line addressed or superseded", then refuses the whole export instead of treating those ids as ≤ 2 export-missing.
- **Open by choice:** m2 (recorded as NOTE (a)1's residual), m5 (the two 1(e) halves still pair captures differently), m6 (WRONG REFERENT cause read by hand). The usage comment names a `--no-window-check` flag that does not exist.

**Not shown:**
- No real flight datum exists, so the fixes are proven on synthetic and prior-run fixtures only. A6 case (i) and the consumer's F4 run are still pending.
- I opened nothing under `b10cal-out\` and printed no cue, answer or prompt text. The rerun output stayed in the scratchpad, with only summary lines and counts read.
