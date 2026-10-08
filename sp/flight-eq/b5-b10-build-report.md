# b5 / b10 build report (written 2026-10-06 00:39 TST; hard stop 02:40 not reached, nothing running)

Both tools are built and calibrated. No model call, no app start, no scheduled task touched, nothing written inside MAIN,
nothing committed. Every file is in `E` = `L\flight-eq`. They have no Opus review yet and no line in `instruments.sha256.txt`
(A2.5 needs both before first use on the run folder; that file does not exist yet).

## Tools (sha256/12)

| file | sha256/12 | result |
|---|---|---|
| `eq-flight-read.mjs` (b5) | **84ff2fa12719** | `eq-flight-read.cal.txt` (`420c60319421`): **75 PASS / 0 FAIL**; `b5-mutants.txt`: 20 of 20 mutants flip the cal |
| `eq-flight-read.cal.mjs` | 6bfcc612b7ce | |
| `eq-cues-export.mjs` (b10) | **2ee308d261f1** | `eq-cues-export.cal.txt` (`fb0cc5cf7c6f`): **91 PASS / 0 FAIL**; `b10-mutants.txt`: 9 of 9 mutants flip the cal |
| `eq-cues-export.cal.mjs` | df84b9147509 | |

`b5-mutants.mjs` (90619cced075) and `b10-mutants.mjs` (032394344ea2) apply each mutation to a copy of the tool and rerun the cal.
Two mutants first went uncaught (b5 M3, M7; b10 M8). All three were equivalents or untested wiring, fixed by a new cal case or a better mutant, not by loosening a check.

## b5 `eq-flight-read.mjs <run-dir>` [--played json] [--referents] [--prompts] [--gstar ids] [--gstar-min n] [--twin-min n]

Prints ids, counts, line numbers and classes only. Exit 0 = read and no VOID/FAIL named, 1 = a VOID/FAIL named, 2 = usage/unreadable, 4 = crash.
Known cases run (all in `eq-flight-read.cal.txt`, with the reader's full smoke output as evidence):
- smoke seg 1 -> G = {S1Q04F, S1Q06F}, both referents RIGHT (S1Q04, S1Q06), S1Q04/S1Q06 `no-cue`, WHY `parent-in-prompt cue=short` read as `short`, turn ids 1..5 increasing, 0 error, 664 cumulative captures reduced to the 5 in-window, 2 LABEL in-window = 2 block windows.
- smoke seg 2 -> `NOT EXERCISED (flag off)`, exit 0.
- s50m and s50l -> `NOT EXERCISED (flag off)`, STRAY 0 (40 / 41 roster windows), exactly 1 debug-log override line + 1 verbal-diag fast-route line, both at S1Q01 (A4.2); s50m out-of-window FAST/BEHAVIORAL route lines = 23.
- run5 log (2026-10-01 21:00) against the S1+S2 roster -> STRAY >= 1 (VOID 1(i)).
- Synthetic, app line shape: startup line only -> 0 diag lines; both `gate=error` shapes (`ms=0 error="x"` and `ms=3`) -> 5a FAIL x2; WRONG REFERENT (earlier / later item), UNMATCHED; a main with `gate=block` -> 4d; `turn=none` -> named, 1(b) 95% VOID at 70%;
  coding / knowledge-short-circuit / fast-route (debug-log and verbal-diag-only) each with its flip to UNEXPLAINED = VOID 1(e); screen line placed before another window's pinned line does not excuse; malformed block in a block window = 5d FAIL, in a non-block window = VOID 1(e) with the 5d reading; pre-window LABEL capture -> `ignored 1`, VOID 0; same capture in-window non-block -> VOID; unparseable `at` read as in-window; `double` / `other` G_twin causes; "Thank you." -> short; 8-word invented sentence -> STRAY 1; m8; 1(c) 2 of 4 -> VOID, 3 of 4 passes; 1(f); 2a p90; non-increasing turns; 1(a) variants; usage and unreadable exits.
- A6 case (i) was run emulated on the smoke's own folder with a run window opening after it (>= 2 LABEL captures `ignored`, no 1(e)). The real-hour version cannot run before the hour.
- h40d's run log was not used (A2 replaced it by s50m: no holdout bytes in this hour's tools).

## b10 `eq-cues-export.mjs <run-dir>` [--out-dir] [--arming] [--launcher-log] [--id-re] [--no-pairs] [--no-twins]

