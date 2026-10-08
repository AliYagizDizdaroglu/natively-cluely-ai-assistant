# Task 14A review: blind side-by-side grading export (Opus reviewer)

**SPEC: FAIL  QUALITY: CHANGES**

The behaviour rules are right: the arms, the appended S text, the whole-item cut, the seeded shuffle, the keyhold and the counts-only output all match the brief. But the builder refuses every run folder the real harness creates. It also refuses the whole export on two failure modes a real hour can produce.

## What I ran (synthetic data only, no real captures read, no answer text printed)
- I re-ran `cal-build-blind-rd.mjs` with `RD_CAL_OUT` pointed at my scratchpad, so the LAB `.txt` stayed untouched. Result: **35/35 PASS**, exit 0. This matches `cal-build-blind-rd.txt`.
- I compared the roster: `live40.questions.mjs` (live-router-d) against `sp\live40\items.json`. items.json sha256 = `e531772b…2aaf`, as registered. 0 of 47 ids differ in route, class, text or parent. On all 16 follow-ups `chain === parent`, so `judgeItems.chain = i.chain` is equivalent to r40's `i.parent`. The judge in WT equals the judge in MAIN.
- Builder probes (scratchpad `probe14a.mjs`, synthetic entries):

| probe | result |
|--|--|
| P1 folder named as the harness names it: `2026-10-07T20-00-05-router-default-r1` | **exit 2** "only the registered run label" |
| P2 a shadow entry with `text: ""` (pipeline aborted or failed before any token) | **exit 2** (whole export refused) |
| P3 the L entry from turn 1 with the S entry from turn 7, same id | exit 0: **paired across turns** |
| P4 two dispatched turns in one play window, both Live-shown | **exit 2** duplicate |
| P5 an appended entry with no L | exit 0, A alone |
| P6 `id: null` | exit 2 |

## Findings

### BLOCKING
**B1. The run-label rule refuses every real run folder.** `build-blind-rd.mjs:43` requires `path.basename(runDir) === 'router-default-r1'`. The harness never names a folder like that: `interview60.run.mjs:598-599` writes `${stamp}-${label}`, and `interview60.flight.mjs:241-243,395` finds the folder by `endsWith('-'+label)`. Probe P1 shows the real-shaped folder refused with exit 2.
- The brief requires output "when run on the real run" (PLAN 1775). As built, that can only happen if someone renames the folder by hand, which is undocumented.
- The calibration did not catch this because RD-10..10d model bare-label folder names.
- Fix: accept exactly `^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-<LABEL>$`. Keep refusing `<stamp>-router-smoke`, `<stamp>-<LABEL>-1002` and a prefix of the label. Add the stamped real shape to the calibration as both an accept case and a refuse case.
- Consequence for Task 19: with a stamp in the name, the smoke's label and the run's label must differ. The registration must name both, and the run folder once it exists, because a stopped-then-retried hour gives two `<stamp>-<LABEL>` folders.

### IMPORTANT
**I1. A pipeline answer with empty text refuses the whole export.** At `:66`, `check()` refuses any entry whose text is empty, shadow entries included.
- The arbiter writes exactly that entry. `routerArbiter.ts:404,409-410` (live-router-b) gives `text = historyText ?? (pipeText || finalText || '')`. A Live-shown turn whose pipeline aborted (Review Focus 1: "an aborted shadow still gets a capture line") or failed (a 429, a stall) before its first token is captured as `shadow` with `""`.
- The pipeline's first token comes at ~4.5 s and Live shows at ~1–2 s, so this is a realistic case, not an impossible one.
- Probe P2: exit 2, nothing exported, after the hour is spent.
- Fix: an empty shadow or appended text is an understood failure, not a malformed file. Export the L alone, record it in the key (for example `sEmpty: true` on the L entry) and print a count. The Quality scorer then applies a registered rule (empty S = not acceptable). An empty **live** text may still refuse, since shown=live means V happened and empty text would be a real anomaly.

**I2. Concern 2: refusing on a duplicate is the wrong rule, and so is picking one.** At `:69`, two entries of one kind for one roster id refuse the export.
- Supersede is not the source of duplicates. `onSupersede` keeps the same turn (`routerArbiter.ts:356-373`), and the capture is deduplicated per `turn:kind`.
- The source is two dispatched turns mapped into one play window by `buildCaptureFiles`. That is the known double-answer and early-fire class (s50a 13/20, h40 doubles), and it is plausible within 47 items.
- Refusing hands an unregistered choice to the controller after the hour is spent.
- Picking one silently drops a shown Live answer from the Safety grading, and spec §5 says "a shown Live answer is graded **as shown**" (each one; Safety: "0 wrong Live answers shown").
- Fix: **pair L with S by `turn`, not by id.** That is also the brief's wording: "the shadow pipeline answer for the same turn" (PLAN 1792). Export every Live-shown turn, and keep all turns of one id in the same file (whole item). The key already carries `turn`, so add the turn's rank within the id. Print the number of ids with more than one turn. Task 19 registers how the scorer treats them for the Quality pair.
- Pairing by turn also closes P3: today `s = AP.get(id) ?? SH.get(id)` (`:85`) can join turn 1's Live text to turn 7's pipeline text. Keep the "both hidden and appended" refusal per turn.

