// Spec-review v4 scratch: execute PLAN-v4's EXACT code blocks against copies of the CURRENT MAIN files, in a
// scratch mirror tree, with MAIN's vitest (read-only use of MAIN's node_modules through a junction; vite's
// cacheDir redirected into this folder), from the OS temp cwd exactly as the plan's TEST form runs it.
// Stages follow the plan: Task 3 RED/GREEN, Task 4 RED/GREEN/calibration + neighbours, Task 5 RED/RED/GREEN,
// then tsc over the finished tree with electron/tsconfig.json's compiler options.
//   node r4-tree.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const PLAN = fs.readFileSync(path.resolve(HERE, '../../PLAN-v4.md'), 'utf8');
const TREE = path.join(HERE, 'tree');
const blocks = [...PLAN.matchAll(/^[ ]*```(\w*)\n([\s\S]*?)^[ ]*```/gm)].map((m) => m[2]);
console.log(`PLAN-v4 fenced blocks: ${blocks.length}`);
const B = {
    t3append: blocks[2], t3module: blocks[3], ktAppend: blocks[4], resOld: blocks[5], resNew: blocks[6], nested: blocks[7],
    ktOld: blocks[8], ktNew: blocks[9], bOld: blocks[10], bNew: blocks[11], cOld: blocks[12], cNew: blocks[13], dOld: blocks[14], dNew: blocks[15],
    t5test: blocks[16], t5old: blocks[17], t5new: blocks[18], exOld: blocks[19], exNew: blocks[20],
};
const main = (rel) => fs.readFileSync(path.join(MAIN, rel), 'utf8');
const replaceOnce = (label, text, oldB, newB) => {
    const n = text.split(oldB).length - 1;
    console.log(`  anchor ${label}: old block found ${n} time(s) in the current file`);
    if (n !== 1) throw new Error(`anchor ${label} not unique/present`);
    return text.replace(oldB, () => newB);
};
// ---- verify every "replace" block against the current MAIN files
console.log('== anchors ==');
const ADAPTER = main('electron/audio/DeepgramStreamingSTT.ts');
const importOld = "import { keytermsFor } from './deepgramKeyterms';", importNew = "import { keytermsFor, isEnglishLanguage } from './deepgramKeyterms';";
let adapterV4 = replaceOnce('4a import', ADAPTER, importOld, importNew);
adapterV4 = replaceOnce('4b per-socket const', adapterV4, B.bOld, B.bNew);
adapterV4 = replaceOnce('4c Transcript handler', adapterV4, B.cOld, B.cNew);
adapterV4 = replaceOnce('4d UtteranceEnd', adapterV4, B.dOld, B.dNew);
const KT = main('electron/audio/deepgramKeyterms.ts');
const ktV4 = replaceOnce('4-3 keyterms', KT, B.ktOld, B.ktNew);
const KTT = main('electron/audio/deepgramKeyterms.test.ts');
const kttV4 = replaceOnce('4-1a keyterms test import', KTT, "import { DEEPGRAM_KEYTERMS, keytermsFor } from './deepgramKeyterms';", "import { DEEPGRAM_KEYTERMS, keytermsFor, isEnglishLanguage } from './deepgramKeyterms';") + '\n' + B.ktAppend;
const AT = main('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts');
let atV4 = replaceOnce('4-1b results helper', AT, B.resOld, B.resNew);
{ const i = atV4.lastIndexOf('});'); atV4 = atV4.slice(0, i) + '\n' + B.nested + atV4.slice(i); }
const MT = main('electron/audio/deepgramBoundaryRepair.test.ts');
const mtV4 = MT + '\n' + B.t3append;
const EX = main('electron/test/golden/interview60.turns-fixture.mjs');
let exV4 = replaceOnce('5-4 extractor lines 53-54', EX, B.exOld, B.exNew);
exV4 = replaceOnce('5-4 extractor import', exV4, "import { fileURLToPath } from 'node:url';\n", "import { fileURLToPath } from 'node:url';\nimport { finalsFrom } from './interview60.turns-finals.mjs';\n");

