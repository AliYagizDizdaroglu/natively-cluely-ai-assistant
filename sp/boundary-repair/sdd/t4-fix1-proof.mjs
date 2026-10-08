// Task 4 fix round 1 (throwaway): calibrate the TWO NEW adapter tests (the `?.` null-guard pins) on a MIRROR tree; MAIN only READ
// (junction to MAIN's node_modules, removed again; vite cache redirected; same jsdom/globals settings as MAIN's vitest.config.ts).
// Runs the whole adapter test file (8 tests) against the final adapter and single-edit mutants, and prints which tests fail; for the
// two mutants the new tests exist for, it also prints vitest's error block for each failing test.
//   node t4-fix1-proof.mjs              adapter from MAIN, test from the STAGE (before the test is copied into MAIN)
//   node t4-fix1-proof.mjs --from main  adapter AND test from MAIN (the final state)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage');
const TREE = path.join(HERE, 't4-mirror5');
const fromMain = process.argv.includes('--from') && process.argv[process.argv.indexOf('--from') + 1] === 'main';
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const adapterBuf = rdMain('electron/audio/DeepgramStreamingSTT.ts');
const testBuf = fromMain ? rdMain(TEST_REL) : fs.readFileSync(path.join(STAGE, TEST_REL));
console.log(`adapter (MAIN) ${adapterBuf.length} B ${sha16(adapterBuf)}; test (${fromMain ? 'MAIN' : 'STAGE'}) ${testBuf.length} B ${sha16(testBuf)}`);
const adapter = adapterBuf.toString('utf8');

const once = (label, oldS, newS) => {
    const n = adapter.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return adapter.replace(oldS, () => newS);
};
const GATE = 'const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;';
const EMPTY_FINAL = 'if (isFinal) boundaryRepair?.clear();';
const UTT = "boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end'";
const SPF = 'Date.now(), data.speech_final === true)';
const T = {
    restart: 'emits the repaired final, logs the raw text plus one repair line, and a restarted socket',
    emptyFinal: 'an empty FINAL between F1 and F2 is a pause',
    utteranceEnd: 'an UtteranceEnd between F1 and F2 is a pause too',
    speechFinal: 'speech_final on F1 reaches the module',
    emptyInterim: 'an empty INTERIM is not a pause',
    nonEnglish: 'a non-English connection passes every transcript through untouched',
    newA: 'an empty FINAL on a non-English or multi connection is harmless',
    newB: 'an UtteranceEnd on a non-English or multi connection is harmless',
};
// [name, adapter text, expected failing tests, print the error blocks?]
const variants = [
    ['control: the adapter as it stands in MAIN', adapter, [], false],
    ['MUTANT A: bare clear() at the empty-FINAL branch (`?.` dropped)', once('A', EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();'), [T.newA], true],
    ['MUTANT B: bare clear() at the UtteranceEnd handler (`?.` dropped)', once('B', UTT, "boundaryRepair.clear(); if (!stale()) this.emit('utterance-end'"), [T.newB], true],
    ['gate removed', once('gate', GATE, 'const boundaryRepair = createBoundaryRepair();'), [T.nonEnglish], false],
    ['empty-final clear dropped', once('efDrop', EMPTY_FINAL, ''), [T.emptyFinal], false],
    ['UtteranceEnd clear dropped', once('utDrop', UTT, "if (!stale()) this.emit('utterance-end'"), [T.utteranceEnd], false],
    ['speech_final not passed', once('spfDrop', SPF, 'Date.now())'), [T.speechFinal], false],
    ['clear on ANY empty transcript', once('any', EMPTY_FINAL, 'boundaryRepair?.clear();'), [T.emptyInterim], false],
    ['?. dropped on onTranscript', once('onT', 'boundaryRepair?.onTranscript(', 'boundaryRepair.onTranscript('), [T.nonEnglish, T.newA, T.newB], false],
    ['non-English text fallback -> empty string', once('fb', 'text: repaired?.text ?? transcript,', "text: repaired?.text ?? '',"), [T.nonEnglish, T.newA, T.newB], false],
];

fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const CACHE = path.join(HERE, '.vitecache-t4e').replace(/\\/g, '/');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE)}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
put('electron/audio/deepgramBoundaryRepair.ts', rdMain('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', rdMain('electron/audio/deepgramBoundaryRepair.fixtures.json'));
put('electron/audio/deepgramKeyterms.ts', rdMain('electron/audio/deepgramKeyterms.ts'));
put('electron/config/languages.ts', rdMain('electron/config/languages.ts'));
put(TEST_REL, testBuf);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');

let bad = 0;
try {
    for (const [name, src, want, showBlocks] of variants) {
        put('electron/audio/DeepgramStreamingSTT.ts', src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = lines.filter((l) => /^\s+×\s/.test(l)).map((l) => l.trim().replace(/^×\s*/, '').replace(/\s\d+ms$/, '').split(' > ').pop());
        const ok = want.every((w) => failed.some((g) => g.includes(w))) && failed.every((g) => want.some((w) => g.includes(w)));
        if (!ok) bad++;
        console.log(`\n[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}\n   ${summary}`);
        failed.forEach((f) => console.log(`   failed: ${f}`));
        if (!failed.length) console.log('   (no test failed)');
        if (!ok) console.log(`   wanted ${JSON.stringify(want)}`);
        if (showBlocks) {
            // the unedited vitest output of the two mutants the new tests exist for (ANSI colours stripped, nothing else changed)
            fs.writeFileSync(path.join(HERE, `t4-fix1-mutant-${name.startsWith('MUTANT A') ? 'A' : 'B'}.raw.txt`), out);
            // vitest's "Failed Tests" blocks: from " FAIL  ..." to the next "⎯⎯⎯" rule
            for (let i = 0; i < lines.length; i++) {
                if (!/^\s*FAIL\s/.test(lines[i])) continue;
                let j = i + 1; while (j < lines.length && !/^⎯/.test(lines[j])) j++;
                const block = lines.slice(i, j).filter((l) => l.trim() !== '');
                console.log('   ---- vitest failure block ----');
                block.slice(0, 16).forEach((l) => console.log('   | ' + l.replace(/^\s*FAIL\s+electron\/audio\/\S+ > .*? > (v4: .*? > )?/, 'FAIL ... > ')));
            }
        }
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction to MAIN's node_modules removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t4e'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`\nvariants whose failing set differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
