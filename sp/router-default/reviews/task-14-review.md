# Task 14 review: the hour reader and its calibration (Opus)

Reviewed files: `router-hour-read.mjs` (sha12 4eede4b7d97c), `router-hour-read.cal.mjs` (228c8d32bb66), `router-hour-read.cal.txt`.
The cal was re-run from a temp cwd with `RH_ROOT=live-router-d`, and it printed `CAL: 73/73 assertions passed`, `CALIBRATION OK`.
Producers were read on disk:
- live-router-a: `LiveRouterSession.ts` and `GeminiLiveRouter.ts`;
- live-router-b: `routerArbiter.ts`, with fix3 present (L356-381, now 4878ad8);
- live-router-d: `routerCapture.mjs` (fa3aada);
- live-router: `main.ts` `logToFile`, `routerDiag.ts` and `SessionTracker.ts:252`.

**SPEC: FAIL  QUALITY: CHANGES**

SPEC fails on one point. The ledger ruling (progress.md l.39) says "Task 14 reader consumes the superseded diag line". The reader does not consume it yet, and its present superseded check turns a legitimate supersede into an integrity MISMATCH. Every bullet of the brief's own Step 1 and Step 2 is present, and both named mutations are caught.

## Producer formats checked against the reader

| Line | Producer | Reader | OK |
|--|--|--|--|
| `<ISO> [LOG] <msg>` | main.ts:63 + console override; real log `2026-10-06T00:01:59.499Z [LOG] [Main] …` | L78 | yes |
| `=== Natively session started <ISO> ===` | main.ts:3436 | L75 | yes (one per file, see I4) |
| `[Router] dispatch turn= at= q_at= q_src= router= ear=` | arbiter L98 | L93 kv | yes |
| decision `… shown=live\|pipeline … q_at= sent= superseded=yes\|no` | arbiter L443 | L98-102 | yes |
| dup/unpaired `turn=- … shown=- …` (no sent/superseded) | arbiter L196 | L102 extraLines | yes |
| `[RouterAnswer] {json …, superseded}` | arbiter L399 | L123 | yes |
| `[Router] superseded turn= phase=streaming\|done line_written=yes\|no` | arbiter L363 (fix3) | **not parsed** | **B1** |
| `[Router] end dropped turn= …` | arbiter L386 | ignored | correct |
| `[Router] session up setup_ms=` | LiveRouterSession L139 | L111 | yes |
| `[Router] session close gen= code= reason= stale= quota=` (incl. goAway L143, stale=no) | L143, L175 | L107 | yes |
| `[Router] session reconnect attempt= reason=quota backoff …` / `reason=<r>` | L182, L196, L202 | L114 | yes |
| `[Router] session connect …`, `session refused reason=…` | L107, L61-62 | L112-113 | yes |
| `[Router] session failed reason= dispatches_before=` | no producer yet (plan L1559, Task 10) | L103 strict `$` | see I1 |
| `[Router] ear failover from= to= reason= dispatches_before=` | no producer yet (plan L1599, Task 11) | L105 strict | see I1 |
| `[LiveRouter] close gen= code= reason= stale=` | GeminiLiveRouter L515 | L115 | yes |
| `[LiveRouter] quota close #`, `reconnecting (attempt` | L523, L569 | L117-118 | yes |
| `[Main] Live Mode status: <state>` | main.ts:2207 | L119 | yes |
| `[Answer] full: <JSON string>` | SessionTracker.ts:252 (via addHistory) | L120 | yes |

Two facts about `[Answer] full:` decide what the pipeline Safety scan covers. It is written by `addAssistantMessage`, which the arbiter reaches only through `deps.addHistory`:
- **Covered:** pipeline-shown turns, appended text, Live text (finishLive and append), and the replacing pipeline text after a supersede, because the turn is in `mode=pipeline` and the history goes out.
- **Not covered:** hidden shadows, which are held and never added. The report's claim holds.
- **Residual:** this rests on Task 10 wiring `addHistory` to `addAssistantMessage`. It needs re-checking at the merge.

## Findings

### B1 BLOCKING: fix3's diag line is not consumed; legitimate supersedes read MISMATCH or are invisible
**Where:** `router-hour-read.mjs:101, 210-212, 229, 233, 270`; cal L234-242.
**Rests on:** ledger l.39, fix3 4878ad8 and the coordinator's two notes.

Since fix3, a live capture written before the supersede still reads `superseded:false`, and only the diag line is authoritative. The three cases:

