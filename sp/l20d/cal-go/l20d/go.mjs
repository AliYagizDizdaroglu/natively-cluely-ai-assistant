// L20d orchestrator (PREREGISTER-l20d.md, "Pre-flight", "Broken window", "Order of work and schedule" 4 and 5; ET38's
// go-et38.mjs adapted: one arm, no levels, no early stop, run files l20d-rN, the clock guard instead of the probe windows):
//   1. the inputs are the registered ones: instruction.txt and the captured s50k prompts file by sha256 (hashes only);
//   2. the Saturday guard: a rep (and the pre-flight) is never STARTED at or after 07:45 local on 2026-10-03; it is
//      checked BEFORE the pre-flight and BEFORE EVERY rep. A rep's timeout is min(80 min, the time left until 09:30 local);
//   3. the pre-flight, once per invocation and right before the first rep it starts: `l20/health-probe.mjs` must answer
//      5/5 with no abnormal close, else NOTHING runs (exit 4); it keeps its own L20c prompt (it measures the service);
//   4. reps r1 -> r2 -> r3, one after another (never two sessions at once: an exclusive go.lock), each extracted with
//      et10/et-extract.mjs (unchanged) and read by mechanics-l20d.mjs. A rep is played at most once: a rep cut short
//      (the timeout, a crash) counts as played, its unplayed items are holes and it is never re-run;
//   5. the broken-window rule: a rep that answers fewer than 19 of 38 stops the chain (exit 7); the reps played count,
//      the rest waits for a later window;
//   6. the filter gate (Opus review M7): the sha256 of MAIN's built verbalStreamFilter.js is recorded for every
//      extraction (runs/l20d-rN.filter.json); a hash that does not begin 42d9bc42dbd17870 runs check-extract.mjs
//      (the stored 114 answers must re-extract identically), and a failure stops the chain (exit 2).
// A finished rep (its answers file exists) is skipped, so the chain continues in a later window; a run file without its
// answers file is never overwritten (exit 3). Consoles stream to files; one line per step goes to go.log.
//   node go.mjs
//   node go.mjs --selftest        the guard, the timeout, the parsers and the whole chain on stubs; no network, no audio
// Exit codes: 0 done, 2 inputs or filter, 3 refused to overwrite, 4 pre-flight fails, 5 a step failed, 6 guard, 7 broken window, 8 locked.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/cal-go/main';
const HERE = `${SP}/l20d`;
const INSTRUCTION_SHA256 = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
const PROMPTS = `${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`;
const PROMPTS_SHA256 = '90b1dd9fb4bebb8ed1d71b570547080958e1401a07a2e6a19f68165c4ea1f31a';
const FILTER = `${MAIN}/dist-electron/electron/llm/verbalStreamFilter.js`;
export const FILTER_SHA_PREFIX = 'fcdd07d175081cff';
export const BROKEN_BELOW = 19;                                  // answered of 38 in the rep just played
export const REP_MAX_MS = 1500;                             // ET38's rep timeout; a rep took 32-37 min there
const local = (h, mi) => new Date(2099, 9, 3, h, mi);            // 3 Oct 2026, local time (this machine is UTC+3)
export const mayStart = (now) => now.getTime() < local(7, 45).getTime();
export const repTimeoutMs = (now) => Math.max(0, Math.min(REP_MAX_MS, local(9, 30).getTime() - now.getTime()));
export const brokenWindow = (m) => m.last < BROKEN_BELOW;

