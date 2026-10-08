// Task 4 (throwaway): the one state the brief says its tests never fire — a language switch on a LIVE socket
// (English -> Indonesian -> English -> auto/multi), through the real setRecognitionLanguage -> restartStream -> connect()
// path with the fake SDK. Mirror tree, MAIN only READ. Run against the final adapter (must pass) and two mutants of the
// gate (removed; inverted), which must fail — so the throwaway test can fail.
//   node t4-switch-proof.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 't4-mirror3');
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const adapterBuf = rdMain('electron/audio/DeepgramStreamingSTT.ts');
const adapter = adapterBuf.toString('utf8');
const briefTest = rdMain('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts').toString('utf8');
console.log(`final adapter ${adapterBuf.length} B ${sha16(adapterBuf)}`);
const headEnd = briefTest.indexOf("\ndescribe('DeepgramStreamingSTT boundary repair");
if (headEnd < 0) throw new Error('cannot find the outer describe in the brief test');
const switchTest = briefTest.slice(0, headEnd) + `
describe('t4 switch (throwaway): a language switch on a live socket re-evaluates the gate on the replacement socket', () => {
    let log: string[];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });
    it('english -> indonesian -> english -> auto: repair, pass-through, repair, pass-through', () => {
        const [I, F1, F2] = fixtures.seam.events;
        const stt = new DeepgramStreamingSTT('key');
        const seen: [string, boolean][] = [];
        stt.on('transcript', (t: any) => seen.push([t.text, t.isFinal]));
        const playSeam = (n: number) => {
            lives[n].fire('Results', results(I.text, false));
            vi.advanceTimersByTime(F1.atMs);
            lives[n].fire('Results', results(F1.text, true));
            vi.advanceTimersByTime(F2.atMs - F1.atMs);
            lives[n].fire('Results', results(F2.text, true));
        };
        const repairs = () => log.filter((l) => l.includes('boundary repair:')).length;
        const connects = () => log.filter((l) => l.includes('Connecting (')).map((l) => /lang=([^)]+)\\)/.exec(l)?.[1]);
        stt.start(); lives[0].fire('open'); playSeam(0);
        expect(repairs()).toBe(1);
        stt.setRecognitionLanguage('indonesian'); lives[1].fire('open'); playSeam(1);
        expect(repairs()).toBe(1);                       // still 1: nothing repaired on the Indonesian socket
        stt.setRecognitionLanguage('english-us'); lives[2].fire('open'); playSeam(2);
        expect(repairs()).toBe(2);
        stt.setRecognitionLanguage('auto'); lives[3].fire('open'); playSeam(3);
        expect(repairs()).toBe(2);                       // multi: nothing repaired
        stt.stop();
        expect(connects()).toEqual(['en', 'id', 'en', 'multi']);
        expect(lives).toHaveLength(4);
        const third = (n: number) => seen[n * 3 + 2];
        expect(third(0)).toEqual([fixtures.seam.expectedF2, true]);
        expect(third(1)).toEqual([F2.text, true]);
        expect(third(2)).toEqual([fixtures.seam.expectedF2, true]);
        expect(third(3)).toEqual([F2.text, true]);
        expect(seen).toHaveLength(12);
    });
});
`;
const once = (label, oldS, newS) => {
    const n = adapter.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return adapter.replace(oldS, () => newS);
};
const GATE = 'const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;';
const variants = [
    ['control: the final adapter', adapter, false],
    ['gate removed', once('gate', GATE, 'const boundaryRepair = createBoundaryRepair();'), true],
    ['gate inverted', once('inv', GATE, 'const boundaryRepair = !isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;'), true],
];
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const CACHE = path.join(HERE, '.vitecache-t4c').replace(/\\/g, '/');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE)}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
put('electron/audio/deepgramBoundaryRepair.ts', rdMain('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', rdMain('electron/audio/deepgramBoundaryRepair.fixtures.json'));
put('electron/audio/deepgramKeyterms.ts', rdMain('electron/audio/deepgramKeyterms.ts'));
put('electron/config/languages.ts', rdMain('electron/config/languages.ts'));
put('electron/audio/DeepgramStreamingSTT.t4switch.test.ts', switchTest);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
let bad = 0;
try {
    for (const [name, src, wantFail] of variants) {
        put('electron/audio/DeepgramStreamingSTT.ts', src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/DeepgramStreamingSTT'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = lines.filter((l) => /^\s+×\s/.test(l)).length;
        const ok = wantFail ? failed === 1 : (failed === 0 && r.status === 0);
        if (!ok) bad++;
        console.log(`\n[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}: ${summary}`);
        // the first failing assertion's Expected / Received, to show it is the intended one
        const i = lines.findIndex((l) => /AssertionError/.test(l));
        if (i >= 0) console.log(lines.slice(i, i + 6).map((l) => '   ' + l).join('\n'));
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t4c'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`\nvariants that differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
