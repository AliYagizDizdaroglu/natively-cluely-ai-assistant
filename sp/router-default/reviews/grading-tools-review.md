# Review: router-default-r1 grading tools (registration 7.7 gate)

Reviewer: Opus (claude-opus-5-5), 2026-10-07. Read-only apart from this file; no model called.

**SPEC: FAIL  QUALITY: CHANGES** — no BLOCKING finding; 4 IMPORTANT, 5 MINOR. Every fix is small. The verdict
mapping, blinding and argv are sound. What is missing: the tools do not themselves enforce two registered constants,
the pin (7.1) and the 2.0-min down limit (6.2). There is one item-mapping hole in No regression, and grade files are
not bound to the launch that wrote them.

## Files reviewed (sha256)
| file | sha256 |
|--|--|
| `grade\score-rd.mjs` | `0d581bfe791cb7a8856ebcc986e034fab4aec25343d7de1f43dee9b29630830e` (matches dispatch) |
| `grade\cal-score-rd.mjs` | `08bbb413…` — re-run by me: **129/129 PASS**; recorded mutants 40/40 |
| `grade\launch-grader-rd.mjs` | `65ca2f23345a8c0e7985a7c24c0f16695529391e04eea1ee54b8c7f2672e73b7` |
| `grade\cal-launch-grader-rd.mjs` | `69bfb057…` — re-run by me: **89/89 PASS**; recorded mutants 17/17 |
| `grade\rd-grader-dispatch.txt` | `ad35cdef…`; the template region equals h40d's byte for byte (checked by me with node: `true`) |

## What holds (checked)
- **Verdict order = SPEC §11 + rulings:** VOID first (before any bar) → SAFETY FAIL (beats integrity and grading
  problems) → PASS (6 bars + 9 integrity counts + no gating grading problem) → INCONCLUSIVE.
  - wrong = EITHER grader correctness 0 (`score-rd.mjs:33`), as ruled.
  - Zero Quality pairs → UNREADABLE → not PASS (`:198`).
  - An unclaimed in-hour `shown=pipeline` turn is UNREADABLE (INCONCLUSIVE) on HARD or unmappable items and only a
    WARNING on EASY items (`:227-231`).
  - A HARD superseded turn with no gradeable replacing text is UNREADABLE (`:243-251`).
- **Bars cannot read PASS with their effect present** in these cases:
  - Safety: each of the 4 text counts; a wrong L from g1 or g2 alone, sEmpty/superseded/no-pipeline L included.
  - Fallback: each of the 5 counts.
  - Speed: limit inclusive; n=0 fails.
  - Routing: 13 / 1.
  - Quality: pairs by turn; sEmpty, superseded and no-pipeline turns are excluded from both sides; an ungraded side
    is UNREADABLE.
  - No regression: in-app grades on shown=live turns are ignored; A entries and replacing texts are counted.
  - Exceptions: I-2 and I-3 below.
