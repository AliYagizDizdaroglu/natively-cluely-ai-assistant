// ET38 orchestrator (PREREGISTER-et38.md): the pre-flight (an ad-hoc health probe of bare 3.8 Live must answer 5/5
// with no abnormal close), then per level r1, r2, r3, each extracted with et10/et-extract.mjs and read by
// mechanics-et38.mjs. After each rep the early-stop rule is applied: MEDIUM stops once its holes exceed 4; LOW always
// plays three reps. A rep that answers fewer than half its items stops the whole chain (a service failure is likely).
// A rep is never started when it could still be running inside a guarded window (a scheduled Live probe at 20:00,
// 04:30 or 10:00, or the 05:00 cue re-smoke). A finished rep is skipped, so the chain can be continued in a later
// window; a run file without its answers file is never overwritten. Consoles stream to files; one line per step
// goes to go.log.
//   node go-et38.mjs [--levels low,medium] [--no-preflight]
//   node go-et38.mjs --selftest        the window guard and the two parsers on known inputs; no network
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/et38`;
const LOG = `${HERE}/go.log`;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

export function probeVerdict(text) {   // l20c/go.mjs, unchanged
    const m = [...text.matchAll(/^answered (\d+)\/(\d+); abnormal closes (\d+); wrote /gm)].at(-1);
    if (!m) return { ok: false, why: 'no final probe line' };
    const [a, n, ab] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return { ok: a === 5 && n === 5 && ab === 0, why: `answered ${a}/${n}, abnormal closes ${ab}` };
}
export function armLine(text) {
    const m = [...text.matchAll(/^ARM (\w+): reps (\d+), answered (\d+)\/(\d+), holes (\d+), last run answered (\d+) -> (CONTINUE|STOP|DONE)$/gm)].at(-1);
    return m ? { level: m[1], reps: Number(m[2]), answered: Number(m[3]), of: Number(m[4]), holes: Number(m[5]), last: Number(m[6]), state: m[7] } : null;
}
// Guarded windows in local minutes of the day (the machine is UTC+3, no daylight saving): the three scheduled
// probes with their run time, and the 05:00 re-smoke with its hour.
const WINDOWS = [[19 * 60 + 55, 20 * 60 + 25], [4 * 60 + 25, 6 * 60 + 30], [9 * 60 + 55, 10 * 60 + 25]];
export const REP_MINUTES = 60;   // a rep is assumed to take up to this long
export function mayStart(localMinute) {
    const end = localMinute + REP_MINUTES;
    // the rep occupies [start, end]; compare against each window today and tomorrow
    return !WINDOWS.some(([a, b]) => [0, 1440].some((d) => localMinute <= b + d && end >= a + d));
}
const localMinuteNow = () => { const d = new Date(Date.now() + 3 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const hhmm = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

if (process.argv.includes('--selftest')) {
    let bad = 0;
    const t = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad++; console.log(`${JSON.stringify(got) === JSON.stringify(want) ? 'ok ' : 'BAD'} ${name}: ${JSON.stringify(got)}`); };
    t('probe 5/5 clean', probeVerdict('answered 5/5; abnormal closes 0; wrote x\n').ok, true);
    t('probe 4/5', probeVerdict('answered 4/5; abnormal closes 0; wrote x\n').ok, false);
    t('probe with an abnormal close', probeVerdict('answered 5/5; abnormal closes 1; wrote x\n').ok, false);
    t('probe: no final line', probeVerdict('compression on: answered 5/5; abnormal closes 0\n').ok, false);
    t('arm line: continue', armLine('x\nARM low: reps 1, answered 36/38, holes 2, last run answered 36 -> CONTINUE\n'), { level: 'low', reps: 1, answered: 36, of: 38, holes: 2, last: 36, state: 'CONTINUE' });
    t('arm line: stop', armLine('ARM medium: reps 1, answered 20/38, holes 18, last run answered 20 -> STOP')?.state, 'STOP');
    t('arm line: a line without the last-run count is not read', armLine('ARM low: reps 1, answered 36/38, holes 2 -> CONTINUE'), null);
    t('arm line: absent', armLine('nothing here'), null);
    const at = (h, m) => h * 60 + m;
    t('20:26 may start (ends 21:26)', mayStart(at(20, 26)), true);
    t('19:00 may not (would run into the 20:00 probe)', mayStart(at(19, 0)), false);
    t('20:10 may not (inside the probe window)', mayStart(at(20, 10)), false);
    t('03:24 may start (ends 04:24)', mayStart(at(3, 24)), true);
    t('03:26 may not (ends 04:26, inside the 04:30 window)', mayStart(at(3, 26)), false);
    t('05:30 may not (the re-smoke hour)', mayStart(at(5, 30)), false);
    t('06:31 may start', mayStart(at(6, 31)), true);
    t('08:56 may not (would run into the 10:00 probe)', mayStart(at(8, 56)), false);
    t('23:30 may start (crosses midnight, ends 00:30)', mayStart(at(23, 30)), true);
    t('10:26 may start', mayStart(at(10, 26)), true);
    process.exit(bad ? 1 : 0);
}

const log = (s) => { const line = `${new Date().toISOString()} ${s}`; fs.appendFileSync(LOG, `${line}\n`); console.log(line); };
const run = (args, cwd, outFile, timeoutMs) => {
    const fd = fs.openSync(outFile, 'w');
    const r = spawnSync(process.execPath, args, { cwd, stdio: ['ignore', fd, fd], timeout: timeoutMs });
    fs.closeSync(fd);
    return r.status ?? (r.signal ? `signal ${r.signal}` : 'unknown');
};
const LEVELS = arg('--levels', 'low,medium').split(',');
if (LEVELS.some((l) => !['low', 'medium'].includes(l))) { console.log('usage: [--levels low,medium] [--no-preflight] | --selftest'); process.exit(2); }
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
const mechanics = (level) => { run(['mechanics-et38.mjs', '--level', level], HERE, `${HERE}/mechanics-${level}.out.txt`, 5 * 60e3); return armLine(fs.readFileSync(`${HERE}/mechanics-${level}.out.txt`, 'utf8')); };

log(`=== ET38 go: levels ${LEVELS.join(',')} ===`);
if (!mayStart(localMinuteNow())) { log(`WINDOW: not starting at ${hhmm(localMinuteNow())} local (a rep could run into a guarded window)`); process.exit(6); }
if (!process.argv.includes('--no-preflight')) {
    const stamp = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const probeOut = `${SP}/l20/health/adhoc-et38-${stamp}.console.txt`;
    log(`pre-flight: ad-hoc health probe of bare 3.8 Live -> ${probeOut}`);
    const pst = run([`${SP}/l20/health-probe.mjs`], `${SP}/l20`, probeOut, 15 * 60e3);
    const pv = probeVerdict(fs.readFileSync(probeOut, 'utf8'));
    log(`pre-flight exit ${pst}: ${pv.why} -> ${pv.ok ? 'HOLDS' : 'FAILS: ET38 does not run in this window'}`);
    if (!pv.ok) process.exit(4);
}
for (const level of LEVELS) {
    for (const r of [1, 2, 3]) {
        const runFile = `${HERE}/runs/et-${level}-r${r}.json`, ansFile = runFile.replace(/\.json$/, '.answers.json');
        if (fs.existsSync(ansFile)) { log(`${level} r${r}: already done, skipped`); continue; }
        if (fs.existsSync(runFile)) { log(`REFUSED: ${runFile} exists without its answers file (a broken rep: look at it, never overwrite)`); process.exit(3); }
        const before = r > 1 ? mechanics(level) : null;
        if (before?.state === 'STOP') { log(`${level}: STOPPED by the early-stop rule before r${r} (holes ${before.holes} > 4 after ${before.reps} rep(s))`); break; }
        if (!mayStart(localMinuteNow())) { log(`WINDOW: not starting ${level} r${r} at ${hhmm(localMinuteNow())} local`); process.exit(6); }
        log(`${level} r${r}: start`);
        const st = run(['run.mjs', '--level', level, '--rep', String(r)], HERE, `${HERE}/runs/${level}-r${r}.console.txt`, 80 * 60e3);
        log(`${level} r${r}: exit ${st}`);
        if (st !== 0) { log(`STOPPED after ${level} r${r} (non-zero exit)`); process.exit(5); }
        const et = run([`${SP}/et10/et-extract.mjs`, runFile], HERE, `${HERE}/runs/${level}-r${r}.extract.txt`, 5 * 60e3);
        log(`${level} r${r}: extract exit ${et}`);
        const m = mechanics(level);
        log(`${level} r${r}: ${m ? `answered ${m.answered}/${m.of} so far, holes ${m.holes} -> ${m.state}` : 'no ARM line from the mechanics'}`);
        if (!m) { log('STOPPED: the mechanics printed no ARM line'); process.exit(5); }
        if (m.last < 19) { log(`STOPPED: ${level} r${r} answered ${m.last} of 38, fewer than half (a service failure is likely); every run played counts, the rest waits for a later window`); process.exit(7); }
        if (m.state === 'STOP') { log(`${level}: STOPPED by the early-stop rule after r${r}`); break; }
    }
}
log('DONE');
