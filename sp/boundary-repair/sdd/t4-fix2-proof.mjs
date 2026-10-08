// Task 4 fix round 2 (throwaway): calibrate the TWO NEW adapter tests (repair-line adjacency; reconnect does not share the cut) on a MIRROR
// tree; MAIN only READ (junction to MAIN's node_modules, removed again; vite cache redirected; same jsdom/globals settings as MAIN's
// vitest.config.ts). Runs the whole adapter test file (10 tests) against the adapter and single-edit mutants V0-V12 (numbering as in the
// Opus review's review-mutants.mjs) and prints which tests fail; for V10, V11 and V12 it also saves vitest's unedited output
// (t4-fix2-mutant-V10.raw.txt ...) and prints the failure block.
//   node t4-fix2-proof.mjs                          adapter from MAIN, test from the STAGE (before anything is copied into MAIN)
//   node t4-fix2-proof.mjs --adapter stage          adapter AND test from the STAGE
//   node t4-fix2-proof.mjs --from main              adapter AND test from MAIN (the final state)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage');
const TREE = path.join(HERE, 't4-mirror7');
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const fromMain = arg('--from') === 'main';
const adapterFrom = fromMain ? 'main' : (arg('--adapter') ?? 'main');
const testFrom = fromMain ? 'main' : 'stage';
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const rd = (from, rel) => fs.readFileSync(path.join(from === 'main' ? MAIN : STAGE, rel));
const ADAPTER_REL = 'electron/audio/DeepgramStreamingSTT.ts';
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const adapterBuf = rd(adapterFrom, ADAPTER_REL);
const testBuf = rd(testFrom, TEST_REL);
console.log(`adapter (${adapterFrom}) ${adapterBuf.length} B ${sha16(adapterBuf)}; test (${testFrom}) ${testBuf.length} B ${sha16(testBuf)}`);
const A = adapterBuf.toString('utf8');

const once = (src, label, oldS, newS) => {
    const n = src.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return src.replace(oldS, () => newS);
};
const GATE = 'const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;';
const EMPTY_FINAL = 'if (isFinal) boundaryRepair?.clear();';
const UTT = "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end', { at: Date.now() }); });";
const SPF = 'Date.now(), data.speech_final === true);';
const ONT = 'const repaired = boundaryRepair?.onTranscript(';
const START = 'this.reconnectAttempts = 0;\n        this.connect();';

// V11: the repair-log block (`if (repaired?.restored) { ... }`, comments inside it included) moved after the emit block (`this.emit('transcript', { ... });`).
function repairLogAfterEmit(src) {
    const L = src.split('\n');
    const indent = (l) => l.length - l.trimStart().length;
    const i = L.findIndex((l) => l.includes('if (repaired?.restored) {'));
    if (i < 0) throw new Error('reorder: `if (repaired?.restored) {` not found');
    let j = i + 1; while (j < L.length && !(L[j].trim() === '}' && indent(L[j]) === indent(L[i]))) j++;
    if (!L.slice(i, j + 1).some((l) => l.includes('boundary repair: restored'))) throw new Error('reorder: no repair log line inside the block');
    if (!L[j + 1].includes("this.emit('transcript', {")) throw new Error('reorder: the emit block does not directly follow the repair block');
    let e = j + 2; while (e < L.length && !(L[e].trim() === '});' && indent(L[e]) === indent(L[j + 1]))) e++;
    return [...L.slice(0, i), ...L.slice(j + 1, e + 1), ...L.slice(i, j + 1), ...L.slice(e + 1)].join('\n');
}

