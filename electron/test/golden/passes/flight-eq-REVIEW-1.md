VERDICT: APPROVE WITH FIXES

# Review 1 of PREREGISTER-flight-eq.md (sha256 9CA3149B…2D14F44, verified) + AMENDMENT-A1.md (pre-data)

Reviewer: Opus, separate from the A1 author. Written 2026-10-05, before any datum. Read-only, apart from this file.
What I checked against: the replay registration and result (`F\PREREGISTER-turn-followup.md` §7, MAIN `passes/2026-10-04-turn-followup-result.md`),
the build plan (`F\plan\2026-10-04-turn-followup-build.md`), MAIN at 89c8f53 (`interview60.flight.mjs`, `interview60.prompts.mjs`,
`interview60.answers.mjs`, `IntelligenceEngine.ts`), `SP\h40c-hedge-stats.mjs`, `VH\guard-h40d.mjs`, `VH\launch-h40d.cmd`,
`E\falsefail-eq.mjs` + its output, and the agenda.

Counts: **1 Critical, 10 Important, 11 Minor.**

Holds as written. The quota arithmetic: 3.5-lite 45+120+120+20+20+8+20 = 353, and 3.1-lite ≈ 257. The bare arms are mains-only, 20 each:
`answers.mjs:289` drops follow-ups unless `--captured`. The 14 per-arm graders + 6 blind = 20. `falsefail-eq` is calibrated: it reproduces 30.9 %
and the table matches. `[Main] verbal hedge: on trigger=5000ms` and `[Main] follow-up parent: off` are real startup strings
(`verbalHedge.ts:67`, `main.ts:3448`). The diag line is emitted before the knowledge step, so 1(b) does not need h40d's
"net of short-circuits". The bars 2b/2c/2d/3a and the stall bar ceil(2·20/39) = 2 match the replay at this size.
Rule 1(a)+(c)+(d)+(e) mean the hour cannot PASS with the flag absent or the block missing from the captured bytes. But see I6
for the reverse case: a spurious VOID, or a crashed control.

## Critical

**C1. A 3a FAIL ("no gain") has no verdict.** Reg. line 147 gives PASS only if rules 2–5 all PASS. §5 (lines 291–307) is
"the first of these that applies". 3a's FAIL (line 201) is not in item 1's list (line 293: 4a–4d, 2a–2d, 5a, 5b). It is not
VOID, not other FAIL, not INCOMPLETE, and item 4 holds only "3a between its lines". A no-gain hour therefore matches no item,
which leaves the verdict to post-data negotiation. The replay closed the same gap with "FAIL on any FAIL clause … INCONCLUSIVE
otherwise" (replay §7 line 280).
*Fix.* Insert into §5, after item 2 (VOID) and before 2b: "**2a. FAIL (no gain)**: 3a at or below its FAIL line. The flag
stays OFF, as for a feature-attributable FAIL (the consequences paragraph applies), and holdout40 is not flown." Add this as
the last line of the ladder: "Any clause outcome not named above (a breached bar without its own FAIL line) = INCONCLUSIVE."
That closing line also covers I1.

## Important

**I1. 2c and 2d have grey zones, and several breaches have no verdict.** Line 186 has a 2c median PASS of ≤ +500 and FAIL
of > +1000, with nothing for the band between. Line 188 does the same for 2d (≤ +5 / > +10). The 2c stall clause and the
2c p90 clause (lines 186–187) and 2a (line 181) state a bar but no FAIL line. Yet §5 item 1 (line 293) says "2a–2d beyond
their FAIL lines". The replay fixed each one explicitly (replay lines 262–269).
*Fix.* Add after line 188: "2a, 2b, and the 2c stall bar: a breach = FAIL. 2c median and 2d between their lines = INCONCLUSIVE.
2c p90 breached = INCONCLUSIVE (replay 3b)." Add "2c/2d between their lines; 2c p90" to §5 item 4.
In 2b's coverage fallback (line 185), "TTFT decides at +1.0 s" should read: "2b's FAIL line becomes 2c's median > +1000 ms."

