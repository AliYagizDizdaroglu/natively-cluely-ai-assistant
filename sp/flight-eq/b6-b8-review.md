# b6 / b8 review (Opus, 2026-10-06 00:42-00:50 TST; read-only except this file)

**Verdict: NOT READY. 1 BLOCKING, 5 IMPORTANT, 7 MINOR.** 9 of the 11 rulings hold against the registered texts. Ruling 5 (holes) and
ruling 8 (back holes) do not: they turn a registered FAIL into INCOMPLETE. The wrong definition (ruling 6) is right. The 2b coverage
reading (ruling 7) is right, though the conflict it names is not real.

Reviewed (sha256/12 re-read 00:47): eq-twins.mjs f90efdb47af8, launch-grader-eq.mjs dfca2a67af88, eq-audit.mjs f86e6fe1b87c,
eq-grader-dispatch.txt 62c789adbef1, eq-merge.cmd fc5895f90dbd. Texts: reg. section 2-6 and b6/b8, A1-A7, USER-RULING-4c, NOTE-controller-tools.

## Calibrations re-run (stand-in only, no model call, copies in my scratchpad so nothing in E was rewritten)

- `eq-twins-cal.mjs`: **89/89, 15/15 mutants**. The output is byte-identical to `E\eq-twins.cal.txt` (03fdc2fb164a).
- `launch-grader-eq-cal.mjs`: **71/72** from my scratch path, against 72/72 in E. The failing check is "every verdicts file was copied ... (14 files)".
  The cause is cmd's MAX_PATH: the scratch run-dir path is 298 characters. `copy` failed silently, and the stub judge still printed **MERGED** for
  every arm (14 MERGED lines, exit 0). Under E the same path is about 208 characters, so the real run is not affected. See M1.
- E's tool and cal shas were unchanged after my runs.

## The three priority questions

1. **"Wrong" for 4b (3a uses "acceptable", not "wrong").** The registration defines it in section 2, l. 102-104: "Wrong is h40d's one definition: the
   judge's verdict wrong = correctness 0 or on_topic 0". "Consensus" means both graders (l. 91). A3.3 confirms the broad form: "`on_topic 0` counts in
   both" 4b and 4c. The replay's narrower "both correctness 0" appears in no registered text. **Ruling 6 is correct.** The code decides wrong per grader
   with `verdictOf` and requires it on both, so grader 1 at correctness 0 and grader 2 at on_topic 0 counts as wrong. That follows from the definition.
   3a = both graders 'acceptable' (c2, ot2, d >= 1); 4c = on_topic <= 1 on both. Both correct.
2. **2b coverage (3 nulls of 20).** The rule says >= 90 % of pairs, and 17/20 = 85 %, so the fallback applies. The registered cal sentence only says
   "excluded, coverage printed". That still holds when the fallback fires, so there is no real contradiction. **Ruling 7's outcome is correct.**
   Its fallback has a gap, though: see I2.
3. **Hole thresholds.** See B1 and I1.

## Findings

**B1 BLOCKING - INCOMPLETE hides a registered FAIL (rulings 5 and 8).** Reg. section 4 counting rulings: "a rep with more than 1 true hole ... makes **3a**
INCOMPLETE". Only 3a. A hole pair is otherwise "excluded and named". Reg. section 4 head: "Every clause is always computed and reported". Section 5:
feature-attributable FAIL comes before INCOMPLETE, and item 1 says "Sampling until it passes is not allowed".
- `evaluate()` sets 4b, 4c, 2b, 2c and 2d to INCOMPLETE without computing them when one front file has more than 1 hole. A block wrong in the remaining
  pairs is never printed.
- Ruling 8 does the same for the back leg: more than 1 back hole makes 4b INCOMPLETE and also hides a **front** 4b FAIL. The `m === 0` case does too.
- The hole re-run (`-b`, A4.4 m11) then replaces that rep on both sides. A wrong answer in it can be resampled away.
- Fix: always compute 4b, 4c and 2b-2d on the complete pairs. Gate only 3a on the hole threshold. For back holes, exclude the pairs and leave 4b
  computed, since the registration is silent there. Add a cal case with two front holes plus a block wrong in the rest that must give 4b FAIL, and
  the same with back holes.

