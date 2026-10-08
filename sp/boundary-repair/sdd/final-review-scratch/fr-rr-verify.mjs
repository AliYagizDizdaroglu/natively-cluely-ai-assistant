// Scoped re-review of the final fix round (throwaway, read-only on MAIN; no git).
//  1. the round-start copies (sdd/t4-r2) are the files I reviewed (package hashes);
//  2. MAIN's 10 files now: the 4 edited ones vs the coordinator's table, the other 6 unchanged;
//  3. the two edited test files == my own proposals rebuilt from the REVIEWED files (the fr-t4-cal / fr-t5-cal transformations);
//  4. the two source files are comment-only: esbuild transpile identical (calibrated with a one-character code change),
//     and the module header, read as words, equals the reviewed header with exactly the two intended replacements.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const R2 = path.join(HERE, '..', 't4-r2');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
let bad = 0;
const ok = (c, m) => { if (!c) bad++; console.log(`${c ? 'OK  ' : 'BAD '} ${m}`); };
const rd = (p) => fs.readFileSync(p);
const A = 'electron/audio/', G = 'electron/test/golden/';

console.log('1. round-start copies = the reviewed files');
const REVIEWED = {
    'DeepgramStreamingSTT.boundaryRepair.test.ts': [A, 13838, '2f3eb860c6142415'],
    'DeepgramStreamingSTT.ts': [A, 16236, '57292516fc495df1'],
    'deepgramBoundaryRepair.ts': [A, 10743, 'd5ba4da0650e7531'],
    'interview60.turns-finals.test.ts': [G, 4115, 'd40c6c235cb69281'],
};
for (const [n, [, size, h]] of Object.entries(REVIEWED)) { const b = rd(path.join(R2, n)); ok(b.length === size && sha(b).startsWith(h), `t4-r2/${n} ${b.length} B ${sha(b).slice(0, 16)}`); }

console.log('2. MAIN now');
const NOW = {
    [A + 'DeepgramStreamingSTT.boundaryRepair.test.ts']: [14252, '5f43849a'],
    [A + 'DeepgramStreamingSTT.ts']: [16232, '74fff12e'],
    [A + 'deepgramBoundaryRepair.ts']: [10955, '97f1ba9f'],
    [G + 'interview60.turns-finals.test.ts']: [4144, '0796ae68'],
    [A + 'deepgramBoundaryRepair.test.ts']: [13947, '6956aea35dfef746'],
    [A + 'deepgramBoundaryRepair.fixtures.json']: [22788, 'e65c6e746f821642'],
    [A + 'deepgramKeyterms.ts']: [5801, 'b4431b9138d9688f'],
    [A + 'deepgramKeyterms.test.ts']: [3429, 'bfdd8a5d91f48da7'],
    [G + 'interview60.turns-finals.mjs']: [2119, '365cca381954a2e0'],
    [G + 'interview60.turns-fixture.mjs']: [5470, 'cfd7c87666393bb8'],
};
for (const [rel, [size, h]] of Object.entries(NOW)) {
    const b = rd(path.join(MAIN, rel));
    const cr = b.includes(13), bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    ok(b.length === size && sha(b).startsWith(h) && !cr && !bom, `${rel} ${b.length} B ${sha(b).slice(0, 16)} CR=${cr} BOM=${bom}`);
}

