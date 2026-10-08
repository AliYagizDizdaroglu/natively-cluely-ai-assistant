# sidefix2: notation filter chunking re-applied to MAIN (uncommitted)

MAIN branch fix/coding-style-suffix-all-gemini, HEAD eed4d7d. Source: uncommitted diff in worktree elastic-hertz-4344f1 (detached fed4b07).
Files touched in MAIN: electron/llm/verbalStreamFilter.ts (+11/-1), electron/llm/verbalStreamFilter.test.ts (+34). LF, 0 CR bytes before and after.

## Resolution
Both hunks applied unchanged: MAIN's `const held = ...` line (771) is byte-identical to the worktree's pre-image at fed4b07 (checked by patch.mjs against `git show fed4b07:`), and the test anchor (end of the "formulas that start with a number" describe) is unique. Cue mode and later commits (577d13a..d83fdfe) did not change this area. Applied diff content equals the original diff content (64 non-header lines, 0 differences; only the index and @@ lines differ).

## The change
- `held` regex: a "$" that closes a pair (lookbehind = cleanNotation's pair rule) opens no hold unless a second "$" follows ("$$" keeps its old hold); `\frac` is held until its second group closes.
- Tests added: (1) chunk-size identity on a typeset fraction, a bare \frac, money and a mix (sizes 1,2,3,7 vs whole, and whole vs today's output); (2) a "$$" run after a pair is not made more chunk-sensitive (size 7).

## Tests, before / after (cwd = temp folder under SP, MAIN's vitest, --root MAIN)
Before (new tests on the old impl): electron/llm/verbalStreamFilter.test.ts 144 passed, 1 failed. The failing test is test (1): "About $\frac{3000}{9500}$ of it." at sizes 1,2 gave "About $3000 over 9500 of it."; "\frac{a}{b}" at sizes 1,2,3 gave "frac{a}{b}"; the mix failed at 1,2,3. Test (2) passes before AND after: it is a guard, not a reproducer.
After: 145 passed, 0 failed.
Calibration of guard (2): a mutant without the `|(?=\$)` alternative differs from its whole-string output at size 7 (test (2) would fail); the shipped fix and the old impl do not. (extra.out.txt)

## Full suite (MAIN's vitest from a temp cwd): 102 files passed; 1089 passed / 0 failed / 4 skipped (1093). Baseline 1087/0/4 + the 2 new tests. (suite.txt)

## tsc
- root `tsc -p tsconfig.json --noEmit`: exit 0, 0 errors (tsc-root.txt).
- `tsc -p electron/tsconfig.json --noEmit`: 6 errors, all the pre-existing ones (GeminiLiveRouter.ts:125, ipcHandlers.ts:3436 x3, KnowledgeOrchestrator.ts:349,351); none in verbalStreamFilter (tsc-electron.txt).

## Old-vs-new replay through the built filter chain
Harness: replay.mjs (pattern of cue-group/old-vs-new-replay.mjs). OLD = HEAD eed4d7d's verbalStreamFilter.ts, NEW = the working-tree file (byte-identical copy), both esbuild-built (cjs, node20, no bundle) into SP/sidefix2/build/; MAIN's dist-electron untouched. 624 saved raw replies (spikes 1-6 + repro; 9 row files) fed through stripCueBlock -> filterCodeFences -> filterVerbalLines -> stripSuggestionBlock -> stripSpokenNotation at chunk sizes 1,2,3,7,90 and whole.
Calibration (replay.mjs --calibrate): OLD vs OLD = 0 changes; a crafted reply ("About $\frac{3000}{9500}$ of it, and \frac{a}{b} grows.") is chunk-dependent with OLD at size 1 and not with NEW, with 4 changed (reply,size) pairs. REPLAY CALIBRATION OK.
Result (replay.out.txt):
- whole-string output differs old vs new: 0
- cue or offers report differs: 0; new sentinel leaks (__MORE__/__CUES__): 0
- (reply, size) pairs where OLD output != NEW output: 0, over 0 replies
- replies whose chunked output differs from their own whole-string output: 0 for OLD and 0 for NEW at every size
Changed-reply list: EMPTY. Judgement: no regressions. Equally important: no saved reply exercises the bug. 73 of 624 replies contain "$" (all as money or pairs that were already chunk-stable), 0 contain "\frac". So the replay proves the fix is inert on the real corpus (matches the 2026-09-30 note: 625 unchanged, 0 regressions) but cannot demonstrate the fix; that evidence is the unit test failing before / passing after and the calibration's crafted reply.

## Not covered / residual
- Display math "$$...$$" stays chunk-sensitive, identically before and after (e.g. "it was $\sim$$$5 more." differs from its whole at sizes 2,3,5 for both OLD and NEW). Test (2) pins only that the fix adds no new size.
- The 625 saved replies contain no "$\frac{..}{..}$" or "\frac", so the live-corpus effect of the fix is untested; only synthetic strings and chunk sizes 1,2,3,7 (unit) / 1,2,3,7,90 (replay) were exercised.
- No live app run (not requested; app not started).

## Original diff (worktree elastic-hertz-4344f1)

```diff
diff --git a/electron/llm/verbalStreamFilter.test.ts b/electron/llm/verbalStreamFilter.test.ts
index e2f88b5..d15e041 100644
--- a/electron/llm/verbalStreamFilter.test.ts
+++ b/electron/llm/verbalStreamFilter.test.ts
@@ -209,6 +209,40 @@ describe('stripSpokenNotation — formulas that start with a number are not curr
             for (const size of [1, 2, 3, 4, 5, 7, 11]) expect(await runNotation(text, size)).toBe(ref);
         }
     });
+    it('is identical for every chunk size on a typeset fraction, a bare \\frac, money and a mix (2026-09-30)', async () => {
+        // Measured on the built filter 2026-09-30: at 1- and 2-character chunks the first
+        // case spoke "About $3000 over 9500 of it." and "\frac{a}{b}" spoke "frac{a}{b}",
+        // while the whole string was right. Each pair is [input, today's whole-string output],
+        // and the fix keeps every one of them.
+        const cases: [string, string][] = [
+            ['About $\\frac{3000}{9500}$ of it.', 'About 3000 over 9500 of it.'],
+            ['\\frac{a}{b}', 'a over b'],
+            ['$\\frac{3000}{9500}$', '3000 over 9500'],
+            ['$x^2$', 'x^2'],
+            ['about $120k a year', 'about $120k a year'],
+            // Today's reading, not an endorsement: money glued to the word before it loses its
+            // "$" (read as a closing delimiter), whole or chunked.
+            ['paid US$120k a year.', 'paid US120k a year.'],
+            ['About $\\frac{3000}{9500}$. That is $100,000$ a year, paid US$120k, so \\frac{a}{b} grows as $x^2$ at about $120k a year.',
+                'About 3000 over 9500. That is 100,000 a year, paid US120k, so a over b grows as x^2 at about $120k a year.'],
+        ];
+        const mismatches: string[] = [];
+        for (const [text, today] of cases) {
+            const whole = await runNotation(text, text.length);
+            if (whole !== today) mismatches.push(`whole ${JSON.stringify(text)} gave ${JSON.stringify(whole)}`);
+            for (const size of [1, 2, 3, 7]) {
+                const out = await runNotation(text, size);
+                if (out !== whole) mismatches.push(`${JSON.stringify(text)} at ${size} gave ${JSON.stringify(out)}`);
+            }
+        }
+        expect(mismatches).toEqual([]);
+    });
+    it('leaves a "$$" run after a pair split as it was: the closing-dollar fix must not reach display math', async () => {
+        // "$$" runs are chunk-sensitive before and after the fix above (display math is not
+        // handled); the fix must not add a chunk size to them. This one is right at 7 today.
+        const text = 'it was $\\sim$$$5 more.';
+        expect(await runNotation(text, 7)).toBe(await runNotation(text, text.length));
+    });
 });
 
 describe('extractSuggestions — splitting the spoken answer from its expansion offers', () => {
diff --git a/electron/llm/verbalStreamFilter.ts b/electron/llm/verbalStreamFilter.ts
index 71e4d15..294708c 100644
--- a/electron/llm/verbalStreamFilter.ts
+++ b/electron/llm/verbalStreamFilter.ts
@@ -504,7 +504,17 @@ export async function* stripSpokenNotation(
         // "$," let a closing delimiter pair with the comma that follows it, so the hold
         // released "$\frac{3,000}{9,500}" and kept "$," — splitting the very pair the
         // cleanNotation rule needs to see whole.
-        const held = s.match(/(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$(?:\d[\d,]*)?(?:\.\d*)?\$?\s*[/^\\]?\s*|\\[a-z]*(?:\{[^}]{0,40})?)$/);
+        // The comma was one case of a wider split: whenever the character after a pair broke
+        // the pair's own branch (a space after "$\frac{…}$", a "." after any pair), the money
+        // branch claimed the pair's CLOSING "$" as a new hold, and "$\frac{3000}{9500}$ of it"
+        // spoke "$3000 over 9500" at 1-character chunks (2026-09-30). So a "$" that closes a
+        // pair (the lookbehind is cleanNotation's pair rule, ending at this "$") opens no hold,
+        // unless a second "$" follows: a "$$" run keeps its old hold, since closingDelimiterFirst
+        // slices a single "$" and the next one would read as money. The lookbehind runs only
+        // once a "$" is consumed; before it, it scanned back from every position. "\frac" is
+        // held until its second group closes: the bare-command branch holds one open brace, so
+        // it released "\frac{a}" where the fraction rule could not match it.
+        const held = s.match(/(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$(?:(?<!\$(?:\d[\d,]*(?:\.\d+)?|\\[A-Za-z]+(?:\{[^{}]*\})*)\$)|(?=\$))(?:\d[\d,]*)?(?:\.\d*)?\$?\s*[/^\\]?\s*|\\frac\{[^{}]{0,40}\}(?:\{[^{}]{0,40})?|\\[a-z]*(?:\{[^}]{0,40})?)$/);
         if (held) {
             carry = held[0];
             s = s.slice(0, -carry.length);

```

## Addendum 2026-10-03 (Opus review: Low 1 and Low 2)

Low 1 (noted): the full-stop case is a REAL output change, not only a chunk-timing fix, and it is inside the requirement (a stray "dollar" before a closing delimiter must not be spoken). With the OLD filter the end-of-stream string "That is $100,000$." gives "That is $100,000." even when fed WHOLE (the money branch claims "$." as a hold and the closing "$" is kept as a leading "$" of the next span); the NEW filter gives "That is 100,000.". The 624-reply replay saw no such reply (0 changed), so the corpus is unaffected.

Low 2 (applied): two cases added to the chunking test, same sizes 1,2,3,7 as the existing cases (test file now +37 vs HEAD, 3 more lines than before; the cases are rows of the existing `it`, so the test count stays 145 in the file):
  ['That is $100,000$. Next.', 'That is 100,000. Next.']   mid-stream
  ['That is $100,000$.', 'That is 100,000.']                end of stream
Built filters (newcases.mjs; OLD = HEAD, NEW = HEAD + fix):
  OLD "That is $100,000$. Next.": whole ok; @1 DIFF "That is $100,000. Next."; @2 DIFF (same); @3 DIFF (same); @7 same   -> FAILS
  OLD "That is $100,000$.":       whole WRONG "That is $100,000."; @1,@2,@3,@7 same as that wrong whole         -> FAILS (the whole-string assertion)
  NEW both: whole ok; @1,@2,@3,@7 same                                                                          -> PASSES
Test file in MAIN (vitest from a temp cwd, --root MAIN): 145 passed / 0 failed (test-after2.txt).
Full suite: 102 files; 1089 passed / 0 failed / 4 skipped (1093) (suite2.txt). Unchanged from before the addendum, since the cases are rows inside an existing `it`.
I did not swap MAIN's impl back to the old one to run the vitest file against it (MAIN's tree is shared); the fail-before evidence is the old build's output above, which is what the test's assertions compare.
## Applied diff (MAIN, uncommitted; current)

```diff
diff --git a/electron/llm/verbalStreamFilter.test.ts b/electron/llm/verbalStreamFilter.test.ts
index b838828..a9daff2 100644
--- a/electron/llm/verbalStreamFilter.test.ts
+++ b/electron/llm/verbalStreamFilter.test.ts
@@ -210,6 +210,43 @@ describe('stripSpokenNotation — formulas that start with a number are not curr
             for (const size of [1, 2, 3, 4, 5, 7, 11]) expect(await runNotation(text, size)).toBe(ref);
         }
     });
+    it('is identical for every chunk size on a typeset fraction, a bare \\frac, money and a mix (2026-09-30)', async () => {
+        // Measured on the built filter 2026-09-30: at 1- and 2-character chunks the first
+        // case spoke "About $3000 over 9500 of it." and "\frac{a}{b}" spoke "frac{a}{b}",
+        // while the whole string was right. Each pair is [input, today's whole-string output],
+        // and the fix keeps every one of them.
+        const cases: [string, string][] = [
+            ['About $\\frac{3000}{9500}$ of it.', 'About 3000 over 9500 of it.'],
+            ['\\frac{a}{b}', 'a over b'],
+            ['$\\frac{3000}{9500}$', '3000 over 9500'],
+            ['$x^2$', 'x^2'],
+            // A full stop after a pair (review of 2026-10-03, Low 2): mid-stream and at the end of the stream.
+            ['That is $100,000$. Next.', 'That is 100,000. Next.'],
+            ['That is $100,000$.', 'That is 100,000.'],
+            ['about $120k a year', 'about $120k a year'],
+            // Today's reading, not an endorsement: money glued to the word before it loses its
+            // "$" (read as a closing delimiter), whole or chunked.
+            ['paid US$120k a year.', 'paid US120k a year.'],
+            ['About $\\frac{3000}{9500}$. That is $100,000$ a year, paid US$120k, so \\frac{a}{b} grows as $x^2$ at about $120k a year.',
+                'About 3000 over 9500. That is 100,000 a year, paid US120k, so a over b grows as x^2 at about $120k a year.'],
+        ];
+        const mismatches: string[] = [];
+        for (const [text, today] of cases) {
+            const whole = await runNotation(text, text.length);
+            if (whole !== today) mismatches.push(`whole ${JSON.stringify(text)} gave ${JSON.stringify(whole)}`);
+            for (const size of [1, 2, 3, 7]) {
+                const out = await runNotation(text, size);
+                if (out !== whole) mismatches.push(`${JSON.stringify(text)} at ${size} gave ${JSON.stringify(out)}`);
+            }
+        }
+        expect(mismatches).toEqual([]);
+    });
+    it('leaves a "$$" run after a pair split as it was: the closing-dollar fix must not reach display math', async () => {
+        // "$$" runs are chunk-sensitive before and after the fix above (display math is not
+        // handled); the fix must not add a chunk size to them. This one is right at 7 today.
+        const text = 'it was $\\sim$$$5 more.';
+        expect(await runNotation(text, 7)).toBe(await runNotation(text, text.length));
+    });
 });
 
 describe('extractSuggestions — splitting the spoken answer from its expansion offers', () => {
diff --git a/electron/llm/verbalStreamFilter.ts b/electron/llm/verbalStreamFilter.ts
index 2d88a4a..6a0b4ea 100644
--- a/electron/llm/verbalStreamFilter.ts
+++ b/electron/llm/verbalStreamFilter.ts
@@ -768,7 +768,17 @@ export async function* stripSpokenNotation(
         // "$," let a closing delimiter pair with the comma that follows it, so the hold
         // released "$\frac{3,000}{9,500}" and kept "$," — splitting the very pair the
         // cleanNotation rule needs to see whole.
-        const held = s.match(/(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$(?:\d[\d,]*)?(?:\.\d*)?\$?\s*[/^\\]?\s*|\\[a-z]*(?:\{[^}]{0,40})?)$/);
+        // The comma was one case of a wider split: whenever the character after a pair broke
+        // the pair's own branch (a space after "$\frac{…}$", a "." after any pair), the money
+        // branch claimed the pair's CLOSING "$" as a new hold, and "$\frac{3000}{9500}$ of it"
+        // spoke "$3000 over 9500" at 1-character chunks (2026-09-30). So a "$" that closes a
+        // pair (the lookbehind is cleanNotation's pair rule, ending at this "$") opens no hold,
+        // unless a second "$" follows: a "$$" run keeps its old hold, since closingDelimiterFirst
+        // slices a single "$" and the next one would read as money. The lookbehind runs only
+        // once a "$" is consumed; before it, it scanned back from every position. "\frac" is
+        // held until its second group closes: the bare-command branch holds one open brace, so
+        // it released "\frac{a}" where the fraction rule could not match it.
+        const held = s.match(/(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$(?:(?<!\$(?:\d[\d,]*(?:\.\d+)?|\\[A-Za-z]+(?:\{[^{}]*\})*)\$)|(?=\$))(?:\d[\d,]*)?(?:\.\d*)?\$?\s*[/^\\]?\s*|\\frac\{[^{}]{0,40}\}(?:\{[^{}]{0,40})?|\\[a-z]*(?:\{[^}]{0,40})?)$/);
         if (held) {
             carry = held[0];
             s = s.slice(0, -carry.length);

```