export function probeVerdict(text) {   // l20c/go.mjs, unchanged
    const m = [...text.matchAll(/^answered (\d+)\/(\d+); abnormal closes (\d+); wrote /gm)].at(-1);
    if (!m) return { ok: false, why: 'no final probe line' };
    const [a, n, ab] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return { ok: a === 5 && n === 5 && ab === 0, why: `answered ${a}/${n}, abnormal closes ${ab}` };
}
export function armLine(text) {
    const m = [...text.matchAll(/^ARM l20d: reps (\d+), answered (\d+)\/(\d+), holes (\d+), last run answered (\d+) -> (CONTINUE|DONE)$/gm)].at(-1);
    return m ? { reps: Number(m[1]), answered: Number(m[2]), of: Number(m[3]), holes: Number(m[4]), last: Number(m[5]), state: m[6] } : null;
}
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/** The chain, with every side effect injected: env = { dir, now(), log(s), exists(f), probe(), runRep(r, timeoutMs), extract(r), mechanics(), filterSha(), recheckFilter(), recordFilter(r, sha) }. Returns the exit code. */
export function chain(env) {
    const { dir, log } = env;
    let probed = false;
    // the filter gate: a hash other than the registered one must still reproduce the stored answers
    const filterGate = (when) => {
        const s = env.filterSha();
        if (s.startsWith(FILTER_SHA_PREFIX)) return true;
        log(`FILTER: verbalStreamFilter.js sha256 ${s.slice(0, 16)} is not ${FILTER_SHA_PREFIX} (${when}); re-checking the stored answers`);
        const ok = env.recheckFilter();
        log(`FILTER: check-extract ${ok ? 'reproduces the stored answers (114 same)' : 'DOES NOT reproduce the stored answers'}`);
        return ok;
    };
    for (const r of [1, 2, 3]) {
        const runFile = `${dir}/runs/l20d-r${r}.json`, ansFile = `${dir}/runs/l20d-r${r}.answers.json`;
        if (env.exists(ansFile)) { log(`r${r}: already done, skipped`); continue; }
        if (env.exists(runFile)) { log(`REFUSED: ${runFile} exists without its answers file (a played or broken rep: look at it; extract it by hand or leave it; never overwritten)`); return 3; }
        if (!mayStart(env.now())) { log(`GUARD: not starting r${r} at ${hhmm(env.now())} local (nothing starts at or after 07:45 on 2026-10-03)`); return 6; }
        if (!filterGate(`before r${r}`)) { log('STOPPED: the extraction filter changed and no longer reproduces the stored answers'); return 2; }
        if (!probed) {
            const pv = env.probe();
            log(`pre-flight: ${pv.why} -> ${pv.ok ? 'HOLDS' : 'FAILS: L20d does not run in this window'}`);
            if (!pv.ok) return 4;
            probed = true;
            if (!mayStart(env.now())) { log(`GUARD: the pre-flight ended at ${hhmm(env.now())} local; not starting r${r}`); return 6; }
        }
        const timeout = repTimeoutMs(env.now());
        log(`r${r}: start (timeout ${Math.round(timeout / 60e3)} min)`);
        const st = env.runRep(r, timeout);
        log(`r${r}: exit ${st}`);
        if (!env.exists(runFile)) { log(`STOPPED after r${r}: no run file was written (exit ${st}); nothing was played`); return 5; }
        if (st !== 0) log(`r${r}: CUT SHORT (exit ${st}); it counts as played, its unplayed items are holes, it is never re-run`);
        if (!filterGate(`before extracting r${r}`)) { log(`STOPPED: the filter changed during r${r}; extract it by hand (et10/et-extract.mjs) once the filter is understood`); return 2; }
        env.recordFilter(r, env.filterSha());
        const et = env.extract(r);
        log(`r${r}: extract exit ${et}`);
        if (et !== 0) { log(`STOPPED: the extraction of r${r} failed`); return 5; }
        const m = env.mechanics();
        log(`r${r}: ${m ? `answered ${m.answered}/${m.of} so far, holes ${m.holes}, this rep ${m.last} of 38 -> ${m.state}` : 'no ARM line from the mechanics'}`);
        if (!m) { log('STOPPED: the mechanics printed no ARM line'); return 5; }
        if (brokenWindow(m)) { log(`STOPPED: r${r} answered ${m.last} of 38, fewer than ${BROKEN_BELOW} (a service failure is likely); the reps played count, the rest waits for a later window`); return 7; }
    }
    log('DONE');
    return 0;
}

