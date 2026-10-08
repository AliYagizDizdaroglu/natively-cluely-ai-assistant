# Review: counts-only cue reporting (cue-report.mjs, cue-leak-check.mjs, cal) — 2026-10-06 ~01:10

Reviewer: Opus, read-only (only this file written; probes in the session scratchpad; no model call, no scheduled task, nothing in MAIN).
Against: AMENDMENT-A4 lines 121–131, A5.1 leak checker (A5 lines 55–61), A6 m5, NOTE-post-hour-tools-2026-10-06 (d).

**Verdict: NOT READY — 1 BLOCKING, 4 IMPORTANT, 5 MINOR.**

## Checked as stated
- sha256/12 as read: cue-report.mjs a907fa222d36, cue-leak-check.mjs e3fb5ebd4054, cue-leak-check.cal.mjs cf6596978c02 (match the build report);
  wrapped instruments c1ecd07d10a9 / cdc1f9477c50 / b8f374f78af0 / 066f5e81ee59 (match).
- Cal driver re-run 01:07: `TOTAL 15 ok, 0 FAIL`, exit 0; identical to cue-leak-check.cal.txt (634 distinct, 158 >= 30, 254 < 24).
- smoke and facts summaries are built by construction: every copied line traced to an instrument print whose content is ids, numbers,
  model names or fixed words (check-smoke-cues 66/80/83; smoke-facts 28/30/35/40/41/46/50/63/68/70/75/82/88). The `e.g.`, trimmed,
  failed, block-only, unparsable, malformed and `dist CUE_SHAPE_RULE` lines are not copied. Smoke's folder check (head must name the
  folder) holds: the instrument reads only the last folder ending in the label.
- twins and thoughts print ids, counts, stage names, a 40-char-capped provider error and a 40-char-capped finish reason (twins 181–191,
  253–263; thoughts 71–110); refusals and stacks go to stderr, which only reaches the full file.

## BLOCKING
**B1. A malformed export prints cue text to the controller, unchecked.** `cue-report.mjs:106` calls `leakCount` without a try/catch.
`JSON.parse` throws a SyntaxError and Node's uncaught-exception banner prints the offending SOURCE LINE of the export to stderr.
Reproduced on a copy of the wrapper in the scratchpad with a synthetic, truncated export: the banner printed the synthetic cue
string verbatim, then the stack; exit 1 (undocumented). The real export is written with `JSON.stringify(obj, null, 1)` (4098 lines,
max 140 chars), so a cut-off write or a wrong `--export` file (a full.txt, a log) prints one cue line (or that file's line).
The CLI already maps this to `refused unparsable export`; the wrapper does not. Fix: read and validate the export once, before any
instrument runs (`cueStrings` in try/catch, fixed refusal text, exit 2).

## IMPORTANT
**I1. Without `--export` the wrapper prints the summary unchecked (fails open).** `cue-report.mjs:105–111` writes `<run>.<tool>.summary.txt`
and prints it to stdout, adding only `(no --export given: summary NOT leak-checked)`. Note (d) says that without it "the summary is
not quoted", but stdout IS the controller's view; A5.1 requires the check "before they are quoted". twins/thoughts are passthrough
(every line kept), so for them the check is the only guard. An unchecked summary.txt also stays on disk for a later quote, and an
uncaught exception (B1) leaves an older summary.txt in place. Fix: `--export` mandatory (refuse with exit 2 without it).

**I2. The reference set is the export, and the export does not hold every cue string in the log.** Counts from the h40d facts full file
(probe, counts only): 112 block cue strings, 7 not in the export, 6 of which read `leak 0` when inserted; 4 trim strings (the
dropped / cut / cleaned text inside `cues trimmed:` JSON), 4 not in the export, 1 reads `leak 0`. So cue text from blocks outside the
export's entries and pre-trim text is invisible to the checker. The build report's "the checker sees what the summaries drop"
(facts full = leak 109) overstates it. Today no summary path prints those strings (by construction), so this is a residual, not a
live leak; it must be named in the spec, or the checker's reference set widened (the log's cue lines and trim JSON as a second source).

**I3. Unregistered narrowing: short cues are matched only at word boundaries.** A6 m5 registers "matched whole". `cue-leak-check.mjs:46`
adds "not inside a longer alphanumeric run". Probe: of 248 short cues ending in a letter, 233 read `leak 0` with an `s` appended
(plural / verb form), which plain "whole" matching catches. The departure weakens the check and is recorded nowhere but a comment.
Either remove it or register it in a dated note with this count.

**I4. An instrument crash yields a normal-looking summary ("partial runs").** Only exit 4/null (all tools) and exit 2 (non-smoke) are
treated as errors (`cue-report.mjs:101–103`). smoke-facts exits 1 on any uncaught throw, after printing whatever it printed so far.
Reproduced (wrapper copy, instrument missing → exit 1): the facts summary read `block ids: none`, `UNPARSABLE blocks: 0`,
`trimmed ids: none`, `failed answer ids: none` and the wrapper exited 0. A mid-run crash gives a truncated summary with the same look.
For smoke, exit 1 reads as `REFUSED, the instrument read another folder`. Fix: per-tool expected exit codes; anything else =
`INSTRUMENT ERROR`, no summary.

