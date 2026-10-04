# A2 addendum, 22:55 — three more pre-data changes (from the cue-grading re-check S2/S3, which applies here too) + the launcher

G1. One cwd per grader attempt (S2). Every grader attempt (alias probes included) runs with cwd
    `F\grading\<slot>-a<k>\` (e.g. `grading\blind-3.g1-a1\`), created fresh and EMPTY by the launcher, never reused.
    Reason: Claude Code keys auto-memory and claude-mem's project on the cwd; a shared cwd lets a note or an
    observation from grader 1 load into grader 2 (the memory check would then read LOADED and the re-grade would
    load it again). Before each launch the launcher checks that the attempt's projects folder has no non-empty
    `memory\` folder; after the run the memory check runs on that attempt's own transcript as before.
    Calibration before the run: TWO probes in a row from two fresh cwds, each doing one Read of a synthetic file and
    one Write, both reading memory ABSENT (projectMemory=0 claudeMem=0).

G2. The validation Bash, tightened (S3: `process.chdir(path.dirname(process.cwd()))` + a dot-free literal like
    'keyhold' + a read by variable passed the token rule). In an allowed Bash's `node -e` code, in addition to A2.1:
    - no `chdir`, `readdir`, `opendir`, `Dir`, `fs/promises`, `promises`, `dirname`, `resolve`, `join`, `relative`,
      `normalize`, `process.cwd`, `__dirname`, `glob`, `require.resolve`, `eval`, `Function(`, `fromCharCode`,
      `Buffer`, `atob`, `import(`;
    - every `fs.<method>` (or `require('fs').<method>`) call is `readFileSync` or `existsSync`, and its FIRST
      argument is a string literal equal to the grader's own verdicts or own pairs file name (no variable);
    - `process.` appears only as `process.exit` or `process.stdout`/`process.stderr`.
    Anything else flags. The 8 real design-2 s50l grader commands must still read clean (if one does not, report
    which clause it trips — the rule is NOT loosened tonight; the run then waits and this is reported).
    New negative controls: the S3 command; `fs.opendirSync('.')`; `fs.readFileSync(v)` with `v` a variable holding
    the own name; `require('fs/promises')`.

G3. The launcher `R\launch-grader.mjs` (the controller's tool, hashed in §2):
    `node R\launch-grader.mjs <slot> [--attempt k] [--pilot <dir>]` — builds the prompt from the registered h40d
    dispatch text (`SP/validation-hour/h40d-grader-dispatch.txt`, sha f8d64670…) exactly as h40d did (only the
    blind-N / file tokens substituted), creates the fresh cwd of G1, runs
    `claude -p <prompt> --model opus --output-format json` with the minimum tool permissions that let a grader Read
    its pairs file, Write its verdicts file and run its validation Bash (find the flags with `claude --help`; no
    --dangerously-skip-permissions), records {slot, attempt, session_id, model from the JSON, exit, cwd} to
    `R\blind\launches.jsonl`, and prints ids only. `--pilot <dir>` points it at a SYNTHETIC blind folder (made from
    the e2e synthetic data, no real answers) for the pre-run pilot: one pilot grader must produce a valid verdicts
    file, read memory ABSENT, and read clean on the tightened audit. Never more than 2 graders at once.

G4. The user's delegation, 2026-10-03 22:52:10 local, verbatim: "do the run tonight regardless, as long as it's
    verified ready, dont wait for me ok" (F\USER-DELEGATION.txt). It replaces "the user's OK on the filled file
    quoting its hash" (§12.4, A1.6) for THIS run only, by a gate the controller records in run.log before the first
    call: the Opus re-review of this fix round READY (no open Critical or Important); every self-check marker; the
    pilot of G3 passing; day-pre 6.1–6.8 all OK with the quota headroom read; §2 filled and the registration hashed
    with A2 appended. The hash is reported to the user after the run. Any gate failing → nothing runs tonight.