const T = {
    restart: 'emits the repaired final, logs the raw text plus one repair line',
    emptyFinal: 'an empty FINAL between F1 and F2 is a pause',
    utteranceEnd: 'an UtteranceEnd between F1 and F2 is a pause too',
    speechFinal: 'speech_final on F1 reaches the module',
    emptyInterim: 'an empty INTERIM is not a pause',
    nonEnglish: 'a non-English connection passes every transcript through untouched',
    newA: 'an empty FINAL on a non-English or multi connection is harmless',
    newB: 'an UtteranceEnd on a non-English or multi connection is harmless',
    adjacent: 'the repair line is the very next log line after its final',
    reconnect: 'a socket the server closed (1011) and replaced does not share its cut',
};
// [name, adapter text, expected failing tests, save raw output + print the failure blocks?]
const variants = [
    ['V0 control: the adapter as given', A, [], false],
    ['V1 gate removed', once(A, 'gate', GATE, 'const boundaryRepair = createBoundaryRepair();'), [T.nonEnglish], false],
    ['V2 gate inverted', once(A, 'inv', GATE, 'const boundaryRepair = !isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;'), [T.restart, T.emptyInterim, T.nonEnglish, T.adjacent], false],
    ['V3 clear() dropped on the empty FINAL', once(A, 'ef', EMPTY_FINAL, ''), [T.emptyFinal], false],
    ['V4 clear() dropped on UtteranceEnd', once(A, 'ue', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) this.emit('utterance-end', { at: Date.now() }); });"), [T.utteranceEnd], false],
    ['V5 speech_final not passed', once(A, 'spf', SPF, 'Date.now());'), [T.speechFinal], false],
    ['V6 an empty INTERIM clears too', once(A, 'ei', EMPTY_FINAL, 'boundaryRepair?.clear();'), [T.emptyInterim], false],
    ['V7 bare .clear() on the empty FINAL (null repair)', once(A, 'bareEf', EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();'), [T.newA], false],
    ['V8 bare .clear() on UtteranceEnd (null repair)', once(A, 'bareUe', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { boundaryRepair.clear(); if (!stale()) this.emit('utterance-end', { at: Date.now() }); });"), [T.newB], false],
    ['V9 UtteranceEnd clear moved under the stale() gate (ruling: skipped, no test)', once(A, 'ueStale', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) { boundaryRepair?.clear(); this.emit('utterance-end', { at: Date.now() }); } });"), [], false],
    ['V10 a log line inserted between the event line and the repair line', once(A, 'extraLog', ONT, "console.log('[DeepgramStreaming] review-probe'); " + ONT), [T.adjacent], true],
    ['V11 repair line logged after the emit', repairLogAfterEmit(A), [T.adjacent], true],
    ['V12 one repair per start(), shared by reconnect sockets', once(once(A, 'start', START, 'this.reconnectAttempts = 0;\n        (this as any).__br = undefined;\n        this.connect();'), 'gate2', GATE,
        'const boundaryRepair = (this as any).__br !== undefined ? (this as any).__br : ((this as any).__br = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null);'), [T.reconnect], true],
];

fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
const CACHE = path.join(HERE, '.vitecache-t4f').replace(/\\/g, '/');
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
        put(ADAPTER_REL, src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, TEST_REL], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summaryRaw = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim()).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = lines.filter((l) => /^\s+×\s/.test(l)).map((l) => l.trim().replace(/^×\s*/, '').replace(/\s\d+ms$/, '').split(' > ').pop());
        const ok = want.every((w) => failed.some((g) => g.includes(w))) && failed.every((g) => want.some((w) => g.includes(w)));
        if (!ok) bad++;
        console.log(`\n[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}\n   ${summaryRaw}`);
        failed.forEach((f) => console.log(`   failed: ${f}`));
        if (!failed.length) console.log('   (no test failed)');
        if (!ok) console.log(`   wanted ${JSON.stringify(want)}`);
        if (showBlocks) {
            const tag = name.split(' ')[0];
            fs.writeFileSync(path.join(HERE, `t4-fix2-mutant-${tag}.raw.txt`), out);
            for (let i = 0; i < lines.length; i++) {
                if (!/^\s*FAIL\s/.test(lines[i])) continue;
                let j = i + 1; while (j < lines.length && !/^⎯/.test(lines[j])) j++;
                const block = lines.slice(i, j).filter((l) => l.trim() !== '');
                console.log('   ---- vitest failure block (excerpt) ----');
                block.slice(0, 22).forEach((l) => console.log('   | ' + l));
            }
        }
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction to MAIN's node_modules removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t4f'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`\nvariants whose failing set differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
