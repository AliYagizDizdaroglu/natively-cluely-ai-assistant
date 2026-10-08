VERDICT: READY WITH FIXES

Scoped Opus re-check (A2.12 gate b) of points 13-15 and the harness edits they caused. Written 2026-10-04 ~00:15 local, offline. Ids, counts and hashes only.
Counts: 0 Critical, 1 Important, 4 Minor. PREP-REVIEW-3's I-1, I-2 and M-a are closed by point 15 (see section 1).

## Important

**I-1. Gate (c) cannot pass as written: `R\audit-graders.negative-control.out.txt` was not re-generated in the default mode.**
- Gate (c) (revision 23:52) requires this file to be re-generated WITHOUT `--allow-validation-bash`. In it, point 1's 8 bypass commands must FLAG as Bash, and the 5 out-of-scope Read/Write calls must FLAG on path.
- What the file holds (00:04:26, `--only C`):
  - The 8 bypass commands (lines 43-50) run with the flag (`au()` defaults to `flag: true`, calibrate line 178). They flag for code-rule reasons, never as "Bash call".
  - The 5 out-of-scope calls (lines 68-72) also run with the flag. The path check is the same in both modes, so the result would match, but the gate names the mode.
  - Lines 108-115 still print "REAL … reads CLEAN under the tightened rule" with no WITHDRAWN label. Gate (c) says section C holds the 8 real graders FLAGGED-by-design "instead of" clean. Line 99 holds that FLAGGED reading, so both readings now sit in one file.
  - The spike's clean reading is in section F, not C. The pilot's attempt-2 clean reading is in no calibration file yet.
- Substance is not at risk: in the default mode any Bash flags whatever the command (section F proves it 3 ways, plus the 8 real transcripts and pilot attempt 1). The defect is that the gate's named output does not read as the gate says, so a literal check writes `GATE FAILED (A2.12 c)`.
- Fix (harness, `R/scripts/grader-session-calibrate.mjs` section C):
  - (1) In the bypass loop (lines 226-229), also run each command with `{ flag: false }`. Assert `flagged(r) && /Bash call \(point 15/.test(r.line)`, with the label `NEGATIVE CONTROL bypass N (default mode, point 15): FLAGGED as Bash`.
  - (2) Run the 5 out-of-scope Read/Write controls (Read MAIN/.env, the registration, R/run.log, R/s50m-gated-turn.json; Write blind/graders.json) with `{ flag: false }`. Assert `Read outside the allowlist` or `Write outside the own verdicts file`.
  - (3) Prefix every remaining flag-mode label in section C with `WITHDRAWN mode (record only): `. This covers the points 1(c)/10 positives and negatives, and the "REAL … CLEAN under the tightened rule" block.
  - Then re-run `node R/scripts/grader-session-calibrate.mjs --only C` into `negative-control.out.txt` with its `# command:` header, re-run the full calibration (`GRADER-SESSION CALIBRATION OK`), then `fill-section2.mjs` (new sha for the calibrate script).
  - A scoped `PREP-REVIEW-5.md` of that one diff follows, as A2.12(b) requires.
- Alternative (text only, no harness edit): a dated A2 revision of 12(c). It would say that `negative-control.out.txt` is section C as re-cut: the withdrawn-mode record, plus line 42 (Bash flagged without the flag) and line 99. It would also say that the default-mode controls, including the spike's clean reading, are section F's (`audit-graders.point15.out.txt`). The controller picks one route; either closes I-1.

## Minor

- **M-1. The gate (e) cwd probes ran under the old flags.** `grader-cwd.probes.out.txt` (23:30) shows `Bash(node -e *) Bash(cd *)` rules, so point 9's "same flags as a grader" no longer holds for the probes on record.
  - Re-running needs new folders: the launcher only allows `cwdprobe-<n>-a1`, and those folders exist.
  - Under point 15's flags, the same evidence exists: spike 8a49290e and the neg probes (tool-using, fresh cwds) were followed by pilot a2 fde64205, which reads ABSENT projectMemory=0 claudeMem=0, slugJsonl 1, memoryDir empty. Re-checked here by `check-grader-memory.mjs`.
  - Ruling: accepted residual. Record it in run.log by id, next to the gate (e) lines.
- **M-2. A2's earlier text is not marked superseded where it still names Bash.**
  - Point 1 still reads "The audit runs as `audit-graders.mjs --allow-validation-bash …`" (line 14), and its residual says "(Read, Write, Bash)".
  - Point 11(c) still says the launcher grants the grader "its validation Bash".
  - Points 10, 13 and 14 carry inline WITHDRAWN markers; points 1 and 11(c) do not.
  - Fix (text only): append `**Superseded by point 15 (23:52):** the audit runs WITHOUT the flag; no Bash.` to point 1(c) and point 11(c).