| Diag line | What the log holds | What the reader does today |
|--|--|--|
| `phase=streaming` (always `line_written=no`) | line `superseded=yes`; live capture `true` (written after the flag); shadow or appended capture `true` | Correct. |
| `phase=done line_written=no` | line `superseded=yes`; live capture `false` (written at finishLive or append); shadow or appended `false` if the pipeline had ended, else `true` | L229 counts `supDisagree`, L233 gives `CAPTURES check: MISMATCH`, integrity fails, and the verdict reads "INCONCLUSIVE-leaning". This is a false non-PASS, and the likely case: Live ends in 1-3 s and the whole-turn supersede comes later. |
| `phase=done line_written=yes` | line `superseded=no`; all captures `false`; the replacing text is shown, but only `[Answer] full:` holds it | The supersede is invisible. `superseded_turns` undercounts, and 14A and the grader get no signal. |

A second supersede of the same turn writes a second diag line, and the second always reads `phase=done`.

**Required changes to the reader:**
1. **Parse** `^\[Router\] superseded turn=(\d+) phase=(streaming|done) line_written=(yes|no)\b` and tolerate trailing fields. Keep it in `supDiag: Map<turn, {phase, lineWritten, n}>`:
   - keep the **first** line's phase and line_written;
   - count the extra lines (`n`) apart;
   - do not count them as turns.
   - **Shape check:** any `[Router] superseded` line that does not match this shape counts as unparsed, and the reader refuses with exit 2 (rule 11).
2. **`superseded_turns`** = distinct in-hour turns with a diag line, mapped through `decByTurn` and `hourTurns`. Print it split by `phase=streaming|done` and `line_written=yes|no`, plus `superseded_extra_lines=<n>`. The decision-line flag is no longer the count.
3. **Replace the agreement rule at L229.** Disagreement is a defect only when:
   - (a) a decision line reads `superseded=yes` or a capture reads `superseded:true` and the turn has **no** diag line;
   - (b) a diag line has `phase=streaming` and the decision line is not `yes` or the live capture is not `true`;
   - (c) a diag line has `line_written=no` and the decision line is not `superseded=yes`;
   - (d) a diag line has `line_written=yes` and the decision line does not read `superseded=no`.

   For `phase=done`, the live capture and a capture written before the supersede may read `false` and are **not** disagreements. Print the defect count as `superseded_record_defects=<n>` in place of `superseded_flag_disagreements` inside `capOk`.
4. **Orphans:** a diag line whose turn has no `shown=live` decision line counts as `superseded_orphan`, and it fails `capOk`. The producer emits the line only when `decision.shown==='live'`.
5. **The Fallback exemption at L270** (`d.superseded !== true`): base it on `supDiag.get(turn)?.phase === 'streaming'`. Only a streaming supersede leaves partial Live text, while a `phase=done` Live text was complete and is still checked.
6. **Pending-mode supersedes:** state in the output that the producer never logs them (decision null, arbiter L361), so they are not counted, as ruled.
7. **The `WARNING pre-fix log` line:** extend it with "no `[Router] superseded` lines while `superseded=yes` lines exist", which is (a) above.
8. **Cal:**
   - replace L242's "flag on the line and on the capture must agree" with the four cases (a)-(d);
   - add scenes for `phase=done line_written=no` (live `false`, line `yes`, giving MATCH), `phase=done line_written=yes` (line `no`, giving MATCH, counted, `line_written=yes` 1) and a doubled diag line (giving `superseded_turns=1 superseded_extra_lines=1`);
   - add a mutant that drops the diag-line parse, which must be caught.

**Carry to 14A and Task 19:** turns with `line_written=yes` show replacing pipeline text that is in no RouterAnswer capture. 14A must take the superseded set from the diag line, not from the capture flags.

### I1 IMPORTANT: VOID trigger 1 can be missed silently
**Where:** `router-hour-read.mjs:103` (and L105 for the ear failover).
**Rests on:** spec §11 and rule 11.

The regex is anchored `reason=(.*) dispatches_before=(\d+)$`, and a line that does not match is dropped without a trace. The producer writes `reason=${e.reason}` (plan L1559), and the reason is a raw close or `err.message` (LiveRouterSession L129, L173). A multi-line error message splits the line, a trailing field breaks the `$`, and either way the VOID is missed with nothing printed.

**Change:**
- Match `^\[Router\] session failed\b`, then take `dispatches_before` from the last `dispatches_before=(\d+)` on that line.
- If it is absent, look ahead to the next line that starts with a timestamp. If it is still absent, refuse with exit 2 and a message naming the line's timestamp. Do not skip it.
- Do the same for `ear failover`.
- Calibrate with a reason that holds a newline and with a trailing field.

### I2 IMPORTANT: "dispatched with nothing shown" cannot see a turn that showed only a label
**Where:** `router-hour-read.mjs:200-202, 272`.
**Rests on:** spec §10.2 Fallback, "0 dispatched turns with nothing shown".

`sent` counts every `emit` (arbiter L449), and that includes `ch:'source'` events. A row 1-4 turn whose pipeline failed before its first token releases its held source, so it reads `sent>=1` and the bar reads PASS while no answer text was ever shown.

