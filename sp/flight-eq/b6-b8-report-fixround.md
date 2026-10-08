# b6/b8 fix round (2026-10-06 01:03 TST), after b6-b8-review.md

New sha256/12: eq-twins.mjs 592d8cad52f7 (cal b5696850ea11: 108/108, 26/26 mutants); launch-grader-eq.mjs 36a2198eea69 (cal ccb46c34f5b9: 78/78, 25/25 mutants, covers eq-audit f86e6fe1b87c unchanged and dispatch 62c789adbef1 unchanged); eq-merge.cmd 4fe62ce45486; cal scripts 0d396e25ac43 and a7110591e922. This supersedes the shas and totals in b6-b8-build-report.md.

B1 holes gate only 3a; 4b/4c/2b-2d always computed; front 4b FAIL survives front holes, back holes and zero back pairs; -b re-run may only FILL holes (complete original pairs kept; a -b of a hole-free rep refused, naming why). Cases + mutants.
I1 incomplete PAIRS per rep, >= 2 of |G_twin| -> 3a INCOMPLETE (a rep missing 2 of 4 pairs). Case + mutant.
I2 coverage < 90 % with 2c ungated -> 2b INCOMPLETE (ungated TTFT median printed). Cases + mutant.
I3 missing/empty/unparseable gsitting.log refuses (exit 2, names the file); only reps over 15 min ungate 2c. Format: STEP n tag start|end iso, exit=code on end lines. Cases + mutant.
I4 --eval --g must equal the key-file ids, else refuse. Case + mutant.
M1 eq-merge.cmd: copy and judge failures set FAILS (goto labels, because SET resets ERRORLEVEL), COPY-FAILED / MERGE-FAILED, exit 1 after any failure; in-app copy failure exits 1 at once. Three cases + three mutants. (My first version lost the failure to SET resetting errorlevel; the new cases caught it.)
M2 empty answer = {0,2,0}: wrong, not off-topic (never graded, so no grader on_topic). Case + mutant.
M3 written down: the eq-gsitting re-run must use --only <G_twin> (or the holes ids); loadStores uses only the hole ids' pairs either way.
M4 sitting check: exit codes, step order, duplicates, numbering, counterbalanced order (A3.4). Cases + mutants.
M5 probe 2/3 also need the previous probe's pinned model and memory ABSENT; a rate-limited attempt (no model, no tool call) is labelled "consumes no replacement". Cases + mutants.
M6 exit codes: --eval exits 0 even with clause-level INCOMPLETE/FAIL (read the lines), 3 for a missing verdicts file, 2 for refusals. M7 left as is.
Not changed: I5 (needs a controller note and instruments lines). gsitting format now pinned to the controller's description, not to the built tool.