- **M-3. The default mode is bound by the controller's command line only.**
  - `legs-decide.mjs` accepts a non-empty `bash=[…]` list, and the audit's output does not name its mode.
  - The impact is nil while the launcher holds: `--tools Read,Write,Edit` means no Bash call can appear, and Read/Write/Edit, denial and mcp checks are the same in both modes.
  - Ruling: accepted residual. The controller pastes each audit command verbatim into run.log, and none carries the flag.
  - Optional later hardening: legs-decide refuses a slot whose `bash` is non-empty.
- **M-4. Two cases of denial detection were never observed live.**
  - No live Edit-tool call by a grader exists (the spike and the pilot wrote with Write).
  - No denied Write/Edit exists. Only a denied Read was observed: f8d13b32, which carries `is_error` + `toolDenialKind` in the transcript and has `permission_denials` only in the stdout JSON.
  - The launcher does not record stdout's `permission_denials`, so the transcript is the only source.
  - Ruling: accepted residual. The detection uses two independent signals (toolDenialKind, message regex), and both fire on the one real denial.

## Pending controller steps (not findings; point 15's calibration, before the gate)

- Append pilot a2 to `R\audit-graders.point15.out.txt`, with commands:
  - launcher line `fde64205-5ecf-4ccf-ae04-7ec369464ddf` exit 0 slugJsonl 1 memoryDir empty, verdicts valid (4 keys);
  - audit `[Readx3 Writex1]; clean; bash=[]; dispatch=match`;
  - `h40d-grader-models` PINNED claude-opus-5-5 and `check-grader-memory` ABSENT 0/0. I re-ran both on fde64205 and 8a49290e: PINNED 2/2, ABSENT 2/2.
- Negative probe "re-run under the real launcher's flags": not done since 23:50.
  - The flag words in `work\neg-probe.mjs` equal the launcher's `FLAGS()` byte for byte. Only the allow-rule paths differ: Read of one synthetic file, Edit of `<cwd>\out.txt`.
  - Either rule f8d13b32 as that probe in run.log, or re-run it once. Then record the session id in point15.out.txt.
- Gate (g) still has to append A2 (this revision included) to the registration, then re-run `fill-section2.mjs`. The registration has A1 only today (sha256 a91b3c77…).

## Questions of the brief

1. **I-1, I-2 and M-a: CLOSED.**
   - `FLAGS()` = `-p … --model opus --output-format json --permission-mode dontAsk --tools Read,Write,Edit --strict-mcp-config`, with `--allowed-tools` = 3 rules (grader) or 2 rules (probe).
   - `BASH_RULES` and every `--add-dir` are gone. Checked by diff against `work\p15\launch-grader.pre15.mjs` (grader, pilot and probe paths).
   - Grep of `R\*.mjs` for `allow-validation-bash|add-dir`:
     - `launch-grader.mjs` has 1 hit, the "NO --add-dir" comment;
     - `audit-graders.mjs` has the withdrawn branch;
     - the calibration has the record cases;
     - day-pre, day-steps, legs-decide, e2e, runner and mutate: 0.
   - Section F asserts the same over 11 files. The audit's default mode (no flag) is section 1's rule plus point 15. The dry run reads `--tools Read,Write,Edit`, 0 Bash, 0 `--add-dir`, rules Read/Read/Edit. So does the real pilot a2 argv (`R\pilot-a2.console.txt`).
2. **No path to a non-own file found.**
   - **The cwd.** The launcher only `mkdirSync`s it. `grading\pilot-a2\` is empty after the run, and so is pilot-a1. In-cwd reads are allowed (579c3773) but find nothing except what the grader wrote itself.
   - **Write.** A Write into the cwd or to any non-own path matches no allow rule. Under `dontAsk` it is denied (inferred; a denied Write was not observed), and the audit flags it on path and on denial. A successful self-Write then Read would only return the grader's own text.
   - **Links.** No tool in the set can create a symlink or junction. Write makes regular files.
   - **Rule matching.** The rules are exact `//c/…` file paths with no glob character. A path string that matches one names that file. Spellings that differ (case, 8.3, ADS, `..`) either fail to match (denied) or resolve to the same own file.
   - **Read(rubric).** It is one exact file in MAIN; nothing broader. MAIN's CLAUDE.md is not loaded, because the cwd is in Temp.
   - **Edit rule and Read.** `Edit(own verdicts)` evidently also permits Read of that file: pilot a2 re-read it with 0 `is_error`.
   - **Settings.** `~/.claude/settings.json` has 0 permission allow rules, 0 file rules and no `additionalDirectories`. There are no settings.local or managed settings, and no project `.claude` above the cwd except the user folder.
   - **User defaultMode.** It is `bypassPermissions`. The CLI `--permission-mode dontAsk` overrides it (f8d13b32 was denied), and section D asserts `dontAsk` in every argv. Not shown: a future user-settings allow rule or `additionalDirectories` would widen reads silently, with the audit as the only check. The launcher does not pass `--setting-sources`.
   - **Hook-injected context** is the memory channel, checked per attempt: ABSENT on pilot a2 and the spike.
