ALL ADDRESSED

# Task 7 re-review 2 (fix round 2)

Scope: every fix-round-2 ruling, the implementer's two unasked fixes and its `.env` concern, the
effect of Task 11's startup line, and the new runner end to end. I report only findings that
would make a correct app fail, let a broken app pass, or make the launcher misbehave.

Nothing I ran started the app, registered a task, called a model API, or ran the real `app:stop`.
The probe ran from a stub cwd (`SP\rv8\p`). The runner ran as byte-identical copies in `SP\rv9\`,
so the real `SP\smoke-hedge-checks.txt` was not touched.

## Rulings: every one is met

**NEW-C1 - met.**
- Overlap shapes read AMBIGUOUS: 2 or more front or won-by lines, or a shortfall explained by a
  neighbour's surplus (checker:279-322).
- Each definite case FAILs: a `no answer` line (rule a), 1 front + 0 won-by with no later surplus
  (rule b), and 0 front on a non-CODING or unknown route (rule c).
- `--clips` is required, and PASS needs scored + CODING to equal the clip count, otherwise
  INCONCLUSIVE (checker:551-556).
- My earlier fixtures re-run with the new required flags: `rv8\unraced` FAIL, `rv8\bothfail` FAIL,
  `rv8\off-nowin` FAIL, `rv7\noabort` FAIL, `rv7\unhandled` FAIL, `rv8\answertext` PASS,
  `rv7\off-real` PASS.

**NEW-I1 - met, but the runner's roll-up fails open (see NEW2-I1 below).**
- The checker now requires `--diag-log` and `--clips` in forced, default and off mode.
- The runner reads each segment's since from line 2 of its log and passes the next segment's since
  as `--until`.
- File names match the launcher's copies. It passes `REPO\verbal-diag.log`, the app-start copies
  or `child.log` as `--extra-log`, `--segment-log` for refuse, and clips 3/3/1, and writes
  `SP\smoke-hedge-checks.txt`.
- End to end on a synthetic tree (`SP\rv9\mk.mjs`):
  - clean tree: `OVERALL: PASS`, exit 0;
  - forced answer 2 never raced: `forced=FAIL`, `OVERALL: FAIL`, exit 1.

**NEW-M1, NEW-M2, NEW-M3 - met.** Re-run in the stub cwd:

| Stub | Probe result | Wall time |
|---|---|---|
| exits 1 | exit 0 | 0.3 s (timer cleared) |
| exits 0 | exit 1 | 0.3 s |
| hangs, cleanup cannot kill it | `REFUSE STILL RUNNING`, then `REFUSE cleanup FAILED: pid N still alive`; probe exit 1; the stub was unref'd and exited on its own 60 s timer | 13.3 s |

**NEW-M4 - met.** The debug-log check fires only on CRITICAL lines starting with the crash
phrases. The extra-log check anchors on crash shapes at the start of a line. `rv8\answertext`
PASSes. The app-start text (46 `[Answer] full:` lines in the current file) cannot trip it.

**NEW-M5 - met.** The off-mode global check now runs before the zero-window branch.

**NEW-M6 - met.**
- `--no-optional-locks` and `-uno` are in place.
- The dirty count is gated on `if not errorlevel 1` after `rev-parse`.
- The ISO mtime works (`rv9\mt.cmd`): with the file present it prints
  `mtime=2026-09-26T19:45:31.255Z`; with it absent the log gets no line.

**NEW-M7 - met.** The register guard now tests `main.ts` alone.

**NEW-M8 - met.** All six mutation cases exist and FAIL.

**Calibration: 43/43**, reproduced.

**Unasked fix 1 (`-uno`) is correct.** `SP\rv9\eq.cmd` shows the same argument through
`for /f ('...')` arriving as `[--untracked-files] [no] [-uno]`, but as
`[--untracked-files=no] [-uno]` when run directly. cmd splits on the `=` inside `for /f`, so git
would have taken `no` as a pathspec.

**The `.env` concern does not apply to the real run.** The task's working directory is MAIN,
which the controller confirmed has `GEMINI_API_KEY`, and `interview60.run.mjs:53` only needs that
line to exist.

**Task 11's `[Main] follow-up parent: off` line does not confuse the checker.**
- Neither `STARTUP_ON` nor `STARTUP_OFF` matches it, and `HEDGE_ANY` is anchored to `[LLMHelper]`.
- In refuse mode the line can only come before the refusal: if it is logged after the hedge
  validation, the refusal's `app.exit(1); return` means it is never reached.
- The synthetic tree carries the line in all four segment copies (before the refusal in refuse)
  and reads `OVERALL: PASS`.

---

## NEW findings

### Important

**NEW2-I1 - The runner's roll-up fails open: a segment the checker could not check counts as
PASS.**
Where: run-smoke-hedge-checks.mjs:66-71, 141-146.

`exitLabel` turns any exit code other than 0, 1 or 3 into the label `ERROR(exit N)`. But the
roll-up only counts the literal strings `'ERROR'` and `'FAIL'` as bad, and `'INCONCLUSIVE'` as
inconclusive. So a checker exit 2 (a usage or read error) or `null` (a killed process) belongs to
neither group, and the result is `OVERALL: PASS` with runner exit 0.

Reproduced: `SP\rv9\mk.mjs` with the `forced-debug-unreadable` mutation (the copy exists, so the
runner's pre-check passes, but it cannot be read). The output was
`SEGMENT forced: ERROR(exit 2) (exit 2)` and
`OVERALL: PASS  (forced=ERROR(exit 2), default=PASS, off=PASS, refuse=PASS)`, runner exit=0.

If the checker ever adds a required flag that the runner does not pass, all four segments exit 2
and the gate still reads PASS, with nothing checked.

**Fix:** `const bad = results.filter((r) => r.verdict !== 'PASS' && r.verdict !== 'INCONCLUSIVE');`
and add a calibration case for it.

### Minor

**NEW2-M1 - A segment can PASS without exercising a single race.**
Where: checker:506-556, 244-247.
- `accountedFor = scored + coding`, and nothing requires `scored >= 1`. A forced, default or off
  segment whose every answer took the CODING route therefore reads PASS. CODING bypasses the stall
  race and the hedge by design (LLMHelper.ts:2721), so the hedge path would never have run. The
  round-1 ruling's "at least one unambiguous window" requirement was lost in this rewrite.
- Related: `routeFor` is bounded to the dispatch time plus 60 s, not to the window's end. A window
  whose generation logged no route line can therefore borrow the next answer's route, including a
  CODING exemption.

**Fix:** INCONCLUSIVE unless `scoredCount >= 1`, and bound `routeFor` by `win.end`.

**NEW2-M2 - Two legitimate single-answer shapes read INCONCLUSIVE.** The runner then exits 1, so
the gate stays shut until someone attributes the result by hand.
- **(a) A supersede.** It gives 2 scored windows for 1 clip, so `accountedFor !== clips`. The
  implementer's own case `supersede-two-clean-windows-one-clip-INCONCLUSIVE` records this. The
  cause is my round-1 "== clips" proposal: supersede windows should not count against clips.
- **(b) Off mode's pre-token redirect.** The primary fails before its first token and
  withVerbalFallback runs the stall race again, which puts 2 `verbal stall race: trying` lines in
  one window, classified as overlap. h40b hit this at 10:35:16 and 10:35:18 (a 503 "high
  demand"), once in 46 answers. Reproduced with `SP\rv9\off-redirect` (h40b's shape):
  `AMBIGUOUS - 2 "verbal stall race: trying" line(s) (overlap)`, INCONCLUSIVE, exit 3.

**Fix:**
- Count clips against `answer` windows only; supersede windows must still be scored or CODING.
- In off mode, when the window holds a `[WhatToAnswerLLM] verbal primary failed before first token`
  line between the two stall-race lines, treat it as a redirect: score the window on its first
  stall-race line.

## Evidence (throwaway)

- **`SP\rv9\mk.mjs`** plus runner and checker copies (hash-identical to SP's):

  | Tree | Result |
  |---|---|
  | clean | `OVERALL: PASS`, exit 0 |
  | forced q2 never raced | `OVERALL: FAIL`, exit 1 |
  | forced debug copy unreadable | `OVERALL: PASS`, exit 0 (NEW2-I1) |

- **`SP\rv9\off-redirect`:** INCONCLUSIVE, exit 3 (NEW2-M2b).
- **`SP\rv9\eq.cmd`:** `for /f` splits `--untracked-files=no`.
- **`SP\rv9\mt.cmd`:** the mtime line with the file present and absent.
- **`SP\rv8\seg4-r2-*.log`:** the probe runs (exit1, exit0, hang-nokill).
- **`run-calibration.mjs`:** 43/43.
- No stub process remains.
