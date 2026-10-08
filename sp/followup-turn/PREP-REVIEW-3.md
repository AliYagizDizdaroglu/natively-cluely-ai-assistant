VERDICT: READY WITH FIXES

Opus re-review (A2.12 gate b) of the A2 fix round. Written 2026-10-03 ~23:40 local. Counts: 0 Critical, 2 Important, 3 Minor; concerns 1-6 ruled below.
Ids, counts and hashes only.

## Important

**I-1. The point-10 code rule can be passed by a command that reaches a file loader through a computed name.**
- Where: `R/audit-graders.mjs` `bashProblem` (lines 78-122); the registered text of A2 point 10 (i)-(iii).
- Rules (ii) and (iii) only inspect code that names `fs` or `require` directly. A name built at run time (from variables or other non-literal pieces, with no `+` next to a literal), then looked up on a global object, reaches a loader that neither rule sees.
- From there a file path can also be assembled at run time without a literal that contains a path character.
- The implementation matches A2's text exactly, so this is a hole in the rule. A2 point 10's "Not shown" line names "no computed string" as an assumption, but nothing in the rule enforces it.
- Impact: within an allowed `node -e`, a grader could read a key file, an answer file or another grader's verdicts and still read clean. The permission set allows any `Bash(node -e *)`, so nothing prevents it either.
- Fix: replace the token denylist for `<code>` with a positive allowlist.
  - Every identifier outside string literals must come from a fixed set, derived from the 8 real s50l commands plus the pilot's command. No `this`, no global-object names, no `constructor`/`prototype`.
  - No computed member access except `process.argv[<digit>]` and numeric indexes.
  - No regex literals.
  - String literals restricted to the own file names, an encoding name, and literals with no identifier-like content beyond a short fixed set.
- Calibrate before the gate: the 8 real transcripts and the pilot's command stay clean, and a computed-name negative control (built by the engineer, never executed) reads FLAGGED. Tightening only, so it stays within point 10's "never loosened".

**I-2. Point 13 (pilot's absolute-path argument) is not yet implemented or calibrated; gate (f) cannot pass until it is.**
- Evidence: `R/pilot-audit.out.txt` shows FLAGGED on Bash len 360, sha12 b271cca9e127. Cause: `SHAPE` (line 56) excludes `\` inside trailing arguments, so a `C:\…` path fails the shape.
- Ruling on the brief's rule: the argument side is sound if:
  - normalisation is the same `norm()` used for the allowlist (resolve, `/`, NFC, lower case);
  - `/c/…` is mapped to `C:/…` before resolve;
  - `..` is rejected as a path segment before normalising, so a path that resolves back to the own file is still refused, as the brief requires.
- Also: without a `cd`, a relative own-file literal in the code resolves against the fresh per-attempt cwd, not the blind folder. That is harmless (it fails), but say so in the point.
- Point 13 inherits I-1: the argument check does not constrain the code. Fix both together, re-run section C, then pilot `--attempt 2` as gate (f).

## Minor

- **M-a. Reads are wider than A2 point 11 states.** `--add-dir <blind dir>` makes every file in `R/blind/` readable without a rule: other pairs, other graders' verdicts, launches.jsonl. The Read audit still flags any such Read. Ruling: accepted residual. State it in point 11's residual, and run a file's g1 and g2 in the same round so neither can see the other's finished verdicts.
- **M-b. The pilot exercised one validation shape only.** The real 18 may produce others: cd form, literal form, argv form. Section C covers these on synthetic transcripts. Accepted.
- **M-c.** Fill-section2, section C and `R/audit-graders.negative-control.out.txt` change again after this review because of point 13 and I-1. Under A2.12(b), that edit needs a numbered successor (`PREP-REVIEW-4.md`) re-checking `audit-graders.mjs`, section C and the refill before (g).

## Prior items (PREP-REVIEW-2) and A2 points

- **C1:** closed. Runner-selftest r0 uses a hash-stripped TMP copy, `TURN_PREREG` defaults to the registered file, and day-pre passes it.
- **C2 / point 2:** closed as A2 rules. The departure is conditional and unused tonight (revision 23:02). legs-decide requires `departure: true` plus a §3 line that starts `DEPARTURE-S6-ACCEPTED` with a date and time, and prints the exposure line when it is used.
- **I1 / point 3:** closed. Hard stop 2026-10-04T06:30:00Z; refuse when now + 120 s ≥ cutoff; `STOPPED AT HARD STOP` line, `STOPPED-<leg>.txt`, exit 3; `end` on records. The blind builder and legs-decide refuse on markers or late records without printing VOID. `stop-archive` exists.
- **I2 / points 1 and 10:** the implementation matches the text, and the negative controls all read FLAGGED. Still open as I-1 above.
- **I3 / point 4:** closed. `EMPTY_STREAM` is a transient; a finishReason with empty text stays a real record.
- **I4 / point 5:** closed. Labels are cross-checked against the three tool outputs, slot names are exact, `.replaced` lines are checked, and every slot needs a launches.jsonl line with exit 0, slugJsonl 1, memoryDir absent|empty and matching attempt, cwd and model.
- **M1-M10:** closed as A2 point 6 rules. M1: two new §2 rows (judge f5dba64f…, dispatch f8d64670…, 9064 bytes) verified in check-grader-questions. M2 and M6 are in day-pre. M3: `.tmp` + rename. M4: TMP only. M5: INCIDENT instead of VOID. M7: Retry-After capped at 60 s. M8: back-leg refusal. M9: DIFF CHECK OK. M10: accepted residual.
- **Points 8, 9, 11:** implemented. Live: cwdprobe-1 9a33b8ac and cwdprobe-2 882eefbb both read exit 0, model claude-opus-5-5, ABSENT projectMemory=0 claudeMem=0, slugJsonl 1, memoryDir empty, tools Read 1 Write 1. Gate (e) holds. The flags work: `dontAsk` plus the rules let Read and Write through, and no tool call was denied.
- **Point 12:** controller gate, no code. Note that `R/run.log` was not present when this review started.

## Engineer's concerns

1. The real binary was not run: now answered by the two probes and the pilot. Closed.
2. Exact slug folder instead of the prefix: acceptable. A prefix match would refuse every sibling attempt. The exact folder plus the post-launch `slugJsonl: 1` check serves the point's purpose.
3. The substring ban hits innocent words (`.join(',')`): acceptable as registered, at the cost of a re-grade. It is subsumed if I-1's allowlist is adopted: derive the allowlist from the real commands so common validation code stays clean.
4. "Exit 0 on every step" vs the REPLAY_BREAK controls: acceptable. Per-step expected exits are the only coherent reading, provided day-pre prints the expected and actual exit per step.
5. Launcher argv not in run.log: acceptable as a controller step. The controller must paste the launcher's printed argv line verbatim into run.log at the pilot (gate f), as point 11 requires.
6. Three mutants caught by an exception: acceptable as Minor. They are caught, and the run cannot proceed past an exception.

## Not checked

- Executing any candidate bypass, by design: the point-10 hole was established by reading the rule against the code paths it inspects, not by running a command.
- The full source of day-pre, day-steps, e2e-synthetic and legs-decide-calibrate beyond grep spot-checks and their recorded output markers (all present: 47/47, CALIBRATION OK, 98 mutants caught, E2E OK, RUNNER SELF-TEST OK, GRADER-SESSION CALIBRATION OK, instrument 8564ba96369a OK, dry runs 140/48).
- Whether Claude Code auto-allows some read-only Bash commands under `dontAsk`. The audit flags any such command anyway.
- section2-filled.md against the files on disk after the point-13 edit (pending).