**I1 IMPORTANT - the hole threshold unit (ruling 5).** A3.4 m5 redefines a rep as its two steps: "A rep's hole re-run re-runs **both** of that rep's steps"
and "(of |G_twin|)". The per-FILE count lets rep k lose 2 of 4 pairs without INCOMPLETE: one hole in `captured-g-high-rk` and one on another id in
`captured-no-block-high-rk`. The cal pins this ("one hole in each of two files -> not INCOMPLETE"). The original "(of 4)" bound was at most 1 lost pair
per rep. The stricter reading counts **incomplete pairs per rep, > 1 of |G_twin|**. This is a genuine ambiguity in the registration. The controller or
the user should rule on it in a dated note; the builder should not.

**I2 IMPORTANT - the 2b fallback reads TTFT that 2c itself may not gate on (ruling 7, "read even when 2c is only REPORTED").** A3.2 m3 and A3.4: when the
sitting condition breaks, the TTFT comparison is reported, not gated. Reg. section 5 item 3 lists "2b ... undecided" as INCOMPLETE. With coverage
under 90 % and 2c ungated, the tool still PASSES 2b on a TTFT median it would not trust for 2c. Fix: in that case 2b = INCOMPLETE, keeping the FAIL >
+1000 printed if you choose fail-closed. Put both in the cal.

**I3 IMPORTANT - a missing or unparsable `gsitting.log` silently ungates 2c.** A3.4: "Otherwise 2c is reported, and **the reps that broke the condition**
are named". A missing log is an instrument failure, not a rep that broke the condition. As built:
- no file, an empty file, or the unverified `STEP` format (eq-gsitting.ps1 is unbuilt) all give 2c = REPORTED;
- a 2c FAIL (median > +1000 or a stall) then drops out of section 5 item 1;
- the build report calls this "fail-safe", but it is the lenient direction.

Fix: refuse (exit 2) when the log is absent, or when any of the 10 resolved front tags has no start line. Only a parsed gap > 15 min ungates. Pin the
format against eq-gsitting.ps1 once it is built.

**I4 IMPORTANT - `--eval --g` is not checked against the keys.** `assemblePairs` iterates the `--g` ids, and `collectScores` takes every key. An id that was
built and graded but left out of `--g` at eval is dropped silently. Pairs fall from 20 to 15 and every bar is recomputed on 15. Fix: refuse unless
the set of ids in `key.blind-1..3` equals `--g`.

**I5 IMPORTANT - departures from named instruments need a dated note before first use (rulings 1 and 2).** Reg. section 2 and A3.5 name
`F\R\launch-grader.mjs --model-id` (edited) and `audit-graders.mjs` DEFAULT mode for every transcript. The derived launcher and `eq-audit.mjs` are
sound substitutes: they import the same functions, the allowlist matches on 10/10 synthetic transcripts, and the dispatch region is byte-identical
(I re-hashed both regions: equal). But they are not the registered instruments. They need a controller or user note naming them, plus the
A2.5 review and `instruments.sha256.txt` lines, which do not exist yet.

**M1 MINOR - eq-merge.cmd does not check `copy`'s errorlevel** (inherited from h40d). A failed copy, whether from a lock or a long path, still runs the
judge. On a re-grade the judge would merge the **stale** verdicts file already in the run dir and print MERGED. My scratch run showed exactly this
with the stub. Add `if errorlevel 1 echo COPY-FAILED %1 & exit /b 0` after each copy, and `exit /b 1` for the in-app copy. Also: the final exit is
0 even after a MERGE-FAILED line, so a reader must grep the text.