## MINOR
**m1. Cal case 2g cannot fail.** `cue-leak-check.cal.mjs:67` passes on `leak 0` OR `leak 1`. The build report states it as "-> leak 0".
Observed reading was `leak 0`, but the check does not decide anything; set it to `leak 0` (and see I3).

**m2. Escaped forms are uncalibrated.** No h40d cue holds `"`, `\` or non-ASCII, so the JSON-escaped form (`\"`, `\\`, `\uXXXX`) is never
exercised; the checker decodes nothing. Probe: markdown-escaped form evades for 5 of 6 cues with markdown characters; HTML-escaped
for 3 of 3. Relevant to the result note (A5.1 runs the checker on it). At least name it in Uncovered; optionally decode `\"`, `\\`,
`\uXXXX` and strip backslash escapes before matching.

**m3. Unregistered rulings recorded only in the build report:** (a) `n` = merged regions (consistent with A4's cal, but A5.1 defines no n);
(b) the smoke summary has no ids, while A4 says "counts per class and ids"; (c) twins/thoughts are passed through, not summarised by
construction (A4: "only a counts-only summary line set"). Each needs a line in a dated note.

**m4. Withhold path.** Not in the cal file (build report says it was run by hand; not reproducible from the cal). Its stdout text is
`summary WITHHELD, leak <n>; ...`, not the header's `WITHHELD leak <n>`, and it returns 0, so `all` exits 0 when every summary is
withheld.

**m5. `all` silently drops `-- extra` args** (`cue-report.mjs:127`), e.g. `--strict`. Refuse the combination or pass the args on.

## Leak-checker probe numbers (h40d export, counts only)
- 24–29-char cues (outside the cal's >= 30 set): 222/222 whole → `leak 1`; first 23 chars → `leak 0` for 201/222 (registered threshold).
- Short cues minus their last 2 characters: 241/254 `leak 0` (registered: matched whole; recorded for the spec's residuals).
- Short cue lengths: 16–23: 224, 11–15: 27, 6–10: 3, <= 5: 0; one bare word: 3. A generic summary-vocabulary line reads `leak 0`
  (no false-positive pressure seen on h40d).
- Case + whitespace: 158/158 caught (cal) — confirmed.

## Not shown
- Tonight's run folder and export were not read; shapes and coverage numbers are h40d's only.
- The real wrapper was not run (it writes into E\cue-report); B1, I4 were reproduced on a scratchpad copy with a synthetic export.
- Node's banner behaviour measured on v22.19.0 only.
- No review of eq-cues-export.mjs itself (its completeness against the log is I2's root).

## Re-review (fix round, 2026-10-06 ~01:20)

Scoped to B1, I1–I4, m1/m2/m4/m5, anything new, and the twins build-hash question. Read-only apart from this section; the cal driver
was re-run (it regenerates the h40d summaries in E\cue-report, as designed). No git command was run in MAIN; MAIN's HEAD was read
from its ref file, and its dist was loaded read-only.

**Verdict: READY for cue-report.mjs d7888ad679d0 + cue-leak-check.mjs 4cd9e25db5fc (cal db4ab43b8fa8), with one IMPORTANT open item
(N1) that must get a dated note before twins runs on tonight's run folder.**

Shas as read: d7888ad679d0 / 4cd9e25db5fc / db4ab43b8fa8: match. Cal re-run 01:15: `TOTAL 40 ok, 0 FAIL`, exit 0, byte-identical to
cue-leak-check.cal.txt after its first line.

| item | status | evidence |
|---|---|---|
| B1 | CLOSED | Export loaded and validated in `main()` before any spawn (`cue-report.mjs:140`); `exportStrings` maps the parse error to `refused export-unparsable`, never the message. My truncated synthetic export: wrapper and CLI each print `refused export-unparsable (cue-leak-check.mjs:39)`, exit 2, nothing else. The `uncaughtException` handler prints a class + file:line only. Missing run log: `refused run-log-missing`, exit 2. |
| I1 | CLOSED | `--export` required (usage, exit 2); cal case. Older summary file removed before every run (`:104`). |
| I2 | CLOSED (residuals m6, m7) | Known set = export + run-log cue/trim strings + literals of the cue-carrying lines in every `E\cue-report\*.full.txt`, re-read after the instrument wrote its full file. Cal: 11 log-only strings, 11 of 11 caught (export only: 7 of 11 missed). This matches my first-round count (7 + 4). |
| I3 | CLOSED | Plain substring, no word boundary; cal 257/257 for whole, `+s` and `x<cue>x`. Shortest known string is 7 characters, so a substring rule has no 1–3-character false-positive risk on h40d. |
| I4 | CLOSED | Per-tool OK exits (smoke 0/1, facts 0, twins 0/1/3, thoughts 0). These match the instruments' own exits (check-smoke-cues:84, twins 342/378/381/382; facts and thoughts exit non-zero only on usage). A stack, `INSTRUMENT ERROR`, `Uncaught` or `UnhandledPromiseRejection` also gives INSTRUMENT FAILED and exit 3; covers a smoke crash, whose exit 1 is otherwise a reading. Cal: twins exit 2, thoughts crash. |
| m1 | FIXED | 2g asserts exactly `leak 1`. |
| m2 | FIXED | 4 forms per known string (raw, JSON incl. `\uXXXX`, markdown, HTML); synthetic cue: each form `leak 1`, clean text `leak 0`. |
| m3 | OPEN (documentary) | The three rulings are written out in the build report "For the note"; they still need the dated note. |
| m4 | FIXED | `WITHHELD leak <n>`, exit 5, dominant in `all`; cal case. |
| m5 | FIXED | `all` + extra args refused; single-tool pass-through cal'd (`--strict`). See N1 for a consequence. |

### New
**N1 (IMPORTANT): tonight's registered build does not match twins' registered filter hash, and twins does not read that build by default.**
Computed the way `h40d-twins.mjs` `loadChain` does (lines 89–102: sha256/12 of `prompts.js` `CUE_RULE`, sha256/16 of the
`verbalStreamFilter.js` file bytes):

| build | CUE_RULE sha256/12 | verbalStreamFilter.js sha256/16 | limits | dist mtime (UTC) |
|---|---|---|---|---|
| registered in twins (`REGISTERED`, l. 67) | 8e15e4e7dd41 | 42d9bc42dbd17870 | 3 x 5 | — |
| MAIN dist, HEAD 56bda9eb64b6 (fix/coding-style-suffix-all-gemini) | 8e15e4e7dd41 MATCH | **28d6c47b9da4fba6 DIFFERENT** | 3 x 5 | 2026-10-05 14:37 |
| twins' DEFAULT root `MAIN\.claude\worktrees\whole-turn` dist | 8e15e4e7dd41 MATCH | 42d9bc42dbd17870 MATCH | 3 x 5 | 2026-09-30 21:03 |

- Only the CUE_RULE hash and the limits refuse (l. 98–100). The filter hash is compared and PRINTED ("DIFFERENT: explain before relying",
  l. 307), not refused. So the build report's Uncovered line (`twins refuses ... tonight that shows as INSTRUMENT FAILED (exit 2)`) is
  wrong. On MAIN's dist, twins runs and prints DIFFERENT.
- The filter differs because `electron/llm/verbalStreamFilter.ts` changed after the build the hash was registered on:
  d83fdfe (2026-09-30 22:10, offers block before the answer), then 801442d, c699638, 800d6a5 (2026-10-03). All are ancestors of 56bda9e.
  The whole-turn dist (built 21:03 on 09-30) predates d83fdfe. No commit to that file or to `prompts.ts` lands between MAIN's dist build and
  56bda9e. MAIN's uncommitted state was NOT checked (git in MAIN refused in this session).
- Silent-wrong-build risk: twins' default `--dist` root is the whole-turn worktree, not MAIN. Without `-- --dist <MAIN>` it replays tonight's
  records through the pre-d83fdfe filter and prints MATCH. Its replay self-check (l. 173) refuses only if a replayed cue block differs
  from the recorded one. A record whose prose the new filter treats differently, without changing the block, would get its
  emptying stage from the wrong chain, with no warning. `all` cannot pass `--dist`, because the m5 fix refuses extra args with `all`, so `all` always uses
  the default root.
- Anticipated? No. PREREGISTER §4 (l. 246–248) and A1 (l. 47) name the twins re-point. A2.5 binds it to cal + review. A4 (l. 126) covers
  its reporting. No file in flight-eq (registration, A1–A7, notes) mentions the filter hash, `42d9bc42…`, `--dist` or d83fdfe.
- Needed (a dated flight-eq note, before twins' first run on the run folder): run twins as `cue-report.mjs twins <run> --export … -- --dist
  <MAIN>`, never via `all`. Record that the DIFFERENT line is expected, and why (the four filter commits). Correct the build report's
  Uncovered line.

**m6 (MINOR): the export's `runDir` is not compared with the reported run folder.** A wrong-run export uses the wrong log. For smoke and
facts the run's own full outputs still feed the known set; for twins and thoughts nothing of the reported run does. An export with
`runDir` null skips the log silently. The exporter refuses a missing runDir (`eq-cues-export.mjs:205`), but the checker accepts one
(the cal uses null on synthetic exports). Suggest: refuse unless `path.resolve(runDir) === path.resolve(dir)`.

**m7 (MINOR, residual, stated in the build report): only whole short cues are caught.** A short cue minus 2 characters reads leak 0 for
244/257. Cue text that never reached the export, the log or a full output is not known. Registered-rule residuals; no action.

### Not shown
- Tonight's run folder and export not read; all checker numbers are h40d's.
- MAIN's working tree vs HEAD not compared for the two source files (dist matches HEAD by commit times only).
- Whether the four filter commits change any h40d or tonight's emptying stage was not replayed (would need twins with `--dist` on data).
