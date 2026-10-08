// Task 5 (throwaway): the states of finalsFrom that the committed tests do not pin, exercised directly on MAIN's module.
// Every case runs against the NEW module (must equal the expectation) and against the OLD inline parse (the brief's first
// ```js block): the cases whose expectation involves a restored word must make the OLD parse differ, the others must not,
// so each expectation is shown able to fail. Read-only.
//   node t5-states.mjs
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { finalsFrom } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.turns-finals.mjs')).href);
const { finalsFrom: oldFinalsFrom } = await import(pathToFileURL(path.join(HERE, 't5-seam', 'old-parse.mjs')).href);
const P = '[LOG] [DeepgramStreaming]';
const fin = (iso, text) => `${iso} ${P} Transcript event — isFinal=true, text="${text}"`;
const rep = (iso, words, before = 'x') => `${iso} ${P} boundary repair: restored "${words}" before "${before}"`;
const t = (iso) => Date.parse(iso);
const A = '2026-09-29T11:00:00.000Z', B = '2026-09-29T11:00:01.000Z', C = '2026-09-29T11:00:02.000Z';
// [name, log text, since, expected, restoredInvolved]
const cases = [
    ['FINAL as the very last line, no trailing newline (lines[i + 1] is undefined)', fin(A, 'tail'), 0, [{ at: t(A), text: 'tail' }], false],
    ['FINAL then repair as the very last two lines, no trailing newline', [fin(A, 'production'), rep(A, 'for a')].join('\n'), 0, [{ at: t(A), text: 'for a production' }], true],
    ['CRLF line endings, with a repair', [fin(A, 'How do you cut'), fin(B, 'in a rag'), rep(B, 'hallucinations'), ''].join('\r\n'), 0, [{ at: t(A), text: 'How do you cut' }, { at: t(B), text: 'hallucinations in a rag' }], true],
    ['CRLF line endings, no repair', [fin(A, 'one'), fin(B, 'two'), ''].join('\r\n'), 0, [{ at: t(A), text: 'one' }, { at: t(B), text: 'two' }], false],
    ['an orphan repair line before any final changes nothing', [rep(A, 'zzz'), fin(B, 'hello')].join('\n'), 0, [{ at: t(B), text: 'hello' }], false],
    ['an interim followed by a repair line: no final, nothing restored', [`${A} ${P} Transcript event — isFinal=false, text="How do you cut hallucinations"`, rep(A, 'zzz')].join('\n'), 0, [], false],
    ['the repair line may carry a later millisecond than its final (the real handler logs two calls)', [fin(A, 'answer'), rep('2026-09-29T11:00:00.001Z', 'the')].join('\n'), 0, [{ at: t(A), text: 'the answer' }], true],
    ["an apostrophe in the restored word survives ('don't' is a rawTok token)", [fin(A, 'know what'), rep(A, "don't")].join('\n'), 0, [{ at: t(A), text: "don't know what" }], true],
    ['a two-word restore', [fin(A, 'production'), rep(A, 'for a')].join('\n'), 0, [{ at: t(A), text: 'for a production' }], true],
    ['escaped quotes in the raw text decode as before', [fin(A, 'say \\"hi\\" now')].join('\n'), 0, [{ at: t(A), text: 'say "hi" now' }], false],
    ['escaped quotes in the raw text, with a repair', [fin(A, 'say \\"hi\\" now'), rep(A, 'I')].join('\n'), 0, [{ at: t(A), text: 'I say "hi" now' }], true],
    ['only the first repair line after a final is used; a second one is ignored', [fin(A, 'b'), rep(A, 'a'), rep(A, 'zzz')].join('\n'), 0, [{ at: t(A), text: 'a b' }], true],
    ['a [WARN]-prefixed repair-looking line is not a repair (the adapter writes console.log = [LOG])', [fin(A, 'b'), `${A} [WARN] [DeepgramStreaming] boundary repair: restored "a" before "b"`].join('\n'), 0, [{ at: t(A), text: 'b' }], false],
    ['a final AT since is kept (>=)', [fin(A, 'edge')].join('\n'), t(A), [{ at: t(A), text: 'edge' }], false],
    ['a final 1 ms BEFORE since is dropped', [fin(A, 'edge')].join('\n'), t(A) + 1, [], false],
    ['an empty log', '', 0, [], false],
    ['an unparsable timestamp is dropped (NaN >= since is false), as before', [`garbage ${P} Transcript event — isFinal=true, text="x"`].join('\n'), 0, [], false],
    ['two finals, only the second followed by a repair: only the second is restored', [fin(A, 'first'), fin(B, 'second'), rep(B, 'and')].join('\n'), 0, [{ at: t(A), text: 'first' }, { at: t(B), text: 'and second' }], true],
    ['a repair line two lines after its final (one other line between) is not applied', [fin(A, 'first'), `${B} [LOG] [Main] turn: something`, rep(C, 'zzz')].join('\n'), 0, [{ at: t(A), text: 'first' }], false],
];
let bad = 0;
for (const [name, log, since, expected, restoredInvolved] of cases) {
    const got = finalsFrom(log, since);
    const okNew = isDeepStrictEqual(got, expected);
    const old = oldFinalsFrom(log, since);
    const oldDiffers = !isDeepStrictEqual(old, expected);
    const okOld = oldDiffers === restoredInvolved;   // the OLD parse must differ exactly when a restored word is expected
    if (!okNew || !okOld) bad++;
    console.log(`[${okNew && okOld ? 'ok' : 'FAIL'}] ${name}${okNew ? '' : ` | NEW gave ${JSON.stringify(got.map((f) => f.text))}`}${okOld ? '' : ` | OLD parse ${oldDiffers ? 'differs' : 'equals'} the expectation (unexpected)`}`);
}
console.log(bad ? `RESULT: ${bad} problem(s)` : `RESULT: all ${cases.length} states behave as expected on the new module; the old parse differs on exactly the restored-word cases`);
process.exit(bad ? 1 : 0);
