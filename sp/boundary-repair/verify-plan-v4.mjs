// verify-plan-v4.mjs (2026-09-29): runs PLAN-v4's EXACT fenced code blocks against copies of the CURRENT MAIN
// files in a scratch mirror tree (BR\verify-tree), with MAIN's vitest (read-only use of node_modules through a
// junction; vite's cache redirected here), from the OS temp cwd — the plan's TEST form — the way the v4
// reviewer's r4-tree.mjs did. Stages: Task 3 RED/GREEN; Task 4 keyterms RED/GREEN, adapter RED/GREEN, gate
// calibration, neighbours; Task 5 RED (module missing) / old parse / v4 parse, the extractor end to end against
// the committed s50a fixture; tsc over the finished tree; and the r7-style port check: the plan's TypeScript
// module transpiled with MAIN's esbuild and run through check-v4.mjs --module (must be EQUIVALENT).
//   node verify-plan-v4.mjs        (output kept in evidence/verify-plan-v4.out.txt by the caller)
// Nothing in MAIN is written; MAIN's golden runs and fixtures are read through junctions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const PLAN = fs.readFileSync(path.join(HERE, 'PLAN-v4.md'), 'utf8');
const TREE = path.join(HERE, 'verify-tree');
const blocks = [...PLAN.matchAll(/^[ ]*```(\w*)\n([\s\S]*?)^[ ]*```/gm)].map((m) => m[2]);
console.log(`PLAN-v4 fenced blocks: ${blocks.length}`);
// Each block is located by index AND checked against a marker on its first line, so a drift in the plan fails loudly.
const pick = (i, marker, name) => { const b = blocks[i]; if (!b || !b.split('\n')[0].includes(marker)) throw new Error(`block ${i} (${name}) does not start with "${marker}": ${JSON.stringify((b ?? '').split('\n')[0])}`); return b; };
const B = {
    t3append: pick(2, "describe('deepgramBoundaryRepair v4", 't3append'),
    t3module: pick(3, '/**', 't3module'),
    ktAppend: pick(4, '/**', 'ktAppend'),
    resOld: pick(5, 'const results = (transcript: string, isFinal: boolean) =>', 'resOld'),
    resNew: pick(6, 'const results = (transcript: string, isFinal: boolean, speechFinal = false)', 'resNew'),
    nested: pick(7, "describe('v4: pauses forget the cut", 'nested'),
    ktOld: pick(8, '/**', 'ktOld'), ktNew: pick(9, '/**', 'ktNew'),
    bOld: pick(10, '// The boundary repair belongs to THIS socket', 'bOld'), bNew: pick(11, '// The boundary repair belongs to THIS socket', 'bNew'),
    cOld: pick(12, 'live.on(LiveTranscriptionEvents.Transcript', 'cOld'), cNew: pick(13, 'live.on(LiveTranscriptionEvents.Transcript', 'cNew'),
    dOld: pick(14, 'live.on(LiveTranscriptionEvents.UtteranceEnd', 'dOld'), dNew: pick(15, '// An UtteranceEnd is a pause', 'dNew'),
    t5test: pick(16, "import { describe, it, expect } from 'vitest';", 't5test'),
    t5old: pick(17, '// interview60.turns-finals.mjs', 't5old'), t5new: pick(18, '// interview60.turns-finals.mjs', 't5new'),
    exOld: pick(19, 'const finals = [...dbg.matchAll', 'exOld'), exNew: pick(20, '// As the turn tracker saw them', 'exNew'),
};
if (!B.t3module.includes('Puts back the word(s)') || !B.t5new.includes('const FINAL') || B.t5old.includes('const FINAL')) throw new Error('block mapping drifted');
const main = (rel) => fs.readFileSync(path.join(MAIN, rel), 'utf8');
let mismatches = 0;
const replaceOnce = (label, text, oldB, newB) => {
    const n = text.split(oldB).length - 1;
    console.log(`  anchor ${label}: old block found ${n} time(s) in the current file`);
    if (n !== 1) throw new Error(`anchor ${label} not unique/present`);
    return text.replace(oldB, () => newB);
};
console.log('== anchors ==');
const ADAPTER = main('electron/audio/DeepgramStreamingSTT.ts');
let adapterV4 = replaceOnce('4a import', ADAPTER, "import { keytermsFor } from './deepgramKeyterms';", "import { keytermsFor, isEnglishLanguage } from './deepgramKeyterms';");
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
// Task 3's BASE is the pre-Task-3 state. MAIN's module and its test moved to v4 while Task 3 was implemented (the
// fix round appends the v4 block to the test), so the base is reconstructed: the test = MAIN's current file with any
// appended v4 describe block stripped (must be the plan-time file: 7,691 bytes, sha c57ef099), the module = the v4
// reviewer's esbuild transpile of MAIN's v3 module taken before Task 3 (sdd/spec-review-v4-scratch/port-main-v3.mjs,
// same behaviour as the v3 TypeScript; it must hold no clear() and no isRespelling).
const { createHash } = await import('node:crypto');
const sha16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
let MT = main('electron/audio/deepgramBoundaryRepair.test.ts');
{ const i = MT.indexOf("\ndescribe('deepgramBoundaryRepair v4"); if (i >= 0) MT = MT.slice(0, i); }   // the block was appended after the file's own trailing newline
const MODULE_V3 = fs.readFileSync(path.join(HERE, 'sdd/spec-review-v4-scratch/port-main-v3.mjs'), 'utf8');
console.log(`Task 3 base: test ${Buffer.byteLength(MT)} bytes sha ${sha16(MT)} (plan time: 7691 / c57ef099); v3 module transpile ${MODULE_V3.includes('clear()') || MODULE_V3.includes('isRespelling') ? 'NOT v3-shaped' : 'v3-shaped'}`);
if (Buffer.byteLength(MT) !== 7691 || !sha16(MT).startsWith('c57ef099') || MODULE_V3.includes('clear()')) { console.log('BASE MISMATCH: the Task 3 stages below do not start from the pre-Task-3 files'); mismatches++; }
const mtV4 = MT + '\n' + B.t3append;
const EX = main('electron/test/golden/interview60.turns-fixture.mjs');
let exV4 = replaceOnce('5-4 extractor lines 53-54', EX, B.exOld, B.exNew);
exV4 = replaceOnce('5-4 extractor import', exV4, "import { fileURLToPath } from 'node:url';\n", "import { fileURLToPath } from 'node:url';\nimport { finalsFrom } from './interview60.turns-finals.mjs';\n");

