// Re-review of the v4 revision, part 2: the REVISED PLAN-v4's exact code blocks on copies of the current MAIN
// files, MAIN's vitest from %TEMP% (the plan's TEST form), in this scratch folder only (tree2; node_modules,
// interview60.runs and fixtures are read through junctions; vite's cacheDir redirected here). Focus: Task 4's
// Indonesian gate test (RED 4/2 on the v3 wiring, 1/5 with the gate removed), plus Tasks 3 and 5 as planned.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const PLAN = fs.readFileSync(path.resolve(HERE, '../../PLAN-v4.md'), 'utf8');
const TREE = path.join(HERE, 'tree2');
const blocks = [...PLAN.matchAll(/^[ ]*```(\w*)\n([\s\S]*?)^[ ]*```/gm)].map((m) => m[2]);
const find = (pred, name) => { const i = blocks.findIndex(pred); if (i < 0) throw new Error(`block not found: ${name}`); return blocks[i]; };
const first = (s) => s.split('\n')[0];
const B = {
    t3append: find((b) => first(b).startsWith("describe('deepgramBoundaryRepair v4"), 't3append'),
    t3module: find((b) => b.includes('Puts back the word(s)'), 't3module'),
    ktAppend: find((b) => b.includes("describe('isEnglishLanguage'"), 'ktAppend'),
    resOld: find((b) => first(b).startsWith('const results = (transcript: string, isFinal: boolean) =>'), 'resOld'),
    resNew: find((b) => first(b).startsWith('const results = (transcript: string, isFinal: boolean, speechFinal = false)'), 'resNew'),
    nested: find((b) => b.includes("describe('v4: pauses forget the cut"), 'nested'),
    ktOld: find((b) => b.includes('return /^en(-|$)/i.test(languageCode) ? DEEPGRAM_KEYTERMS'), 'ktOld'),
    ktNew: find((b) => b.includes('export function isEnglishLanguage'), 'ktNew'),
    bOld: find((b) => b.includes('const boundaryRepair = createBoundaryRepair();') && !b.includes('English'), 'bOld'),
    bNew: find((b) => b.includes('isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null'), 'bNew'),
    cOld: find((b) => b.includes('boundaryRepair.onTranscript(transcript, isFinal, Date.now());'), 'cOld'),
    cNew: find((b) => b.includes('boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true)'), 'cNew'),
    dOld: find((b) => first(b).includes('live.on(LiveTranscriptionEvents.UtteranceEnd') && !b.includes('clear()'), 'dOld'),
    dNew: find((b) => b.includes('boundaryRepair?.clear(); if (!stale())'), 'dNew'),
    t5test: find((b) => b.includes("import { finalsFrom } from './interview60.turns-finals.mjs';") && b.includes('describe('), 't5test'),
    t5old: find((b) => first(b).startsWith('// interview60.turns-finals.mjs') && !b.includes('const FINAL'), 't5old'),
    t5new: find((b) => first(b).startsWith('// interview60.turns-finals.mjs') && b.includes('const FINAL'), 't5new'),
};
const main = (rel) => fs.readFileSync(path.join(MAIN, rel), 'utf8');
const once = (label, text, a, b) => { const n = text.split(a).length - 1; if (n !== 1) throw new Error(`anchor ${label}: ${n}`); return text.replace(a, () => b); };
const ADAPTER = main('electron/audio/DeepgramStreamingSTT.ts');
let adapterV4 = once('4a', ADAPTER, "import { keytermsFor } from './deepgramKeyterms';", "import { keytermsFor, isEnglishLanguage } from './deepgramKeyterms';");
adapterV4 = once('4b', adapterV4, B.bOld, B.bNew); adapterV4 = once('4c', adapterV4, B.cOld, B.cNew); adapterV4 = once('4d', adapterV4, B.dOld, B.dNew);
const ktV4 = once('kt', main('electron/audio/deepgramKeyterms.ts'), B.ktOld, B.ktNew);
const kttV4 = once('ktt', main('electron/audio/deepgramKeyterms.test.ts'), "import { DEEPGRAM_KEYTERMS, keytermsFor } from './deepgramKeyterms';", "import { DEEPGRAM_KEYTERMS, keytermsFor, isEnglishLanguage } from './deepgramKeyterms';") + '\n' + B.ktAppend;
let atV4 = once('res', main('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts'), B.resOld, B.resNew);
{ const i = atV4.lastIndexOf('});'); atV4 = atV4.slice(0, i) + '\n' + B.nested + atV4.slice(i); }
const mtV4 = main('electron/audio/deepgramBoundaryRepair.test.ts') + '\n' + B.t3append;
console.log(`blocks located: ${Object.keys(B).length}; Indonesian test present: ${B.nested.includes("start('indonesian')")}; __dirname in Task 5 test: ${B.t5test.includes('const golden = __dirname;')}`);

