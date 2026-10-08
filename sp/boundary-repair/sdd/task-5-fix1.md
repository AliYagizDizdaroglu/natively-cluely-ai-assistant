# Task 5 fix round 1: the controller's rulings on the Opus task review

Files (MAIN-relative; stage under BR\stage\ and copy with SP\copy-into-main.mjs --overwrite):
- `electron/test/golden/interview60.turns-finals.mjs`: now 1,592 B, sha256 52e2cd63…
- `electron/test/golden/interview60.turns-finals.test.ts`: now 3,793 B, sha256 fb02da7b…

Before editing, check each staged copy is byte-identical to MAIN's file (size + sha256). If one differs, re-seed that one file with `node BR\seed-stage.mjs <MAIN-relative path>` before any edit. If MAIN's file differs from the size above, STOP and report.

Line numbers below are for the CURRENT files. Apply the edits in the order given, and re-locate lines by their text.

## F1 (Important): the parity tests must skip where `interview60.runs/` is absent
`interview60.runs/` is gitignored (`.gitignore:258`), so a clean checkout has no run logs. Three repo tests already guard this case: `interview60.metrics.test.ts:20`, `interview60.pass-record.test.ts:239` and `energyVad.test.ts:73`.

In the test file, replace these lines (currently :45-47):
```ts
        it(`reproduces the committed ${name} fixture's finals from its run log`, () => {
            const golden = __dirname;
            const run = path.join(golden, 'interview60.runs', name);
```
with:
```ts
        const golden = __dirname;
        const run = path.join(golden, 'interview60.runs', name);
        // interview60.runs/ is gitignored (.gitignore:258): a clean checkout has no run logs, so these skip there.
        it.skipIf(!fs.existsSync(path.join(run, 'natively_debug.log')))(`reproduces the committed ${name} fixture's finals from its run log (skipped where the run folder is absent)`, () => {
```
The rest of the body is unchanged.

RED/GREEN:
- In a MIRROR of the golden test folder WITHOUT `interview60.runs/` (never touch MAIN's folder), the CURRENT test file fails 2 tests (ENOENT). After the edit it gives `3 passed | 2 skipped`.
- In MAIN it gives 5 passed (4 passed + the new T3, after F4).
- Quote the counts vitest prints.

## F2 (Minor): pin `>=` in finalsFrom's since filter
In T2 (currently :32), change `at('2026-09-29T11:19:29.000Z')` to `at('2026-09-29T11:19:29.373Z')`. That is the repaired final's own timestamp.
- The expected output is unchanged.
- Show that a `>` mutant (a copy of the module with `at >= sinceMs` changed to `at > sinceMs`) fails T2 after the edit.

## F3 (Minor): the empty final sits where the app can log it
The app cannot log an empty final between F1 and F2 that is followed by a repair: an empty FINAL calls `clear()` (`DeepgramStreamingSTT.ts:232`). So T1's "as the app logs it" is untrue today.
- Remove the line `'2026-09-29T11:19:28.500Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""',` (currently :12).
- Insert this line directly AFTER the repair line (the `restored "hallucinations"` line):
```ts
    '2026-09-29T11:19:29.900Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""',
```
- T1 and T2 expectations are unchanged.
- Show that a no-empty-filter mutant (drop the `text &&` condition) now fails T2 as well as T1.

## F4 (Minor, accepted: global rule 11): finalsFrom refuses a repair line that is not right under its own final
One synchronous handler writes both lines, so a repair line with no final directly above it, or under a final its `before "…"` text does not name, is not what the app saw. Today the parser silently skips the first case and silently applies the second: dropping one event line from a real log yields "hallucinations How do you cut". Refuse both with a message naming the line.

(a) TEST FIRST. Remove the orphan line from LOG: `'2026-09-29T11:19:31.002Z [LOG] [DeepgramStreaming] boundary repair: restored "not" before "this one"',` (currently :18). Then replace T3 (the `it('a repair line that is not the very next line after a final is not applied …` test, currently :36-38) with:
```ts
    it('refuses a boundary-repair line that is not right under its own final (one synchronous handler writes both lines)', () => {
        const [, f1, f2, rep] = LOG.split('\n');
        expect(() => finalsFrom([f2, rep, rep].join('\n'), 0)).toThrow(/line 3 is a boundary repair with no final directly above it/);
        expect(() => finalsFrom([f1, rep].join('\n'), 0)).toThrow(/line 2 is a boundary repair for another final than line 1/);
    });
```
After F3, LOG's lines 0-3 are: the interim, F1 "How do you cut", F2 "in a rag answer…", and the repair line. Run the test on the CURRENT module and watch the new T3 FAIL (no throw). Quote it.

(b) THEN THE MODULE. In `finalsFrom`, replace:
```js
        const m = lines[i].match(FINAL);
        if (!m) continue;
        const rep = lines[i + 1]?.match(REPAIR);
```
with:
```js
        const m = lines[i].match(FINAL);
        if (!m) {
            if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw new Error(`finalsFrom: line ${i + 1} is a boundary repair with no final directly above it`);
            continue;
        }
        const rep = lines[i + 1]?.match(REPAIR);
        if (rep && !lines[i + 1].includes(`before "${m[2].slice(0, 40)}"`)) throw new Error(`finalsFrom: line ${i + 2} is a boundary repair for another final than line ${i + 1}`);
```
In the module's header comment, after "so a final directly followed by that line replays as `<words> <raw>`.", add ONE sentence:
"A repair line anywhere else (no final right above it, or under a final its `before` text does not name) refuses: that log is not what the app saw."
Keep the header's other lines. Re-wrap only the lines you touch; LF only.

(c) GREEN: the test file passes 5/5 in MAIN. Then show both checks are needed: removing either `throw` line (in a copy of the module, never MAIN) makes the new T3 fail.

## NOT changed (ruling)
- `.trim()` stays unpinned. `turn.final()` trims itself (`interviewerTurn.ts:189`) and the logs hold 0 padded finals; a pin would lock in the one place the extractor differs from the app, a whitespace-only final.
- T1's comment stays as is. After F3 it is true.

## Also verify
- **The extractor end-to-end** (the brief's command, from a temp cwd): the s50a and after9 outputs are deep-equal to the committed fixtures `fixtures/<run>-turns.json` on every key except `extractedAt`.
- **The refusals on real logs:** run `finalsFrom` with `since = 0` over EVERY run log in `electron/test/golden/interview60.runs/*/natively_debug.log`. The new checks must throw 0 times.
  - Run folders containing `h40` are holdout. Reading them for a throw count is allowed; report their count separately. This is a parser-robustness check, not a tuning measurement.
  - Also run it over the adapter-produced log from Task 4, if you still have it (the reviewer used a 17-repair log from the real adapter).
- **tsc:** root clean; electron exactly the 6 baseline errors (none in a touched file).
- **Report:** final bytes + sha256 of both MAIN files. Append a "## Fix round 1" section to `BR\sdd\task-5-report.md` with every RED/GREEN count as vitest prints it.
