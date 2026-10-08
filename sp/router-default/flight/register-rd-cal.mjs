// LAB\flight\register-rd-cal.mjs - calibration driver for register-rd.ps1 (plan Task 18 step 4; SP\flight-eq\register-eq-cal.mjs's pattern: read-back asserted, the supersede path).
// The REAL script runs with -Label rdcal -LauncherDir LAB\flight\cal\rdcal-launchers against DUMMY tasks Natively-flight-rdcal, -dry and -precheck (cal launchers
// that only `exit /b 0`; triggers an hour out, so nothing ever fires), all removed at the end. The real tasks Natively-flight-rd, -dry and -precheck
// are NEVER registered by this driver: the Label rd cases are refusals (they stop before any Task Scheduler write) and -Plan runs (no write at
// all), and the last line of this file's output proves the three real names are absent.
//   node register-rd-cal.mjs        writes LAB\flight\register-rd-cal.txt
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const REG = path.join(E, 'register-rd.ps1');
const TASKS = path.join(E, 'rd-cal-tasks.ps1');
const LDIR = path.join(E, 'cal', 'rdcal-launchers');
const ARM = path.join(E, 'cal', 'rdcal-arming');
const OUT = path.join(E, 'register-rd-cal.txt');
const pad = (n) => String(n).padStart(2, '0');
const fmtMin = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
const floorMin = (d) => new Date(Math.floor(d.getTime() / 60000) * 60000);
const ps = (script, args) => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { encoding: 'utf8', timeout: 300000 });
const tasks = (...a) => (ps(TASKS, a).stdout ?? '').trim();
const reg = (...a) => { const r = ps(REG, ['-Label', 'rdcal', '-LauncherDir', LDIR, ...a]); return { status: r.status, lines: (r.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean), err: (r.stderr ?? '').trim().slice(0, 300) }; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);
function check(id, name, r, { exit, lines = [], noLines = [] }, extra = []) {
    const why = [];
    if (r.status !== exit) why.push(`exit ${r.status}, wanted ${exit}${r.err ? ` (stderr: ${r.err})` : ''}`);
    for (const re of lines) if (!r.lines.some((l) => re.test(l))) why.push(`no line matches ${re}`);
    for (const re of noLines) if (r.lines.some((l) => re.test(l))) why.push(`unexpected line matches ${re}`);
    why.push(...extra);
    results.push({ id, good: why.length === 0 });
    log(`${why.length === 0 ? 'ok  ' : 'BAD '} ${id.padEnd(4)} ${name}`);
    for (const l of r.lines.filter((x) => /^(registered|REGISTRATION|REFUSED|NEXT RUNS|  next run|  settings|SUPERSEDE|PLAN)/.test(x) || /^  (next run|settings|action)/.test(x))) log(`        ${clip(l, 250)}`);
    if (why.length) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
}

fs.mkdirSync(LDIR, { recursive: true });
fs.mkdirSync(ARM, { recursive: true });
const now = floorMin(new Date());
const REAL_COUNT0 = (tasks('leftovers').match(/real rd tasks present: (\d+)/) ?? [])[1];   // the real rd tasks present before this driver touches anything
const T1 = fmtMin(addMin(now, 60)), T2 = fmtMin(addMin(now, 75)), T1m6 = fmtMin(addMin(now, 54)), T2m6 = fmtMin(addMin(now, 69));
const writeLauncher = (name, lines) => fs.writeFileSync(path.join(LDIR, name), `${lines.join('\r\n')}\r\n`, 'latin1');
const goodLauncher = (t) => { writeLauncher('launch-rdcal.cmd', ['@echo off', `set NATIVELY_RD_T=${t}`, 'exit /b 0']); writeLauncher('launch-rdcal-dry.cmd', ['@echo off', `set NATIVELY_RD_T=${t}`, 'exit /b 0']); };
tasks('teardown');
goodLauncher(T1);

log('register-rd.ps1 calibration (A2.10 P9; A5.2 I3; read-back asserted)');
log('');
const bytes = fs.readFileSync(REG);
const parse = tasks('parse', '-Name', REG);
log(`script under test: ${REG} sha256/12 ${sha(REG).slice(0, 12)}; BOM ${bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 'present (EF BB BF)' : 'ABSENT'}; ${parse}`);
log(`dummy times: T1 ${T1} (precheck ${T1m6}), T2 ${T2} (precheck ${T2m6}); the cal launchers are in ${LDIR}`);
log('');
results.push({ id: 'bom', good: bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf });
results.push({ id: 'parse', good: /ParseFile errors: 0/.test(parse) });

