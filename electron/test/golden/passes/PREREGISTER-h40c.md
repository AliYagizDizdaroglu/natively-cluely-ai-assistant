# Pre-registration: flight h40c (holdout40, third flight) — hedge ON

Written before the hour. Not edited afterwards; the result goes in
`passes/<flight-date>-h40c-result.md`.

**What the hour tests.** The tree that flies is `07a0e5e` (h40b's own HEAD) plus every commit
between it and the registered HEAD below, named individually because they do not all behave the
same way this hour:

- `e311019` (harness) — **fix(harness): credit an answer the app dispatched on a Live
  paraphrase.** Changes the flight's OWN instruments (the judge's answer-pairing step and the
  metrics module's claim-scoring step), not the app. A dispatch with `verdict=paraphrase` now
  also scores the `question=` it carries, so an answer the app gave on the Live ear's paraphrased
  text — previously scored only against the paraphrase itself, sharing no content word with the
  played question, so it went "to nobody" and was never graded — is now attributed. **This makes
  h40c's in-app count more generous than h40b's committed 35**: replayed under this fix, h40b's
  own R07F would be attributed, not graded (all seven captured arms gave the same answer and were
  acceptable on it, but a replay is not a grading run). Rule 3's floor stays 35 (h40b's committed,
  registered number) with this bias named explicitly rather than silently re-derived upward — a
  h40c count at or above 35 is read knowing the attribution that produced it is not the
  attribution that produced h40b's 35. `passes/INDEX.md` re-derives every row whenever it is
  written (the flight's own pass-record step and every judge merge), so h40c's first INDEX write
  also moves h40b's row to this attribution: delivered 43 → 44 (R07F). h40b's own pass record and
  its registered 35 stay as committed; the commit carrying that INDEX names the change.
- `6c50ec3` (app, flag off) — the follow-up-parent restore, behind `NATIVELY_FOLLOWUP_PARENT`.
  **Its own offline replay FAILED its pre-registered rule**: ten follow-ups, three repetitions,
  two arms, graded blind — wrong answers went from 0 to 1, acceptable from 16 to 22; the
  registered rule reads wrong answers first, so the flag stays off. This is not a validated fix
  being withheld for scheduling reasons; it did not clear its own bar. With the flag off, the
  commit changes what `SessionTracker.addAssistantMessage` stores as `questionContext` in the
  response history — read only by the restore's own logic, which never runs while the flag is
  off.
- `da28f25` (app, flag off by default; ON this hour) — **feat(verbal): the hedge behind
  NATIVELY_VERBAL_HEDGE.** The change under test: with `NATIVELY_VERBAL_HEDGE=1`,
  gemini-3.5-flash-lite (HIGH) starts first; with no first token by 5 s, or on a failure before
  one, gemini-3.1-flash-lite (LOW) starts beside it and 3.5-lite keeps running; the first token
  wins and the other request is aborted through its own stop signal (no `AbortSignal.any`). When
  neither leg has produced a token and either one has errored, the hedge throws and re-runs the
  pair; when both legs simply end empty, with no token and no error, it does not (see rule 2's
  failure definition below). Replaces the plain stall race h40b flew (3.1-lite LOW
  first; 3.5-lite HIGH after a 503 or a 10 s stall). Basis: the proposal of 2026-09-24 and a live
  probe of 2026-09-25 (pooled median 4.4 vs 6.1 s, p90 11.5 vs 13.3 s, none 0 vs 0, 95 of 117
  answers from 3.5-lite).
- `51e349d` (docs) — registers 6c50ec3's own pre-registration; a copy-script bug on a long source
  path also wrote that same pre-registration text into the result file a second time, in place of
  the replay's real result.
- `18242df` (docs) — replaces the result file's content with the actual replay result (wrong 0 to
  1, acceptable 16 to 22); 18242df left the pre-registration's own file untouched.
