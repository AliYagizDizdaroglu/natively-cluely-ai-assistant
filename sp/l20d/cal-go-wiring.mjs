// Rule-8 calibration of go.mjs's REAL path (the part --selftest cannot reach: the spawns, the lock, the hashes, the exit
// codes, the logs, the timeout kill), on a sandbox tree with STUBS for everything that would touch the network or the
// microphone-fed Live service. cal-go/ holds: l20d/ (a copy of go.mjs with exactly these edits: SP and MAIN point into
// cal-go/, the three registered hashes are the stubs', the guard date is 2099, the rep timeout is 1.5 s), a copy of the real
// instruction.txt, stub run.mjs / mechanics-l20d.mjs / check-extract.mjs, l20/health-probe.mjs, et10/et-extract.mjs and a
// stub MAIN. The stubs are driven by cal-go/l20d/stub.json and log every call to calls.log with its arguments and times.
// Nothing here calls a model, plays audio, reads .env or touches the real l20d/runs.
//   node cal-go-wiring.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const T = `${SP}/l20d/cal-go`, H = `${T}/l20d`;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
let ok = true;
const check = (name, cond, extra = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : `  ${String(extra).slice(0, 500)}`}`); };

// ---- the sandbox -----------------------------------------------------------------------------------------------------
fs.rmSync(T, { recursive: true, force: true });
for (const d of [H, `${T}/l20/health`, `${T}/et10`, `${T}/main/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k`, `${T}/main/dist-electron/electron/llm`]) fs.mkdirSync(d, { recursive: true });
const PROMPTS = `${T}/main/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, FILTER = `${T}/main/dist-electron/electron/llm/verbalStreamFilter.js`;
fs.writeFileSync(PROMPTS, '{"stub":true}');
fs.writeFileSync(FILTER, '// stub filter\n');
fs.copyFileSync(`${SP}/l20d/instruction.txt`, `${H}/instruction.txt`);
const goSrc = fs.readFileSync(`${SP}/l20d/go.mjs`, 'utf8');
let g = goSrc;
const swap = (re, to) => { const n = (g.match(new RegExp(re.source, 'g')) ?? []).length; if (n !== 1) throw new Error(`cal setup: ${re} matches ${n} times in go.mjs`); g = g.replace(re, () => to); };
swap(/const SP = '[^']+';/, `const SP = '${T}';`);
swap(/const MAIN = '[^']+';/, `const MAIN = '${T}/main';`);
swap(/const PROMPTS_SHA256 = '[0-9a-f]+';/, `const PROMPTS_SHA256 = '${sha(fs.readFileSync(PROMPTS))}';`);
swap(/export const FILTER_SHA_PREFIX = '[0-9a-f]+';/, `export const FILTER_SHA_PREFIX = '${sha(fs.readFileSync(FILTER)).slice(0, 16)}';`);
swap(/new Date\(2026, 9, 3, h, mi\)/, 'new Date(2099, 9, 3, h, mi)');
swap(/80 \* 60e3/, '1500');
fs.writeFileSync(`${H}/go.mjs`, g);
const STUB_HEAD = "import fs from 'node:fs'; const H = " + JSON.stringify(H) + "; const cfg = () => JSON.parse(fs.readFileSync(`${H}/stub.json`, 'utf8')); const log = (s) => fs.appendFileSync(`${H}/calls.log`, `${Date.now()} ${s}\\n`);\n";
fs.writeFileSync(`${H}/run.mjs`, `${STUB_HEAD}
const rep = process.argv[process.argv.indexOf('--rep') + 1]; const c = cfg();
log('run ' + process.argv.slice(2).join(' ') + ' cwd=' + process.cwd().replace(/\\\\/g, '/') + ' START');
if (c.runNoFile?.[rep]) { log('run ' + rep + ' END'); process.exit(c.runExit?.[rep] ?? 0); }
fs.mkdirSync(H + '/runs', { recursive: true }); fs.writeFileSync(H + '/runs/l20d-r' + rep + '.json', JSON.stringify({ rep: Number(rep) }));
if (c.hang?.[rep]) await new Promise((r) => setTimeout(r, 15000));
await new Promise((r) => setTimeout(r, 300));
log('run ' + rep + ' END'); process.exit(c.runExit?.[rep] ?? 0);
`);
fs.writeFileSync(`${T}/et10/et-extract.mjs`, `${STUB_HEAD}
const f = process.argv[2]; const c = cfg(); log('extract ' + f.replace(/\\\\/g, '/').split('/').pop());
if (c.extractFail) process.exit(1); fs.writeFileSync(f.replace(/\\.json$/, '.answers.json'), '{}'); process.exit(0);
`);
fs.writeFileSync(`${H}/mechanics-l20d.mjs`, `${STUB_HEAD}
const c = cfg(); const reps = [1, 2, 3].filter((r) => fs.existsSync(H + '/runs/l20d-r' + r + '.answers.json')); log('mechanics reps=' + reps.length);
if (c.noArm) { console.log('nothing useful'); process.exit(0); }
const answered = reps.reduce((n, _, i) => n + c.answered[i], 0);
console.log('ARM l20d: reps ' + reps.length + ', answered ' + answered + '/' + 38 * reps.length + ', holes ' + (38 * reps.length - answered) + ', last run answered ' + (reps.length ? c.answered[reps.length - 1] : 0) + ' -> ' + (reps.length >= 3 ? 'DONE' : 'CONTINUE'));
`);
fs.writeFileSync(`${H}/check-extract.mjs`, `${STUB_HEAD}
const c = cfg(); log('check-extract'); process.exit(c.recheckFail ? 1 : 0);
`);
fs.writeFileSync(`${T}/l20/health-probe.mjs`, `${STUB_HEAD}
const c = cfg(); log('probe cwd=' + process.cwd().replace(/\\\\/g, '/'));
console.log('answered ' + (c.probeAnswered ?? 5) + '/5; abnormal closes ' + (c.probeAbnormal ?? 0) + '; wrote health/stub.json');
`);