The reader can see this case. A `shown=pipeline` decision with `shadow=-` means the pipeline never produced a token, because `pipeFirstAt` stays null and fix3 resets it for the replacing stream.

**Change:**
- Report `shown=pipeline with no pipeline token (shadow=-)` beside `sent=0`.
- Count it in Fallback, or get a ruling if cue-only answers make `shadow=-` legitimate.
- Calibrate it.

### I3 IMPORTANT: the Speed p50 is the lower middle for an even n
**Where:** `router-hour-read.mjs:39, 275`.
**Rests on:** spec §10.2 Speed (p50 ≤ 2500).

The reader uses nearest-rank `ceil(0.5n)`. With n=20, the 10th value is 2500 and the 11th is 3000, so it reads PASS while the conventional median is 2750. The spec does not define the percentile.

**Change:**
- Either register "nearest-rank, lower middle" explicitly (Task 19), or use the conventional median (the mean of the two middle values) or the upper middle for the bar.
- Pin the even-n case in the cal; it currently asserts the lenient reading.

### I4 IMPORTANT: a log that does not start at or before the hour is read as if it did
**Where:** `router-hour-read.mjs:73-75, 173-174`.
**Rests on:** spec §11 (VOID on down time) and rule 11.

Two producer facts:
- `main.ts:3436` rotates the log on every app start.
- `main.ts:55` rotates it at 10 MB. Mid-file this leaves a log with no header.

After an app restart inside the hour, or a size rotation, the run folder's log holds only the tail. The reader then:
- finds no header at or before `startedMs`;
- reads `start_state=unknown(assumed down)`;
- counts down time from t0 to the first `session up` of the tail;
- loses every decision before it.

That can VOID a run whose router was up, or mark items "no decision" and FAIL Routing.

Real hour logs are about 0.85 MB, so size rotation is unlikely. A restart is the realistic path.

**Change:** refuse with exit 2 when the log's first line is not a session header with a timestamp at or before `startedMs`, and say "log does not cover the hour (rotation or restart)". Keep `assumed down` only for a header-covered log in which the router never came up.

### M1 MINOR: duplicates are printed but never fail anything
**Where:** `router-hour-read.mjs:138-139, 203, 248`.

`duplicate decision lines`, `duplicate dispatch lines` and `decision lines without a dispatch line` are printed, but they are not in `integrityOk`. Duplicate decision lines stay in `inHour`, so they double-count in DECISION cells, SPEED and `perItem`. They cannot happen by construction in one app session, so any non-zero value is a defect.

**Change:** add all three to `integrityOk`.

### M2 MINOR: lines dropped without a count
**Where:** `router-hour-read.mjs:100, 135`.

A `[Router] turn=` line that lacks `route`, `reason` or `shown` is dropped silently. A decision with a missing or malformed `q_at` falls into `decisions_outside_hour` without a separate count.

**Change:** count `unparsed_decision_lines` and `decisions_without_q_at`, and fail integrity on either.

### M3 MINOR: an after-hour decision maps differently in the files and in the reader
**Where:** `router-hour-read.mjs:66` against `routerCapture.mjs:74-77`.

The harness's `idFor` has no `endedMs` upper bound, while the reader's `itemFor` returns null after `endedMs`. A decision with `q_at > endedMs` is in the file under the last item but outside the hour for the reader, which gives `CAPTURE FILES: MISMATCH`.

This is low probability because live40 keeps a 20 s gap after the last item.

**Change:** align the two, or count such entries apart.

### M4 MINOR: tallies cover the whole session
**Where:** `router-hour-read.mjs:111-119, 188-194`.

The tallies count the whole app session (probe included), not the hour. They are labelled CUTTABLE, but the output should say "session, not hour".

## Rulings honoured
- **EASY caught:** the first decision by `q_at` is `shown=live`; any-decision is printed as info only.
- **`--down-limit-min`:** mandatory (exit 2).
- **Lost live capture:** a defect (`lost_live_captures`, MISMATCH, and a mutant pins it).
- **HARD misrouted:** counted on any decision, with M2 reasons excluded.
- **Stale closes:** they do not add down time.
- **Reconnects:** quota reconnects are counted by `reason=quota`.
- **Pipeline markers:** uppercase-only.

## Bars that cannot read PASS with their effect present (checked)
- **Safety text half:** all four counts, with markers distinguished between live and pipeline, and live text also present in `[Answer] full:`.
- **Routing:** the 13 and 1 thresholds and the M2 exclusions.
- **Fallback:** the missing appended capture and a row 4 turn with a live capture.
- **VOID trigger 2:** the clip and the goAway pair.

The exceptions are the ones listed above: I1, I2, I3 and I4.

## Not checked
- **No real run folder:** the format checks are by reading code.
- **Producers not built yet:** `session failed`, `ear failover` and the Task 10 `addHistory` wiring do not exist yet.
- **Captures under fix3:** checked by reading arbiter L356-381 and L409-419, not by running lane B's tests.