// ---- registration, read back ------------------------------------------------------------------------------------------------
{
    const r = reg('-Which', 'dry');
    const st = tasks('state', '-Name', 'Natively-flight-rdcal-dry');
    check('R1', 'dry: registered with NO trigger (triggers=0), Ready, StartWhenAvailable False, limit 1 h -> REGISTRATION OK, exit 0', r, { exit: 0, lines: [/^registered Natively-flight-rdcal-dry {2}state=Ready .*triggers=0$/, /StartWhenAvailable=False$/, /^REGISTRATION OK: Natively-flight-rdcal-dry reads Ready, StartWhenAvailable False, no trigger$/, /limit=PT1H/], noLines: [/NEXT RUNS/] }, /Ready/.test(st) ? [] : [`state read ${st}`]);
}
{
    const r = reg('-Which', 'flight', '-T', T1);
    check('R2', `flight at T1: the next run read back = T1 (${T1}), WakeToRun, StartWhenAvailable False, limit 5 h, workdir = MAIN, the action names launch-rdcal.cmd -> REGISTRATION OK`, r, { exit: 0, lines: [new RegExp(`^  next run: ${T1}$`), /StartWhenAvailable=False$/, /WakeToRun=True/, /limit=PT5H/, /^REGISTRATION OK: Natively-flight-rdcal reads Ready, StartWhenAvailable False, next run as requested$/, /^  action=cmd\.exe \/c ".*launch-rdcal\.cmd"$/, /^  workdir=.*natively-cluely-ai-assistant /] });
}
{
    const r = reg('-Which', 'precheck', '-T', T1);
    check('R3', `precheck at T1 - 6: next run = ${T1m6}, limit 15 min, the action runs rd-precheck.ps1 with -At "${T1m6}" and -Label rdcal`, r, { exit: 0, lines: [new RegExp(`^  next run: ${T1m6}$`), /limit=PT15M/, new RegExp(`^  action=powershell\\.exe .*rd-precheck\\.ps1" -At "${T1m6}" -Label rdcal$`), /^REGISTRATION OK: Natively-flight-rdcal-precheck /] });
}
{
    goodLauncher(T2);
    const r = reg('-Which', 'armed', '-T', T2);
    check('R4', `armed (flight + precheck, step 13) at T2: BOTH next run times printed (NEXT RUNS flight=${T2} precheck=${T2m6})`, r, { exit: 0, lines: [new RegExp(`^NEXT RUNS flight=${T2} {2}precheck=${T2m6}$`), /^REGISTRATION OK: Natively-flight-rdcal reads/, /^REGISTRATION OK: Natively-flight-rdcal-precheck reads/] });
    const v = reg('-Which', 'verify', '-T', T2);
    check('R5', 'verify at the same T2 (reads all three back, changes nothing) -> three REGISTRATION OK, exit 0', v, { exit: 0, lines: [/^REGISTRATION OK: Natively-flight-rdcal-dry /, /^REGISTRATION OK: Natively-flight-rdcal reads/, /^REGISTRATION OK: Natively-flight-rdcal-precheck /] });
    const v2 = reg('-Which', 'verify', '-T', T1);
    check('R6', `verify with ANOTHER T (${T1}) -> REGISTRATION PROBLEM: the next run reads ..., not the requested ..., exit 1 (the flip of R5)`, v2, { exit: 1, lines: [/^REGISTRATION PROBLEM: the next run reads .*, not the requested /, /^REGISTRATION FAILED: Natively-flight-rdcal /] });
}
{
    tasks('swa-on', '-Name', 'Natively-flight-rdcal');
    const v = reg('-Which', 'verify', '-T', T2);
    check('R7', 'StartWhenAvailable flipped to True on the registered flight task (Set-ScheduledTask) -> verify: REGISTRATION PROBLEM StartWhenAvailable reads True, REGISTRATION FAILED, exit 1', v, { exit: 1, lines: [/^REGISTRATION PROBLEM: StartWhenAvailable reads True: a missed start would fire late/, /^REGISTRATION FAILED: Natively-flight-rdcal /], noLines: [/^REGISTRATION OK: Natively-flight-rdcal reads/] });
    const back = reg('-Which', 'flight', '-T', T2);
    check('R7b', 're-registering the flight task (-Force) restores StartWhenAvailable False -> REGISTRATION OK again (nothing sticky)', back, { exit: 0, lines: [/^REGISTRATION OK: Natively-flight-rdcal reads/, /StartWhenAvailable=False$/] });
    tasks('disable', '-Name', 'Natively-flight-rdcal');
    const d = reg('-Which', 'verify', '-T', T2);
    check('R8', "the flight task Disabled -> verify: REGISTRATION PROBLEM the state reads 'Disabled', not Ready, exit 1", d, { exit: 1, lines: [/^REGISTRATION PROBLEM: the state reads 'Disabled', not Ready/] });
    const again = reg('-Which', 'flight', '-T', T2);
    check('R8b', 're-registering a DISABLED task enables it again (Ready) -> REGISTRATION OK', again, { exit: 0, lines: [/^registered Natively-flight-rdcal {2}state=Ready /, /^REGISTRATION OK: Natively-flight-rdcal reads/] });
}

