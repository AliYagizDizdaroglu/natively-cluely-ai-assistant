
---

## Re-review (fix round 1)

Scope: `review-ea75347..e301be6.diff` (commit `e301be6`, "fix(golden): parse a held detection's question, cover the hold action, show the superseding text"), against R27/R28 and `task-10-fix1-report.md`. Read-only; verified from the code, not the report.

### R27 — `reason=` group + hold coverage

**Addressed.** Extracted the live regex literal straight out of `interview60.metrics.mjs:67` with a small script (`eval`'d the matched `/…/gm` source, not retyped by hand) and ran it against all 13 real dispatch-line shapes from `electron/main.ts` (the same sweep as the original review), plus the historical `extend` shape:

```
Extracted regex source: ^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend|hold|mark|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: extends="(?:[^"\\]|\\.)*")?(?: replaces="(?:[^"\\]|\\.)*")?(?: reason=\w+)?(?: question="((?:[^"\\]|\\.)*)")?
supersede (main.ts:1011) => action=supersede source=whisper anchor=A verdict=match dupOf=undefined answered=undefined question=Q
drop fragment (2063) => action=drop source=live anchor=A verdict=fragment dupOf=undefined answered=undefined question=Q
mark (2078) => action=mark source=whisper anchor=A verdict=match dupOf=undefined answered=undefined question=Q
drop unverifiable (2092) => action=drop source=live anchor=A verdict=unverifiable dupOf=live answered=false question=Q
drop dup (2104) => action=drop source=whisper anchor=A verdict=match dupOf=live answered=false question=Q
hold (2107) -- REAL SHAPE => action=hold source=whisper anchor=A verdict=match dupOf=undefined answered=undefined question=Q
drop verdict.dupOf (2114) => action=drop source=whisper anchor=A verdict=match dupOf=none answered=true question=Q
answer (2117) => action=answer source=live anchor=A verdict=match dupOf=undefined answered=undefined question=Q
chip (2117) => action=chip source=whisper anchor=A verdict=match dupOf=undefined answered=undefined question=Q
extend (OLD historical log) => action=extend source=live anchor=A verdict=match dupOf=undefined answered=undefined question=Q
```

Confirms both parts of the coordinator's check: the new `(?: reason=\w+)?` sits exactly where `main.ts:2107`'s real `reason=fragmentary` token falls (after `verdict=`/`duplicateOf=`/`extends=`/`replaces=`, before `question=`), `hold`'s `question` now parses (was `null` before this round), and **every other action's `question` capture (`m[8]`) is unshifted** — verified programmatically for all 9 other real shapes plus the old `extend` format, not just by inspection.

The new test (`interview60.metrics.test.ts`, "a held detection is a detection…") pins exactly what was asked: `m27.dispatches` stays `1` (hold excluded from `surfaced`), `m27.supersedes` stays `1` (unaffected), `m.surfacedMulti` stays `1` (no double inflation anywhere), `held.question` equals the fixture's held text (proves the parse), `m27.detectMs` becomes `-900` (hold counts as a detection). Re-derived the knock-on arithmetic independently from the fixture rather than trusting the report's numbers:
- `detectMs` sorted array goes from `[-800, 1000, 1000, 1500, 1500, 2000, 4000, 4000]` to `[-900, 1000, 1000, 1500, 1500, 2000, 4000, 4000]` — still 8 values (the hold is a 4th dispatch line on the *same* M27 item, not a new item), only the front element moves. `pct(a,.5)=a[floor(8*.5)]=a[4]=1500` and `pct(a,.9)=a[floor(8*.9)]=a[7]=4000` are both untouched by a change to `a[0]` — `detectP50`/`detectP90` correctly unchanged.
- `m.heard` unchanged at `8`: the hold's `source=whisper` matches M27's other three dispatches, so `heardBy` stays `'whisper'` (size-1 set), never flips to `'both'`.
- `m.pinned` unchanged at `{answers:15, legacy:8, missing:4, mismatched:1}`: `pinned` only iterates `dispatches.filter(d => d.action === 'answer')`, and hold is never that action.

All match the fixture's arithmetic exactly, independent of the report.

### R28 — render `heardSuperseded`

**Addressed.** `interview60.pass-record.mjs`'s per-question line now reads:
```
heard: "${a.heard ?? ''}"${a.heardExtended ? `\nextended with: "${a.heardExtended}"` : ''}${a.heardSuperseded ? `\nsuperseded with: "${a.heardSuperseded}"` : ''}`
```
— byte-for-byte the same conditional-suffix shape as the pre-existing `heardExtended` clause (`\n<label> with: "<text>"`), appended directly after it. The new test sets `heardSuperseded` to a distinct literal string and asserts the rendered Markdown contains `superseded with: "And what about a service mesh instead?"` — a real assertion on the interpolated text, not just presence of the word "superseded" (which the pre-existing tag test already covered). Confirms Minor 2 from the original review is closed.

### New `dispatches` export — narrow and harmless

Confirmed narrow: one existing local `const dispatches = [...]` (the regex's raw per-line parse, already computed for `pinned`/attribution) added to the pre-existing "extra, not part of the gate" section of `computeRunFromFiles`'s return object — no new computation, no new function. Checked for collisions and blast radius:
- `grep -rn '\.dispatches\b'` across `electron/test/golden/*.mjs` and `*.ts` shows every other reference is the unrelated **per-item** `i.dispatches`/`m27.dispatches` (an integer, the surfaced count) — the only consumer of the new **top-level** `m.dispatches` (the raw array) is the one new hold test. No naming collision, nothing else reads or is affected by it.
- `interview60.judge.mjs` has its own locally-scoped `dispatches` inside `pairAnswers`, unrelated to this export.
- `interview60.pass-record.mjs`, `interview60.run.mjs`, `interview60.report-html.mjs` (the only other consumers of `computeRun`/`computeRunFromFiles`) never blanket-serialize the metrics object (`grep` for `JSON.stringify(m` finds nothing) — so the new array can't silently bloat a written report or `.done.json`.
- Not read by `GATE`/`evaluateGate` — confirmed it plays no role in any pass/fail rule.

### Verification run (this session)

```
$ node node_modules/vitest/vitest.mjs run electron/test/golden/
 Test Files  6 passed (6)
      Tests  72 passed | 5 skipped (77)
```

```
$ node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3430,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3430,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```
Exactly the six pre-existing errors named in the original review; nothing new.

```
$ git log -1 --format=%B e301be6
fix(golden): parse a held detection's question, cover the hold action, show the superseding text

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

```
$ git diff ea75347..e301be6 --stat
 electron/test/golden/interview60.metrics.mjs       | 17 ++++---
 electron/test/golden/interview60.metrics.test.ts   | 57 +++++++++++++++++-----
 electron/test/golden/interview60.pass-record.mjs   |  2 +-
 .../test/golden/interview60.pass-record.test.ts    |  9 ++++
 4 files changed, 66 insertions(+), 19 deletions(-)
```
Matches the review package exactly; `interview60.judge.mjs`/`interview60.judge.test.ts` untouched this round, as expected (nothing in R27/R28 touches the judge).

### Updated verdicts

1. **Spec compliance: ✅ PASS** (unchanged from the original review; R27/R28 close the two rulings without introducing new deviations).
2. **Task quality: Approved.** Important I1 (hold untested) is closed by a real fixture line plus a dedicated test that independently discriminates the fix (report's revert-and-confirm calibration for both new tests is consistent with what a hand revert of the `reason=` group / the `heardSuperseded` interpolation would produce — traced through by hand above, not just re-stated). Minors 3, 4, 5 from the original review stand, left deliberately by the controller; no new findings from this round.
