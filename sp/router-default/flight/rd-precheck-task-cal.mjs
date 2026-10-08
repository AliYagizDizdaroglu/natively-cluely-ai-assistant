// LAB\flight\rd-precheck-task-cal.mjs - ONE calibration of rd-precheck.ps1 AS A SCHEDULED TASK, registered by register-rd.ps1 itself (the real registration path,
// Label rdcal), fired by the Task Scheduler (no console, the task's own environment), against the dummy flight and dry tasks. The other calibration
// (rd-precheck-cal.mjs) runs the script from a session; this one proves what the night will actually do: that the task starts, waits for nothing, reads the
// gates in the task's context, starts the dry twin from inside a task, and writes `PRECHECK OK <stamp>`.
//   node rd-precheck-task-cal.mjs        writes LAB\flight\rd-precheck-task-cal.txt
// The arming stub lives in LAB\flight\cal\rdcal-arming\ and the dry log in LAB\flight\cal\rdcal-dry\ (passed through register-rd.ps1's -ArmingPath / -DryLog, which only
// the calibration uses). The real record path and the real tasks are never touched. Takes about 3 minutes (the task fires at the next minute + 1).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const REG = path.join(E, 'register-rd.ps1');
const TASKS = path.join(E, 'rd-cal-tasks.ps1');
const LDIR = path.join(E, 'cal', 'rdcal-launchers');
const ARM = path.join(E, 'cal', 'rdcal-arming');
const DRY = path.join(E, 'cal', 'rdcal-dry');
const OUTFILE = path.join(E, 'rdcal-precheck.out.txt');
const OUT = path.join(E, 'rd-precheck-task-cal.txt');
const pad = (n) => String(n).padStart(2, '0');
const fmtMin = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtSec = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
const floorMin = (d) => new Date(Math.floor(d.getTime() / 60000) * 60000);
const ps = (script, args) => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { encoding: 'utf8', timeout: 300000 });
const tasks = (...a) => (ps(TASKS, a).stdout ?? '').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
let good = true;
const check = (name, ok, detail = '') => { if (!ok) good = false; log(`${ok ? 'ok  ' : 'BAD '} ${name}${detail ? `\n      ${detail}` : ''}`); };

fs.mkdirSync(LDIR, { recursive: true }); fs.mkdirSync(ARM, { recursive: true }); fs.mkdirSync(DRY, { recursive: true });
tasks('teardown');
for (const f of fs.readdirSync(DRY)) if (/\.log$/.test(f)) fs.rmSync(path.join(DRY, f));
fs.rmSync(OUTFILE, { force: true });
const dryCmd = 'echo GUARD OK: calibration stub>> "%~dp0rdcal-dry.launcher.log"\r\necho NIGHT GATES OK>> "%~dp0rdcal-dry.launcher.log"\r\nexit /b 0';
fs.writeFileSync(path.join(DRY, 'rdcal-dry-ok.cmd'), `@echo off\r\n${dryCmd}\r\n`, 'latin1');

const at = addMin(floorMin(new Date()), 2);            // the precheck TASK fires at At (the next-but-one minute)
const T = addMin(at, 6);
fs.writeFileSync(path.join(LDIR, 'launch-rdcal.cmd'), `@echo off\r\nset NATIVELY_RD_T=${fmtMin(T)}\r\nexit /b 0\r\n`, 'latin1');
fs.writeFileSync(path.join(LDIR, 'launch-rdcal-dry.cmd'), `@echo off\r\nset NATIVELY_RD_T=${fmtMin(T)}\r\nexit /b 0\r\n`, 'latin1');
const arming = path.join(ARM, 'ARMING-task-cal.md');
fs.writeFileSync(arming, `# stub arming record (calibration)\nT: ${fmtMin(T)}\nARMING COMPLETE ${fmtSec(addMin(at, -5))}+03\n`);
log('rd-precheck.ps1 as a SCHEDULED TASK (registered by register-rd.ps1 -Which precheck -Label rdcal; fired by the Task Scheduler)');
log('');
log(`now ${fmtSec(new Date())}; the precheck task is registered for At ${fmtMin(at)}; T (the dummy flight task) ${fmtMin(T)}; stub record ${path.basename(arming)}`);
const setup = tasks('setup', '-TriggerAt', fmtMin(T), '-DryMode', 'ok');
log(`dummy flight + dry tasks: ${setup}`);
const reg = ps(REG, ['-Which', 'precheck', '-Label', 'rdcal', '-LauncherDir', LDIR, '-T', fmtMin(T), '-ArmingPath', arming, '-DryLog', path.join(DRY, 'rdcal-dry.launcher.log')]);
for (const l of (reg.stdout ?? '').split(/\r?\n/).filter((x) => /^(registered|  action|  next run|REGISTRATION|NEXT RUNS)/.test(x))) log(`   ${l.slice(0, 300)}`);
check('register-rd.ps1 -Which precheck registered the task (REGISTRATION OK, exit 0)', reg.status === 0 && /REGISTRATION OK: Natively-flight-rdcal-precheck/.test(reg.stdout ?? ''));

// wait for the TASK to write its verdict (the script writes the output file only at the end)
const deadline = Date.now() + 6 * 60000;
let verdictLines = null;
while (Date.now() < deadline) {
    await sleep(5000);
    if (fs.existsSync(OUTFILE)) { const l = fs.readFileSync(OUTFILE, 'utf8').split(/\r?\n/).map((x) => x.trimEnd()).filter(Boolean); if (l.some((x) => /^PRECHECK (OK|FAILED)/.test(x))) { verdictLines = l; break; } }
}
const pst = tasks('state', '-Name', 'Natively-flight-rdcal-precheck');
const fst = tasks('state', '-Name', 'Natively-flight-rdcal');
log(`the precheck task read back: ${pst}`);
log(`the dummy flight task read back: ${fst}`);
if (verdictLines) for (const l of verdictLines) log(`   ${l.slice(0, 260)}`);
check('the task wrote an output file with a verdict within 6 min of registration', !!verdictLines);
check('the verdict is PRECHECK OK <stamp>, the LAST line of the output file, and the first line is stamped >= At (the task did not run early)', !!verdictLines && /^PRECHECK OK \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+03$/.test(verdictLines[verdictLines.length - 1]) && (/^PRECHECK start (\S+)\+03 /.exec(verdictLines[0])?.[1] ?? '') >= fmtSec(at));
check('every gate read OK inside the task (flight-task, arming-record, other-tasks, electron, port, tail, error-log, dry-twin)', !!verdictLines && ['flight-task', 'arming-record', 'other-tasks', 'electron', 'port', 'tail', 'error-log', 'dry-twin'].every((g) => verdictLines.some((l) => l.startsWith(`PRECHECK ${g}: OK`))));
check('the Task Scheduler recorded result 0x0 for the precheck task', /result=0x0 /.test(pst), pst);
check('the dummy flight task is still Ready (a clean precheck disables nothing)', / Ready /.test(` ${fst} `), fst);
tasks('teardown');
const left = tasks('leftovers');
check('clean-up: no rdcal task left, no real rd task present', /no rdcal task left; real rd tasks present: 0/.test(left), left);
fs.rmSync(arming, { force: true });
log('');
log(good ? 'PRECHECK TASK CALIBRATION OK' : 'PRECHECK TASK CALIBRATION FAILED');
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(good ? 0 : 1);
