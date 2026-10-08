// Task 4 (throwaway): per-edit mutation proof on a MIRROR tree. MAIN is only READ (vitest and node_modules through a
// junction that this script removes again, then it deletes its own tree).
// Runs the FINAL adapter test file (the brief's 6 tests, byte for byte as in MAIN) plus one THROWAWAY extra test file
// (non-English sockets receiving an empty FINAL / empty INTERIM / UtteranceEnd / speech_final: the `?.` null-guard
// branches, which the brief's tests never fire and which tsc cannot guard because electron/tsconfig.json has no
// strictNullChecks) against the final adapter and against single-edit mutants, and prints which tests fail.
//   node t4-mutants.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage', 'electron', 'audio');
const TREE = path.join(HERE, 't4-mirror');
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));

// ---- inputs: the FINAL adapter (must equal MAIN's bytes), the final tests, the final keyterms
const adapterBuf = rdMain('electron/audio/DeepgramStreamingSTT.ts');
const stagedAdapter = fs.readFileSync(path.join(STAGE, 'DeepgramStreamingSTT.ts'));
if (sha16(adapterBuf) !== sha16(stagedAdapter)) throw new Error('MAIN adapter differs from the staged adapter: refusing to run');
const testBuf = rdMain('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts');
const keytermsBuf = rdMain('electron/audio/deepgramKeyterms.ts');
console.log(`final adapter ${adapterBuf.length} B ${sha16(adapterBuf)}; brief test ${testBuf.length} B ${sha16(testBuf)}; keyterms ${keytermsBuf.length} B ${sha16(keytermsBuf)}`);
const adapter = adapterBuf.toString('utf8');
const briefTest = testBuf.toString('utf8');

// ---- the throwaway extra test: the same fake-SDK header as the brief's test file, then non-English sockets + pause signals
const headEnd = briefTest.indexOf("\ndescribe('DeepgramStreamingSTT boundary repair");
if (headEnd < 0) throw new Error('cannot find the outer describe in the brief test');
const extraTest = briefTest.slice(0, headEnd) + `
describe('t4 extra (throwaway): non-English sockets survive every pause signal', () => {
    let log: string[];
    let errors: any[][];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        errors = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.spyOn(console, 'error').mockImplementation((...a: any[]) => { errors.push(a); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });
    for (const language of ['indonesian', 'auto']) {
        it(\`\${language}: an empty FINAL, an empty INTERIM, an UtteranceEnd and a speech_final neither throw nor lose an event\`, () => {
            const stt = new DeepgramStreamingSTT('key');
            stt.setRecognitionLanguage(language);
            const seen: [string, boolean][] = [];
            const ends: number[] = [];
            stt.on('transcript', (t: any) => seen.push([t.text, t.isFinal]));
            stt.on('utterance-end', (e: { at: number }) => ends.push(e.at));
            stt.start();
            lives[0].fire('open');
            expect(() => {
                lives[0].fire('Results', results('hello there', true));
                lives[0].fire('Results', results('', true));
                lives[0].fire('Results', results('', false));
                lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 });
                lives[0].fire('Results', results('and more', true, true));
            }).not.toThrow();
            stt.stop();
            expect(seen).toEqual([['hello there', true], ['and more', true]]);
            expect(ends).toHaveLength(1);
            expect(log.filter((l) => l.includes('boundary repair:'))).toEqual([]);
            expect(errors).toEqual([]);            // the Transcript handler's try/catch would log a swallowed TypeError here
        });
    }
});
`;