**I3. Concern 4: the identical S and A texts reveal which answer is Live.** On an appended item, the file holds three answers to one question. Two of them (S, A) are byte-identical, so the grader can tell the odd one out is L. A three-answer item also tells the grader that the item was appended, which means Live failed on it.
- This breaks the blinding the dispatch asked about (PLAN 1799: "Arm, id and class live only in the key").
- It touches the decisive Safety bar, because L's grades are what Safety reads.
- Two fixes; the controller picks one:
  - (a) emit the appended text once, as one q mapped to both arms (`arms: ['S','A']`). That gives one grade for identical text, and the scorer shape changes.
  - (b) put the A items in their own file(s), outside the 4-file whole-item cut. A is "its own single-answer item" (PLAN 1795).
- Either way, the registration should state it. As built, the report's line "it cannot tell which arm either is" is true for S and A, but not for L.

### MINOR
**M1. The judge and roster import differ from the brief.** `--wt` defaults to `live-router-d` (`:23`). The brief says to copy r40's import, which reads MAIN.
- MAIN has no `live40.questions.mjs` until Task 16, so the default works for now. After landing it should be MAIN.
- The build record (`:111`) stores `graderPromptVersion()` but not the sha256 of the roster module or the judge file. Add both, in the style of r40's `readRSha256`, so the scorer can refuse a drifted instrument.

**M2. Every file gets the same shuffle when files are the same size.** `shuffle(flat, rng(SEED))` starts a fresh stream per file (`:100`), so two files with the same entry count get the same permutation. This is inherited from r40 and the brief says to reuse it. A grader cannot exploit it without the code. No change needed; listed for completeness.

**M3. Arm length is a known tell.** L is at most 80 words (the reader limit) and pipeline answers run long, so length partly reveals the arm. This is inherent to grading "as shown" and the export cannot fix it. The registration should name it as a known limit.

## The implementer's concerns
1. **Run label `'router-default-r1'`.** The value is fine as a placeholder for Task 19. The matching rule is wrong (B1): it must allow the harness's `<stamp>-` prefix. A re-fly also needs a new label and a new seed (`blind:router-default:r1` is r1-specific).
2. **A duplicate refuses the whole export.** Neither refusing nor picking one is right. Pair by turn, export every Live-shown turn, and count them (I2).
3. **Live with no shadow is exported L-only.** Correct per spec §5: Safety grades the Live text alone. The scorer must leave these out of both sides of the Quality bar ("same items"); the key allows that. Extend this to empty-text shadows (I1).
4. **S and A carry identical text on an appended turn.** Required by the spec for S. Emitting both into one file leaks L's identity (I3).
5. **The file cut is derived from the item count.** Correct. r40's fixed 12/12/12/11 cannot apply when the item count depends on the hour. It is whole-item and contiguous, sizes differ by at most 1, and empty slices are dropped (RD-13/13b/13d).

## Brief checklist (PLAN 1769-1818)
- Arms L / S (appended → appended text) / A, and pipeline-shown items excluded: met (RD-2, 3, 4, 4b, 5).
- Shuffled, keyed `q01..`, arm/id/class only in the key, field names neutral: met (RD-6/6b/6c). The content tells are I3 and M3.
- Counts only: met (RD-8b). REFUSED lines print ids and turns, never text.
- Seeded FNV-1a with `blind:router-default:r1`, 4-file whole-item cut, keyhold layout, no-overwrite: met.
- Refusal of a non-registered folder: met literally, unusable on real folders (B1).
- Step 1 assertions, all seven: present. RED was recorded. Step 2 break-once (L↔S swap in the key) is caught (RD-15), and builder mutants were reported killed.
- Step 3, no repo commit: met.

