VERDICT: APPROVE WITH FIXES

# Re-check: PREREGISTER-cue-grading-rev6.md (sha256 ab13dc2eeb3404bc2d927e5e12eb8bedaec0938a63e5e1a555a4c53bba494af3, recomputed)

Reviewer: a fresh Opus session (`claude-opus-5-5`), 2026-10-05, after 17:14 TST. No model call, no subagent. No cue, question,
answer or captured-prompt text was read: ids, counts, hashes, line numbers, code and registration texts only. Line
numbers are rev 6's unless marked. Nothing was edited except this file. Scratch files are in this session's scratchpad.

**Counts: Critical 0, Important 0, Minor 11 (T1–T11).** S1–S8 and N1–N7 are resolved in substance. No gating bar,
rubric scale, plant, floor or verdict threshold is weaker than in rev 5. Two findings bind the flight path and should
be applied first:
- **T1**: as written, the b10 export would be refused on first contact.
- **T6**: the reference-copy rule rejects the dist that flew in the expected case.

None of the findings needs a new revision. All are text, fixable by the dated amendment that §7(i) already provides for
Minor fixes.

## What was run (read-only)

- sha256 of rev 5 (`a5e8fbf4…880df4`) and rev 6 (`ab13dc2e…94af3`): both match. Word diff rev 5 → rev 6
  (`git diff --no-index --word-diff`) read in full for removed text.