3. **Denial detection: acceptable.**
   - A tool result counts as a denial when it has `is_error` and either `toolDenialKind` or `/permission|denied/i`; a non-empty `permission_denials` also counts.
   - Calibrated on the real f8d13b32: it reads FLAGGED by the denial alone even with the path rewritten to an allowed file.
   - Discrimination holds: a not-found error, the words in a non-error result, and an empty list are all clean.
   - The normal error results of a grader run (file not found before the Write, Edit string not found, file not read first) carry neither word.
   - A false FLAG (e.g. an `EACCES: permission denied` on OneDrive) costs one re-grade under §1's consequence. Accepted.
4. **Consistent with point 15.**
   - 15(b) reads "Write or Edit whose `file_path` is exactly the own verdicts file (Edit of the own verdicts counts as Write)" and allows a Read of the own verdicts file. The engineer's flip of the old section-C line follows from it.
   - The same allowance now also loosens the withdrawn mode. That mode decides nothing, so this is acceptable.
5. **`section2-filled.md` verifies, and the diff check holds.**
   - Re-checked read-only with `verifySection2` (common.mjs): 33 files and 21 blocks VERIFY.
   - The four changed hashes equal the files on disk: audit 07833cf4…, launcher 2f096c38…, calibrate 4edde71d…, decide-calibrate eada5504…; legs-decide e00a46c0… is unchanged.
   - The DIFF CHECK (12.4) normalizer, re-run on a copy: 317 lines identical. Its negative control (one edited §4 heading) FAILS, as it should.
   - The pilot a2 launch (00:06:48) postdates the launcher's last write (00:00:41) and the fill (00:06:06), so it ran on the hashed launcher.
6. **Gates (a)-(h) are checkable from run.log once I-1 is fixed.**
   - (a), (b), (d), (g) and (h) have their sources.
   - (c): fails literally (I-1), and point15.out.txt lacks the pending lines above.
   - (e): has the M-1 ruling.
   - (f): composable from `pilot-a2.console.txt` (flags verbatim, session, model, ABSENT, verdicts valid) and `pilot-a2.audit.out.txt` (clean, bash=[], dispatch=match), plus PINNED once recorded.
   - run.log's evidence lines for the spike (8a49290e…, Read 3, Write 1, ABSENT, verdicts valid) and the negative probes (f8d13b32… DENIED, 579c3773… allowed) are present (23:54:49) and match the transcripts.

## Self-checks re-run by this reviewer (outputs in `SP\pr4\`, none over a recorded file; no model call)

`grader-session-calibrate.mjs`: 280 OK, 0 BAD, `GRADER-SESSION CALIBRATION OK`. `--only F`: 35 OK, 0 BAD. `legs-decide.mjs --calibrate`: 139 OK, `CALIBRATION OK`. `launch-grader.mjs pilot --pilot <work\p15\pilot-blind-copy> --attempt 2 --dry-run`: rules Read/Read/Edit, no Bash, no `--add-dir`. Audit (default mode) on pilot a2 fde64205 and spike 8a49290e: `AUDIT: all graders clean`. Transcript scan: pilot a2 / spike are Read rubric, Read own pairs, Write own verdicts, Read own verdicts, with 0 is_error; f8d13b32 has 1 Read, 1 is_error permission, toolDenialKind 1.

## Not checked

- Claude Code's internal auto-readable locations (e.g. the session's own folder) and UNC or `/c/…` spellings: not probed. The audit's path check is the second line there.
- mutate-decide, e2e-synthetic and runner-selftest were not re-run (they write into R or TMP). I relied on the engineer's recorded markers.
- No model call, and no launcher or runner run without `--dry-run`.
