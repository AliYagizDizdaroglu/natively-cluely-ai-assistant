// E\eq-precheck-cal.mjs - calibration driver for E\eq-precheck.ps1 (A2.10 P8 "Calibration E\eq-precheck-cal.txt", A3.7 I4a, A5.2, A6.1).
// Every case runs the REAL eq-precheck.ps1 with -Label eqcal against DUMMY tasks (Natively-flight-eqcal: action `cmd /c exit 0`, one trigger at
// At + 6 min; Natively-flight-eqcal-dry: a cmd that appends GUARD OK / NIGHT GATES OK lines to E\eqcal-dry\eqcal-dry.launcher.log) registered
// by E\eq-precheck-cal-tasks.ps1, and deleted after every case. Arming-record stubs live in E\eqcal-arming\ and are passed by -ArmingPath:
// this driver never writes E\ARMING-flight-eq.md and never names a real flight task. No Electron, no model call, MAIN untouched.
//   node eq-precheck-cal.mjs        writes E\eq-precheck-cal.txt (the cases' own E\eqcal-precheck.out.txt is overwritten per case)
// Requires: no real Natively-* task Running, nothing on port 5180, no electron.exe, no tail.exe (the clean case reads those gates for real).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const PRECHECK = path.join(E, 'eq-precheck.ps1');
const TASKS = path.join(E, 'eq-precheck-cal-tasks.ps1');
const ARM = path.join(E, 'eqcal-arming');
const DRY = path.join(E, 'eqcal-dry');
const DRYLOG = path.join(DRY, 'eqcal-dry.launcher.log');
const OUTFILE = path.join(E, 'eqcal-precheck.out.txt');
const OUT = path.join(E, 'eq-precheck-cal.txt');
const ERRLOG = path.join(process.env.TEMP ?? os.tmpdir(), 'natively-eqcal-launcher-error.log');
const TAIL_EXE = 'C:\\Program Files\\Git\\usr\\bin\\tail.exe';
const REAL_ARMING = path.join(E, 'ARMING-flight-eq.md');
const shaOf = (f) => (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : null);
const realArmingBefore = shaOf(REAL_ARMING);

const pad = (n) => String(n).padStart(2, '0');
const fmtMin = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtSec = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
const floorMin = (d) => new Date(Math.floor(d.getTime() / 60000) * 60000);
const psFile = (script, args) => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { encoding: 'utf8', timeout: 600000 });
const tasks = (...a) => psFile(TASKS, a);

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);

// ---- the dry twin's dummy cmd files and the arming stubs --------------------------------------------------------------------
fs.mkdirSync(ARM, { recursive: true });
fs.mkdirSync(DRY, { recursive: true });
const dryCmd = (name, body) => fs.writeFileSync(path.join(DRY, `eqcal-dry-${name}.cmd`), `@echo off\r\n${body}\r\n`, 'latin1');
const G = 'echo GUARD OK: calibration stub>> "%~dp0eqcal-dry.launcher.log"';
const N = 'echo NIGHT GATES OK>> "%~dp0eqcal-dry.launcher.log"';
dryCmd('ok', `${G}\r\n${N}\r\nexit /b 0`);
dryCmd('nonight', `${G}\r\nexit /b 0`);
dryCmd('exit1', `${G}\r\n${N}\r\nexit /b 1`);
dryCmd('slow', `ping -n 25 127.0.0.1 >nul\r\n${G}\r\n${N}\r\nexit /b 0`);
dryCmd('silent', 'exit /b 0');
for (const f of fs.readdirSync(DRY)) if (/\.log$/.test(f)) fs.rmSync(path.join(DRY, f));
for (const f of fs.readdirSync(ARM)) fs.rmSync(path.join(ARM, f));

// the clean record for a given At: ONE T: line = At + 6, `Superseded:` lines allowed, the LAST line ARMING COMPLETE stamped At - 5 min
function record(at, o = {}) {
    const T = o.T ?? fmtMin(addMin(at, 6));
    const stamp = fmtSec(addMin(at, o.stampMin ?? -5));
    const lines = ['# stub arming record (calibration; never the real record path)', `T: ${T}`, o.superseded ? `Superseded: ${o.superseded}` : 'Superseded: none'];
    if (o.secondT) lines.push(`T: ${fmtMin(addMin(at, 21))}`);
    lines.push(o.complete === false ? 'ledger: stub' : `ARMING COMPLETE ${stamp}+03`);
    return `${lines.join('\n')}\n${o.trailing ?? ''}`;
}