**I2. The arming quota bar does not give the ≥ 100 margin the file claims.** Lines 343–347 claim "147 under the 500 cap, so
the ≥ 100 margin holds". That was true when the ledger was read at 10:45 on a fresh day. A1.1 (line 13) moves the read to the
evening, after the smoke and the day's other use, but keeps the "≥ 400 headroom" bar. 400 − 353 = **47**, and the idle pings
on 3.5-lite are not in the 353.
*Fix.* In A1.1, replace "≥ 400 headroom per lite" with "**≥ 453 on 3.5-lite and ≥ 360 on 3.1-lite** (the estimates + 100);
less = no flight tonight." Alternatively, keep 400 and write "margin as low as 47, accepted". Either way, state that the
slim-prompt A/B (agenda: Mon 5 Oct) did not run and will not run on this quota day (§6 line 343).

**I3. A1's premise "2a–2d are same-hour twins" is false for 2c, and the evening makes it worse.** Block reps r1–r3 are the
harness's `captured-high*` arms, run minutes after the hour inside the chain. Block r4–r5 and all no-block reps run later,
after the post-hour reader computes G. A1.4 (lines 44–45) allows that until 10:00 the next day. A 21:00 block side can
therefore be paired against an 08:00 no-block side. The harness exists so that "nothing is compared across times of day"
(`interview60.flight.mjs:113–114`), and the replay interleaved A/B per (item, rep) for exactly this reason (replay line 194).
§6 already ungates 2c when the sides run on different days (line 353). The same confound exists within one quota day.
*Fix* (zero quota). Add to A1.1: "2c gates only if the G arms start ≤ 2 h after the chain's `captured-high-r3` pass ends
(answer-file timestamps). Otherwise 2c is reported, not gated, under the same terms as §6's departure. 2b, 2d, 3a, 4b and 4c
still gate."
Alternative fix: re-run block r1–r5 on G interleaved with no-block in one sitting (+20 calls on 3.5-lite), and compute 2c on
those reps only.

**I4. The window instrument rejects every evening start, and the new window crosses midnight.** §6 (lines 324–325) says the
start is read *first* from `h40c-hedge-stats.mjs`. That script hard-codes the daytime window: line 271
`inDaytimeWindow = … DAY_WINDOW_START_MIN … DAY_WINDOW_END_MIN` and line 357 `'IN WINDOW 12:00-15:00' : 'OUT OF WINDOW (cannot PASS)'`.
A1.1 changes the window to 19:30–01:30 but not the instrument. A minutes-of-day comparison cannot express a window that
crosses midnight.
*Fix.* In A1.1: "The start is judged against absolute instants: 2026-10-05T16:30:00Z ≤ startedAt ≤ 2026-10-05T22:30:00Z. A
re-pointed copy `E\window-eq.mjs` reads this, calibrated on 19:29 / 19:30 / 23:59 / 00:00 / 01:30 / 01:31 local and on
00:30 of 2026-10-05 (out). The `h40c-hedge-stats` window line is ignored for this hour." This is zero quota and can be
built pre-hour.

**I5. The contamination check in A1.2 cannot fire as written, and it defers the consequence to a post-data ruling.** Line 23
says "a dispatch window the reader (b5) joins to no roster item is named and the user rules on the hour". The join is by play
window, and `interview60.prompts.mjs` `idsForDispatches` assigns every dispatch in [playedAt_i, playedAt_{i+1}) (the last
item +300 s) to item i. Stray speech in mid-hour therefore never "joins to no item". It shows up as an extra dispatch of the
preceding item. For this feature that is not cosmetic, for two reasons:
- That dispatch writes the ledger, so it becomes the next follow-up's parent (5b's wrong referent).
- It can become the captured prompt the twins replay for that id.
"The user rules" is a rule chosen after data.
*Fix.* Replace that A1.2 sentence with: "Contamination = a run-window dispatch whose pinned question matches no roster text by
`sameAnchor` (ids and counts only). The b5 reader computes it, calibrated on the smoke's invented `WHY` clip (must read
unmatched) and on the 2026-10-01 21:00 log (must read ≥ 1). **≥ 1 contamination window = VOID, as rule 1(i)**: re-fly. §5
item 1's FAILs are still read, except a 5b wrong referent whose parent is the contaminating text."

