// Known-answer cases of P2 (run-r.mjs + mock-session-r.mjs + dry-check-r.mjs), A3.6. Every case is a child process of run-r.mjs in --dry mode (virtual clock, no network, no key)
// except the "real mode" cases, which must refuse before any connect and before the key is read. Prints expected vs actual; counts and booleans only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { calRun, realClockRefuses } from './cal-util.mjs';
import { R40, TONIGHT_LINE, loadItems } from './r40-common.mjs';

const C = calRun('run-r');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-cal-run-'));
const REAL_RULINGS = fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8');
const RUL = path.join(TMP, 'rul.txt');
fs.writeFileSync(RUL, `${REAL_RULINGS.split(/\r?\n/).filter((l) => !l.trim().startsWith('TONIGHT ')).join('\n')}\n${TONIGHT_LINE}\n`, 'utf8'); // the stub clock default is 2026-10-05T22:00 (A5)
const wj = (name, obj) => { const p = path.join(TMP, name); fs.writeFileSync(p, JSON.stringify(obj)); return p; };
let n = 0;
/** one dry run in its own out dir; returns { status, out, run, answers, dir, files } */
function dry(args, name = 'cal', { rulings = RUL } = {}) {
    const dir = path.join(TMP, `c${++n}`);
    fs.mkdirSync(dir);
    const r = spawnSync(process.execPath, [`${R40}/run-r.mjs`, '--dry', '--variant', 'B', '--stub-rulings', rulings, '--out-dir', dir, '--name', name, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const files = fs.readdirSync(dir);
    const read = (f) => (files.includes(f) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null);
    const fn = files.find((f) => f.endsWith('.json') && !f.endsWith('.answers.json'));
    return { status: r.status, out: r.stdout, err: r.stderr, files, dir, run: fn ? read(fn) : null, name: fn?.replace(/\.json$/, '') };
}
const chainsRun = (r) => (r.run ? new Set(r.run.sessions.map((s) => s.chain)).size : 0);
const dc = (r, extra = []) => spawnSync(process.execPath, [`${R40}/dry-check-r.mjs`, '--dir', r.dir, '--name', r.name, ...extra], { encoding: 'utf8' });

// 1. the full dry run + the dry-check, and its negative control
let r = dry(['--dry-fail', 'C05']);
let k = dc(r, ['--expect-fail', 'C05']);
C.check('R1', '--dry --variant B --dry-fail C05: 47 turns in section 5 order, 16 gaps of 10 s, C05 retried once, hard items end 6 s after their turn, silent items at 30 s (dry-check-r)', 'run exit 0, dry-check ALL PASS', `run exit ${r.status}; ${(k.stdout.match(/DRY CHECK: .*/) ?? ['no verdict'])[0]}`, r.status === 0 && k.status === 0 && /ALL PASS/.test(k.stdout));
k = dc(r, ['--expect-fail', 'C05', '--scramble']);
C.check('R2', 'negative control: dry-check-r on a run with two items relabelled (--scramble)', 'dry-check FAILS (exit 1)', `exit ${k.status}; ${(k.stdout.match(/DRY CHECK: .*/) ?? ['no verdict'])[0]}`, k.status === 1);
const again = spawnSync(process.execPath, [`${R40}/run-r.mjs`, '--dry', '--variant', 'B', '--stub-rulings', RUL, '--out-dir', r.dir, '--name', 'cal'], { encoding: 'utf8' });
C.check('R3', 'a second run into the same name/dir', 'exit 2 (never overwritten)', `exit ${again.status}`, again.status === 2);

// 2. variant / sha guard, model assertion
const B_SHA = '4571f563321f6d9cf738c04b05933016bca9521df5e712142c3472d6009041c5';
const run1 = (args, extra = {}) => { const dir = path.join(TMP, `c${++n}`); fs.mkdirSync(dir); const x = spawnSync(process.execPath, [`${R40}/run-r.mjs`, ...args, '--out-dir', dir, '--stub-rulings', RUL], { encoding: 'utf8' }); return { status: x.status, out: x.stdout, files: fs.readdirSync(dir) }; };
r = run1(['--dry', '--variant', 'A', '--expect-sha', B_SHA, '--name', 'v1']);
C.check('R4', '--variant A with variant B\'s expected sha', 'exit 2, nothing written', `exit ${r.status}; files ${r.files.length}`, r.status === 2 && r.files.length === 0);
r = run1(['--dry', '--variant', 'Z', '--name', 'v2']);
C.check('R5', '--variant Z', 'exit 2', `exit ${r.status}`, r.status === 2);
r = run1(['--dry', '--variant', 'B', '--dry-tamper-block', '--name', 'v3']);
C.check('R6', 'a one-space-longer block (any sha mismatch)', 'exit 2, nothing written', `exit ${r.status}; files ${r.files.length}`, r.status === 2 && r.files.length === 0);
r = run1(['--dry', '--name', 'v4']);
C.check('R7', 'no --variant', 'exit 2', `exit ${r.status}`, r.status === 2);
r = run1(['--dry', '--variant', 'B', '--expect-sha', B_SHA, '--only', 'C03', '--name', 'v5']);
C.check('R8', 'negative control: --expect-sha equal to the built sha', 'exit 0', `exit ${r.status}`, r.status === 0);
r = dry(['--stub-model', 'gemini-3.1-flash-live-preview', '--only', 'C03']);
C.check('R9', 'session model asserted before connect: a stub gemini-3.1-flash-live-preview', 'exit 2, no chain finished', `exit ${r.status}; output files ${r.files.length}`, r.status === 2 && r.files.length === 0);

// 3. the per-chain / per-attempt guards (A3.1)
const T = (name, state, nextRun) => ({ name, state, nextRun });
r = dry(['--stub-tasks', wj('t1.json', { initial: [], after: { 1: [T('Natively-flight-eq', 'Ready', '2026-10-05T22:55')] } })]);
let g = r.run?.guardLog?.find((x) => !x.ok);
C.check('R10', 'A3.1 re-based (A5): the remaining est fits at start; after chain 1 a Natively-flight-eq task (NextRunTime 22:55, deadline 22:25) puts chain 2\'s now + remaining est past the recomputed deadline', 'exactly 1 chain runs, saved, INCOMPLETE, guard "now + est < deadline"', `chains run ${chainsRun(r)}; complete ${r.run?.complete}; exit ${r.status}; failed [${(g?.failed ?? []).map((x) => x.slice(0, 22)).join(';')}]`, chainsRun(r) === 1 && r.run?.complete === false && g?.before === 'C02#1' && g.failed.length === 1 && /^now \+ est < deadline/.test(g.failed[0]) && r.status === 3);
r = dry(['--stub-tasks', wj('t1b.json', { initial: [], after: { 1: [T('Natively-flight-eq', 'Ready', '2026-10-06T00:30')] } })]);
C.check('R11', 'negative control: the same task appearing but with a far NextRunTime (00:30 next day: the 23:15 cap is the deadline)', 'all 31 chains run, COMPLETE', `chains run ${chainsRun(r)}; complete ${r.run?.complete}`, chainsRun(r) === 31 && r.run?.complete === true);
r = dry(['--stub-tasks', wj('t2.json', { initial: [], after: { 1: [T('Natively-smoke-eq', 'Running', null)] } })]);
g = r.run?.guardLog?.find((x) => !x.ok);
C.check('R12', 'a stub task list turning a Natively-* task Running after chain 1', 'exactly 1 chain runs; guard "no Natively-* task Running"', `chains run ${chainsRun(r)}; failed [${(g?.failed ?? []).join(';')}]`, chainsRun(r) === 1 && g?.failed.join() === 'no Natively-* task Running');
r = dry(['--dry-fail', 'C05', '--stub-tasks', wj('t3.json', { initial: [], after: { 5: [T('Natively-smoke-eq', 'Running', null)] } })]);
const c5 = r.run?.sessions.filter((s) => s.chain === 'C05') ?? [];
C.check('R13', 'a stub that turns Running before C05\'s retry (after attempt 1)', 'C05 attempt 1 only, no retry, run INCOMPLETE', `C05 attempts ${c5.length}; chains run ${chainsRun(r)}; stop "${(r.run?.stopReason ?? '').slice(0, 40)}"`, c5.length === 1 && r.run?.complete === false && /^guard before the retry of C05/.test(r.run?.stopReason ?? ''));
r = dry(['--stub-tasks', wj('t4.json', [T('Natively-flight-eq', 'Ready', '2026-10-05T22:20')])]);
C.check('R14', 'remaining est above the deadline at start (a flight task at 22:20, deadline 21:50, now 22:00)', 'exit 3, no chain starts, nothing written', `exit ${r.status}; files ${r.files.length}; REFUSED line ${/REFUSED \(exit 3\)/.test(r.out)}`, r.status === 3 && r.files.length === 0 && /REFUSED \(exit 3\)/.test(r.out));
r = dry(['--now', '2026-10-05T21:44']);
C.check('R15', 'a stub clock before 21:45 (the window start): no chain starts', 'exit 3, no chain starts, nothing written', `exit ${r.status}; files ${r.files.length}`, r.status === 3 && r.files.length === 0);
r = dry(['--stub-procs', wj('p1.json', [{ name: 'electron.exe', pid: 5, cmd: '' }])]);
C.check('R16', 'a stub process list with electron.exe', 'exit 3, no chain starts', `exit ${r.status}; files ${r.files.length}`, r.status === 3 && r.files.length === 0);
r = dry(['--stub-procs', wj('p2.json', { initial: [], after: { 2: [{ name: 'tail.exe', pid: 5, cmd: '' }] } })]);
C.check('R17', 'tail.exe appearing after chain 2', 'exactly 2 chains run', `chains run ${chainsRun(r)}`, chainsRun(r) === 2);

// A5: a stub clock that reaches the 23:15 end before chain k: chains 1..k-1 only (start at 22:45:30, the remaining est just fits)
const SLOW = wj('slow.json', Object.fromEntries(loadItems().items.map((i) => [i.id, 'silent']))); // every item silent = 30 s a turn, slower than A5.2's 25 s realistic pace, so the clock outruns the remaining est
r = dry(['--now', '2026-10-05T22:45:30', '--dry-script', SLOW]);
g = r.run?.guardLog?.find((x) => !x.ok);
const kk = chainsRun(r);
C.check('R15b', 'A5: --now 22:45:30 (the start check just fits 23:15); the virtual clock reaches the cap before a later chain', 'some chains 1..k-1 run (1 <= k-1 < 31), saved, INCOMPLETE, the guard row is the 23:15 deadline row only', `chains run ${kk}; complete ${r.run?.complete}; exit ${r.status}; failed [${(g?.failed ?? []).map((x) => x.slice(0, 30)).join(';')}]`, kk >= 1 && kk < 31 && r.run?.complete === false && r.status === 3 && g?.failed.length === 1 && /^now \+ est < deadline \(min\(23:15/.test(g.failed[0]));
r = dry(['--now', '2026-10-05T22:50']);
C.check('R15c', 'A5: --now 22:50 (the remaining est cannot fit before 23:15)', 'exit 3, no chain starts, nothing written', `exit ${r.status}; files ${r.files.length}`, r.status === 3 && r.files.length === 0);
r = dry(['--now', '2026-10-05T23:15']);
C.check('R15d', 'A5: --now 23:15 (the window end is exclusive)', 'exit 3, no chain starts, nothing written, the date gate named', `exit ${r.status}; files ${r.files.length}; date gate ${/date gate \(R/.test(r.out)}`, r.status === 3 && r.files.length === 0 && /date gate \(R/.test(r.out));
r = dry(['--now', '2026-10-06T10:01']);
C.check('R15e', 'A5: --now 2026-10-06T10:01 (tomorrow is not the R window)', 'exit 3, no chain starts, nothing written', `exit ${r.status}; files ${r.files.length}`, r.status === 3 && r.files.length === 0);
r = dry(['--stub-procs', wj('p0.json', [{ name: 'node.exe', pid: 5, cmd: 'node C:\\x\\router40\\lite-l.mjs --cap 60' }])]);
C.check('R15f', 'A7 m4: a lite-l.mjs process running (sequential, never concurrent)', 'exit 3, no chain starts', `exit ${r.status}; files ${r.files.length}`, r.status === 3 && r.files.length === 0);

// 4. health STOP
r = dry(['--dry-fail-always', 'C04,C05,C06']);
C.check('R18', '3 consecutive abnormal mock chains (still abnormal after their retry); note: each such chain has 2 abnormal attempts, so the registered ">= 6 attempts" rule fires at the same moment (the "3 consecutive" rule cannot fire first)', 'health STOP after C06, INCOMPLETE, 9 sessions (C01-C03 once, C04-C06 twice)', `stop "${(r.run?.stopReason ?? '').slice(0, 40)}"; chains run ${chainsRun(r)}; sessions ${r.run?.sessions.length}`, /^health STOP/.test(r.run?.stopReason ?? '') && chainsRun(r) === 6 && r.run.sessions.length === 9 && r.run.complete === false);
r = dry(['--dry-fail-always', 'C04,C05']);
C.check('R19', 'negative control: only 2 consecutive abnormal chains (4 abnormal attempts)', 'no health STOP, all 31 chains run', `stop ${r.run?.stopReason}; chains run ${chainsRun(r)}`, r.run?.stopReason == null && chainsRun(r) === 31);
r = dry(['--dry-fail-always', 'C04,C07']);
C.check('R20', 'negative control: 2 abnormal chains, not consecutive', 'no health STOP', `stop ${r.run?.stopReason}`, r.run?.stopReason == null);
r = dry(['--dry-fail-always', 'C04,C07,C10']);
C.check('R20b', '3 abnormal chains, not consecutive: 6 abnormal attempts', 'health STOP by the >= 6 rule after C10', `stop "${(r.run?.stopReason ?? '').slice(0, 40)}"; chains run ${chainsRun(r)}`, /^health STOP: 6 abnormal/.test(r.run?.stopReason ?? '') && chainsRun(r) === 10);
C.check('R21', '>= 6 abnormal chain attempts in total (each retry succeeds)', 'health STOP at the 6th abnormal attempt', `stop "${(r.run?.stopReason ?? '').slice(0, 56)}"; abnormalAttempts ${r.run?.health.abnormalAttempts}`, /^health STOP: 6 abnormal/.test(r.run?.stopReason ?? '') && r.run.health.abnormalAttempts === 6);
r = dry(['--dry-fail', 'C02,C04,C06,C08,C10']);
C.check('R22', 'negative control: 5 abnormal attempts, retries succeed', 'no health STOP, COMPLETE', `stop ${r.run?.stopReason}; complete ${r.run?.complete}`, r.run?.stopReason == null && r.run?.complete === true);

// 5. m4: a stopped run named router40-R is kept as router40-R-<hhmm>
r = dry(['--stub-tasks', wj('t5.json', { initial: [], after: { 1: [T('Natively-smoke-eq', 'Running', null)] } })], 'router40-R');
C.check('R23', 'm4: a stopped run started as router40-R', 'files router40-R-<hhmm>.json(+answers) only, none named router40-R', `files ${r.files.join(' ')}`, r.files.length === 2 && r.files.every((f) => /^router40-R-\d{4}\.(answers\.)?json$/.test(f)));
r = dry([], 'router40-R');
C.check('R24', 'm4: a complete run started as router40-R', 'files router40-R.json + router40-R.answers.json, complete true', `files ${r.files.join(' ')}; complete ${r.run?.complete}`, r.files.sort().join() === 'router40-R.answers.json,router40-R.json' && r.run?.complete === true);

// 6. real mode: stubs refused (A3.4), and nothing real runs today
const real = (args) => spawnSync(process.execPath, [`${R40}/run-r.mjs`, ...args], { encoding: 'utf8' });
let x = real(['--variant', 'B', '--now', '2026-10-05T22:00', '--only', 'C02', '--name', 'router40-R-smoke']);
C.check('R25', 'real mode with --now 2026-10-05T22:00', 'exit 2, REFUSED', `exit ${x.status}; ${/REFUSED/.test(x.stdout)}`, x.status === 2 && /stub input/.test(x.stdout));
x = real(['--variant', 'A', '--only', 'C02', '--name', 'router40-R-smoke']);
C.check('R26', 'real mode with --variant A (A1.1: the real run is B)', 'exit 2 before any guard or key', `exit ${x.status}`, x.status === 2);
const rc = realClockRefuses();
const runsBefore = fs.existsSync(`${R40}/runs`) ? fs.readdirSync(`${R40}/runs`).length : 0;
if (rc.safe) x = real(['--variant', 'B', '--only', 'C02', '--name', 'router40-R-smoke']);
const runsAfter = fs.existsSync(`${R40}/runs`) ? fs.readdirSync(`${R40}/runs`).length : 0;
if (!rc.safe) C.skip('R27', 'a genuine real invocation (real clock outside the window: the date gate must refuse)', `the real clock ${rc.at} is inside the tonight window: a real call would BE the real run (a Live connection); the out-of-window refusal is proven by R15/R15d/R15e and P9's cases on stub clocks`);
else C.check('R27', 'a genuine real invocation (real clock OUTSIDE the window): the date gate must refuse (no chain, no key read, nothing written to R40/runs)', 'exit 3, REFUSED, date gate named, runs/ unchanged', `exit ${x.status}; REFUSED ${/REFUSED \(exit 3\)/.test(x.stdout)}; date gate named ${/date gate \(R/.test(x.stdout)}; runs/ ${runsBefore} -> ${runsAfter}; key/connect lines ${/GEMINI|open|setupComplete/.test(x.stdout)}`, x.status === 3 && /date gate \(R/.test(x.stdout) && runsBefore === runsAfter && !/setupComplete|GEMINI_API/.test(x.stdout));
fs.rmSync(TMP, { recursive: true, force: true });
C.finish();
