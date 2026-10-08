# Task 14 report: hour reader and calibration

Status: DONE_WITH_CONCERNS. No repo commit (LAB files, per plan step 4).

## Files (LAB = natively-lab\sp\router-default)
- `router-hour-read.mjs` (sha12 11108da84afc): `node router-hour-read.mjs <runDir> --down-limit-min <n> [--root <checkout>]`. Exit 0 read OK, 3 VOID, 2 usage or bad input. Prints counts and ms only.
- `router-hour-read.cal.mjs` (sha12 74c58b0ee672): 68 assertions on synthetic run folders built by construction; `--mutations` breaks the reader 12 ways and requires the cal to fail on each. `RH_READER` and `RH_ROOT` env override the reader and roster checkout.
- `router-hour-read.cal.txt`: output of `--mutations`: 68/68, 12/12 mutations CAUGHT.

## Test-first
- RED: calibration run against a nonexistent reader: 1/68 passed (the one pass is the trivially true "no text printed"). Honest note: I drafted the reader before running the RED; the RED was taken against a missing reader, then the reader was run. Each assertion was then proven by the mutations.
- GREEN: 68/68. Mutations: drop-dup-exclusion, ignore-OFFSET_MS (the two the plan names), pipeline-marker-any-case, brackets-as-pipeline-markers, void-floor-off-by-one, stale-close-counts-down, speed-limit-strict, easy-min-12, misrouted-counts-late, sent0-ignored, bare-token-substring, no-superseded-allowance. All caught.

## Calibration summary (each bar reads differently when the effect is absent)
- Clean log: all four reader bars PASS, integrity 0, MATCH, verdict "reader bars MET".
- Safety live: `hard.`, `"hard".hard` -> hard-first=1; `<x>`, `__foo__` -> router-marker=1; `hardware` clean.
- Safety pipeline (I6): `List[int]`, `a < b`, `__init__`, `__MORE__`, `__CUES__`, "hardware..." clean; `__S1Q05__` -> unknown-marker=1; whole text `Hard.` or `hard.HARD hard` -> bare-routing-token=1.
- Fallback: missing appended entry, row-4 turn with live capture, live text of 5 or 81 words flagged `-`, `sent=0`: each FAIL.
- Speed: p50 2500 PASS, 2501 FAIL; nearest-rank (even n gives the lower middle).
- Routing: EASY 13 PASS / 12 FAIL; HARD misrouted 1 PASS / 2 FAIL; late, router-down, no-router-turn HARD items not counted, reported (`HARD late (not misrouted, M2)`).
- VOID: failed at dispatches_before=9 -> exit 3; =10 -> exit 0; down 10 min vs limit 5 -> exit 3, vs 15 -> 0. goAway pair (non-stale close, then stale close) = 2 s = 0.03 min; window clip at start (0.50) and end (1.00); a close after the hour adds 0.
- Integrity: one dispatch with no decision reads 1; `sent=0` reads "dispatched turns with nothing shown (sent=0): 1".
- Captures: missing shadow, orphan, capture on a pipeline turn, short capture file, absent capture files, wrong `appended` flags: MISMATCH. Superseded turn (shown=live, no live capture) is counted apart and MATCHes.
- Item mapping: a dispatch 1 s before a raw boundary maps to the earlier item with OFFSET 1150 (flips if the offset is ignored).
- One reason line each for `-`, garbled-hard, too-short, too-long, incomplete, incomplete-after-show, marker, late, router-down, no-router-turn, plus dup and unpaired (shown=-, counted apart).

## Producer facts used (read from code, not the plan text)
- Decision line (Task 5 `routerArbiter.ts` L432): `[Router] turn= route= reason= live_first_ms= live_words= shown= shadow= ear= router= q_src= q_at= sent=`; dup/unpaired lines (L194) have no `sent` and `shown=-`. Dispatch line L97. `q_at` is epoch ms (the harness maps it against `timeline.startedMs`).
- Session close: count non-stale (`stale=no`) closes as down; quota by `reason=quota` prefix on reconnect lines and `quota=yes` on closes.
- Ear (Task 1): `[LiveRouter] close gen= code= reason= stale=`, `reconnecting (attempt`, `quota close #`, `[Main] Live Mode status:`.
- `session failed ... dispatches_before=` and `ear failover ...` have no producer in the worktrees yet (Task 10/11 not built); I parse the plan's formats (PLAN L1559, L1599). Re-check when those merge.
- `ws error` and `write failed` lines are ignored.