- `e94305a` (harness) — **fix(flight): the flight answers on the two Flash Lites only, no Groq
  arms.** Drops the two Groq comparison answer arms; see "Answer arms" below.
- `391f1fc` (docs) — restores 6c50ec3's replay pre-registration to its registered bytes (51e349d
  had committed a double-encoded copy with 14 damaged characters; no word of the rule changed) and
  adds the replay's evidence (answers, blind files, verdicts, scripts). No app or harness code.
- `9107a93` (app, flag off; tests) — **fix(verbal): a bad NATIVELY_FOLLOWUP_PARENT refuses to start,
  and the hedge's empty legs are pinned.** The follow-up flag is validated at startup beside the
  hedge's (a junk value refuses to start instead of failing each answer); the app logs
  `[Main] follow-up parent: off` at startup this hour. Two tests pin the hedge's empty-leg
  branches, and two test files clear the hedge variables per test. No change to any answer path.
- `998b5b7` (harness) — **fix(pass-record): a run flown with the hedge says so.** This hour's pass
  record reads the `[Main] verbal hedge:` startup line and names the hedge as the in-app model
  instead of 3.1-flash-lite; records of earlier runs render as before.
- this pre-registration's own commit, which is the registered HEAD.

Everything else is h40b's: roster holdout40 (45 items), audio, Deepgram + Live ears, grader rubric
(stamp 8564ba96369a), LOW shipped. The launcher's guard proves the launcher's own environment
resolves the flags correctly and that the build and its source carry the hedge and pin HEAD — see
"Instrument" below for what it does and does not prove about the app process itself.

**Answer arms (2026-09-26, user decision).** h40c runs no Groq answer arms: `qwen/qwen3.8-27b` and
`openai/gpt-oss-120b` are removed from the answer-model list at the user's request. No rule or
reported row below uses either. This is unrelated to the app's own question DETECTOR, Groq
`openai/gpt-oss-20b` (a different, smaller model, easily confused with the removed 120b answer
arm) — the detector decides WHEN to answer, is part of the app under test, and is unchanged; the
guard fails if anything overrides it and fails if any answer-arm id still contains a Groq-shaped
name.

**Instrument.** The interview60 flight harness hands-free from `holdout40.wav`, task
`Natively-flight-h40c`, the standard arms (Gemini lite twins and bares only — see "Answer arms"
above) and the judge (Opus agents, grader pinned — see the rule below), plus a script that reads
the hour's own logs for the hedge mechanics the rule below needs.

**What the guard proves, and what it cannot.** The pre-flight guard is a node child of the
launcher's own cmd session: it proves that the launcher's environment, AS THAT CHILD INHERITS IT,
resolves the hedge flag, its trigger, the follow-up flag, the answer-model override and the
thinking-level override correctly; that dist-electron and the source it must have come from carry
the hedge; that the answer-model list contains no Groq id and the question-detection override is
unset; and that `.env` declares none of the guarded names and that MAIN's HEAD and working tree
match what was registered. It does NOT prove the spawned Electron app process received the same
environment — that process is three hops away from the launcher (through an autostart step, a
detached keeper, and an `npm start`), and while each hop normally carries the launcher's
environment through, the app's own `.env` loader fills in any name `.env` declares that its
process does not already have — and the launcher unsetting a flag (rather than leaving it empty)
means a `.env` line for that same name would reach the app and never reach the guard.
**The app-process proofs this pre-registration actually relies on:**
- before the hour, a pre-hour smoke run through the same app-start chain the flight itself uses;
- after the hour, the app's own startup line — logged before credentials load, read from BEFORE
  the run's own timeline window — and the `verbal hedge: won by` lines, which can only exist if
  the hedge flag was true INSIDE the app.

**The rule.** The hour PASSES only if all hold:

1. **Mechanical eligibility.** VOID, not FAIL, and ONLY on:
   - (a) the app's own startup line (read from before the run's own window, last match) is not
     exactly `[Main] verbal hedge: on trigger=5000ms`;
   - (b) fewer than 95% of answer-dispatch windows (a `dispatch: answer` or `dispatch: supersede`
     line to the next one) contain a `verbal hedge: front=` line;
   - (c) an OBJECTIVELY defined 3.5-lite outage: at least 50% of hedge runs — counted as
     `verbal hedge: front=` lines across the hour, not back-starts — are followed by a
     `back started ... reason=front-error` (3.5-lite failed before its first token), rather than
     `reason=trigger` (3.5-lite was simply slower than 5 s) or `reason=front-empty`.
   A low 3.5-lite win share caused by `reason=trigger` is NOT void — it is what the hedge does, by
   design, when 3.5-lite is merely slow, which is expected under daytime load. It is a RESULT,
   reported below, and rules 2 and 3 are computed and reported regardless, VOID hour included.
   **3.5-lite share (reported only, never gating):** numerator = answer-dispatch windows whose
   LAST `verbal hedge: won by` line names `gemini-3.5-flash-lite` EXACTLY (not a substring match —
   a future `gemini-3.5-flash` must not silently count); denominator = answer-dispatch windows
   containing a `won by` line at all. Read from the won-by lines only, never from the capture
   pass's recorded model or the pass record's `answerModel` field — both log the shipped default
   (3.1-lite) unconditionally under the hedge and would misname the winner. A window with no
   won-by line prints no winner ("none"), never a fallback guess.
2. **Latency, a probe-derived rule against h40b, ALWAYS computed and reported, VOID hour
   included:** in-app first-token median ≤ h40b's OWN measured value, 5.026 s + 1.0 s (6.026 s
   exactly); in-app first-token p90 ≤ h40b's OWN measured value, 13.608 s exactly (both read at
   h40b's own precision, not the 5.0 s / 13.6 s h40b's result rounds to in prose — this hour's own
   reproduction of h40b's numbers must read as a pass against h40b, not a rounding-induced fail);
   answer failures ≤ h40b's 0. **The percentile method:** the element at index
   `min(n-1, floor(n * p))` of the ascending list of first-token milliseconds — the method that
   reproduces h40b's own 5.026 s / 13.608 s exactly.
   **Answer failures**, defined per answer-dispatch window: a window with a failure line
   (`[WhatToAnswerLLM] Stream failed`, or the EXACT `verbal hedge: no answer - front empty, back
   empty`) and NO `won by` line in that same window counts as one failure. This matches what the
   code actually does: when neither leg has produced a token and either one has errored, the hedge
   throws and the pre-token redirect re-runs the pair from the top (up to four requests for one
   answer) — a redirect that goes on to succeed is not a failure, because its window ends with a
   `won by` line. When both legs simply end EMPTY (no error, no token), the hedge returns quietly,
   nothing redirects, and the user hears "Could you repeat that?" — that window has a failure line
   and no `won by`, and is charged. **A window can also contain a failure line AND a won-by line
   for a different reason: a superseded generation's hedge race keeps running in the background,
   and its stale outcome — whichever it is — is logged AFTER the line that superseded it, inside
   the NEXT window, alongside that window's own real result — or that same window's own fresh race
   can win a first token and then fail on its own stream afterward, which looks identical from
   line adjacency alone.** Such a window is resolved using that window's OWN delivered answer (its
   `[Answer] full:` line): charged as a failure when that text CONTAINS one of the app's own
   failure messages (a `[No answer — ...]` line, or the generic "Could you repeat that?" fallback),
   not charged when it is a real answer. If the window has no `[Answer] full:` line at all to
   resolve it, the window is UNRESOLVED. An unresolved window, or a first-token sample covering
   less than 90% of the answer-dispatch windows that have a `won by` line, leaves the affected
   sub-clause undecided — but INCOMPLETE only ever replaces a verdict that would otherwise have
   been a PASS. An unresolved window can only ADD to the charged-failure count later, never
   subtract from one already charged, so one or more charged failures fails rule 2 regardless of
   how any unresolved window eventually resolves; and a median or p90 measured against an ADEQUATE
   first-token sample (coverage at or above 90%) is a decided breach no matter what an unresolved
   window elsewhere in the hour turns out to be. Rule 2 reads INCOMPLETE only when no sub-clause
   has already failed on decided data and at least one is still undecided. h40b's log has neither
   failure pattern at all, so its 0 floor holds under this definition regardless. The gate's own
   10 s p90 row is reported, not gated (it failed on h40b on the stall path alone).
