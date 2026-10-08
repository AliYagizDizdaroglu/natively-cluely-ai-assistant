# CHANGES-r3: what revision 3 of PREREGISTER-h40d changed, re-check item by re-check item

Written 2026-10-01, about 09:35 local, by Fable (the controller's delegate), applying `RECHECK-r2.md` (Opus, READY WITH
FIXES) and the controller's rulings on its open choices. Read-only work outside VH: no test, build, npm, tsc, API or
model call; no repo edit; no commit; no subagent. Files written, all in `VH`: `PREREGISTER-h40d.r3.md` (revision 3;
`PREREGISTER-h40d.md` = revision 2 is unchanged), this file, `h40d-thoughts-noise.mjs` (edited, re-check N6; the
revision-2 file kept as `r3-scratch\h40d-thoughts-noise.r2-backup.mjs`), `knowledge-mode-read.mjs` and
`h40d-knowledge-lines.mjs` (new, rule 1(g)) with their stubs and fixtures (`kmode-stubs\`, `kmode-fixtures\`),
`run-calibrations.mjs` (extended) and its three outputs, `CALIBRATION-NOTES.md` (§1.7, §2, §3, §5, §6 added).
"§" refers to revision 3's sections unless marked r2.

**How revision 3 was built.** The earlier attempt's `PREREGISTER-h40d.r3.md` was byte-identical to revision 2 and its
`r3-scratch\` held an untouched backup and a reader draft; both were discarded as the brief said. Revision 3 is
revision 2 plus 71 edits applied in order by `r3-scratch\apply-r3.mjs` from `r3-scratch\r3-edits.txt` (verbatim
OLD/NEW blocks: no escaping between the re-check's anchors and the file). Each OLD had to occur exactly once at the
moment it was applied; all 71 did on the first run. A post-check then required 16 revision-2 phrases to be gone and 14
revision-3 phrases to be present; all held. The header time (09:27) is the script's clock at the write.

## Facts gathered for this revision (read-only; numbers only, never an answer or a prompt)

- **The 05:00 re-smoke** (`WT\…\interview60.runs\2026-10-01T02-37-41-cuesmoke`, the combined build, S1, hedge on; the
  controller's ruling 9 gave its PASS: `CHECK EXIT 0`, 20/20 hands-free, 8/8 long whole, the cue row 20/20, 7 trimmed,
  filter sha `42d9bc42dbd17870` in both proofs — its `interview60.report.md` rows agree):
  - `hold-read.mjs` reads **HOLD GONE** (n 21 counted, R2 and B under 15 ms in 0 each; T median 370 ms; the same lines
    as `cue-group\hold-read.resmoke2.out.txt`). So **2e is GATED** on h40d, and the re-check's user-list item 4 ("2e's
    branch, if NOT GONE or NO VERDICT") does not arise.
  - `h40d-clocks.mjs`: screen 4.742 / 5.770 / 5.999 s, model 4.232 / 5.162 / 5.379 s, **G 0.594 / 1.112 / 1.147 s**,
    C 0.052 / 0.192 / 0.193 s, cues → first token 0.002 / 0.007 / 0.091 s, 2d 0 in the run window and the whole log.
    The re-check's residual risk asked for G beside br1's and a flag if the median exceeded br1's by more than 0.1 s:
    0.594 − 0.501 = 0.093 s, under the line; written into §3 and §11 with the p90 (1.112 against 0.555 s) beside it.
  - Its first run window reads **G = 2 ms and has no `Intent classified` line** (the 16:12 run: G 8 ms, the same
    window); h40c and br1 have the line on every window (47 of 47, 42 of 42). Found while calibrating rule 1(g)'s
    95% sub-condition (`r3-scratch\intent-windows.mjs`, then `h40d-knowledge-lines.mjs`). Cause unproven; no trace
    ties it to cue mode (the knowledge step simply did not run on that one window). Stated in rule 1(g), §3 and §13.
- **The persisted Context toggle**, read without starting the app (`knowledge-mode-read.mjs`): the direct
  `%APPDATA%` path from this session is the MSIX shadow (323 bytes, mtime 2026-07-02, 10 keys); the admin share
  `\\localhost\C$\…\natively\settings.json` is the real file (151 bytes, mtime 2026-09-12, 5 keys). Both read
  `knowledgeMode = ON`. The real file's mtime predates h40c and br1, consistent with their logs (ENABLED, no DISABLED).
- **`recheck-scratch\gated-null.mjs` re-run:** the strict per-rep clause 12.3% / 20.2% null STOP at a 5% / 10% per-rep
  chance; the sums-with-margin clause 0.9% / 3.1%; nine zero reps bound the per-rep chance at 28.3%. The re-check's
  figures reproduce.
- The bench's `PREREGISTER-cuebench.md` second amendment, 3a, reads as the re-check quoted it ("cue mode does not
  merge on Thursday" resting on the replay's day rule); its trigger is "less than 150 requests of headroom", which did
  not fire (298).

## The two partial findings

- **I5 (PARTIAL → addressed), per the ruling on out-of-window starts (ruling 6) and on GRADER DRIFT (ruling 5).**
  - (a) Precedence item 2 now reads "VOID (rule 1(a)–(g); under 1(d) or 1(e) item 1 does not apply — the build or the
    captured rule is unproven — and cue failures are reported only)" (I5-b verbatim).
  - (b) A 3a miss read as noise has an entry: **3a NOISE**, with NO LATENCY VERDICT's consequence (I5-e, I5-h, and the
    §5 bullet).
  - (c) A 3a miss while 3c is INCOMPLETE is INCOMPLETE (I5-d verbatim, which also adds 2a/2b on thin first-token
    coverage and a missing verdicts file).
  - (d) §5 and §6 agree the ruling's way, not the re-check's I5-g: **in an out-of-window hour every clause of rule 2
    (2a–2e) is reported and none is a FAIL**; §5 item 1 says only 3c and rule 4 reach it there, item 3 says 2d is
    reported only, item 5 and the NO LATENCY VERDICT bullet say the same; §6's start bullet carries the rule. I5-a's
    "(an out-of-window start included)" is kept in substance (item 1 is still read in such an hour, for 3c and rule 4).
  - (e) and (f): I5-c, I5-d, I5-f verbatim; the "Other FAIL on 2a …" bullet is now "Other FAIL on 2d, 3b, or rule 5".
  - (g) GRADER DRIFT: the alias is read from ONE throwaway probe agent dispatched BEFORE any h40d grader (GD-a, GD-d),
    and at arming (GD-e, §11). The choice is made NOW, in the veto window, and written into §11 (GD-b). The
    controller's default is (ii): grade anyway with the new model, 3b and 3c gate, 3a reported, the result says
    GRADER DRIFT, not validated. The user's alternative is (i), the dated re-pin amendment written before grading;
    under (i) a PASS validates, "PASS (grader re-pinned to <id>)" (GD-c). §9.5 dispatches the probe first.
- **M13 (PARTIAL → addressed), per ruling 7:** the condition is "at most 1 below the smallest of its own three cue
  twins' counts" (M13-a, M13-c), with the baseline's own gaps quoted (M13-b: h40c 35 against 36, h40b 35 against 36,
  h40a 39 against 37), so a noise-driven miss on an h40c-shaped hour can read as noise.

## The new findings

- **N1 (knowledge mode), per ruling 1 — pinned, beyond the re-check's four edits.**
  - N1-a: rule 1(g) added as written, plus: the known case from the two cue smokes (the first run window without the
    line, G 8 ms and 2 ms; 23 of 24 and 21 of 22, which the 95% line tolerates twice in 45), the instrument that reads
    it after the hour (`h40d-knowledge-lines.mjs`, calibrated: h40c and br1 OK, the two smokes OK, five synthetic
    fixtures — all classified OK, 1 of 20 missing OK at the 95% boundary, 3 of 20 VOID, a DISABLED line inside VOID, no
    ENABLED line VOID), and the three pre-hour pins.
  - N1-b: the live look ends with Context ON, and the controller re-reads the persisted key afterwards.
  - N1-c: the prestart's log must carry `Knowledge mode ENABLED` after `restored from settings` and no `DISABLED`.
  - N1-d: §9.2 reads rule 1 (a)–(c) and (g).
  - The ruling's additions: a §2 row "Knowledge mode"; the guard's **check 13** (`knowledgeMode === true` in the real
    settings file — the scheduled task runs outside the sandbox — with `--settings <stub>` calibration on
    `kmode-stubs\`); **§7.3a**, the pre-hour read without starting the app: `VH\knowledge-mode-read.mjs` reads the key
    through the admin share (the session's direct path is a shadow; both printed, the admin-share line decides;
    calibrated on five stubs), run after the live look and repeated at arming if an app was started by hand; a
    precondition in §6's list; "the Context toggle left ON" in "During the hour"; §11 lines for the read, the prestart
    line and the guard's check. If the live look ended OFF, the user turns Context ON in their own app (never from a
    Claude session) and the read is repeated — the named user step with a printed confirmation line.
- **N2 (the gated wrong clause), per ruling 2.** The rule text is the re-check's **sums with a margin of one** ("the cue
  reps' total gated wrong ≤ the no-cue reps' total + 1"), marked the controller's default, with its null STOP (0.9% /
  3.1%); the **strict per-rep clause** stands beside it as the alternative the user may choose before arming, with
  its null STOP (12% / 20%) and why it turns on single events (the control read 0 in all nine reps). N2-a, N2-d, N2-e
  applied verbatim; N2-b's honest null and N2-c's empty-prose split are inside the rewritten bullet (the fenced-code
  emptying by `filterCodeFences` stays named as the cause of both empties on file, kept out of the clause and named in
  the all-ids line); N2-f applied with case (8) restated for both readings: two block-only twins → STOP under the
  default, ONE → named and no STOP under the default, STOP under the strict alternative. The known cases are restated
  as sums (h40c control total 1, cue 0 → PASS; h40b the same), as N2-g asked. §11 carries the user's choice; §13 notes
  the minimal-versus-robust difference. **One consequence the controller should see:** under the default, a single
  block-only twin in the gated clause is named and read item by item but is not a STOP by itself (1 ≤ 0 + 1); a live
  block-only answer is still a rule-4 cue failure and a 2d failure, unchanged.
- **N3 (5a against ruling D), per ruling 3:** N3-a and N3-b verbatim, with one clause added to N3-b ("a pre-dispatch
  loss within this bound never fails rule 5"). 5a now FAILS only on an item lost after dispatch that 2d does not charge.
- **N4 (the same-day re-run), per ruling 4:** N4-a and N4-b applied; N4-a's command is written in the form the flight
  itself uses (`flight.mjs:350–353`: `--model … --tag … --thinking HIGH [--no-cues] --captured <run-dir>\…prompts.json
  --only <ids>`), with where the resume file lives (`electron\test\golden\interview60.answers.<model>_<tag>.json`; the
  flight copies, never moves, it), then the copy-back and the re-export, as the re-check asked. `answers.mjs:129–133`
  (`--only`) and `:314` (the resume rule) were read to confirm.
- **N5:** N5-a and N5-b verbatim (the 60 s wait; the probe does not wait for the answers).
- **N6:** N6-a and N6-b applied to `h40d-thoughts-noise.mjs` in place (the re-check's exact lines); verified on the
  re-check's known case — s50e's single-rep `gemini-3.7-flash` arm as both sides, 4 holes of 5 → `INCOMPLETE (more than
  3 true holes: cue -r1 (4), control -r1 (4))`, where the revision-2 script read `PASS (fallback)` — and h40c still PASS.
  N6-c: the case is in `run-calibrations.mjs`, `thoughts-noise.out.txt`, rule 2c's text and §7.4's list.
- **N7:** N7-a, N7-b, N7-c verbatim (h40a's one card; the report's real row name; 1(b) net of short-circuit windows).
- **N8:** N8-a to N8-d verbatim. N8-e: revision 3's header carries its own real time (the script's clock at the write)
  and says revision 2 was written about 01:50, not 02:30.
- **N9:** N9-a to N9-d verbatim (the "Otherwise" branch's 3a sentence; "the quota day before the flight's" in §7.3,
  §7.5 and §8). Added beside N9-a, from ruling 9: what happened — the bench started at 09:04 on the 2026-09-30 quota
  day with 202 used / 298 headroom, four minutes after the 09:00 line; a last call after 10:00 lands on the replay's
  quota day (the replay's own rule, not a precondition here); the last-call time goes into §11.
- **The §12 addition:** the re-check's veto paragraph, with C and D named explicitly as the review's questions to the
  user that the controller took, and a new subsection "Only the user" (below).

## Re-check edits that a ruling changed (ruling 8's "note it")

- **I5-g (out-of-window).** The re-check kept "a cue-attributable FAIL of §5 item 1" readable outside the window;
  ruling 6 reads every rule-2 clause as reported there. Applied the ruling's way in §5 item 1, item 3, item 5, the NO
  LATENCY VERDICT bullet and §6; noted in §13.
- **N2-b/N2-c versus N2-g.** The minimal fix's text is kept inside the clause (the honest null, the empty-prose split);
  the clause's arithmetic is the robust one (ruling 2); the strict clause is the alternative.
- **GD-a to GD-e.** Applied with the ruling's default named ((ii)) and the probe agent before grading as the decisive
  read; the arming read is kept as well (GD-e).
- **N2-f case (8).** Restated for the sums rule (two block-only twins STOP; one does not under the default).
- **I5-a.** "or NO LATENCY VERDICT (an out-of-window start included)" is replaced by the ruling's sentence: item 1 is
  still read in an out-of-window hour, but only 3c and rule 4 can reach it there.

## Instruments changed or added (all in VH; every change re-calibrated, outputs re-written 09:27)

| instrument | change | calibration result |
|---|---|---|
| `h40d-thoughts-noise.mjs` | N6-a, N6-b (two lines) | s50e 4-holes case → INCOMPLETE (was PASS (fallback)); h40c → PASS; every revision-2 case reproduces (diff against `recheck-scratch\thoughts-noise.recheck.txt`: only the holes line's wording and the added case) |
| `run-calibrations.mjs` | the 05:00 re-smoke added to the clocks cases (run window, whole log, first `--list` rows); the s50e case; a knowledge-mode section → `knowledge-mode.out.txt` | `clocks.cal-r2.out.txt` diffs against the re-checker's copy only in the three added blocks |
| `knowledge-mode-read.mjs` (new) | reads `knowledgeMode` from the shadow and the admin share, or `--file <stub>` | real file ON; stubs true → ON (0), false → NOT ON (1), absent → NOT ON (1), broken → UNREADABLE (2), missing → UNREADABLE (2) |
| `h40d-knowledge-lines.mjs` (new) | rule 1(g) after the hour: ENABLED/DISABLED placement against the timeline's byte slice; `Intent classified` per dispatch window; the windows without the line named | h40c 47/47 OK; br1 42/42 OK; 16:12 23/24 OK; 05:00 21/22 OK; fixtures ok-20 OK, missing-1-of-20 OK (95.0%), missing-3-of-20 VOID, disabled-inside VOID, no-enabled VOID |
| `kmode-stubs\`, `kmode-fixtures\` (new) | five stub settings files; five synthetic logs from `make-fixtures.mjs` | as above |

Not built, as before (specified in §7.4 with their known cases): `h40d-twins.mjs` (now with the sums clause and case
(8) in both readings), `h40d-rule3.mjs`, `guard-h40d.mjs` (now with check 13), the launchers, the register and
precheck scripts, the merge script, the dispatch text, `h40d-grader-models.mjs`, `h40d-hascuerule-check.mjs`.

## Rulings I think are wrong

None. Two notes rather than objections: (1) under the sums-with-margin default a single block-only twin cannot STOP
3c on its own (above, N2) — the ruling chose the clause's null rate over single-event sensitivity, and the live hour's
rule 4 still fails on a block-only answer; (2) rule 1(g)'s 95% sub-condition tolerates the first-run-window skip seen
on both cue smokes, but a third such window in 45 would VOID the hour for a cause that is not cue mode's — the windows
are named with their G so the reader can see the shape, and the threshold is the re-check's, kept as written.

## What still needs the user (each with the controller's default; also §12 "Only the user")

1. **The veto on §12** — the ten answers, A–E (C and D named as the review's questions to the user) and the re-check's
   rule changes (1(g), N2, 5a, M13, the precedence). Default: as applied.
2. **GRADER DRIFT, if the probe agent reads an alias other than `claude-opus-5-5`:** default (ii) grade anyway, 3a
   reported, GRADER DRIFT, not validated; alternative (i) a dated re-pin amendment written before grading. Written
   into §11 now, not at grading time.
3. **3c's gated wrong clause:** default the three reps' sums with a margin of one; alternative the strict per-rep
   clause. Written into §11 now.
4. **The live look ends with Context ON** (the user operates the toggle in their own app; the controller re-reads the
   key afterwards). No default — only the user can do it.
5. **The bench's thinking-token difference, if above 150 tokens:** raised with the user before arming; default the
   threshold stays at 150 (the bench is running as this is written; the difference is read with `--control-dir`).

To know, not to decide: the bench started at 09:04, four minutes after the 09:00 line, with 298 of headroom; a last
call after 10:00 puts part of a bench on the replay's quota day (the replay's own rule). Settled by this revision and
no longer on the list: 2e's branch (GONE → gated), the out-of-window reading (ruling 6), the re-run's `--only`
(ruling 4), 5a against ruling D (ruling 3), M13's gap (ruling 7), the timing of the GRADER DRIFT check (ruling 5).
