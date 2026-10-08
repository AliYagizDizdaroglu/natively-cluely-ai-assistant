# G-sitting runner: build report, fix round 1 (2026-10-06 ~01:50 local)

eq-gsitting.ps1 sha256/12 23822d03ba6e (was c05c0be3b55c); eq-gsitting.cal.mjs 124b9f7f35c5. Cal: TOTAL 119 PASS 0 FAIL, 31 of 31 mutants killed (eq-gsitting.cal.txt). No model call, no app, no task touched, nothing committed.

## Fix round, per item
- B1: the child gets launch-eq.cmd's whole env block, parsed at run time (set values applied, empty names removed; real launcher: set 7, cleared 29). Refuses if the file is missing, yields 0 names, or sets no NATIVELY_ROSTER. Cal: the stub exits 9 unless ROSTER=scenario50, SCENARIOS=S1,S2, EQ_T set and the emptied THINKING_LEVEL gone, while the parent env carries WRONG/bogus values. Mutants: SET values dropped, EMPTY names not cleared, both refusals removed.
- I1: the reader's READER <run>: line and b4cal's B4CAL run= must equal the -Run folder name (trailing backslash ok); LABEL OUTSIDE --g must be exactly NONE, else refuse naming A5.5 B-I1. 3 mutants.
- I2: -Resume continues from the first step without a clean end exit=0. Before re-running it moves the failed step's answers file, step-n.out/err to E\gsitting-out\failed-<n>-<stamp>\ (moved, never deleted) plus a copy of the whole old log. Logs a GSITTING resume line. DECISION: the failed attempt's STEP lines are rewritten to GSITTING failed-attempt STEP ..., because eq-twins parseSitting flags a duplicate tag; the pre-resume log copy keeps the original. The resumed log parses in the real parseSitting with 0 problems. Refuses on nothing to resume, on an output file for a step that never ran, and with -Holes.
- I3: -Holes "<rep>:<ids>[;...]" (front rep 1-5 as 3:S1Q04F; back rep with b prefix, b2:S1Q06F). Needs 16 clean steps. Each rep must have a real hole (no record or transientError) for every named id in its ORIGINAL files, ids must be in G_twin, else refuse. Runs both steps of the rep back to back in that rep's counterbalanced order, tags tagOf(...,b=true) (<base>-rK-b, rep 1 -> -r1-b, checked against eq-twins' own tagOf), --only = the hole ids, STEP numbers continue from 17. Cutoff counts 2 steps per rep; m6 bars use the hole-id count. Tags never reused. Appended steps parse in parseSitting with 0 problems.
- I4: GSITTING note slow step <n> <min> when a step exceeds 10 min (cal via a -SlowMinutes seam).
- m1: gap measured start to start at the second step's start; the note says 2c is reported only for front reps; no note for back reps.
- m3: outputs are COPIED into the run folder (originals stay in MAIN golden), and the done line says COPIED. A2.10 said moved; to record as a departure.
- m2, m4, m5: left as is. m2 the m6 cross-check counts only app-log mentions, not harness calls; the headroom is the controller's count. m4 the runner refuses itself if launched from a Natively-* task that is Running. m5 A2.5's instruments.sha256.txt line is a controller step, not enforced.

## Exact real commands (E = C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq)
Normal:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "<E>\eq-gsitting.ps1" -Run "<run-dir>" -ReaderOut "<reader output .txt>" -B4CalOut "<eq-b4-cal output .txt>" -Headroom35 <n> -Headroom31 <n>
Resume (after a failed step, once its cause is fixed): the same plus -Resume
Holes (after 16 clean steps): the same plus -Holes "3:S1Q04F;b2:S1Q06F"
Add -WhatIf to any of them to print the command lines with no call and no log write. A real -WhatIf pass on 2026-10-06 01:46 (real launcher, ledger, task list; dummy reader/b4cal): normal 16 lines exit 0; -Resume and -Holes refused (no STEP line); no gsitting.log written.

## Not covered
- No real answers.mjs call: the Gemini key reaching the child, --no-block loading from the flown dist and Start-Process quoting with a real prompts path stay unverified live.
- Hole detection reads the answers store as a JSON object keyed by id (confirmed on a real file's shape); a changed store shape would read every id as a hole.
- Real step durations are unmeasured; the 15-min and 10-min thresholds were calibrated through seams with sleeping stubs.
- The slow-step note does not stop a hung step; there is no watchdog (reviewer I4 option, not requested).
- Resume after a crash of the runner itself between a step's start and end line is covered by a start-only log case, not by killing a live run.