3. **Quality no-regression:** in-app acceptable ≥ 35 of 45 — this floor **covers all 45 roster
   items** (mains and follow-ups together), named explicitly because the exclusion in the next
   clause applies ONLY to the zero-wrong clause, not to this count. h40b's 35 carries the
   attribution bias named above (`e311019`). Zero wrong among the live in-app answers on the 40
   items that are not R02F R04F R09F R11F R13F — those five follow-ups arrive without their parent
   on every hour of this roster (diagnosed: a 120 s eviction window), their fix (`6c50ec3`) flies
   OFF here per its own failed replay, and their grades are reported beside the rule, not inside
   it. **The twin-band reading:** under the hedge, in-app answers are a mix of 3.5-lite HIGH and
   3.1-lite LOW, so h40b's per-hour twin band (built from a single model per twin) is not the
   right reference on its own. Reported PER ITEM, against the captured twin of the model that
   actually won that item (read the same way rule 1's share is — the won-by line), alongside the
   combined band for context; neither gates. No single script holds both halves of this join (the
   judge's own pairing knows which roster item each dispatch answered; the hedge-mechanics script's
   windows know which model won each dispatch) — it is joined BY HAND, in the result note, from the
   judge's pairs and the hedge-mechanics script's per-window winner labels.

**What a FAIL, VOID, or INCOMPLETE means.** (2) fails while (1) is not void: the hedge is not
faster in the app, OR it lost an answer it would not otherwise have lost — either reason alone is
enough; it does not ship, and the answer-mix quality is read for the record. (3) fails while (1) is
not void, WHATEVER (2) reads (PASS, FAIL, or INCOMPLETE): the mix hurt quality regardless of
latency, and that is still a real quality failure — understand item by item before another flight;
never tune on holdout40. (1) VOID: the hour did not mechanically exercise the hedge as built (a),
too few answer-dispatch windows ran the hedge at all — had a `front=` line (b), or hit an objective
3.5-lite outage (c) — re-fly; (2) and (3) are still read and reported for what they show, just not
as a pass/fail verdict. (2) INCOMPLETE only ever replaces a would-be PASS, never a FAIL that is
already decided: an ambiguous window had no answer text to resolve it, or too few first-token lines
survived to trust a median or a p90 against, and NOTHING else about the hour has already failed on
data solid enough to trust — the number is not yet knowable from what was captured. **An INCOMPLETE
hour cannot PASS and is re-flown before any ship decision**, mirroring the out-of-window rule
below. A charged failure, or a median/p90 breach measured against an adequate first-token sample,
decides rule 2 outright even when something else about the hour is still unresolved — INCOMPLETE
never masks a verdict that has already been earned.

**The flight window, the grader, and what a PASS licenses.** Rule 2 compares latency across hours
against h40b, which flew at 13:30 local — the comparison means little at a different time of day.
"Start" means the flight's own recorded playback start (the timeline's own start timestamp, not
the scheduled-task trigger time — the app can take up to tens of minutes to come up and be
probed-ready after the task fires, so a task armed at 14:30 can still start playback after 15:00).
Register the intended local start time to match h40b's: **13:30, on the day the user names**; if
it slips, same-day only, and after 10:00 local (the Gemini lite quota reset) with the ledger
checked (see the quota note below). **The daytime window this and every future hedge flight owes**
(the hedge probe's own pre-registration: "a daytime window is owed before any decision to ship the
hedge") is **12:00-15:00 local**; a start inside it satisfies that debt, a start outside it does
not. The hedge-mechanics script reads `timeline.startedAt`, converts it to local time (a FIXED
UTC+3 offset — Europe/Istanbul does not observe DST, so no calendar-aware lookup is needed), and
prints `playback start HH:MM local — IN WINDOW 12:00-15:00` or `OUT OF WINDOW (cannot PASS)`; this
is the one-line answer to "was this hour even eligible", read alongside rule 2's own numbers rather
than computed by hand. **Outside the window, rule 2 is reported but not gated, and the hour CANNOT
PASS** — its verdict is explicitly "no latency verdict this hour; re-fly inside the window before
this counts toward a ship decision", though rule 1 can still VOID, or rule 3 can still FAIL
(quality), and those outcomes are read normally. **A PASS inside the daytime window licenses a
separate, reviewed commit making the hedge the shipped default — nothing else**: not an automatic
flip, not a license
to skip that commit's own review. **Grader:** pinned to `claude-opus-5-5`, read from the grading
agents' own transcripts (an earlier flight's grader silently drifting from one point release to
the next cost several graded answers). If the agent alias resolves to a different model, rule 3 is
reported, not gated.

