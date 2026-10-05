# Pre-registration: flight eq — the first LIVE hour of the turn-based earlier-question block (flag ON), scenario50 S1+S2

Written 2026-10-04 (Fable, the spec author), BEFORE the build has landed in MAIN and before any live data exists.
It registers the flight that spec `2026-10-03-turn-based-followup-context-design.md` §6/§11.5 and the build plan
`followup-turn\plan\2026-10-04-turn-followup-build.md` (Task 10's last line) call "the scenario50 S1+S2 flight's own
pre-registration". The replay it follows PASSED (`passes/2026-10-04-turn-followup-result.md`: gain +19 on 40 roster
pairs, 0 new wrong, every clause held). A replay of captured bytes is not the app: this hour is the first time the
BUILT feature meets the turn machine, the ears, the hedge's real race and the shipped cue shape.

Rules of this file: it is committed to MAIN's `passes/` as `PREREGISTER-flight-eq.md` before the task is registered;
§11 ("What flies") is filled by the controller at arming; after the hour starts nothing is edited — the result goes
in `passes/<date>-flight-eq-result.md`, applying this text verbatim. A change before data is a dated amendment at the
end, never an edit in place. Every number names its source. Precedent for form, launchers and bars:
`PREREGISTER-h40d.md` (0e1e8b2→2b0906f), `2026-10-02-h40d-result.md`, `PREREGISTER-s50m.md`, the replay registration
`followup-turn\PREREGISTER-turn-followup.md`.

`MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch `fix/coding-style-suffix-all-gemini`,
HEAD `89c8f53` as this is written); `L` = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp`; `F` = `L\followup-turn`
(the replay folder: reference, fixtures, `R\`, `plan\`, `smoke\`, `build\`); `E` = `L\flight-eq` (this file and every
instrument of this hour); `SP` = the controller's scratchpad; `VH` = `SP\validation-hour` (h40d's launcher family).
Clock times are local (UTC+3) unless marked Z. A **dispatch window**, the **run window** and a **quota day**
(10:00 → 10:00 local, the lite reset) mean what `PREREGISTER-h40d.md`'s header defines ("Four words, defined once").

## 1. What the hour tests, and the tree that flies

**The change under test is the EARLIER QUESTION block, alone, with `NATIVELY_EARLIER_QUESTION=1`.** On the auto turn
path, when a question's surface cue fires AND its parent question is absent from the prepared prompt, ONE labelled
line (the previous asked question, ≤ 450 chars, label 125 chars) is pushed as the last context part before
`INTERVIEWER JUST SAID:`; every other prompt is byte-identical to flag-off (spec §3; build gates c2/c3 prove it). The
ledger is written on every pinned call; one diag line per call: `[IntelligenceEngine] earlier question: gate=<…>
cue=<…> chars=<n> turn=<id|none> ms=<n>` (never text).

**The tree.** MAIN at the registered HEAD = `89c8f53` + the build's landing commit (plan Task 9, `LANDED` in
`F\build\LANDED.txt`) + the harness commit of §7.b4 (`--no-block`) + this file's commit. Nothing else lands between
the registered commit and the end of the hour; the guard refuses a moved HEAD or a dirty `electron/`. Flag OFF by
default in that tree; the launcher sets it ON (§2) — the only place it is ON.

**The cue-mode shape, stated (spec §4):** MAIN ships `CUE_RULE` (3 occurrences in `electron/llm/prompts.ts` at
89c8f53); h40d's cue-attributable FAIL ruling (cue OFF behind a flag) is parked and unbuilt. So this hour flies the
block BESIDE the shipped cue rule: the block is a context part, the rule a system-prompt tail, no shared bytes; the
replay was pre-cue bytes. If MAIN's cue shape changes before the day, §11 says which shape flew and the replay
comparison weakens by that much. **The user ruled 2026-10-04 15:54: "as shipped, cues on"** (§11): the hour flies
MAIN's shipped prompt shape — `prompts.ts:2444` builds `VERBAL_WHAT_TO_ANSWER_PROMPT = VERBAL_TYPED_PROMPT + CUE_RULE`,
no `NATIVELY_CUE*` name exists under `electron/`, the OFF flag of the 2026-10-02 ruling was parked and never built
(the controller's ruling 3 of 15:47 had the premise backwards; corrected in §11). The no-cue twins therefore run and
are graded, as on h40d: they measure the cue effect on this hour's bytes, REPORTED here (§4, "the cue effect"), and
the app's cue lines are exported for the separate cue-grading registration (§7.b10). The block and the cue rule
share no bytes (spec §4), so the block's clauses are read beside the cue shape, not through it.

**Not in the tree, on purpose:** `withParentExchange` / `NATIVELY_FOLLOWUP_PARENT` stay (unset; the app logs
`[Main] follow-up parent: off`); the five side fixes are whatever MAIN carries at 89c8f53 (per MAIN's reflog the replay-test
path `eed4d7d` and three filter fixes `801442d`, `c699638`, `800d6a5` landed 2026-10-03/04; they are the baseline, not
the variable); no dispatcher fix
for the not-a-question close (spec §7: its wrong-referent cost is a measured residual here, §4 rule 5); no chip-path
block, no callbacks (v2).

## 2. The run

| | |
|---|---|
| Name | **eq** (earlier question, first live hour); run folder `MAIN\electron\test\golden\interview60.runs\<stamp>-eq`; launcher log `interview60.runs\flight-eq.launcher.log` |
| Task | `Natively-flight-eq`, registered by `E\register-eq.ps1` (h40d's `register-h40d.ps1` with the names): **13:30:00 local on the day of §6**; interactive logon (the user logged on), 5 h limit, StartWhenAvailable OFF, `-WorkingDirectory MAIN` |
| Window | playback start (the timeline's `startedAt`, at UTC+3) inside **12:00–15:00 local** (h40d's; br1, the closest like-for-like on this roster, started 13:36). Slip: same quota day only, §6's ledger re-read. Outside the window the hour cannot PASS (§5) |
| Roster, audio, ears | `scenario50`, scenarios **S1,S2** (40 items: 20 mains + 20 follow-ups; 15 `long`), `scenario50.wav` (`wav:check` 40), Deepgram + the Live ear (the harness's default Live model; the readiness probe's fallback to `gemini-2.5-flash-native-audio-latest` is recorded in §11 if it happens, as on h40d) |
| Configuration | the shipped default plus the ONE variable: `NATIVELY_EARLIER_QUESTION=1`; cleared in the launcher exactly as h40d's env block (h40d's `launch-h40d.cmd` list, every name): `NATIVELY_STT_PROVIDER=deepgram`, `NATIVELY_ROSTER=scenario50`, `NATIVELY_SCENARIOS=S1,S2`, `NATIVELY_VERBAL_HEDGE=` (default ON), `NATIVELY_FOLLOWUP_PARENT=`, model/thinking/turn/timeout names empty, `NATIVELY_FLIGHT_COMMIT=<registered HEAD, 40 hex>` |
| Knowledge mode | ON (the Context toggle), persisted `knowledgeMode: true`, read and guarded exactly as h40d's rule 1(g) and §7.3a (the block sits after the knowledge prompt; a different toggle state is a different prompt) |
| Build | MAIN's `dist-electron` at the registered HEAD: `node scripts/build-electron.js --force` (guarded, mtimes recorded), the four EQ markers (plan Task 9 step 4) + `dist-proof.mjs --expect combined …` (the cue build) + `F\build\parity-dist.mjs` exit 0 against MAIN's dist — **all three printed into the launcher log before the run and after it** (the `auto` step may rebuild; the second proof is the dist that flew); `earlierQuestion.js`'s sha256/16 recorded both times, a changed sha = VOID |
| Harness command | `E\launch-eq.cmd` (generated from `E\launch-eq-src.txt` by `VH\instruments\gen-launchers.mjs`, h40d's generator; ASCII, CRLF, no parens in echoed text): `wav:check` → dist proofs 1 → `guard-eq.mjs` → `node electron\test\golden\interview60.flight.mjs eq` → dist proofs 2; guard failures to `%TEMP%\natively-eq-launcher-error.log`, which must not exist at arming |
| The guard | `E\guard-eq.mjs` = `VH\guard-h40d.mjs` re-pinned (§7.g): roster scenario50 S1,S2 with 40 items; the hedge default; follow-up parent OFF; **`NATIVELY_EARLIER_QUESTION` must be exactly `1`** (the inverse of h40d's check 8: this hour tests the flag ON) and the BUILT `describeEarlierQuestionAtStartup` must return `earlier question: on` under the launcher's env; the EQ markers in dist and source; `parity-dist.mjs` as a child, exit 0; the cue build's markers; knowledge ON; HEAD pin; `.env` name scan last. `GUARD OK` from the dry twin `launch-eq-dry.cmd` (task `Natively-flight-eq-dry`) before the real task is registered |
| MAIN frozen | from the registered commit to the end of the hour; no vitest/tsc/build/npm on the machine during it; no other `Natively-*` task; the machine quiet (system audio hears everything: no voice chat, video, music — the window is told to the user); AC power; port 5180 free; no orphaned `tail.exe` |

**The arms** (`PAIRED_ARMS` as built at the registered HEAD, plus the G-only controls of this registration; **G** = the
gated set, §3):

| arm | model, level | prompt | role, graded? |
|---|---|---|---|
| in-app | the hedge: 3.5-lite HIGH front, 3.1-lite LOW back from 5 s | the app's own: cue rule + the block where the gate fired | **the live hour** — graded (one grader; rules 3b, 4a, 4d) |
| `captured-high`, `-r2`, `-r3` | 3.5-lite HIGH | the hour's captured prompts as built (block included on G) | the block twins — graded per arm (one grader each; the per-item twin reading, mains band) |
| `captured-high-r4`, `-r5` on G only | 3.5-lite HIGH | the same, `--only <G>` | block side of 3a, reps 4–5 |
| **`captured-no-block-high` r1–r5 on G only** | 3.5-lite HIGH | the captured prompt with the block STRIPPED (`answers.mjs --no-block --only <G>`, §7.b4) | **the same-bytes control**, front leg |
| `captured-low`, `-r2`, `-r3` | 3.1-lite LOW | captured, block included | the back leg's block twins — graded per arm |
| `captured-no-block-low` r1–r3 on G only | 3.1-lite LOW | stripped | the back-leg control (4b per leg) |
| `high`, `low`, bare `gemini-3.5-flash-lite`, bare `gemini-3.1-flash-lite` | as named | scripted text, no context, mains only | **graded, reported** (the user's rule of 2026-10-02; the untagged pair graded too this time, as that note asked a registration to decide) |
| `captured-no-cues-high`, `-r2`, `-r3` | 3.5-lite HIGH | the captured bytes with `CUE_RULE` stripped (`--no-cues`; the block stays where it was) | the no-cue twins — graded per arm; the cue effect on this hour's bytes, REPORTED in h40d's 3c/2c form (§4); their `when: hasCueRule` must fire — h40d's three proof lines (no skip line, `pairedArms` lists the three, each `--no-cues` run `EXIT 0`), else the cue reading is INCOMPLETE (reported) |
| `captured-minimal`, chains | as built | | run by the harness as it stands, ungraded |
| the focused-five Flash arms (3.5/3.6/3.7/3.8-flash) | — | — | **OFF** (ruling 3, §11): a harness edit before the registered HEAD (`FOCUSED_MODELS` gated off for this hour), proven by the launcher log carrying no Flash arm line; no full-Flash quota is spent |

**Blind grading of G (rule 3a, 4b, 4c, 2b–2d):** the G twins — block r1–r5 and no-block r1–r5 (front), block
r1–r3 and no-block r1–r3 (back) — are graded in the replay's form: the blind builder (`F\R\scripts\followup-turn-blind.mjs`
adapted, seed `blind:flight-eq:<id>`, `questionForGrader` = the follow-up WITH its parent), keys in `E\R-keyhold\`,
two Opus graders per blind file, consensus (both graders) decides. **Per-arm grading — "grade everything" (the user,
15:54):** every item's in-app answer (all 40), the block twins `captured-high` ×3, the no-cue twins ×3, the back-leg
twins `captured-low` ×3 and the four bare arms (`high`, `low`, untagged 3.5-lite and 3.1-lite) are graded in h40d's
form: one grader per arm file (14 arm files), verdicts merged with `--model <pinned id>` into the judge files so the
pass record carries every grade. **Grader count:** 14 per-arm + G blind files (front 10 answers × |G| = 40 answers →
2 files of ≤ 24; back 6 × |G| = 24 → 1 file) × 2 graders = 6 → **20 graders**, plus 1 alias probe and 1 pilot
(`--make-pilot`); at most 2 at once (the launcher's slot lock), about 3 min each → about 35 min of grading, in one
sitting unless the account's usage limit refuses (§6). Every grader is launched by `F\R\launch-grader.mjs` from a fresh cwd outside the project
(`E\grading\<slot>-a<k>`), tools Read/Write/Edit only, no Bash, `--strict-mcp-config`, h40d's dispatch text with only
paths and tag substituted; memory ABSENT proven per transcript by `check-grader-memory.mjs`; every transcript audited by
`audit-graders.mjs` in its DEFAULT (point-15) mode, clean 100% or the file is re-graded once by a fresh grader; the
model pinned from each transcript by `h40d-grader-models.mjs` after one alias probe (§6 GRADER DRIFT). "Wrong" is
h40d's one definition: the judge's verdict wrong = correctness 0 or on_topic 0; "acceptable" = correctness 2, on_topic
2, delivery ≥ 1; "off-topic" = on_topic ≤ 1 (an answer to the EARLIER question is off-topic by the rubric).

## 3. Roster: scenario50 S1+S2, and the parent-evicted follow-ups named

**Decision: scenario50 S1+S2** (the spec's §11.5 and the plan's note), not holdout40. The trade-off, named:

- scenario50 is where the replay measured and where the gate was calibrated (design 2's cue set on scenario50 texts
  and invented ones; roster recall 11/12, false 1/38). A PASS here therefore shows that the BUILT feature reproduces the
  replay's effect live — the gated set, the parent ages, the per-item gain are PREDICTIONS this hour can falsify
  (below) — and says nothing about generalisation. That is the right first question for a feature that has never run
  in the app: a mechanical failure (the flag not reaching the process, a wrong turn id, a block on the wrong path) must
  be found on the tuned roster, where every expectation is known, before the never-tuned check is spent.
- holdout40 is the never-tuned check and is spent one hour per shipped change (`project_holdout_roster.md`: "ship only
  after ONE holdout hour scored against a rule fixed beforehand"). Its parentless follow-ups (R02F R04F R09F R11F R13F)
  are known only as parentless; whether their cue fires is NOT known (the gate was never run on holdout text, and the
  three holdout sentences seen 2026-09-28 bias any hand reading of R02F/R09F/R11F). A first live run that VOIDs on
  mechanics would burn a holdout hour for nothing. **holdout40 stays flag-OFF until this hour PASSES** (spec §11.5);
  the holdout hour after it is validation only, under its own registration, and nothing is ever tuned on it.

**The follow-ups by parent age** (`scenario50.questions.mjs` GAP: the parent's class sets the silence after it; the
deep dive's rule "parent absent ⇔ gap ≥ 120 s"; captured parent ages 156–161 s on the gated items in s50m/s50l/s50k):

- parent EVICTED (parent class coding/sql/design 150 s, codingHeavy 180 s): **S1Q04F S1Q05F S1Q06F S1Q07F S1Q08F
  S2Q04F S2Q05F S2Q06F S2Q07F S2Q08F** (10 of 20);
- parent PRESENT (verbal 60 s, reasoning 75 s, cloud 90 s): S1Q01F S1Q02F S1Q03F S1Q09F S1Q10F S2Q01F S2Q02F S2Q03F
  S2Q09F S2Q10F (10).

**The expected gated set, the registration's prediction** (`F\gate-report-turn.out.txt`, identical on s50m, s50l and
s50k): **G\* = {S1Q04F (constraint), S1Q06F (pronoun), S2Q05F (pronoun), S2Q08F (pronoun)}** get a block
(537/517/461/432 chars on the captured texts; live STT text varies, so the reader accepts 200–577 as the smoke does);
the cue fires but the parent is in the prompt → '' on **S1Q08, S2Q08, S2Q09F, S2Q01F**; the other 31 ids read
`no-cue`. Of the six evicted follow-ups the gate leaves silent: S1Q05F, S1Q08F, S2Q04F are self-contained (9/9
in-app historically); S2Q06F's cue is lost to STT ("Extended to…", 1/9 in-app, the worst roster follow-up — out of
this design's reach); S1Q07F and S2Q07F carry no cue. Their grades are reported beside the rule, never inside it.

**G, the live gated set** = the ids whose in-app diag line in the run window reads `gate=block` (joined to roster
items by the timeline's play window, as the smoke's checker does). G is what the rule computes on; G\* is what it is
measured against (rule 1(c)). An id in G but not in G\* (a main, or a cue-silent follow-up whose live STT text fired
the cue) is named and read like the rest; a G\* id not in G is named with its diag `gate=` value (its cause: STT
mangled the cue, the parent was present because the gap ran short, the item was lost before dispatch).

## 4. The rule

The hour **PASSES** only if rule 1 is not VOID, the window and grader conditions of §6 hold, and rules 2–5 all PASS.
Every clause is always computed and reported, VOID hour included. §5 gives each outcome's consequence and precedence.

### Rule 1 — mechanical eligibility (VOID, not FAIL): the feature ran, as built, on the expected items

VOID on any of:

- (a) the app's startup lines, read from before the run window (last match each), are not exactly
  `[Main] earlier question: on`, `[Main] verbal hedge: on trigger=5000ms` and `[Main] follow-up parent: off`;
- (b) fewer than 95% of dispatch windows carry an `earlier question:` diag line whose `turn=` is a number (the auto
  path; a `turn=none` line in a hands-free hour is named — expected 0 — and counts against the 95%);
- (c) **NOT EXERCISED:** fewer than **3 of the 4** G\* ids read `gate=block` in the run window. Each missing one is
  named with its `gate=` value; a VOID here is re-flown, never read as a gain of 0;
- (d) either dist proof set (the four EQ markers, `dist-proof --expect combined`, `parity-dist.mjs` exit 0) fails, or
  `earlierQuestion.js`'s sha differs before and after the run;
- (e) the captured prompts disagree with the diag lines: the number of `interview60.prompts.json` entries whose user
  text contains the 125-char LABEL (a script prints counts and ids only, `E\eq-flight-read.mjs --prompts`) is not
  equal to the number of `gate=block` windows that have a captured prompt;
- (f) more than 2 items lost before dispatch (h40d's 1(f); br1 on this roster lost S1Q08 to a not-a-question close
  and the Live ear rescued it 61 s late; s50m lost 0) — a lost PARENT is also rule 5's wrong-referent case;
- (g) knowledge mode not ON (h40d's 1(g), verbatim: `ENABLED` before the window, no `DISABLED` inside, `Intent
  classified` on ≥ 95% of windows);
- (h) a 3.5-lite outage: ≥ 50% of hedge runs followed by `back started … reason=front-error`.

Reported, never gating: the 3.5-lite share of won-by lines (br1: 40 of 42); the Live ear's dispatch share; every
`gate=` value's count over the run window (`block`, `no-cue`, `parent-in-prompt`, `parent-in-pinned`, `supersede`,
`no-parent`, `error`, `no-turn`); `ms=` p50/p90/max; the last three asked questions are NOT in the log (the diag line
carries counts only) — the ledger is audited through the captured prompts' block lines (rule 5).

### Rule 2 — cost: not slower, not longer, not more thinking (2a–2d gated; 2e–2f reported)

Paired medians on the G twins, front leg (block r1–r5 against no-block r1–r5, paired by (id, rep), the replay's
clauses 3–5 at this hour's size; expected 20 pairs at |G| = 4):

- **2a. Block build time:** `ms=` over every diag line in the run window: **p90 ≤ 50 ms** (the smoke's "slow build"
  line; the function is regex over ≤ 3 ledger entries and ≤ 12 prompt lines); max reported.
- **2b. Thinking:** paired median `thoughtsTokenCount` (block − no-block) **≤ +150** (h40d 2c's bar; the replay read
  +58 on R, +31 on all 70). Coverage: ≥ 90% of pairs with a finite `thoughts` on both sides, else TTFT decides at
  +1.0 s and §9 says the hour could not read a sub-second model-side cost.
- **2c. TTFT:** paired median ≤ +500 ms (FAIL > +1000; the replay +131 ms); stalls over 10 s: block ≤ no-block + 2
  (2 per 39 pro rata on 20, rounded up). p90 block ≤ p90 no-block + 2000 ms.
- **2d. Length:** paired median words ≤ +5 (FAIL > +10; the replay +4).
- **2e. Reported:** the in-app screen clock (`first token` median / p90 / max, h40d's method) and model clock over the
  hour against br1's 4.621 / 11.148 / 20.417 s and 4.105 / 10.661 s (same roster, the hedge default, pre-cue), and
  against the gate row's 10 s; the same clocks on the G windows alone against the hour's other windows (n ≈ 4, never
  gated); G (the knowledge step) against br1's 0.501 / 0.555 s; answer words p50 / p90 / max against br1's 85 / 123 /
  144; the 150-word cliff row.
- **2f. Answer failures** (h40d 2d's union, by `h40d-clocks.mjs`): charged failures and UNRESOLVED windows reported;
  a charged failure on a G item makes 3b INCOMPLETE (§5); elsewhere reported.

### Rule 3 — gain: the parent-evicted follow-ups' acceptable rate (3a, 3b gated; 3c reported)

- **3a. Same bytes, block against no block, front leg, on G:** Δ consensus-acceptable (block − no-block) over the
  pairs, **PASS ≥ ceil(0.20 × pairs)** (= +4 of 20; the replay's +8 of 40 bar scaled), **FAIL ≤ floor(0.05 × pairs)**
  (= +1 of 20; the replay's +2 of 40), **between = INCONCLUSIVE**. The replay's reading on these four ids was +19 of
  40 (per hour +8 and +11), so the prior sits far above the bar; 3a mostly confirms that the live bytes (the real
  STT text, the real ledger, the cue rule beside the block) carry the same effect. Reported PER ITEM as well as
  pooled, so a pass carried by one item is visible (S1Q04F and S1Q06F carried +10 of design 2's +11). The back leg's
  Δ (3 reps) is reported beside it and decides only in 4b.
- **3b. The live in-app read on G:** acceptable (the one grader) on **≥ ceil(0.5 × |G|)** of G (= 2 of 4) PASS;
  fewer = INCONCLUSIVE (never a FAIL on its own: one draw per item, n = 4; each miss is read against the item's own
  ten twins in the h40d appendix-B form, which says whether it is sampling or a live-only defect). A G item with no
  in-app answer (2f charged, lost after dispatch) makes 3b INCOMPLETE.
- **3c. Reported:** in-app follow-ups acceptable of 20 (s50m 12, s50l 19 — Opus 5 graders, not comparable; br1
  ungraded per item); the six cue-silent evicted follow-ups' grades; the four cue-fired-parent-present ids' grades
  (S1Q08, S2Q08, S2Q09F, S2Q01F: they must read '' — any block on them is rule 5's); the parent-present follow-ups.

### Rule 4 — no new wrong, no rise in off-topic, mains untouched (4a–4d gated)

- **4a. Zero wrong among the in-app answers on G** (the spec's own clause for this flight). Every delivered answer on
  G counts, a double's second answer included. One wrong = FAIL.
- **4b. Twins, per leg, on G:** consensus-wrong block ≤ no-block, front (5 reps) AND back (3 reps); either leg failing
  fails (the replay's rule (a), ruling 4). **Price, exact** (`E\falsefail-eq.mjs`, the replay's `falsefail.mjs`
  model at this hour's counts, calibrated: it reproduces the replay's 30.9% at n = 70, p = 1%; output
  `E\falsefail-eq.out.txt`): under "consensus-wrong rate p per pair per arm, A and B independent, NO effect" —

  | p per pair | front 20 | back 12 | **either leg fails (the rule)** | pooled 32 |
  |---|---|---|---|---|
  | 0.5 % | 8.7 % | 5.5 % | **13.7 %** | 12.8 % |
  | 0.75 % | 12.2 % | 7.9 % | **19.1 %** | 17.3 % |
  | 1 % | 15.2 % | 10.1 % | **23.8 %** | 20.9 % |

  So about 14–24% for the per-leg rule (the replay's was 30–43% at 70 + 24). Accepted; a single-draw FAIL is read as
  what it is, and the wrong answer is named with its twin rows.
- **4c. Off-topic:** consensus off-topic block ≤ no-block, front leg, on G.
- **4d. Mains untouched:** every main's diag line reads `gate≠block` and `chars=0` (by construction: a main gets a
  block only when its cue fires and its parent is absent; S1Q08 and S2Q08 fire the cue and must read
  `parent-in-prompt`). A main WITH a block is named, its parent identified (rule 5), and if its in-app answer is wrong
  → FAIL. Reported beside it: in-app mains acceptable of 20 against the quality bar's 18 of 20 (s50m 18, s50l 19 —
  Opus 5 graders; no scenario50 in-app mains count exists under the current grader, which is why h40d's "previous
  hour's own count" floor cannot be set here and the 18-of-20 bar is reported, not gated) and against the block twins'
  mains band (`VH\review-scratch\mains-band.mjs`, h40d's 3e form); the mains' prompts being flag-off bytes, a mains
  count below the bar is the hedge's and the provider's, not this feature's.
- **4e. Zero wrong among the in-app mains (standing practice kept at its bar: s50m's rule 4 "zero `wrong` verdicts in
  the live hour", h40d's 3b; scenario50's in-app hours s50k/s50l/s50m each read 0 wrong).** A wrong main WITHOUT a
  block is an **other FAIL** (§5): not the feature's — its prompt is flag-off bytes — but the hour does not validate;
  read item by item in h40d's three-way form (pipeline / mixed / model, with its nine twins), the user rules between
  re-fly and accept. A wrong main WITH a block is 4d's feature-attributable FAIL.

**Reported: the cue effect on this hour's bytes, in h40d's form, never gating** (the user, 15:54: "grade everything";
h40d's instruments re-pointed: `VH\h40d-twins.mjs` for the band and the gated-wrong sums, `VH\h40d-thoughts-noise.mjs`
for the thinking difference, `SP\check-smoke-cues.mjs` v4 and `SP\cue-group\smoke-facts.mjs` on the run folder's log):
the cue twins' acceptable band against the no-cue twins' band on all ids (h40d 3c: [36, 39] against [36, 38]); wrong
sums cue against no-cue (margin of one, both readings printed); blocks present and shaped per cue rep (≥ 90% is
h40d's line); pooled median thinking tokens cue − no-cue against +150 (h40d read +161 on holdout, the bench +55 on
scenario50 — this is the first scenario50 live hour to read it); the in-app cue row (`Cue block above every spoken
answer`), `check-smoke-cues` CLEAN or its lines, trims quoted. The in-app mains acceptable / weak / wrong per arm
against the latest scenario50 hours (s50m 18/2/0, s50l 19/1/0 in-app; their twins' counts in the pass records; grader
differs, so direction only). None of it decides this hour; a cue reading beyond h40d's bounds is named for the cue
work, which has its own agenda.

### Rule 5 — feature integrity: the states the hour reaches (5a gated; 5b gated conditionally; 5c reported)

- **5a. `gate=error` = 0** in the run window. The spec makes an exception fail safe (today's prompt), so the answer is
  fine — but a thrown path is a built defect: ≥ 1 = feature-attributable FAIL, the line and its window named.
- **5b. The referent.** For every `gate=block` window, the parent line inside the captured prompt's block is matched
  against the roster's texts (`sameAnchor`, ids printed only, never text) by `E\eq-flight-read.mjs --referents`.
  Expected: the item's `chain` parent (S1Q04F → S1Q04, …). A **wrong referent** (the never-dispatched-parent row: the
  parent lost before dispatch, a not-a-question close, a late Live echo after the next question) is named with its
  cause placed in the log; it is a bounded residual by the spec (§7) and is **FAIL only if that item's in-app answer
  is wrong** (then it is 4a's wrong, attributed to the referent); otherwise reported. A parent text that matches no
  roster item (a merged or echoed text) is named as UNMATCHED and read by hand from ids only.
- **5c. Which §3.6 rows the hour reached — reported, each with its window:** `parent-in-pinned` (a Live merge, R07F's
  shape, or a re-ask), `supersede` (the 8 s supersede: s50l had one), `no-parent` (expected once: the first question
  of the hour), `parent-in-prompt` on the four expected ids, a `turn=none` line, a duplicate ledger entry (a double
  dispatch: two `gate=block` lines for one item), a never-dispatched parent (5b). **NOT EXERCISED** = every row of
  spec §3.6 whose `gate=` value or log signature does not occur in the run window; the result note lists them
  explicitly (expected not reached on this roster: two questions in one turn; the R21 re-entry; chip, answer-now and
  manual paths; the > 450-char clip — the longest S1+S2 question is 407 chars; the 76 s late echo; suggest/off mode;
  the junk-flag refusal — proven by the unit test only). The quick-follow-up regime (< 60 s, "Why that one?") is the
  smoke's (§7.s), not this roster's.

### Counting rulings, before any verdict

- An item answered twice counts once toward 3b (its best answer) and both answers count for 4a (h40c's ruling).
- G twins: a record with `transientError` is a true hole: an incomplete pair, excluded and named; a rep with more than
  1 true hole on G (of 4) makes 3a INCOMPLETE and is re-run the same quota day with `--only <ids>` if the ledger allows
  (never a bare resume), its filled ids graded by a fresh pair of graders in the same session and named; empty prose
  with no `transientError` counts wrong on either side (the h40d rule); `thoughts: null` is excluded from 2b's pairs.
- 3a's pair count is `5 × |G|` minus incomplete pairs; the bars are formulas on that count, printed with it.
- Grades are the graders'; nothing is re-graded by hand. GRADER DRIFT (§6) is a modifier.

## 5. What each verdict licenses, and the precedence

The verdict is the first of these that applies:

1. **feature-attributable FAIL** — 4a, 4b, 4c, 4d (a wrong main with a block), 2a–2d beyond their FAIL lines, 5a, 5b
   (a wrong referent with a wrong answer). Read in ANY hour whose dist proofs pass (rule 1(d)), VOID on 1(a)–(c),
   (f)–(h) included: a wrong answer under the block stops the flag as a FAIL would. Sampling until it passes is not
   allowed.
2. **VOID** (rule 1): the hour did not test the feature as built or did not reach it (1(c) NOT EXERCISED); re-fly on
   the next free quota day under this same file (a dated re-flight note in §11, no rule change); rules 2–5 reported.
2b. **other FAIL** — 4e (a wrong in-app main without a block): the hour does not validate; the item is read in the
   three-way form before any decision; the user rules between re-fly and accept; the feature's own clauses (3a, 3b,
   4a–4d, 5) are reported for what they show and a feature-attributable reading among them is item 1.
3. **INCOMPLETE** — a G hole beyond the ruling, 2b/2f undecided, a verdicts file missing, 3b with a lost G item,
   nothing already failed: re-run the missing offline piece the same quota day if the ledger allows, else re-fly.
4. **INCONCLUSIVE** — 3a between its lines, or 3b under its floor with 3a PASS: **ONE re-fly under this
   registration; a second INCONCLUSIVE = FAIL** (the replay's rule).
5. **NO LATENCY VERDICT** — an out-of-window start: rule 2's in-app clocks are reported, not gated; rules 3–5 read
   normally; the hour cannot PASS; re-fly inside the window.
6. **PASS**.

- **PASS**: the built feature reproduces the replay live on the tuned roster. It licenses, in this order and nothing
  else: (1) the holdout40 validation hour with the flag ON, under its own pre-registration (bands + zero wrong on its
  gated items, the holdout's own rule; the three holdout sentences seen 2026-09-28 named as a bias on any reading of
  R02F/R09F/R11F); (2) only after THAT passes, the default-ON commit (which also removes `withParentExchange` and its
  flag in one reviewed change, spec §3.5). A PASS is not a ship decision and is not evidence of generalisation.
- **feature-attributable FAIL**: the flag stays OFF (nothing to revert: the tree is flag-off by default); the failing
  leg is understood on the hour's own captured bytes (its prompts are the replay's material for this hour) before any
  change; any change to gate, selector, label or placement is a new spec and a new registration; holdout40 is not
  flown with the flag.
- **VOID / INCOMPLETE / INCONCLUSIVE / NO LATENCY VERDICT**: as above; in every outcome the result note exists before
  anything else lands on MAIN.

## 6. The window, the grader and the day

- **Start** = the timeline's `startedAt` at UTC+3, printed by `h40c-hedge-stats.mjs` as `IN WINDOW 12:00-15:00` or
  `OUT OF WINDOW`; read first.
- **Grader.** Pinned from every grading transcript. **GRADER DRIFT, decided now (h40d §6's rule):** one throwaway
  alias probe (`launch-grader.mjs cwdprobe-1 --probe`), its model read by `h40d-grader-models.mjs`, BEFORE any
  grader. If `opus` no longer resolves to `claude-opus-5-5`, the hour is graded by the new model, every merge and the
  note name it; every clause of this file is computed WITHIN the hour under one grader (3a, 3b, 4a–4d are same-hour,
  same-grader comparisons), so **every clause still gates**; the cross-hour numbers (3c, 4d's s50 counts, 2e's br1
  clocks) are reported only, as they are anyway. **Ruled (5, §11):** grade with whatever the alias resolves to, the
  model read from every transcript (`claude-opus-5-5` today), stated in the result note.
- **Memory ABSENT** for every grader (the replay's §1 requirement): the grading cwd outside the project tree, the
  projects folder of that cwd holding no transcript and no memory before launch, `check-grader-memory.mjs` on every
  transcript afterwards; LOADED on any grader = that file re-graded once by a fresh grader; no fallback beyond that.
- **The account's usage limit** (the replay's A3: 20 launches refused in ~8 s each on 2026-10-04 00:53): a refused
  attempt (`rate_limit`, no tool call, no verdicts file) is not a grader attempt and consumes no replacement; grading
  waits for the reset and continues in a later sitting, named; each blind file holds both arms of its own items, so a
  level shift between sittings cancels in the paired consensus.
- **The day (ruling 6, §11): Monday 2026-10-05**, the ledger (`quota-ledger.mjs`, per-request lines since 10:00)
  read at **10:45** showing **≥ 400 requests of headroom on each lite model**, start 13:30, the machine quiet
  12:00–16:30 — subject to the user confirming on the day that they are logged on and the machine is quiet; if not,
  the next quota day on which ALL of §7 holds and no other pre-registered lite replay or flight runs. Estimate for
  this hour (counts, not measurements): **3.5-lite ≈ 353** (in-app front ~45, `captured-high` ×3 120, the no-cue
  twins ×3 120, `high` 20, bare 20, G reps 4–5 8, no-block ×5 on G 20) — 147 under the 500 cap, so the ≥ 100 margin
  holds with 47 for retries (the replay saw 0 transient in 188 calls; h40d's 3.5-lite twins had 1 hole in 264);
  3.1-lite ≈ 260 (pings ~10, back legs ~10, `captured-low` ×3 120, `captured-minimal` 40, `low` 20, bare 20,
  no-block-low ×3 on G 12, chains ~25). No full-Flash call (ruling 3). **Order of consumption, named:** the in-app hour,
  then `PAIRED_ARMS` in its fixed order (the no-cue twins LAST among the harness arms, as on h40d), then the
  controller's G arms (`captured-high-r4/-r5 --only`, `--no-block` ×5, `--no-block-low` ×3) from MAIN in a shell
  carrying the launcher's env block. The G arms are the PRIMARY control and run last: the ledger is re-read before
  they start and must show ≥ 40 on 3.5-lite and ≥ 20 on 3.1-lite; if it does not, they run on the next quota day on
  the same captured prompts (a named departure: 2c's TTFT is then reported, not gated, because the two sides ran on
  different days; 3a, 4b, 4c, 2b, 2d still gate — token counts and verdicts do not drift with the provider's clock).
- **During the hour:** h40d §6's list verbatim (quiet machine, logged on, no builds, no other task, Context ON, AC,
  port 5180 free, no tail watchers), run by `E\eq-precheck.ps1` at 13:24.

## 7. Blocking checklist before arming (none is optional; each line is quoted in §11)

- **b1. Build gates c1–c3, the plan's own:** (c1) `F\build\parity-dist.mjs` against MAIN's dist → `PARITY DIST: 126
  fixture entries (21 with a block) + 29 invented cases; mismatches 0`, exit 0, and `EQ_DIST_BREAK=1` → ≥ 21 MISMATCH
  lines, exit 1; (c2) `followup-replay-build.mjs … --calibrate` → `CALIBRATION OK 39/39`, and `REPLAY_BREAK=1` fails;
  (c3) `WhatToAnswerLLM.earlierQuestion.test.ts` (the byte rule, extraContext empty and non-empty, coding drops the
  block, flag off byte-identical) green inside the full suite (Task 8's counts, cwd = the worktree root); tsc root 0,
  tsc electron == the baseline list (6); the Opus review (Task 8) READY; `LANDED.txt` written; the landing commit's sha.
- **b2. The dist:** the four markers `True`, `main.js` mtime after the build; `dist-proof.mjs --expect combined …` every
  marker as expected; `earlierQuestion.js` sha256/16 recorded.
- **b3. The smoke (plan Task 10), the seam proof:** task `Natively-smoke-eq` on MAIN's build, both segments
  `CHECK CLEAN` / `CHECK EXIT 0`; segment 1's notes `S1Q04F: gate=block cue=constraint chars=<200..577> turn=<n>` and
  `S1Q06F: gate=block cue=pronoun …`, S1Q04/S1Q06 `gate=no-cue`, `[Main] earlier question: on`; segment 2 `off` with no
  diag line; `RESULT-smoke-eq.md` written. The smoke IS this hour's pre-hour MAIN start (h40d §7.3's seam: MAIN's
  checkout, `.env` loader, rebuilt dist, single-instance lock, the flag through the scheduled task → `npm start` →
  Electron); no separate prestart. A `NOT EXERCISED` smoke line is never a pass.
- **b4. The same-bytes control, the harness option built as an extra build task (ruling 1; a MAIN commit before the
  registered HEAD):**
  `interview60.answers.mjs --no-block` — `--no-cues`'s pattern: needs `--captured` and `--tag`; removes
  `${LABEL}\n- <one line>\n\n` immediately before `INTERVIEWER JUST SAID:\n`; REFUSES (exit 2) any captured prompt
  that carries no block (so it runs with `--only <G>`); never prints a prompt. Tests (vitest, the byte rule in
  reverse): `insertBlock(strip(user), block) === user` on the parity fixtures' `userB`, and a `userA` is refused.
  Calibrated on the smoke's capture (`verbal-prompts.log` → `interview60.prompts.mjs`): the two gated ids strip to
  bytes whose sha equals the flag-off reproduction of c2's builder for the same transcript, printed as hashes.
  Opus-reviewed with the tests. **Without b4 the hour cannot compute 3a, 4b, 4c or 2b–2d: it would be a smoke with
  grades, not this registration.** Beside it, the harness edit of ruling 3 (the Flash arms off) with its proof line
  (§2); the no-cue twins stay as built.
- **b5. The reader `E\eq-flight-read.mjs <run-dir>`** (rules 1(b)(c)(e), 2a, 4d, 5a–5c): per dispatch window the diag
  fields, the roster item by play window, the `gate=` histogram, G and G\*∩G, `ms=` percentiles, the LABEL count in
  the prompts file, the referent id per block (`--referents`; ids only). Known cases, each printed into
  `E\eq-flight-read.cal.txt`: the smoke's segment-1 log → G = {S1Q04F, S1Q06F}, both referents right, 2 `no-cue`,
  turn ids increasing, 0 error; the smoke's segment-2 log → no diag line → `NOT EXERCISED (flag off)`; h40d's run log
  → the same; synthetic logs in the app's line shape: one `gate=error` → 5a FAIL named; a block whose parent matches
  the grandparent → WRONG REFERENT named; a main with `gate=block` → named under 4d; a `turn=none` line → named.
- **b6. The twins adapter `E\eq-twins.mjs`:** builds the G blind files and keys from the five block and five no-block
  answer files (front) and three + three (back), computes 3a, 4b, 4c, 2b–2d from the consensus verdicts and the
  answer records (holes, empty prose, `thoughts`, TTFT, words), prints pairs, bars as formulas and per-item lines.
  Calibrated on the replay's own s50m front answer files (`F\R\…fturn-s50m-A|B-r1..5`) → the replay's s50m per-item
  rows and Δ +8 reproduced; a mutated copy with two B records set to A's text → Δ falls; synthetic verdicts for every
  branch (PASS / INCONCLUSIVE / FAIL on 3a; a back-leg wrong alone → 4b FAIL; `thoughts: null` on 3 of 20 → excluded,
  coverage printed; 4 nulls on one side → the TTFT fallback).
- **b7. The launcher family:** `launch-eq-src.txt` → `launch-eq.cmd` and `launch-eq-dry.cmd` (ASCII, CRLF, checked
  with `cat -A` and the non-ASCII grep); the guards-only chain run with `cmd.exe /c` from MAIN printing
  `GUARDS_ALL_PASSED`, a mangled-marker copy exiting with that guard's code and the error-log line (the
  flight-launcher-guards note's four steps); `guard-eq.mjs` calibrated by breaking each premise once (`guard-eq-cal.txt`:
  the flag unset / `0` / `yes`, both flags set, the parent flag `1`, roster holdout40, a dist without the LABEL,
  parity-dist failing, HEAD moved, tree dirty, `.env` naming a guarded name, knowledge OFF stub → each a named
  `GUARD FAILED`; the correct environment → `GUARD OK`); the dry task's `GUARD OK` in its log; `register-eq.ps1`
  printing StartWhenAvailable False and the next run time; `eq-precheck.ps1` run once against the dry task.
- **b8. The grader session proven:** `launch-grader.mjs cwdprobe-1 --probe` then `cwdprobe-2 --probe` (fresh cwds,
  exit 0, Read + Write only, memory ABSENT, model pinned); the launcher's **`--pairs <file> --verdicts <file>` mode**
  (ruling 2: per-arm judge exports graded without the blind-N layout, or a copy into it) calibrated on `--make-pilot`
  FIRST (the pilot graded through that mode, audit clean, `dispatch=match`, the verdicts file read back against the
  pairs file's keys), then the blind G files through the slot mode; the
  dispatch text's tag/file table for this hour (`E\eq-grader-dispatch.txt`: h40d's text with eleven per-arm rows
  and the blind-file rows) written and hashed; `eq-merge.cmd` (h40d's with the arms of §2) run against a missing file
  → `SKIPPED-MISSING`, wrong cwd → exit 13.
- **b10. The cue export (the user, 15:54; this file guarantees the export and its completeness check only — the
  grading of the cues is `L\cue-grading\PREREGISTER-cue-grading.md`'s, which adds this hour as a material set):**
  `E\eq-cues-export.mjs <run-dir>` writes `E\cues-export-eq.json` — per in-app answer `{id, arm: 'inapp',
  dispatchedAt, cues: [...]}` from the run window's `[Answer] cues:` lines joined to the judge's pairs by dispatch time
  (the `wonby-join.mjs` join), and per cue-twin record `{id, arm, rep, cues}` from the `captured-high` / `captured-low`
  answer files' raw `cues` arrays — ids and cue text only, never an answer, never printed, never committed (it is
  handed to the cue-grading run as its input). **Completeness check**, printed as counts: every delivered in-app answer
  (a `[Answer] full:` line in the run window, superseded streams excluded) has exactly one export entry, empty blocks
  kept and NAMED with their kind (a knowledge short-circuit, a coding route, a `[]` beside a failed answer — h40d's
  classes); the count equals `interview60.metrics.mjs`'s `cueBlocks` present count plus the named empties; each cue
  twin rep's entries equal its answered ids. A mismatch makes the export INCOMPLETE, named with the ids; it does not
  touch this hour's verdict. Calibrated on h40d's run folder (47 cue lines → 45 in-app entries + the probe's 2 outside
  the window, 0 empties; the twins 44/44 per rep), the 05:00 cue re-smoke (20/20) and a synthetic log with one empty
  block beside a failed answer → named, and one missing cues line → INCOMPLETE.
- **b9. The ledger and the machine:** `quota-ledger.mjs` at 10:45 on the day; `falsefail-eq.mjs` DONE (rule 4b's table);
  the quiet-machine window (12:00–16:30) told to the user; the user logged on; no `Natively-*` task Running; no
  orphaned `tail.exe`; no Electron process; the error log absent; this file committed to MAIN's `passes/` and its sha
  written into §11.

## 8. Evidence kept

The run folder (gitignored) and, committed with the result note: the tool-written pass record
`passes/<stamp>-eq.md` regenerated after every merge (never hand-edited), an INDEX line (`roster scenario50 [S1, S2]
40 items`, the registered commit, grader), `passes/<date>-flight-eq-result.md` (the rule table in h40d's form, the
per-item G table with ten twins per item, the `gate=` histogram, the referent table, the NOT EXERCISED list, the
bare-arm table, the cue-effect table in h40d's form, "What this does not show"), this file, and under
`passes/<date>-flight-eq/`: the reader's, adapter's, clocks', twins' and grader-model outputs, `graders.json` + audit +
memory-check outputs, the blind keys, the cue export's completeness lines (counts). Captured prompts,
`verbal-prompts.log` and `cues-export-eq.json` carry the user's interview content: hashes and counts only, never
committed, never printed. A log with third-party
speech stays in `E\` and is never committed.

## 9. What this hour cannot show

- Generalisation: the roster is the tuned one; holdout40 decides that, after.
- The gain beyond four items whose windows repeat across hours (S1Q04F, S1Q06F carried the replay's gain); |G| = 4
  gives 3b one draw per item — 3a's twins carry the inference.
- The quick-follow-up regime (< 60 s, same frame word), chips, answer-now, suggest/off mode, two questions in one
  turn, R21, the clip over 450 chars, the 76 s echo: proven by tests and the smoke, not reached here (rule 5c lists
  what was).
- Answer-dependent follow-ups ("why did you choose X") and the cue-silent evicted ids (S2Q06F above all): outside the
  design.
- Whether the block changes the hedge's real race: both legs get the same bytes; a 3.1-lite win on a G item is
  reported with its twin leg, n ≈ 1.
- The cues' CONTENT: this hour exports the cue lines and checks the export is complete; whether a cue is right is
  the cue-grading registration's question. The cue effect on answers is reported in h40d's form (three reps a side,
  a band of width ~3), never decided here.
- Provider load: one hour; 2e is reported for that reason.
- Quality beyond one hour: paired-grading noise about ±4 on 40.

## 10. The open questions as written (ruled by the controller 2026-10-04 15:47, §11; kept as the record of what was open)

1. **The roster: scenario50 S1+S2** as registered (recommended; §3), or holdout40 now — which spends the never-tuned
   check on the feature's first live run and cannot name its expected gated set.
2. **The control:** the same-bytes no-block twins on G (b4; recommended — the same-hour control of h40d's no-cue
   twins; one small harness commit), or no control (then 3a/4b/4c/2b–2d cannot be computed: the hour reads 3b + 4a +
   rule 5 only and cannot PASS under this file — it would be a graded smoke).
3. **The no-cue twins** (`captured-no-cues-high` ×3, 120 calls on 3.5-lite, ungraded here): leave them to run as the
   harness stands (recommended: no harness edit), or build the opt-in switch the user ruled for on 30 Sep.
4. **The focused-five Flash arms** (≤ 5 calls each on 3.5/3.6/3.7/3.8-flash, ungraded): run as built, or off.
5. **4b read per leg, either leg failing** (recommended, the replay's rule (a); false-FAIL ~15–25% with no effect) or
   pooled across legs.
6. **GRADER DRIFT:** grade with the resolved model and say so (default), or a dated re-pin amendment before grading.
7. **The day and the 13:30 start** inside 12:00–15:00; the quiet-machine window 12:00–16:30.

## 11. What flies

### Rulings (the controller, received 2026-10-04 15:47 TST by `date`; written in by the spec author, before any data)

1. **`--no-block` is built** — added to the build as an extra task, calibrated as §7.b4 specifies. b4 stays a gate.
2. **The grader launcher gets a `--pairs <file> --verdicts <file>` mode** (or a copy into the blind-N layout),
   implemented in the flight harness, calibrated on `--make-pilot` first (§7.b8).
3. ~~The no-cue twins are OFF~~ — **superseded by the user's ruling below (cues ON as shipped; the no-cue twins
   ON and graded).** The 15:47 premise "cue mode is OFF by default since 2026-10-02" was wrong: cue mode is ON in MAIN
   at 89c8f53 (`prompts.ts:2444`), the OFF flag was parked and never built. Kept from the ruling: **the focused-five
   Flash arms are OFF** (no full-Flash quota spent); **the bare arms stay and are graded** (the standing rule).
4. **4b per leg, either leg failing**; price 13.7 / 19.1 / 23.8 % at 0.5 / 0.75 / 1 % wrong per pair (§4, rule 4b's
   table; `E\falsefail-eq.out.txt`).
5. **GRADER DRIFT:** grade with the resolved alias, the model read from every transcript (`claude-opus-5-5` today),
   stated in the result note (§6).
6. **The day: Monday 2026-10-05** — quota check at 10:45 (≥ 400 headroom per lite), start 13:30, quiet machine
   12:00–16:30, subject to the user confirming they are logged on and the machine is quiet; if not, the next such day
   (§6). The roster stays scenario50 S1+S2 (§3; §10 item 1 was not overruled).

### The user's ruling (received 2026-10-04 15:54 TST by `date`, verbatim: "as shipped, cues on; also could we grade the cues correctness alongside the followups, or simply can we grade everything next flight?")

- **Cues ON, as shipped:** the hour flies MAIN's shipped prompt shape (§1); ruling 3's OFF premise is corrected above.
- **The no-cue twins are ON again and graded** (§2): they measure the cue effect in the same hour, as h40d did;
  reported in h40d's form (§4), never gating. 3.5-lite estimate recomputed: ≈ 353 of 500, margin 147 (§6).
- **"Grade everything":** every item's in-app answer, the block/no-block G twins, the no-cue twins and the four bare
  arms are graded by the same grader setup (outside cwds, no Bash, memory ABSENT, model pinned): 14 per-arm graders +
  6 on the G blind files = **20 graders** (+ alias probe + pilot). The follow-up rule (3a, 3b, 4a–4d, 5) stays the
  PRIMARY decision; every other grade is REPORTED — except **4e, zero wrong among the in-app mains**, kept because it
  was standing practice at that bar (s50m rule 4; h40d 3b; 0 wrong on s50k/l/m), as an other FAIL, never
  feature-attributable without a block (§4, §5). The 18-of-20 mains bar is reported, not gated: no scenario50 in-app
  count exists under the current grader to set a same-grader floor from, as h40d's 3a did.
- **The cues' correctness:** this hour exports the app's cue lines and the twins' raw blocks (ids + cue text, never
  printed) with a completeness check (§7.b10); grading them is `L\cue-grading\PREREGISTER-cue-grading.md`'s, which is
  adding this hour as a material set. Nothing about cue content decides this hour.

### Filled at arming (nothing above is edited)

- Registered HEAD: `<sha>` (= 89c8f53 + LANDED `<sha>` + the `--no-block` commit `<sha>` + the ruling-3 harness edit
  `<sha>` + this file). Cue shape: `CUE_RULE` present at the registered HEAD (the user's ruling) — `<confirmed by grep
  at arming>`. Smoke: run `<stamp>`, lines quoted. b1–b10 outputs quoted. Dist
  sha256/16: `<…>`. Ledger at 10:45: `<used/headroom per model>`. Alias probe: `<model>`. The user's confirmation
  (ruling 6): `<time, logged on, quiet>`. Task registered: `2026-10-05 13:30`, next run read back. This file's sha256
  as committed: `<…>`.