// ---- one case ----------------------------------------------------------------------------------------------------------------
async function runCase(c) {
    tasks('teardown');
    for (const f of fs.readdirSync(DRY)) if (/\.log$/.test(f)) fs.rmSync(path.join(DRY, f));
    fs.rmSync(OUTFILE, { force: true });
    fs.rmSync(ERRLOG, { force: true });
    const at = addMin(floorMin(new Date()), c.atOffsetMin ?? -1);       // At: past (no wait) unless the case asks for a wait
    const trigger = addMin(at, c.triggerOffsetMin ?? 6);
    let setupText = '(no flight dummy)';
    if (!c.noFlightTask) {
        const s = tasks('setup', '-TriggerAt', fmtMin(trigger), '-DryMode', c.dryMode ?? 'ok');
        setupText = (s.stdout ?? '').trim() + ((s.stderr ?? '').trim() ? ` !! ${s.stderr.trim().slice(0, 300)}` : '');
        if (s.status !== 0) return { c, fatal: `setup failed: ${setupText}` };
    }
    let armingPath = path.join(ARM, `ARMING-${c.id}.md`);
    const text = c.arming === null ? null : (c.arming ? c.arming(at) : record(at));
    if (text !== null) fs.writeFileSync(armingPath, text);
    else armingPath = path.join(ARM, `ARMING-${c.id}-absent.md`);       // never created
    if (c.beforeRun) await c.beforeRun();
    const args = ['-At', c.atText ?? fmtMin(at), '-Label', 'eqcal', '-ArmingPath', armingPath, '-DryLog', DRYLOG, ...(c.extra ?? [])];
    const started = Date.now();
    const r = psFile(PRECHECK, args);
    const elapsed = Math.round((Date.now() - started) / 1000);
    const stdout = (r.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const outText = fs.existsSync(OUTFILE) ? fs.readFileSync(OUTFILE, 'utf8').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean) : null;
    const st = (tasks('state', '-Name', 'Natively-flight-eqcal').stdout ?? '').trim();
    if (c.afterRun) await c.afterRun();
    tasks('teardown');
    return { c, r, stdout, outText, st, at, elapsed, setupText };
}

function judge(x) {
    const { c, r, stdout, outText, st, at } = x;
    const why = [];
    if (r.status !== c.exit) why.push(`exit ${r.status}, wanted ${c.exit}`);
    const verdict = stdout.filter((l) => /^PRECHECK (OK|FAILED)/.test(l)).pop() ?? '';
    if (c.verdict && !c.verdict.test(verdict)) why.push(`verdict "${verdict}" does not match ${c.verdict}`);
    for (const re of c.lines ?? []) if (!stdout.some((l) => re.test(l))) why.push(`no line matches ${re}`);
    if (c.exit === 2) {
        if (outText) why.push('an output file was written on a usage error');
    } else {
        if (!outText) why.push('no output file written');
        else if (!outText.includes(verdict)) why.push('the output file lacks the verdict line');
        else if (c.exit === 0 && outText[outText.length - 1] !== verdict) why.push('the output file does not END with the PRECHECK OK line');
    }
    if (c.exit === 0) {
        if (!/^PRECHECK OK \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+03$/.test(outText?.[outText.length - 1] ?? '')) why.push('the output file does not end with PRECHECK OK <yyyy-MM-ddTHH:mm:ss+03>');
        if (!/ Ready /.test(` ${st} `)) why.push(`the dummy flight task is not Ready after a clean precheck (${st})`);
    }
    if (c.exit === 1 && c.disabled && !/ Disabled /.test(` ${st} `)) why.push(`the dummy flight task is not Disabled when read back (${st})`);
    if (c.firstStampAtLeastAt) {
        const m = /^PRECHECK start (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)\+03 /.exec(stdout[0] ?? '');
        if (!m) why.push(`first line is not a "PRECHECK start <stamp>" line: ${(stdout[0] ?? '').slice(0, 60)}`);
        else if (m[1] < fmtSec(at)) why.push(`the first line's stamp ${m[1]} is before At ${fmtSec(at)}`);
    }
    return why;
}

async function holdPort5180() {
    const srv = net.createServer();
    await new Promise((res, rej) => { srv.once('error', rej); srv.listen(5180, '127.0.0.1', res); });
    return () => new Promise((res) => srv.close(res));
}