console.log('3. the edited tests == my proposals rebuilt from the reviewed files');
const sub = (s, a, b) => { if (s.split(a).length !== 2) throw new Error(`expected exactly one: ${a}`); return s.replace(a, b); };
{   // fr-t4-cal.mjs, verbatim transformation
    const t0 = rd(path.join(R2, 'DeepgramStreamingSTT.boundaryRepair.test.ts')).toString('utf8');
    const ANCHOR = "        // Indonesian is written in plain ASCII, so the module's own non-ASCII guard does not refuse it: the rule ALONE";
    const NEW_TEST = [
        "        it('the 5 s window runs on the arrival clock: F2 5001 ms after F1 is emitted as received, no repair line', () => {",
        '            const { stt, seen } = start();',
        '            playSeam(() => vi.advanceTimersByTime(5001 - (F2.atMs - F1.atMs)));   // F1 -> F2 = 5001 ms, one past the window',
        '            stt.stop();',
        '            expect(seen).toEqual(unchanged);',
        '            expect(repairs()).toEqual([]);',
        '        });',
        '',
        '',
    ].join('\n');
    const p = sub(sub(t0, ANCHOR, NEW_TEST + ANCHOR), 'this covers the other way a socket is replaced:', 'this covers another way a socket is replaced:');
    ok(Buffer.compare(Buffer.from(p, 'utf8'), rd(path.join(MAIN, A + 'DeepgramStreamingSTT.boundaryRepair.test.ts'))) === 0, 'adapter test == fr-t4-cal proposal (byte for byte)');
}
{   // fr-t5-cal.mjs, verbatim transformation
    const t0 = rd(path.join(R2, 'interview60.turns-finals.test.ts')).toString('utf8');
    const p = sub(sub(t0,
        "        const [, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, rep, rep].join('\\n'), 0)).toThrow(",
        "        const [iv, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, iv, rep].join('\\n'), 0)).toThrow("),
        "it('keeps interims and empty finals out, and drops finals before `since`', () => {",
        "it('keeps interims and empty finals out, drops finals before `since` and keeps a final exactly at it', () => {");
    ok(Buffer.compare(Buffer.from(p, 'utf8'), rd(path.join(MAIN, G + 'interview60.turns-finals.test.ts'))) === 0, 'extractor test == fr-t5-cal proposal (byte for byte)');
}

console.log('4. comment-only: transpile identity (calibrated) + the header read as words');
const req = createRequire(path.join(MAIN, 'package.json'));
const esbuild = req('esbuild');
const tr = (src) => esbuild.transformSync(src, { loader: 'ts', format: 'cjs', target: 'node20', platform: 'node' }).code;
for (const [n, calFrom, calTo] of [['DeepgramStreamingSTT.ts', 'data.speech_final === true', 'data.speech_final == true'], ['deepgramBoundaryRepair.ts', 'REPAIR_WINDOW_MS = 5000', 'REPAIR_WINDOW_MS = 5001']]) {
    const before = rd(path.join(R2, n)).toString('utf8'), after = rd(path.join(MAIN, A + n)).toString('utf8');
    const same = tr(before) === tr(after);
    const cal = tr(sub(before, calFrom, calTo)) !== tr(before);
    ok(same && cal, `${n}: transpile before == after: ${same} (${tr(after).length} chars); calibration (${calFrom} -> ${calTo}) changes it: ${cal}`);
}
{
    const words = (s) => s.replace(/\n \*\s*/g, ' ').replace(/\s+/g, ' ');
    const before = rd(path.join(R2, 'deepgramBoundaryRepair.ts')).toString('utf8'), after = rd(path.join(MAIN, A + 'deepgramBoundaryRepair.ts')).toString('utf8');
    const want = sub(sub(words(before),
        "Traw = the same words in I's own spelling.",
        "Traw = the same words in I's own spelling, as [A-Za-z0-9']+ runs: punctuation inside a word is lost (\"4.1\" -> \"4 1\", \"C++\" -> \"C\"); none of the 25 non-holdout restores held such a word, so the effect is unmeasured."),
        '0 of 29 log repairs', '0 of the 25 non-holdout log repairs');
    ok(want === words(after), 'module header, as words = reviewed header + exactly the two replacements');
    const widest = Math.max(...before.split('\n').slice(0, 66).map((l) => l.length));
    const added = after.split('\n').filter((l) => !before.split('\n').includes(l));
    ok(added.every((l) => l.length <= widest && l.startsWith(' *          ')), `added header lines: ${added.length}, max ${Math.max(...added.map((l) => l.length))} cols (header's widest before: ${widest}), indentation kept`);
    const a2 = rd(path.join(R2, 'DeepgramStreamingSTT.ts')).toString('utf8'), b2 = rd(path.join(MAIN, A + 'DeepgramStreamingSTT.ts')).toString('utf8');
    ok(sub(a2, '(median 187 per flight hour)', '(median 187 per run log)') === b2, 'adapter: exactly "(median 187 per flight hour)" -> "(median 187 per run log)"');
}
console.log(bad ? `${bad} PROBLEM(S)` : 'ALL CHECKS PASS');
process.exit(bad ? 1 : 0);