Writes `cues-export-eq.json` + `cues-export-eq.completeness.txt` (default out-dir = E; the cal wrote to `E\b10cal-out\`, so tonight's real files do not exist yet). Exit 0 COMPLETE, 1 INCOMPLETE (written), 2 refusal (nothing written), 4 crash.
- h40d (NOTE-b10-rev7-A1 answer, not the registered 45): **44 in-app entries on 44 ids**, 45 cue lines in window / 2 outside, 1 `superseded 6541` (R29, 11:31:30Z, checked on the log and by play window), 0 empties, `cueBlocks.present` 45 = 44 + 1 (via MAIN's `interview60.metrics.mjs`), all 44 joined to the judge pairs, twins 44 entries per rep on all six files (cues equal the records), 308 entries total, EXPORT COMPLETE. Producer cases (i)-(iv) re-derived in the cal independently of the tool.
- cuesmoke (the 05:00 re-smoke, run with `--no-pairs --no-twins` because that folder has neither): 20 in-app entries on 20 ids, present 20 = 20, COMPLETE.
- Synthetic: empty block beside a failed answer -> kept, `empty failed`, named, COMPLETE; knowledge and coding short-circuits (no cues line + signature) -> `missing` named by kind, COMPLETE; one missing cues line with no signature -> `EXPORT INCOMPLETE: S1Q02`; superseded stream -> one `superseded <n>` line, the second stream's cues exported; trailing undelivered cues line -> INCOMPLETE; CRLF log, id outside the 40, wrong ARMING sha, missing pairs file -> refused; twins `empty`/`absent`, missing twin file -> INCOMPLETE.
- Contract validator: forbidden field (`answer`, `spoken`, `question`, `prompt`, `reason`, a score), sixth top-level key, wrong schema, bad head, id outside the roster, duplicate pair / twin triple, two in-app entries with one `dispatchedAt` null (a superseded stream exported as an entry), bad src -> each refused. Self-check: a twin entry whose cues differ from its record, and an off-by-one `logLine`, -> refused.
- ARMING checks (A5.4, rev7-A1 U2): matching line accepted; two ARMING lines with only the later pre-start one matching accepted; only the earlier -> refused; a matching line after the run start -> refused; `ARMING absent`, no line, record with two 40-hex values, no HEAD line, edited record, missing record -> refused.
- Privacy: every stdout was leak-checked against the export's own cue strings (0). A separate scan of every file I wrote for 680 cue strings and 59 smoke-prompt samples: 0 hits.

## Rulings I made (each has a cal case; overrule any of them)

1. b10: a delivered answer with NO cues line and no knowledge / coding / failed signature is INCOMPLETE; with a signature it is `empty "missing"` named by kind. This reconciles the registration's "missing line -> INCOMPLETE" with rev 6/7's `missing` class.
2. b10: twin "answered ids" = records without `transientError`. The judge pairs file drops h40d captured-high r1 R09 (empty `spoken`, 2 cues), so using it gave 43/44 against the registered 44/44. That R09 record keeps its entry.
3. b10: in-app answer <-> pair join is the judge's own claim rule (a dispatch claims the first `[Answer] full:` in [d, min(next dispatch, d+60 s))); an extend/supersede continuation full gets `dispatchedAt` null and the consumer's two-entry rule then refuses it. Cues = the last in-window cues line after the previous full; earlier ones are `superseded`.
4. b5: `short` is tested before the roster match, so WHY reads `short` (A2 m2 / A2.10's known answer). sameAnchor's 0.5 overlap rule would otherwise match it to a roster text. With roster-first ordering, WHY becomes `roster:S1Q04` and the registered known answer fails.
5. b5: diag/override/knowledge lines belong to the pinned line before them (the app logs pinned, then diag); only the screen-reference line is read "before" the pinned line (A4.2 m3 read literally for that line; the real log puts the override line after the pinned line).
6. b5: roster match = best-scoring sameAnchor id; p90 = nearest rank; A4.2's "ignored" route count means out-of-window FAST/BEHAVIORAL lines (s50m 23; all routes would be 1509).
7. b5: the `--prompts` LABEL-count line is informational (NAMED), not VOID, because a hedge's second capture of one dispatch would otherwise VOID a clean hour. The recast 1(e) halves decide.
8. b5: with no `verbal-prompts.log`, `gate=block` windows count provisionally in G (named `capture-unreadable`); the real hour has the file.

## Not covered

- Neither tool is Opus-reviewed or recorded in `instruments.sha256.txt`. Both must be before their first run on the hour's folder (A2.5).
- No real flight datum exists, so: A6 case (i) on the real `verbal-prompts.log`; doubles, superseded-stream and `gate=error` shapes on real logs; hedge back-leg double captures; 1(e) on a real block-in-non-block window are known only from synthetic lines in the app's shape.
- b5 does not compute 1(d), 1(g) (knowledge ON), 1(h), 1(k), rule 3/4a-c grades or the window instrument; those are other tools. It reads, and does not grade, 4d/4e wrong answers.
- b10 against the real ARMING record and launcher log is untested: the cal used fixtures with the real HEAD value. `registeredHead` takes the single 40-hex on the line starting `Registered HEAD`. The real record's line 9 is shaped that way, but the real `ARMING sha256=` line in the launcher log does not exist yet. The "before startedAt" rule positions the ARMING line before the first launcher line stamped later than startedAt (ARMING lines carry no stamp).
- b10 h40d known answer: the consumer (`cue-material-eq.mjs`) has not run on `E\b10cal-out\h40d\` (F4 of rev7-A1 needs it). The tool's counts match 44/1/2/0, so the "2 outside window" doubt in rev7-A1 is settled for h40d: the probe's two cue lines at 10:33:26 and 10:33:43 precede `startedAt` 10:33:52.
- The A4.3a/A5.1 leak checker (post-hour) is not built. `E\b10cal-out\` holds the h40d and cuesmoke exports (cue text, never printed, never commit) plus synthetic ones; `b10cal-tmp`, `b5cal-tmp`, `*-mut` folders are scratch.
- `eq-cues-export.mjs` refuses a CRLF debug log (rev7-A1 not-covered: a CRLF log fails closed); the flight's log is LF in every prior run folder.
- The reader cal covers `--played` only for the smoke; a flight timeline lacking `startedAt` exits 2.
