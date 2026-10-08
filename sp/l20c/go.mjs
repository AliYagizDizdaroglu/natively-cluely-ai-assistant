// L20c orchestrator (PREREGISTER-l20c.md): the registered pre-flight (an ad-hoc health probe must answer 5/5
// with no abnormal close), then r1, r2, r3 sequentially, each extracted with et10/et-extract.mjs, then
// mechanics-l20c.mjs and drops.mjs. Runs nothing after a failed pre-flight; stops the chain on a non-zero exit.
// Never overwrites a run. Consoles stream to files; one status line per step goes to go.log.
//   node go.mjs              the real thing (~60 min)
//   node go.mjs --selftest   checks the pre-flight parser on known texts; no network
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/l20c`;
const LOG = `${HERE}/go.log`;

// The probe's LAST line reads "answered A/N; abnormal closes K; wrote <file>" (l20/health-probe.mjs:136); the
// per-compression lines start with "compression", so the ^ anchor skips them.
export function probeVerdict(text) {
    const m = [...text.matchAll(/^answered (\d+)\/(\d+); abnormal closes (\d+); wrote /gm)].at(-1);
    if (!m) return { ok: false, why: 'no final probe line' };
    const [a, n, ab] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return { ok: a === 5 && n === 5 && ab === 0, why: `answered ${a}/${n}, abnormal closes ${ab}` };
}

if (process.argv.includes('--selftest')) {
    const cases = [
        ['compression on: answered 5/5; abnormal closes 0\nanswered 5/5; abnormal closes 0; wrote C:/x.json\n', true],
        ['answered 4/5; abnormal closes 1; wrote C:/x.json\n', false],
        ['answered 5/5; abnormal closes 1; wrote C:/x.json\n', false],
        ['compression on: answered 5/5; abnormal closes 0\n', false],
        ['answered 5/5; abnormal closes 0; wrote a\nanswered 3/5; abnormal closes 2; wrote b\n', false],
        ['', false],
    ];
    let bad = 0;
    for (const [t, want] of cases) { const v = probeVerdict(t); if (v.ok !== want) bad++; console.log(`${v.ok === want ? 'ok ' : 'BAD'} want ${want} got ${v.ok} (${v.why})`); }
    const real = fs.readFileSync(`${SP}/l20/health/probe-schedule.log`, 'utf8').split('\n').slice(-40).join('\n');
    const rv = probeVerdict(real);
    console.log(`${rv.ok ? 'ok ' : 'BAD'} the real 20:00 scheduled log tail -> ${rv.ok} (${rv.why})`);
    if (!rv.ok) bad++;
    process.exit(bad ? 1 : 0);
}

const log = (s) => { const line = `${new Date().toISOString()} ${s}`; fs.appendFileSync(LOG, `${line}\n`); console.log(line); };
const run = (args, cwd, outFile, timeoutMs) => {
    const fd = fs.openSync(outFile, 'w');
    const r = spawnSync(process.execPath, args, { cwd, stdio: ['ignore', fd, fd], timeout: timeoutMs });
    fs.closeSync(fd);
    return r.status ?? (r.signal ? `signal ${r.signal}` : 'unknown');
};

for (const r of [1, 2, 3]) if (fs.existsSync(`${HERE}/runs/live38-r${r}.json`)) { log(`REFUSED: runs/live38-r${r}.json exists`); process.exit(3); }
fs.mkdirSync(`${HERE}/runs`, { recursive: true });

const stamp = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(0, 12); // local UTC+3
const probeOut = `${SP}/l20/health/adhoc-l20c-${stamp}.console.txt`;
log(`pre-flight: ad-hoc health probe -> ${probeOut}`);
const pst = run([`${SP}/l20/health-probe.mjs`], `${SP}/l20`, probeOut, 15 * 60e3);
const pv = probeVerdict(fs.readFileSync(probeOut, 'utf8'));
log(`pre-flight exit ${pst}: ${pv.why} -> ${pv.ok ? 'HOLDS' : 'FAILS: L20c does not run tonight'}`);
if (!pv.ok) process.exit(4);

for (const r of [1, 2, 3]) {
    log(`r${r}: start`);
    const st = run(['run.mjs', '--rep', String(r)], HERE, `${HERE}/runs/r${r}.console.txt`, 45 * 60e3);
    log(`r${r}: exit ${st}`);
    if (st !== 0) { log(`STOPPED after r${r} (non-zero exit)`); process.exit(5); }
    const et = run([`${SP}/et10/et-extract.mjs`, `${HERE}/runs/live38-r${r}.json`], HERE, `${HERE}/runs/r${r}.extract.txt`, 5 * 60e3);
    log(`r${r}: extract exit ${et}`);
}
log(`mechanics exit ${run(['mechanics-l20c.mjs'], HERE, `${HERE}/mechanics.out.txt`, 5 * 60e3)}`);
log(`drops exit ${run(['drops.mjs'], HERE, `${HERE}/drops.out.txt`, 5 * 60e3)}`);
log('DONE');
