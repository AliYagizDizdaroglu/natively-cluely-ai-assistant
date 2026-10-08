# Final fix round (the ONE fix dispatch after the whole-change Opus review)

The review is "Ready with fixes". Its scratch is in `BR\sdd\final-review-scratch\`; the mutant calibrations are `fr-t4-cal.mjs` + `.out.txt` and `fr-t5-cal.mjs` + `.out.txt`.

These edits touch four MAIN files: tests and comments only, NO code behaviour.

- Stage under `BR\stage\` and copy with `SP\copy-into-main.mjs <staged> <MAIN-relative path> --overwrite`. LF only.
- Before editing each file, check that its staged copy is byte-identical to MAIN's (size + sha256). If one differs, re-seed that one file with `node BR\seed-stage.mjs <path>`.
- Starting sizes (MAIN now):

| file | bytes | sha256 |
|---|---|---|
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` | 13,838 | 2f3eb860… |
| `electron/audio/DeepgramStreamingSTT.ts` | 16,236 | 57292516… |
| `electron/audio/deepgramBoundaryRepair.ts` | 10,743 | d5ba4da0… |
| `electron/test/golden/interview60.turns-finals.test.ts` | 4,115 | d40c6c23… |

If a MAIN size differs, STOP and report.

## E1 (Minor 5, the one real gap): pin the adapter's clock
An adapter passing a constant `0` as atMs (so the 5 s window never closes) passes all 10 adapter tests today.

In `DeepgramStreamingSTT.boundaryRepair.test.ts`, insert these lines IMMEDIATELY BEFORE the line that begins `        // Indonesian is written in plain ASCII, so the module's own non-ASCII guard does not refuse it: the rule ALONE`. That places it after the empty-INTERIM control, so that test's "the three above" stays true. Two blank lines follow the test, as shown:
```ts
        it('the 5 s window runs on the arrival clock: F2 5001 ms after F1 is emitted as received, no repair line', () => {
            const { stt, seen } = start();
            playSeam(() => vi.advanceTimersByTime(5001 - (F2.atMs - F1.atMs)));   // F1 -> F2 = 5001 ms, one past the window
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });


```
Test first: the real adapter passes the new test (11/11). A mirror copy of the adapter with `Date.now()` replaced by `0` in the `boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true)` call must fail ONLY this test (10/11). Never put the mutant in MAIN. This reproduces `fr-t4-cal.out.txt`.

## E2 (Minor 4, Task 4 nit): same test file
Replace `this covers the other way a socket is replaced:` with `this covers another way a socket is replaced:`.

## E3 (Minor 2 + 3, Task 5): `electron/test/golden/interview60.turns-finals.test.ts`
- **T3's orphan case:** replace
  ```ts
          const [, f1, f2, rep] = LOG.split('\n');
          expect(() => finalsFrom([f2, rep, rep].join('\n'), 0)).toThrow(
  ```
  with
  ```ts
          const [iv, f1, f2, rep] = LOG.split('\n');
          expect(() => finalsFrom([f2, iv, rep].join('\n'), 0)).toThrow(
  ```
  The rest of the statement is unchanged.
- **T2's name:** replace `it('keeps interims and empty finals out, and drops finals before \`since\`', () => {` with `it('keeps interims and empty finals out, drops finals before \`since\` and keeps a final exactly at it', () => {`.
- **Mutant check (mirror only):** the module with `!FINAL.test(lines[i - 1] ?? '')` replaced by `REPAIR.test(lines[i - 1] ?? '')` passes the CURRENT test file and fails the NEW one. The real module passes 5/5. Removing either `throw` fails the new T3. This reproduces `fr-t5-cal.out.txt`.

## E4 (Minor 6 + 7, comments only): `electron/audio/deepgramBoundaryRepair.ts`
- **At :34:** replace `0 of 29 log` + `repairs` (it wraps onto :35 as `…0 of 29 log\n *          repairs had an empty final…`) with `0 of the 25 non-holdout log repairs had an empty final…`. The 29 counted the 4 holdout repairs as evidence.
- **At :31:** after `Traw = the same words in I's own spelling`, add: `, as [A-Za-z0-9']+ runs: punctuation inside a word is lost ("4.1" -> "4 1", "C++" -> "C"); none of the 25 non-holdout restores held such a word, so the effect is unmeasured`. The sentence keeps its final period.
- Re-wrap ONLY the touched comment lines to the block's existing width and ` *          ` indentation.

## E5 (Minor 8, comment only): `electron/audio/DeepgramStreamingSTT.ts:229`
Replace `(median 187 per flight hour)` with `(median 187 per run log)`. The 28 logs include 6 runs with no Deepgram finals.

## Proofs
- **Comment-only:** `DeepgramStreamingSTT.ts` and `deepgramBoundaryRepair.ts` transpile byte-identical before and after (your round-2 method). Calibrate that check once with a one-character code change.
- **Counts, as vitest prints them:**
  - `TEST electron/audio/` → 10 files / 143 (142 + E1);
  - adapter test file 11/11;
  - `electron/test/golden/interview60.turns-finals.test.ts` → 5/5.
- **tsc:** root clean; electron exactly the 6 baseline errors.
- **Report:** final bytes + sha256 of all four MAIN files.

## Rules
- No git.
- Never `.env`.
- No subagents.
- No `node -e`, no `bash <script>`.
- Mutants live only in mirror trees.
- Tests use the TEST form from a temp cwd, never the full suite.

Append a "## Final fix round" section to `BR\sdd\task-4-report.md`. Then reply briefly: status, one-line test summary, the four files' bytes + sha256, and concerns.