// ---- the mirror tree
const put = (rel, text) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const del = (rel) => { const p = path.join(TREE, rel); if (fs.existsSync(p)) fs.unlinkSync(p); };
fs.mkdirSync(TREE, { recursive: true });
if (!fs.existsSync(path.join(TREE, 'node_modules'))) fs.symlinkSync(path.join(MAIN, 'node_modules'), path.join(TREE, 'node_modules'), 'junction');
put('vitest.config.mjs', `export default { cacheDir: ${JSON.stringify(path.join(HERE, '.vitecache').replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true, cache: false } };\n`);
put('electron/config/languages.ts', main('electron/config/languages.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', main('electron/audio/deepgramBoundaryRepair.fixtures.json'));
for (const t of ['DeepgramStreamingSTT.staleSocket.test.ts', 'DeepgramStreamingSTT.socketSummary.test.ts', 'DeepgramStreamingSTT.vadEvents.test.ts']) put(`electron/audio/${t}`, main(`electron/audio/${t}`));

const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
function run(label, filter, planSays) {
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, filter], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 240000 });
    const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = out.split('\n');
    const tests = lines.filter((l) => /^\s*(Tests|Test Files)\s/.test(l)).map((l) => l.trim()).join(' | ');
    const fails = lines.filter((l) => /^\s*(FAIL|×|✗)\s/.test(l) || /Error: /.test(l) && !/at /.test(l)).map((l) => l.trim()).filter((l, i, a) => a.indexOf(l) === i).slice(0, 14);
    console.log(`\n-- ${label} [${filter}] exit ${r.status}\n   plan says: ${planSays}\n   got: ${tests || '(no summary)'}`);
    for (const f of fails) console.log(`   ${f.slice(0, 190)}`);
}
// Task 3
put('electron/audio/deepgramBoundaryRepair.ts', main('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.test.ts', mtV4);
run('Task 3 Step 2 (v3 module, v4 tests appended)', 'electron/audio/deepgramBoundaryRepair.test.ts', 'Tests 9 failed | 58 passed (67)');
put('electron/audio/deepgramBoundaryRepair.ts', B.t3module);
run('Task 3 Step 4 (v4 module)', 'electron/audio/deepgramBoundaryRepair.test.ts', 'Tests 67 passed (67)');
// Task 4
put('electron/audio/deepgramKeyterms.ts', KT);
put('electron/audio/deepgramKeyterms.test.ts', kttV4);
put('electron/audio/DeepgramStreamingSTT.ts', ADAPTER);
put('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', atV4);
run('Task 4 Step 2a (keyterms RED)', 'electron/audio/deepgramKeyterms.test.ts', 'Tests 1 failed | 6 passed (7)');
run('Task 4 Step 2b (adapter RED, v3 wiring)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 'Tests 4 failed | 2 passed (6)');
put('electron/audio/deepgramKeyterms.ts', ktV4);
run('Task 4 Step 3 (keyterms GREEN)', 'electron/audio/deepgramKeyterms.test.ts', 'Tests 7 passed (7)');
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4);
run('Task 4 Step 5 (adapter GREEN)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 'Tests 6 passed (6)');
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4.replace('const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;', 'const boundaryRepair = createBoundaryRepair();'));
run('Task 4 Step 6 (gate removed: calibration)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', '1 failed | 5 passed (only the non-English test)');
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4);
run('Task 4 Step 7 (neighbours present in the mirror)', 'electron/audio/', 'every file passes');
// Task 5
del('electron/test/golden/interview60.turns-finals.mjs');
put('electron/test/golden/interview60.turns-finals.test.ts', B.t5test);
run('Task 5 Step 2 (module missing)', 'electron/test/golden/interview60.turns-finals.test.ts', 'FAIL to collect, 0 tests run');
put('electron/test/golden/interview60.turns-finals.mjs', B.t5old);
run('Task 5 Step 3a (old parse)', 'electron/test/golden/interview60.turns-finals.test.ts', 'Tests 2 failed | 3 passed (5)');
put('electron/test/golden/interview60.turns-finals.mjs', B.t5new);
run('Task 5 Step 3b (v4 parse)', 'electron/test/golden/interview60.turns-finals.test.ts', 'Tests 5 passed (5)');
put('electron/test/golden/interview60.turns-fixture.mjs', exV4);

// ---- tsc over the finished tree with electron/tsconfig.json's compiler options (tests included)
put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'CommonJS', allowJs: true, skipLibCheck: true, esModuleInterop: true, noImplicitAny: true, jsx: 'react-jsx', moduleResolution: 'node', resolveJsonModule: true, noEmit: true, types: ['node', 'vitest/globals'] }, include: ['electron/**/*.ts', 'electron/**/*.js'] }, null, 2));
const tsc = spawnSync(process.execPath, [path.join(MAIN, 'node_modules/typescript/bin/tsc'), '-p', path.join(TREE, 'tsconfig.json')], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 240000 });
console.log(`\n-- tsc over the finished mirror tree: exit ${tsc.status}`);
console.log((tsc.stdout + tsc.stderr).split('\n').filter(Boolean).slice(0, 20).map((l) => `   ${l}`).join('\n') || '   (no output)');
