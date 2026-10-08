// Task 4 Opus review (throwaway): single-edit mutants of MAIN's adapter on a MIRROR tree. MAIN is only READ.
// Runs MAIN's adapter test (8 tests) + review.t4.test.ts (4 review-only probes) per variant; prints which tests fail.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 'm');
const CACHE = path.join(HERE, '.vc');
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));

const ADAPTER_REL = 'electron/audio/DeepgramStreamingSTT.ts';
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const adapterBuf = rdMain(ADAPTER_REL);
const testBuf = rdMain(TEST_REL);
console.log(`MAIN adapter ${adapterBuf.length} B ${sha16(adapterBuf)}; MAIN adapter test ${testBuf.length} B ${sha16(testBuf)}`);
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

// line reorder: the repair log block (3 lines) moved after the emit block (5 lines)
function repairLogAfterEmit(src) {
    const L = src.split('\n');
    const i = L.findIndex((l) => l.includes('if (repaired?.restored) {'));
    if (i < 0 || !L[i + 1].includes('boundary repair: restored') || L[i + 2].trim() !== '}') throw new Error('reorder: repair block not found');
    if (!L[i + 3].includes("this.emit('transcript', {") || L[i + 7].trim() !== '});') throw new Error('reorder: emit block not where expected');
    const repairBlock = L.slice(i, i + 3), emitBlock = L.slice(i + 3, i + 8);
    return [...L.slice(0, i), ...emitBlock, ...repairBlock, ...L.slice(i + 8)].join('\n');
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
    rSwitch: 'R-LANGSWITCH',
    rReconnect: 'R-RECONNECT',
    rAdjacent: 'R-ADJACENT',
    rStaleUe: 'R-STALE-UE',
};
const variants = [
    ['V0 control: MAIN adapter', A, []],
    ['V1 gate removed', once(A, 'gate', GATE, 'const boundaryRepair = createBoundaryRepair();'), [T.nonEnglish, T.rSwitch]],
    ['V2 gate inverted', once(A, 'inv', GATE, 'const boundaryRepair = !isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;'), [T.restart, T.emptyInterim, T.nonEnglish, T.rSwitch, T.rAdjacent]],
    ['V3 clear() dropped on the empty FINAL', once(A, 'ef', EMPTY_FINAL, ''), [T.emptyFinal]],
    ['V4 clear() dropped on UtteranceEnd', once(A, 'ue', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) this.emit('utterance-end', { at: Date.now() }); });"), [T.utteranceEnd, T.rStaleUe]],
    ['V5 speech_final not passed', once(A, 'spf', SPF, 'Date.now());'), [T.speechFinal]],
    ['V6 an empty INTERIM clears too', once(A, 'ei', EMPTY_FINAL, 'boundaryRepair?.clear();'), [T.emptyInterim]],
    ['V7 bare .clear() on the empty FINAL (null repair)', once(A, 'bareEf', EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();'), [T.newA]],
    ['V8 bare .clear() on UtteranceEnd (null repair)', once(A, 'bareUe', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { boundaryRepair.clear(); if (!stale()) this.emit('utterance-end', { at: Date.now() }); });"), [T.newB]],
    ['V9 UtteranceEnd clear moved under the stale() gate', once(A, 'ueStale', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) { boundaryRepair?.clear(); this.emit('utterance-end', { at: Date.now() }); } });"), [T.rStaleUe]],
    ['V10 a log line inserted between the event line and the repair line', once(A, 'extraLog', ONT, "console.log('[DeepgramStreaming] review-probe'); " + ONT), [T.rAdjacent]],
    ['V11 repair line logged after the emit', repairLogAfterEmit(A), [T.rAdjacent]],
    ['V12 one repair per start(), shared by reconnect sockets', once(once(A, 'start', START, 'this.reconnectAttempts = 0;\n        (this as any).__br = undefined;\n        this.connect();'), 'gate2', GATE,
        'const boundaryRepair = (this as any).__br !== undefined ? (this as any).__br : ((this as any).__br = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null);'), [T.rReconnect]],
];

const nm = path.join(TREE, 'node_modules');
const viteMain = path.join(MAIN, 'node_modules', '.vite');
const snapVite = () => fs.existsSync(viteMain) ? fs.readdirSync(viteMain, { recursive: true }).map((f) => { const p = path.join(viteMain, String(f)); return `${f}:${fs.statSync(p).mtimeMs}`; }).sort().join('|') : '(none)';
const viteBefore = snapVite();

fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
for (const rel of ['electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.fixtures.json', 'electron/audio/deepgramKeyterms.ts', 'electron/config/languages.ts']) put(rel, rdMain(rel));
put(TEST_REL, testBuf);
put('electron/audio/review.t4.test.ts', fs.readFileSync(path.join(HERE, 'review.t4.test.ts')));
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');

let bad = 0;
try {
    for (const [name, src, want] of variants) {
        put(ADAPTER_REL, src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, '--reporter=verbose', TEST_REL, 'electron/audio/review.t4.test.ts'],
            { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = [...new Set(lines.filter((l) => /^\s*×\s/.test(l)).map((l) => l.trim().replace(/^×\s*/, '').replace(/\s\d+ms$/, '').split(' > ').pop()))];
        const ok = want.every((w) => failed.some((g) => g.includes(w))) && failed.every((g) => want.some((w) => g.includes(w)));
        if (!ok) bad++;
        console.log(`\n[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}\n   ${summary}`);
        failed.forEach((f) => console.log(`   failed: ${f}`));
        if (!failed.length) console.log('   (no test failed)');
        if (!ok) { console.log(`   wanted ${JSON.stringify(want)}`); console.log(out.slice(0, 4000)); }
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction removed: ${gone}; MAIN vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
    console.log(`mirror tree deleted: ${!fs.existsSync(TREE)}; cache deleted: ${!fs.existsSync(CACHE)}`);
    console.log(`MAIN node_modules/.vite unchanged by the mirror runs: ${snapVite() === viteBefore}`);
    const after = rdMain(ADAPTER_REL);
    console.log(`MAIN adapter after: ${after.length} B ${sha16(after)} (unchanged: ${sha16(after) === sha16(adapterBuf)})`);
}
console.log(`\nvariants whose failing set differed from the expectation: ${bad}`);
process.exit(bad ? 1 : 0);