## Not shown
- No real capture files exist, so nothing exercised the real `buildCaptureFiles` output end to end.
- The downstream grader and scorer were not run. Pairs shape = r40's.
- I did not re-run the implementer's builder mutants.
- The supersede capture: on a superseded Live turn, the `shadow` entry holds the superseding pipeline text, which **was shown** (`settle` at `routerArbiter.ts:409` still writes kind `shadow`). It enters the export as a hidden S. That is upstream (Task 5/13) and not 14A's to fix, but the key cannot mark it. Flagged for the controller.

## Re-review (fix round 1)

**Verdict: SPEC: PASS  QUALITY: APPROVE.** Every finding is resolved as the controller ruled. Blinding holds for field names and for duplicate texts. Two minor residuals remain; neither blocks.

**What I ran:** the fix1 calibration, with output sent to my scratchpad and the LAB `.txt` untouched: **53/53 PASS**, exit 0, matching `cal-build-blind-rd.txt`. Synthetic data only. I read `build-blind-rd.mjs` in full, and the capture path of `routerArbiter.ts` at live-router-b `8d2de5b` (task-5-fix2).

### Status of each item
| item | ruling | status | evidence |
|--|--|--|--|
| B1 | folder matches `^<stamp>-<label>$` | RESOLVED | `:28,:50` (the label is regex-escaped). RD-10..10g: smoke, suffix, prefix, bare label, date-only and junk-prefix folders are all refused; `<stamp>-<label>` is accepted. The stamp shape equals `interview60.run.mjs:598`. |
| I1 | an empty shadow exports L alone, `sEmpty` | RESOLVED | `:76` makes text non-empty mandatory for live entries only. `:106,:112` handle the empty case. An empty Live text still refuses (RD-11f). RD-13/13b. |
| I2 | pair by turn, every Live turn exported, one file per item | RESOLVED | Maps are keyed by turn (`:79-80`). A turn whose live and shadow entries name different ids refuses (`:88`). Turns are sorted within an id (`:96`). The key carries `turn` and `rank`. RD-14/14b/14c, and RD-19c (a swapped turn is caught). |
| I3 (a) | appended text emitted once, arms `['S','A']` | RESOLVED | `:113`. RD-7b: no two identical answers in any file. The key shape is now `arms: [...]` throughout, and the scorer (Task 19) must read that shape. |
| M1 | `--root`; roster and judge sha256 in the record | RESOLVED | `:51,:60-62,:141`. RD-16/16b. The default is still live-router-d; switch it to MAIN after Task 16. |
| superseded | L alone, key-marked; a missing field counts as false and is counted | RESOLVED | `:77,:105,:110`. Either record's flag marks the turn (RD-15d). |

### Superseded handling checked against the arbiter
- **Supersede while Live is streaming.** The live capture is written at `:368` with `t.superseded = true` already set. The replacing stream's `shadow` is written later, also superseded. The builder exports L alone and drops the shown replacing text, as ruled.
- **Supersede after Live has finished.** The live capture carries `false`. A later shadow carries `true` (`:374`), and the builder still marks the turn, because either record is enough.
- **Shadow captured before a supersede.** The texts are the original hidden pair, both flags are false, and the turn is exported as a normal L/S pair. That is correct.
- **A turn with both `shadow` and `appended`.** This cannot happen: `append()` runs only while Live is streaming, and `settle` writes a shadow only once Live is done. The ambiguity refusal at `:85` is therefore defensive and never fires on valid data.

### Blinding
- Pairs items are built from an explicit field list (`:134`): no arm, turn, rank, `sEmpty` or `superseded` field. The calibration's leak scan now covers `arms`, `rank`, `sEmpty` and `superseded`, with a positive control.
- The identical S/A tell is gone.
- **MINOR R1 (residual): a lone answer tells the grader its arm.** An item exported as L alone (sEmpty, superseded, or no pipeline answer) shows the grader a single answer to that question, and that answer is almost certainly Live. The same holds for A alone. This tell existed before fix1 for the no-pipeline case; I1 and the superseded ruling route more items into it.
  - It cannot be removed without a decoy.
  - Record it in the registration beside M3 (the length tell). The run's count of such items is printed, so its size is known.
- **MINOR R2:** an L-less turn whose appended text is blank or superseded is dropped without being counted (`:115-116`). Under the arbiter this is unreachable, because `append()` always writes the live capture first. Counting it would be a one-line change; optional.

### Carried to other tasks (not 14A defects)
- **Task 13 must copy `superseded` into the capture entries.** Until it does, every record counts as missing the field and a superseded Live turn is exported as an L/S pair whose S was shown. The count line makes this visible but does not refuse.
  - Recommend: the smoke's build line must show `records without superseded field 0` before the registration is sealed (Task 19).
