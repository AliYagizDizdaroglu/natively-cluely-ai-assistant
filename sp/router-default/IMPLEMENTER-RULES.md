# Implementer rules (router-default SDD) — read before your task

- Your requirements are the plan's section for your task in `LAB\PLAN.md` (rev 2) plus its "## Global Constraints"
  (lines 27-105) and "## Review Focus" (208-219). Read those sections fully; exact values come only from the plan.
  LAB = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\router-default`. Spec: `LAB\SPEC.md`.
- Work ONLY in your lane's worktree (named in your dispatch). Write/Edit may refuse worktree paths: write files under
  `LAB\stage\<task-id>\<repo-relative path>` then `node LAB\apply-stage.mjs <task-id> <worktree path with forward slashes>`.
- Test first: write the failing test, run it, watch it fail for the right reason (not just "module not found" — stub
  first if the module is new, per plan rev 2 I4), then implement, then pass. Run tests from a temp cwd:
  `node "<WT>\node_modules\vitest\vitest.mjs" run --root "<WT>" <files>`.
- NEVER run the full suite or `npm run build:electron` — the controller does (one at a time machine-wide).
  You MAY run `tsc` on your worktree (both configs; electron config has 6 pre-existing errors — introduce none).
- Commit in your worktree's branch with explicit paths only: `git -C "<WT>" add <paths>` then
  `git -C "<WT>" commit -m "<msg>" -- <paths>`; message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `git add -A`, never stash, never touch MAIN's branch,
  never push. Use PowerShell for git if Bash refuses `git -C`.
- Never start the app, never touch scheduled tasks, never make a model call (no Gemini/Live call — Task 3's probe
  is the controller's scheduled task), never print keys, captured prompts or answer text.
- Do not dispatch subagents. Do not review yourself into "done": report and stop.
- Report: write the full report to `LAB\reports\task-<N>-report.md` (create the folder with node if needed): files,
  commits (sha), tests (names, counts, the RED you saw and why), tsc result, deviations from the plan with reasons,
  concerns. Final message: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), commit shas, one-line test
  summary, concerns.
