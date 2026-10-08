# Point 13 brief (controller, 23:32) — the pilot's own-file absolute path

Evidence (pre-data; R\run.log 23:31:59): the pilot grader (session 6441d4bf…, synthetic folder F\pilot-blind, launched by
R\launch-grader.mjs from its fresh cwd grading\pilot-a1\) wrote a valid verdicts file, read memory ABSENT and PINNED
claude-opus-5-5, but the audit FLAGGED its one validation Bash (len 360, sha12 b271cca9e127):
`node -e "const o=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(Object.keys(o).length)" "<ABSOLUTE C:\ path of its OWN verdicts.blind-1.g1.json>"`
— no `cd` (its cwd is the fresh per-attempt folder of point 9, not the blind folder), and an absolute path, which points 1
and 10 ban. Under the rule as written every real grader launched this way would be FLAGGED, re-graded once, flagged again:
nothing decided. The design-2 s50l subagent graders used `cd <blind dir> && node -e` because their cwd was elsewhere;
the per-attempt cwd of point 9 changed the shape the graders produce.

Rule (point 13), exact:
- The allowed validation Bash is `[cd "<dir>" && ] node -e "<code>" [<arg> ...]`.
- `<dir>` (when present) must normalise to the own blind folder.
- Each `<arg>` is a quoted or bare path, absolute or relative to the own blind folder, in any of the forms C:\…, C:/…, /c/…
  (case-insensitive), containing no `..` segment, no glob character (* ? [), no `$`, no backtick; after normalisation it
  must EQUAL the absolute path of the grader's own verdicts file or own pairs file. Anything else flags.
- `<code>` stays under point 10 unchanged (fs calls only readFileSync/existsSync with a literal own-file name or
  process.argv[<digit>] bound to such an `<arg>`; the banned-token list; process.* only exit/stdout/stderr/argv).
- Not loosened: no other file is reachable through an argument; the dispatch text is unchanged.

Calibration before the gate (into R\audit-graders.point13.out.txt):
- the pilot's command (sha12 b271cca9e127) reads clean;
- the same command with its argument replaced by (a) another grader's verdicts file in the same blind folder, (b) a
  keyhold\key file, (c) an R\interview60.answers.* file, (d) MAIN\.env, (e) a `..` path that resolves to its own file,
  (f) a glob `verdicts.*.json` → each FLAGGED;
- the cd form with `<dir>` = another folder → FLAGGED; the 8 real design-2 s50l transcripts still clean;
- then a fresh pilot attempt (pilot --attempt 2) must read clean, ABSENT, PINNED, valid — that is gate (f).
