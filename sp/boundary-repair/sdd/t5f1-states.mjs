// Task 5 fix round 1 (throwaway): the states of the FINAL finalsFrom (MAIN's module with the two refusals) that no committed test pins,
// each run against the final module (must equal the expectation: a result, or a refusal naming the right line) AND against the round-0
// module (sdd\t5f1-orig, no refusals). `changed` says whether the round-0 module must behave differently: true for every case that
// now refuses (the round-0 module must NOT throw the same message, so each refusal expectation is shown able to fail), false for the
// rest (nothing else moved). Repair lines are built with the `before "..."` text the real adapter writes: the first 40 chars of the raw
// final. Read-only.
//   node t5f1-states.mjs
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { finalsFrom } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.turns-finals.mjs')).href);
const { finalsFrom: round0 } = await import(pathToFileURL(path.join(HERE, 't5f1-orig', 'interview60.turns-finals.mjs')).href);
const P = '[LOG] [DeepgramStreaming]';
const fin = (iso, text) => `${iso} ${P} Transcript event — isFinal=true, text="${text}"`;
const rep = (iso, words, rawFinal) => `${iso} ${P} boundary repair: restored "${words}" before "${rawFinal.slice(0, 40)}"`;
const pair = (iso, raw, words, repIso = iso) => [fin(iso, raw), rep(repIso, words, raw)];
const t = (iso) => Date.parse(iso);
const A = '2026-09-29T11:00:00.000Z', B = '2026-09-29T11:00:01.000Z', C = '2026-09-29T11:00:02.000Z';
const LONG = 'in a rag answer without just making it refuse to answer at all';   // 62 chars: the repair line carries only the first 40
const T = (re) => ({ throws: re });
// [name, log text, since, expected (array of finals | { throws: RegExp }), changed]
const cases = [
    ['FINAL as the very last line, no trailing newline (lines[i + 1] undefined)', fin(A, 'tail'), 0, [{ at: t(A), text: 'tail' }], false],
    ['FINAL then repair as the very last two lines, no trailing newline', pair(A, 'production', 'for a').join('\n'), 0, [{ at: t(A), text: 'for a production' }], false],
    ['CRLF line endings, with a repair', [fin(A, 'How do you cut'), ...pair(B, 'in a rag', 'hallucinations'), ''].join('\r\n'), 0, [{ at: t(A), text: 'How do you cut' }, { at: t(B), text: 'hallucinations in a rag' }], false],
    ['CRLF line endings, a short final whose whole text is the `before` text (the CR follows the closing quote)', [...pair(A, 'abc', 'x'), ''].join('\r\n'), 0, [{ at: t(A), text: 'x abc' }], false],
    ['CRLF line endings, no repair', [fin(A, 'one'), fin(B, 'two'), ''].join('\r\n'), 0, [{ at: t(A), text: 'one' }, { at: t(B), text: 'two' }], false],
    ['a repair line before any final (the log starts with one: e.g. rotated between the two lines)', [rep(A, 'zzz', 'hello'), fin(B, 'hello')].join('\n'), 0, T(/finalsFrom: line 1 is a boundary repair with no final directly above it/), true],
    ['an interim followed by a repair line', [`${A} ${P} Transcript event — isFinal=false, text="How do you cut hallucinations"`, rep(A, 'zzz', 'How do you cut hallucinations')].join('\n'), 0, T(/finalsFrom: line 2 is a boundary repair with no final directly above it/), true],
    ['the repair line may carry a later millisecond than its final (the real handler logs two calls)', pair(A, 'answer', 'the', '2026-09-29T11:00:00.001Z').join('\n'), 0, [{ at: t(A), text: 'the answer' }], false],
    ["an apostrophe in the restored word survives ('don't' is a rawTok token)", pair(A, 'know what', "don't").join('\n'), 0, [{ at: t(A), text: "don't know what" }], false],
    ['a two-word restore', pair(A, 'production', 'for a').join('\n'), 0, [{ at: t(A), text: 'for a production' }], false],
    ['a final longer than 40 chars: the repair line carries only its first 40, and that is what is checked', pair(A, LONG, 'hallucinations').join('\n'), 0, [{ at: t(A), text: `hallucinations ${LONG}` }], false],
    ['escaped quotes in the raw text (both lines carry the same text)', [fin(A, 'say \\"hi\\" now')].join('\n'), 0, [{ at: t(A), text: 'say "hi" now' }], false],
    ['escaped quotes in the raw text, with a repair', pair(A, 'say \\"hi\\" now', 'I').join('\n'), 0, [{ at: t(A), text: 'I say "hi" now' }], false],
    ['an UNESCAPED quote inside the first 40 chars (how the adapter really writes it): the FINAL regex stops at the quote, the check still finds the prefix, no false refusal', pair(A, 'He said "hi" now', 'go').join('\n'), 0, [{ at: t(A), text: 'go He said' }], false],
    ['two repair lines in a row: the second has no final directly above it', [...pair(A, 'b', 'a'), rep(A, 'zzz', 'b')].join('\n'), 0, T(/finalsFrom: line 3 is a boundary repair with no final directly above it/), true],
    ['a [WARN]-prefixed look-alike is not a repair line (the adapter writes console.log = [LOG])', [fin(A, 'b'), `${A} [WARN] [DeepgramStreaming] boundary repair: restored "a" before "b"`].join('\n'), 0, [{ at: t(A), text: 'b' }], false],
    ['a final AT since is kept (>=)', fin(A, 'edge'), t(A), [{ at: t(A), text: 'edge' }], false],
    ['a final 1 ms BEFORE since is dropped', fin(A, 'edge'), t(A) + 1, [], false],
    ['an empty log', '', 0, [], false],
    ['an unparsable timestamp is dropped (NaN >= since is false), as before', `garbage ${P} Transcript event — isFinal=true, text="x"`, 0, [], false],
    ['two finals, only the second followed by a repair: only the second is restored', [fin(A, 'first'), ...pair(B, 'second', 'and')].join('\n'), 0, [{ at: t(A), text: 'first' }, { at: t(B), text: 'and second' }], false],
    ['a repair line two lines after its final (one other line between)', [fin(A, 'first'), `${B} [LOG] [Main] turn: something`, rep(C, 'zzz', 'first')].join('\n'), 0, T(/finalsFrom: line 3 is a boundary repair with no final directly above it/), true],
    ['a repair under a final its `before` text does not name (a dropped event line)', [fin(A, 'How do you cut'), rep(B, 'hallucinations', 'in a rag answer without just making it refuse?')].join('\n'), 0, T(/finalsFrom: line 2 is a boundary repair for another final than line 1/), true],
    ['the refusal names the line of a repair deep in the log', [fin(A, 'one'), fin(B, 'two'), `${C} [LOG] [Main] x`, fin(C, 'three'), rep(C, 'zzz', 'not three')].join('\n'), 0, T(/finalsFrom: line 5 is a boundary repair for another final than line 4/), true],
];
const run = (fn, log, since) => { try { return { ok: fn(log, since) }; } catch (e) { return { err: e.message }; } };
let bad = 0;
for (const [name, log, since, expected, changed] of cases) {
    const got = run(finalsFrom, log, since);
    const okNew = expected.throws ? !!got.err && expected.throws.test(got.err) : !got.err && isDeepStrictEqual(got.ok, expected);
    const r0 = run(round0, log, since);
    const r0SameAsNew = expected.throws ? !!r0.err && expected.throws.test(r0.err) : !r0.err && isDeepStrictEqual(r0.ok, expected);
    const okChanged = changed ? !r0SameAsNew : r0SameAsNew;
    if (!okNew || !okChanged) bad++;
    const r0Text = r0.err ? `throws "${r0.err}"` : `returns ${JSON.stringify(r0.ok.map((f) => f.text))}`;
    console.log(`[${okNew && okChanged ? 'ok' : 'FAIL'}] ${name}${okNew ? '' : ` | FINAL module gave ${got.err ? `a throw "${got.err}"` : JSON.stringify(got.ok.map((f) => f.text))}`}${changed ? ` | round-0 module (no refusals) ${r0Text}` : ''}${okChanged ? '' : ` | round-0 module ${changed ? 'behaves the same (the expectation cannot fail)' : 'behaves differently (unexpected)'}`}`);
}
console.log(bad ? `RESULT: ${bad} problem(s)` : `RESULT: all ${cases.length} states behave as expected on the final module; the round-0 module differs on exactly the ${cases.filter((c) => c[4]).length} refusal cases`);
process.exit(bad ? 1 : 0);
