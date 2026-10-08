// Task 5 (throwaway): the seam the unit tests can only mock. Drives MAIN's REAL DeepgramStreamingSTT (fake @deepgram/sdk socket,
// the same header as the adapter's own test) with the design's 45 recorded sequences on ONE socket, writes every console line it
// prints the way electron/main.ts's console overrides write natively_debug.log (`<ISO> [LOG] <args joined>`), then parses that
// log with MAIN's interview60.turns-finals.mjs and requires the parsed finals to equal what the adapter EMITTED (what the turn
// tracker is fed). Calibrated in the same run: the OLD inline parse (before this task) must FAIL exactly on the repaired finals.
// MAIN is only READ (vitest and node_modules through a junction that this script removes again, then it deletes its own tree).
//   node t5-seam-check.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const TREE = path.join(HERE, 't5-mirror-seam');
const CACHE = path.join(HERE, '.vitecache-t5seam');
const OUT = path.join(HERE, 't5-seam');
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
fs.mkdirSync(OUT, { recursive: true });
const LOG_FILE = path.join(OUT, 'adapter-natively_debug.log');
const EMITTED_FILE = path.join(OUT, 'emitted-finals.json');
fs.rmSync(LOG_FILE, { force: true });
fs.rmSync(EMITTED_FILE, { force: true });

// ---- the throwaway test: the adapter test's own fake-SDK header, then one describe that produces the log
const briefTest = rdMain('electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts').toString('utf8');
const headEnd = briefTest.indexOf("\ndescribe('DeepgramStreamingSTT boundary repair");
if (headEnd < 0) throw new Error('cannot find the outer describe in the adapter test');
const seamTest = briefTest.slice(0, headEnd) + `
import fs from 'node:fs';
describe('t5 seam (throwaway): what the real adapter logs, and what it emits', () => {
    it('45 recorded sequences on one socket', () => {
        const all = [fixtures.symptom, fixtures.seam, ...fixtures.positives, ...fixtures.negatives];
        const lines: string[] = [];
        const emitted: { at: number; text: string }[] = [];
        // main.ts overrides console.log/warn/error: new Date().toISOString() + ' [LOG] ' + the args, objects JSON-stringified
        const w = (level: string) => (...a: any[]) => { lines.push(new Date().toISOString() + ' [' + level + '] ' + a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); };
        vi.useFakeTimers();
        vi.setSystemTime(Date.parse('2026-09-29T12:00:00.000Z'));
        vi.spyOn(console, 'log').mockImplementation(w('LOG'));
        vi.spyOn(console, 'warn').mockImplementation(w('WARN'));
        vi.spyOn(console, 'error').mockImplementation(w('ERROR'));
        lives.length = 0;
        const stt = new DeepgramStreamingSTT('key');
        stt.on('transcript', (t: any) => { if (t.isFinal) emitted.push({ at: Date.now(), text: String(t.text).trim() }); });
        stt.start();
        lives[0].fire('open');
        let clock = Date.now();
        for (const seq of all) {
            const t0 = clock;
            for (const ev of seq.events) {
                vi.setSystemTime(t0 + ev.atMs);
                lives[0].fire('Results', results(ev.text, ev.isFinal));
            }
            // a pause like the real logs hold: an empty final, an UtteranceEnd, then a minute of nothing
            vi.setSystemTime(t0 + seq.events[seq.events.length - 1].atMs + 2000);
            lives[0].fire('Results', results('', true));
            lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 });
            clock = t0 + seq.events[seq.events.length - 1].atMs + 60000;
        }
        stt.stop();
        vi.restoreAllMocks();
        vi.useRealTimers();
        fs.writeFileSync(${JSON.stringify(LOG_FILE.replace(/\\/g, '/'))}, lines.join('\\n') + '\\n');
        fs.writeFileSync(${JSON.stringify(EMITTED_FILE.replace(/\\/g, '/'))}, JSON.stringify(emitted));
        expect(emitted.length).toBe(90);                 // 45 sequences x 2 finals (the interim is not a final)
    });
});
`;