**I6. A block that is built but not inserted (plan m3), and doubles, give a spurious VOID or a crashed control.** The plan
says `chars` is "built, never inserted": WhatToAnswerLLM drops the block on coding framing, decided by `classifyIntent` after
the diag line. A `gate=block` window can therefore carry no LABEL (plan lines 1339–1341, 14).
- Rule 1(e) (lines 162–164) then mismatches, giving a false VOID.
- G (line 139) includes the id, and `--no-block --only <G>` refuses (exit 2) the whole run on a prompt with no block (b4,
  line 378).
- The same happens when the per-id captured prompt is another dispatch of that id (a double, or I5).

*Fix.*
- Define **G_twin = {id ∈ G : that id's entry in `interview60.prompts.json` carries the LABEL}**. Rules 3a, 4b, 4c and
  2b–2d, and the G-arm `--only`, use G_twin. An id in G \ G_twin is named with its cause: coding framing, double, or I5.
- Recast 1(e): "every `gate=block` window whose own `verbal-prompts.log` capture is verbal framing carries the LABEL, and
  every LABEL capture has a `gate=block` window."
- A `gate=block` on coding framing is named "built, not inserted", excluded from G, and counts as a G\* miss in 1(c).

**I7. A1 moves instruments to after the data without a blindness rule.** §7 (line 358) said "Blocking checklist before arming
(none is optional)". A1.4 (lines 44–47) moves b5, b6, b8, b10 and the cue re-points to post-hour, while A1.5 says the
registration is "Unchanged". The reader and the twins adapter compute G, 1(b)/(c)/(e), 3a, 4b and 4c. Built after the run
folder exists, they can be fitted to it, knowingly or not.
*Fix.* Add to A1.4: "Each post-hour instrument is written, calibrated on §7's known cases and Opus-reviewed. Its sha256 and
cal output are recorded in E **before its first run on the run folder**. Until then, the run folder is opened only for
the launcher-log proof lines. An instrument edited after its first run on the hour's data re-runs its full calibration, and
the edit is named in the result note."
Also amend §7's header and §11 line 519 ("b1–b10 outputs quoted") to read "b1–b4, b7, b9 at arming; b5, b6, b8, b10 per A1.4".

**I8. The night-safety items are reads, not gates.** A1.2 (lines 25–26) says "sleep never" and "no restart pending" are
"read once … quoted in §11", with no refusal if they fail. Three gaps remain:
- An already-downloaded Windows Update can restart outside active hours overnight, and the pending-reboot read cannot see
  it.
- After the hour, the PAIRED_ARMS run with no audio and no input, so idle sleep can cut them off.
- What a mid-chain sleep or restart means is not stated.

*Fix.* In A1.2:
- Make these gates, each one a no-flight-tonight on failure: AC standby timeout = 0 and AC hibernate = 0 (`powercfg /q`);
  no pending reboot; active hours covering T−30 min → T+5 h, or the user pauses updates for 1 day. The pause is the user's
  own action; the controller does not change system settings.
- State the outcome of a mid-chain interruption: the hour cut short → VOID under 1(f); arms lost → INCOMPLETE, re-run the
  same quota day.

**I9. The unattended precheck at T−6 min has no mechanism and no consequence.** A1.1 line 16 sets the time only. Session crons
do not fire while a background agent or a Monitor runs, and the per-task reviews will be running then. h40d armed its
precheck with a background PowerShell sleeper. As written, a failed precheck changes nothing: the task flies anyway.
*Fix.* "Armed as h40d's (a background sleeper, not a cron). Any failed line: the precheck disables `Natively-flight-eq`
(`Disable-ScheduledTask`) and writes why → no hour, re-fly under §6. A precheck output missing at T = VOID, as rule 1(j)."

**I10. The grader dispatch text has 11 rows for 14 per-arm files.** b8 (line 412) says "h40d's text with **eleven** per-arm
rows". §2 (line 94) and §11 (line 506) say 14 per-arm graders: in-app, captured-high ×3, no-cue ×3, captured-low ×3, and
four bare arms. A table built to b8 leaves three arms ungraded, which breaks "grade everything" and the bare-arm rule.
*Fix.* Change line 412 to "fourteen per-arm rows (the arms of §2 line 92–94), plus the blind-file rows". Do the same for
`eq-merge.cmd`'s arm list.

## Minor

- **m1** (line 200–201). The 3a FAIL line `floor(0.05 × pairs)` is not the replay's `ceil(pairs/21)`. They agree at 20 pairs
  but not at 19, where one gives 0 and the other 1, so a +1 becomes INCONCLUSIVE instead of FAIL. Use `ceil(4·pairs/21)` and
  `ceil(pairs/21)`.
- **m2** (lines 134, 370; A1 line 36). The block length range should be 200..**578**, as plan m5 sets it. The smoke now
  also carries `WHY` (5/5 exercised, `gate=parent-in-prompt`). b5's smoke calibration (line 388) must expect it as a
  non-roster window, which is also I5's known case.
- **m3** (line 231). 4c has no false-FAIL price; the replay priced its off-topic clause (replay line 257). Run
  `falsefail-eq` at off-topic rates of 5/10/20 % on 20 pairs and quote the result.
- **m4** (lines 521–522; A1 line 43). "This file's sha256 as committed" inside §11 refers to itself. Define it as the sha
  before §11 was filled, and record the committed sha in the launcher log and the result note.
- **m5** (line 12–13). The registration says an amendment goes "at the end". A1 is a separate file. Say in §11 that A1 is
  the dated amendment, committed beside it, and cite its sha.
- **m6** (line 352). The G-arm re-read bars ≥ 40 / ≥ 20 fit |G| = 4 only. Use formulas: ≥ 7·|G| + 12 on 3.5-lite and
  ≥ 3·|G| + 8 on 3.1-lite. At |G| = 6 the fixed 40 is short.
- **m7** (lines 95–97). The blind-file and grader counts are given at |G| = 4 only. State the formulas: front
  ceil(10·|G|/24) files, back ceil(6·|G|/24), each × 2 graders.
- **m8** (line 271). "no-parent expected once: the first question of the hour" is doubtful. The readiness probe dispatches
  before the run window and writes the ledger, so S1Q01 likely reads no-cue. This is reported only, so reword it.
- **m9** (line 20). SP is defined as "the controller's scratchpad". Pin it to `natively-lab\sp`: Temp is swept by Storage
  Sense (agenda 2026-10-04 00:02), and the chain and post-hour instruments must not reference Temp paths.
- **m10** (line 98, b8 line 407). The file says 1 alias probe in one place and 2 (`cwdprobe-1`, `cwdprobe-2`) in another.
  Pick one.
- **m11** (line 206–208). At the replay's B rate of 24/40, P(3b < 2 of 4) ≈ 18 %, which means one re-fly. Name that price
  beside the bar, as 4b names its own.

## Not checked

- I did not run any instrument.
- The build, the smoke, the guard and `--no-block` do not exist yet. Their calibrations are taken as specified.
- The 3.5-lite ping rate on this build is not measured; I2's margin assumes about 10.
- Whether `classifyIntent` actually labels any G\* item as coding on live STT is unknown. The replay's captures were verbal,
  so I6 is a guard against a possible case, not a predicted failure.
