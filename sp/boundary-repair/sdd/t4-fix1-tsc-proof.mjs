// Task 4 fix round 1 (throwaway): two things about the electron type-check gate, on a MIRROR tree (MAIN only READ; junction to MAIN's
// node_modules, removed again). The mirror's electron/tsconfig.json is MAIN's, byte for byte, over the six files the adapter test needs.
//   (1) VERIFY a claim written into the new test's comment: "electron/tsconfig.json has no strictNullChecks, so tsc accepts a bare call".
//       The adapter with a bare `boundaryRepair.clear()` (mutants A and B) must type-check with ZERO errors.
//   (2) CALIBRATE the gate on the new lines: a deliberate type error inside each new test must be reported at that line.
//   node t4-fix1-tsc-proof.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 't4-mirror6');
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const ADAPTER_REL = 'electron/audio/DeepgramStreamingSTT.ts';
const adapter = rdMain(ADAPTER_REL).toString('utf8');
const test = rdMain(TEST_REL).toString('utf8');
const TSC = path.join(MAIN, 'node_modules/typescript/bin/tsc');
if (!fs.existsSync(TSC)) throw new Error('MAIN has no node_modules/typescript/bin/tsc');
const tsconfig = rdMain('electron/tsconfig.json');
console.log(`mirror tsconfig = MAIN's electron/tsconfig.json (${tsconfig.length} B); noImplicitAny/strict in it: ${JSON.stringify({ noImplicitAny: /"noImplicitAny":\s*true/.test(tsconfig.toString()), strict: /"strict"/.test(tsconfig.toString()), strictNullChecks: /strictNullChecks/.test(tsconfig.toString()) })}`);

const once = (text, oldS, newS, label) => { if (text.split(oldS).length !== 2) throw new Error(`${label}: anchor not unique: ${oldS}`); return text.replace(oldS, () => newS); };
const EMPTY_FINAL = 'if (isFinal) boundaryRepair?.clear();';
const UTT = "boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end'";
// [name, adapter text, test text, expected: 'clean' (tsc prints nothing) | 'errors' (at least one error in the test file, none elsewhere)]
const variants = [
    ['control: the files as they are in MAIN', adapter, test, 'clean'],
    ['(1) MUTANT A in the adapter: bare clear() at the empty-FINAL branch', once(adapter, EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();', 'A'), test, 'clean'],
    ['(1) MUTANT B in the adapter: bare clear() at the UtteranceEnd handler', once(adapter, UTT, "boundaryRepair.clear(); if (!stale()) this.emit('utterance-end'", 'B'), test, 'clean'],
    ['(2) type error in the new empty-FINAL test: a method the spy does not have', adapter, once(test, 'expect(errors).not.toHaveBeenCalled();', 'expect(errors).not.toHaveBeenCalled(); errors.noSuchMethod();', 'E1'), 'errors'],
    ['(2) type error in the new UtteranceEnd test: toHaveLength with a string', adapter, once(test, 'expect(ends, language).toHaveLength(1);', "expect(ends, language).toHaveLength('1');", 'E2'), 'errors'],
    ['(2) type error in the new UtteranceEnd test: the [key, code] table read as a number', adapter, once(test, '                const ends: number[] = [];', '                const n: number = code;\n                const ends: number[] = [];', 'E3'), 'errors'],
];

fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
put('electron/tsconfig.json', tsconfig);
put('electron/audio/deepgramBoundaryRepair.ts', rdMain('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', rdMain('electron/audio/deepgramBoundaryRepair.fixtures.json'));
put('electron/audio/deepgramKeyterms.ts', rdMain('electron/audio/deepgramKeyterms.ts'));
put('electron/config/languages.ts', rdMain('electron/config/languages.ts'));

let bad = 0;
try {
    for (const [name, src, testText, want] of variants) {
        put(ADAPTER_REL, src);
        put(TEST_REL, testText);
        const r = spawnSync(process.execPath, [TSC, '--noEmit', '-p', path.join(TREE, 'electron', 'tsconfig.json')], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const out = `${r.stdout}${r.stderr}`.trim();
        const lines = out ? out.split('\n') : [];
        const inTest = lines.filter((l) => /DeepgramStreamingSTT\.boundaryRepair\.test\.ts\(\d+,\d+\): error/.test(l));
        const inOther = lines.filter((l) => /error TS/.test(l) && !/DeepgramStreamingSTT\.boundaryRepair\.test\.ts\(/.test(l));
        const ok = want === 'clean' ? (r.status === 0 && lines.length === 0) : (inTest.length >= 1 && inOther.length === 0);
        if (!ok) bad++;
        console.log(`\n[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}\n   tsc exit ${r.status}, ${lines.length} output line(s), ${inTest.length} in the test file, ${inOther.length} elsewhere`);
        lines.slice(0, 4).forEach((l) => console.log('   | ' + l.replace(/^.*?(electron[\\/]audio)/, '$1')));
        if (want === 'errors') {
            // show the source line each error points at
            const tl = testText.split('\n');
            for (const l of inTest.slice(0, 2)) { const m = /\((\d+),(\d+)\)/.exec(l); if (m) console.log(`   line ${m[1]}: ${tl[Number(m[1]) - 1].trim().slice(0, 110)}`); }
        }
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction to MAIN's node_modules removed: ${gone}; MAIN's typescript still present: ${fs.existsSync(TSC)}`);
    if (gone) fs.rmSync(TREE, { recursive: true, force: true });
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`\nvariants that differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
