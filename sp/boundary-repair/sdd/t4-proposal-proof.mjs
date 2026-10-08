// Task 4 (throwaway): calibrate the PROPOSED extra test (not added to MAIN) that pins the three `?.` null-guards on
// non-English sockets. Mirror tree, MAIN only READ. The proposal goes into the nested v4 describe of a COPY of the brief's
// test file, and is run against the final adapter (must pass) and against the single-edit `?.`-dropped mutants (must fail).
//   node t4-proposal-proof.mjs [--write-proposal <file>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 't4-mirror2');
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const adapterBuf = rdMain('electron/audio/DeepgramStreamingSTT.ts');
const adapter = adapterBuf.toString('utf8');
const briefTestBuf = rdMain('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts');
const briefTest = briefTestBuf.toString('utf8');
console.log(`final adapter ${adapterBuf.length} B ${sha16(adapterBuf)}; brief test ${briefTestBuf.length} B ${sha16(briefTestBuf)}`);

// The proposal: one `it.each` at the end of the nested v4 describe (its helpers `start`, `results`, `lives` are in scope).
const PROPOSAL = `
        // A non-English socket holds no repair object, so every pause signal must still be harmless there. The \`?.\` guards on the
        // empty-FINAL and UtteranceEnd clears are checked by nothing else (electron/tsconfig.json has no strictNullChecks).
        it.each(['indonesian', 'auto'])('%s: an empty FINAL, an empty INTERIM, an UtteranceEnd and a speech_final are harmless', (language) => {
            const { stt, seen } = start(language);
            const errors = vi.spyOn(console, 'error').mockImplementation(() => { });
            const ends: number[] = [];
            stt.on('utterance-end', (e: { at: number }) => ends.push(e.at));
            lives[0].fire('Results', results('hello there', true));
            lives[0].fire('Results', results('', true));
            lives[0].fire('Results', results('', false));
            lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 });
            lives[0].fire('Results', results('and more', true, true));
            stt.stop();
            expect(seen).toEqual([['hello there', true], ['and more', true]]);
            expect(ends).toHaveLength(1);
            expect(repairs()).toEqual([]);
            expect(errors).not.toHaveBeenCalled();        // a swallowed TypeError in the Transcript handler shows up here
        });
`;
const anchor = "            expect(repairs()).toEqual([]);\n        });\n    });\n});\n";
if (briefTest.split(anchor).length !== 2 || !briefTest.endsWith(anchor)) throw new Error('cannot find the end of the nested describe in the brief test');
const proposedTest = briefTest.slice(0, -anchor.length) + "            expect(repairs()).toEqual([]);\n        });\n" + PROPOSAL + "    });\n});\n";
const wi = process.argv.indexOf('--write-proposal');
if (wi > 0) { fs.writeFileSync(process.argv[wi + 1], PROPOSAL.replace(/^\n/, '')); console.log(`proposal snippet written to ${process.argv[wi + 1]}`); }

const once = (label, oldS, newS) => {
    const n = adapter.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return adapter.replace(oldS, () => newS);
};
const EMPTY_FINAL = 'if (isFinal) boundaryRepair?.clear();';
const UTT = "boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end'";
const P = ['indonesian: an empty FINAL', 'auto: an empty FINAL'];
const NONENG = 'a non-English connection passes every transcript through untouched';
const variants = [
    ['control: the final adapter', adapter, []],
    ['?. dropped on the UtteranceEnd clear', once('nullUtt', UTT, "boundaryRepair.clear(); if (!stale()) this.emit('utterance-end'"), P],
    ['?. dropped on the empty-final clear', once('nullEmpty', EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();'), P],
    ['?. dropped on onTranscript', once('nullOn', 'boundaryRepair?.onTranscript(', 'boundaryRepair.onTranscript('), [NONENG, ...P]],
    ['?. dropped on the repaired?. read (restored)', once('nullRestored', 'if (repaired?.restored)', 'if (repaired.restored)'), [NONENG, ...P]],
    ['gate removed', once('gate', 'const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;', 'const boundaryRepair = createBoundaryRepair();'), [NONENG]],
];

fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const CACHE = path.join(HERE, '.vitecache-t4b').replace(/\\/g, '/');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE)}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
put('electron/audio/deepgramBoundaryRepair.ts', rdMain('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', rdMain('electron/audio/deepgramBoundaryRepair.fixtures.json'));
put('electron/audio/deepgramKeyterms.ts', rdMain('electron/audio/deepgramKeyterms.ts'));
put('electron/config/languages.ts', rdMain('electron/config/languages.ts'));
put('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', proposedTest);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
let bad = 0;
try {
    for (const [name, src, want] of variants) {
        put('electron/audio/DeepgramStreamingSTT.ts', src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/DeepgramStreamingSTT'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
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
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction to MAIN's node_modules removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t4b'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`\nvariants whose failing set differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