// the cases ------------------------------------------------------------------------------------------------------------------
const OK = { exit: 0, verdict: /^PRECHECK OK / };
const failed = (n, names) => new RegExp(`^PRECHECK FAILED \\(${n}\\): ${names}$`);
const FAILS = { exit: 1, disabled: true };
let closePort = null;
let tailProc = null;
let fakeElectron = null;
const CASES = [
    { id: 'P1', name: 'CLEAN: At = now + 2 min (the script WAITS until At), the dummy flight task registered for At + 6, a clean arming stub (T = At + 6, one T: line, ARMING COMPLETE stamped At - 5 min), the dry dummy writes GUARD OK and NIGHT GATES OK -> PRECHECK OK, exit 0, the first line stamped >= At, the dummy still Ready',
        atOffsetMin: 2, ...OK, firstStampAtLeastAt: true, lines: [/^PRECHECK flight-task: OK /, /^PRECHECK arming-record: OK /, /^PRECHECK other-tasks: OK /, /^PRECHECK electron: OK /, /^PRECHECK port: OK /, /^PRECHECK tail: OK /, /^PRECHECK error-log: OK /, /^PRECHECK dry-twin: OK result=0x0 /, /^PRECHECK audio-state INFO: /] },
    { id: 'P2', name: 'clean again, At already past (no wait): the same OK (a second clean run proves the teardown left nothing sticky)', ...OK },
    { id: 'P3', name: '-FakeFail port -> PRECHECK FAILED (1): port, exit 1, the dummy flight task DISABLED and read back Disabled', extra: ['-FakeFail', 'port'], ...FAILS, verdict: failed(1, 'port'), lines: [/^PRECHECK port: FAIL forced by -FakeFail/, /^PRECHECK flight task Natively-flight-eqcal disabled, state now: Disabled$/] },
    { id: 'P4', name: "-At '00:09' (a bare HH:mm) -> usage, exit 2, nothing written", atText: '00:09', exit: 2, lines: [/^PRECHECK usage error: -At must be a full date-time/] },
    { id: 'P5', name: '-At an impossible date -> usage, exit 2', atText: '2026-02-30 21:00', exit: 2, lines: [/^PRECHECK usage error/] },
    { id: 'P6', name: '-FakeFail with a name that is no gate -> usage, exit 2', extra: ['-FakeFail', 'bogus'], exit: 2, lines: [/^PRECHECK usage error: -FakeFail must be one of/] },
    // the arming record (A5.2 + A6.1): each failing case is the clean stub with ONE change
    { id: 'A1', name: 'arming record ABSENT -> PRECHECK FAILED (1): arming-record, flight task disabled', arming: null, ...FAILS, verdict: failed(1, 'arming-record'), lines: [/^PRECHECK arming-record: FAIL record ABSENT$/] },
    { id: 'A2', name: 'the stub names At + 21 (another T) -> FAILED (1): arming-record', arming: (at) => record(at, { T: fmtMin(addMin(at, 21)) }), ...FAILS, verdict: failed(1, 'arming-record'), lines: [/^PRECHECK arming-record: FAIL record T .* is not At \+ 6 min/] },
    { id: 'A3', name: 'the stub has no ARMING COMPLETE line -> FAILED (1): arming-record', arming: (at) => record(at, { complete: false }), ...FAILS, verdict: failed(1, 'arming-record'), lines: [/^PRECHECK arming-record: FAIL the record does not END with an ARMING COMPLETE line/] },
    { id: 'A4', name: 'the stub is stamped At - 3 min (finished later than T - 10) -> FAILED (1): arming-record', arming: (at) => record(at, { stampMin: -3 }), ...FAILS, verdict: failed(1, 'arming-record'), lines: [/^PRECHECK arming-record: FAIL ARMING COMPLETE stamp .* is later than At - 4 min/] },
    { id: 'A5', name: 'the stub is stamped exactly At - 4 min (= T - 10) -> OK (the bound is inclusive)', arming: (at) => record(at, { stampMin: -4 }), ...OK, lines: [/^PRECHECK arming-record: OK /] },
    { id: 'A6', name: 'the stub has TWO T: lines -> FAILED (1): arming-record', arming: (at) => record(at, { secondT: true }), ...FAILS, verdict: failed(1, 'arming-record'), lines: [/^PRECHECK arming-record: FAIL the record has 2 'T:' lines/] },
    { id: 'A7', name: 'the stub names At + 6 but the flight task\'s NextRunTime is At + 7 (a trigger that drifted) -> FAILED (2): flight-task, arming-record', triggerOffsetMin: 7, ...FAILS, verdict: failed(2, 'flight-task, arming-record') },
    { id: 'A8', name: 'the stub carries a Superseded: line (a superseded T) and ONE T: line -> OK', arming: (at) => record(at, { superseded: 'T 2026-10-05 20:00 (overrun)' }), ...OK },
    { id: 'A9', name: 'the stub ends with ARMING COMPLETE and blank lines follow -> OK (the last NON-EMPTY line counts)', arming: (at) => record(at, { trailing: '\n\n' }), ...OK },
    // the other gates, each broken for real (not only -FakeFail)
    { id: 'T1', name: 'the flight task NOT REGISTERED -> FAILED (3): flight-task, arming-record, dry-twin (the teardown removed the dry dummy too); nothing to disable, said so; the script does not crash', noFlightTask: true, exit: 1, verdict: failed(3, 'flight-task, arming-record, dry-twin'), lines: [/^PRECHECK flight-task: FAIL NOT REGISTERED/, /^PRECHECK flight task Natively-flight-eqcal is NOT REGISTERED, nothing to disable$/] },
    { id: 'T2', name: 'another Natively-* task RUNNING (a dummy busy task) -> FAILED (1): other-tasks, naming it; the dummy flight task disabled', beforeRun: async () => { tasks('busy-start'); }, afterRun: async () => { tasks('busy-stop'); }, ...FAILS, verdict: failed(1, 'other-tasks'), lines: [/^PRECHECK other-tasks: FAIL .*\[Natively-eqcal-busy\]/] },
    { id: 'T3', name: 'port 5180 REALLY held (a node listener) -> FAILED (1): port', beforeRun: async () => { closePort = await holdPort5180(); }, afterRun: async () => { await closePort(); closePort = null; }, ...FAILS, verdict: failed(1, 'port'), lines: [/^PRECHECK port: FAIL port 5180 held: True$/] },
    { id: 'T4', name: 'the error log present (%TEMP%\\natively-eqcal-launcher-error.log) -> FAILED (1): error-log', beforeRun: async () => { fs.writeFileSync(ERRLOG, 'cal\n'); }, afterRun: async () => { fs.rmSync(ERRLOG, { force: true }); }, ...FAILS, verdict: failed(1, 'error-log'), lines: [/^PRECHECK error-log: FAIL natively-eqcal-launcher-error\.log present: True$/] },
    { id: 'T5', name: 'a tail.exe watcher running -> FAILED (1): tail', beforeRun: async () => { if (!fs.existsSync(TAIL_EXE)) throw new Error('tail.exe not found'); const f = path.join(DRY, 'tailme.txt'); fs.writeFileSync(f, 'x\n'); tailProc = spawn(TAIL_EXE, ['-f', f], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500)); }, afterRun: async () => { try { tailProc.kill(); } catch { /* already gone */ } await new Promise((r) => setTimeout(r, 800)); }, ...FAILS, verdict: failed(1, 'tail'), lines: [/^PRECHECK tail: FAIL tail\.exe watchers: [1-9]/] },
    { id: 'T6', name: 'an electron.exe process running (a COPY of node.exe named electron.exe, sleeping 40 s: a process of the right NAME, never the app) -> FAILED (1): electron', beforeRun: async () => { const exe = path.join(DRY, 'electron.exe'); fs.copyFileSync(process.execPath, exe); fakeElectron = spawn(exe, ['-e', 'setTimeout(() => {}, 40000)'], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500)); }, afterRun: async () => { try { fakeElectron.kill(); } catch { /* already gone */ } await new Promise((r) => setTimeout(r, 800)); fs.rmSync(path.join(DRY, 'electron.exe'), { force: true }); }, ...FAILS, verdict: failed(1, 'electron'), lines: [/^PRECHECK electron: FAIL electron\.exe processes: [1-9]/] },
    { id: 'D1', name: 'the dry twin writes GUARD OK but NOT NIGHT GATES OK -> FAILED (1): dry-twin', dryMode: 'nonight', ...FAILS, verdict: failed(1, 'dry-twin'), lines: [/^PRECHECK dry-twin: FAIL result=0x0 .*GUARD OK line: True; NIGHT GATES OK line: False$/] },
    { id: 'D2', name: 'the dry twin writes both lines but EXITS 1 -> FAILED (1): dry-twin (result 0x1)', dryMode: 'exit1', ...FAILS, verdict: failed(1, 'dry-twin'), lines: [/^PRECHECK dry-twin: FAIL result=0x1 /] },
    { id: 'D3', name: 'the dry twin runs 25 s with -DryTimeoutSec 8 -> FAILED (2): dry-twin, dry-timeout (still running at the limit)', dryMode: 'slow', extra: ['-DryTimeoutSec', '8'], ...FAILS, verdict: failed(2, 'dry-twin, dry-timeout'), lines: [/^PRECHECK dry-twin: FAIL dry-timeout: still running after 8 s$/] },
    { id: 'D4', name: 'the dry twin task NOT REGISTERED -> FAILED (1): dry-twin', dryMode: 'none', ...FAILS, verdict: failed(1, 'dry-twin'), lines: [/^PRECHECK dry-twin: FAIL the dry task Natively-flight-eqcal-dry is NOT REGISTERED$/] },
    { id: 'D5', name: 'the dry twin\'s OLD log lines do not count: the log already holds GUARD OK and NIGHT GATES OK from an earlier run and the dry run writes nothing new -> FAILED (1): dry-twin', dryMode: 'silent', beforeRun: async () => { fs.writeFileSync(DRYLOG, 'GUARD OK: an old run\r\nNIGHT GATES OK\r\n'); }, ...FAILS, verdict: failed(1, 'dry-twin'), lines: [/^PRECHECK dry-twin: FAIL result=0x0 .*GUARD OK line: False; NIGHT GATES OK line: False$/] },
    { id: 'M1', name: 'two gates broken at once (port REALLY held, -FakeFail error-log) -> FAILED (2): port, error-log: every failing gate is named, in gate order, not only the first', beforeRun: async () => { closePort = await holdPort5180(); }, afterRun: async () => { await closePort(); closePort = null; }, extra: ['-FakeFail', 'error-log'], ...FAILS, verdict: failed(2, 'port, error-log') },
];

