# Task 18 review: quota ledger and flight tools (Opus task reviewer)

Reviewed: `SP\quota-ledger-today.mjs` (edited), `LAB\flight\` (gen-launchers-rd.mjs, launch-rd-src.txt, guard-rd.mjs,
guard-rd-git.mjs, rd-proofs.mjs, rd-sha-lines.mjs, rd-precheck.ps1, register-rd.ps1, write-arming-rd.mjs) and their
calibration outputs, against PLAN Task 18 (1904-1952), SPEC §10, §10.1, §2, the controller rulings (T = fallback
2026-10-07 ~23:00, window 22:30-03:00; run label router-default-r1; arms high,low,captured-high), and the flight-eq
sources (`SP\flight-eq\launch-eq-src.txt`, `guard-eq.mjs`, `guard-eq-git.mjs`, `eq-precheck.ps1`, `register-eq.ps1`,
`write-arming.mjs`). Nothing registered, started or modified; no key read.

**SPEC: PASS  QUALITY: CHANGES**

Every brief item is present: ledger sources + known-answer cal; launcher with the commit check, sha lines, wav:check
under live40, guard `--require-precheck`, the `router-default-r1` flight call and before/after router dist shas; guard
checks kept and r1-r7 added; precheck/register re-pointed with both windows; write-arming with `--t`, the T-10 refusal
and the gate pattern proven on two known answers. The blocker is not a missing item: r7's input does not measure what
spec §10.1 gates on.

## Findings

### B1 BLOCKING: r7 and write-arming read "used" as log LINES, about 9x the real request count, so a smoke on the run's quota day makes both refuse a day with ~460 real headroom
- Where: `SP\quota-ledger-today.mjs:41-42,73-74` (used = every lite-model mention in the log), consumed by
  `guard-rd.mjs:335-352` and `write-arming-rd.mjs:76-84`.
- Rests on: spec §10.1 (the gate compares headroom with a need in REQUESTS: 149 / 60, ≥ 224 / ≥ 90) and plan l.170-171
  ("a slip ... only moves the smoke later in the day"; checkpoint 3 allows a second smoke).
- Evidence (a read-only ledger run on MAIN's current log, which holds exactly the flight-eq hour's app session,
  00:01-01:12Z on 2026-10-06): `node quota-ledger-today.mjs --now 2026-10-06T06:59:00Z` printed
  `LEDGER-SUMMARY ... used35=394 used31=131 headroom35=106 headroom31=369`.
  - Spec §10.1 counts that hour at 42 3.5-lite fronts and 11 3.1-lite back starts.
  - Line shapes naming 3.5-lite in that log: 272 `usage:` lines, 42 `verbal hedge: front=`, 39 `answer source`,
    39 `won by`, 2 warm-up. That is about 9.4 lines per request.
  - The `verbal hedge: front=... back=gemini-3.1-flash-lite` line names 3.1-lite on every run, even when the back leg
    never starts.
- Consequence:
  - A ~33-item smoke on the 2026-10-07 quota day logs about 300+ 3.5-lite lines, so headroom35 comes out near 170-200.
  - write-arming then refuses (it needs ≥ 224), and so do the dry twin's r7 and the flight's r7.
  - The hour is lost on a day whose true 3.5-lite use is about 40 of 500.
  - It does not trigger only if every smoke line is stamped before 2026-10-07T07:00Z.
- Calibration gap:
  - guard-rd-cal's L-a..L-k use stub ledgers.
  - quota-ledger-cal's S1 uses a handful of synthetic lines.
  - Neither ever counted a real hour's log, so the 9x factor went unseen.
- Fix:
  - Count one line per request SENT. Candidates: the `verbal hedge: front=` line for the 3.5-lite front, a real
    back-start line for 3.1-lite, and warm-ups plus any non-hedge stall-fallback start.
  - Calibrate on the flight-eq hour as the known answer (42 / 11 per spec §10.1).
  - Copy MAIN's `natively_debug.log` NOW as that fixture: the next app start rotates it to `.1`, and the start after
    that deletes it (`main.ts:3430-3436`).
  - Alternatively, take a controller ruling on the bound and state it in the registration.
  - Either way, re-run guard-rd-cal and write-arming-rd-cal.

### I1 IMPORTANT: the ledger never reads `natively_debug.log.1`, and every app start rotates the log, so the count can also UNDER-read (a false pass)
- Where: `quota-ledger-today.mjs:34`. Its comment at l.70-72 says "a false refusal is possible, a false pass is not".
  That claim is false.
- Evidence: `electron/main.ts:3430-3436`. Every app session start renames `natively_debug.log` to `.log.1`, deleting
  the previous `.1`. The 10 MB rotation at `main.ts:41-58` does the same.
- Consequence:
  - With one app start in MAIN between the smoke and arming, the smoke's lines sit in `.1`, unread.
  - With two starts, they are gone.
  - Script-run arms and benches never reach any app log (the header admits this).
- Fix: read `.log.1` too, in all three locations, and print the oldest stamp covered. If that stamp is after the reset,
  part of the quota day is unseen: say so in LEDGER-SUMMARY and refuse in r7.

### M1 MINOR: the after-run sha search in rd-proofs.mjs is not bounded at the after banner
- Where: `rd-proofs.mjs:62-64` takes the first `RD PROOFS <rel>.js sha256` match after the LAST `DIST BEFORE` banner.
- The vacuous path:
  - In the launcher, PROOFS2's own stdout is appended to that same log before step 4 reads it (Node writes to a file
    synchronously).
  - So if the before section ever lacked a file's line, the after line would be compared with itself and pass.
- Not reachable today, because PROOFS1 failing exits 3.
- Calibration gap: H7-H11 ran with stdout captured rather than appended to the log, so the real shape was never
  exercised.
- Fix: slice up to `=== DIST AFTER THE RUN ===`, and add one cal case with the proofs' stdout appended to the log.

### M2 MINOR: write-arming's `--seal` is never checked against the committed registration
- Where: `write-arming-rd.mjs:54-55,75`. It only requires that the body quotes whatever hex the caller passed. eq
  hard-coded the reviewed seal.
- Fix: compute `git show HEAD:electron/test/golden/passes/PREREGISTER-router-default.md` in MAIN and require it to
  equal `--seal`. rd-sha-lines prints the same sha at T.

### M3 MINOR: the "fresh" ledger read in the arming body is checked by quota day only, not by age
- Where: `write-arming-rd.mjs:78-81`. A read from 10:05 passes at 22:40.
- Mitigated: r7 re-reads the ledger at T-6 (dry twin) and at T.
- Fix: put the ledger's `now` into LEDGER-SUMMARY and refuse a read older than, say, 30 min.

### M4 MINOR: the comment on USAGE is wrong
- Where: `quota-ledger-today.mjs:29`.
- `usage:` is not one line per finished request: it shows 272 lines for 42 hedge runs.
- It is informational only, but it should not be offered as the "tighter" figure.

### M5 MINOR (carry): the mtime checks refuse a build older than its source
- Where: r2 (main.ts), r3 and check 9.
- A checkout or commit that touches a source after the last build makes the guard refuse at T, even though the
  flight would rebuild.
- The arming steps must state: build after the final HEAD is in place, then run the dry twin.

### Carry, not a defect of this task
- Spec §10's T-6 router-session gates are not in the precheck. They moved into auto()'s preflight (plan l.1650),
  and the registration must state the split.
- The arming body must hold a LEDGER-SUMMARY line: an addition the spec justifies (§10.1).
- register-rd refuses the real label until `electron\services\routerArbiter.ts` is in MAIN.
- r1, r2, r3 and r5 are proven only on stub trees.
- What I verified on real files:
  - live-router-a's built `LiveRouterSession.js` carries all four r3 needles.
  - live-router-d's harness exports `selectArms` and `PAIRED_ARMS` with the `low`, `captured-high` and HIGH arms.
  - `.gitignore` covers live40.wav and the live40 tts folders.

## Checked and correct
- **Env (launcher):**
  - rd sets or clears every name eq sets or clears, except NATIVELY_EQ_T. The diff of the `set` names leaves only
    `EQ_T` on eq's side.
  - rd adds NATIVELY_LIVE_ROUTER=1, NATIVELY_FLIGHT_ARMS=high,low,captured-high, NATIVELY_RD_T and
    NATIVELY_ROUTER_CONTEXT_SHA12.
  - It moves NATIVELY_EARLIER_QUESTION to cleared and NATIVELY_SCENARIOS to cleared.
  - I60_PROBE_DEADLINE_MIN is set from a value the generator validates (1-240).
  - Every NATIVELY_*/I60_* name in the live-router worktrees' code is handled, apart from three EQ parity test names.
- **Placeholders:** the launcher's own check catches only the commit. The guard catches T (g4) and ctx (r6).
  `register-rd.ps1` refuses any `@@` left in the launcher, so the deadline placeholder cannot fly.
- **r7 math:**
  - NEED 149/60 × 1.5, rounded up, gives 224 and 90, inclusive at both edges (cal L-a..L-d). cap = 500.
  - The quota-day boundary is `midnight+7h <= now`, so 07:00:00Z belongs to the new day (K1-K6, plus mutants X1-X3).
  - The guard derives the reset from its own clock and refuses a stale ledger (L-f).
  - For T 23:00 TST (20:00Z), the run, the arms and the 03:00 window end all fall in the 2026-10-07T07:00Z day.
- **Windows:** the guard g4, the generator, register-rd and write-arming all use 07:30-08:30 and 22:30-03:00 on
  2026-10-07/08, inclusive (G4a-s).
- **Timing chain:** the precheck runs at At = T-6 against a flight task at At+6. The arming stamp must be ≤ At-4 =
  T-10, matching write-arming's refusal. Guard g5 requires the stamp in [T-10, now] and now ≤ T+10.
- **Unchanged copies:**
  - night-gates.ps1 is used unchanged (sha 5e6cd2ac...).
  - guard-rd-git.mjs differs from eq's only in its header.
  - rd-precheck.ps1 and register-rd.ps1 differ from eq's only by the re-pointing: the label, the paths, the two
    windows, and a router-build file check in place of eq's earlier-question one.
- **Deviations:** r2 mtime, r4 strict, r5 FOCUSED=off (in place of g3; for live40 the harness's focusedFor already
  honours `off`), the arming `--seal` and the LEDGER-SUMMARY requirement. All are stricter, or justified by the spec.
- **r6:** the context sha needs a hex boundary on its right (P8). No left boundary is needed, because the sha follows
  the `context_sha12=` text.

## Not shown
- No real log of a router run exists yet, so B1's ratio is measured on the eq hour's pipeline (the same pipeline the
  router run keeps), not on a router-default log.
- I did not run any cal, the dry twin, or the launcher through PROOFS2.
- I did not verify which log line marks a 3.1-lite back-leg start.

## Re-review (fix round 1)

**Verdict: SPEC: PASS  QUALITY: APPROVE.** B1, I1 and M1-M4 are fixed. Three new MINOR items follow; none blocks the flight.

I read the fix1 report, `SP\quota-ledger-today.mjs`, the r7 changes in `guard-rd.mjs`, `write-arming-rd.mjs`, `rd-proofs.mjs`, the
launcher source and the generator, and every calibration output. I checked the markers against MAIN `electron\LLMHelper.ts` and
`electron\llm\WhatToAnswerLLM.ts` and the `@google/genai` 1.44.0 SDK. I ran the fixed ledger read-only, printing counts only.
I printed no line of any log.

### B1 (per-request markers): RESOLVED

**Front leg, 1:1.** `streamGeminiWithHedge` (LLMHelper.ts:3480) logs `verbal hedge: front=<FRONT> back=<BACK> trigger=` exactly once.
It then calls `start(FRONT)` once (3507).

**Back leg, 1:1.** `verbal hedge: back started at` (3519) is logged exactly once, immediately before `start(BACK)` (3520), on every path
that starts the back leg. No path starts the back leg without it. The ledger charges each back start to the `back=` model of the
preceding front line, sorting by stamp. That is correct, because BACK is always `GEMINI_FLASH_MODEL` (3.1-lite).

**Warm-ups and heartbeat, 1:1.** `warmupGeminiFlash` (3550-3569) sends one `generateContent` per model and logs either
`<model> warmed up in` or `<model> warmup failed`, never both. The heartbeat (3675-3676) goes through it.
- `MARK_WARM` requires a lite model name, so the gemma and llama warm-ups and `<model> vision warmed up` are correctly excluded.
- Cross-check on the eq log: 8 `Warming up gemini` lines, against 1 warm-up result on 3.5-lite and 7 on 3.1-lite.

**No hidden retries.**
- `streamWithGeminiModel` has no retry loop. Its only early exit, `stop?.throwIfAborted()`, can over-count by one: the safe direction.
- The SDK retries only when `httpOptions.retryOptions` is set (`index.mjs` 12504-12507), and the app never sets it.
- `withRetry` wraps only the paths listed in the next section, not the hedge or the warm-ups.

**Reroutes in the flight's configuration (hedge ON, Gemini selection).** Every way into the lite models re-enters the hedge, so each
request is marked:
- the behavioural fast path (`streamVerbalWithGeminiFlash`);
- the verbal-technical route (`streamChat` → `carriesSpokenBudget` → `streamGeminiWithStallFallback`, LLMHelper.ts:2723-2732);
- the pre-token redirect (WhatToAnswerLLM.ts:415-430, back through `streamVerbalWithGeminiFlash` with a lite primary).

**Calibration.**
- On the preserved eq logs, the counts match spec §10.1's 42 front starts and 11 back starts (E0, E1: 43 / 18 with warm-ups).
- The old line-counting rule is a caught mutant (X4: 394 / 131).
- Mutants X5-X7 drop one marker kind each, and each is caught.
- The real ledger's summary line parses under the guard's r7 regex. Today's read: `used35=0 used31=0 extra=0 complete=yes`.

### I1 (`.log.1` and `--extra-requests`): RESOLVED

**Rotation.** All three locations now read `.log` and `.log.1`.
- `complete=no` means a location has lines in the quota day but no file older than the reset. That is the correct test, because the
  deleted generation can only have held earlier lines. It is calibrated by C1-C4 and mutants X8/X9.
- r7 refuses `complete=no` (L-s) and `oldest=none` (L-t). write-arming refuses both too.

**Script calls.** `NATIVELY_RD_EXTRA_REQUESTS` covers the requests scripts make.
- The generator validates it (`^\d{1,4}$`) and fills a placeholder that `register-rd.ps1` refuses (its `@@` check).
- The guard refuses it unset, malformed, negative or with a trailing space (L-m..L-q), and accepts 0 (L-r).
- The guard checks that the ledger actually added it (L-u).
- It is charged to both models, the conservative direction.
- The false comment ("a false pass is not possible") is gone, and the summary now states plainly what it cannot see.

### M1-M4: RESOLVED

- **M1.** `rd-proofs.mjs` bounds the before-run search at the `DIST AFTER` banner.
  - H11c exercises the real appended shape.
  - H11b checks that a before-section missing a line is refused.
  - H11d is the unbounded mutant passing H11b's input: caught.
- **M2.** `--seal` must equal the sha256 of `git show HEAD:electron/test/golden/passes/PREREGISTER-router-default.md`. These are the same
  bytes `rd-sha-lines` hashes at T.
- **M3.** The body's ledger read must be no more than 30 minutes old, must not be dated in the future, and must carry `extra=<n>` and
  `complete=yes`.
- **M4.** The comment on `usage:` is corrected.

### New findings, all MINOR

**N1 MINOR. Some lite-model requests in the flight have no marker, and the ledger comment names only part of them.**
Where: `quota-ledger-today.mjs:11` names only "typed chat, a hedge-off stall race". Unmarked paths that can send to 3.1-lite in this
configuration:
- **CODING intent:** WhatToAnswerLLM.ts:288 → `streamChat` → LLMHelper.ts:2736, a plain `streamWithGeminiModel(activeModelId)`.
- **Structured generation:** `generateContentStructured`'s 3.1-lite fallback after 3.1-pro (LLMHelper.ts:1422-1440, with `withRetry`).
  It is reached through company research (`needsCompanyResearch`, once per uncached company) and the negotiation path.
- **Meeting summary:** the Gemini fallback (4387+, up to 3 attempts), which runs only after Groq fails.
- **Other:** Gemma tier-2 (3225) and the Groq mode-specific fallback (4157), both off the configured path.

Size of the gap:
- In the eq hour, all 42 routes were VERBAL-TECHNICAL (the run folder's `verbal-diag.log`), and the log shows 0 summary, structured,
  coding, Gemma or Groq-fallback lines.
- live40 has 0 salary/negotiation items.
- Against the 3.1-lite bar (≥ 90 of 500), only hundreds of such calls could flip r7.

Fix: name these paths in the ledger comment and in the registration. Optionally, take the CODING-route count from `verbal-diag.log`'s
`route: CODING`.

**N2 MINOR. `complete=no` has no escape hatch.** Three or more app sessions in one location on the run's quota day before T would make
r7 and write-arming refuse the flight, even when the extra term could account for them.
- Example: a smoke after 10:00 TST plus two retries.
- Recovery is possible, because the harness copies `natively_debug.log` into each run folder.
- Fix: the arming steps should say so. Alternatively, record the rule "at most two app sessions per location in the quota day before T".
- Running the smoke from a worktree with no older log generation would also read `complete=no`. The carry "smoke from MAIN" stands.

**N3 MINOR. write-arming does not check that the body's `extra=<n>` equals the launcher's `NATIVELY_RD_EXTRA_REQUESTS`.** r7 re-reads the
ledger with the launcher's value at T−6 and at T, so the gate itself holds. Only the arming record could disagree with the launcher.

### Not shown

- Spec §10.1 confirms only the hedge counts as ground truth (42 / 11). The warm-up count (1 / 7) is my own cross-check
  (`Warming up gemini` = 8), not a provider-side count.
- No provider-side quota read exists.
- The guard's r7 is calibrated on stub ledgers. The real ledger is calibrated separately; the two meet only in the format check above.

SPEC: PASS  QUALITY: APPROVE

## fix2 review (T derived from the clock; user ruling 2026-10-07 00:48)

**Verdict: SPEC: PASS  QUALITY: CHANGES** (one IMPORTANT, three MINOR).

I read the fix2 report, the current `gen-launchers-rd.mjs`, `register-rd.ps1`, `write-arming-rd.mjs` and `guard-rd.mjs`, and
their calibration outputs. I also spot-checked the edges by running the CURRENT generator and write-arming with `--now`, with
`--out` pointing into my scratchpad. I registered nothing.

### The rules are applied consistently

| rule | generator | register-rd (label rd) | write-arming | guard |
|--|--|--|--|--|
| format and real calendar time, read as +03:00 | `tInstant` | `TryParseExact`, then −3 h to UTC for the quota math | `instant` | `parseT` |
| T + 75 min stays inside one quota day, `floor((ms − 7h) / 1 day)` | yes, as validity; a T kept in the file is checked against this only | yes, also for `-Which verify` | yes | no (by design) |
| T ≥ now + 15 min, inclusive | yes, for a `--t` given now | yes, except `verify`; plus eq's T−6-in-the-future check | no: T−10 instead | n/a |
| T ≤ now + 24 h, inclusive | yes | yes, except `verify` | yes | n/a |
| start inside [T−6, T+30], inclusive to the second | n/a | n/a | n/a | g4 |
| arming done by T−10 | n/a | n/a | yes | g5: stamp ≥ T−10, now ≤ T+10 |

- **Time zones are right.** TST is a fixed +03:00 (Turkey has no DST). The reset is 07:00Z = 10:00 TST. The quota-day index makes
  07:00:00Z the first instant of the new day.
- **The quota edges hold in all three tools** (my spot checks, plus the cals):
  - T 08:44 is accepted: its run ends 06:59Z.
  - T 08:45 is refused: its run ends 07:00Z, in the next day.
  - T 09:59 is refused, and T 10:00 is accepted.
- **The lead and horizon edges hold:**
  - now + 14 min is refused, and now + 15 min is accepted.
  - now + 24 h is accepted, and + 24 h 1 min is refused.
  - write-arming refuses past T−10 (00:09 refused at now 00:00; 00:10 passes to the seal step).
- **Nothing passes vacuously.**
  - Unset, placeholder, ISO-form, trailing-space and impossible T all fail (G4a, G4o-s).
  - The generator keeps an existing T only when it is valid for the quota day. A T that has since passed is caught by
    register-rd's lead check. The real launcher is caught by g5 (now ≤ T+10). register-rd refuses any `@@` placeholder.
- **The edge calibrations fail on the wrong bound.**
  - Generator: 12/12 mutants, each flipping an edge (lead ±1 and exclusive, horizon 23 h and exclusive, run 60/90, reset hour 06,
    quota removed).
  - register-rd: 15/15, including a TZ +02 mutant and a mutant that ignores the calibration clock.
  - Guard g4: 8 mutants, each flipping exactly the expected cases (6→7, 6→5, 30→31, 30→29, exclusive bounds, one side only).
  - write-arming: 31/31.

### Findings

**F1 IMPORTANT. A dry run before arming can no longer reach the checks after g4.**
- Where: `guard-rd.mjs:213` (g4 = [T−6, T+30]) and the guard's run order (r1, 2-4, 6-8, r2, r4, **g4**, 6b, 9, 10b, 11, r5, 12, r3,
  r6, r7, 13, g2).
- Who it blocks:
  - Plan Task 18 step 6 (controller dry run, expecting `GUARD OK` + `NIGHT GATES OK`).
  - The launcher's own rule, `launch-rd-src.txt:26`: "Its GUARD OK line and its NIGHT GATES OK line are required before the real
    task is registered."
- Why: a dry twin run at any time other than [T−6, T+30] now stops at g4. Every later check goes unexercised: 10b HEAD pin, r5, 12
  cue build, r3 router dist, r6 smoke sha, r7 quota, 13 knowledge mode, g2 night gates.
- Consequence: the first time all of them run on the real tree is the precheck's dry twin at T−6. A failure there disables the flight
  with no time to fix it. Under the old windows, a pre-registration dry run with the real T passed g4 at any hour.
- Fix (controller's choice):
  - Move g4 to the END of the run order, just before 10a.
  - Have the dry form report g4 without stopping at it.
  - Alternatively, write into the arming steps a pre-arming dry run on a scratch launcher pair with T = now + 15 min, run inside
    its [T−6, T+30], before regenerating with the real T.
  - Then re-run guard-rd-cal.

**F2 MINOR. Two tools changed after the calibrations that record them.**
- `gen-launchers-rd.mjs`: launchers-rd-cal recorded sha256/12 `eaf8184e5955`; the file is now `562a16c5c199`.
- `write-arming-rd.mjs`: write-arming-rd-cal recorded `90c310e291b3`; the file is now `04296d43cc5b`.
- Both were modified at 01:16:14, after their cals (01:13:58 / 01:14:35 / 01:15:54).
- My spot checks of the current files reproduce every T edge above, so the behaviour looks unchanged. Still, the saved calibration
  does not describe the file that will run. Re-run launchers-rd-cal, gen-t-mutants and write-arming-rd-cal.
- guard-rd.mjs (`ddcf3d14dd66`) and register-rd.ps1 (`ba1b831c9ce5`) match their cals.

**F3 MINOR. The 75-min quota rule bounds T, not the run's real end.**
- The real launcher can start up to T+10 (g5).
- `RUN_MIN = 75` is not tied to the registered `I60_PROBE_DEADLINE_MIN`, nor to the three arms that follow the run.
- Example: T 08:40 starting at 08:50 with a 75-min run crosses 10:00. Spec 10.1 calls requests after the reset "not an error", so
  this is a reporting point.
- The registration should state the rule's meaning, and should keep the deadline plus the arms inside it if that is the intent.

**F4 MINOR. register-rd mixes two clocks.**
- It converts T to UTC with a fixed −3 h for the quota math, but compares the lead and horizon against the MACHINE clock
  (`Get-Date`) and registers the triggers on it.
- These agree only while Windows stays on UTC+3 (the report says so).
- A one-line guard asserting `[TimeZoneInfo]::Local.GetUtcOffset(now) = 03:00` would make the assumption explicit. The precheck
  already prints `tz-offset`.

### Not shown

- I did not re-run any calibration.
- The guard's g4 was checked only by reading its code and its calibration, not run.
- I did not check the precheck's T−6 dry-twin timing (now ≥ T−6 at the dry guard): it is true by construction, because the precheck
  waits for `-At` before it starts the dry task.

SPEC: PASS  QUALITY: CHANGES

## fix3 review (scoped: F1, F2, F4)

**Verdict: SPEC: PASS  QUALITY: CHANGES** (one IMPORTANT, two MINOR).

F1, F2 and F4 are fixed as stated. The IMPORTANT finding is a side effect of F1's intended use: the out-of-window dry run itself
leaves the error log that the precheck refuses.

### F1 is resolved: g4's clock check now runs last
- **The split, `guard-rd.mjs`.** The FORMAT check stays early at l.213. The CLOCK check is now l.420, after g2 (night gates) and g5,
  and just before 10a. So a dry twin outside [T−6, T+30] reaches every other check in order: r1 … r7, 13, g2.
- **The calibration discriminates.**
  - G4t: everything right but the window. The night-gates lines are in the log, and the last stderr line is the g4 clock refusal.
  - G4u and G4v: outside the window plus a 10b or a g2 failure. The real failure is reported, not g4.
  - G4x: an unparseable T still fails early.
  - The mutant that runs the clock check right after the format check is caught by G4u, G4v and G4w.
- **The ending line.**
  - On a clock-only failure the guard writes `GUARD FAILED: (g4) now (...) is outside [T - 6 min, T + 30 min] ... every check before
    this one passed; only the start time is wrong (10a ... is not run)`.
  - The dry launcher appends stdout and stderr to the log, then exits 4 without a `done` line. So this is the log's last line, as G4t
    shows.
  - Any other `GUARD FAILED: (<tag>)` as the last line is a real failure.

### F2 is resolved: the calibrations match the current files
Every calibration output now postdates its file, and each recorded sha equals the file's current sha256/12:

| file | sha256/12 | calibration (output time) |
|--|--|--|
| gen-launchers-rd.mjs | 562a16c5c199 | launchers-rd-cal (01:39) |
| write-arming-rd.mjs | 04296d43cc5b | write-arming-rd-cal (01:39) |
| guard-rd.mjs | 6ef1d49dba90 | guard-rd-cal (01:39) |
| register-rd.ps1 | f99b3e5c3816 | register-rd-cal (01:42); window cal ran at 01:34, after the 01:21 edit |

### F4 is resolved: register-rd asserts the UTC+3 offset
- `register-rd.ps1:60-66` compares `TimeZoneInfo.Local.GetUtcOffset(now)` with exactly 3 h, before any T is used.
- The calibration refuses 02:00, 04:00, 00:00, 03:30 and 03:00:01, passes 03:00, and refuses junk input.
- Three mutants are caught: the check removed, the check compared with +02, and the stand-in ignored.
- Residual: a negative-offset stand-in was not testable, and that does not matter on this machine.

### Findings

**H1 IMPORTANT. The out-of-window dry run that F1 is designed for writes the error log the precheck refuses.**
- The dry launcher's guard failure branch (`launch-rd-src.txt`, section guard-dry) appends to `%TEMP%\natively-rd-launcher-error.log`
  on ANY guard failure, the expected g4 clock failure included.
- `rd-precheck.ps1` gate `error-log` (l.155-157) FAILS if that file exists. A failing precheck disables the flight task.
- So a pre-arming dry run, read as "green but for the window", leaves a file that will kill the flight at T−6 unless someone removes
  it. Nothing in the arming tools checks for it: write-arming does not, and register-rd does not.
- Fix, either of these:
  - (a) write-arming-rd refuses while that file exists, and the arming steps say to read it, then delete it.
  - (b) The guard exits with a distinct code when only the g4 clock check failed, and the dry form's branch for that code logs a
    line instead of writing to the error log. The real launcher keeps exit 4 and the error log.
- (a) is the smaller change.

**H2 MINOR. The window-only failure shares the `(g4)` tag with the early format failure.**
- The two are told apart today only by their sentences: "not a yyyy-MM-dd HH:mm" against "every check before this one passed".
- Reading the tag alone would confuse them.
- Fix: a distinct tag such as `(g4-clock)` makes the ending line unambiguous to a simple match. Calibrate it in G4t and G4x.

**H3 MINOR. An out-of-window dry twin never runs 10a, the .env scan, and never runs g5.**
- So the first .env scan on the real tree happens at T−6, with no time to fix a failure.
- 10a reads names only, never values. Running the clock check AFTER 10a would keep the 10a-last rationale, because no other check
  is reported having opened .env, and it would let the pre-arming dry run prove 10a too.
- Optional, but cheap. Otherwise, write the gap into the arming steps.

### Not shown
- I did not run any calibration or the guard myself. I relied on the recorded cases G4t-G4x, whose outputs postdate the current
  guard.
- I did not check a dry log written by a real scheduled-task run.

SPEC: PASS  QUALITY: CHANGES

## fix4 review (scoped: H1, H2, H3)

**Verdict: SPEC: PASS  QUALITY: APPROVE** (one MINOR left).

The file shas match the report: guard `869652c723fb`, write-arming `5259379f5c24`, launch-rd-src `7155790525e1`, generator
`562a16c5c199` (unchanged). Each calibration output records the sha of the current file.

### H1 is resolved: a window-only dry failure no longer writes the error log
- **The guard's exit codes.** `fail()` defaults to exit 1. Only g4-clock passes `EXIT_WINDOW`, exit 10 (`guard-rd.mjs:76,441`).
- **The dry launcher (`guard-dry`).** It stores `%errorlevel%`.
  - On 10, it appends `=== LAUNCHER rd-dry GUARD WINDOW ONLY exit 10 ... ===` to its log, writes no error log, and exits 10.
  - On any other non-zero code, it appends to `%TEMP%\natively-rd-launcher-error.log` and exits 4, as before.
- **The real flight launcher still treats exit 10 as a failure.** `guard-flight` is unchanged: `if not "%errorlevel%"=="0"` writes
  the error log and exits 4, so the flight never starts (launchers-rd-cal X5e).
- **The precheck at T−6 can no longer be tripped by a pre-arming dry twin.** Its only persistent trace that the precheck reads is the
  error log (gate `error-log`).
  - A window-only failure writes none (X5a).
  - A real failure still writes it, which is correct.
  - write-arming now refuses while that file exists (`write-arming-rd.mjs:37-38`, Y26/Y27, the mutant caught). So a real failure
    is caught at arming, not at T−6.
  - The precheck's `dry-twin` gate reads only the NEW log bytes of the run it starts itself, inside the window, and requires
    result 0. A dry run's earlier exit 10 is invisible to it.
- **The ending line is unambiguous.**
  - A window-only failure ends with the `GUARD WINDOW ONLY exit 10` line, right after the guard's `(g4-clock)` line (X5b2).
  - A real failure leaves a `GUARD FAILED: (<other tag>)` line last, writes the error log and exits 4 (X5c, X5d).
  - The X5f mutant, with the exit-10 branch removed, is caught.

### H2 and H3 are resolved
- **H2.** The clock check has its own tag, `(g4-clock)`. The format check keeps `(g4)`, still early.
- **H3.** g4-clock is now the very last check, after 10a.
  - G4w: outside the window plus a guarded name in `.env` reports 10a with exit 1, so 10a ran.
  - G4t: everything right but the window gives exit 10 and the `g4-clock` tag.
  - Mutants that lose the exit code, revert the tag, or put the clock before 10a are all caught (guard-rd-cal 240/240, 64/64
    mutants).

### Remaining MINOR

**K1 MINOR. Node reserves exit code 10 ("internal JavaScript run-time failure").**
- If node itself dies with 10, the dry launcher would print the WINDOW ONLY line and skip the error log.
- The guard's own last line would then not be the `(g4-clock)` refusal. The precheck's dry twin requires exit 0 regardless, and the
  real launcher treats 10 as a failure.
- So flight safety is unaffected; only the pre-arming reading could mislead.
- An unreserved code such as 64 would remove the overlap. Otherwise, the reading rule should require BOTH ending lines (the
  `(g4-clock)` line, then the WINDOW ONLY line), as the report already states.

### Not shown
- The launcher's reading of exit 10 was proven with a stub guard. The real guard's exit 10 was proven separately. The two have not
  run joined in one process (the report says so).
- write-arming checks `%TEMP%` as the Claude session sees it. I did not verify that this is the same file the scheduled task writes
  under the sandbox's AppData handling. The precheck, which runs as a scheduled task, remains the authoritative check.

SPEC: PASS  QUALITY: APPROVE

## ledger-fix5 review (scoped: run-copy merge and `complete`)

**Verdict: SPEC: PASS  QUALITY: APPROVE.** The merge is correct. The `complete` caveat is real and makes the r7 completeness gate
nearly vacuous in general. For today's quota day it is closed by the coordinator's evidence together with the log spans below. One
IMPORTANT carry goes to arming.

**What I checked**
- `SP\quota-ledger-today.mjs` sha256/12 `bd1c5b500b82`, modified 02:04:51. quota-ledger-cal.txt (02:05:36) ran against it:
  OK 37/37, R0-R4 and mutants X10-X12.
- How the harness makes the copies: live-router `interview60.run.mjs:605-615`. `snapshotRun` copies the whole `natively_debug.log`
  into the run folder at the end of `auto()`.
- MAIN's live log spans and its run folders, printing timestamps only.

### The merge neither double-counts nor drops a request
- A run copy is a byte copy of the same file. The ledger strips `\r`, so a line present in both the live log and a copy has the same
  identity, timestamp to the millisecond included. Taking max(occurrences in any one source) therefore counts it once (R1; the
  summing mutant X10 is caught).
- Two genuine requests can collide on identity only if they share the millisecond stamp AND the text, in the same location:
  - Across sessions this cannot happen, because the stamps differ.
  - Within one source both copies stay (R4; the set mutant X11 is caught).
- So nothing is dropped.
- Per-location merging keeps MAIN, whole-turn and live-router separate. That is correct, because each app writes only its own
  location's log.

### A session with both a run copy and a live log is not under-counted
- The union contains every line of every source. The live log holds everything the copy holds, plus the lines written after the
  snapshot.
- The opposite case also holds: a live log rotated away (two app starts later) is still represented by its copy.
- The only residue is a session's lines written after its snapshot that are then lost to rotation: its shutdown tail.
  - Example: the 22:04Z session's last line is 22:25:43.485Z, and its snapshot folder is stamped 22-25-42.
  - Request markers in that ~1-2 s tail would need a warm-up or heartbeat during shutdown, which I consider negligible.
  - That session is still in the live `.log.1` today anyway.

### The residual `complete=yes` caveat: real, and closed for today
- **Why it is real.** `complete` now means "some source in the union holds a line older than the reset". Any old run copy satisfies
  that.
  - MAIN carries copies back to May, so `complete=yes` holds at almost any time.
  - R2 shows it directly: a copy with a 06:00Z line flips R0's `complete=no` to yes, though nothing covers 06:00-08:00.
  - So the gate added in I1 no longer detects a session that was rotated away and had no run copy: an app start without `auto()`,
    or a run killed before its snapshot.
  - Nothing in the logs can prove such a session absent. It needs outside evidence.
- **Why it is closed for this quota day (from 2026-10-06T07:00Z):**
  - The coordinator's 21:55Z read showed 0 / 0 with `complete=yes`, through the live chain.
    - An app start writes a fresh `.log` with in-day stamps. A live `.log` holding no in-day line therefore proves no session started
      in MAIN between the reset and 21:55Z.
    - It also proves the session then in `.log` logged nothing in the day.
  - The coordinator reports no app start between 21:55Z and 22:04Z.
  - Since then MAIN's live chain holds exactly two sessions, both intact:
    - `.log.1`: 22:04:28Z-22:25:43Z, also copied to `2026-10-06T22-25-42-router-smoke`;
    - `.log`: 22:40:46Z-23:01:55Z, also copied to `2026-10-06T23-01-59-router-smoke`.
  - No session can be missing in between: a third start would have rotated the first away, and both are still live.
  - So `used35=100 used31=10` is the full in-day count of hedge and warm-up markers in MAIN, under the stated limits (no markers on
    non-hedge streams; scripts counted through `--extra-requests`).
  - whole-turn and the live-router worktree show no in-day lines.

### Carry (IMPORTANT, for the arming record; no code change required)
- From here to T, any further app start in MAIN must be accounted for. Each must either still be in the live chain or have a run
  copy, AND be listed. Otherwise `complete=yes` proves nothing about it.
- The arming body should record the session spans above: each source's first and last stamp in the day, plus the 21:55Z read.
- Optional ledger improvement: print each in-day session's span (first/last stamp per source), so the record is mechanical.
- A tighter test that could actually fail: the in-day union must start at a session whose first stamp is at or before the previous
  read's `now`, or at or before the reset.

### Not shown
- I did not run the ledger or its calibration. I relied on the 37/37 output, which postdates the current file.
- I did not see the 21:55Z read myself; it is the coordinator's evidence.
- The WT and live-router run folders were not listed.

SPEC: PASS  QUALITY: APPROVE
