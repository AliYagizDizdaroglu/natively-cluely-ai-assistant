## AMENDMENT A2 (2026-10-03 22:16 local, revised 22:21, revised 23:02, revised 23:33, revised 23:35, revised 23:38, revised 23:52; replaces the 22:05 draft) — grader audit as an ALLOWLIST, the §6 departure rule, the A1 hard stop in the runner, empty streams, graders.json derivation, the prep review's C1 + Minors; one cwd per grader attempt, the tightened validation Bash, the launcher, and the user's delegation in place of the OK (points 9–12, 23:02); the validation Bash's own-file argument by absolute path (point 13, 23:33); the validation code as an ALLOWLIST and the `--add-dir` residual (point 14, PREP-REVIEW-3's I-1, I-2, M-a, 23:35); graders get no Bash and no `--add-dir`, the audit returns to §1's original rule, points 10, 13 and 14's code/argument rules withdrawn, M-a closed (point 15, 23:52); revised 2026-10-04 00:18 on PREP-REVIEW-4 (READY WITH FIXES): I-1 by the text route — gate 12(c)'s default-mode controls are `R\audit-graders.point15.out.txt` plus the pilot's attempt 2, `negative-control.out.txt` is the WITHDRAWN-mode record only; M-2 superseded markers on points 1(c) and 11(c); M-1, M-3, M-4 ruled accepted residuals in point 15; revised 2026-10-04 00:23 (point 16): gate (c)'s self-checks that verify §2 run with `TURN_PREREG` = `section2-filled.md`, regenerated first — the 00:22 `GATE FAILED (A2.12 c)` was the controller's invocation, not a check's verdict; voided, the gate re-run WHOLE from (a)