- **Task 19 must register:**
  - the label;
  - the scorer's reading of `arms`;
  - multi-turn ids (`rank`) in the Quality pair;
  - `sEmpty` and `superseded` items excluded from Quality but kept for Safety;
  - R1 and M3 as known limits.
- **Grading of superseded turns' replacing text.** That text was shown, and it is not in this export. It must be covered by the in-app `[Answer] full:` grading for the No-regression bar. I did not verify that.

### Not shown
- No real capture files exist, so the Task 13 → 14A chain has not run end to end.
- `--root` has not run against MAIN, because MAIN has no roster module until Task 16.
- I did not re-run the implementer's mutants. I checked the calibration's turn-swap and id-swap controls in its output.

SPEC: PASS  QUALITY: APPROVE

## Re-review 2 (fix2 + fix2b)

**Verdict: SPEC: PASS  QUALITY: APPROVE.** The superseded set and the log slicing are correct against the real producers (arbiter fix3, the main.ts logger, run.mjs), and blinding is unchanged.

**What I ran**
- The calibration, with output sent to my scratchpad: **64/64 PASS**, exit 0, RD-21..21e and RD-22..22f included. Synthetic data only.
- I read `build-blind-rd.mjs` in full.

**Checked against the real producers**
| assumption in the builder | producer | holds? |
|--|--|--|
| diag line `[Router] superseded turn=<n> phase=<streaming\|done> line_written=<yes\|no>` (`:110`) | `routerArbiter.ts:366` (live-router and live-router-b, identical): emitted on every supersede of a `shown=live` turn, whatever the Live phase, before any capture | yes. The format matches the regex exactly, and repeated lines collapse in the Set |
| the line reaches `natively_debug.log` | `routerDiag()` → `console.log` → main.ts's console patch → `appendFileSync(logFile, ISO + ' ' + msg)` (`main.ts:63,124`). The regex is unanchored, so the timestamp prefix is harmless | yes |
| the log is in the run folder | `interview60.run.mjs:608` copies `DEBUG_LOG` into `dest`. Task 13's `buildCaptureFiles` reads that same copy (`:619`) | yes |
| header `=== Natively session started <ISO> ===` at line start | `main.ts:3436`: `writeFileSync` with `toISOString()`, the first line of a fresh log at every app start. `^` anchoring and `Date.parse` hold | yes |
| the slice equals `router-hour-read.mjs` | `router-hour-read.mjs:76-81` uses the same header regex, the same "last header ≤ startedMs" rule and the same restart-inside-the-hour refusal | yes. The builder also cuts at the next header (`:108`), which is stricter and harmless |
| `startedMs` / `endedMs` in the timeline | the same fields the hour reader requires | yes |

**Edge cases**
- **Size rotation inside the hour.** `LOG_MAX_BYTES` is 10 MB (`main.ts:42`), and recent hour logs run 0.4–0.9 MB (h40c, h40d, eq, br1). A rotation mid-hour would cut the header and refuse the export loudly, never silently. This is very unlikely.
- **A supersede after the shadow was already captured.** Phase is done and the pipeline had ended: the diag line now marks the turn, so a genuine hidden L/S pair is exported as L alone. That is conservative and follows the ruling (L alone, out of Quality, kept for Safety). It costs at most one Quality pair per such turn, and the `superseded` count shows it.
- **Probe turns.** Supersedes during the preflight probe fall in the same session. They are counted as "found only by the diag line" with no capture entry, and they export nothing. Correct. The reader should expect a nonzero diag-only count from them.
- **Task 13's capture files are not sliced.** Their turn ids are mapped by play window (`buildCaptureFiles`). With one session per log (main.ts resets the log at every app start), collisions across sessions cannot occur. The builder's slice is defence in depth. No action needed.
- **Missing log, header or timeline, or a restart inside the hour.** Each refuses with exit 2 before anything is written (RD-21c, RD-22c..f).

**Blinding**
- The pairs-item construction (`:159`) is unchanged: no turn, rank or superseded field.
- The new printed turn ids go to the operator's stdout, not to a grader's file. They are turn numbers, not roster ids.
- R1 (a lone answer tells the grader its arm) and M3 (length) stand as known limits. The superseded route sends a few more items to L-alone.

**Fixed since re-review 1:** the carried Task 13 risk is gone. Missing capture flags no longer leave superseded turns unmarked, because the diag line covers them. The `records without superseded field` count is now informational.

**Not shown**
- The real arbiter line has not been observed in a real log. The calibration uses synthetic lines in the producer's exact format, which I checked by source.
- The smoke should show `diag line turns` ≥ `capture flag true` and a nonzero union if any supersede happened.
- No real run folder exists yet.

SPEC: PASS  QUALITY: APPROVE
