# Brief A: `guard-h40d.mjs` and its calibration

Read `VH\instruments\COMMON.md` first. Your letter is A.

**Spec:** r4 §7.4, the `guard-h40d.mjs` bullet (r4 lines 717–735), plus §2 (the env block, the models and levels
that fly) and rule 1(g) (knowledge mode). It is `SP\guard-h40c.mjs` re-pinned, with two new checks:
- (1) roster holdout40, 45 items; (2)–(4) the built default and fallback, no model or thinking override, the levels
  each model flies at; (5) the R09 fix in dist and source; (6) the hedge resolves ON with `NATIVELY_VERBAL_HEDGE`
  UNSET (port `hedge` from `SP\boundary-repair\guard-br1.mjs`, which is calibrated to FAIL on the 09-26 build), and
  the guard FAILS if that variable is set to anything, `1` included; (7) trigger 5000 ms; (8) the follow-up flag off;
  (9) the dist not stale against its source; (10a) `.env` declares none of the guarded names (names only, as
  guard-h40c does it); (10b) MAIN's HEAD equals `NATIVELY_FLIGHT_COMMIT` and the tree is clean but for the
  allowlisted paths (`electron/test/golden/interview60.chains.json`, `electron/test/golden/interview60.report.md`,
  `natively_debug.log.1`); (11) no Groq id in the answer-model list;
- **(12, new)** the cue build's markers in MAIN's dist: run `node SP\dist-proof.mjs --root <MAIN> --expect combined
  --prefix-count 3 --offers-marker "offers block before the spoken answer"` as a child process, exit 0 required; plus
  `function trimCues` in the built filter (`dist-electron/electron/llm/verbalStreamFilter.js`) and `CUE_RULE` and
  `VERBAL_TYPED_PROMPT` in the SOURCE `electron/llm/prompts.ts`;
- **(13, new)** knowledge mode ON in the persisted settings: `knowledgeMode === true` in
  `%APPDATA%\natively\settings.json` (the guard runs as a scheduled task, outside the Claude sandbox, so that path is
  the real file there); print the file's mtime and that one key only; `--settings <file>` points it at a stub. Reuse
  `VH\knowledge-mode-read.mjs`'s reading logic where it helps; stubs exist in `VH\kmode-stubs\`.

Keep guard-h40c's interface (how the launcher calls it, its `GUARD OK` / `GUARD FAILED: <check>` lines and exit
codes) so the launcher change stays small. Look at how h40c's guard and its git part were split
(`guard-h40c.mjs`, `guard-h40c-git.mjs`) and keep that shape.

**Calibration** (r4: "breaking each premise once, h40c's `guard-h40c-cal.txt` pattern, in a stub tree and against
MAIN's root"). Build a stub tree under `VH\instruments\guard-cal\` as h40c did (`SP\guard-h40c-cal\`, its runner
`guard-h40c-realcal.mjs`, outputs `guard-h40c-cal.txt` / `guard-h40c-realcal.txt`). Each case must print a NAMED
`GUARD FAILED`:
- commit unset; commit wrong; tree dirty (a stub git repo, never MAIN); `.env` (a stub file in the stub tree, written
  by you with a guarded NAME and a dummy value) declaring a guarded name; the hedge variable set to `1`; set to `0`;
- a dist without `CUE_LINE_PREFIX`: **MAIN's own dist today is that known-bad case** (MAIN is pre-merge until later
  today: `stripCueBlock` is undefined there). Run check 12 against MAIN's root now and see it FAIL;
- check 13 with `--settings VH\kmode-stubs\settings-off.json` and the `-absent` stub → FAILED; the `-on` stub → passes;
- the correct environment in the stub tree → `GUARD OK`.
Also run the whole guard against MAIN's real root once with a plausible environment and record what it says (it must
FAIL today on check 12 and on 10b, since MAIN is not merged yet; say which checks fail and why). The full `GUARD OK`
on the merged MAIN is the dry twin's job later, not yours.

Output: `VH\guard-h40d.mjs` (+ a git part if you split it as h40c did), `VH\guard-h40d-cal.txt`, the stub tree under
`VH\instruments\guard-cal\`, `VH\instruments\report-A.md`.