Rules on every registration-level point of `PREP-REVIEW-2.md` (Opus, READY WITH FIXES, C1 C2 I1–I4 M1–M10) and, from 23:02, on the
cue-grading re-check's S2/S3 (`..\cue-grading\PREREG-REREVIEW-5.md`, which applies to this registration's graders as well) and on the
user's 22:52:10 delegation. Pre-data: `R/` holds no `interview60.answers.*` file, no blind file, no verdict; no call of this replay has
been made (6.1). Every harness change below is made by the engineer from this text, then §2 is re-filled and every self-check re-run before
the gate of point 12 (which replaces the user's OK of §12.4 for THIS run; every "before the OK" in points 1–8 reads "before the gate").
"Blind folder" = `R/blind/` (`R/blind-rerun/` for the s50k re-run); the graders are dispatched from it; N = the file number, X = g1|g2;
"attempt" = one launched grader session (pilot, probe, grader or replacement), k = its attempt number.

1. **Audit rule — allowlist (replaces §1's "any tool other than Read/Write" and the 22:05 denylist; I2).** Kept from 22:05: h40d's
   dispatch text (verbatim, unchanged) leads every Opus grader to one validation Bash after writing — `R\audit-graders.out.txt` shows all
   8 design-2 s50l graders (addb84e6…aa85ea6f…) FLAGGED `Bash x1` under §1 as written, so §1 would decide nothing. The audit runs as
   `audit-graders.mjs --allow-validation-bash --session/--projects blind-N.gX=<agent>…`; under the flag a grader is clean iff EVERY tool call
   is one of: (a) Read whose `file_path`, resolved against the blind folder, is exactly `./pairs.blind-N.json` (own; derived as
   `pairs.blind-N.json`, never a string replace of the verdicts name) or exactly the grader-instruction file the dispatch names
   (`<MAIN>/electron/test/golden/interview60.grader-prompt.md`, compared as a normalized absolute path); (b) Write or Edit whose
   `file_path` resolves to exactly `./verdicts.blind-N.gX.json` (own); (c) Bash of the exact shape `cd "<own blind folder>" && node -e "<code>" [<arg>…]`
   (the `cd` part optional; its target, normalized, must equal the own blind folder; each trailing `<arg>`, normalized, must equal the own
   verdicts or own pairs file — real s50l graders passed the own verdicts path this way (section C: 4 of 8) and read it as
   `process.argv[1]` (3 of 8 by a 23:01 count of their commands); the code rule is tightened further by point 10, 23:02; from 23:33 the
   shape of each `<arg>` — absolute `C:\…`, `C:/…` or `/c/…` as well as relative to the own blind folder, and `cd` absent when the cwd is
   point 9's attempt folder — is the one point 13 states, which decides every `<arg>`; "no absolute path" below binds `<code>`, not `<arg>`) where
   `<code>` satisfies ALL of: its string-literal
   file-name tokens form a subset of {`verdicts.blind-N.gX.json`, `pairs.blind-N.json`}; no glob character `*` `?` `[`; no `$`, no backtick,
   no template literal, no `+` adjacent to a string literal, no `path.join`/`path.resolve`/`readdir*` with any non-literal argument; no
   `require(`/`import(` of anything but `'fs'`, `'node:fs'`, `'path'`, `'node:path'`; no `process.env`; no `http`, `https`, `net`,
   `child_process`, `fetch`, `curl`, `wget`; no `..`, no `~`, no absolute path. **Superseded by point 15 (23:52):** the audit runs
   WITHOUT `--allow-validation-bash`; graders have no Bash. Anything else FLAGS: any other tool (Grep, Glob, Agent,
   WebFetch, …), any `mcp__*` call, any Read/Write/Edit/Bash outside (a)–(c); one failing call flags the grader whatever its other calls.
   Without the flag the audit keeps §1's text. graders.json records each allowed Bash command's length and sha12 for a human spot-read.
   **Calibration before the OK**, each line into `run.log` with its command, output `R\audit-graders.negative-control.out.txt`: the 8 real
   s50l transcripts above read clean under the flag; the prep review's 8 bypass commands (I2 list 1–8: `.env`, `R-key*/k*-1.json`,
   `../interview60.ans*`, `readdirSync('..')` + concatenation, `../../PREREGISTER-turn-followup.md`, `../run.log`, `verdicts.blind-1.g?.json`,
   `fetch('ht'+'tps://…')`) and its 5 out-of-scope Read/Write calls (Read `.env`, the registration, `R/run.log`, `R/s50m-gated-turn.json`;
   Write `blind/graders.json`) each read FLAGGED as `file:` transcripts; `cat verdicts.blind-1.g1.json pairs.blind-2.json` FLAGGED; the
   real shape (own verdicts + own pairs, nothing else) clean. The same cases live in `grader-session-calibrate.mjs` section C. **Residual,
   stated (revised 23:02):** the audit detects, it does not prevent. The launcher of point 11 gives each grader the minimum permission
   set (Read, Write, Bash), so a tool outside that set is denied before it runs — but the permission system does not read the code
   inside an allowed Bash, so within (c) a grader could still read what the code rule forbids and be caught only afterwards; under
   point 2's departure (not in force) the graders would run with the controller's whole permission set. A flag's consequence is §1's
   (reported not decided, ONE re-grade, then decided). Nothing in this point changes the dispatch text or the rubric.
2. **The §6 grader-memory departure (C2) — the rule that applies IF the user accepts it.** The user has not answered. The controller asks
   before any call and records the verbatim answer and its time as a dated §3 note; an acceptance note carries the marker text
   `DEPARTURE-S6-ACCEPTED` on its first line. Under the departure: graders are Opus subagents of the controlling session (design 2's way);
   `check-grader-memory.mjs` still runs on all 18 transcripts and its result is recorded; project-memory LOADED is EXPECTED, is NOT a flag
   and triggers NO re-grade; claude-mem context markers (group B, 0 on the probe a9d35e8d) and any `mcp__*` call or audit FLAG keep §1's
   consequence. `legs-decide.mjs` accepts a `memory: LOADED` slot only when `graders.json` carries `departure: true` AND the registered file
   (the hash-pinned one, `PREREG`) contains `DEPARTURE-S6-ACCEPTED`; a departure label without the note, or a LOADED slot without the
   label, is refused as today (`REPORTED, NOT DECIDED`). The first line of `RESULT-front-back.txt` and of the result note reads
   `GRADERS LOADED PROJECT MEMORY (departure from spec §6, §3 note <date time>)`. The controller writes no memory, MEMORY.md or agenda
   line about this run's arms, label, bars, expectations or outcome until all 18 verdict files exist (every grader loads that index).
   If the user declines: the run waits for the outside-cwd session (OAuth re-login), §1 and §6.0 apply unchanged, nothing else changes.
   **Revision 22:21:** at 22:19 the user re-logged the CLI and the outside-cwd alias probe from `F\grading\` succeeded (session
   `011ca16e-5258-4124-92fb-3ea525dc85a7`, model `claude-opus-5-5`, result OK; its slug folder holds an EMPTY `memory\`), so §6.0 is
   provable and the departure is NOT needed tonight: this point stays as written, conditional and unused unless the outside session
   fails on the day; graders run under §1 and §6.0 as registered — from 23:02 each attempt from its own fresh cwd `F\grading\<slot>-a<k>\`
   (point 9), not from the shared `F\grading\`. **Revision 23:02:** under point 12 nobody is there to answer the departure question
   tonight, so `DEPARTURE-S6-ACCEPTED` cannot be written for this run: an outside-cwd or launcher failure on the day is a failed gate
   (point 12, "nothing runs tonight"), never a departure; the departure stays available only to a later run the user answers for.
3. **Hard stop in the runner (A1.7 made mechanical; I1).** Cutoff `2026-10-04T06:30:00Z` (09:30 local), hard-coded for the primary hours
   (`--stop-at` overrides for the re-run only). Per-call timeout 120 s on the whole request + stream (`AbortSignal.timeout(120000)`): a
   timed-out call is a transient inside the registered 5-attempt budget (§1: 429/5xx retried up to 4 times) — 120 s is four times the
   largest stall any registered read names (h40b 29.9 s; clause 3c's bar is 10 s), so no registered measurement is truncated by it. Before
   each call the runner refuses to START it when now + 120 s ≥ cutoff, logs `STOPPED AT HARD STOP <leg> <slots not made>` to `run.log`,
   writes `R/STOPPED-<leg>.txt` and exits non-zero; a pass still incomplete at 09:30 for any reason gets the same marker from the
   controller. Every record carries `end = at + total`. The blind builder and `legs-decide.mjs` refuse (no VOID, no clause line) when any
   `R/STOPPED-*.txt` exists or any record's `end` ≥ cutoff. Stopped records are never graded: `day-steps.mjs stop-archive` moves every
   `interview60.answers.*_fturn-*` file, the markers and the pass stdout to `R/stopped-<YYYYMMDD-HHMM>/` before the fresh passes A1.7
   names (after 10:00, original §6.7); 6.1's listing of `R/` is then empty of answer files again.
4. **Empty stream (I3).** A stream that ends with no text and no `finishReason` is a transient, never an answer: retried within the same
   5-attempt budget like a 503 (the retry on `finish === null` no longer requires `spoken`); if the budget is exhausted the record is
   `transientError: 'empty stream (no text, no finishReason)'` and the pair is incomplete, excluded and named, as registered. A stream with
   a `finishReason` and an empty filtered answer stays a real 0/0/0 (§5). A cut stream WITH text keeps its one extra try, as today.
5. **graders.json is derived, not typed (I4).** The controller runs the three tools once each over all 18 slots, tags = slot names, and
   keeps their stdout as `R/blind/graders.models.out.txt` (`h40d-grader-models.mjs`), `R/blind/graders.memory.out.txt`
   (`check-grader-memory.mjs`) and `R/blind/graders.audit.out.txt` (`audit-graders.mjs --allow-validation-bash`). `legs-decide.mjs` parses
   the `<tag>: …` lines of those three files and refuses on any disagreement with `graders.json`'s `model`, `memory` (both groups
   recorded: `projectMemory`, `claudeMem`) and `audit`; it requires the slot names to equal exactly {`blind-1`…`blind-9`} × {`g1`,`g2`}
   (`blind-1`…`blind-5` for the re-run), each slot naming its `agent`; a replacement is `replaced: [<agent id>]` whose own lines
   (tag `blind-N.gX.replaced`) must appear in the three files with the flag or marker that justified it. From 23:02 each slot also
   carries `attempt` and `cwd`, and `agent` must equal the `session_id` of a `launches.jsonl` line with `exit: 0` (point 11); a
   replaced agent needs its own line there too.
6. **C1 and the Minors — one ruling each.** C1: fixed — `runner-selftest.mjs` r0 copies the registered file to TMP with every 64-hex hash
   stripped and asserts REFUSED on the copy; both self-tests default `TURN_PREREG` to the registered file and `day-pre.mjs` passes it
   explicitly; 6.5 re-run on the filled registered file before the OK. M1: fixed — two §2 rows, `MAIN electron/test/golden/interview60.judge.mjs`
   and `SP/validation-hour/h40d-grader-dispatch.txt` (sha256 f8d64670…81cd, 9,064 bytes), verified by the runner, blind builder,
   `check-grader-questions.mjs` and decide; the audit checks each grader's first user message against the dispatch text (calibrated: 8/8
   s50l transcripts match, a one-word change does not). M2: fixed — day-pre derives the quota start as the latest 07:00Z ≤ now (under A1
   tonight = `2026-10-03T07:00:00.000Z`), computes headroom per model from the ledger and stops below 290 / 98. M3: fixed — answer files
   written to `.tmp` then `renameSync`. M4: fixed — self-tests write only to TMP and delete in `finally`; `day-steps decide` lists `R/`
   and `R/scripts` first and refuses on any unlisted `.mjs` without printing VOID. M5: fixed — when `RESULT-front-back.txt` already holds a
   `DECISION:` line, decide never prints VOID; a hash mismatch is reported as `INCIDENT:`. M6: fixed — day-pre requires exit 0 on every
   step and all three per-hour PARITY lines. M7: fixed — Retry-After honoured (capped 60 s); the 5-attempt budget stays as registered, a
   cut stream's extra try counts inside it (accepted: the budget is the registered one). M8: fixed — `--leg back` refuses unless all 20
   front files exist. M9: fixed — the §12.4 diff check accepts §2's "Gated block hashes" table; the DRAFT block of `section2-filled.md` is
   moved into §3 as the dated I3 note (s50k gated set, D-cases, overlap S2Q06F/S1Q05F) before the file is hashed. M10: accepted as a
   residual (84/84 design-2 records carried `thoughts`); if a front null refuses the decision the result note says so.
7. **Why pre-data, and what does not move.** No call, answer, blind file, key, verdict or decision exists; every change is to the harness's
   refusals, labels and timing, calibrated on synthetic or already-recorded transcripts. No prompt, pair set, arm bytes, model, thinking
   level, bar, clause, seed, grading text or dispatch text changes; A1 stands; the §2 hashes of changed harness files are re-taken by
   `fill-section2.mjs` and the diff rule (m3) applies to the registration as before. A2 applies under either answer to point 2. Points
   9–12 (23:02) are pre-data on the same facts: they change where a grader session runs, what its validation Bash may contain, how it is
   launched, and who says "go" — not what it grades.
8. **Memory-check marker and transcript locator (revision 22:21, pre-data).** `check-grader-memory.mjs` reads the 22:19 probe LOADED on
   "project-memory markers: 4 hits in 1 distinct [MEMORY.md x4]; claude-mem 0": all 4 are the generic auto-memory instructions every
   session receives ("add a one-line pointer in `MEMORY.md` …"), while the project markers ('Memory Index', the memory file names, the
   `-natively-cluely-ai-assistant/memory` path) read 0 — so `MEMORY.md` is a non-distinctive marker that would mark every grader LOADED.
   Rule: `MEMORY.md` is dropped from `PROJECT_MEMORY`; 'Memory Index' stays (0 hits in the probe's generic text). Re-calibration before
   the OK, recorded in `R\check-grader-memory.probe2.out.txt` with its command: `a9d35e8deacac3eff` still LOADED, probe `011ca16e…`
   ABSENT, the existing removed-effect copies still ABSENT. The locator: the outside session's project slug is truncated with a hash
   suffix (`…scratchpad-followup-7potx7\011ca16e-….jsonl`), so `h40d-grader-models.mjs`, `check-grader-memory.mjs` and `audit-graders.mjs`
   must find a `session:<uuid>` by session id across every folder under `--projects` (or the controller passes `file:<path>`); paths
   handed to node are `C:/…` form, never Git-Bash `/c/…`. The grader transcript on the day is a top-level session file per grader
   (`<slug>/<session>.jsonl`), as §1 already says; the tag stays the slot name. From 23:02 every attempt has its OWN slug folder
   (point 9), so the by-id search across every folder under `--projects` is the only locator that works; nothing else here changes.
9. **One cwd per grader attempt (23:02; S2 of the cue-grading re-check, G1; supersedes the single `F\grading\` of §6.0, point 2 and
   point 8).** Pre-data. **Why:** Claude Code keys auto-memory and claude-mem's project on the cwd, so every session launched from
   `F\grading\` shares ONE project slug (`…scratchpad-followup-7potx7`). A note one grader writes into that slug's `memory\` (itself a
   Write outside the allowlist, so a FLAG) would load into every later session — its own re-grade and the other files' graders — and
   after point 8 `check-grader-memory.mjs` reads such a note as ABSENT (it matches none of the project markers); a claude-mem observation
   of one grader's tool calls would load into the next session as `[grading] recent context`, read LOADED, void every later grader and
   spend the ONE re-grade. Neither channel has been exercised: the 22:19 probe made no tool call, and no session has yet followed a
   tool-using one in the same slug. **What changes:** every attempt — the cwd probes, the pilot, each of the 18 graders (10 for the
   re-run), each replacement — runs with cwd `F\grading\<slot>-a<k>\` (`F\grading\blind-3.g1-a1\`; a replacement is `-a2`; the pilot
   `pilot-a<k>`; the probes `cwdprobe-1-a1`, `cwdprobe-2-a1`), created by the launcher (point 11) with a `mkdirSync` that refuses an
   existing path, empty, never reused. Before the launch: if `C:/Users/sotka/.claude/projects/` already holds a folder whose name begins
   with that cwd's slug prefix (the path with every non-alphanumeric character replaced by `-`, as the 22:19 probe's folder shows), it must
   hold no `.jsonl` and no non-empty `memory\`, else the launcher refuses. After the attempt: the locator (point 8) finds the session by
   id; its slug folder must hold exactly ONE top-level `<session>.jsonl` (this attempt's) and no non-empty `memory\`; both facts go into
   `launches.jsonl` (`slugJsonl: 1`, `memoryDir: 'absent' | 'empty'`), and a slot whose line reads otherwise is reported, not decided
   (§1's consequence, ONE re-grade in a fresh `-a2` cwd). The memory check still runs on each attempt's own transcript; project-memory
   LOADED keeps §1's consequence (point 2's departure is not in force). The dispatch text, the blind folder and the verdicts path do not
   change: graders read and write `R/blind/…` by the absolute paths the dispatch names, whatever their cwd. **Cost:** ~22 folders under
   `F\grading\` and as many project slugs (left in place as evidence; never deleted before the result note); nothing else.
   **Calibration before the gate**, output `R\grader-cwd.probes.out.txt` with every command: TWO probes in a row through the launcher
   (`launch-grader.mjs cwdprobe-1 --probe` then `cwdprobe-2 --probe`; the second starts only after the first's transcript shows its Read
   and its Write), each from its own fresh cwd, each prompt = one Read of the synthetic file `F\grading\probe-input.txt` and one Write of
   `<own cwd>\out.txt`, same binary, flags and permission set as a grader; `check-grader-memory.mjs` must print
   `cwdprobe-1: ABSENT projectMemory=0 claudeMem=0` and `cwdprobe-2: ABSENT projectMemory=0 claudeMem=0`, `h40d-grader-models.mjs`
   PINNED `claude-opus-5-5` on both, and each slug folder must hold exactly one `.jsonl`. A LOADED on `cwdprobe-2` is the carry-over this
   point exists to catch: nothing runs tonight, the transcript is kept and reported. **Not shown:** a carry-over channel not keyed on
   the cwd (none is known; auto-memory and claude-mem both are) and a claude-mem observation that needs more than one tool-using
   session to form — the two-probe sequence is the smallest sequence that can show the second channel at all.
10. **The validation Bash, tightened (23:02; S3 of the cue-grading re-check, G2; sharpens point 1(c)'s code rule).** Pre-data. **Why:**
   the re-check built, on paper, `process.chdir(path.dirname(process.cwd()))` + the dot-free literal `'keyhold'` + `readdirSync` + a
   read by variable: no file-name token, no glob, no `+`, no `..`, no `~`, no absolute path, only `fs`/`path` required — it passes point 1(c)
   as written and reads every key file, and with `path.parse(process.cwd()).root` and dot-free folder names it reaches any file on the
   disk. **What changes — in `<code>`, in addition to point 1(c):** (i) none of the tokens `chdir`, `readdir`, `opendir`, `Dir`,
   `fs/promises`, `promises`, `dirname`, `resolve`, `join`, `relative`, `normalize`, `process.cwd`, `__dirname`, `glob`, `require.resolve`,
   `eval`, `Function(`, `fromCharCode`, `Buffer`, `atob`, `import(` may appear anywhere in the code — matched as case-sensitive substrings,
   string literals included (so point 1(c)'s "`path.join`/`path.resolve` with a non-literal argument" becomes an outright ban on both);
   (ii) every `fs.<method>(` or `require('fs').<method>(` call is `readFileSync` or `existsSync`, and its FIRST argument is either a string
   literal equal to the own verdicts or own pairs file name, or `process.argv[<digit>]` where that trailing argument (point 1(c); from
   23:33 an `<arg>` admitted by point 13, absolute or relative) resolves
   to the own verdicts or own pairs file — no other variable, no expression; (iii) `process.` appears only as `process.exit`,
   `process.stdout`, `process.stderr` or `process.argv[<digit>]`, and `require(` only of `'fs'`, `'node:fs'`, `'path'`, `'node:path'` or
   `process.argv[<digit>]` (a real s50l grader's `require(process.argv[1])` of its own verdicts). Anything else FLAGS (§1's consequence).
   **Where this departs from the brief:** G2 as briefed said "no variable" and `process.` only as exit/stdout/stderr; 3 of the 8 real
   s50l graders read the own verdicts path from a trailing argument as `process.argv[1]` (two by `readFileSync(process.argv[1])`, one by
   `require(process.argv[1])`; counted 23:01 over their 8 commands, which carry NONE of the tokens banned in (i)), so that rule would fail
   its own positive controls before any run. The registered rule admits exactly that form, because the
   audit checks a trailing argument as it checks a literal (normalized path equal to the own file) and the S3 bypass needs `chdir`,
   `process.cwd` or `readdir`, all banned. No other loosening; the rule is not loosened after calibration either. **Calibration before the
   gate**, in section C and a re-generated `R\audit-graders.negative-control.out.txt` with the commands: the 8 real s50l transcripts
   (addb84e6…aa85ea6f…) clean under the tightened rule — if one trips a clause, run.log names the clause and the grader, the rule stands,
   nothing runs tonight and the user is told; new negative controls, each FLAGGED naming its clause: the S3 command verbatim;
   `fs.opendirSync('.')`; `const v='verdicts.blind-1.g1.json';fs.readFileSync(v,'utf8')` (the own name by variable); `require('fs/promises')`;
   `path.dirname(process.cwd())` alone; `fs.readFileSync(process.argv[1])` with a trailing argument that is NOT the own file (already in
   C, kept). Positive controls: the point 1 real shape; the trailing-argument shape with the own verdicts; `require(process.argv[1])` with
   the own verdicts. **Cost:** a grader whose validation uses a banned token for an honest reason (`path.join('.', 'verdicts…')`) is
   flagged and re-graded once — a false positive bounded by the 8/8 calibration; a grader is never prevented from validating, since the
   literal form always passes. **Not shown:** a bypass that uses none of the banned tokens and no computed string — none is known; the
   audit still detects rather than prevents (point 1's residual). **Revision 23:35:** the "none is known" above was wrong by 23:45 of the
   controller's clock — PREP-REVIEW-3's I-1 built one (`globalThis['req'+'uire']`, a loader reached through a run-time name on a global
   object, which names neither `fs` nor `require` and carries no banned token). This point's banned-token list (i) and its clauses (ii)–(iii)
   are REPLACED by the code ALLOWLIST of point 14, which is strictly tighter (every code this point flags, point 14 flags; the positive
   controls here stay its positive controls); point 10's calibration, its trailing-argument admission and "never loosened" carry over to
   point 14 unchanged. A reader applies point 14's rule to `<code>`; this point stays as the record of why.
   **WITHDRAWN by point 15 (23:52):** graders run with no Bash, so no `<code>` rule applies to anything; this point stays as the record.
11. **The launcher (23:02; G3).** `R\launch-grader.mjs`, the controller's tool, a new §2 row (`fill-section2.mjs` adds it; `day-steps decide`
   lists it with the other `R/` tools; `legs-decide.mjs` verifies the row). Usage `node R\launch-grader.mjs <slot> [--attempt k] [--pilot <dir>]
   [--probe]`. It (a) builds the prompt from the registered h40d dispatch text (`SP/validation-hour/h40d-grader-dispatch.txt`, §2 row,
   sha256 f8d64670…81cd, 9,064 bytes) exactly as h40d did — only the blind-N / file-name tokens substituted — so the audit's dispatch check
   (point 6 M1) reads `dispatch=match` on every attempt; (b) creates the fresh cwd of point 9 and runs the pre-launch check there;
   (c) runs `claude -p <prompt> --model opus --output-format json` from that cwd with the MINIMUM permission set that lets a grader Read
   its pairs file and the grader-instruction file, Write its verdicts file and run its validation Bash — the exact flags are found with
   `claude --help`, recorded verbatim in run.log at the pilot, and are byte-identical for every attempt; never `--dangerously-skip-permissions`;
   a call the permission set denies is still an attempt in the transcript and is audited as such — **Superseded by point 15 (23:52):**
   the audit runs WITHOUT `--allow-validation-bash`; graders have no Bash; (d) appends ONE line
   `{slot, attempt, session_id, model, exit, cwd, startedAt, endedAt, slugJsonl, memoryDir}` to `R\blind\launches.jsonl` (`R\blind-rerun\`
   for the re-run; a pilot's or probe's to `<pilot dir>\launches.jsonl` / `R\grader-cwd.launches.jsonl`); (e) prints ids only — never a
   question, an answer, a verdict or the prompt. **The pilot:** `--pilot <dir>` points it at a SYNTHETIC blind folder built from
   `e2e-synthetic.mjs`'s data (no real answer; nothing under `R/blind/`); one pilot grader (slot `pilot`, cwd `pilot-a1`) must produce a
   verdicts file that `legs-decide.mjs`'s verdict reader accepts on the synthetic pairs, read PINNED `claude-opus-5-5`, read
   `ABSENT projectMemory=0 claudeMem=0`, read clean under point 10 with `--blind-dir <pilot dir>`, and `dispatch=match`. The pilot IS the
   §1/§12.6 throwaway alias probe: its model field is the alias read before the graders, and a different alias → STOP as registered.
   **Concurrency:** never more than 2 attempts at once (the 18 graders run as 9 rounds of 2, the re-run's 10 as 5). `legs-decide.mjs`
   refuses a slot whose `agent` has no `launches.jsonl` line with `exit: 0`, and a `replaced` agent must have its own line (point 5).
   **Cost:** one new harness file whose only failure before data is a pilot that fails (nothing runs); after data, a launcher that
   mislabels a slot is caught by the three derived files (point 5) disagreeing with `graders.json`. **Not shown by the pilot:** a real
   file's size (24 answers against the synthetic's) and the Opus side's load at 18 graders — a grader that dies or writes an incomplete
   file is the registered replace-ONCE case, in a fresh `-a2` cwd. **Residual M-a (PREP-REVIEW-3, accepted; revision 23:35):** the
   permission set of (c) grants the blind folder by `--add-dir <blind dir>`, so a grader can Read ANY file under `R/blind/` — another
   file's pairs, another grader's finished verdicts, `launches.jsonl` — without a permission prompt; such a Read is outside point 1(a) and
   the audit FLAGS it (detects, does not prevent — point 1's residual, restated here for the folder the permission set opens). To take
   the one such read that could matter away before it is possible, the controller launches a file's g1 and g2 TOGETHER in the same round
   (the 2-at-once ceiling above is exactly one file's two graders), so neither can read a sibling's finished verdicts before writing its
   own; the round order is `blind-1` … `blind-9` (`blind-1` … `blind-5` for the re-run), and `launches.jsonl` shows each pair's two
   `startedAt` within the same round. A finished verdicts file of an EARLIER round is readable by a later grader of a different file; that
   read is still a FLAG and the files differ, so it moves nothing it could not have moved by reading its own pairs. **Revision 23:52
   (point 15): M-a CLOSED** — the launcher passes no `--add-dir`, so a Read under `R/blind/` of anything but the own pairs and own
   verdicts files is denied before it runs (point 15's negative probe, session `f8d13b32…`), not caught afterwards; the paired-round
   order above stays as written (it costs nothing and keeps `launches.jsonl` readable).
12. **The user's delegation replaces the OK for THIS run (23:02; G4).** The user's decision, 2026-10-03 22:52:10 local, verbatim
   (`F\USER-DELEGATION.txt`): "do the run tonight regardless, as long as it's verified ready, dont wait for me ok". **What changes:**
   §6.1's and §12.4's "the user's explicit OK on THIS file with §2 filled, quoted with its time" and A1.6's "the user's OK on the filled
   file quoting its hash" are replaced, for this run only, by the gate below; "before the OK" in points 1, 2, 6 and 8 reads "before the
   gate"; point 2's departure question has no answerer tonight (revision there). The re-run keeps the original §12.4. **The gate** —
   every line below in `R/run.log`, in this order, each with its full command, all before the runner's first `FIRST CALL` line, followed
   by the controller's single line `GATES PASSED (A2.12 a-h) hash <sha256>`:
   (a) `USER DELEGATION 2026-10-03 22:52:10: "do the run tonight regardless, as long as it's verified ready, dont wait for me ok"`.
   (b) the Opus re-review of this fix round (A2 points 1–12 against the harness and the filled §2; from 23:33 point 13 as well, in the
       numbered successor that follows it), file `F\PREP-REVIEW-3.md`: its
       verdict line reads `READY` with no open Critical or Important — any C/I item it raises is fixed and marked fixed by the reviewer
       in that file or a numbered successor (`PREP-REVIEW-4.md`, …), the last of which reads READY; each Minor is ruled by id in run.log
       (fixed / accepted residual). Line: `PREP-REVIEW-<n> READY: <its verdict line verbatim>`. A harness edit after this line needs a
       reviewer re-check of that edit in a numbered successor before (g). **Revision 23:35:** `PREP-REVIEW-3.md` read READY WITH FIXES
       (I-1, I-2, M-a; points 13–14 and point 11's residual answer them), so the gate line is `PREP-REVIEW-4 READY: <its verdict line
       verbatim>` from the scoped Opus re-check `F\PREP-REVIEW-4.md` of points 13–14 and the harness edits they caused, taken before (g);
       that re-check READS the frozen identifier set printed in `R\audit-graders.point14.out.txt` and says so (point 14(a), the
       "door" residual); M-a is ruled `accepted residual` by id in run.log. **Revision 23:52 (point 15):** the gate line is
       `PREP-REVIEW-4 READY: <its verdict line verbatim>` from the scoped Opus re-check `F\PREP-REVIEW-4.md` of points 13–15 and the
       harness edits they caused (the launcher's tool set and flags, the audit without `--allow-validation-bash`, section C re-cut),
       taken before (g); point 14 is withdrawn and never merged, so there is no frozen identifier set to read and no
       `R\audit-graders.point14.out.txt`; M-a is ruled `closed (point 15)` by id in run.log, not `accepted residual`.
   (c) the self-checks on the final harness, each with its command: `EARLIER-QUESTION REF TESTS: <n> passed`; `CALIBRATION OK` from
       `legs-decide.mjs --calibrate`; `EVERY MUTANT CAUGHT`; `E2E OK`; `RUNNER SELF-TEST OK`; `GRADER-SESSION CALIBRATION OK` (section C
       holding point 1's controls, point 10's new ones and the 8 real s50l graders clean; section B the probe2 lines); the re-generated
       `R\audit-graders.negative-control.out.txt` (points 1, 10), `R\audit-graders.point13.out.txt` (point 13, from 23:33),
       `R\audit-graders.point14.out.txt` (point 14, from 23:35; holds the frozen identifier set) and
       `R\check-grader-memory.probe2.out.txt` (point 8) named with their commands. **Revision 23:52 (point 15):**
       `R\audit-graders.point15.out.txt` (point 15) is named with its commands IN PLACE OF the point 13 and point 14 outputs (both rules
       withdrawn; the point 14 file never existed; a point 13 file, if present, is kept as the record and decides nothing); section C
       holds point 15's controls (the 8 real s50l graders FLAGGED-by-design, the spike transcript and the pilot clean) instead of
       "the 8 real s50l graders clean"; `R\audit-graders.negative-control.out.txt` is re-generated WITHOUT `--allow-validation-bash`
       (point 1's 8 bypass commands FLAG as Bash, its 5 out-of-scope Read/Write calls FLAG on path, as before).
       **Revision 2026-10-04 00:18 (PREP-REVIEW-4's I-1, the text route the reviewer offered):** the default-mode (point 15) audit
       controls of this gate are the ones in `R\audit-graders.point15.out.txt` — `grader-session-calibrate.mjs` section F, 35 cases,
       including the real spike `8a49290e…` CLEAN, the real negative probe `f8d13b32…` FLAGGED, and the synthetic Bash / other-file /
       denial cases FLAGGED — plus the real pilot attempt 2 (session `fde64205-5ecf-4ccf-ae04-7ec369464ddf`: audit clean, `bash=[]`,
       `dispatch=match`, ABSENT, PINNED). `R\audit-graders.negative-control.out.txt` (section C, flag mode) is kept as the
       WITHDRAWN-mode record only and is not an input to this gate (c); the preceding sentence's "re-generated WITHOUT
       `--allow-validation-bash`" is replaced by this one.
   (d) the §6.0 proof lines: `011ca16e-5258-4124-92fb-3ea525dc85a7` PINNED `claude-opus-5-5`; `probe2: ABSENT projectMemory=0 claudeMem=0`;
       `a9d: LOADED`.
   (e) the cwd probes (point 9): `cwdprobe-1: ABSENT projectMemory=0 claudeMem=0` and `cwdprobe-2: ABSENT projectMemory=0 claudeMem=0`,
       output `R\grader-cwd.probes.out.txt`, both slug folders holding one `.jsonl`.
   (f) the pilot (point 11) — from 23:33 the pilot's attempt 2 (`launch-grader.mjs pilot --attempt 2`, cwd `pilot-a2`, point 13), run
       after the point 13 calibration of (c), since attempt 1 (session `6441d4bf…`) read FLAGGED under the rule as written at 23:02:
       `PILOT OK session=<uuid> attempt=2 model=claude-opus-5-5 verdicts=valid memory=ABSENT audit=clean dispatch=match`,
       with the permission flags verbatim on the same line; attempt 1's line stays in run.log and in `<pilot dir>\launches.jsonl` as
       the evidence of point 13. **Revision 23:52 (point 15):** attempt 2 runs under point 15's launch (`--tools Read,Write,Edit`, no
       `--add-dir`, the `--allowed-tools` of point 15(a)), after the point 15 calibration of (c); its line reads `PILOT OK session=<uuid>
       attempt=2 model=claude-opus-5-5 verdicts=valid memory=ABSENT audit=clean(no-bash) dispatch=match` with the flags verbatim;
       attempt 1's FLAGGED line stays in run.log as the record of why the Bash went.
   (g) §2 filled and the file hashed LAST among the harness steps: `fill-section2.mjs`'s output; `PREREGISTER-turn-followup.md sha256
       <64 hex> LastWriteTime <…>`; the diff against `1cec308c…` limited to §2 cells, dated §3 notes and the appended A1 and A2 (this
       revision included); then `DELEGATED OK <that sha256> under A2.12 (user delegation 2026-10-03 22:52:10)` — this is the approved hash
       of 6.1. Any harness edit after this line voids (g) and (h); both are re-taken.
   (h) `node R\day-pre.mjs --approved <that sha256>`: `step 6.1 -- … EQUALS the approved hash`; `interview60.answers.* files in <R>: none;
       STOPPED-*.txt markers: none`; `step 6.7 headroom gemini-3.5-flash-lite: 500 - used <u> … = <h>, needs >= 290: OK` and the same for
       `gemini-3.1-flash-lite … needs >= 98: OK`, with the numbers; `preconditions 6.1-6.8 all hold (6.7: headroom computed above)`.
   **Consequence:** any line missing or reading otherwise → `GATE FAILED (A2.12 <letter>): <why>` in run.log and nothing runs tonight;
   the user is told in the morning with the failing gate. After the run, the hash of (g) and this amendment's revision time are reported
   to the user with the result (the quote A1.6 wanted before the run comes after it). **What it could cost:** the user's own reading of
   the filled file is replaced by the Opus re-review and the machine gates — a defect that only the user would have seen (a wrong item
   in §3, a bar they would have moved) is not caught tonight and is answered by the registered rule that the registration decides, the
   user judges the registration afterwards. Nothing in the delegation touches a prompt, pair set, model, thinking level, bar, clause,
   seed or grading text; the hard stop (point 3, 09:30 local) and the re-run's original rules stand.
13. **The validation Bash's own-file argument by absolute path (23:33; the pilot's defect; sharpens point 1(c)'s `<arg>` clause, leaves
   point 10's `<code>` rule untouched).** Pre-data. **The defect and its evidence** (`R\run.log` 23:31:59): the pilot grader of point 11
   (session `6441d4bf…`, the SYNTHETIC folder `F\pilot-blind`, launched by `R\launch-grader.mjs` from its fresh cwd `grading\pilot-a1\`)
   wrote a verdicts file the verdict reader accepts, read `ABSENT projectMemory=0 claudeMem=0` and PINNED `claude-opus-5-5`, and had its
   ONE validation Bash FLAGGED (len 360, sha12 `b271cca9e127`):
   `node -e "const o=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(Object.keys(o).length)" "<absolute C:\ path of its OWN verdicts.blind-1.g1.json>"`
   — no `cd`, because its cwd is point 9's attempt folder and not the blind folder, and an absolute `<arg>`, which points 1 and 10 read as
   banned. The design-2 s50l graders wrote `cd <blind dir> && node -e …` because their cwd was elsewhere; point 9's per-attempt cwd
   changed the shape the graders produce, and the rule was written against the old shape. Under the rule as written at 23:02 every real
   grader launched this way would be FLAGGED, re-graded once in a fresh `-a2` cwd, FLAGGED again — 18 slots reported, none decided. **Why
   pre-data:** the pilot graded synthetic pairs; `R/blind/` holds nothing, no real answer file, blind file, key or verdict exists, the
   point 12 gate has not been passed and no `FIRST CALL` line exists; the rule below is stated from the pilot's transcript alone, before any
   grader of a real file is launched. **The rule, exact:** the allowed validation Bash is `[cd "<dir>" && ] node -e "<code>" [<arg> ...]`.
   `<dir>` (when present) must normalise to the own blind folder. Each `<arg>` is a quoted or bare path, absolute or relative to the own
   blind folder, in any of the forms `C:\…`, `C:/…`, `/c/…` (case-insensitive), containing no `..` segment, no glob character (`*` `?` `[`),
   no `$`, no backtick; after normalisation it must EQUAL the absolute path of the grader's own verdicts file or own pairs file. Anything
   else flags. `<code>` stays under point 10 unchanged (fs calls only `readFileSync`/`existsSync` with a literal own-file name or
   `process.argv[<digit>]` bound to such an `<arg>`; the banned-token list; `process.*` only exit/stdout/stderr/argv). Not loosened: no
   other file is reachable through an argument; the dispatch text is unchanged. **Three rulings (controller, 23:35) closing the holes the
   author named, binding here and in point 14(c):** (1) `process.argv[<digit>]` is admitted only when the digit indexes an existing
   trailing `<arg>` (1..n); `argv[0]` (the node binary) or a digit past the end → FLAGS. (2) A relative `<arg>`, and a bare own-file-name
   literal in `<code>`, are admitted only when the command starts with `cd "<own blind folder>" &&` — without `cd` the process resolves
   against point 9's attempt folder, not the blind folder the audit normalises against; without `cd` every `<arg>` must be absolute, and
   a bare own-file-name literal in `<code>` flags. (3) `~` anywhere in an `<arg>` FLAGS (symmetric with point 10's ban in `<code>`).
   **What it could cost:** nothing a grader can reach — an
   argument that is not, after normalisation, the own file's absolute path is flagged whatever its form, so the set of files an `<arg>`
   can name is the same two files as before; what widens is only the spelling of their path. Point 1's residual stands: the audit detects,
   it does not prevent, and the absolute form adds no new way past that. A grader that spells its own path in a form the normaliser does
   not read (a UNC share, an 8.3 short name) is flagged and re-graded once — a false positive, never a leak. **Calibration before the
   gate**, every command and its line into `R\audit-graders.point13.out.txt` (named by gate (c)): the pilot's command (sha12 `b271cca9e127`)
   reads clean; the same command with its argument replaced by (a) another grader's verdicts file in the same blind folder, (b) a
   `keyhold\key` file, (c) an `R\interview60.answers.*` file, (d) `MAIN\.env`, (e) a `..` path that resolves to its own file, (f) a glob
   `verdicts.*.json` → each FLAGGED naming its clause; the `cd` form with `<dir>` = another folder → FLAGGED; the rulings' controls:
   `fs.readFileSync(process.argv[0])` with the own verdicts as the only `<arg>` → FLAGGED (ruling 1); no `cd` + the relative own-name
   `<arg>` → FLAGGED, and the same `<arg>` behind `cd "<own blind folder>" &&` → clean (ruling 2); a `~/…` `<arg>` spelling the own file →
   FLAGGED (ruling 3); the 8 real design-2 s50l
   transcripts (addb84e6…aa85ea6f…) still clean; then a fresh pilot attempt (`launch-grader.mjs pilot --attempt 2`, cwd `pilot-a2`) must
   read clean, ABSENT, PINNED and valid — that is gate (f) as revised. If any control reads otherwise the rule stands, run.log names the
   control, nothing runs tonight and the user is told. **Consequence:** a flag keeps §1's consequence (reported not decided, ONE re-grade
   in a fresh `-a2` cwd, then decided). Nothing here changes the dispatch text, the rubric, the blind folder, the verdicts path, a prompt,
   pair set, arm, model, thinking level, bar, clause or seed; A1 stands; the §2 hash of `audit-graders.mjs` is re-taken by
   `fill-section2.mjs` and gate (g) is taken after this revision, as point 12 requires. **Revision 23:35 (PREP-REVIEW-3's I-2):** point 13
   is implemented together with point 14, in one edit of `audit-graders.mjs`: the argument path goes through the SAME `norm()` the code
   allowlist uses; `/c/…` is mapped to `C:/…` BEFORE resolving; any `..` segment is rejected BEFORE normalising (so a `..` that would
   normalise back to the own file — control (e) — is flagged on the segment, never reached by the equality test).
   **WITHDRAWN by point 15 (23:52):** graders run with no Bash, so no `<arg>` rule applies; this point stays as the record of the pilot's defect.
14. **The validation code as an ALLOWLIST (23:35, on the controller's brief marked 23:45; PREP-REVIEW-3's I-1, Important; replaces point
   10's banned-token list, strictly tighter).** Pre-data. **The defect and its evidence:** the Opus re-review of this round (`F\PREP-REVIEW-3.md`,
   READY WITH FIXES: I-1, I-2, M-a) found that point 10's rule inspects only code that names `fs` or `require` directly: a loader reached
   through a name built at run time and looked up on a global object — `globalThis['req'+'uire']`, or the same via `global[k]`,
   `this.constructor`, `({}).constructor.constructor('…')` — names neither, carries none of point 10's banned tokens and no computed
   file-name string, and passes the rule as written while it can load any module and read any file. The construction is on paper, like
   point 10's S3; no grader has produced it (the 8 real s50l commands and the pilot's carry no global-object lookup). A banned-word list
   loses this race by construction — each new spelling needs a new word — so the fix is the inverse: the `<code>` is clean only if EVERY
   token in it is one the registration admits. **Why pre-data:** no real grader has been launched; the pilot graded synthetic pairs;
   `R/blind/` is empty; the gate of point 12 is not passed; this replaces a rule calibrated on already-recorded transcripts with a tighter
   one calibrated on the same transcripts. **The rule, exact — for the `node -e "<code>"` text; point 13's argument rule unchanged:**
   (a) Identifiers: only from a FIXED set frozen in `audit-graders.mjs` before data = the union of the identifiers in the 8 real design-2
   s50l validation commands and the pilot's command (sha12 `b271cca9e127`), PLUS this declared validation vocabulary: `JSON parse
   stringify Object keys values entries length every some filter map forEach reduce includes indexOf push join split trim Array isArray
   Number isInteger isFinite String Set size has add console log error typeof undefined null true false const let var function return if
   else for of in new throw Error process argv exit stdout stderr write require readFileSync existsSync fs o v k x i n e r ok bad missing
   err`. The frozen set is printed into `R\audit-graders.point14.out.txt`. (b) Banned anywhere in the code: `this`, `globalThis`,
   `global`, `window`, `self`, `constructor`, `prototype`, `__proto__`, `Reflect`, `Proxy`, `Function`, `eval`, `import`, `module`,
   `exports`, `Buffer`, `fromCharCode`, regex literals, template literals, backticks, `$`. (c) Computed member access `x[...]` only as
   `process.argv[<digit>]` or with a numeric literal / single identifier index from the allowlist (e.g. `o[k]` where `k` is a loop
   variable over `Object.keys` — allowed only if the receiver is not `process`, `require`, `fs` or a global name). (d) `require(...)` only
   as `require('fs')` (literal) OR, by the controller's ruling of 23:38, `require(process.argv[<digit>])` where the digit indexes an
   existing point-13 own-file `<arg>` (point 13's ruling 1: 1..n) — the one real s50l grader's form, so it stays a clean positive control
   and point 10's 8/8 stands. (e) String literals: the own verdicts / own pairs file names, `'fs'`, `'utf8'`, `'utf-8'`, and message
   strings that contain none of `.` `/` `\` `:` and are at most 40 characters. (f) Arguments: point 13's rule unchanged. (g) The `fs`
   binding (ruling of 23:38): the result of `require('fs')` may be bound only to the identifier `fs`; `fs` and a direct `require('fs')`
   may appear only immediately followed by `.readFileSync(` or `.existsSync(`, or as that one binding (`const fs=require('fs')`); any
   aliasing (`const f=fs`), passing as a value, or computed access on `fs`, on `process` (other than `argv[<digit>]`), on `require` or on
   a global → FLAGS. Anything else FLAGS. Point 10's "never loosened" holds: the set is frozen before data and is not extended on a flag;
   a positive control of point 10 that trips here would be the rule's own failure, named in run.log, and nothing runs tonight. **What it
   could cost:** a grader whose honest validation uses an identifier outside the frozen set (`Math`, `Date`, a variable named `data`) is
   flagged and re-graded once — a false positive bounded by the calibration below; validation is never prevented, since the pilot's own
   form and the real s50l forms pass. **Calibration before the gate**, every command and its line into `R\audit-graders.point14.out.txt`
   (named by gate (c)): the 8 real s50l commands and the pilot command clean; FLAGGED, each naming its clause, for each of:
   `globalThis['req'+'uire']`; `global[k]`; `this.constructor`; `({}).constructor.constructor('…')`; `Function('…')`;
   `require(['f','s'].join(''))`; `process['mainModule']`; a regex literal; a template literal; `require('fs/promises')`;
   `require('child_process')`; `fs.readFileSync(v)` with `v` a variable; a string literal `'keyhold/key.json'`; and for (g) and (d):
   `const o=require('fs');o[k]('x')`; `const f=fs;f.readdirSync`; `fs['readdirSync']`; `require(process.argv[0])` → each FLAGGED.
   Positive control for (d): `require(process.argv[1])` with the own verdicts as the only `<arg>` → clean. Point 10's and point 13's
   controls are re-run under the new rule in the same file. The printed frozen identifier set is READ by the Opus re-check
   (`F\PREP-REVIEW-4.md`, gate (b)) before the gate, for an identifier that is itself a door. **Consequence:** a flag keeps §1's consequence (reported not decided, ONE
   re-grade in a fresh `-a2` cwd, then decided). Nothing here changes the dispatch text, the rubric, a prompt, pair set, arm, model,
   thinking level, bar, clause or seed; A1 stands; `audit-graders.mjs`'s §2 hash is re-taken by `fill-section2.mjs`, every self-check it
   touches re-runs (`GRADER-SESSION CALIBRATION OK` with the new section C), the scoped Opus re-check `F\PREP-REVIEW-4.md` is gate (b),
   and the pilot's attempt 2 must read clean under THIS rule for gate (f). **Not shown:** an identifier in the frozen set that is itself a
   door (none of the declared vocabulary names a loader, a global or a path function; the union from the real commands is printed and
   PREP-REVIEW-4 reads it, gate (b)) and point 1's residual, unchanged: the audit detects after the fact, it does not prevent.
   **WITHDRAWN by point 15 (23:52):** never merged (`work\p14wip` only) — the allowlist read `const a='con',b='structor',k=a+b;v[k][k]`
   CLEAN and flagged 5 of the 8 real s50l commands; this point stays as the record.
15. **Graders get no Bash and no `--add-dir` (23:52; the controller's brief `F\A2-POINT15-BRIEF.md`; withdraws points 10, 13 and 14's
   code/argument rules, returns the audit to §1 as registered, closes point 11's M-a).** Pre-data. **The defect and its evidence:** point
   14's code allowlist cannot be made sound by pattern rules. The engineer, building it in `work\p14wip` (never merged), found
   `const a='con',b='structor',k=a+b; v[k][k]` and a `.join('')` variant of it reading CLEAN under the allowlist as written — every
   identifier admitted, no banned word, the constructor of a constructor reached through a computed index on an allowed variable —
   while the brief's index rule (c) FLAGS 5 of the 8 real design-2 s50l commands (`v[i.key]`, `c[f+x[f]]`): the rule is at once too loose
   for the bypass and too tight for its own positive controls, and point 14's argument against banned-word lists (each new spelling needs a
   new word) holds against its allowlist too. Every rule since point 1(c) has tried to read code the permission system does not read —
   point 1's residual, "detects, does not prevent", restated at every revision. The fix is to take the tool away, not to read it better.
   **Evidence that a grader works without it** (`R\run.log`, 23:49–23:50, to be recorded there): spike 23:49, a throwaway launcher copy
   `work\lg-nobash-noadd.mjs` on the synthetic folder `work\spike-noadd`, attempt 8, `--tools Read,Write,Edit` (no Bash) and NO
   `--add-dir`: session `8a49290e…`, `claude-opus-5-5`, exit 0, `ABSENT projectMemory=0 claudeMem=0`, tools {Read: 3, Write: 1} — the
   rubric file, its own pairs file, its own verdicts file re-read after writing — and a verdicts file valid on its pairs (4 keys).
   Negative probe 23:50 (`work\neg-probe.mjs`, same flags): a Read of a file outside the cwd that no allow rule names → DENIED by Claude
   Code (`permission_denials` lists the Read; session `f8d13b32…`); a Read of a file inside the fresh, empty cwd → allowed (session
   `579c3773…`). So with no Bash and no `--add-dir` the permission system itself refuses a read of a key, an answers file, `.env` or
   another grader's file BEFORE it runs; the audit becomes a second, independent check instead of the only one. **Why pre-data:** no real
   grader has been launched; the spike and the probe ran on synthetic data under `work\`; `R/blind/` is empty, no answer file, blind file,
   key or verdict exists; the point 12 gate is not passed and no `FIRST CALL` line exists. **The rule, exact:** (a) The launcher (point
   11) runs EVERY attempt — pilot and probes included — with `--tools Read,Write,Edit` (no Bash) and WITHOUT `--add-dir`;
   `--allowed-tools` = Read of the own pairs file, Read of the grader-instruction file
   (`<MAIN>/electron/test/golden/interview60.grader-prompt.md`), Edit of the own verdicts file (the spike's Write of that file landed
   under this set); `--permission-mode dontAsk`; `--strict-mcp-config`; cwd = the fresh empty per-attempt folder of point 9. The flags
   are recorded verbatim in run.log at the pilot and are byte-identical for every attempt (point 11(c)); the dispatch text does not
   change. (b) The audit runs WITHOUT `--allow-validation-bash`: §1's "any tool other than Read/Write" as registered, now satisfiable.
   A grader is clean iff EVERY tool call is one of: Read whose `file_path`, normalized absolute, is exactly the own pairs file, the
   grader-instruction file, or the own verdicts file (the re-read after writing the spike showed); Write or Edit whose `file_path` is
   exactly the own verdicts file (Edit of the own verdicts counts as Write). Any Bash call FLAGS; any other tool FLAGS; any `mcp__*` call
   FLAGS; any denied call (a `permission_denials` entry, or a tool result that is a permission error) FLAGS — a grader that tried a door
   and was refused is reported, not decided, like one that reached it. One failing call flags the grader whatever its other calls.
   (c) Points 10, 13 and 14's code and argument rules are WITHDRAWN: no `<code>` or `<arg>` rule exists because no Bash exists; each
   point stays in the text as the record, marked. Point 14 is never merged. (d) Point 11's residual M-a is CLOSED (revision there).
   **What it could cost, plainly:** a grader can no longer self-validate its JSON with node — its only check of its own file is the
   Read-back the spike shows, and a malformed verdicts file is found by the launcher's verdict check (`legs-decide.mjs`'s reader, point
   11) after the attempt, which spends the ONE registered replacement (`-a2`) on a shape error the grader could once have fixed in place;
   the launcher's verdict check and the one replacement remain, nothing is added for this. The 8 real design-2 s50l transcripts stop being
   shape positive controls: they used Bash under a different launch, so under point 15 they read FLAGGED-by-design — a historical shape,
   not tonight's — and the positive controls for tonight's shape are the spike's transcript and the pilot's attempt 2, one synthetic file
   each (n = 2 of the real shape before data; the pilot's dispatch is the real one, M1). A grader that reaches for a tool the set lacks
   (Grep to find its pairs file) is denied and flagged, re-graded once; the dispatch names every path absolutely, so that need is not
   expected. **Calibration before the gate**, every command and its line into `R\audit-graders.point15.out.txt` (named by gate (c)):
   the pilot's attempt 2 through the REAL launcher under (a) (gate (f)): exit 0, ABSENT, PINNED `claude-opus-5-5`, verdicts valid, audit
   clean (no Bash), `dispatch=match`; the negative probe re-run under the real launcher's flags: the outside Read DENIED, recorded with its
   session id; synthetic transcripts (section C of `grader-session-calibrate.mjs`, re-cut): a Bash call → FLAGGED; a Read of another
   grader's verdicts, of a `keyhold\` file, of an `R\interview60.answers.*` file → FLAGGED; a permission denial → FLAGGED; a Read of the
   own verdicts → clean; the spike's transcript `8a49290e…` → clean; the 8 real s50l transcripts → FLAGGED-by-design, each line saying
   so. If any control reads otherwise the rule stands, run.log names the control, nothing runs tonight and the user is told.
   **Consequence:** a flag keeps §1's consequence (reported not decided, ONE re-grade in a fresh `-a2` cwd, then decided). Nothing here
   changes the dispatch text, the rubric, the blind folder, the verdicts path, a prompt, pair set, arm, model, thinking level, bar, clause
   or seed; A1 stands; the §2 hashes of `launch-grader.mjs` and `audit-graders.mjs` are re-taken by `fill-section2.mjs`,
   `GRADER-SESSION CALIBRATION OK` re-runs with the re-cut section C, the scoped Opus re-check `F\PREP-REVIEW-4.md` covers points 13–15
   (gate (b)) and gate (g) is taken after this revision, as point 12 requires. **Not shown:** a Read, Write or Edit that reaches outside
   the allow rules by a spelling the probe did not try (one outside Read denied, one inside allowed; no `/c/…` or UNC form probed) — the
   audit's path check is the second line there; and the permission system is a boundary this registration does not control: its denial
   is read from the transcript (`permission_denials`), never assumed.
   **Accepted residuals (controller rulings on PREP-REVIEW-4, 2026-10-04 00:18):**
   M-1: the gate (e) cwd probes ran under the pre-point-15 flags; their memory/cwd evidence stands, and the point-15 flags are evidenced by the spike `8a49290e…`, the negative probe `f8d13b32…` and the pilot attempt 2 `fde64205…`; the negative probe `f8d13b32…` (flags identical to the launcher's except the rule paths) is ruled the registered negative probe.
   M-3: the audit's default mode is bound by the controller's command line: every audit command is pasted verbatim into `run.log` and none carries the flag.
   M-4: an Edit-tool call and a denied Write/Edit were not seen live; both denial signals fired on the one real denial (`f8d13b32…`).
16. **Gate (c)'s invocation of the §2-verifying self-checks (2026-10-04 00:23; the controller's defect, not a check's verdict; sharpens
   point 12(c), leaves every check and every harness file untouched).** Pre-data. **The event and its evidence** (`R\run.log`, the block
   `===== GATE RUN (A2.12 a-h) =====` at 00:22:32): gates (a) and (b) passed (`PREP-REVIEW-5 READY: VERDICT: READY`); in (c)
   `earlierQuestion.ref.test.mjs` read `EARLIER-QUESTION REF TESTS: 47/47 passed`, `legs-decide.mjs --calibrate` read `CALIBRATION OK`
   and `mutate-decide.mjs` read `EVERY MUTANT CAUGHT (98)`; then at 00:22:49 `e2e-synthetic.mjs` exited 2 with `REFUSED: section 2 of
   …\PREREGISTER-turn-followup.md does not verify (section 2 has no hash cells …)` and the controller's gate script wrote
   `GATE FAILED (A2.12 c): exit 2 (expected 0); missing ["E2E OK"]`. **Cause:** the controller's gate script (`F\work\gate.mjs`, the
   controller's own tool, not a §2 row) ran `e2e-synthetic.mjs` — and would have run `runner-selftest.mjs` — WITHOUT
   `TURN_PREREG=<F>\section2-filled.md`. Both checks verify section 2 of the file `TURN_PREREG` names and default to the registered file
   (point 6, C1); before gate (g) the registered file's section 2 is by design still empty, because point 12(g) fills it LAST among the
   harness steps. The engineer's recorded runs (`F\FIX-ROUND-A2-REPORT.md`, line 5: every check ran with `TURN_PREREG=section2-filled.md`,
   regenerated by `fill-section2.mjs`) and `day-pre.mjs` (point 6 / item 12: `TURN_PREREG` passed to every step) use the filled copy; the
   gate script did not. (i) **This failure is the controller's invocation, not a check's verdict on the harness:** the refusal is the
   check doing exactly what point 6 registered (an empty §2 table is not a verification), pointed at the wrong file. No harness file
   changed; no call, answer, blind file, key or verdict exists; no `FIRST CALL` line exists. (ii) **The rule, exact:** in gate (c), the
   first step is `fill-section2.mjs` (its `VERIFIES` and `DIFF CHECK (12.4) OK` lines into run.log with the command), which regenerates
   `F\section2-filled.md`; `e2e-synthetic.mjs` and `runner-selftest.mjs` then run with `TURN_PREREG` = `F\section2-filled.md`, so (c)
   checks exactly the §2 that (g) installs (gate (g) builds the final registration from that same file and re-runs `fill-section2.mjs`
   on it to prove §2 still verifies). The other (c) checks, (d)–(h), the expected lines and the order of point 12 are unchanged.
   (iii) **The 00:22:49 `GATE FAILED (A2.12 c)` line is kept in run.log and is voided by this point:** it decides nothing. The gate is
   re-run WHOLE from (a), every line again under a new `===== GATE RUN (A2.12 a-h) =====` header, after this point is written and before
   any `FIRST CALL` line; the earlier block stays as the record. (iv) **A `GATE FAILED` caused by a check's own verdict** — a self-check
   that fails on the filled file, a missing expected line, a probe or pilot line reading otherwise — **is not touched by this point:** it
   still stops the run tonight, as point 12's consequence says, and the user is told in the morning with the failing gate. Only a failure
   whose cause is the gate script naming the wrong file to a check is an invocation error, and only this one is ruled so. **Why
   pre-data:** this point is written from run.log alone, before any grader, probe re-run or model call of the gate's re-run; it changes
   which file an environment variable names on two commands, not what either command checks, and no harness file, prompt, pair set,
   arm, model, thinking level, bar, clause, seed, grading text or dispatch text changes; A1 stands. **What it could cost:** one more
   gate run (the self-checks take under a minute; gates (d)–(f) read existing transcripts; (g) re-hashes; (h) re-reads the quota ledger),
   and a reader must see that a gate failed once — the result note says so, naming this point, the 00:22 block and the re-run's block.
   A gate script that passes the wrong file to a check and is ruled an invocation error could, in principle, be used to excuse a real
   verdict; the bound is (iv): the ruling applies to the one named cause, and any other `GATE FAILED` stops the run. **Not shown:** the
   re-run itself — whether `e2e-synthetic.mjs` and `runner-selftest.mjs` read `E2E OK` and `RUNNER SELF-TEST OK` on the filled file is
   the re-run's finding, not this point's; the engineer's report says they did on its final run, which is evidence of the harness, not of
   tonight's gate.