**Quota.** Per-model budget for the hour (the flight's own answer-model list, Gemini lite twins
and bares only, per "Answer arms" above):
- gemini-3.1-flash-lite ≈ 270 requests (bare 33 + low 33 + captured-minimal 44 + captured-low × 3
  at 132 = 242 fixed, plus hedge back legs and redirects, plus an automated probe's repeated pings
  while rate-limited, plus warm-ups, preflight, and a chains pass) + chains;
- gemini-3.5-flash-lite ≈ 243 requests (≈ 45 hedge fronts + captured-high × 3 at 132 + high 33 +
  bare 33) + redirects + warm-ups.
Both fit under the 500/model/day lite quota on a fresh day. **Rule: fly on a quota day with no
replay or smoke run scheduled on it, or check the day's quota ledger first** — an offline replay
pass plus a pre-hour smoke run sharing the same quota day can push 3.1-lite to roughly 400 requests
plus chains. Full Flash models (20/day) are not used by any rule or reported row (**no full-Flash
sidecar is run on h40c**; a full-Flash sidecar run anyway, for descriptive interest only, must
carry the parent on every follow-up prompt it replays, and is never gated).

**MAIN is frozen from this pre-registration's own commit (the registered HEAD named above) through
the end of the hour.** Any commit after that one, including a docs-only one, moves HEAD and makes
the guard refuse (loudly, but the day is lost) — the tree the guard checks against is pinned to
the commit registered, on purpose, and does not update itself. **Item 2 runs after this commit.
Item 1's smoke may predate it at a qualifying HEAD; its stats-script run and recorded output come
after the commit and before arming.** Neither item's own output is ever committed to MAIN — the
smoke run's own logs land in a run folder MAIN already ignores
(`electron/test/golden/interview60.runs/`), and anything else stays outside MAIN entirely.