if (process.argv.includes('--selftest')) {
    let bad = 0;
    const t = (name, got, want) => { const g = JSON.stringify(got) === JSON.stringify(want); if (!g) bad++; console.log(`${g ? 'ok ' : 'BAD'} ${name}: ${JSON.stringify(got)}${g ? '' : ` (want ${JSON.stringify(want)})`}`); };
    t('probe 5/5 clean', probeVerdict('answered 5/5; abnormal closes 0; wrote x\n').ok, true);
    t('probe 4/5', probeVerdict('answered 4/5; abnormal closes 0; wrote x\n').ok, false);
    t('probe with an abnormal close', probeVerdict('answered 5/5; abnormal closes 1; wrote x\n').ok, false);
    t('probe: no final line', probeVerdict('compression on: answered 5/5; abnormal closes 0\n').ok, false);
    t('arm line: continue', armLine('x\nARM l20d: reps 1, answered 36/38, holes 2, last run answered 36 -> CONTINUE\n'), { reps: 1, answered: 36, of: 38, holes: 2, last: 36, state: 'CONTINUE' });
    t('arm line: done', armLine('ARM l20d: reps 3, answered 111/114, holes 3, last run answered 38 -> DONE')?.state, 'DONE');
    t('arm line: ET38\'s level-named line is not read', armLine('ARM low: reps 1, answered 36/38, holes 2, last run answered 36 -> CONTINUE'), null);
    t('arm line: a line without the last-run count is not read', armLine('ARM l20d: reps 1, answered 36/38, holes 2 -> CONTINUE'), null);
    t('arm line: absent', armLine('nothing here'), null);
    // the Saturday guard, in local time
    const at = (y, mo, d, h, mi, s = 0) => new Date(y, mo - 1, d, h, mi, s);
    t('guard: 3 Oct 00:10 may start', mayStart(at(2026, 10, 3, 0, 10)), true);
    t('guard: 3 Oct 07:44 may start', mayStart(at(2026, 10, 3, 7, 44)), true);
    t('guard: 3 Oct 07:44:59 may start', mayStart(at(2026, 10, 3, 7, 44, 59)), true);
    t('guard: 3 Oct 07:45:00 may NOT (at or after)', mayStart(at(2026, 10, 3, 7, 45)), false);
    t('guard: 3 Oct 07:46 may not', mayStart(at(2026, 10, 3, 7, 46)), false);
    t('guard: 3 Oct 23:00 may not', mayStart(at(2026, 10, 3, 23, 0)), false);
    t('guard: 4 Oct 00:10 may not (a later day never starts a rep either)', mayStart(at(2026, 10, 4, 0, 10)), false);
    t('guard: 2 Oct 23:59 may start', mayStart(at(2026, 10, 2, 23, 59)), true);
    t('guard: the real clock reads the machine\'s local time (offset +180 min expected)', -new Date().getTimezoneOffset(), 180);
    // the rep timeout = min(80 min, time left until 09:30)
    const min = (ms) => ms / 60e3;
    t('timeout: 00:30 -> 80 min', min(repTimeoutMs(at(2026, 10, 3, 0, 30))), 80);
    t('timeout: 07:44 -> 80 min (106 min left)', min(repTimeoutMs(at(2026, 10, 3, 7, 44))), 80);
    t('timeout: 08:10 -> 80 min (exactly 80 left)', min(repTimeoutMs(at(2026, 10, 3, 8, 10))), 80);
    t('timeout: 08:30 -> 60 min', min(repTimeoutMs(at(2026, 10, 3, 8, 30))), 60);
    t('timeout: 09:29:30 -> 0.5 min', min(repTimeoutMs(at(2026, 10, 3, 9, 29, 30))), 0.5);
    t('timeout: 09:31 -> 0 (never negative)', min(repTimeoutMs(at(2026, 10, 3, 9, 31))), 0);
    // the broken-window rule
    t('broken window: 18 of 38 stops', brokenWindow({ last: 18 }), true);
    t('broken window: 19 of 38 does not', brokenWindow({ last: 19 }), false);
    t('broken window: 0 of 38 stops', brokenWindow({ last: 0 }), true);

    // the whole chain on stubs. A fake world: a clock, a file set, a script of probe results and per-rep answers.
    const GOOD = `${FILTER_SHA_PREFIX}ffffffffffffffffffffffffffffffffffffffffffffff`;
    const mk = (o = {}) => {
        const w = { clock: o.start ?? new Date(2026, 9, 3, 0, 30), files: new Set(o.files ?? []), calls: [], lines: [], answers: o.answers ?? [38, 38, 38], probes: o.probes ?? [{ ok: true, why: 'answered 5/5, abnormal closes 0' }], tick: o.tick ?? 35 * 60e3, repExit: o.repExit ?? {}, timeouts: [], recorded: [], filter: o.filter ?? GOOD, recheck: o.recheck ?? true, rechecks: 0 };
        const env = {
            dir: '/d', log: (s) => w.lines.push(s), now: () => w.clock,
            exists: (f) => w.files.has(f),
            probe: () => { w.calls.push('probe'); w.clock = new Date(w.clock.getTime() + 5 * 60e3); return w.probes.shift(); },
            runRep: (r, timeout) => { w.calls.push(`run${r}`); w.timeouts.push(Math.round(timeout / 60e3)); w.clock = new Date(w.clock.getTime() + w.tick); const st = w.repExit[r] ?? 0; if (st !== 'none') w.files.add(`/d/runs/l20d-r${r}.json`); return st === 'none' ? 2 : st; },
            extract: (r) => { w.calls.push(`extract${r}`); w.files.add(`/d/runs/l20d-r${r}.answers.json`); return 0; },
            mechanics: () => { const reps = [1, 2, 3].filter((r) => w.files.has(`/d/runs/l20d-r${r}.answers.json`)); const last = w.answers[reps.length - 1]; const answered = reps.reduce((n, _, i) => n + w.answers[i], 0); return { reps: reps.length, answered, of: 38 * reps.length, holes: 38 * reps.length - answered, last, state: reps.length >= 3 ? 'DONE' : 'CONTINUE' }; },
            filterSha: () => w.filter, recheckFilter: () => { w.rechecks++; return w.recheck; }, recordFilter: (r, s) => w.recorded.push(`r${r}:${s.slice(0, 16)}`),
        };
        return { w, env };
    };
    const runIt = (o) => { const { w, env } = mk(o); const code = chain(env); return { code, calls: w.calls.join(' '), lines: w.lines, w }; };
    let x = runIt({});
    t('chain: a healthy night: probe once, run1 extract1 run2 extract2 run3 extract3, exit 0', [x.code, x.calls], [0, 'probe run1 extract1 run2 extract2 run3 extract3']);
    t('chain: the filter hash is recorded for every extraction', x.w.recorded, ['r1:42d9bc42dbd17870', 'r2:42d9bc42dbd17870', 'r3:42d9bc42dbd17870']);
    t('chain: each rep was handed its timeout (80 min at 00:30; the clock moves 35 min a rep)', x.w.timeouts, [80, 80, 80]);
    x = runIt({ answers: [38, 18, 38] });
    t('chain: r2 answers 18 of 38 -> broken window, exit 7, r3 never started', [x.code, x.calls], [7, 'probe run1 extract1 run2 extract2']);
    x = runIt({ answers: [38, 19, 19] });
    t('chain: 19 of 38 is not broken: all three reps run, exit 0', [x.code, x.calls], [0, 'probe run1 extract1 run2 extract2 run3 extract3']);
    x = runIt({ answers: [10, 38, 38] });
    t('chain: r1 answers 10 -> stops after r1 (exit 7)', [x.code, x.calls], [7, 'probe run1 extract1']);
    x = runIt({ probes: [{ ok: false, why: 'answered 4/5, abnormal closes 0' }] });
    t('pre-flight fails -> nothing runs, exit 4', [x.code, x.calls], [4, 'probe']);
    x = runIt({ start: new Date(2026, 9, 3, 7, 45) });
    t('guard at 07:45 -> not even the probe, exit 6', [x.code, x.calls], [6, '']);
    x = runIt({ start: new Date(2026, 9, 3, 7, 46) });
    t('guard at 07:46 -> exit 6, nothing runs', [x.code, x.calls], [6, '']);
    x = runIt({ start: new Date(2026, 9, 3, 7, 44) });
    t('guard at 07:44 but the probe takes 5 min -> the probe runs, no rep starts (exit 6)', [x.code, x.calls], [6, 'probe']);
    x = runIt({ start: new Date(2026, 9, 3, 7, 0), tick: 40 * 60e3 });
    t('guard: r1 starts 07:05 (after the probe) and ends 07:45; r2 is refused, exit 6, r2 never started', [x.code, x.calls], [6, 'probe run1 extract1']);
    x = runIt({ start: new Date(2026, 9, 3, 7, 0), tick: 40 * 60e3 });
    t('timeout: r1 starts 07:05 -> 80 min', x.w.timeouts, [80]);
    x = runIt({ files: ['/d/runs/l20d-r1.json', '/d/runs/l20d-r1.answers.json'], answers: [38, 38, 38], start: new Date(2026, 9, 3, 7, 30), tick: 12 * 60e3 });
    t('resume after a finished r1 (07:30): r1 skipped, the probe runs, r2 starts 07:35 and ends 07:47, then the guard refuses r3', [x.code, x.calls], [6, 'probe run2 extract2']);
    x = runIt({ files: ['/d/runs/l20d-r1.json', '/d/runs/l20d-r1.answers.json'], answers: [38, 38, 38] });
    t('resume at 00:30: r1 finished -> skipped; the probe still runs before the first rep this invocation starts', [x.code, x.calls], [0, 'probe run2 extract2 run3 extract3']);
    x = runIt({ files: ['/d/runs/l20d-r1.json'] });
    t('a run file without its answers file -> REFUSED exit 3, nothing runs', [x.code, x.calls], [3, '']);
    x = runIt({ files: ['/d/runs/l20d-r1.json', '/d/runs/l20d-r1.answers.json', '/d/runs/l20d-r2.json', '/d/runs/l20d-r2.answers.json', '/d/runs/l20d-r3.json', '/d/runs/l20d-r3.answers.json'] });
    t('everything done -> exit 0, no probe, no run', [x.code, x.calls], [0, '']);
    x = runIt({ repExit: { 1: 'none' } });
    t('run.mjs exits 2 with no run file (e.g. the instruction hash refused) -> STOPPED, exit 5, no extraction', [x.code, x.calls], [5, 'probe run1']);
    x = runIt({ repExit: { 2: 'signal SIGTERM' }, answers: [38, 30, 38] });
    t('a rep cut short by the timeout (run file written, signal exit) counts as played: extracted, read, never re-run; the chain goes on', [x.code, x.calls, x.lines.some((l) => /CUT SHORT/.test(l))], [0, 'probe run1 extract1 run2 extract2 run3 extract3', true]);
    x = runIt({ repExit: { 1: 'signal SIGTERM' }, answers: [12, 38, 38] });
    t('a rep cut short that answered 12 of 38 -> played, extracted, then the broken-window stop (exit 7)', [x.code, x.calls], [7, 'probe run1 extract1']);
    x = runIt({ filter: 'abcdef0123456789'.padEnd(64, '0') });
    t('a different filter hash that reproduces the stored answers -> the chain runs; the check was run (before each rep and each extraction)', [x.code, x.w.rechecks > 0, x.calls], [0, true, 'probe run1 extract1 run2 extract2 run3 extract3']);
    x = runIt({ filter: 'abcdef0123456789'.padEnd(64, '0'), recheck: false });
    t('a different filter hash that does NOT reproduce them -> nothing runs, exit 2', [x.code, x.calls], [2, '']);
    x = runIt({});
    t('the registered filter hash -> check-extract is never run', x.w.rechecks, 0);
    process.exit(bad ? 1 : 0);
}