## Re-review (fix round 2: reader 9d0da3453bd4, cal a98c74c42876)

**Verdict: SPEC: PASS  QUALITY: APPROVE.** All findings are resolved. One MINOR and one carry remain open.

- **Cal:** a plain run from a temp cwd (`RH_ROOT=live-router-d`) printed `CAL: 109/109 assertions passed`, `CALIBRATION OK`.
- **Mutations:** not re-run, as instructed. The full record will be `router-hour-read.cal.final.txt`. `cal.txt` is a072ef9-era and predates the Task 11 scene.

### Findings

| Finding | Status | Where | Evidence |
|--|--|--|--|
| B1 | fixed | L103, L108-111, L244-279, L316 | Parses `superseded turn= phase=(streaming\|done) line_written=(yes\|no)\b`. The first line per turn wins and the extras go to `superseded_extra_lines`. An unknown shape exits 2. Turns are counted from the diag line, split by phase and line_written. Defects (a)-(d) are implemented exactly as specified, and `phase=done` with a false live capture is not a defect. `superseded_orphan` fails `capOk`. The Fallback exemption applies to `phase=streaming` only, and pending-mode supersedes are stated as not logged. Cal L241-263 has a scene for each case. |
| I1 | fixed | L84-92, L127-131 | Matches on `\b`. Takes the last `dispatches_before` on the line plus its continuation lines, and exits 2 if absent. Cal scenes cover a newline in the reason, a trailing field and an absent value. |
| I2 | fixed | L227-231, L294, L318 | `shown=pipeline` with `shadow=-` counts as "nothing shown" and fails both Fallback and integrity. Residual, stated in the report: a cue-only pipeline answer would read as no-token, and none is expected on live40. |
| I3 | fixed | L41, L180, L321 | p50 is the conventional median and p90 stays nearest-rank. The cal pins n=14: 2500 and 3000 in the middle give 2750, FAIL; 2000 and 2900 give 2450, PASS. |
| I4 | fixed | L78-81 | Exits 2 when no header is at or before `startedMs`, and when a header falls inside the hour. The cal covers both cases plus the control. |
| M1 | fixed | L123, L235 | A repeated decision line is counted once. Duplicate decision lines, duplicate dispatch lines and decisions without a dispatch line all fail integrity. |
| M2 | fixed | L119, L122, L234 | `unparsed_decision_lines` and `decisions_without_q_at` are printed and fail integrity. |
| M3 | fixed | L68 | No upper bound, the same as `routerCapture.mjs` `idFor`. The cal cross-runs `buildCaptureFiles`. |
| M4 | fixed | L211-218 | Every tally line is labelled SESSION-WIDE. |

### Task 10/11 lines on `live-router` (read on disk)

| Line | Source | Reader handling |
|--|--|--|
| `[Router] session failed reason=${reason} dispatches_before=${n}` | `routerWiring.ts:59` | Matches L127. |
| `[Router] ear failover from=3.1 to=2.5 reason=… dispatches_before=${n}` | `main.ts:2245` | Matches L130. |
| `[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=<id>` | `main.ts:2235`, written only when `NATIVELY_LIVE_MODEL` is set and the router is on | Correctly not counted as a failover. Before fix2 it would have exited 2. Cal L295-297. |
| `[Router] ear model=…`, `ear model id not recognised`, `[Router] flag …` | `routerWiring.ts:66-67`, `main.ts:2508` | Ignored, which is harmless. |
| `[Answer] full:` | `addHistory` (`main.ts:2504`) → `IntelligenceManager.addAssistantMessage` → `SessionTracker:252` | The earlier residual is confirmed. |

### Open

- **MINOR, doc only:** `router-hour-read.mjs:12`. The header comment still says "for an even n, p50 is the lower middle value". Since I3 that is false. Fix the comment so the Task 19 registration does not copy the wrong method.
- **Carry to Task 13/18, not Task 14:** `routerCapture.mjs:50` preflight. It matches `/\[Router\] ear failover\b/`, which also matches `ear failover disabled`, so any run with `NATIVELY_LIVE_MODEL` set fails the "no ear failover" gate. Either the registration guarantees `NATIVELY_LIVE_MODEL` is unset (which is also what Task 13's `ear on gemini-3.1…` row requires), or the gate needs `from=`.
- **Carry to 14A and Task 19, unchanged:** on a `line_written=yes` supersede, the replacing pipeline text is only in `[Answer] full:`. Take the superseded set from the diag line.
- **Not shown:** no real run folder exists yet. The format checks are by reading code at the on-disk state of `live-router`, which the coordinator names as 143d8df. I could not verify the commit with git from this session.

SPEC: PASS  QUALITY: APPROVE
