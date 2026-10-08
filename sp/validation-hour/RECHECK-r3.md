# Re-check: PREREGISTER-h40d, revision 3 (scoped)

Re-checker: Opus (`claude-opus-5-5`), 2026-10-01, from about 09:45 local. I am the last reader before the user.

**Scope** (`recheck-r3-brief.md`), in five checks:
1. the edits against `RECHECK-r2.md`;
2. internal consistency and the numbers;
3. the user's decision list;
4. the facts that arrived after revision 3 was written at 09:27;
5. anything that would make Friday's hour unreadable.

**How it was done:**
- **Writes.** I wrote only this file and the scripts and outputs in `VH\recheck-r3-scratch\`. Everywhere else was read-only.
- **The scripts** read files and print ids, counts, lengths, hashes and token numbers.
- **Other calls.** One PowerShell read of the scheduled tasks. Git reads of shared refs, made from the worktree; no git call in MAIN's checkout.
- **Not run.** No test, build, npm, tsc, API or model call; the app was never started; no subagent.
- **Not read.** No `.env`, key, `credentials.enc` or `verbal-prompts.log`, and no prompt or answer text. The one prompts-file read counted the `[CUES FIRST]` mark per id.

Line numbers are revision 3's (`PREREGISTER-h40d.r3.md`).

## VERDICT: READY WITH FIXES

**Findings: Critical 0 · Important 1 · Minor 8.**

**What is fixed.**
- **The edits match the re-check.** Revision 3 is revision 2 plus exactly the 71 edits of `r3-edits.txt`, byte for byte.
- **Every edit of `RECHECK-r2.md` is applied,** verbatim or with a deviation that `CHANGES-r3.md` states.
- **Every calibration revision 3 cites reproduces byte for byte.**

**What is left.**
- **One gap needs a ruling before arming (finding 1).** A twin record with no text at all fits neither empty-prose kind that revision 3 names. Its place in 3c's gated clause can be read two ways. Applied to the bench's own result pattern, the reading decides whether the hour STOPs.
- **Everything else is text:**
  - the bench's facts, written in, including what its deficit means for Friday (finding 2);
  - ruling 6, named for the user's veto (finding 3);
  - a 3a miss under an INCOMPLETE 3c that reads two ways, and NOISE re-flies with no cap (findings 4 and 6);
  - one gated reading with no instrument (finding 5);
  - two command details (findings 7 and 9);
  - three wording leftovers (finding 8).
- **No new data and no model call are needed.** The edits below are verbatim. Each OLD occurs once in revision 3, and all apply in order (`check-anchors.mjs`: 28 of 28).

## 1. The edits against RECHECK-r2

**Revision 3 is revision 2 plus the 71 edits, and nothing else.**
- `reapply.mjs` re-applies `r3-edits.txt` to revision 2 in memory, using the header time revision 3 carries (09:27).
- Every OLD occurs exactly once when it is applied.
- The result equals `PREREGISTER-h40d.r3.md` byte for byte (sha256/16 `a9033d6c8815d0a5`, 1018 lines).
- So the diff from revision 2 to revision 3 is exactly these 71 hunks. `reapply.mjs` prints each one with its revision-2 and revision-3 line.

| item | hunks (names in `r3-edits.txt`) | how it was applied |
|---|---|---|
| N1 | E04, E08, E42, E43, E48, E49, E50, E60, E63a; parts of E03, E40, E52, E58, E63d, E65 | N1-a to N1-d as asked, plus ruling 1's pins: the §2 row, guard check 13, §7.3a and two instruments. Stated in CHANGES-r3. |
| N2 | E16, E19, E20, E22a, E22b, E27, E53a, E53b, E55; parts of E63d, E64, E65 | N2-a, N2-d and N2-e verbatim. N2-b and N2-c sit inside the rewritten clause. N2-g is the default (ruling 2). N2-f's case (8) is restated for both readings. Stated. |
| N3 | E25, E26 | Verbatim, with one clause added to N3-b. Stated. |
| N4 | E21, E28 | N4-b verbatim. N4-a is written in the flight's own command form (`flight.mjs:350–353`, checked). Stated. Its environment is incomplete: finding 7. |
| N5 | E46, E47a, E47b | Verbatim. The wait it adds is unproven: finding 9. |
| N6 | E11, part of E52; the script | The edited `h40d-thoughts-noise.mjs` equals the re-check's tested copy (sha256 `066f5e81…`). The revision-2 backup differs only in those two lines. |
| N7 | E07, E23, E24 | Verbatim; E24 adds the 1(b) cross-reference. |
| N8 | E02, E05, E12, E15, E54 | Verbatim. N8-b's old wording survives in two places the re-check did not name: finding 8. |
| N9 | E45, E56, E59; part of E41 | Verbatim. |
| I5 | E14, E29–E34, E36, E37, E38, E62; part of E65 | I5-b, -c, -d, -e, -f and -h verbatim; E14 and E36 carry I5-d into rule 2 and the §5 bullet. I5-a and I5-g are replaced by ruling 6: the deviation is stated but not reasoned (finding 3). |
| GRADER DRIFT | E39, E61; parts of E40, E58, E63d | GD-a to GD-e, with ruling 5's default (ii). Stated. |
| M13 | E17, E18, E35 | Verbatim. |
| §12 | E64 | The veto paragraph, plus "Only the user". |

**Hunks that trace to none of those items:**
- E01: the title.
- E06: §3, the re-smoke's clocks.
- E09: 2a's calibration list.
- E10: 2b's sources.
- E13: 2e's branch, decided.
- E44: §7.2 names the re-smoke.
- E51: §7.4, the clocks script's calibration.
- E57: §7.6 names the run folder.
- E63b and E63c: §11, the re-smoke and the bench's start.
- The fact sentences inside E03, E40, E41 and E65.

**Where those hunks come from:**
- **New facts from after the re-check:** the 05:00 re-smoke's PASS, its clocks, its `hold-read` GONE, and the bench's 09:04 start.
- **The re-check's own requests:** its residual-risk request (G beside br1's) and item 4 of its user list (2e's branch).

I checked every number in them against its source (section 2). Only E13 changes a rule, and it does so through revision 2's own condition: GONE means gated.

## 2. Internal consistency and the numbers

**The calibrations reproduce byte for byte.**
- `run-calibrations.mjs` writes into VH, so I ran a copy with the same cases that writes into my folder (`rerun-calibrations.mjs`).
- `diff` against all three saved outputs is empty: `clocks.cal-r2.out.txt`, `thoughts-noise.out.txt` and `knowledge-mode.out.txt`.
- The knowledge-mode read includes the real settings file through the admin share: 151 bytes, mtime 2026-09-12T00:09:43.918Z, ON. So nothing has written the real file since 2026-09-12; the user's live look has not touched it yet.

**CHANGES-r3's diff claims hold.**
- The clocks output adds three blocks to the re-check's copy and removes nothing.
- The thinking-token output changes the holes line's wording (three lines) and adds the s50e case; nothing else.

**Numbers checked against their sources:**
- **The re-smoke's clocks:** screen 4.742 / 5.770 / 5.999 s; model 4.232 / 5.162 / 5.379 s; G 0.594 / 1.112 / 1.147 s; C 0.052 / 0.192 / 0.193 s; cues → first token 0.002 / 0.007 / 0.091 s; 2d 0 in 20 and in 22 windows. G's median sits 0.594 − 0.501 = 0.093 s above br1's.
- **The re-smoke's hold:** `hold-read.resmoke2.out.txt` reads n 21, R2 and B under 15 ms in 0, T median 370 ms: HOLD GONE.
- **The re-smoke's result:** CHECK EXIT 0, 20/20, 8 of 8, cue row 20/20, 7 trimmed, filter sha `42d9bc42dbd17870`.
- **Rule 1(g)'s known case:** one window without `Intent classified` in 24 and in 22. In both runs it is the first window of the run proper, with G 8 ms and 2 ms.
- **The gated clause's null:** `gated-null.mjs` re-run gives the strict clause 12.3% / 20.2%, the sums clause 0.9% / 3.1%, and the 28.3% bound.
- **Code citations, in the code that flies:**
  - `git diff --stat d83fdfe HEAD` over the app paths is empty, so the worktree's code is the code that flies.
  - Settings and knowledge mode: `main.ts:687`, `ipcHandlers.ts:3030`, `SettingsManager.ts:28` (the path) and `:6`, `KnowledgeOrchestrator.ts:312`, `LLMHelper.ts:2441`.
  - Harness: `answers.mjs:129–133`, `:192`, `:314`; `flight.mjs:170–174`, `:204–206`, `:341–353`, `:358`, `:388`.

**Pairs read after the edits that agree:**
- §4's PASS condition and §5's six items with their bullets;
- items 1 and 2: cue failures are read in an hour that is VOID on 1(a)–(c), (f) or (g), and not under 1(d) or 1(e);
- 2a's provider reading and items 1, 4 and 5;
- 5a's three cases and 1(f);
- 3c's sums default and its known cases (h40c: total 1 against 0, PASS; h40b the same);
- case (8)'s arithmetic: 2 > 0 + 1 STOPs, 1 ≤ 1 does not;
- GRADER DRIFT (ii) and 3a NOISE: under drift 3a is reported, so NOISE cannot arise;
- the re-run's `--only` and `answers.mjs:314`.

**What disagrees or is left open:**
- a 3a miss while 3c is INCOMPLETE (finding 4);
- ruling 6 against item 1's sentence forbidding resampling (finding 3);
- the 3a noise reading, which no instrument computes (finding 5);
- the number of NOISE re-flies (finding 6).

## 3. The user's decision list

**Revision 3's five items each carry their default, with three gaps:**
- **Item 3 omits the single-event consequence.** That consequence is what separates its two choices, and the 3c text states it.
- **Item 5 is resolved.** The bench read +55 tokens (finding 2).
- **Three choices sit in the text without being named to the user:**
  - ruling 6's consequence, listed only as "the precedence edits (I5)" (finding 3);
  - how a no-text record is read in the gated clause (finding 1);
  - NOISE re-flies having no cap (finding 6).

The list as it should stand is at the end.

## 4. New facts after 09:27

**a. The bench PASSED.**

Revision 3 depends on its outcome in four places:
- **The precondition "the bench PASSED":** met, by the 09:36 result.
- **2c's first real reading:** +55 tokens over the three reps (pooled medians 955 against 900, n 116 a side). That is within 150, so the user's item 5 does not arise. Revision 3's own command reads the bench's rep 1 as missing, because it is tagged `cues-r1`. It then prints +83 on two reps.
- **The quota day:** the calls ran 09:04–09:16, all on the 2026-09-30 quota day. Nothing reached the 2026-10-01 quota day or the flight's.
- **The day rule:** the preferred branch held, except for the 09:00 line, which revision 3 already reads as taken.

The deficit (−2, −3 and −3 of 39):
- **No rule depends on it, and none should.** The bench is the gate it was registered to be, and holdout40 is never tuned on.
- **It changes what Friday will likely read** (finding 2). If the cost is real and carries over, 3c's band STOPs in roughly a third to a half of hours, and a 3a miss tends to read as NOISE. Revision 3 says neither.

**b. The no-text record (S2Q06F, cue rep 1).** Finding 1. Revision 3 counts it as follows:
- **The all-ids line:** wrong, without ambiguity. It is empty prose.
- **As a hole:** no. It has no `transientError`, so it stays in the cue check's n as an absent block, which is how the bench counted it. 2c excludes it.
- **The gated clause:** two readings.
  - 3c's empty-prose sentence counts empty prose "as wrong on either side", then names two kinds.
  - The counting rulings say "in its gated clause only as rule 3c's 'wrong' says (a block-only twin yes, a `filterCodeFences` emptying no)".
  - The adapter's "stage that emptied it" has no value for a record with no text.
- **Who rules:** the controller. The proposed rule and its consequence for a STOP are in finding 1.

**c. The simple-question probe.**

Revision 3 relies on it once, and only through a file. §7.6 takes the 05:00 re-smoke's `interview60.prompts.json` ("which the probe needs anyway") as `hasCueRule`'s true case. That reliance still holds:
- The file was built at 09:11:58, before the probe's first call at 09:16.
- `probe-shipped.mjs` writes only its own output file (`:189`, `:198`), so the void run's swap happened in memory.
- 19 of the 19 ids with a system and a user turn carry `[CUES FIRST]` (`prompts-mark-count.mjs`). h40c's file, the known-false case, has 0 of 44.

The probe's void run touches nothing in revision 3.

**d. Also moved since 09:27 (docs only; revision 3's refresh rule covers it).**
- MAIN's tip is now `73d7f01` (ET38's result: one file under `passes/`).
- The cue branch's tip is now `c2fff1e` (the bench and probe records).
- The refreshed prep merge `a4aea78` (`merge/cue-mode-final`) passes revision 3's checks:
  - its parents are `73d7f01` and `c2fff1e`;
  - `git diff --stat c2fff1e a4aea78 -- . ':!electron/test/golden/passes'` is empty;
  - the qualifying-HEAD diff from `d83fdfe` over the app paths is empty.
- ET38 has run, and no scheduled task can run it during the hour.
- No rule changes. §1's "MAIN's tip is `fed4b07`" is now stale text; §11 records what flies.

## 5. Friday's readability

**Scheduled tasks.** I listed every enabled task due between Thursday 10:00 and Saturday 10:00:
- **Friday 12:00–16:30:** nothing is due.
- **`Natively-probe-live38`** (Live 3.8, one-shot triggers, 20 min limit) fires for the last time on Thursday at 20:00, on the prestart's quota day. §7.3's "outside any other task's window" therefore means the prestart must avoid 20:00–20:20.
- **Everything else** in that span is a Windows, Office, OneDrive or Google task, or `regular-commit` (Thursday 22:24). That one runs `DV_GenAI\regularCommit.py` in another folder, and the script names neither natively nor cluely (a count, not a read).

**Every gated rule can be computed from what the flight writes,** except the 3a noise reading (finding 5):
- The answer records carry `spoken`, `cues`, `finish`, `rawLen`, `raw` and `thoughts` (`answers.mjs:192`).
- The flight copies them into the run folder (`flight.mjs:358`).
- The run folder's debug log includes the startup `ENABLED` line (on h40c it sits before the run window).

**Checks that cannot fail:** none found. Every new instrument has a known case that fails.

**Two command details could cost the same-day window or bring back a race:**
- the re-run's roster environment (finding 7);
- the prestart's wait (finding 9).

## Findings

### 1 (Important). A twin record with no text falls between revision 3's two empty-prose kinds, and its reading can decide a STOP

**Where:**
- 3c's "Empty prose in this clause" paragraph (386–391);
- the empty-prose definition under "Counting per rep" (401–404);
- the counting rulings (528–529);
- the adapter's specification (762).

**Evidence:**
- **The record** (`bench-2c-and-notext.out.txt`). In the bench's `..._cues-r1.json`, S2Q06F has no `transientError`, `rawLen` 0, finish `MALFORMED_RESPONSE` and 785 thoughts.
  - `cuebench-score.mjs` counted it consensus-wrong and as an absent block (rep 1: present 38/39).
- **How rare it is** (`finish-scan.mjs` and its dedup variant, with one byte-identical file counted once).
  - Without the cue rule, every lite record finished `STOP`, with no text missing from any: 1,701 on 3.5-lite and 2,304 on 3.1-lite.
  - With the cue rule there are 117 bench records, and this is the only one without text.
  - The simple-question probe's re-run adds 52 more 3.5-lite HIGH calls under the cue rule, with no record lacking text (the `noText` column of its result note).
- **The app's side, by the code** (`LLMHelper.ts:3484–3521`; not seen live).
  - A front leg that ends without a token resolves `empty`.
  - The back leg then starts with `reason=front-empty`, so 3.1-lite answers a front reply that has no text.

**Why it can decide a STOP:**
- **Apply the bench's own pattern to the 40 gated ids:**
  - cue rep 1 has the record with no text;
  - cue rep 2 has one genuine wrong (the analogue of S1Q02);
  - the control's total is 0, because N2's split keeps its fenced emptying out of the clause.
  - If the record counts, the cue total is 2 ≥ 0 + 2: a STOP under the default. If it does not count, the total is 1: PASS.
- **Under the strict alternative,** a single counted record on a gated cue id STOPs whenever the control's worst rep is 0. It was 0 in all nine reps of h40a–h40c.
- **How often it would fire:**
  - At the rate seen under the cue rule (1 in 169), 120 gated cue records expect 0.71 such records an hour: P(≥1) 51%, P(≥2) 16%.
  - The rate's 95% interval is wide, 0.015% to 3.25%.
  - Nothing shows that cue mode causes it. It has only never been seen without cues.

**The proposed rule (the controller's to rule):**
- **The record counts as follows:**
  - it is not acceptable;
  - it is wrong in the all-ids line, named with its finish reason;
  - it is an absent block in the cue check's n, as the bench counted it;
  - it is in neither side's gated clause;
  - it is not a hole and is never re-run.
- **Consequence for a STOP:** it can STOP 3c only through the band, or through the cue check once one rep of 44 holds five such records or malformed blocks (0.9 × 44 = 39.6). It never STOPs 3c through the wrong clause, under either the default or the strict alternative.
- **Why this reading:** the gated clause counts wrong answers. A reply with no text is a failure to deliver, and the live hedge answers it from its back leg. It still costs the band and the cue check, and the result note names it.
- **Why it is the controller's:** it closes a gap inside a counting ruling the controller already made, by reading that ruling's "only" literally.
- **What the user decides:** it is listed in §12's veto paragraph and in the user's list. The alternative, counting it in the clause on either side, is the user's to choose; its consequences are stated above.

**Edits:** F1-a, F1-b, F1-c, F1-d, F1-e, F1-f, F1-g, F1-h (item 6).

### 2 (Minor). Revision 3 lacks the bench's facts, and one of them changes what Friday will likely read

**Evidence:** `passes/2026-10-01-cuebench-result.md` (lines 12–15, 22–26, 54–58); `bench-2c-and-notext.out.txt`; `bench-2c-r3-command.out.txt`; `band-power.out.txt`.

**2c's first real reading is +55 tokens over the three reps, within 150.**
- Rule 2c's command as written reads only two reps. The bench's rep 1 file is `_cues-r1`, but `h40d-thoughts-noise.mjs:52–56` reads `''`, `-r2` and `-r3` and prints no line for a missing file. On r2 and r3 alone it reads +83.
- Both readings pass, and the three-rep figure is the reading.
- On Friday the flight's tags match the script. A missing rep file would also stop 3c's adapter, because `benchDecide` throws without three reps. So this is a note, not a risk to Friday.

**The bench's calls ran 09:04–09:16 (117 calls, 0 transient errors).** §11's last call is now known, and no call reached the 2026-10-01 quota day.

**The deficit.**
- The bench rated the cue arm lower by 2, 3 and 3 of 39: 15 ids lower, 6 higher, sign test p = 0.078.
- Suppose a real cost of that size carries to holdout40's 44 ids, about −3 per rep:
  - 3c's band STOPs in 29–49% of hours, with no effect 2–3% (`band-power.mjs`; iid normal reps, integer counts, ties pass).
  - That range uses rep-to-rep SDs of 1.5–2. The holdout's 3.5-lite HIGH twins: 37/42/38, 38/36/39 and 36/37/38, pooled SD 1.86 (`twin-wrongs.mjs`).
  - So a PASS does not exclude that cost.
- Rule 3a's noise reading compares the in-app count with cue twins that carry the same cost, so under it a 3a miss tends to read as NOISE (finding 6).
- Revision 3 says neither. Its §5 PASS bullet says only that a PASS is not evidence of an improvement.

**Edits:** M1-a, M1-b, M1-c, F1-h (item 5), F1-i.

### 3 (Minor). Ruling 6 lets a cue failure seen on 2c or 2e be re-flown away

**Where:** §5 item 1 (544–546), item 5 (556), the NO LATENCY VERDICT bullet (583–585), §6 (592–594), §13 (1004–1006).

**What:**
- Item 1 says "Sampling until it passes is not allowed", and it reads cue failures even in VOID hours.
- Its next sentence exempts an out-of-window hour from every clause of rule 2, "and the re-fly inside the window decides it".
- The window exists to control provider load, but neither clause depends on it:
  - 2c reads thinking tokens ("Provider load cannot move a token count"), on twins that run after the hour wherever it started;
  - 2e reads the parser's hold fingerprint, which load can only lengthen.
- So, for exactly the two cue clauses that do not depend on load, an out-of-window hour is treated more leniently than a VOID one.
- CHANGES-r3 (d) and §13 state the deviation from I5-g, but neither gives a reason beyond the ruling.

**Severity:** Minor, because an out-of-window hour is unlikely (13:30 fires gave 13:36 starts, and StartWhenAvailable is off). It is for the user's veto.

**Edits:** F1-g and F1-h (item 7); if the user vetoes, M2-a to M2-e.

### 4 (Minor). A 3a miss while 3c is INCOMPLETE can be read two ways

**The two readings:**
- **INCOMPLETE:** item 4 (555) says so, and item 3 (550) allows an other FAIL only "with 3c decided".
- **Other FAIL:** rule 3a (355–356) says "A 3a miss without both is an 'other FAIL'", where "both" means 3c PASS and the gap, and an INCOMPLETE 3c is not a PASS. §5's 3a bullet (578–579) says "otherwise an other FAIL as above".

**Why it matters:** the consequences differ. INCOMPLETE re-runs the holes the same quota day. An other FAIL goes to the user's choice between revert and re-fly.

**Edits:** M3-a, M3-b.

### 5 (Minor). Rule 3a's noise reading has no instrument and no calibration

**The gap:**
- The reading decides between a re-fly (item 5) and an other FAIL (item 3).
- No script in §7.4 prints it.
- Rule 8 requires every instrument to be shown failing once, and there is no case for this one.

**Known cases** (`noise-gap.mjs`, ids and counts only; M13-b's quoted figures reproduce):
- h40c: 35 against 36 / 37 / 38, gap 1.
- h40b: 35 against 38 / 36 / 39, gap 1.
- h40a: 39 against 37 / 42 / 38, above. R09, the negotiation card, is not shared.

A failing case needs a synthetic one: h40c with two acceptable answers set to weak, gap 3.

**Edit:** M4-a.

### 6 (Minor). Nothing caps 3a NOISE re-flies

**What:**
- §5 item 5 and the NO LATENCY VERDICT bullet: under NOISE the hour "cannot PASS; re-fly inside the window". Nothing limits how many times.
- Each re-fly is a new holdout hour under the same rule.
- Under finding 2's cost, NOISE becomes the likely reading of a real 3a miss. The hour could then be re-flown until 3a passes by noise, which is the resampling item 1 forbids for cue failures.

**For the user:** decision item 8. The default is as written; the alternative is edit M8-cap.

### 7 (Minor). The same-day re-run's command leaves out the roster environment

**What:**
- 3c's counting (408–414), N4-a as applied: `node electron\test\golden\interview60.answers.mjs … --only <ids>`, run "from MAIN".
- `answers.mjs` takes its roster from `NATIVELY_ROSTER` (`roster.mjs:36`, default `interview60`). It refuses a resumed file that holds foreign ids (`answers.mjs:277–283`, exit 3).
- From a plain shell the re-run fails loudly. The time lost comes out of the same-day window that §5 relies on.

**Edit:** M5-a.

### 8 (Minor). Wording left behind

- **§11 (910) still says "2c's first known case".** N8-b corrected the phrase in rule 2c (284), but the re-check named only that line. §12 item 4 (940–941) still has "its thinking-token difference adopted instead", meaning adopted as a known case. Edits: M1-a, which replaces §11's line, and M6-a.
- **§11 (917) says "`h40d-twins` cases 1–7".** Revision 3 added case (8), and finding 1 adds case (9). Edit: F1-e.
- **3c's default (373–374) says "named and read item by item (§5)".** §5's item-by-item reading is the procedure for an other FAIL, and under the default a single gated wrong is not a FAIL. Edit: M6-b.

### 9 (Minor). The prestart's 60 s wait has never been run here

**What:**
- §7.3 (666) uses `timeout /t 60 /nobreak`, from N5-a, the re-check's own edit.
- No `.cmd` file in SP, or one folder below it, calls the `timeout` command. Of the 70 files, five contain the word, and each match is an environment variable's name or node's `setTimeout`.
- `timeout` refuses at once when its input is redirected ("Input redirection is not supported"). Under the task's interactive logon it will probably work, but it has never run here.
- If the wait does nothing, N5's race returns: a cues line without its full line reads NOT CLEAN.
- A wait that cannot refuse, with its two timestamps in the log, settles the question.

**Edit:** M7-a.

## Edits (verbatim, against revision 3)

How to read this section:
- Each OLD occurs exactly once in revision 3. The line given is where it starts.
- The main set (22 edits) applies in the order listed.
- Two sets are conditional, and each applies on top of the main set:
  - M2-a to M2-e only if the user vetoes ruling 6 (then F1-g's last clause reads instead "ruling 6 vetoed for 2c and 2e: outside the window they are read as in any hour (§5 item 1, §6)");
  - M8-cap only if the user chooses the cap.
- Proof: `check-anchors.mjs` (output `check-anchors.out.txt`) reads 28 of 28 unique, all applied in order, and its two deliberately wrong anchors fail.
- The edited copies are `r3-with-recheck-edits.md` and `r3-with-recheck-edits-and-veto6.md`, both in `recheck-r3-scratch\`.

### The main set (apply in this order)

**F1-a** (finding 1): 3c: the no-text record. Revision 3, line 391.

OLD:
````text
    answers) are fenced answers, and the combined build's chain still empties them (`recheck-scratch/replay-stages.mjs`).
````
NEW:
````text
    answers) are fenced answers, and the combined build's chain still empties them (`recheck-scratch/replay-stages.mjs`).
    **A no-text record** (re-check of revision 3) — no `transientError` and `rawLen` 0: the model returned nothing,
    neither a block nor prose (the bench's cue rep 1, S2Q06F, finish `MALFORMED_RESPONSE`) — is neither of the two: it
    counts wrong in the all-ids line and not acceptable in its rep, is named with its finish reason, stays in the cue
    check's n as an absent block (the bench counted it so: 38 of 39 present in that rep), enters this clause on
    neither side, and is not a hole (never re-run). By the code, the app's hedge starts its back leg when the front
    ends with no text (`LLMHelper.ts:3517`, `reason=front-empty`), so live such a reply is answered by 3.1-lite, not
    shown empty (not yet seen live). On file it has occurred only under the cue rule (1 of 169 3.5-lite HIGH calls:
    the bench's 117 and the simple-question probe's 52) and never without it (0 of 4,005 lite answer records, every
    one finished `STOP`; `recheck-r3-scratch/finish-scan.mjs`), so each one is named in the result note.
````

**F1-b** (finding 1): counting rulings: the no-text record. Revision 3, line 529.

OLD:
````text
(a block-only twin yes, a `filterCodeFences` emptying no)
````
NEW:
````text
(a block-only twin yes, a `filterCodeFences` emptying no, a no-text record no)
````

**F1-c** (finding 1): the adapter: the no-text record. Revision 3, line 762.

OLD:
````text
any other stage with cues present = a block-only twin, gated clause)
````
NEW:
````text
any other stage with cues present = a block-only twin, gated clause; `rawLen` 0 = a no-text record, all-ids line only, named with its finish reason, an absent block in the cue check)
````

**F1-d** (finding 1): the adapter: case (9). Revision 3, line 776.

OLD:
````text
strict alternative (both readings printed). Case (5)'s empty-prose record is built the same way.
````
NEW:
````text
strict alternative (both readings printed). Case (5)'s empty-prose record is built the same way; (9) the real
     no-text record, the bench's `WT\electron\test\golden\interview60.answers.gemini-3.5-flash-lite_cues-r1.json` S2Q06F
     (`rawLen` 0, `MALFORMED_RESPONSE`) → named as no-text, wrong in the all-ids line, absent in the cue check (that
     rep 38 of 39 present, as `cuebench-score.mjs` printed), in neither side's gated clause.
````

**F1-e** (findings 1 and 8): §11: the adapter's cases. Revision 3, line 917.

OLD:
````text
`h40d-twins` cases 1–7 `________`
````
NEW:
````text
`h40d-twins` cases 1–9 `________`
````

**F1-f** (findings 1, 3 and 6): §11: the new choices. Revision 3, line 924.

OLD:
````text
  the user's choice, made now: `________`.
- Rule 1(g) at arming:
````
NEW:
````text
  the user's choice, made now: `________`; a no-text record (rule 3c): out of the gated clause on either side — the
  controller's default — / in it on either side: `________`; ruling 6 for 2c and 2e outside the window: as applied /
  vetoed: `________`; 3a NOISE re-flies: no cap — the default — / one: `________`.
- Rule 1(g) at arming:
````

**F1-g** (findings 1 and 3): §12: the veto paragraph. Revision 3, line 960.

OLD:
````text
1; the precedence edits (I5); the GRADER DRIFT choice made now.
````
NEW:
````text
1; the precedence edits (I5); the GRADER DRIFT choice made now. And from the scoped re-check of revision 3
(`RECHECK-r3.md`): a no-text record kept out of 3c's gated clause on either side (rule 3c); ruling 6 named — outside
the window every clause of rule 2, 2c and 2e included, is reported, not gated (§5 item 1, §6).
````

**F1-h** (findings 1, 2, 3 and 6; the user's list): "Only the user": item 5 resolved, items 6-8. Revision 3, line 973.

OLD:
````text
5. **The bench's thinking-token difference, if above 150 tokens** (rule 2c): raised with the user before arming;
   never loosened quietly. Default: the threshold stays at 150.
````
NEW:
````text
5. **The bench's thinking-token difference, if above 150 tokens** (rule 2c): it read **+55 tokens** over the three
   reps (§11), so this does not arise; the threshold stays at 150.
6. **A no-text record in 3c** (re-check of revision 3): the controller's default keeps it out of the gated clause on
   either side (it costs its rep one acceptable answer and one present block, so it can STOP 3c only through the band
   or, five in one rep of 44, the cue check); the alternative counts it in the gated clause on either side (then ONE on
   a gated cue id STOPs under the strict per-rep clause when the control's worst rep is 0, and under the sums default
   it STOPs together with one more cue-side gated wrong when the control's total is 0). At the rate seen under the cue
   rule (1 in 169 calls), 120 gated cue records expect about 0.7 a hour. Written into §11 with item 3.
7. **Ruling 6, named** (§5 item 1, §6): outside the window every clause of rule 2 is reported, so a 2c or 2e failure
   seen there is re-flown rather than acted on, although neither depends on provider load (the window's reason).
   Default: as applied. Alternative: 2c and 2e read as in any hour (the edits in `RECHECK-r3.md`).
8. **3a NOISE re-flies** (rule 3a, M13's gap of 1): nothing caps them. Default: no cap, as written. Alternative: one
   NOISE re-fly under this pre-registration; a second NOISE reads as an other FAIL.
````

**F1-l** (the user's list): "Only the user" item 3: the single-event consequence. Revision 3, line 970.

OLD:
````text
   strict per-rep clause (null STOP 12% at a 5% per-rep chance, against 0.9%). Written into §11 now.
````
NEW:
````text
   strict per-rep clause (null STOP 12% at a 5% per-rep chance, against 0.9%). Under the default a single gated wrong
   or block-only twin is named, never a STOP by itself; under the strict clause one in any cue rep STOPs when the
   control's worst rep is 0 (it was 0 in all nine 3.5-lite HIGH reps of h40a–h40c). Written into §11 now.
````

**F1-i** (finding 2): "To know": the bench as it ran. Revision 3, line 976.

OLD:
````text
To know before the merge, not to decide (N9): the bench started at 09:04, four minutes after the 09:00 line, with 298
of headroom; a last call after 10:00 puts part of a bench on the replay's quota day (the replay's own rule); in the
"Otherwise" branch a Thursday merge after an afternoon bench goes against the letter of the bench's 3a sentence, and
the replay moves to Saturday by the 01:18 ruling.
````
NEW:
````text
To know before arming, not to decide: the bench ran 09:04–09:16 on the 2026-09-30 quota day (298 of headroom, no call
after 10:00), so the "Otherwise" branch did not happen. The bench PASSED but rated the cue arm −2, −3 and −3
acceptable of 39 below its control in every rep (15 ids lower, 6 higher; sign test p ≈ 0.08; reported, never
gating). If that cost is real and carries to holdout40, 3c's band STOPs about a third to a half of such hours (§10),
and a 3a miss tends to read as 3a NOISE (item 8).
````

**F1-j** (the user's list): §6 preconditions: every choice. Revision 3, line 619.

OLD:
````text
  choice and the 3c wrong-clause choice written into §11 (§12, "Only the user");
````
NEW:
````text
  choice, the 3c wrong-clause choice and every other choice of §12's "Only the user" written into §11;
````

**F1-k** (the user's list): §7.8: the choices. Revision 3, line 811.

OLD:
````text
the user's two choices of §12 written in
````
NEW:
````text
the user's choices of §12 written in
````

**M1-a** (findings 2 and 8): §11: the bench filled. Revision 3, line 909.

OLD:
````text
- Thursday's bench: verdict `________`; its thinking-token difference, cue reps against s50m's `captured-high`:
  `________ tokens` (2c's first known case; `________` ≤ 150, or the amendment `________`); its TTFT p90 line, reported:
  `________`.
````
NEW:
````text
- Thursday's bench (filled by the re-check of revision 3 from `passes/2026-10-01-cuebench-result.md`): verdict PASS
  (band cue [24.5, 28.5] against control [27.5, 31.5]; wrong cue 1 / 1 / 0 against the worst control rep's 1; blocks
  present and shaped 97–100%); its thinking-token difference, cue reps against s50m's `captured-high`: **+55 tokens**
  over the three reps (pooled medians 955 against 900, n 116 a side, coverage 100%;
  `recheck-r3-scratch/bench-2c-and-notext.mjs`) — 2c's first real reading, ≤ 150, no amendment. Rule 2c's command as
  written reads two of the three reps (the bench tagged rep 1 `cues-r1`; the script reads `''`, `-r2`, `-r3` and
  prints no line for a missing file): +83 on r2 and r3. Its TTFT p90 line, reported: cue above control by 505, 47 and
  658 ms. Reported, never gating: the cue arm −2, −3 and −3 acceptable of 39 below control (§10).
````

**M1-b** (finding 2): §11: the bench's last call. Revision 3, line 913.

OLD:
````text
used, 298 headroom on 3.5-lite), last call `________` (before / after the 10:00 reset);
````
NEW:
````text
used, 298 headroom on 3.5-lite), last call 09:16 (before the 10:00 reset; 117 calls, 0 transient errors);
````

**M1-c** (finding 2): §10: a cost of the bench's size. Revision 3, line 884.

OLD:
````text
  ungraded; the paired-grading noise floor is about ±4 on 45; 3c's bands are three reps a side.
````
NEW:
````text
  ungraded; the paired-grading noise floor is about ±4 on 45; 3c's bands are three reps a side.
- A quality cost of the bench's size. The bench (scenario50 bytes) rated the cue arm −2, −3 and −3 acceptable of 39
  below its control in every rep (reported, never gating). If that cost is real and carries to holdout40 (about −3 of
  44), 3c's band STOPs about a third to a half of such hours (29–49% at the holdout twins' own rep-to-rep SD of 1.5–2;
  `recheck-r3-scratch/band-power.mjs`), so a PASS does not exclude it; and a 3a miss under it tends to read as 3a
  NOISE, since the in-app count is compared with cue twins that carry the same cost.
````

**M3-a** (finding 4): rule 3a: a miss while 3c is INCOMPLETE. Revision 3, line 355.

OLD:
````text
A 3a miss without both is an "other
````
NEW:
````text
A 3a miss while 3c is INCOMPLETE is INCOMPLETE (§5 item 4); with 3c decided, a 3a miss without both is an "other
````

**M3-b** (finding 4): §5 bullet: a miss while 3c is INCOMPLETE. Revision 3, line 579.

OLD:
````text
  cue twins' counts on the shared ids (rule 3a); otherwise an other FAIL as above.
````
NEW:
````text
  cue twins' counts on the shared ids (rule 3a); INCOMPLETE while 3c is INCOMPLETE (item 4); otherwise an other FAIL as above.
````

**M4-a** (finding 5): §7.4 h40d-rule3: the noise reading. Revision 3, line 756.

OLD:
````text
R09F and R11F wrong and excluded, on h40b; FAIL on h40a (R09 wrong on a gated item).
````
NEW:
````text
R09F and R11F wrong and excluded, on h40b; FAIL on h40a (R09 wrong on a gated item). It also prints rule 3a's noise
     reading: the in-app acceptable count on the ids shared with the cue twins (best answer per item), each cue twin
     rep's count on the same ids, and the gap to the lowest. Known cases (`recheck-r3-scratch/noise-gap.mjs`): h40c 35
     against 36 / 37 / 38 → gap 1, within; h40b 35 against 38 / 36 / 39 → gap 1, within; h40a 39 against 37 / 42 / 38
     → in-app above; and one that must fail: h40c with two in-app acceptable items set to weak in memory → 33 against
     36, gap 3, not within.
````

**M5-a** (finding 7): the re-run's environment. Revision 3, line 410.

OLD:
````text
away; from MAIN, as the flight invokes the arm (`flight.mjs:350–353`):
````
NEW:
````text
away; from MAIN, in a shell carrying the launcher's env block (`NATIVELY_ROSTER=holdout40` above all: under the
  default roster `answers.mjs` refuses the resumed file, exit 3, `:277–283`), as the flight invokes the arm (`flight.mjs:350–353`):
````

**M6-a** (finding 8): §12 item 4: N8-b's residue. Revision 3, line 941.

OLD:
````text
   difference adopted instead.
````
NEW:
````text
   difference read instead, as a first real reading (a preview, not a calibration; re-check N8).
````

**M6-b** (finding 8): 3c: the dangling reference. Revision 3, line 374.

OLD:
````text
is named and read item by item (§5), never a STOP by itself.
````
NEW:
````text
is named and read item by item in the result note (h40c's three-way form), never a STOP by itself.
````

**M7-a** (finding 9): §7.3: a wait that cannot refuse. Revision 3, line 666.

OLD:
````text
a 60 s wait (`timeout /t 60 /nobreak`)
````
NEW:
````text
a 60 s wait (`ping -n 61 127.0.0.1 >nul`, with `echo %TIME%` before and after it into the log; `timeout /t` exits at once when its input is redirected, and no launcher here has used it)
````

### Only if the user vetoes ruling 6 (decision item 7)

**M2-a** (finding 3, only if the user vetoes ruling 6): §5 item 1. Revision 3, line 544.

OLD:
````text
   **In an out-of-window hour every clause of rule 2 is reported and none is a FAIL (§6; ruling 6 on re-check I5(d)):
   there only 3c and rule 4 reach this item; a reported 2b, 2c or 2e reading beyond its bound is named in the result
   note, and the re-fly inside the window decides it.**
````
NEW:
````text
   **In an out-of-window hour 2a, 2b and 2d are reported and none of them is a FAIL (§6): provider load, which the
   window controls, moves them. 2c (thinking tokens) and 2e (the parser's hold) do not depend on load: they reach this
   item there as in any hour, with 3c and rule 4.**
````

**M2-b** (finding 3, only if the user vetoes ruling 6): §5 item 5. Revision 3, line 556.

OLD:
````text
(there every clause of rule 2 is reported and none is a FAIL, §6)
````
NEW:
````text
(there 2a, 2b and 2d are reported, §6)
````

**M2-c** (finding 3, only if the user vetoes ruling 6): §5 NO LATENCY VERDICT bullet. Revision 3, line 584.

OLD:
````text
  out-of-window hour every clause of rule 2 is reported and none is a FAIL (§6; ruling 6 on re-check I5(d)); the hour
````
NEW:
````text
  out-of-window hour 2a, 2b and 2d are reported (§6) and 2c and 2e are read as in any hour; the hour
````

**M2-d** (finding 3, only if the user vetoes ruling 6): §6 start bullet. Revision 3, line 592.

OLD:
````text
Outside the window, every clause of rule 2 (2a–2e) is reported, not gated — none
  reads as a FAIL, cue-attributable or other (§5 items 1 and 3; ruling 6 on re-check I5(d)); rules 3, 4 and 5 are read
  normally, and the hour cannot PASS (NO LATENCY VERDICT: re-fly inside the window).
````
NEW:
````text
Outside the window, 2a, 2b and 2d are reported, not gated, and 2c and 2e are read as in
  any hour (§5 items 1 and 3; the user's veto of ruling 6, `RECHECK-r3.md`); rules 3, 4 and 5 are read normally, and
  the hour cannot PASS (NO LATENCY VERDICT: re-fly inside the window).
````

**M2-e** (finding 3, only if the user vetoes ruling 6): §13 the ruling-6 bullet. Revision 3, line 1006.

OLD:
````text
there, none as a FAIL. The ruling is applied (§5 item 1, §6); 3c and rule 4 are still read in such an hour.
````
NEW:
````text
there, none as a FAIL. The user vetoed it for 2c and 2e, which do not depend on provider load (`RECHECK-r3.md`):
  outside the window 2a, 2b and 2d are reported, 2c, 2e, 3c and rule 4 read as in any hour (§5 item 1, §6).
````

### Only if the user chooses the cap (decision item 8)

**M8-cap** (finding 6, only if the user chooses the cap): §5 item 5. Revision 3, line 556.

OLD:
````text
**3a NOISE** — a 3a miss read as noise (rule 3a).
````
NEW:
````text
**3a NOISE** — a 3a miss read as noise (rule 3a); a second 3a NOISE under this pre-registration reads as an other FAIL (item 3).
````

## The user's decision list, as it should stand

Each choice is written into §11 before arming. The controller's default stands if the user says nothing.

1. **The veto on §12.** This covers:
   - the ten answers;
   - A–E (C and D were the review's questions to the user; the controller took them);
   - the rule changes from RECHECK-r2;
   - this re-check's two: the no-text ruling (item 6) and ruling 6, now named (item 7).

   Default: as applied.
2. **GRADER DRIFT** (unchanged):
   - Default (ii): grade with the new model; 3a is reported; the hour is not validated.
   - Alternative (i): a dated re-pin amendment before grading; a PASS then validates.
3. **3c's gated wrong clause:**
   - Default: the three reps' sums, with a margin of 1. Null STOP 0.9% at a 5% per-rep chance. A single gated wrong or block-only twin is named, never a STOP by itself.
   - Alternative: the strict per-rep clause. Null STOP 12%. One gated wrong or block-only twin in any cue rep STOPs while the control's worst rep is 0.
4. **The live look ends with Context ON** (unchanged). There is no default: only the user can do it. The controller then re-reads the key; at about 09:45 the real file still read ON (mtime 2026-09-12).
5. **The bench's thinking-token difference: resolved.** It read +55 tokens over the three reps, within 150, so there is nothing to decide.
6. **A record with no text in 3c** (new):
   - Default, the controller's ruling: out of the gated clause on either side. It costs its rep one acceptable answer and one present block, so it can STOP 3c only through the band, or through the cue check at five in one rep.
   - Alternative: in the gated clause on either side. Then one such record alone STOPs under the strict clause while the control's worst rep is 0. Under the default, it STOPs together with one more cue-side gated wrong while the control's total is 0.
7. **Ruling 6, named** (new):
   - Default: as applied. Outside the window every clause of rule 2 is reported, so a 2c or 2e failure seen there is re-flown.
   - Alternative: 2c and 2e are read as in any hour (edits M2-a to M2-e).
8. **3a NOISE re-flies** (new):
   - Default: no cap, as written.
   - Alternative: one re-fly; a second NOISE reads as an other FAIL (edit M8-cap).

**To know, not to decide:**
- **The bench's deficit.** The bench PASSED, but it rated the cue arm below control in every rep (−2, −3 and −3 of 39). If that cost is real and carries to holdout40, 3c's band STOPs in about a third to a half of hours, and a 3a miss tends to read as NOISE.
- **The bench's timing.** It ran 09:04–09:16, with no call after 10:00, so the "Otherwise" branch did not happen.
- **The branches.** MAIN and the cue branch moved, by docs only. The refreshed merge `a4aea78` passes its checks (section 4d).
- **Thursday evening.** The Live 3.8 probe task runs Thursday 20:00–20:20, and the prestart must avoid it.

## What I did not check, and residual risks

- **Not built, so not checked:**
  - `h40d-twins.mjs`, `h40d-rule3.mjs` and `guard-h40d.mjs` (including check 13);
  - the launchers, the prestart's included;
  - the register, precheck and merge scripts, and the dispatch text;
  - `h40d-grader-models.mjs` and `h40d-hascuerule-check.mjs`.
- **`CALIBRATION-NOTES.md`'s new sections:** not read in full. I checked the numbers revision 3 cites against the scripts' own outputs instead.
- **The record with no text:**
  - its cause is unknown;
  - whether cue mode raises its rate is unproven either way, from one event;
  - the hedge's `front-empty` path is read from the code, not seen live.
- **`band-power.mjs` is a sketch.** It assumes iid normal reps and integer counts. It also assumes the bench's cost carries unchanged to holdout40.
- **G's tail.**
  - On both worktree cue runs G's p90 read 1.1–1.2 s, against 0.56–0.64 s on MAIN's h40c and br1. The 05:00 run's median is within the re-check's 0.1 s line (0.093 s above br1's); the 16:12 run's sat 0.173 s above.
  - By the code trace G comes before the hedge and cue mode does not touch it.
  - Friday on MAIN separates the checkout from cue mode. Reported only.
- **The first-window skip of `Intent classified` on both cue smokes:**
  - its cause is unproven;
  - a third such window in about 47 makes the hour VOID (CHANGES-r3's note 2).
- **MAIN's working tree:** not inspected.