// ---- the mirror tree
const put = (rel, text) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const del = (rel) => { const p = path.join(TREE, rel); if (fs.existsSync(p)) fs.unlinkSync(p); };
const junction = (rel, target) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p)) fs.symlinkSync(target, p, 'junction'); };
fs.mkdirSync(TREE, { recursive: true });
junction('node_modules', path.join(MAIN, 'node_modules'));
junction('electron/test/golden/interview60.runs', path.join(MAIN, 'electron/test/golden/interview60.runs'));
junction('electron/test/golden/fixtures', path.join(MAIN, 'electron/test/golden/fixtures'));
put('vitest.config.mjs', `export default { cacheDir: ${JSON.stringify(path.join(HERE, '.vitecache').replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true, cache: false } };\n`);
put('electron/config/languages.ts', main('electron/config/languages.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', main('electron/audio/deepgramBoundaryRepair.fixtures.json'));
for (const t of ['DeepgramStreamingSTT.staleSocket.test.ts', 'DeepgramStreamingSTT.socketSummary.test.ts', 'DeepgramStreamingSTT.vadEvents.test.ts']) put(`electron/audio/${t}`, main(`electron/audio/${t}`));

const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
function run(label, filter, planSays, expectRe, onOutput = false) {
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, filter], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = out.split('\n');
    const tests = lines.filter((l) => /^\s*(Tests|Test Files)\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ');
    const fails = lines.filter((l) => /^\s*(FAIL|×|✗)\s/.test(l) || (/Error: /.test(l) && !/at /.test(l))).map((l) => l.trim()).filter((l, i, a) => a.indexOf(l) === i).slice(0, 14);
    // onOutput: every listed regex must match somewhere in the whole output (stdout and stderr interleave, so no order)
    const ok = onOutput ? [].concat(expectRe).every((re) => re.test(out)) : expectRe.test(tests);
    if (!ok) mismatches++;
    console.log(`\n-- ${label} [${filter}] exit ${r.status} ${ok ? 'AS PLANNED' : 'MISMATCH'}\n   plan says: ${planSays}\n   got: ${tests || '(no summary)'}`);
    for (const f of fails) console.log(`   ${f.slice(0, 190)}`);
}
// Task 3 (the v3 module as plain JS in the .ts slot: vite transpiles it the same way, and the RED count depends on behaviour only)
put('electron/audio/deepgramBoundaryRepair.ts', MODULE_V3);
put('electron/audio/deepgramBoundaryRepair.test.ts', mtV4);
run('Task 3 Step 2 (v3 module, v4 tests appended)', 'electron/audio/deepgramBoundaryRepair.test.ts', 'Tests 11 failed | 58 passed (69)', /Tests 11 failed \| 58 passed \(69\)/);
put('electron/audio/deepgramBoundaryRepair.ts', B.t3module);
run('Task 3 Step 4 (v4 module)', 'electron/audio/deepgramBoundaryRepair.test.ts', 'Tests 69 passed (69)', /Tests 69 passed \(69\)/);
// Task 4
put('electron/audio/deepgramKeyterms.ts', KT);
put('electron/audio/deepgramKeyterms.test.ts', kttV4);
put('electron/audio/DeepgramStreamingSTT.ts', ADAPTER);
put('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', atV4);
run('Task 4 Step 2a (keyterms RED)', 'electron/audio/deepgramKeyterms.test.ts', 'Tests 1 failed | 6 passed (7)', /Tests 1 failed \| 6 passed \(7\)/);
run('Task 4 Step 2b (adapter RED, v3 wiring)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 'Tests 4 failed | 2 passed (6)', /Tests 4 failed \| 2 passed \(6\)/);
put('electron/audio/deepgramKeyterms.ts', ktV4);
run('Task 4 Step 3 (keyterms GREEN)', 'electron/audio/deepgramKeyterms.test.ts', 'Tests 7 passed (7)', /Tests 7 passed \(7\)/);
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4);
run('Task 4 Step 5 (adapter GREEN)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 'Tests 6 passed (6)', /Tests 6 passed \(6\)/);
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4.replace('const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;', 'const boundaryRepair = createBoundaryRepair();'));
run('Task 4 Step 6 (gate removed: calibration)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 'Tests 1 failed | 5 passed (6) (only the non-English test)', /Tests 1 failed \| 5 passed \(6\)/);
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4);
run('Task 4 Step 7 (neighbours present in the mirror: 69 + 6 + 7 + 6 + 2 + 1 = 91)', 'electron/audio/', 'every file passes', /Test Files 6 passed \(6\) \| Tests 91 passed \(91\)/);
// Task 5
del('electron/test/golden/interview60.turns-finals.mjs');
put('electron/test/golden/interview60.turns-finals.test.ts', B.t5test);
run('Task 5 Step 2 (module missing)', 'electron/test/golden/interview60.turns-finals.test.ts', 'Failed to resolve import "./interview60.turns-finals.mjs"; Test Files 1 failed (1), Tests no tests', [/Failed to resolve import "\.\/interview60\.turns-finals\.mjs"/, /Test Files\s+1 failed \(1\)/, /Tests\s+no tests/], true);
put('electron/test/golden/interview60.turns-finals.mjs', B.t5old);
run('Task 5 Step 3a (old parse)', 'electron/test/golden/interview60.turns-finals.test.ts', 'Tests 2 failed | 3 passed (5)', /Tests 2 failed \| 3 passed \(5\)/);
put('electron/test/golden/interview60.turns-finals.mjs', B.t5new);
run('Task 5 Step 3b (v4 parse)', 'electron/test/golden/interview60.turns-finals.test.ts', 'Tests 5 passed (5)', /Tests 5 passed \(5\)/);
put('electron/test/golden/interview60.turns-fixture.mjs', exV4);
// Task 5 Step 4: the extractor end to end (reads MAIN's run + tts dirs; writes only under BR/evidence)
{
    const out = path.join(HERE, 'evidence', 's50a-turns.check.json');
    const r = spawnSync(process.execPath, [path.join(TREE, 'electron/test/golden/interview60.turns-fixture.mjs'), path.join(MAIN, 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a'), path.join(MAIN, 'electron/test/golden/scenario50-tts-local'), '--offset-ms', '1150', '--out', out], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const mine = JSON.parse(fs.readFileSync(out, 'utf8'));
    const committed = JSON.parse(fs.readFileSync(path.join(MAIN, 'electron/test/golden/fixtures/2026-09-09T15-00-55-s50a-turns.json'), 'utf8'));
    const same = ['finals', 'items', 'actual'].map((k) => `${k} ${JSON.stringify(mine[k]) === JSON.stringify(committed[k]) ? 'deep-equal' : 'DIFFERENT'}`).join(', ');
    const ok = /deep-equal, .*deep-equal, .*deep-equal/.test(same) && !/DIFFERENT/.test(same);
    if (!ok) mismatches++;
    console.log(`\n-- Task 5 Step 4 (extractor end to end on s50a) exit ${r.status} ${ok ? 'AS PLANNED' : 'MISMATCH'}\n   printed: ${(r.stdout + r.stderr).trim().slice(0, 200)}\n   vs committed fixture: ${same}`);
    fs.unlinkSync(out);
}
// ---- tsc over the finished tree with electron/tsconfig.json's compiler options (tests included)
put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'CommonJS', allowJs: true, skipLibCheck: true, esModuleInterop: true, noImplicitAny: true, jsx: 'react-jsx', moduleResolution: 'node', resolveJsonModule: true, noEmit: true, types: ['node', 'vitest/globals'] }, include: ['electron/**/*.ts', 'electron/**/*.js'] }, null, 2));
{
    const tsc = spawnSync(process.execPath, [path.join(MAIN, 'node_modules/typescript/bin/tsc'), '-p', path.join(TREE, 'tsconfig.json')], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    if (tsc.status !== 0) mismatches++;
    console.log(`\n-- tsc over the finished mirror tree: exit ${tsc.status} ${tsc.status === 0 ? 'AS PLANNED' : 'MISMATCH'}`);
    console.log((tsc.stdout + tsc.stderr).split('\n').filter(Boolean).slice(0, 20).map((l) => `   ${l}`).join('\n') || '   (no output)');
}
// ---- the r7-style port check: the plan's module, transpiled, must be EQUIVALENT to rule-v4.mjs under check-v4
{
    const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
    const js = esbuild.transformSync(B.t3module, { loader: 'ts', format: 'esm' }).code;
    const port = path.join(HERE, 'port-plan-v4.mjs');
    fs.writeFileSync(port, js);
    const r = spawnSync(process.execPath, [path.join(HERE, 'check-v4-built.mjs'), port], { encoding: 'utf8', timeout: 300000 });
    const line = (r.stdout + r.stderr).trim().split('\n').pop();
    if (r.status !== 0) mismatches++;
    console.log(`\n-- port check (plan module via esbuild -> check-v4-built.mjs): exit ${r.status} ${r.status === 0 ? 'AS PLANNED' : 'MISMATCH'}\n   ${line}`);
}
console.log(`\n${mismatches === 0 ? 'EVERY PLANNED COUNT REPRODUCED' : `${mismatches} MISMATCH(ES) AGAINST THE PLAN`}`);
process.exit(mismatches ? 1 : 0);
