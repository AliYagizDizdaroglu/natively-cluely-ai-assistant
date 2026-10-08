# Point 15 brief (controller, 23:52 by `date`) — graders get no Bash; point 14 withdrawn

Why (evidence, pre-data, R\run.log to record):
- Point 14's code allowlist cannot be made sound by pattern rules: the engineer found `const a='con',b='structor',k=a+b;
  v[k][k]` and a `.join('')` variant reading CLEAN under it, and the brief's index rule FLAGS 5 of the 8 real s50l
  commands (`v[i.key]`, `c[f+x[f]]`). Point 14 was never merged (work\p14wip only).
- Spike 23:49 (throwaway launcher copy work\lg-nobash-noadd.mjs, synthetic folder work\spike-noadd, attempt 8):
  `--tools Read,Write,Edit` (no Bash) and NO `--add-dir`: session 8a49290e…, claude-opus-5-5, exit 0, ABSENT
  (projectMemory=0 claudeMem=0), tools {Read:3, Write:1} — the rubric file, its own pairs file, its own verdicts file
  (re-read after writing) — verdicts valid on its pairs (4 keys).
- Negative probe 23:50 (work\neg-probe.mjs, same flags): a Read of a file outside the cwd that no allow rule names →
  DENIED by Claude Code (permission_denials lists the Read; session f8d13b32…); a Read of a file inside the (fresh,
  empty) cwd → allowed (session 579c3773…). So with no Bash and no --add-dir, the permission system itself refuses any
  read of a key, answers file, .env or another grader's file; the audit is a second, independent check.

Rule (point 15):
- The launcher runs every grader attempt (pilot and probes included) with `--tools Read,Write,Edit` (no Bash) and
  WITHOUT `--add-dir`; `--allowed-tools` = Read of the own pairs file and of the rubric/grader-instruction file, Edit of
  the own verdicts file; `--permission-mode dontAsk`; `--strict-mcp-config`; cwd = the fresh empty per-attempt folder
  (point 9). Nothing else changes in the dispatch text.
- The audit runs WITHOUT `--allow-validation-bash`: any Bash call flags (the registration's original §1 rule, "any tool
  other than Read/Write", now satisfiable; Edit of the own verdicts file counts as Write); Read only of the own pairs
  file, the rubric/instruction file, or the own verdicts file; Write/Edit only of the own verdicts file; any denied
  call (permission_denials or an is_error permission result) flags; any mcp__* flags.
- Points 10, 13 and 14's code/argument rules are WITHDRAWN (kept in the text as the record); point 14 is never merged;
  point 11's M-a residual is closed (no --add-dir).
Calibration before the gate (into R\audit-graders.point15.out.txt):
- pilot --attempt 2 with the real launcher (gate f): exit 0, ABSENT, PINNED, verdicts valid, audit clean (no Bash),
  dispatch=match;
- the negative probe re-run: outside read DENIED (recorded);
- synthetic transcripts: a Bash call → FLAGGED; a Read of another grader's verdicts / keyhold / answers → FLAGGED; a
  permission denial → FLAGGED; Read of own verdicts → clean.
- The 8 real s50l transcripts are no longer positive controls for the shape (they used Bash under a different launch);
  they are recorded as FLAGGED-by-design under point 15 (a historical shape, not tonight's).