const put = (rel, text) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const del = (rel) => { const p = path.join(TREE, rel); if (fs.existsSync(p)) fs.unlinkSync(p); };
const junction = (rel, target) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p)) fs.symlinkSync(target, p, 'junction'); };
fs.mkdirSync(TREE, { recursive: true });
junction('node_modules', path.join(MAIN, 'node_modules'));
junction('electron/test/golden/interview60.runs', path.join(MAIN, 'electron/test/golden/interview60.runs'));
junction('electron/test/golden/fixtures', path.join(MAIN, 'electron/test/golden/fixtures'));
put('vitest.config.mjs', `export default { cacheDir: ${JSON.stringify(path.join(HERE, '.vitecache2').replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true, cache: false } };\n`);
put('electron/config/languages.ts', main('electron/config/languages.ts'));
put('electron/audio/deepgramBoundaryRepair.fixtures.json', main('electron/audio/deepgramBoundaryRepair.fixtures.json'));
for (const t of ['DeepgramStreamingSTT.staleSocket.test.ts', 'DeepgramStreamingSTT.socketSummary.test.ts', 'DeepgramStreamingSTT.vadEvents.test.ts']) put(`electron/audio/${t}`, main(`electron/audio/${t}`));
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
function run(label, filter, planSays) {
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, filter], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const tests = out.split('\n').filter((l) => /^\s*(Tests|Test Files)\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ');
    const failed = [...new Set(out.split('\n').filter((l) => /^\s*×\s/.test(l)).map((l) => l.trim().replace(/^.*> /, '').slice(0, 70)))];
    console.log(`-- ${label}: got ${tests || '(no summary)'} | plan: ${planSays}${failed.length ? `\n   failing: ${failed.join(' || ')}` : ''}`);
    return out;
}
put('electron/audio/deepgramBoundaryRepair.ts', main('electron/audio/deepgramBoundaryRepair.ts'));
put('electron/audio/deepgramBoundaryRepair.test.ts', mtV4);
run('T3 RED (v3 module)', 'electron/audio/deepgramBoundaryRepair.test.ts', '10 failed | 58 passed (68)');
put('electron/audio/deepgramBoundaryRepair.ts', B.t3module);
run('T3 GREEN', 'electron/audio/deepgramBoundaryRepair.test.ts', '68 passed');
put('electron/audio/deepgramKeyterms.ts', main('electron/audio/deepgramKeyterms.ts'));
put('electron/audio/deepgramKeyterms.test.ts', kttV4);
put('electron/audio/DeepgramStreamingSTT.ts', ADAPTER);
put('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', atV4);
run('T4 keyterms RED', 'electron/audio/deepgramKeyterms.test.ts', '1 failed | 6 passed (7)');
const red = run('T4 adapter RED (v3 wiring, v4 module)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', '4 failed | 2 passed (6)');
console.log(`   Indonesian RED shows the restore: ${/menangani data yang hilang di pipeline\?/.test(red)}`);
put('electron/audio/deepgramKeyterms.ts', ktV4);
run('T4 keyterms GREEN', 'electron/audio/deepgramKeyterms.test.ts', '7 passed');
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4);
run('T4 adapter GREEN', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', '6 passed');
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4.replace('const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;', 'const boundaryRepair = createBoundaryRepair();'));
run('T4 Step 6: gate removed', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', '1 failed | 5 passed (only non-English)');
// extra calibration: gate kept but the Indonesian key NOT applied (the test must then fail too: it checks lang=id)
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4.replace('if (config && this.languageCode !== config.iso639) {', 'if (false) {'));
run('extra: setRecognitionLanguage broken (connection stays en)', 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', '(expect 1 failed: non-English)');
put('electron/audio/DeepgramStreamingSTT.ts', adapterV4);
run('T4 Step 7 neighbours', 'electron/audio/', 'every file passes (68+6+7+6+2+1 = 90)');
del('electron/test/golden/interview60.turns-finals.mjs');
put('electron/test/golden/interview60.turns-finals.test.ts', B.t5test);
const t5a = run('T5 Step 2 (module missing)', 'electron/test/golden/interview60.turns-finals.test.ts', 'Failed to resolve import; no tests');
console.log(`   resolve-failure text: ${/Failed to resolve import "\.\/interview60\.turns-finals\.mjs"/.test(t5a)}`);
put('electron/test/golden/interview60.turns-finals.mjs', B.t5old);
run('T5 Step 3a (old parse)', 'electron/test/golden/interview60.turns-finals.test.ts', '2 failed | 3 passed (5)');
put('electron/test/golden/interview60.turns-finals.mjs', B.t5new);
run('T5 Step 3b (v4 parse)', 'electron/test/golden/interview60.turns-finals.test.ts', '5 passed');
