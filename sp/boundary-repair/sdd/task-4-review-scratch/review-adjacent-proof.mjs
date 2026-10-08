// Task 4 Opus review (throwaway): calibrate the adjacency test the review recommends, inserted at the end of the nested
// v4 describe of a MIRROR copy of MAIN's adapter test. MAIN only READ. Variants: control, extra log line, repair line after emit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 'm2');
const CACHE = path.join(HERE, '.vc2');
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const ADAPTER_REL = 'electron/audio/DeepgramStreamingSTT.ts';
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const A = rdMain(ADAPTER_REL).toString('utf8');
const testSrc = rdMain(TEST_REL).toString('utf8');

const SNIPPET = [
    "",
    "        it('the repair line is the very next log line after its final\\'s Transcript event line, before any listener runs', () => {",
    "            const { stt } = start();",
    "            stt.on('transcript', (t: any) => console.log(`[listener] ${t.text}`));   // the app's own listener logs synchronously",
    "            playSeam();",
    "            stt.stop();",
    "            const k = log.findIndex((l) => l.includes('boundary repair:'));",
    "            expect(k).toBeGreaterThan(0);",
    "            expect(log[k - 1]).toBe(`[DeepgramStreaming] Transcript event — isFinal=true, text=\"${F2.text}\"`);",
    "        });",
    "",
].join('\n');
const TAIL = '\n    });\n});\n';
if (!testSrc.endsWith(TAIL)) throw new Error('test file tail not as expected');
const testWithSnippet = testSrc.slice(0, -TAIL.length) + '\n' + SNIPPET + '    });\n});\n';

const ONT = 'const repaired = boundaryRepair?.onTranscript(';
function repairLogAfterEmit(src) {
    const L = src.split('\n');
    const i = L.findIndex((l) => l.includes('if (repaired?.restored) {'));
    if (i < 0 || !L[i + 1].includes('boundary repair: restored') || L[i + 2].trim() !== '}') throw new Error('reorder: repair block not found');
    if (!L[i + 3].includes("this.emit('transcript', {") || L[i + 7].trim() !== '});') throw new Error('reorder: emit block not where expected');
    return [...L.slice(0, i), ...L.slice(i + 3, i + 8), ...L.slice(i, i + 3), ...L.slice(i + 8)].join('\n');
}
if (A.split(ONT).length !== 2) throw new Error('ONT not unique');
const variants = [
    ['control: MAIN adapter', A, 0],
    ['extra log line between the event line and the repair line', A.replace(ONT, () => "console.log('[DeepgramStreaming] review-probe'); " + ONT), 1],
    ['repair line logged after the emit', repairLogAfterEmit(A), 1],
];

const nm = path.join(TREE, 'node_modules');
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
for (const rel of ['electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.fixtures.json', 'electron/audio/deepgramKeyterms.ts', 'electron/config/languages.ts']) put(rel, rdMain(rel));
put(TEST_REL, testWithSnippet);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
let bad = 0;
try {
    for (const [name, src, wantFailed] of variants) {
        put(ADAPTER_REL, src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, TEST_REL], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const summary = out.split('\n').filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ');
        const failedNames = out.split('\n').filter((l) => /^\s*×\s/.test(l)).map((l) => l.trim());
        const nFailed = Number((/(\d+) failed/.exec(summary) ?? [0, 0])[1]);
        const ok = nFailed === wantFailed && failedNames.every((l) => l.includes('the repair line is the very next log line'));
        if (!ok) bad++;
        console.log(`[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}: ${summary}`);
        failedNames.forEach((l) => console.log(`   ${l}`));
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
    console.log(`junction removed: ${gone}; mirror deleted: ${!fs.existsSync(TREE)}; MAIN vitest present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
}
process.exit(bad ? 1 : 0);