**Blocking checklist items before arming (neither is optional follow-up).**
1. Run the pre-hour smoke (hedge on, at its probed 5000ms trigger — this is the smoke's `default`
   segment; an earlier `forced` segment in the same smoke run intentionally VOIDs by design and is
   not this one) and turn its own logs into one flight run folder — the first time the
   hedge-mechanics script meets output from the actual instrumented build, not a hand-built
   stand-in. This smoke run does not need to be at the exact registered HEAD: any HEAD whose
   `git diff --stat <smoke HEAD>..<registered HEAD> -- electron src premium package.json ':(exclude)electron/test/golden/passes'`
   is empty qualifies (the passes folder is excluded because this pre-registration and other
   records land there; the test still lists every app and harness change since 07a0e5e) (the smoke's own segment logs record which HEAD they ran at) — the app code between
   such a HEAD and the registered one is provably identical where it matters, so a smoke already
   run at a qualifying HEAD does not need to be re-run:
   - confirm the `default` segment's own debug-log copy (taken right after that segment's app
     stops) carries the startup line exactly `[Main] verbal hedge: on trigger=5000ms` — the
     `forced` segment's own copy reads `on trigger=1ms` by design, and reading that one here
     instead would silently mistime everything that follows;
   - take the window's start as the byte offset of the first `dispatch: answer` line after that
     startup line, and its end as the debug-log copy's own file size;
   - the app's separate diagnostic log is never reset between segments, so one copy of it holds
     every segment's lines end to end; bracket the `default` segment's own slice of it using the
     start instant on the `default` segment's own progress log (its second line) through the start
     instant on the NEXT segment's progress log (its second line) — if those instants cannot be
     read from the diagnostic log's own lines, the recipe cannot be carried out from this smoke
     copy and must be re-derived (a fresh smoke run, or the instants read some other way), never
     silently substituted with a weaker, pooled measurement.
   Run the hedge-mechanics script against the folder this produces and record the output before
   arming the real flight. **Pass criterion (any mismatch blocks arming):** on this same `default`
   segment —
   - the startup flag reads exactly `on trigger=5000ms`;
   - rule 1 is not VOID;
   - the hedge-mechanics script's own dispatch-window count, `won by` count, and per-model winner
     counts equal what the smoke checker counts independently for the same segment run in `default`
     mode (a healthy segment has exactly one `front=` and one `won by` per answer, and each
     answer's last `answer source:` label reads `<winner> (hedge)` — the smoke checker's own PASS
     already requires this per window; the hedge-mechanics script's dispatch/won-by/winner counts
     must agree with it, not just each read clean on its own);
   - rule 2's own verdict is not INCOMPLETE.
2. **Register the dry-run twin of the launcher as its own scheduled task, with this
   pre-registration's own commit filled in as the pinned hash, and require its launcher log to
   read `GUARD OK` before arming the real flight.** Neither the guard's newest checks (the
   git-based commit pin and working-tree check, the answer-arm-list import) nor the `.env` scan
   have ever run against MAIN directly — only against an isolated stand-in repository built for
   calibration.

**Not covered.**

- The Live ear's share (17/44 on h40a, 4/44 on h40b) is a confound, reported; one hour decides
  nothing finer than its noise (bare arms moved up to 5 of 33 between h40a and h40b); whether
  3.5-lite's larger share helps or hurts quality is what rule 3 measures and only on this roster;
  R05-type STT losses are not the hedge's.
- **A superseded answer keeps both hedge legs running until one speaks.** The hedge has no
  deadline after the back leg starts — the trigger only decides WHEN the back joins, not when
  either leg is given up on; a supersede or an 8 s hold-timeout cancels the DISPATCH (the consumer
  stops reading and the superseding generation takes over the screen), not the legs in flight —
  they keep running and their eventual result lands, stale, in the superseding window (see rule
  2's ambiguous case above). This hour does not measure whether more requests in flight under a
  superseded dispatch costs anything (rate limits, latency on the NEXT answer) — it is not this
  roster's failure mode and is not tested here.
- **A double failure re-runs the pair, but only when it involves an error.** When neither leg has
  produced a token and either one has errored, the pre-token redirect re-runs the same hedge from the
  top — up to four requests for one answer (front, back, then front and back again); this ends
  either in a delivered answer (no failure charged) or, if the redirect's own pair also fails, a
  second failure-shaped line in the same window (still one charged failure per window, not per
  line). When both legs simply end EMPTY with no error, there is no redirect at all — the hedge
  returns quietly and the user hears "Could you repeat that?"; this is the terminal case rule 2
  charges directly. Whether redirects cost quota or add latency on a bad-connectivity hour is not
  measured by holdout40's one hour.