## Decisions and deviations
- `--down-limit-min` is required (exit 2 without it): the registration sets it, no default invented.
- The reader slices the log from the last `=== Natively session started` header at or before the hour start, so older app sessions do not feed the VOID rule.
- Down time: a router never seen up before the hour start is treated as down from the start (printed as `start_state=unknown(assumed down)`).
- Items with decisions: bars use conservative bases. EASY caught = the item's FIRST decision (by q_at) is shown=live; `easy_caught_any_decision` also printed. HARD misrouted = ANY decision of the item with a deciding turn and route not hard; first-decision basis also printed.
- Superseded turns: inferred as shown=live with no live capture (the log has no direct supersede line). The reader cannot tell this from a genuinely lost live capture; both read "superseded_without_live_capture=n". Fallback and integrity still hold if a shadow or appended capture is missing.
- Fallback also counts a shown live answer outside 8..80 words with reason `-` as an unflagged failure (spec: invalid answers must append).
- Hard-first live text counts under Safety only (spec lists it under Fallback too; not double-counted).
- Tallies (section 4) are marked CUTTABLE in the output.
- `[Answer] full:` lines are scanned from the hour start; hidden shadows do not produce them (spec 5), so they are not scanned as pipeline-shown text.
- Percentile method, nearest-rank, is my choice (spec silent).
- The roster is imported from `--root`'s `live40.questions.mjs` and checked to be 47 items, 20 EASY, 27 HARD; a timeline missing any roster item exits 2. The default root is MAIN, which has no live40 yet: pass `--root` (live-router-d or the integration worktree) until it merges.

## Not exercised
- No real run folder: nothing exists yet. The real `[Router]` line shapes were taken from code, and the synthetic logs copy those shapes; a first dry read of the smoke's folder should happen before the hour.
- Real log files with CRLF are handled (`\r?\n`) but not tested.
- The timeline `clock` field is printed only; OFFSET 1150 is applied always (plan constant, matches `buildCaptureFiles`).
- Rotated logs (`natively_debug.log.1`) are not read.

## Concerns
1. The EASY-caught basis (first decision vs any) changes the bar when the detector doubles an answer; flagged for the controller's ruling.
2. Superseded vs lost live capture is not separable from the log alone.
3. Producer formats for `session failed` and `ear failover` are not yet in any worktree.
(Concern 2 and 1 superseded by fix1 below.)
4. Task 5 formats may change slightly (ebfd8d5 under review); the reader keys on `key=value` tokens for decision lines, so added fields are tolerated, a renamed `sent` or `q_at` is not.

## fix1 (controller rulings, lane B 8d2de5b)
New shas: `router-hour-read.mjs` 4eede4b7d97c, `router-hour-read.cal.mjs` 228c8d32bb66. Cal 73/73, 14/14 mutants CAUGHT (`router-hour-read.cal.txt`).
- Supersede is read from `superseded=yes|no` on the decision line and `superseded` on each `[RouterAnswer]` capture. The "shown=live with no live capture" inference is gone: that case is now a LOST capture (`lost_live_captures=n`, CAPTURES MISMATCH, reader bars not MET).
- New checks: line and capture flags must agree (`superseded_flag_disagreements`); `superseded_turns=n` printed; a superseded turn's partial live text is not an "unflagged failure" in Fallback.
- Pre-fix logs: `WARNING pre-fix log: <n> decision line(s) without superseded= and <m> capture(s) without a superseded flag`; reading still works. A clean log prints no warning.
- Calibrated: superseded with captures (MATCH, 3-word partial text, Fallback PASS); lost (superseded=no, no capture); lost while superseded=yes (still lost); flag disagreement; pre-fix log; no warning on a clean log. The old inference is mutant `old-inference-lost-is-superseded`: the cal fails on it. Two more mutants added (partial text flagged, warning silent); the earlier 12 are still caught.
- Rulings 2-5 applied: EASY caught stays on the first decision (any-decision printed as `easy_caught_any_decision(info only)`); `--down-limit-min` mandatory; MAIN default root; plan-format parsers kept for `session failed` and `ear failover`.
- (Superseded by fix2 below where they differ: the supersede flag-agreement rule is replaced by the diag-line rules.)
- Not verified: a superseded shown=live turn is required to have the same capture set as an unsuperseded one (live plus shadow or appended). I did not check lane B's `settle()` after 8d2de5b for what it writes on a supersede; a different set would show as a MISMATCH.