- **Grader argv** = flight-eq's live-proven form (`launch-grader-rd.mjs:53`): `--model <id>`, `--setting-sources
  project,local`, `--strict-mcp-config`, `--tools Read,Write,Edit`, dontAsk, three per-file allow rules, no add-dir,
  a fresh cwd, at most 2 at once (base slot lock).
- **Grader cwd ancestry:** no `.claude`, `CLAUDE.md`, `CLAUDE.local.md` or `.git` in Masaüstü, natively-lab, sp,
  router-default or grade (checked).
- **Probes:** probes 1-2 must be pinned and probe 3 is the alias read. Every probe transcript is re-read for memory,
  tools and model, and is tied to this launcher's sha12. This is stricter than eq.
- **Blinding: no leak found.**
  - Only the template region is sent. The preamble (the tag/arm table) never reaches the grader
    (`dispatchTemplate` splits on the marker).
  - The prompt exposes the run-folder name, `router-blind`, the verdicts path and the tag (`blind-N.gX`). This is the
    same exposure as router40/eq, and none of it says which arm an item is.
  - Blind items have uniform fields with opaque keys `q01..`. The key is held in LAB `keyhold`.
  - The allow rules deny every other file, including the sibling grader's verdicts and the capture files.
- **Joins that hold:**
  - Blind grades are read by (file tag, q); the scorer refuses a pairs file whose key set differs from the key.
  - I-2 join: `[Main] dispatch: answer` (exact ms, exactly 1) → the first `[Router] dispatch` before the next answer
    line. This is consistent with `main.ts:2170-2190`, which logs one then calls `routerWiring.answered()`.
  - Capture, roster and judge sha256 are checked against the build record.

## Findings

### IMPORTANT
**I-1 The pin is not enforced, and the result does not name the grader model** (registration 7.1: "Pinned to
`claude-opus-5-5` … the model read from every transcript and named in the result").
- `launch-grader-rd.mjs:137,210`: a grader launch accepts any `claude-…` id.
- `:240`: `pinned` is computed against `--model-id`, not against `PIN`.
- `score-rd.mjs:318`: `provenanceProblem` trusts `rec.pinned`. `PIN` appears only in a message, and the score
  output never prints the grader models.
- **Demonstrated** with the real exports (scratchpad `rv-pin.mjs`): `--model-id claude-sonnet-5` passes
  `MODEL_ID_RX`, the launcher's `pinned` reads `true`, and `provenanceProblem` returns `null`. The probe gate pins
  only the probes.
- Fix:
  - the launcher refuses `modelId !== PIN` for graders and for cwdprobe-1/2;
  - the scorer checks `modelMatchesPin(rec.model, PIN)` and every entry of `rec.models`;
  - the scorer prints the distinct grader models per file in its output.

**I-2 The 2.0-min router-down limit is not enforced; the reader output is not tied to the run or the reader version**
(6.2: "Applied as `… --down-limit-min 2`"; 7.7: "its rules are the ones in this file").
- `parseReader` (`score-rd.mjs:81-87`) checks Speed and Routing thresholds against the registration. For VOID it
  only reads the `VOID|clear` flag: it neither checks `limit` = 2 nor recomputes `down > limit`.
- **Demonstrated:** a reader output with `clear (3.50 vs limit 5)` parses with 0 problems and `void=false`. That run
  should be VOID and is scored as a candidate PASS.
- The session-failed floor (`-\d+`) is not checked to be 10.
- The reader output carries no run-folder name and no reader sha. A reader output from the smoke or from another run
  passed beside an r1 folder would be accepted.
- Fix (preferred):
  - the scorer spawns `router-hour-read.mjs <run> --down-limit-min 2 --root <MAIN>` itself and prints the reader's
    sha12;
  - otherwise, parse `VOID_INPUT router_down_minutes=… limit=…`, require `limit=2` and `down>2 ⇔ VOID`, require
    floor 10, and cross-check `RUN items=47` / `decisions_in_hour` against the log the scorer already parses.

**I-3 No regression decides HARD by two different item mappings; one hole lets it read PASS with a wrong HARD
answer present** (5 No regression; 7.3).
- Joined in-app pairs are gated by `hard(pr.id)` (`score-rd.mjs:220`). `pr.id` is the judge's anchor-overlap item
  (`interview60.judge.mjs:105-125`; candidates span 60 s after earlier items).
- Unclaimed turns are gated by the play-window `dec.item` (`:229`), which is the reader's mapping.
- The hole: a shown=pipeline turn played inside a HARD item's window may be claimed by overlap for an adjacent EASY
  main. Its wrong grade then lands in `easyPipelineWrong` (reported only), and the gate stays PASS.
- Fix: gate when `hard(pr.id) || hard(dec.item)` (and `dec.item === null` counts as HARD, as in the unclaimed rule).
  Print the count of pairs whose two mappings disagree.

**I-4 Grade files are not bound to the export or the launch that produced them** (hunt item: a mis-attributing join).
- The launcher writes `pairsSha12` "for the scorer" (`launch-grader-rd.mjs:241`); the scorer never reads it.
- Every blind file uses keys `q01..qNN`, and files of equal size have identical key sets. A verdicts file moved
  across tags (the launcher's own refusal text tells the operator to "move the earlier attempt's verdicts away") would
  pass `verdictProblem` and be attributed to the wrong file's arms and turns.
- Likewise an in-app pairs file re-exported after grading is not detected.
- Fix:
  - the launcher also records `verdictsSha12` after the attempt;
  - the scorer requires, for the last record of each slot, `pairsSha12` = sha12(current pairs file) and
    `verdictsSha12` = sha12(the verdicts file it reads).

### MINOR
- **m-1 Superseded loop is not limited to the hour** (`score-rd.mjs:241-243`): a probe-turn supersede gives an
  undefined id, which is unreadable, which gives a spurious INCONCLUSIVE.
  - Filter on the turn's decision `inHour`.
  - Also guard: if the text-matched pair (`:249`) is joined to a turn ≠ `sp.turn` and that turn is not
    shown=live-superseded, treat it as unreadable rather than graded. This is cheap protection against a replacing
    window that catches another turn's `[Answer] full:`.
- **m-2 Report item 4 is partly wrong.** A supersede in phase=streaming never writes the Live text to history:
  `routerArbiter.ts:362-366` ("no history"), and addHistory runs only in `finishLive`/`append`. So the first
  `[Answer] full:` after that dispatch IS the replacing text: the judge claims it and the scorer grades it.
  - Only phase=done supersedes with no main `dispatch: supersede` are unreadable.
  - The code matches 7.3. Ruling (4) ("a HARD superseded turn is unreadable") is broader than the code; the
    registration fill should state the actual behaviour.
- **m-3** `provenanceProblem` ignores `rec.launcher` (launcher version) and `rec.tools`. Both are recorded; add them.
- **m-4** Routing denominators are not checked (`easyN` = 20, `hardN` = 27, `score-rd.mjs:69-73`). A roster drift
  would still be re-applied as a ratio-free count.
- **m-5** Registration 7.7 and §10 name `LAB\score-rd.mjs`; the file is `LAB\grade\score-rd.mjs`. Fill the actual
  path at arming. The reported-arm file names (`…_high.json` etc.) depend on the export's `model` field. `--plan`
  will show MISSING if they differ; that is reported-only.

## Requirement trace
| requirement | status |
|--|--|
| 7.1 pin `claude-opus-5-5`, model named in result | **not enforced / not named (I-1)** |
| 7.1 `--setting-sources project,local`, memory ABSENT every transcript | met (argv; probe gate; per-launch record; scorer refuses non-ABSENT) |
| 7.2 graders per file 2/2/1/1/1 | met |
| 7.3 I-2 join, appended via A, superseded replacing text | met, with I-3 and m-1 |
| 7.4 pairs by turn, `arms` list, exclusions | met |
| 7.7 refuses roster/judge sha mismatch; calibrated + broken once | met (whole-scoring refusal; 129/129, 40 mutants) |
| 5 bars; 6.1 verdict order; controller rulings 1, 4, 5, 6 | met (ruling 4: see m-2) |
| 6.2 limit 2.0 min | **not enforced (I-2)** |

## Not shown
- The real `claude` binary was not exercised (stand-in only). The first live check is the probes.
- Whether user-level `~/.claude/CLAUDE.md` text reaches a `project,local` grader was not checked. The memory scan's
  markers cover project memory and claude-mem only; flight-eq's live proof is the same limit.
- No real hour: the I-2 join and the supersede path have run on synthetic logs and the real `pairAnswers` only.
- I-3's likelihood was not measured. In live40 all 27 HARD items are H mains or follow-ups, so the hole needs a HARD
  turn claimed by overlap for an adjacent EASY main.

## Re-review (after the fix round, 2026-10-07)

**SPEC: PASS  QUALITY: APPROVE.** All 8 findings are closed. One new trivial note (n-1), which does not block.

The shas match the coordinator's message:
- `score-rd.mjs` `50e0bc95bfb0a72218b64b5c3c7bd5d3508ab7f2d971e345e45b200682e67746`
- `launch-grader-rd.mjs` `edfef2aa8a98a64862d11e2031e06169d744da521a2ba2b76a5a0c2d1c1c5bd2`

Calibrations, re-run by me (synthetic; no model call):
- scorer **175/175 PASS**;
- launcher **91/91 PASS**;
- the recorded mutant files read 60/60 and 20/20 caught, 0 SURVIVED.

| finding | status | evidence |
|--|--|--|
| I-1 pin | CLOSED | Launcher `:137` refuses any `--model-id` ≠ `claude-opus-5-5`. `modelMatchesPin` is exact (`:59`), and `pinned` is computed against `PIN` (`:240`). The scorer's `provenanceProblem` requires the CLI model AND every transcript model to equal the pin, whatever `pinned` says. The output prints `GRADER MODEL …` and the alias probe. |
| I-2 down limit / reader provenance | CLOSED | The scorer spawns the reader itself with `--down-limit-min 2 --root` (`loadReal`). It refuses an exit other than 0/3, or an exit that disagrees with the VOID lines. `parseReader` checks `limit=2` on both lines, recomputes down > 2 against the flag (±0.005 for the 2-decimal print) and checks floor = 10. `--reader-out` is refused; `--reader-script` is open only under `SCORE_RD_CAL=1`. The reader script sha12 and output sha12 are printed. |
| I-3 HARD mapping | CLOSED | `:230-232`: a turn is gated if `hard(pr.id) \|\| hard(dec.item)`, and a null window item counts as HARD. The number of disagreeing pairs is printed. Join-defect pairs have no turn, but that turn then falls to the unclaimed rule, which uses the window item: covered. |
| I-4 grade binding | CLOSED | The launcher records `pairsSha12` + `verdictsSha12`. `provenanceProblem` compares both with the files it reads, for blind, in-app and reported arms (call sites `:409-433` pass `pairsFile`). |
| m-1 supersede scope / cross-turn | CLOSED | `SUP-INHOUR` skips turns before the hour. `SUP-CROSSTURN` refuses a text-matched pair joined to a different, non-superseded turn. |
| m-2 phase rule | CLOSED | Matches `routerArbiter.ts:362-366`. Streaming-phase turns are graded; a done-phase turn without a main supersede dispatch is UNREADABLE on HARD items. An INFO line counts both. |
| m-3 launcher version, tools | CLOSED | The record's `launcher` is compared with the sha12 of the registered launcher file; tools must be within Read/Write/Edit. |
| m-4 denominators | CLOSED | 20 EASY / 27 HARD required (`DENOM`). |
| m-5 path | arming note | No code change needed. |

### The coordinator's question: will an exact `claude-opus-5-5` pin block real graders?
**No; it held on every real grader run on record.** I read every launch record in `sp\flight-eq\` and
`sp\router40\grade\`:
- `flight-eq\blind\launches.jsonl`, `grader-cwd.launches.jsonl` and `launches.arms.jsonl`;
- `router40\grade\blind\launches.jsonl` and `classify\launches.jsonl`.

I then opened each record's transcript by session id (scratchpad `rv-models.mjs`, read-only):
- **CLI model (`modelUsage` keys): `claude-opus-5-5` in 35 of 35 records.** No suffix, no `[1m]`, no date, and no
  second model joined with `+`.
- **Transcript `message.model`: `claude-opus-5-5` in 34 of 34 transcripts found.** One was missing. 0 transcripts
  lacked the field; `<synthetic>` placeholders are already excluded by `transcriptModels`.
- The flight-eq / router40 probe outputs also read `model claude-opus-5-5`.

Residual: if a future CLI adds a helper model to `modelUsage` (e.g. a second id joined by `+`), the strict rule
refuses it. That would show at cwdprobe-1, before any grading, so it fails safe and loudly. The report already names
the remedy: an amendment naming the reported id.

### New
- **n-1 (MINOR, docs only):** the `score-rd.mjs` header usage line (`:6`) still documents
  `--reader-out <file …>`, which the CLI now refuses. Update the comment; behaviour is unaffected.

Not shown: the real `claude` binary is still unexercised by these tools (the probes are the first live check). No
real hour exists, so the reader spawn, the supersede phases and the hash binding have run on synthetic and parity
data only.

SPEC: PASS  QUALITY: APPROVE
