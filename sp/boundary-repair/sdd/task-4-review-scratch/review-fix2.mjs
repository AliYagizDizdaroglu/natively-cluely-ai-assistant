// Task 4 fix round 2 scoped re-review (throwaway): MAIN's CURRENT adapter test (10 tests) against single-edit mutants of
// MAIN's CURRENT adapter, on a MIRROR tree. MAIN is only READ. Output also written to fix2.out.txt beside this script.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 'm3');
const CACHE = path.join(HERE, '.vc3');
const outLines = [];
const say = (s) => { console.log(s); outLines.push(s); };
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const ADAPTER_REL = 'electron/audio/DeepgramStreamingSTT.ts';
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const adapterBuf = rdMain(ADAPTER_REL), testBuf = rdMain(TEST_REL);
say(`MAIN adapter ${adapterBuf.length} B ${sha16(adapterBuf)}; MAIN adapter test ${testBuf.length} B ${sha16(testBuf)}`);
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

// the whole `if (repaired?.restored) { ... }` block (comment line included) moved after the whole emit block
function repairLogAfterEmit(src) {
    const L = src.split('\n');
    const i = L.findIndex((l) => l.includes('if (repaired?.restored) {'));
    if (i < 0) throw new Error('reorder: if-block not found');
    const indent = L[i].match(/^\s*/)[0];
    let j = i + 1; while (j < L.length && L[j] !== `${indent}}`) j++;
    if (j >= L.length || !L.slice(i, j).some((l) => l.includes('boundary repair: restored'))) throw new Error('reorder: if-block end / repair log not found');
    const e0 = j + 1;
    if (!L[e0].includes("this.emit('transcript', {")) throw new Error('reorder: emit block does not follow the if-block');
    let e1 = e0 + 1; while (e1 < L.length && L[e1] !== `${indent}});`) e1++;
    if (e1 >= L.length) throw new Error('reorder: emit block end not found');
    return [...L.slice(0, i), ...L.slice(e0, e1 + 1), ...L.slice(i, j + 1), ...L.slice(e1 + 1)].join('\n');
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
    adj: 'the repair line is the very next log line after its final',
    recon: 'a socket the server closed (1011) and replaced does not share its cut',
};
const v11 = repairLogAfterEmit(A);
const variants = [
    ['V0 control: MAIN adapter', A, []],
    ['V1 gate removed', once(A, 'gate', GATE, 'const boundaryRepair = createBoundaryRepair();'), [T.nonEnglish]],
    ['V2 gate inverted', once(A, 'inv', GATE, 'const boundaryRepair = !isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;'), [T.restart, T.emptyInterim, T.nonEnglish, T.adj]],
    ['V3 clear() dropped on the empty FINAL', once(A, 'ef', EMPTY_FINAL, ''), [T.emptyFinal]],
    ['V4 clear() dropped on UtteranceEnd', once(A, 'ue', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) this.emit('utterance-end', { at: Date.now() }); });"), [T.utteranceEnd]],
    ['V5 speech_final not passed', once(A, 'spf', SPF, 'Date.now());'), [T.speechFinal]],
    ['V6 an empty INTERIM clears too', once(A, 'ei', EMPTY_FINAL, 'boundaryRepair?.clear();'), [T.emptyInterim]],
    ['V7 bare .clear() on the empty FINAL', once(A, 'bareEf', EMPTY_FINAL, 'if (isFinal) boundaryRepair.clear();'), [T.newA]],
    ['V8 bare .clear() on UtteranceEnd', once(A, 'bareUe', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { boundaryRepair.clear(); if (!stale()) this.emit('utterance-end', { at: Date.now() }); });"), [T.newB]],
    ['V9 UtteranceEnd clear under stale() (ruled: skipped)', once(A, 'ueStale', UTT, "live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) { boundaryRepair?.clear(); this.emit('utterance-end', { at: Date.now() }); } });"), []],
    ['V10 a log line between the event line and the repair line', once(A, 'extraLog', ONT, "console.log('[DeepgramStreaming] review-probe'); " + ONT), [T.adj]],
    ['V11 the repair block moved after the emit', v11, [T.adj]],
    ['V12 one repair per start(), shared by reconnect sockets', once(once(A, 'start', START, 'this.reconnectAttempts = 0;\n        (this as any).__br = undefined;\n        this.connect();'), 'gate2', GATE,
        'const boundaryRepair = (this as any).__br !== undefined ? (this as any).__br : ((this as any).__br = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null);'), [T.recon]],
];
// calibrate the block move itself: the moved text must contain the dependency comment and the repair log, after the emit
{
    const e = v11.indexOf("this.emit('transcript', {"), c = v11.indexOf('interview60.turns-finals.mjs pairs this line'), r = v11.indexOf('boundary repair: restored');
    say(`V11 build check: emit@${e} < comment@${c} < repairLog@${r}: ${e > 0 && e < c && c < r}; line count unchanged: ${v11.split('\n').length === A.split('\n').length}`);
}

const nm = path.join(TREE, 'node_modules');
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
for (const rel of ['electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.fixtures.json', 'electron/audio/deepgramKeyterms.ts', 'electron/config/languages.ts']) put(rel, rdMain(rel));
put(TEST_REL, testBuf);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');

let bad = 0;
try {
    for (const [name, src, want] of variants) {
        put(ADAPTER_REL, src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, '--reporter=verbose', TEST_REL],
            { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = [...new Set(lines.filter((l) => /^\s*×\s/.test(l)).map((l) => l.trim().replace(/^×\s*/, '').replace(/\s\d+ms$/, '').split(' > ').pop()))];
        const ok = want.every((w) => failed.some((g) => g.includes(w))) && failed.every((g) => want.some((w) => g.includes(w)));
        if (!ok) bad++;
        say(`[${ok ? 'as expected' : 'UNEXPECTED'}] ${name}: ${summary}`);
        failed.forEach((f) => say(`   failed: ${f}`));
        if (!ok) { say(`   wanted ${JSON.stringify(want)}`); say(out.slice(0, 3000)); }
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
    say(`junction removed: ${gone}; mirror deleted: ${!fs.existsSync(TREE)}; MAIN vitest present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    const after = rdMain(ADAPTER_REL);
    say(`MAIN adapter unchanged: ${sha16(after) === sha16(adapterBuf)}`);
    say(`variants whose failing set differed from the expectation: ${bad}`);
    fs.writeFileSync(path.join(HERE, 'fix2.out.txt'), outLines.join('\n') + '\n');
}
process.exit(bad ? 1 : 0);