// ---- mirror tree (the four sources the adapter test needs + MAIN's fixtures)
const nm = path.join(TREE, 'node_modules');
const rmdirJunction = () => { if (fs.existsSync(nm)) spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' }); };
rmdirJunction();
fs.rmSync(TREE, { recursive: true, force: true });
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
fs.mkdirSync(path.join(TREE, 'electron', 'config'), { recursive: true });
fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => fs.writeFileSync(path.join(TREE, rel), buf);
for (const rel of ['electron/audio/DeepgramStreamingSTT.ts', 'electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.fixtures.json', 'electron/audio/deepgramKeyterms.ts', 'electron/config/languages.ts']) put(rel, rdMain(rel));
put('electron/audio/DeepgramStreamingSTT.t5seam.test.ts', seamTest);

let bad = 0;
const check = (label, ok, detail = '') => { if (!ok) bad++; console.log(`[${ok ? 'ok' : 'FAIL'}] ${label}${detail ? ': ' + detail : ''}`); };
try {
    const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/DeepgramStreamingSTT.t5seam.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const txt = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    console.log(txt.split('\n').filter((l) => /^\s*(Test Files|Tests)\s/.test(l)).map((l) => '  vitest: ' + l.trim().replace(/\s+/g, ' ')).join('\n'));
    check('the throwaway test drove the real adapter and wrote its outputs', r.status === 0 && fs.existsSync(LOG_FILE) && fs.existsSync(EMITTED_FILE), `exit ${r.status}`);
    if (r.status !== 0) console.log(txt.slice(0, 3000));
} finally {
    rmdirJunction();
    const gone = !fs.existsSync(nm);
    console.log(`junction removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
if (bad) process.exit(1);

// ---- the seam check itself
const log = fs.readFileSync(LOG_FILE, 'utf8');
const emitted = JSON.parse(fs.readFileSync(EMITTED_FILE, 'utf8'));
const lines = log.split('\n');
const repairIdx = lines.map((l, i) => (l.includes('boundary repair: restored') ? i : -1)).filter((i) => i >= 0);
console.log(`adapter log: ${lines.length - 1} lines, ${repairIdx.length} 'boundary repair:' lines, ${emitted.length} finals emitted`);
check('every repair line sits on the line right after a Transcript event final (the adapter\'s adjacency, which Task 5 relies on)',
    repairIdx.length > 0 && repairIdx.every((i) => /\[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="/.test(lines[i - 1])), `${repairIdx.length} of ${repairIdx.length}`);
const modUrl = pathToFileURL(path.join(MAIN, G + 'interview60.turns-finals.mjs')).href;
const { finalsFrom } = await import(modUrl);
const parsed = finalsFrom(log, 0);
check('finalsFrom(adapter log) deep-equals the finals the adapter emitted (same count, timestamps and texts, in order)', isDeepStrictEqual(parsed, emitted), `parsed ${parsed.length}, emitted ${emitted.length}`);
if (!isDeepStrictEqual(parsed, emitted)) {
    const n = Math.max(parsed.length, emitted.length);
    let shown = 0;
    for (let i = 0; i < n && shown < 5; i++) if (!isDeepStrictEqual(parsed[i], emitted[i])) { console.log(`  first differences [${i}]: parsed ${JSON.stringify(parsed[i])} vs emitted ${JSON.stringify(emitted[i])}`); shown++; }
}
const repairedTexts = emitted.filter((e, i) => e.text !== finalsRaw(log)[i]);
function finalsRaw(text) { // the RAW finals (what the Transcript event lines carry), without any repair
    return [...text.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)].map((m) => m[2].trim()).filter(Boolean);
}
check('the number of emitted finals that differ from their raw log text equals the number of repair lines', repairedTexts.length === repairIdx.length, `${repairedTexts.length} vs ${repairIdx.length}`);
const R22 = emitted.find((e) => e.text.startsWith('hallucinations in a rag answer'));
check('R22 replays as "hallucinations in a rag answer without just making it refuse?"', !!R22 && R22.text === 'hallucinations in a rag answer without just making it refuse?', R22 ? JSON.stringify(R22.text) : 'not found');
// ---- calibration: the OLD inline parse must fail on exactly the repaired finals (so this comparison can fail)
const brief = fs.readFileSync(path.join(HERE, 'task-5-brief.md'), 'utf8');
const blocks = [];
{ let cur = null; for (const ln of brief.split('\n')) { if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } } else if (cur !== null) cur.push(ln); } }
const oldFile = path.join(OUT, 'old-parse.mjs');
fs.writeFileSync(oldFile, blocks[1]);
const { finalsFrom: oldFinalsFrom } = await import(pathToFileURL(oldFile).href);
const oldParsed = oldFinalsFrom(log, 0);
const oldDiffers = oldParsed.filter((f, i) => !isDeepStrictEqual(f, emitted[i])).length;
check('calibration: the OLD inline parse (pre-Task 5) differs from the emitted finals on exactly the repaired finals', oldParsed.length === emitted.length && oldDiffers === repairIdx.length, `${oldDiffers} differ vs ${repairIdx.length} repair lines`);
console.log('sample from the produced log (R22, as the adapter wrote it):');
const s = lines.findIndex((l) => l.includes('restored "hallucinations"'));
console.log(lines.slice(s - 2, s + 1).map((l) => '  ' + l).join('\n'));
console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: the real adapter\'s log replays as its emitted finals; the old parse would not');
process.exit(bad ? 1 : 0);