## fix2 (review `reviews/task-14-review.md`: SPEC FAIL, QUALITY CHANGES)
New shas: `router-hour-read.mjs` 9d0da3453bd4, `router-hour-read.cal.mjs` a98c74c42876. Cal 109/109 assertions. The 28 mutants of the full run (`router-hour-read.cal.txt`, taken at reader a072ef911be1) were all CAUGHT; the full mutation run takes about 40 minutes on this machine, so after the last change (below) I re-ran the cal (109/109) and only the new mutant (caught: 2 assertions fail). `cal.txt` therefore predates the Task 11 scene: re-run `--mutations` for a final record if wanted.
- **Task 10/11 lines (143d8df):** `session failed reason= dispatches_before=` matches my parser. `ear failover` is now matched only as `ear failover from=`, so `[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=<id>` is not a failover (before, it would have exited 2 for a missing dispatches_before). `flag`, `ear model=` and `ear model id not recognised` lines are ignored. Two scenes (with all new lines; disabled line alone) and mutant `T11-disabled-read-as-failover`. Each finding has a scene that fails on the old behaviour, and a mutant that restores it.
- **B1 (diag line, fix3 4878ad8):** `[Router] superseded turn= phase= line_written=` is parsed (first line per turn wins; extras counted as `superseded_extra_lines`; an unknown `[Router] superseded` shape exits 2). `superseded_turns` = distinct in-hour shown=live turns with a diag line, split streaming/done and line_written yes/no. Record defects (a)-(d) exactly as the review lists them, printed as `superseded_record_defects`; `superseded_orphan` for a diag line with no shown=live decision; both fail the capture check. phase=done may read live capture false (not a defect). The Fallback partial-text exemption now applies only to `phase=streaming`. The output states that pending-mode supersedes are never logged and not counted. The pre-fix warning also fires when a turn reads superseded with no diag line. Scenes: streaming, done/no, done/yes, doubled line, (a), (b) two ways, (c), (d), orphans, bad shape, done partial text. Mutants: drop diag parse, drop (c), drop (d), ignore orphans, exempt all phases.
- **I1:** `session failed` and `ear failover` match on `\b` only; `dispatches_before` is the LAST one on the line or its continuation lines (lines without a timestamp); absent means exit 2 naming the timestamp. Scenes: newline in reason, trailing field, last-wins, absent (both lines), ear trailing. Mutants: strict anchored regex, absent skipped.
- **I2, what I count:** the arbiter's `sent` is incremented in `emit()` for every outbound event, `ch:'source'` label events included (routerArbiter.ts L351, L297, L239), so `sent>=1` can mean a label only. "Dispatched with nothing shown" now = `sent=0` OR `shown=pipeline with shadow=-` (no pipeline token; pipeFirstAt null). Both printed apart; both fail Fallback and integrity. Residual: I cannot see a shown=live turn whose Live text was empty (live_first_ms exists whenever V was set), and a pipeline turn whose only visible output was a cue block would read as no-token (the ruling accepts this; none is expected on live40).
- **I3:** p50 is the conventional median everywhere (mean of the two middle values); p90 stays nearest-rank. Scenes: n=14 with the 7th value 2500 and 8th 3000: median 2750 FAIL (the old reading passed); middle values 2000 and 2900: 2450 PASS. Mutant: lower middle.
- **I4:** the reader keys on `=== Natively session started <ISO> ===`. It exits 2 ("log does not cover the hour (rotation or restart)") when no such line is at or before `startedMs`, and exits 2 on a second such line between `startedMs` and `endedMs` (a restart inside the hour). Older sessions before the covering header are ignored. `assumed down` remains only for a covered log whose router never came up.
- **M1:** a repeated decision line is counted once; duplicate decision lines, duplicate dispatch lines and decisions without a dispatch line fail integrity (own scenes and mutant).
- **M2:** `unparsed_decision_lines` and `decisions_without_q_at` printed; any non-zero fails integrity.
- **M3:** `itemFor` has no upper bound, like `routerCapture.mjs` idFor. The cal also runs the harness's own `buildCaptureFiles` on the after-hour scene and asserts the same live ids and turns as the reader's expectation.
- **M4:** the tallies header says "SESSION-WIDE ... NOT the hour" and every line starts `TALLY session-wide`.
- Not exercised: real logs; Task 10/11 producers (`session failed`, `ear failover`) still not on disk; the `phase=done line_written=yes` case reads captures that exclude the replacing pipeline text, so 14A must take the superseded set from the diag line (review carry-over).

## wb-fix-b (whole-branch review I-1: punctuation-only first token hid "hard"; rev 2 = app parity)

- Reader `router-hour-read.mjs`: `hardFirst` uses EXACTLY the app's rule (integration 4757002, `routeReader.ts` `completeFirstWord`): the first whitespace-delimited token whose letters-only form (`toLowerCase().replace(/[^a-z]/g,'')`) is non-empty; hard = `^(hard)+$` on that form. ASCII a-z only, so a token like u-umlaut is skipped; completeness is treated as satisfied (a shown answer). First revision used a Unicode-letter test; replaced.
- Calibration `router-hour-read.cal.mjs`: 9 new Safety scenes. Breach: quote token, "..." token, two dash tokens, u-umlaut then hard, "- Hard.", "h-ard". Not a breach: punctuation then "hardware", "hard" as a later word after a letter word, "hardware" alone. Mutant `wb-fix-b-first-token-only` (restores `tokens(text)[0]`) kept, pattern updated to the new rule.
- Plain calibration: 118/118, CALIBRATION OK (was 109/109). Against the previous (Unicode-letter) reader: 117/118 (the u-umlaut scene fails: RED for the parity change). Against the old first-token reader at first revision: 111/114.
- New mutant run alone (not the full --mutations): CAUGHT, 113/118 (5 assertions failed).
- Reader sha12 (SHA-256 of the file): 2d17df40226e
- Not covered: full --mutations not re-run; the app's rule was read from the task message, not re-diffed against the integration source.