// ---- refusals: nothing is registered ------------------------------------------------------------------------------------------
{
    tasks('teardown');
    goodLauncher(T1);
    const refuse = (id, name, args, want) => { const r = reg(...args); const left = tasks('leftovers'); check(id, name, r, { exit: 2, lines: [want] }, /no rdcal task left/.test(left) ? [] : [`a task was registered: ${left}`]); };
    const past = fmtMin(addMin(now, -30));
    refuse('F1', '-T in the past -> REFUSED (a Once trigger in the past registers a task that never runs), no task registered', ['-Which', 'flight', '-T', past], /^REFUSED: -T .* minus 6 min is not in the future/);
    refuse('F2', "-T a bare time '21:00' -> REFUSED", ['-Which', 'flight', '-T', '21:00'], /^REFUSED: -T must be a full date-time/);
    refuse('F3', '-Which bogus -> REFUSED', ['-Which', 'bogus'], /^REFUSED: -Which must be dry, flight, precheck, armed, verify or supersede/);
    goodLauncher('2026-01-01 00:00');
    refuse('F4', 'the launcher\'s NATIVELY_RD_T differs from -T -> REFUSED naming both', ['-Which', 'flight', '-T', T1], new RegExp(`^REFUSED: .*launch-rdcal\\.cmd: the launcher's NATIVELY_RD_T is '2026-01-01 00:00', not -T '${T1}'`));
    writeLauncher('launch-rdcal.cmd', ['@echo off', `set NATIVELY_RD_T=${T1}`, 'set NATIVELY_FLIGHT_COMMIT=@@REGISTERED_HEAD_FULL_HASH@@', 'exit /b 0']);
    refuse('F5', 'the launcher still holds a commit placeholder (@@) -> REFUSED', ['-Which', 'flight', '-T', T1], /^REFUSED: .*the launcher still holds a placeholder/);
    goodLauncher(T1);
    // the REAL label: refusals before any write, and -Plan (no write at all)
    const real = (args) => { const r = ps(REG, args); return { status: r.status, lines: (r.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean), err: (r.stderr ?? '').trim().slice(0, 300) }; };
    // The real rd tasks may legitimately exist by now (the controller registers them, Disabled, before the flight). So "nothing was registered" is a
    // before/after comparison of their name|state|trigger start|action|StartWhenAvailable, taken here before the first Label rd case; it is never a count of zero.
    const realSnap = () => (spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Get-ScheduledTask | Where-Object { $_.TaskName -in 'Natively-flight-rd','Natively-flight-rd-dry','Natively-flight-rd-precheck' } | Sort-Object TaskName | ForEach-Object { $_.TaskName + '|' + $_.State + '|' + (($_.Triggers | ForEach-Object { $_.StartBoundary }) -join ',') + '|' + (($_.Actions | ForEach-Object { $_.Execute + ' ' + $_.Arguments }) -join ',') + '|' + $_.Settings.StartWhenAvailable }"], { encoding: 'utf8' }).stdout ?? '').trim();
    const REAL0 = realSnap();
    const realAbsent = () => realSnap() === REAL0;
    // fix2: T is bounded by the clock (-Now, the calibration clock) and the quota day. The exhaustive edge cases and the mutation suite are in register-rd-window-cal.mjs; these are the real-label refusals here.
    const REFUSAL_RE = { lead: /^REFUSED: -T \S+ \S+ is less than 15 min after now/, horizon: /^REFUSED: -T \S+ \S+ is more than 24 h after now/, quota: /^REFUSED: -T \S+ \S+ \+ 75 min .* crosses the quota day reset at 10:00 local/ };
    for (const [id, tt, now, why, what] of [['F6', '2026-10-07 01:14', '2026-10-07 01:00', 'lead', 'one minute short of now + 15 min'], ['F7', '2026-10-07 00:30', '2026-10-07 01:00', 'lead', 'a T in the past'], ['F6b', '2026-10-08 01:01', '2026-10-07 01:00', 'horizon', 'one minute past now + 24 h'],
        ['F6c', '2026-10-07 08:45', '2026-10-07 01:00', 'quota', 'the run (T + 75 min) reaches 10:00 local, the quota reset'], ['F6d', '2026-10-07 09:59', '2026-10-07 01:00', 'quota', 'T one minute before the reset'], ['F6e', '2026-10-08 08:45', '2026-10-07 20:00', 'quota', 'the next day reset']]) {
        check(id, 'Label rd, -T ' + tt + ' at -Now ' + now + ' (' + what + ') -> REFUSED (' + why + '), no real task registered', real(['-Which', 'flight', '-T', tt, '-Now', now]), { exit: 2, lines: [REFUSAL_RE[why]] }, realAbsent() ? [] : ['a REAL rd task exists']);
    }
    // placeholder launchers made by the generator itself into a cal folder (E's own launchers may already be the controller's real ones)
    const PHDIR = path.join(E, 'cal', 'rdcal-launchers', 'ph');
    fs.rmSync(PHDIR, { recursive: true, force: true });
    fs.mkdirSync(PHDIR, { recursive: true });
    const gw = spawnSync(process.execPath, [path.join(E, 'gen-launchers-rd.mjs'), '--out', PHDIR], { encoding: 'utf8' });
    if (gw.status !== 0 || !/@@/.test(fs.readFileSync(path.join(PHDIR, 'launch-rd.cmd'), 'latin1'))) throw new Error('calibration bug: the generator did not write placeholder launchers');
    // The bounds are INCLUSIVE: with -Plan nothing is written, and the refusal must be for a later reason (the router build absent from MAIN, else the placeholder), never for the T bounds.
    for (const [id, tt, now, what] of [['F8a', '2026-10-07 01:15', '2026-10-07 01:00', 'exactly now + 15 min'], ['F8b', '2026-10-08 01:00', '2026-10-07 01:00', 'exactly now + 24 h'], ['F8c', '2026-10-07 08:44', '2026-10-07 01:00', 'the last T whose run ends before the reset'], ['F8d', '2026-10-07 10:00', '2026-10-07 01:00', 'T exactly at the reset'], ['F8e', '2026-10-07 23:00', '2026-10-07 20:00', 'the earlier fallback T'], ['F8f', '2026-10-07 04:30', '2026-10-06 22:00', 'an early-morning T']]) {
        check(id, 'Label rd, -T ' + tt + ' at -Now ' + now + ' (' + what + ') with -Plan against placeholder launchers -> REFUSED for a LATER reason (router build absent from MAIN today, else the placeholder), NOT for the T bounds; nothing registered', real(['-Which', 'flight', '-T', tt, '-Now', now, '-Plan', '-LauncherDir', PHDIR]),
            { exit: 2, lines: [/^REFUSED: (the router build is not in .* yet|.*launch-rd\.cmd: the launcher still holds a placeholder)/], noLines: [/less than 15 min|more than 24 h|crosses the quota day/] }, realAbsent() ? [] : ['a REAL rd task exists']);
    }
    const plan = reg('-Which', 'armed', '-T', T1, '-Plan');
    check('F9', '-Plan armed with the cal launchers: PLAN lines for both tasks, "PLAN only: nothing was registered", exit 0, and no task exists afterwards', plan, { exit: 0, lines: [/^PLAN Natively-flight-rdcal: cmd\.exe /, /^PLAN Natively-flight-rdcal-precheck: powershell\.exe /, /^PLAN only: nothing was registered$/] }, /no rdcal task left/.test(tasks('leftovers')) ? [] : ['a task was registered by -Plan']);
}

// ---- supersede (A5.2 I3) --------------------------------------------------------------------------------------------------------
{
    goodLauncher(T2);
    reg('-Which', 'armed', '-T', T2);
    const rec = path.join(ARM, 'ARMING-super.md');
    for (const f of fs.readdirSync(ARM)) if (/^ARMING-super/.test(f)) fs.rmSync(path.join(ARM, f));
    fs.writeFileSync(rec, `# stub\nT: ${T2}\nARMING COMPLETE ${T2.replace(' ', 'T')}:00+03\n`);
    const r = reg('-Which', 'supersede', '-ArmingPath', rec);
    const files = fs.readdirSync(ARM).filter((f) => /^ARMING-super/.test(f));
    const sf = tasks('state', '-Name', 'Natively-flight-rdcal'), pf = tasks('state', '-Name', 'Natively-flight-rdcal-precheck');
    check('S1', 'supersede with both tasks registered and a record: BOTH read back Disabled, the record renamed to ARMING-super.superseded-<HHmm>.md (the old name gone), the old T printed and "not passed yet", exit 0', r,
        { exit: 0, lines: [/^SUPERSEDE Natively-flight-rdcal disabled, read back: Disabled$/, /^SUPERSEDE Natively-flight-rdcal-precheck disabled, read back: Disabled$/, new RegExp(`^SUPERSEDE old T ${T2}; its precheck time \\(T - 6\\) has not passed yet`), /^SUPERSEDE record renamed to ARMING-super\.superseded-\d{4}\.md; present under the old name now: False$/, /^SUPERSEDE OK: regenerate the launchers with a new T/] },
        [...(files.length === 1 && /^ARMING-super\.superseded-\d{4}\.md$/.test(files[0]) ? [] : [`files in rdcal-arming: ${files.join(', ')}`]), ...(/ Disabled /.test(` ${sf} `) && / Disabled /.test(` ${pf} `) ? [] : [`independent read-back: ${sf} / ${pf}`])]);
    // a re-registration enables again (known answer for step 13 after a regeneration)
    const re = reg('-Which', 'armed', '-T', T2);
    check('S2', 'after the supersede, re-registering (step 13 of the regenerated run) makes both tasks Ready again -> REGISTRATION OK x2', re, { exit: 0, lines: [/^REGISTRATION OK: Natively-flight-rdcal reads/, /^REGISTRATION OK: Natively-flight-rdcal-precheck /] });
    // the old T already past: the record names a T whose T - 6 has passed
    const old = fmtMin(addMin(now, -20));
    fs.writeFileSync(rec, `# stub\nT: ${old}\nARMING COMPLETE ${old.replace(' ', 'T')}:00+03\n`);
    const r2 = reg('-Which', 'supersede', '-ArmingPath', rec);
    const files2 = fs.readdirSync(ARM).filter((f) => /^ARMING-super/.test(f));
    check('S3', 'supersede again with an OLD T (T - 6 already passed): "ALREADY PASSED: no flight at that T", a second renamed copy kept (never overwritten)', r2, { exit: 0, lines: [new RegExp(`^SUPERSEDE old T ${old}; its precheck time \\(T - 6\\) has ALREADY PASSED: no flight at that T`)] }, files2.length === 2 ? [] : [`expected 2 superseded files, have ${files2.join(', ')}`]);
    // -Plan changes nothing; and no tasks / no record is named, not an error
    tasks('teardown');
    for (const f of fs.readdirSync(ARM)) if (/^ARMING-super/.test(f)) fs.rmSync(path.join(ARM, f));
    const r3 = reg('-Which', 'supersede', '-ArmingPath', rec);
    check('S4', 'supersede with NO tasks registered and NO record: both tasks named NOT REGISTERED, no record to rename, exit 0 (not an error)', r3, { exit: 0, lines: [/^SUPERSEDE Natively-flight-rdcal is NOT REGISTERED, nothing to disable$/, /^SUPERSEDE Natively-flight-rdcal-precheck is NOT REGISTERED, nothing to disable$/, /^SUPERSEDE no arming record at /, /^SUPERSEDE OK/] });
    goodLauncher(T2);
    reg('-Which', 'armed', '-T', T2);
    fs.writeFileSync(rec, `# stub\nT: ${T2}\n`);
    const r4 = reg('-Which', 'supersede', '-ArmingPath', rec, '-Plan');
    const sf4 = tasks('state', '-Name', 'Natively-flight-rdcal');
    check('S5', 'supersede -Plan: nothing disabled, nothing renamed (the dummy flight task still Ready, the record under its own name)', r4, { exit: 0, lines: [/^SUPERSEDE \(plan\) would disable Natively-flight-rdcal /, /^SUPERSEDE \(plan\) would rename the record to /] }, [...(/ Ready /.test(` ${sf4} `) ? [] : [`flight dummy read ${sf4}`]), ...(fs.existsSync(rec) ? [] : ['the record was renamed by -Plan'])]);
}

// ---- clean-up ------------------------------------------------------------------------------------------------------------------------
tasks('teardown');
for (const f of fs.readdirSync(ARM)) if (/^ARMING-super/.test(f)) fs.rmSync(path.join(ARM, f));
const left = tasks('leftovers');
log('');
log(`CLEAN-UP: ${left}`);
results.push({ id: 'cleanup', good: /no rdcal task left/.test(left) && left.includes(`real rd tasks present: ${REAL_COUNT0}`) });
const bads = results.filter((x) => !x.good);
log(bads.length === 0 ? `REGISTER CALIBRATION OK ${results.length}/${results.length}` : `REGISTER CALIBRATION FAILED: ${bads.map((b) => b.id).join(', ')} (${results.length - bads.length}/${results.length} ok)`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length === 0 ? 0 : 1);