**M2 MINOR - empty prose is scored {0,0,0} (ruling 5/R3), so it also counts off-topic in 4c.** The registration says only "counts wrong". The effect is
symmetric across arms, but it is unregistered. Name it, or score {0,2,0}.

**M3 MINOR - partial `-b` files.** Reg. section 4 says the re-run uses `--only <ids>` (the holes' ids). A4.4 m11 says it replaces the whole rep, and the
tool assumes that. A `-b` step run with only the hole ids makes every other id a hole. The unbuilt eq-gsitting re-run must use `--only <G_twin>`.
Write that down.

**M4 MINOR - the sitting check ignores `EXIT <c>`, step order (A3.4's counterbalance) and duplicate STEP lines.** A later duplicate overwrites the start
time.

**M5 MINOR - launcher bookkeeping.**
- cwdprobe-2 and -3 gate on the previous probe's CLI exit and tool counts only, not on its model being the pin or its memory ABSENT. A2.7/m11
  require both probes to read the pin.
- A rate-limited refusal (model "", seen 20 times in `F\R\blind\launches.jsonl`) exits 1 like a failed grade. The registration says such an attempt
  "consumes no replacement", so the launcher should label it.

**M6 MINOR - exit codes.** `--eval` exits 0 on clause-level INCOMPLETE but exits 3 on a missing verdicts file. Either is defensible; state it in the
controller's reading.

**M7 MINOR - A2.7's "|G_twin| >= 8 splits at <= 44 and the count rises" is a refusal in the tool, not an implementation.** It is named, and not
expected (G\* = 4).

## Rulings: one line each

1 derived launcher: OK, needs a note (I5). | 2 eq-audit: OK, needs a note (I5). | 3 pin refusal: OK (A2.7). | 4 CLI model = pin: OK; label
rate-limit refusals (M5). | 5 holes: **NOT OK**: unit (I1), and INCOMPLETE spreading past 3a (B1). | 6 wrong: **OK** (reg. section 2 l. 102-104,
A3.3). | 7 2b coverage: OK on 3/20, but the ungated-2c fallback is not (I2). | 8 back holes: **NOT OK** (B1). | 9 `-b` tags: OK (A3.4 m5,
A4.4 m11), plus M3. | 10 pct / integer bars: OK (replay-consistent; the upper median is the stricter side). | 11 heard/question: OK.

## Registered calibration cases (b6, A2.10, A4.4(a), A3.5, A4.5, b8, A2.7)

All present, with their registered answers:
- replay +8 with the rows, mutated -> falls;
- 3a branches, n = 19 +1 -> FAIL;
- back wrong alone -> 4b FAIL;
- 3/20 nulls and 4 on one side;
- +700 INCONCLUSIVE, stall FAIL, p90 INCONCLUSIVE, coverage +1100 FAIL;
- 16-min rep -> REPORTED naming it, 15-min reps in a long sitting -> gates;
- dry-run argv with and without the pin, cwdprobe-3 dry `opus`;
- merge SKIPPED-MISSING / exit 13 / 14 MERGED.

Still owed, needing a real call: `cwdprobe-1` real -> transcript model `claude-opus-5-5` (A3.5), and the merge against the real judge.

**Not checked:** the real CLI's `modelUsage` key format under `--model claude-opus-5-5`; eq-gsitting.ps1's log format; any live G-sitting answer
file. I did not run either tool on real flight data (none exists).

## Re-review (Opus, 2026-10-06 01:03-01:10 TST; scoped to the fix round)

**Verdict: READY for first use, with 1 conditional IMPORTANT and 3 MINOR open.** B1, I1-I4 and M1-M6 are closed. The I5 substitutes are sound for first
use. Nothing new is wrong in the gating direction.

Shas re-read: eq-twins.mjs 592d8cad52f7, launch-grader-eq.mjs 36a2198eea69, eq-merge.cmd 4fe62ce45486, eq-audit.mjs f86e6fe1b87c (unchanged),
eq-grader-dispatch.txt 62c789adbef1 (unchanged). Texts read: b6-b8-report-fixround.md, NOTE-post-hour-tools-2026-10-06.md (b) and (c), the addendum.

**Re-runs** (stand-in only, copies in my scratchpad):
- **eq-twins-cal: 108/108, 26/26 mutants.** The output is byte-identical to `E\eq-twins.cal.txt`.
- **launch-grader-eq-cal: 67 OK before the merge suite.** That includes every M5 case. In my long scratch path (more than 260 characters) every `copy`
  failed. This time the merge printed **COPY-FAILED <arm> and exited 1**, where the first round printed MERGED. So M1 is shown working on a real
  copy failure, not only on the stub.
- The cal then crashed on its own `chmod` of the uncopied file. That is an environment artefact; E's run reads 78/78, 25/25.

### Closed
- **B1:** Only 3a is gated by holes. 4b, 4c and 2b-2d are computed on the pairs that exist, and a front 4b FAIL survives back holes and zero back
  pairs. That matches reg. section 4/5 and NOTE (b) scope.
- **I1:** Holes are counted as incomplete pairs per front rep, >= 2 -> 3a INCOMPLETE. That matches NOTE (b) unit. A rep filled by `-b` is counted after
  the fill.
- **I2:** Coverage under 90 % with 2c ungated -> 2b INCOMPLETE. The ungated median is printed.
- **I3:** A missing, empty, unparseable or duplicate log, a missing start or end line, an exit other than 0, an out-of-order step, or a broken
  counterbalance all refuse with exit 2. Only a gap over 15 min ungates 2c. The parsed format matches what `eq-gsitting.ps1` actually writes:
  `STEP n tag start|end <yyyy-MM-ddTHH:mm:ss.fffZ> [exit=c]`. Its plan order also matches A3.4's counterbalance (its cal line 2).
- **I4:** `--g` must equal the ids in the key files, else exit 2.
- **M1-M6:**
  - M1 is closed (`goto` labels; the in-app copy failure exits 1 at once).
  - M2: empty = {0,2,0}, so wrong but not off-topic.
  - M3 is written down.
  - M4: covered by the I3 checks.
  - M5: probes 2 and 3 need the previous probe's pin and memory ABSENT, and a rate-limited attempt is labelled.
  - M6: exit codes are stated.
  - M7 is left, as allowed.

### I5 substitutes: sound for first use
NOTE (c) names both substitutes and gives the reason.
- `launch-grader-eq.mjs`:
  - it imports the original's tested functions;
  - it pins `--model-id`, and a real launch without the pin is refused;
  - the `--add-dir` source count is 0;
  - the dispatch region is byte-identical to h40d's (I re-hashed it last round).
- `eq-audit.mjs` has the same allowlist as `audit-graders.mjs` (equal verdicts on 10/10 synthetic transcripts) and flags Bash, MCP, any other path,
  any denial and dispatch DIFFERS. Blind slots stay with the original.

This re-review is the A2.5 Opus review for both. What remains is bookkeeping: the `instruments.sha256.txt` lines at use.

### Open
- **N1 IMPORTANT (conditional: only if a G hole needs a re-run):** the hole re-run path is unbuilt. `eq-gsitting.ps1` refuses any log that already holds
  STEP lines and has no `-b` mode. `eq-twins --eval` requires the `-b` tags' start and end lines in `gsitting.log`. So any `-b` re-run today ends in
  REFUSED. That is loud, not wrong. Also, for a `-b` rep the ORIGINAL steps' log lines (exit, 15-min gap) are no longer checked, yet its kept complete
  pairs still enter 2c. Build or define the re-run logging before a hole re-run is used. With no holes, nothing is affected.
- **N2 MINOR:** the `-b` "fill holes only" rule is cited as "controller ruling B1", but NOTE (b) says nothing about `-b`. It is consistent with reg.
  section 4 ("re-run ... `--only <ids>`, its filled ids graded"). It is also consistent with A4.4 m11 read per pair: both sides of the hole's pair come
  from `-b`, never mixed. It needs one line in a controller note so the citation is true.
- **N3 MINOR:** the rate-limit label says "relaunch as attempt ${attempt} with a fresh cwd name". The launcher derives the cwd from the attempt
  number and refuses to reuse one, so the relaunch must be `--attempt k+1`, recorded as not consuming a replacement. Fix the text.
- **N4 MINOR:** `launch-grader-eq-cal.mjs` crashes (an unguarded `chmodSync`) instead of reporting when a merge copy fails. That happens only on a path
  over 260 characters, so not in E.

Not checked: any real `claude` call, a real judge merge, or a live `gsitting.log` (none exists).

## Live-fix review (Opus, 2026-10-06 05:51 TST; launch-grader-eq.mjs 36a2198eea69 -> 9b64492fe6fa)

**Verdict: READY. Both fixes are sound, the registration loses nothing, and the diff is exactly these two changes.** E's cal reads 84/84, 27/27
mutants. No claude call was made.

**(1) `--setting-sources project,local` on every argv** (cal: slot, pairs, probe 1, probe 3 and the unpinned dry run each carry it once; the mutant
that drops it is caught).
- **What it drops: USER settings only.** I read `~/.claude/settings.json` by key names: hooks (SessionStart, Stop), enabledPlugins (claude-mem,
  superpowers, context7, playwright, cloudflare), `permissions.defaultMode`, notification, compaction and dialog keys. It holds no model, effort,
  thinking, env or output-style key.
- **No project or local settings exist above the grading cwd.** No `.claude`, `CLAUDE.md` or `CLAUDE.local.md` from `E\grading` up to `C:\Users\sotka`,
  except the user `~\.claude`. So graders now run with no settings file at all.
- **What the registration requires** (reg. section 2 + A2.7: tools Read/Write/Edit, `--strict-mcp-config`, no `--add-dir`, `dontAsk` plus the
  absolute allowed-tools rules, the pinned id, memory ABSENT) is all carried by flags. `permissions.defaultMode` is overridden by
  `--permission-mode dontAsk` anyway. Nothing required is dropped.
- **The fix serves a requirement:** reg. section 6 "Memory ABSENT for every grader". Live: a88cf8cc read LOADED claudeMem=5 without the flag;
  fc0cd71d reads ABSENT claudeMem=0 with it, model claude-opus-5-5.
- Every clause is a within-hour, same-grader comparison (reg. section 6), and every grader and probe of this hour carries the flag, so comparability holds.
- **Name in the result note:** this hour's grader argv differs from h40d's and the replay's by this flag (those loaded user plugins and hooks).
  Cross-hour grade numbers were reported-only anyway.

**(2) The probe gate takes the LAST record for the previous slot and reads memory and tools from its transcript.**
- This is correct for the real record shape: `grader-cwd.launches.jsonl` records carry no memory or tools fields. The pre-fix gate printed "memory
  unknown, tools null" for a clean record.
- The cal covers four cases: a clean last record -> allowed; a LOADED last record -> refused; a stale LOADED record followed by a clean one -> allowed;
  a last record on another model -> refused.
- Choosing "last" is safe because each launch appends, and a failed attempt is moved aside, not deleted.

**MINOR (bookkeeping, no code):** the re-probe reused the cwd name `cwdprobe-1-a1` and attempt 1. The failed folder was renamed to
`failed-cwdprobe-1-a1-0547-claudemem`, and transcript a88cf8cc is kept there under `projects-slug`. The record reads `slugJsonl 1` and memoryDir empty,
so the cwd's projects slug held only the new transcript: fresh in substance. But this departs from the launcher's literal "a cwd is never reused" and
from reg. b8's "fresh cwds". Name it in the arming or result record with both session ids.

Not checked: whether the CLI still honours `--strict-mcp-config` and `--tools` exactly as before with user settings excluded. fc0cd71d's Read 1 /
Write 1 under the new gate is the live evidence for the probe shape. A grader transcript has not been audited yet.