log('eq-precheck.ps1 calibration (A2.10 P8; A3.7 I4a; A5.2; A6.1)');
log('');
const bytes = fs.readFileSync(PRECHECK);
const bomOk = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
const parse = (tasks('parse', '-Name', PRECHECK).stdout ?? '').trim();
log(`script under test: ${PRECHECK} sha256/12 ${shaOf(PRECHECK).slice(0, 12)}; helper ${TASKS} sha256/12 ${shaOf(TASKS).slice(0, 12)}`);
log(`BOM ${bomOk ? 'present (EF BB BF)' : 'ABSENT'}; ${parse}`);
log(`machine: now ${fmtSec(new Date())} local, UTC offset ${-new Date().getTimezoneOffset() / 60} h`);
log('each case: teardown -> register the dummy tasks (trigger At + 6) -> write the arming stub into E\\eqcal-arming\\ -> run the script with -Label eqcal -ArmingPath <stub> -DryLog <E\\eqcal-dry\\...> -> read the dummy back -> teardown');
log('');
results.push({ id: 'bom', good: bomOk });
results.push({ id: 'parse', good: /ParseFile errors: 0/.test(parse) });

for (const c of CASES) {
    const x = await runCase(c);
    if (x.fatal) { results.push({ id: c.id, good: false }); log(`BAD  ${c.id.padEnd(3)} ${c.name}`); log(`      ${x.fatal}`); continue; }
    const why = judge(x);
    results.push({ id: c.id, good: why.length === 0 });
    log(`${why.length === 0 ? 'ok  ' : 'BAD '} ${c.id.padEnd(3)} ${c.name}`);
    log(`      exit ${x.r.status} after ${x.elapsed} s :: ${clip(x.stdout.filter((l) => /^PRECHECK (OK|FAILED|usage)/.test(l)).pop() ?? x.stdout.slice(-1)[0] ?? '(no output)', 200)}`);
    for (const l of x.stdout.filter((l) => /^PRECHECK [a-z-]+: (OK|FAIL)/.test(l) || /disabled, state now|NOT REGISTERED, nothing/.test(l))) log(`        ${clip(l, 230)}`);
    log(`      dummy flight task read back: ${x.st}`);
    if (why.length) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
}

tasks('teardown');
const leftovers = (tasks('leftovers').stdout ?? '').trim();
const realArmingAfter = shaOf(REAL_ARMING);
log('');
log(`CLEAN-UP: ${leftovers}; E\\ARMING-flight-eq.md ${realArmingBefore === realArmingAfter ? 'untouched' : 'CHANGED'} (${realArmingBefore ? 'existed' : 'absent'} before and after); %TEMP% eqcal error log ${fs.existsSync(ERRLOG) ? 'PRESENT' : 'absent'}`);
results.push({ id: 'cleanup', good: /no eqcal task left/.test(leftovers) && realArmingBefore === realArmingAfter && !fs.existsSync(ERRLOG) });
const bads = results.filter((x) => !x.good);
log(bads.length === 0 ? `PRECHECK CALIBRATION OK ${results.length}/${results.length}` : `PRECHECK CALIBRATION FAILED: ${bads.map((b) => b.id).join(', ')} (${results.length - bads.length}/${results.length} ok)`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length === 0 ? 0 : 1);