// ---- the real run -----------------------------------------------------------------------------------------------
const LOG = `${HERE}/go.log`, LOCK = `${HERE}/go.lock`;
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; fs.appendFileSync(LOG, `${line}\n`); console.log(line); };
const run = (args, cwd, outFile, timeoutMs) => {
    const fd = fs.openSync(outFile, 'w');
    const r = spawnSync(process.execPath, args, { cwd, stdio: ['ignore', fd, fd], timeout: timeoutMs });
    fs.closeSync(fd);
    return r.status ?? (r.signal ? `signal ${r.signal}` : 'unknown');
};
log('=== L20d go ===');
if (sha(`${HERE}/instruction.txt`) !== INSTRUCTION_SHA256) { log('REFUSED: instruction.txt does not match its registered sha256'); process.exit(2); }
if (sha(PROMPTS) !== PROMPTS_SHA256) { log('REFUSED: the captured s50k prompts file does not match its registered sha256'); process.exit(2); }
try { fs.closeSync(fs.openSync(LOCK, 'wx')); } catch { log(`REFUSED: ${LOCK} exists (another go.mjs is running, or one died: look, then delete it by hand)`); process.exit(8); }
process.on('exit', () => { try { fs.rmSync(LOCK); } catch { /* already gone */ } });
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
const env = {
    dir: HERE, log, now: () => new Date(), exists: (f) => fs.existsSync(f),
    probe: () => {
        const d = new Date(), p = (n) => String(n).padStart(2, '0');
        const probeOut = `${SP}/l20/health/adhoc-l20d-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}.console.txt`;
        log(`pre-flight: ad-hoc health probe of bare 3.8 Live -> ${probeOut}`);
        const st = run([`${SP}/l20/health-probe.mjs`], `${SP}/l20`, probeOut, 15 * 60e3);
        const pv = probeVerdict(fs.readFileSync(probeOut, 'utf8'));
        return { ...pv, why: `exit ${st}: ${pv.why}` };
    },
    runRep: (r, timeoutMs) => run(['run.mjs', '--rep', String(r)], HERE, `${HERE}/runs/r${r}.console.txt`, timeoutMs),
    extract: (r) => run([`${SP}/et10/et-extract.mjs`, `${HERE}/runs/l20d-r${r}.json`], HERE, `${HERE}/runs/r${r}.extract.txt`, 5 * 60e3),
    mechanics: () => { run(['mechanics-l20d.mjs'], HERE, `${HERE}/mechanics.out.txt`, 5 * 60e3); return armLine(fs.readFileSync(`${HERE}/mechanics.out.txt`, 'utf8')); },
    filterSha: () => sha(FILTER),
    recheckFilter: () => run(['check-extract.mjs'], HERE, `${HERE}/check-extract.run.out.txt`, 10 * 60e3) === 0,
    recordFilter: (r, s) => { fs.writeFileSync(`${HERE}/runs/l20d-r${r}.filter.json`, JSON.stringify({ file: FILTER, sha256: s, registeredPrefix: FILTER_SHA_PREFIX, at: new Date().toISOString() })); log(`r${r}: extraction filter sha256 ${s.slice(0, 16)}`); },
};
process.exit(chain(env));
