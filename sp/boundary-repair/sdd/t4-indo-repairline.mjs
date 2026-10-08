// Task 4 (throwaway): observe what the brief's Step 6 predicts but the gate-removed run could not show, because the test's
// first failing assertion is on `seen`: "one repair line" for the Indonesian sequence. A 2x2 matrix in a mirror tree
// (MAIN only READ): {final adapter, gate-removed adapter} x {expect no repair line, expect exactly the one line}.
// Must read: final+[] pass, final+[line] FAIL, gate-removed+[] FAIL, gate-removed+[line] pass.
//   node t4-indo-repairline.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 't4-mirror4');
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const adapter = rdMain('electron/audio/DeepgramStreamingSTT.ts').toString('utf8');
const briefTest = rdMain('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts').toString('utf8');
const headEnd = briefTest.indexOf("\ndescribe('DeepgramStreamingSTT boundary repair");
const GATE = 'const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;';
if (adapter.split(GATE).length !== 2) throw new Error('gate line not found exactly once');
const gateRemoved = adapter.replace(GATE, () => 'const boundaryRepair = createBoundaryRepair();');
const LINE = '[DeepgramStreaming] boundary repair: restored "menangani" before "data yang hilang di pipeline?"';
const testFor = (expected) => briefTest.slice(0, headEnd) + `
describe('t4 indonesian repair line (throwaway)', () => {
    let log: string[];
    beforeEach(() => { lives.length = 0; log = []; vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); }); vi.useFakeTimers(); });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => { if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry; else delete require.cache[deepgramPath]; });
    it('the Indonesian sequence logs exactly ${expected.length} repair line(s)', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.setRecognitionLanguage('indonesian');
        stt.start(); lives[0].fire('open');
        const id = ['bagaimana cara anda menangani data yang hilang di pipeline', 'Bagaimana cara Anda', 'data yang hilang di pipeline?'];
        lives[0].fire('Results', results(id[0], false));
        vi.advanceTimersByTime(100);
        lives[0].fire('Results', results(id[1], true));
        vi.advanceTimersByTime(2000);
        lives[0].fire('Results', results(id[2], true));
        stt.stop();
        expect(log.filter((l) => l.includes('boundary repair:'))).toEqual(${JSON.stringify(expected)});
    });
});
`;
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const CACHE = path.join(HERE, '.vitecache-t4d').replace(/\\/g, '/');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE)}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
put('electron/audio/deepgramBoundaryRepair.ts', rdMain('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', rdMain('electron/audio/deepgramBoundaryRepair.fixtures.json'));
put('electron/audio/deepgramKeyterms.ts', rdMain('electron/audio/deepgramKeyterms.ts'));
put('electron/config/languages.ts', rdMain('electron/config/languages.ts'));
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
const matrix = [
    ['final adapter, expecting NO repair line', adapter, [], true],
    ['final adapter, expecting the one line', adapter, [LINE], false],
    ['gate-removed adapter, expecting NO repair line', gateRemoved, [], false],
    ['gate-removed adapter, expecting the one line', gateRemoved, [LINE], true],
];
let bad = 0;
try {
    for (const [name, src, expected, wantPass] of matrix) {
        put('electron/audio/DeepgramStreamingSTT.ts', src);
        put('electron/audio/DeepgramStreamingSTT.t4indo.test.ts', testFor(expected));
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/DeepgramStreamingSTT.t4indo.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ');
        const passed = r.status === 0;
        const ok = passed === wantPass;
        if (!ok) bad++;
        console.log(`[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}: ${summary}`);
        if (!passed) { const i = lines.findIndex((l) => /^\s*- Expected/.test(l)); if (i >= 0) console.log(lines.slice(i, i + 9).map((l) => '     ' + l).join('\n')); }
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`junction removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t4d'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`cells that differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
