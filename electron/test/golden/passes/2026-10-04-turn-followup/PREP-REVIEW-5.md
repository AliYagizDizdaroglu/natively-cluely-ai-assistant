VERDICT: READY

Narrow confirmation re-check (A2.12 gate b successor to PREP-REVIEW-4) of the A2 revision of 2026-10-04 00:18. Opus, offline, written ~00:25 local. Ids, counts and hashes only. Scope: (1) I-1 closed by the text route; (2) M-1..M-4 as recorded; (3) no contradiction from the 00:18 revision with points 12 and 15. Nothing else.
Counts: 0 Critical, 0 Important, 1 Minor (M-5, text only; rule by id in run.log).

## 1. I-1: CLOSED by the text route

- 12(c) at 00:18 names the default-mode controls as `R\audit-graders.point15.out.txt` (section F, 35 cases) plus the real pilot attempt 2 `fde64205-5ecf-4ccf-ae04-7ec369464ddf`. It makes `negative-control.out.txt` the withdrawn-mode record and "not an input to this gate (c)". It also replaces the unmet "re-generated WITHOUT `--allow-validation-bash`" phrase. That was the reviewer's offered alternative, so the literal failure of PREP-REVIEW-4 I-1 is gone.
- The files exist and read as stated:
  - `node R\scripts\grader-session-calibrate.mjs --only F`, run offline from `SP\pr5\` with output to `SP\pr5\F.out.txt`, so no recorded file was overwritten. The script writes only to `os.tmpdir()`. Result: exit 0, **35 OK, 0 BAD**, `GRADER-SESSION CALIBRATION OK`. Its OK/BAD lines are byte-identical to the recorded `point15.out.txt` lines 7-54.
  - The calibrate script's sha256 is `4edde71d…c38059`, equal to §2. `audit-graders.mjs` `07833cf4…`, `launch-grader.mjs` `2f096c38…` and `legs-decide.mjs` `e00a46c0…` are unchanged since PREP-REVIEW-4, so there was no harness edit since then.
  - Section F holds the controls point 15 lists:
    - spike `8a49290e` CLEAN (line 37);
    - `f8d13b32` FLAGGED, by path and by the denial alone (lines 40-41);
    - 8 real s50l graders FLAGGED-by-design (line 51);
    - Bash, other-grader, keyhold, answers and denial cases FLAGGED;
    - own-verdicts Read clean.
  - The pilot a2 record appended to `point15.out.txt` (lines 70-77) was re-derived here offline from the transcript:
    - `audit-graders.mjs` default mode: `[Readx3 Writex1]; clean; bash=[]; dispatch=match`, `AUDIT: all graders clean`, exit 0;
    - `check-grader-memory.mjs`: `ABSENT projectMemory=0 claudeMem=0`;
    - `h40d-grader-models.mjs`: `{"claude-opus-5-5":7} PINNED`.
    - All three match the record. `pilot-blind\launches.jsonl` attempt 2 has exit 0, slugJsonl 1 and memoryDir empty. `pilot-a2.console.txt` carries the flags verbatim (`--tools Read,Write,Edit`, `dontAsk`, `--strict-mcp-config`, rules Read/Read/Edit, no Bash, no `--add-dir`).

## 2. M-1..M-4: recorded as stated; none opens a path

- **M-1** (A2 point 15, line 432): recorded. It also rules `f8d13b32` the registered negative probe.
  - `work\neg-probe.mjs` line 15 equals launcher `FLAGS()` (line 87) word for word. Only the two rule paths differ. So the substitution for "re-run under the real launcher's flags" holds.
  - The cwd probes' old flags concern only their memory evidence. No read path is involved: the cwd is empty, and in-cwd reads find only the grader's own output.
- **M-2:** the markers are present at point 1 (line 28) and point 11(c) (line 189), in PREP-REVIEW-4's wording. Point 1's residual "(Read, Write, Bash)" (line 39) has no marker of its own, but it sits inside point 1, which the marker supersedes. Acceptable.
- **M-3** (line 433): recorded. In `audit-graders.mjs`, `allowValidationBash` is read at only two places: line 221 (the Bash branch) and line 227 (the label text). The path checks, the denial check, the mcp check and the other-tool check do not depend on it.
  - A wrongly passed flag could therefore only clear a Bash call. `--tools Read,Write,Edit` in the §2-hashed launcher makes a Bash call impossible.
  - No flagged Read, Write or Edit and no denial can read clean either way, so no flagged grader can be decided through M-3.
- **M-4** (line 434): recorded.
  - An unseen Edit-tool call is still path-checked: an Edit of a non-own file FLAGs (section F line 21).
  - A denied Write or Edit can only target a non-own path (the own verdicts file is allowed). It FLAGs on path whatever its error text.
  - No route to a non-own read and no decided flagged grader.

## 3. Consistency of the 00:18 revision with points 12 and 15: no substantive contradiction; one stale label (M-5)

- 12(b), (d)-(h) are untouched.
- (f)'s pilot line requirements (`audit=clean(no-bash)`, flags verbatim) are met by `pilot-a2.console.txt` and `pilot-a2.audit.out.txt`.
- Point 15's calibration list (lines 416-422) is satisfied by `point15.out.txt`: pilot a2 PINNED, ABSENT, valid, clean and `dispatch=match`; the negative probe by M-1's ruling, with its session id in section F; and the synthetic and real controls.
- **M-5 (Minor, text only):** two places still say "section C" where the default-mode controls now live in section F.
  - 12(c)'s 23:52 clause "section C holds point 15's controls (the 8 real s50l graders FLAGGED-by-design, the spike transcript and the pilot clean)" is still un-struck. The 00:18 sentence replaces only the "re-generated WITHOUT" phrase of that sentence. Section C (`negative-control.out.txt`, 104 OK) holds only the 8-FLAGGED reading (line 99). The spike is in F, and the pilot is in the appended record.
  - Point 15 likewise says "section C of `grader-session-calibrate.mjs`, re-cut" (line 419) and "the re-cut section C" (line 426).
  - Not blocking: the later 00:18 sentence states plainly that the gate's default-mode controls are `point15.out.txt` and that section C is not an input to (c). All the content exists in the named file. The full `GRADER-SESSION CALIBRATION OK` run includes section F.
  - Fix, if wanted: in 12(c) and point 15 lines 419 and 426, read "section C" as "section F". Otherwise rule it `accepted residual (00:18 governs)` in run.log.

## Pending controller steps (not findings)

- run.log does not yet hold the per-id Minor rulings that gate (b) requires: M-1..M-4 from PREP-REVIEW-4, plus M-5, plus `f8d13b32` as the registered negative probe. It also lacks the pilot a2 lines. All of these go in at gate time.
- Gate (g) still has to append A2, including the 00:18 revision, to the registration and re-run `fill-section2.mjs`.

## Not checked

- Anything outside the three questions. No model call, no launcher or runner run, and no other calibration section re-run.