// ---- variants: exactly one replacement each (asserted), from the final adapter text
const once = (label, oldS, newS) => {
    const n = adapter.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return adapter.replace(oldS, () => newS);
};
const GATE = 'const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;';
const EMPTY_FINAL = 'if (isFinal) boundaryRepair?.clear();';
const UTT = "boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end'";
const SPF = 'Date.now(), data.speech_final === true)';
// [name, adapter text, brief-test names expected to fail, extra-test names expected to fail]
const BRIEF = {
    nonEnglish: 'a non-English connection passes every transcript through untouched',
    emptyFinal: 'an empty FINAL between F1 and F2 is a pause',
    emptyInterim: 'an empty INTERIM is not a pause',
    utteranceEnd: 'an UtteranceEnd between F1 and F2 is a pause too',
    speechFinal: 'speech_final on F1 reaches the module',
    restart: 'emits the repaired final, logs the raw text plus one repair line, and a restarted socket',
};
const EXTRA = ['indonesian: an empty FINAL', 'auto: an empty FINAL'];
const variants = [
    ['control: the final adapter', adapter, [], []],
    ['gate removed (brief Step 6, in the mirror)', once('gate', GATE, 'const boundaryRepair = createBoundaryRepair();'), [BRIEF.nonEnglish], []],
    ['empty-final clear dropped', once('emptyFinal', EMPTY_FINAL, ''), [BRIEF.emptyFinal], []],
    ['clear on ANY empty transcript (interims too)', once('emptyAny', EMPTY_FINAL, 'boundaryRepair?.clear();'), [BRIEF.emptyInterim], []],
    ['clear condition inverted (if (!isFinal))', once('inverted', EMPTY_FINAL, 'if (!isFinal) boundaryRepair?.clear();'), [BRIEF.emptyFinal, BRIEF.emptyInterim], []],
    ['UtteranceEnd clear dropped', once('utt', UTT, "if (!stale()) this.emit('utterance-end'"), [BRIEF.utteranceEnd], []],
    ['speech_final not passed', once('spfDrop', SPF, 'Date.now())'), [BRIEF.speechFinal], []],
    ['speech_final always true', once('spfTrue', SPF, 'Date.now(), true)'), [BRIEF.restart, BRIEF.emptyInterim], []],
    ['non-English text fallback -> empty string', once('fallback', 'text: repaired?.text ?? transcript,', "text: repaired?.text ?? '',"), [BRIEF.nonEnglish], EXTRA],
    ['?. dropped on the UtteranceEnd clear (null socket)', once('nullUtt', UTT, "boundaryRepair.clear(); if (!stale()) this.emit('utterance-end'"), [], EXTRA],
    ['?. dropped on the empty-final clear (null socket)', once('nullEmpty', EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();'), [], EXTRA],
    ['?. dropped on onTranscript (null socket)', once('nullOn', 'boundaryRepair?.onTranscript(', 'boundaryRepair.onTranscript('), [BRIEF.nonEnglish], EXTRA],
];

// ---- mirror tree
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const CACHE = path.join(HERE, '.vitecache-t4').replace(/\\/g, '/');
// the same test settings as MAIN's vitest.config.ts (jsdom, globals), restricted to the mirror's two files
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE)}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
put('electron/audio/deepgramBoundaryRepair.ts', rdMain('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', rdMain('electron/audio/deepgramBoundaryRepair.fixtures.json'));
put('electron/audio/deepgramKeyterms.ts', keytermsBuf);
put('electron/config/languages.ts', rdMain('electron/config/languages.ts'));
put('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', testBuf);
put('electron/audio/DeepgramStreamingSTT.t4extra.test.ts', extraTest);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');

let bad = 0;
try {
    for (const [name, src, wantBrief, wantExtra] of variants) {
        put('electron/audio/DeepgramStreamingSTT.ts', src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/DeepgramStreamingSTT'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        // attribute each "×" line to the test file whose "✓/❯ file (…)" header precedes it
        let file = '?';
        const failed = { brief: [], extra: [] };
        for (const l of lines) {
            const h = /^\s*[✓❯]\s+electron\/audio\/(\S+\.test\.ts)/.exec(l);
            if (h) { file = h[1]; continue; }
            if (/^\s+×\s/.test(l)) {
                const nameOnly = l.trim().replace(/^×\s*/, '').replace(/\s\d+ms$/, '').split(' > ').pop();
                (file.includes('t4extra') ? failed.extra : failed.brief).push(nameOnly);
            }
        }
        const covers = (got, want) => want.every((w) => got.some((g) => g.includes(w))) && got.every((g) => want.some((w) => g.includes(w)));
        const ok = covers(failed.brief, wantBrief) && covers(failed.extra, wantExtra);
        if (!ok) bad++;
        console.log(`\n[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}\n   ${summary}`);
        failed.brief.forEach((f) => console.log(`   brief-test failed: ${f}`));
        failed.extra.forEach((f) => console.log(`   extra-test failed: ${f}`));
        if (!failed.brief.length && !failed.extra.length) console.log('   (no test failed)');
        if (!ok) console.log(`   wanted brief=${JSON.stringify(wantBrief)} extra=${JSON.stringify(wantExtra)}`);
    }
} finally {
    // Leave no junction to MAIN's node_modules behind (rmdir removes only the link), then delete the scratch tree.
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction to MAIN's node_modules removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t4'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`\nvariants whose failing set differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