- **S1, in PowerShell 5.1.26100.9444 from the whole-turn worktree:**
  - `(git ls-tree -r --name-only 2b0906f | Measure-Object -Line).Lines` = **911**.
  - `(git ls-tree -r 2b0906f | Select-String '^160000').Count` = **2**; `'^120000'` = **0**.
  - `89c8f53` = 1110 / 2.
  - LANDED `355ad0a` (MAIN, 2026-10-05 17:12, after rev 6's reads) = **1121** / 2.
  - `.gitattributes` at both has no `export-ignore`.
  - The node count command on a scratch tree (3 files, deepest path 477 characters, plus one empty folder standing in for
    a gitlink) read **3**, node v22.19.0. The tree was then removed.
- **Sister tools (sha256/16):**
  - All five match §0.6: `launch-grader.mjs` `2f096c38016161ed`, `audit-graders.mjs` `07833cf41bcc1c6e`,
    `check-grader-memory.mjs` `119ea78a433ba47d`, `h40d-grader-models.mjs` `3626e263f3fac5ba`, `legs-decide.mjs`
    `e00a46c0b1cd9dc2`.
  - `PROJECT_MEMORY` has 17 entries; `includes('MEMORY.md')` = false.
  - The checker CLI reads `a9d35e8deacac3eff` **LOADED, 32 hits in 16 distinct**, claudeMem 0, and the 22:19 probe
    `011ca16e…` **ABSENT**, 0 / 0 (S7 confirmed).
- `launch-grader.mjs` read in full. It does per-attempt cwds `<slot>-a<k>` and the slug pre-check (no `.jsonl`, no
  non-empty `memory\`). After a run it records `slugJsonl` and `memoryDir`. It uses `--tools Read,Write,Edit`,
  `dontAsk`, `--strict-mcp-config` and no `--add-dir`, allows two at once, and writes `launches.jsonl` with
  `startedAt`. It hard-codes `--model opus` (L87).
- **`oc-flight.mjs`** (this session's Temp scratchpad, sha256/16 `2b30bf7813dffa09`, as cited):
  - Diffed against `oc-sim.mjs` (`b467d8c1fc6c63d7`): only the sizes block and the run loop differ.
  - Run with 20,000 draws. **Every §5F cell reproduces exactly**, as do the combined figures: centre FIX 4.5%, low edge
    22.4%, bad 99.6%, noisy 8.6%.
  - The products 0.827 × 0.022 ≈ 1.8% and 0.429 × 0.118 ≈ 5.1% check out.
- **Calibration pool** (WT `…_cues-r{1,2,3}.json`, keys and counts only): 39 ids per rep, 19 `S1*` and 20 `S2*`, all
  matching `/^S[12]Q(0[1-9]|10)F?$/`. The missing id is `S1Q01`. Non-empty blocks 38 + 39 + 39 = 116 (§0.6 and §3
  confirmed).
- **MAIN `electron/` grep, read-only:**
  - The two log lines are at `IntelligenceEngine.ts:450` (`[Answer] cues trimmed: {…}`, written only when trimming
    changed something) and `:451` (`[Answer] cues: <JSON of t.cues>`), after `trimCues` at `:449`, in MAIN's working
    copy and at `355ad0a`.
  - At `89c8f53` the lines are 420–421, not "419–421".
  - The log form is `<iso> [LOG] [Answer] cues: [...]`, as matched by `interview60.metrics.mjs:124`. `cueBlocks.present`
    counts every run-window cue line with length > 0 (`:131`), superseded streams included.
  - `git diff 800d6a5 355ad0a -- electron/llm/verbalStreamFilter.ts` is empty.
- **flight-eq:**
  - The registration (§2 Build, §7.b8, §7.b10, §8, §11), A2.5, A2.7 and A2.8 were read, plus all of **A3 (written
    17:12:48, sha256/16 `36aa80002a6b36d4`). Rev 6 does not cite A3.**
  - A2's current sha256/16 is `0bd449be9b3bc68c`, matching A3's record. Its mtime is 16:56:02, while rev 6 says it was
    read "16:53".
  - `interview60.run.mjs:545` (`npm run build:electron`), `package.json` (`node scripts/build-electron.js`, no `--force`)
    and `build-electron.js:39–50` (the incremental skip) were read for T6.
- `C:\Users\sotka\.claude\projects` was listed by folder name only: every sister attempt has its own slug and an empty
  `memory\`. `natively-lab` is not a git repository, so slugs come from the cwd, as the launcher assumes.

## (1) S1–S8 and the nits

| Item | Status | Note |
|---|---|---|
| S1 | **resolved** | Commands re-run: 911 / 2 / 0, so 909 expected. The node count sees files below a 477-character path. |
| S2 | **resolved** | Per-attempt fresh cwd, pre- and post-launch slug checks, and two sequential probes (L577–593, L608–625) all match the sister launcher's code. The remedy for a calibration memory void exists (L623–625). Residual: T5 (one transcript failing two classes). |
| S3 | **resolved, stricter** | No Bash: the tool is absent from `--tools`, so a Bash `tool_use` cannot even be emitted, and the audit still voids one. This closes the run-time-name bypass by construction. Sufficiency is discussed under (2). |
| S4 | **resolved** | The classes, per-slot and per-file units, independence, and four decide sets (L775–780) are consistent: memory → tool-use → tool-use then clean reads transcript 4. Residuals: T5 (two classes in one transcript; how a rate-limit refusal is recognized). |
| S5 | **resolved in rule** | The two marker groups are read apart and the timing rule is calibrated (L773–775). Residual: T3 (time zone and format; the departure path has no `startedAt`). |
| S6 | **resolved** | L786–788. |
| S7 | **resolved, verified** | 32 hits in 16 distinct. |
| S8 | **resolved by removal** | |
| N1–N7 | **resolved** | N2 is now one line (L637). N3 is at L263–264, N4 at L306, N5 at L705–706. N7 at L563–565 is stale at L119/L556/L560 (T10), and the probe's format is undefined (T4). |

## (2) Bars against rev 5

**No bar is weakened.** The rubric (§2), plants and calibration pass criteria (§3), the §5 bars and their precedence,
the floors (30/90, reused for FLT), the agreement gate and the holdout rule are unchanged; the word diff shows only
`[rev 6]` inserts there.

Relaxations, each score-blind:

| Rev 5 | Rev 6 | Judgement |
|---|---|---|
| "a pin or tool-use void … at most TWICE … The two-regrade budget is per file across pin and tool-use voids together" | "Tool-use class: at most TWO regrades per slot" (L821–822), so 4 per file at most | Looser in count. This is S4's own recommended fix, and every trigger is score-blind; each regrade "replaces the slot's file whatever its scores", so a calmer draw cannot be selected. Acceptable. |
| an `mcp__*` call → memory budget ("re-graded ONCE") | tool-use class, 2 regrades (L620–621) | Same reasoning; S4's fix. |
| (none) | FORMAT VOID → tool-use class (L683–684) | New repair path. Under rev 5 a malformed file would have made decide refuse and voided the set. The trigger is format only (a score outside 0–2 counts as format). Acceptable. |
| Read allowed: own blind file, instruction file | also the own verdicts file (L665–667) | Harmless: it replaces the removed validation command. |
| (none) | a rate-limit refusal "consumes no budget" (L834–835) | Acceptable once T5 defines how it is recognized. |

Stricter in rev 6:
- Bash is removed.
- The departure accepts only the project group, and only from a pre-call line.
- The pin is passed as `--model claude-opus-5-5`, and a refusal means grading waits. flight-eq A3.5 adds the same
  `--model-id` to the sister launcher.
- Two probes instead of one.
- The pin reader gains a negative case (L650–653).

**Do the verdict check and the launcher replace Bash validation?** Bash only let a grader re-check its own format. Rev 6
moves that check to the controller (`cue-verdict-check.mjs`, ids and counts only, a void counted in the tool-use class)
and keeps a Read-back for self-checking. The sister's spike (`8a49290e`, launcher L33–34: Read ×3 incl. re-read, Write
×1, exit 0) shows graders work this way. **Sufficient, with two gaps:**
- T4: the probe slot's format is undefined, several listed problem classes have no flipping fixture, and calibration
  slots have no format-void rule.
- T7: no check that each grader actually received the frozen instruction. The sister's audit has `dispatch=match`; rev
  6's tool check does not.

## (3) The FLT design

- **In-sample caveat: sound.** It is stated in §1F, §5F and §6. An FLT CLEAR licenses nothing and does not upgrade the
  holdout. The 39/40 overlap with the calibration pool is confirmed and disclosed.
- **Own set, not pooled: sound.** It has a different filter (`801442d`/`c699638`/`800d6a5`), a different answer-grader
  run and a different roster.
- **Sizes and floors: unchanged from rev 5; the OC tables reproduce.** The in-app floor trips at e + p + i + m ≥ 11 out
  of 40 (stated at L495–497). Given scenario50's known evicted follow-ups and empty-block routes, "FLT VOID (floor)" is
  a realistic outcome. That is a loss of power, not of validity, and the user sees F4's counts before F5.
- **"Flight FIX suspends a holdout SAFE until the user rules": sound.** The rule was tuned on scenario50, so a FIX there
  is strong evidence, and suspension avoids declaring FIX from in-sample data. Its cost (≈1.8% centre, ≈5.1% low edge)
  is computed correctly.
- **Rejected "FIX if either reads FIX": numbers reproduce, and the choice is right.** The rationale leaves out one row
  (T9).

## (4) The b10 export contract

- **The consumer side is complete and implementable**: exact keys, enumerations, cross-checks, the INCOMPLETE rules and
  F4's nine flipping cases.
- **No cue text reaches the cue-grading controller before grading**:
  - `cue-material-eq` and the completeness file print ids and counts only;
  - F4's fixtures use invented strings;
  - the `trimCues` equivalence check prints counts only;
  - every new script is barred from printing text (L789).
- **The line is the right one.** It is `[Answer] cues: ` at `IntelligenceEngine.ts:451` (MAIN working copy and
  `355ad0a`), post-`trimCues`, and the contract forbids the `:450` `cues trimmed:` line. The prefix with its trailing
  space separates the two.
- **Gaps:**
  - T1: the producer is not bound to the contract, and its HEAD source is gone.
  - T2: in-app entries are not cross-checked against the log, and the metrics invariant breaks on superseded lines.
  - T6: the reference-copy timing rule.
  - T11: exposure scope when one session controls both registrations.

## (5) Tools that must exist (§9): does each calibration flip?

| Tool | Flips? |
|---|---|
| `cue-launch-grader.mjs` | Refusals flip. **Missing** (T5): stand-in cases for the post-run checks (a stand-in that writes into its slug's `memory\` → `memoryDir: non-empty`; a stand-in rate-limit result → recorded as such). |
| `check-grader-memory.mjs` | Yes (32/16 LOADED vs ABSENT, re-run here). |
| `h40d-grader-models.mjs` | Yes (positive, plus a changed-model copy). |
| `cue-grader-tools.mjs` | Yes, both directions. Add a dispatch case (T7). |
| `cue-verdict-check.mjs` | Partly: duplicate id, extra key, empty reason, non-integer, absent file and wrong top level have no fixture (T4). |
| `cue-material.mjs` | Yes (known counts; wrong sha → refuse). |
| `cue-material-eq.mjs` | Nine cases flip. The `instruments.sha256.txt` guard, `registeredHead`, `LOG` sha, the metrics invariant, `src` and log-content checks have no case (T1, T2). |
| `cue-decide.mjs` | Yes, broad. Add the T3 and T5 cases. |
| classifier dispatch | Diff only; classifier sessions have no manifest slot or checks (T8). |
| snapshots | Step checks flip; the FLT reference rule mis-specified (T6). |
| b10 | flight-eq's cases do not exercise §1F's extra fields (T1). |
| `oc-sim` / `oc-flight` | Reproduce. `oc-flight` lives in Temp (T10). |

## (6) Start conditions

These are checkable:
- (i) this file's first line and counts;
- (ii) `C\HASHES.txt` with a `date` time;
- (iii) the user's OK in the chat transcript;
- the F3 preconditions: the committed result note, `instruments.sha256.txt`, and the judge files' `graderModel` field
  (`interview60.judge.mjs:204–224` writes it).

Two wording gaps: "every later step's output cites it" names no mechanism (T10), and "nobody opens a cue line" (L981–982)
reads as binding flight-eq's own registered reads (T11).

## Findings

### Minor

**T1. The b10 producer is not bound to §1F's contract, and `registeredHead`'s source no longer exists (flight path; apply first).**
- **The registered b10 differs from §1F.** flight-eq §7.b10 (registration L415–428) writes in-app `{id, arm,
  dispatchedAt, cues}` and twin `{id, arm, rep, cues}`, and prints its completeness lines. It has no `schema`, `runDir`,
  `registeredHead`, `window`, `rep: null`, `empty`, `logLine`, `src`, and no `…completeness.txt` with `LOG` and
  `EXPORT …` lines.
- **So §1F's exact-keys rule would refuse it.** Nothing in flight-eq tells b10's author or its A2.5 reviewer about §1F.
- **`registeredHead` points at an empty §11.** "equal to flight-eq §11's registered HEAD" (L427, also L392, L399, L468,
  L310) is a dead source: flight-eq A3.6 keeps §11 unfilled and puts the HEAD in `E\ARMING-flight-eq.md`. A3 is not
  cited.
- **Fix (dated amendment)**, add to §1F after "Consumed only by `C\cue-material-eq.mjs` …": "Before b10 is written, the
  cue-grading controller copies this contract verbatim to `E\b10-contract.cue-grading.txt` (sha256 in `C\HASHES.txt`) and
  b10 is built to it as a superset of flight-eq §7.b10 (the extra fields carry no answer text). b10's A2.5 calibration
  file adds three cases on h40d's run folder:
  1. every in-app entry's `logLine` addresses a line matching `^\S+ \[LOG\] \[Answer\] cues: (\[.*\])$` whose parsed JSON
     equals its `cues`;
  2. the completeness file's last line is `EXPORT COMPLETE` and its `LOG` line's sha256 is the log's;
  3. the top-level keys are exactly the five named.

  A b10 that fails this contract is rebuilt under flight-eq A2.5 (re-calibrated, re-reviewed, re-recorded), never
  adapted by a cue-grading script."
- **Fix, the HEAD source:** replace every "flight-eq §11's registered HEAD" / "(flight-eq §11)" with "the registered HEAD
  as `E\ARMING-flight-eq.md` records it (flight-eq A3.6: §11 stays unfilled; the HEAD is the `passes/` commit)". In §0.6,
  cite A3 (`36aa80002a6b36d4…`) and A2's full sha `0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e`. Its
  mtime is 16:56:02, after rev 6's stated 16:53 read: re-read A2 and say whether anything changed.
- **Fix, `cue-material-eq` cases:** add F4 cases, each expecting refuse: the `instruments.sha256.txt` line missing; its
  sha mismatched; `registeredHead` ≠ the ARMING record.

**T2. In-app entries are not cross-checked against the log, and the metrics invariant breaks on superseded streams (L447–451).**
- **The asymmetry.** Twin entries are compared to their source by `JSON.stringify`; in-app entries are not compared to
  anything. F4's "trimmed line substituted" case presumes a log read that the listed checks do not contain.
- **The invariant fails in a known case.** `cueBlocks.present` counts every non-empty run-window cue line
  (`interview60.metrics.mjs:124–131`), including a superseded stream's, which b10 excludes. h40d's R29 is exactly this
  case (rev 5 §1).
- **Fix, add to "Checks `cue-material-eq.mjs` makes":**
  - "The debug log named by the completeness file's `LOG` line is read and its sha256 must match.
  - For each in-app entry with a non-null `logLine`, that line matches `^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$`, its
    timestamp lies in `window`, and `JSON.stringify(JSON.parse(m[2])) === JSON.stringify(cues)`.
  - `empty: "missing"` ⇔ `logLine: null`.
  - Every run-window `[Answer] cues: ` line is addressed by exactly one entry, or named in the completeness file as
    `superseded <logLine>` or `outside-window <logLine>`.
  - Entries with `empty: null` = `cueBlocks.present` − the named non-empty superseded and outside-window lines.
  - An entry whose `src` is not one of the six basenames refuses."
- **Fix, F4 cases:** "an in-app entry whose `cues` differs from its log line → refuse; a named superseded non-empty line →
  counts reconcile, no refusal; an entry from `…captured-high-r4.json` → refuse".

**T3. The departure timing check has no time-zone rule and no `startedAt` source (L628–636, L773–775).**
- **Time zones.** The marker line's "date and time" has no format; `startedAt` is ISO UTC (launcher L161); the author's
  times are TST (+03:00). A naive comparison inverts across the 3-hour offset.
- **No launcher record.** Departure graders are subagents, so they have no `launches.jsonl` line. Since L786, decide
  refuses any slot missing from a stdout file.
- **Fix:**
  - "The marker line is `DEPARTURE-MEMORY-ACCEPTED <ISO 8601 with offset>` (e.g. `2026-10-05T20:00:00+03:00`), parsed
    with its offset.
  - Under the departure a slot's `startedAt` is its transcript's first record `timestamp`. `memoryDir` and `slugJsonl`
    read `n/a`, not a refusal.
  - Decide cases: a departure at `20:00:00+03:00` against slots started `16:59:00Z` → VOID and `17:01:00Z` → accepted (a
    string comparison would accept the first)."

**T4. The format check: probe schema, calibration slots, fixtures (L680–684, L703–704, L707–709).**
- **Probe slots are undefined.** They have `instruction: null`, so their axes are undefined, yet (g) expects
  `FORMAT OK`.
- **Calibration slots have no format-void rule.**
- **Listed problems without a fixture.** These have no flipping fixture: duplicated id, extra key, missing or empty
  `reason` (and whether it voids), non-integer `1.5`, absent file, top-level array or a missing `verdicts`.
- **Fix:**
  - "`cue-verdict-check` is not run on probe slots; (g) expects ALLOWED and the probe's verdicts file present.
  - Calibration slots follow §5.1's class budgets per slot; a spent budget stops calibration and is reported to the user.
  - An empty or missing `reason` is a problem (FORMAT VOID).
  - Add fixtures, each → VOID: duplicate id; extra key; empty `reason`; `1.5`; file absent; top-level array; no
    `verdicts` key."

**T5. Two classes in one transcript, and recognizing a rate-limit refusal (L816–828, L834–835).**
- **Two classes at once.** A grader that writes a memory note fails tool-use (a Write outside its allowlist) and memory
  (a non-empty `memory\`) in the same transcript. The budget counting for that case is undefined.
- **The rate-limit test is unobservable.** "`rate_limit`, no tool call, no verdicts file" has no source: the sister's
  record keeps `exit` but not the error kind.
- **Fix:**
  - "A transcript failing several classes consumes one regrade from each; if any of them is spent the slot is final VOID.
  - The cue launcher records `resultSubtype`, `errorKind` (from the `-p` JSON) and `toolCalls`.
  - A refused launch = `errorKind` `rate_limit` AND `toolCalls` 0 AND no verdicts file; anything else without a valid
    verdicts file is FORMAT VOID.
  - Launcher stand-in cases: a stand-in that writes into its slug's `memory\` → `memoryDir: non-empty`; a stand-in
    rate-limit result → `errorKind: rate_limit`.
  - Decide cases: rate-limit record → budget untouched; 2 tool calls with no verdicts → FORMAT VOID counted; tool-use
    plus memory in one transcript → both budgets decremented."

**T6. The FLT reference-copy rule rejects the dist that flew in the expected case (L470–474).**
- **Why.** auto's build is `npm run build:electron` (`interview60.run.mjs:545`), which is `node
  scripts/build-electron.js` with no `--force` (`package.json`). It skips when the outputs are newer than the sources
  (`build-electron.js:39–50`).
- **The effect.** After the guarded `--force` build at arming, the filter's mtime falls BEFORE the first dist proof, not
  between the two. "Otherwise there is no reference" then fires every time.
- **Fix:** "accepted as reference only if its mtime is at or before the time of the launcher log's SECOND dist-proof line
  (the dist that flew) and at or after the guarded arming build's recorded time (flight-eq §2 Build, b2), the copy being
  the controller's first action after FLIGHT EXIT".

**T7. No check that a grader received the frozen instruction (§3 sessions, §3.3).**
- The instruction files' shas are pinned, but no per-transcript check compares the prompt actually sent with them. The
  sister's `audit-graders.mjs` has `dispatch=match`.
- **Fix:** "`cue-grader-tools.mjs` also prints `dispatch=match|MISMATCH` per transcript: the first user message equals the
  prompt `cue-launch-grader.mjs` builds (the condition's frozen instruction text with only the slot's three paths
  substituted; sha12 printed). MISMATCH is a tool-use-class void. Fixture: one word changed → MISMATCH."

**T8. Classifier sessions have no slot and no checks (L574–575, L1014–1015, F1).**
- Classifiers set the gating denominator and are now outside-cwd sessions, but they have no manifest slots, no allowlist
  files, no pin, memory or tool-use run, and no void rule.
- **Fix:** "Each classifier and base-rate session is a manifest slot (`class-h40d.cN`, `class-eq.cN`, `base-h40d.cN`,
  `base-eq.cN`) with its dispatch file, input file and verdicts file. The pin, memory, tool-use and slug checks run on it.
  A void re-runs that slot once in a fresh cwd; a second void stops the classification and is reported to the user."

**T9. The rejection rationale omits the mediocre-rule row (L907–912).**
- The combined rule reads FIX 57.9% on a mediocre rule at (34, 100), against 35.5% for FLT alone (re-run; 53.8% at
  (30, 90)). That is the combined rule's largest gain, and it goes unquoted.
- **Fix:** add "mediocre rule: combined FIX 57.9% vs FLT alone 35.5%. That truth lies between the bars, so a FIX there
  is not a correct call, and this gain does not argue for the combined rule".

**T10. Bookkeeping.**
1. **Abbreviations.** `C`, `E`, `F`, `L` are used about 30 times but never defined; rev 6 deleted rev 5's only definition
   (`= C\grading\`). Add: "`L` = SP = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`; `C` = `L\cue-grading`; `E` =
   `L\flight-eq`; `F` = `L\followup-turn`".
2. **`<SP>` in the recipe.** "`<SP>` keeps revision 5's meaning" (L313) points at a past session's Temp scratchpad.
   Under this session's Temp scratchpad the `.js.map` destination is **277** characters; under `L` it is **134**, and the
   snapshot is a durable pin (the user's rule: never Temp). Define `<SP>` = `L` and restate step 4's length.
3. **`oc-flight.mjs`.** It is in this session's Temp scratchpad, yet §9 lists it as an existing tool. Copy it to `C\` (the
   sha stays `2b30bf78…`).
4. **Stale names.** L119, L556 and L560 still name `cues.probe.json` / `probe.g1`. Replace them with `probe-1.g1`,
   `probe-2.g1`.
5. **Line citation.** `IntelligenceEngine.ts:419–421` (L41, L408) should read 420–421 at `89c8f53`, and 449–451 at
   LANDED `355ad0a`; the strings are unchanged.
6. **Not-graded list.** Name `captured-high-r4/-r5` (G only), `--no-block` and `--no-block-low` in the not-graded list
   (L412–415).
7. **Doubles.** State that FLT counts both answers of a double while §1 excluded h40d's superseded R29: a deliberate
   difference between the two readings.
8. **"Cites it".** For §7(ii)'s "every later step's output cites it", require each new tool to print `REG <sha16>` first
   and refuse when it differs from `C\HASHES.txt`.

**T11. Exposure scope when one session controls both registrations (L972–975, L981–982).**
- "Nobody opens a cue line … before" binds flight-eq's own registered reads (b10; the cue-effect report's verbatim
  `cues trimmed:` quotes) if the flight lands before rev 6 is hashed.
- "The cue-grading controller does not open those outputs" cannot hold if one session runs both.
- **Fix:** "§7's gate binds the cue-grading controller and its tools only; flight-eq's registered reads are outside it.
  If one session controls both, any instruction-wording repair made after that session has read flight-eq's cue-effect
  report is named in the result note with its time."

## Not checked

- No tool, build, probe, classification or calibration exists or ran. Findings are against the text, the sister's code and
  MAIN's code.
- Whether `--model claude-opus-5-5` is accepted by the CLI, and whether real graders keep to Read and Write (left to
  (g) and (h)).
- Whether Claude Code allows auto-memory writes without a permission rule (T5 covers the consequence either way).
- How b10 will actually be built tonight. The h40d R29 shape for T2 was taken from rev 5's text and b10's calibration line
  (47 → 45 + 2), not re-read from h40d's log.
- `oc-flight.mjs` shares one RNG stream across its runs, so only the first table starts at the stated seed. It is
  reproducible as run; the cells match.