// ---- running go.mjs ----------------------------------------------------------------------------------------------------
const fresh = (cfg = {}) => {
    for (const f of fs.readdirSync(H)) if (['runs', 'calls.log', 'go.log', 'go.lock'].includes(f)) fs.rmSync(`${H}/${f}`, { recursive: true, force: true });
    fs.rmSync(`${T}/l20/health`, { recursive: true, force: true }); fs.mkdirSync(`${T}/l20/health`, { recursive: true });
    fs.writeFileSync(`${H}/stub.json`, JSON.stringify({ answered: [38, 38, 38], ...cfg }));
    fs.writeFileSync(FILTER, '// stub filter\n');
    fs.copyFileSync(`${SP}/l20d/instruction.txt`, `${H}/instruction.txt`);
};
const go = () => { const r = spawnSync(process.execPath, [`${H}/go.mjs`], { encoding: 'utf8', cwd: T, timeout: 120000 }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };
const calls = () => (fs.existsSync(`${H}/calls.log`) ? fs.readFileSync(`${H}/calls.log`, 'utf8').trim().split('\n').map((l) => { const [t, ...rest] = l.split(' '); return { t: Number(t), s: rest.join(' ') }; }) : []);
const seq = () => calls().map((c) => c.s.replace(/ cwd=.*$/, '').replace(/ START$| END$/, (m) => m.trim() === 'END' ? '' : '').trim()).filter((s) => !/ END$/.test(s));
const names = () => calls().map((c) => c.s.split(' ')[0] + (c.s.startsWith('run') && !c.s.includes('END') ? ` ${c.s.split(' ')[2]}` : '')).filter((_, i, a) => true);
const logOf = () => (fs.existsSync(`${H}/go.log`) ? fs.readFileSync(`${H}/go.log`, 'utf8') : '');
const kinds = () => calls().filter((c) => !/ END$/.test(c.s)).map((c) => (c.s.startsWith('run') ? `run${c.s.split(' ')[2]}` : c.s.startsWith('extract') ? `extract${c.s.match(/r(\d)/)[1]}` : c.s.split(' ')[0]));

// 1. a healthy night
fresh();
let r = go();
check('healthy: exit 0, DONE in go.log', r.code === 0 && /DONE/.test(logOf()), r.out);
check('healthy: the calls came in this order: probe once, then run1 extract1 mechanics, run2 extract2 mechanics, run3 extract3 mechanics', JSON.stringify(kinds()) === JSON.stringify(['probe', 'run1', 'extract1', 'mechanics', 'run2', 'extract2', 'mechanics', 'run3', 'extract3', 'mechanics']), kinds().join(' '));
{
    const c = calls(), s = (k) => c.find((x) => x.s.startsWith(`run --rep ${k}`) && x.s.endsWith('START')), e = (k) => c.find((x) => x.s === `run ${k} END`);
    check('healthy: the reps never overlap (rep k ends before rep k+1 starts) and each was started as `run.mjs --rep k` with the l20d folder as its working directory', e(1).t <= s(2).t && e(2).t <= s(3).t && /cwd=.*\/cal-go\/l20d START$/.test(s(1).s), c.map((x) => x.s).join(' | '));
    check('healthy: the health probe ran with the l20 folder as its working directory, before r1 started', /probe cwd=.*\/cal-go\/l20$/.test(c.find((x) => x.s.startsWith('probe')).s) && c.findIndex((x) => x.s.startsWith('probe')) < c.findIndex((x) => x.s.startsWith('run --rep 1')));
}
check('healthy: run files, answers files, three filter.json sidecars with the stub filter\'s sha256, console files; the lock is gone', [1, 2, 3].every((n) => fs.existsSync(`${H}/runs/l20d-r${n}.json`) && fs.existsSync(`${H}/runs/l20d-r${n}.answers.json`) && JSON.parse(fs.readFileSync(`${H}/runs/l20d-r${n}.filter.json`, 'utf8')).sha256 === sha(fs.readFileSync(FILTER)) && fs.existsSync(`${H}/runs/r${n}.console.txt`) && fs.existsSync(`${H}/runs/r${n}.extract.txt`)) && !fs.existsSync(`${H}/go.lock`) && fs.existsSync(`${H}/mechanics.out.txt`));
check('healthy: the pre-flight console went to l20/health/adhoc-l20d-<stamp>.console.txt', fs.readdirSync(`${T}/l20/health`).some((f) => /^adhoc-l20d-\d{12}\.console\.txt$/.test(f)));

// 2. the lock
fresh();
fs.writeFileSync(`${H}/go.lock`, '');
r = go();
check('a second go.mjs while a lock exists: exit 8, nothing called, the other\'s lock NOT removed', r.code === 8 && kinds().length === 0 && fs.existsSync(`${H}/go.lock`) && /REFUSED: .*go\.lock exists/.test(logOf()), r.out);

// 3. the registered inputs
fresh();
fs.writeFileSync(`${H}/instruction.txt`, `${fs.readFileSync(`${SP}/l20d/instruction.txt`, 'utf8')} `);
r = go();
check('instruction.txt one byte off -> exit 2, nothing called, no lock left', r.code === 2 && kinds().length === 0 && /instruction\.txt does not match/.test(logOf()) && !fs.existsSync(`${H}/go.lock`), r.out);
fresh();
fs.writeFileSync(PROMPTS, '{"stub":false}');
r = go();
check('the prompts file changed -> exit 2, nothing called', r.code === 2 && kinds().length === 0 && /prompts file does not match/.test(logOf()), r.out);
fs.writeFileSync(PROMPTS, '{"stub":true}');

// 4. pre-flight
fresh({ probeAnswered: 4 });
r = go();
check('the probe answers 4/5 -> exit 4, only the probe ran', r.code === 4 && JSON.stringify(kinds()) === '["probe"]', kinds().join(' '));
fresh({ probeAbnormal: 1 });
r = go();
check('the probe sees an abnormal close -> exit 4, no rep', r.code === 4 && JSON.stringify(kinds()) === '["probe"]');

// 5. broken window and a cut-short rep
fresh({ answered: [38, 10, 38] });
r = go();
check('r2 answers 10 of 38 -> exit 7 (broken window), r3 never run', r.code === 7 && !kinds().includes('run3') && /STOPPED: r2 answered 10 of 38/.test(logOf()), kinds().join(' '));
fresh({ runExit: { 1: 3 }, answered: [30, 38, 38] });
r = go();
check('r1 exits 3 but wrote its run file: counts as played (CUT SHORT), extracted and read, the chain goes on to DONE', r.code === 0 && /r1: CUT SHORT \(exit 3\)/.test(logOf()) && kinds().includes('extract1') && kinds().includes('run3'), logOf());
fresh({ runNoFile: { 1: true }, runExit: { 1: 2 } });
r = go();
check('run.mjs exits 2 and wrote no run file (the instruction-hash refusal path) -> exit 5, no extraction', r.code === 5 && !kinds().includes('extract1') && /no run file was written/.test(logOf()), logOf());
fresh({ hang: { 1: true }, answered: [20, 38, 38] });
r = go();
check('a rep that hangs is killed at its timeout (1.5 s here): "exit signal SIGTERM", counted as played (CUT SHORT), extracted, the chain goes on', r.code === 0 && /r1: exit signal SIGTERM/.test(logOf()) && /r1: CUT SHORT \(exit signal SIGTERM\)/.test(logOf()) && kinds().includes('extract1') && kinds().includes('run2'), logOf());

// 6. resume and refusal to overwrite
fresh();
fs.mkdirSync(`${H}/runs`, { recursive: true });
fs.writeFileSync(`${H}/runs/l20d-r1.json`, '{}'); fs.writeFileSync(`${H}/runs/l20d-r1.answers.json`, '{}');
r = go();
check('r1 already done -> skipped; the probe still runs; r2 and r3 run', r.code === 0 && JSON.stringify(kinds()) === JSON.stringify(['probe', 'run2', 'extract2', 'mechanics', 'run3', 'extract3', 'mechanics']) && /r1: already done, skipped/.test(logOf()), kinds().join(' '));
fresh();
fs.mkdirSync(`${H}/runs`, { recursive: true });
fs.writeFileSync(`${H}/runs/l20d-r1.json`, '{}');
r = go();
check('a run file without its answers file -> REFUSED, exit 3, nothing called (never overwritten)', r.code === 3 && kinds().length === 0 && fs.readFileSync(`${H}/runs/l20d-r1.json`, 'utf8') === '{}', r.out);

// 7. steps that fail
fresh({ extractFail: true });
r = go();
check('the extraction exits non-zero -> exit 5, no mechanics', r.code === 5 && !kinds().includes('mechanics') && /extraction of r1 failed/.test(logOf()), logOf());
fresh({ noArm: true });
r = go();
check('the mechanics print no ARM line -> exit 5', r.code === 5 && /no ARM line/.test(logOf()), logOf());

// 8. the filter gate
fresh();
fs.writeFileSync(FILTER, '// stub filter, changed\n');
r = go();
check('the filter file changed and check-extract passes -> the chain runs (check-extract was called), the sidecars carry the NEW sha256', r.code === 0 && kinds().includes('check-extract') && JSON.parse(fs.readFileSync(`${H}/runs/l20d-r1.filter.json`, 'utf8')).sha256 === sha(fs.readFileSync(FILTER)) && /FILTER: .*is not/.test(logOf()), logOf());
fresh({ recheckFail: true });
fs.writeFileSync(FILTER, '// stub filter, changed\n');
r = go();
check('the filter file changed and check-extract fails -> exit 2, no probe, no rep', r.code === 2 && !kinds().includes('probe') && !kinds().includes('run1'), kinds().join(' ') + ' ' + logOf());
fresh();
r = go();
check('the registered filter hash -> check-extract is never called', r.code === 0 && !kinds().includes('check-extract'), kinds().join(' '));

// 9. the real go.mjs file itself was not touched and the real run folder has no go.lock / go.log from here
check('the real l20d folder has no go.lock, no runs/ folder and no go.log (go.mjs was never run there)', !fs.existsSync(`${SP}/l20d/go.lock`) && !fs.existsSync(`${SP}/l20d/runs`) && !fs.existsSync(`${SP}/l20d/go.log`));
console.log(ok ? 'GO.MJS WIRING CALIBRATION OK' : 'GO.MJS WIRING CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
