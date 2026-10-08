
## 14. Dated amendments before arming (2026-10-01, 16:50 local, before any h40d data exists)

From the Opus review of the instruments (`VH\instruments\REVIEW-instruments.md`: READY WITH FIXES, 0 Critical,
2 Important, 10 Minor) and from the user's instructions of this afternoon. Each applies to the text above where it
names a section; nothing in rules 1–5's bars changes.

- **A1** (§2 Build row, §7.4 launch bullet): "`node SP\dist-proof.mjs --root . --expect combined`" reads
  "`node SP\dist-proof.mjs --root "%CD%" --expect combined` (an absolute root: `--root .` crashes dist-proof.mjs,
  reviewer 2026-10-01)".
- **A2** (§2 Configuration row), appended: "The launcher also clears every other `NATIVELY_*` name the source reads
  (the list in `launch-h40d-src.txt`) and `I60_PROBE_DEADLINE_MIN`. The guard's `.env` scan covers all of them
  except the three the harness sets explicitly in the app's environment (`NATIVELY_AUTOSTART_MEETING`,
  `NATIVELY_LIVE_MODE`, `NATIVELY_CAPTURE_PROMPTS`)." (Review I1, applied by `instruments\apply-i1.mjs`; guard
  calibration 129/129 after it.)
- **A3** (§7.4 guard bullet, 10b), after "the allowlisted paths": "scoped to `electron src premium scripts
  package.json natively_debug.log.1`; the allowlist adds h40c's four untracked scratch paths
  `electron/test/golden/openrouter-probes/`, `openrouter.probe.mjs`, `zai-probes/`, `zai.probe.mjs`; files outside
  the scope never refuse".
- **A4** (§2 Task row): "`SP\register-h40d.ps1`" reads "`VH\register-h40d.ps1 -Which flight|dry|prestart -StartAt
  <local ISO>`".
- **A5** (§2 Configuration row and §7.3): "`NATIVELY_FLIGHT_COMMIT` holds the token `@@REGISTERED_HEAD_FULL_HASH@@`
  until `gen-launchers.mjs --commit` fills it; the prestart's holds MAIN's HEAD at prestart time
  (`--prestart-commit`), because the registered HEAD does not exist yet."
- **A6** (§7.3, Required afterwards): the `natively_debug.log` copy is made by the controller after `app:stop`,
  before any other app start, matched to the launcher log's `dir` line, into
  `VH\2026-10-01-prestart-h40d\natively_debug.log`.
- **A7** (§6, option (i)), appended: "The re-grade's tag is `h40c-regrade`, its verdicts file
  `VH\h40d-verdicts-h40c-regrade.json`. It is merged with `--model <new id>` into a COPY of h40c's run folder at
  `VH\h40c-regrade-run\` (its `interview60.timeline.json`, `natively_debug.log` and `interview60.judge.pairs.json`
  copied), never into h40c's own folder. The new floor is `h40d-rule3.mjs VH\h40c-regrade-run`'s ACCEPTABLE (items)
  count." (The alias read `claude-opus-5-5` at arming, so option (i) does not arise unless it changes by grading.)
- **A8** (§7.4 grader-models bullet), appended: "A `<synthetic>` assistant record (the client's API-error
  placeholder, 0 tokens) carries no model identity: it is counted and printed, and does not make an agent mixed."
- **A9** (§4 Counting rulings), appended: "3c's gated clause covers the gated ids the twin files hold (39 when R05 is
  lost). A twin file that lacks an id another rep holds makes 3c INCOMPLETE (the adapter prints REFUSED, exit 2),
  never a reading."
- **A10** (§7.1, the user's live look): the user asked at about 16:35 to "do the merge" without the live look; the
  merge review's item I1 and §7.1's live look are waived by the user's decision. The knowledge-mode read of §7.3a was
  made without it (no app started by hand since): ON on the admin-share line (§11).
- **A11** (§7.5, the chains wrap): deferred to the flight's own chains pass. Running it Thursday needs the tracked
  `interview60.chains.json`, which holds the user's uncommitted local change, moved aside; the controller does not
  move the user's files. The post-flight read checks the chains pass's `EXIT 0` and its report section for no
  `__CUES__`, as §7.5 provides.
- **A12** (§7.4 `h40d-twins.mjs`): Friday's reading passes `--dist <MAIN>` (review M2); the result note records it.
  The 3d item-to-winner join is built after the hour from `h40d-clocks.mjs --list` and the pairs' `dispatchedAt`,
  every 3.1-lite win passed as `<id>=gemini-3.1-flash-lite`, and listed in the note (review M5). `h40d-rule3.mjs` is
  never run with `--reasons` on Friday.
- **A13** (§11, after this commit): the registered HEAD is this file's commit. The dry twin's `GUARD OK`, the flight
  task's registration read-back and the precheck run after this commit; any later commit to MAIN would move HEAD and
  fail guard 10b. So those three are recorded in the post-arming ledger (`SP\AGENDA.md`) and in the result note, not
  in this file.
- **§12's user decisions:** the user made none of items 1–3 and 6–8 explicitly before arming; the controller's
  defaults stand, as §12 provides (item 4 is A10; item 5 does not arise: +55 tokens).
