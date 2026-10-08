// LAB\flight\register-rd-window-cal.mjs: rule 8 for register-rd.ps1's T bounds (fix2: now + 15 min <= T <= now + 24 h, and T + 75 min inside one quota day, resets 10:00 local).
// register-rd-cal.mjs proves the window cases once on the real script; this proves they can FAIL: copies of the script with one window rule broken are run over
// the same cases and each must flip at least one. All runs are `-Which flight -Plan` with the REAL label (rd) against placeholder launchers: -Plan calls no
// Task Scheduler cmdlet that writes, so no task is registered, enabled or touched; the proof of that is the before/after snapshot of the three real rd task names.
//   node register-rd-window-cal.mjs        writes register-rd-window-cal.txt beside it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REG = path.join(HERE, 'register-rd.ps1');
const OUT = path.join(HERE, 'register-rd-window-cal.txt');
const PH = path.join(HERE, 'cal', 'rdwin-launchers');
fs.rmSync(PH, { recursive: true, force: true });
fs.mkdirSync(PH, { recursive: true });
const gw = spawnSync(process.execPath, [path.join(HERE, 'gen-launchers-rd.mjs'), '--out', PH], { encoding: 'utf8' });
if (gw.status !== 0) throw new Error('calibration bug: the generator did not write placeholder launchers');

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const ps = (script, args) => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { encoding: 'utf8', timeout: 120000 });
const snap = () => (spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Get-ScheduledTask | Where-Object { $_.TaskName -in 'Natively-flight-rd','Natively-flight-rd-dry','Natively-flight-rd-precheck' } | Sort-Object TaskName | ForEach-Object { $_.TaskName + '|' + $_.State }"], { encoding: 'utf8' }).stdout ?? '').trim();
const before = snap();

// fix2 (user ruling 2026-10-07 00:48): T is bounded by the CLOCK and the quota day, not by fixed windows. Every run passes -Now (the calibration clock).
// [T, now, refusal]: refusal is 'quota' | 'lead' | 'horizon' | null (null = not refused for the window: a later refusal, exit 2, never one of the three)
const MSG = { quota: /crosses the quota day reset/, lead: /less than 15 min after now/, horizon: /more than 24 h after now/, offset: /UTC offset is \S+, not \+03:00/, offsetarg: /-MachineOffset must be a time span/ };
const N1 = '2026-10-07 01:00', N2 = '2026-10-07 20:00', N3 = '2026-10-06 22:00';
const CASES = [
    ['2026-10-07 01:14', N1, 'lead'], ['2026-10-07 01:15', N1, null], ['2026-10-07 01:16', N1, null],      // lead: now + 15 min inclusive
    ['2026-10-07 00:30', N1, 'lead'], ['2026-10-06 23:00', N1, 'lead'], ['2026-10-07 01:00', N1, 'lead'],  // a T in the past, and T = now
    ['2026-10-08 01:00', N1, null], ['2026-10-08 01:01', N1, 'horizon'], ['2026-10-09 03:00', N1, 'horizon'], // horizon: now + 24 h inclusive
    ['2026-10-07 08:44', N1, null], ['2026-10-07 08:45', N1, 'quota'], ['2026-10-07 09:00', N1, 'quota'], ['2026-10-07 09:59', N1, 'quota'], ['2026-10-07 10:00', N1, null], // the run crosses 10:00 local
    ['2026-10-08 08:44', N2, null], ['2026-10-08 08:45', N2, 'quota'], ['2026-10-08 09:59', N2, 'quota'],  // the next day's reset
    ['2026-10-07 04:30', N3, null], ['2026-10-07 23:00', N2, null], ['2026-10-07 07:29', N1, null],
    // fix3 F4: the machine's UTC offset must be +03:00 (the 4th element stands in for the machine's offset; a valid T throughout)
    ['2026-10-07 01:15', N1, null, '03:00:00'], ['2026-10-07 01:15', N1, 'offset', '02:00:00'], ['2026-10-07 01:15', N1, 'offset', '04:00:00'], ['2026-10-07 01:15', N1, 'offset', '00:00:00'], ['2026-10-07 01:15', N1, 'offset', '03:30:00'], ['2026-10-07 01:15', N1, 'offset', '03:00:01'], ['2026-10-07 01:15', N1, 'offsetarg', 'junk'],       // formerly outside the fixed windows, now fine
];
const runCases = (script) => CASES.map(([t, now, want, off]) => {
    const r = ps(script, ['-Which', 'flight', '-T', t, '-Now', now, '-Plan', '-LauncherDir', PH, ...(off ? ['-MachineOffset', off] : [])]);
    const o = r.stdout ?? '';
    const hits = Object.entries(MSG).filter(([, re]) => re.test(o)).map(([k]) => k);
    const good = want ? (hits.length === 1 && hits[0] === want && r.status === 2) : (hits.length === 0 && r.status === 2);
    return { t: t + ' @' + now.slice(5) + (off ? ' offset ' + off : ''), want, hits, good };
});

log('register-rd-window-cal.mjs: the T windows of register-rd.ps1, and proof that the cases can fail');
log(`script ${REG}`);
log('');
const base = runCases(REG);
for (const c of base) log(`${c.good ? 'ok  ' : 'BAD '} T ${c.t} -> ${c.want ? 'REFUSED (' + c.want + ')' : 'not refused for the T bounds (a later refusal: router build / placeholder; exit 2)'}${c.good ? '' : ' [read ' + (c.hits.join(',') || 'none') + ']'}`);
const results = base.map((c) => ({ id: `T ${c.t}`, good: c.good }));
log('');

const src = fs.readFileSync(REG, 'utf8');
const MUTANTS = [
    ['lead-bound-exclusive', '$timeWanted -lt $nowRd.AddMinutes(15)', '$timeWanted -le $nowRd.AddMinutes(15)'],
    ['lead-14-min', '$timeWanted -lt $nowRd.AddMinutes(15)', '$timeWanted -lt $nowRd.AddMinutes(14)'],
    ['lead-16-min', '$timeWanted -lt $nowRd.AddMinutes(15)', '$timeWanted -lt $nowRd.AddMinutes(16)'],
    ['lead-check-removed', 'if ($timeWanted -lt $nowRd.AddMinutes(15))', 'if ($false)'],
    ['horizon-bound-exclusive', '$timeWanted -gt $nowRd.AddHours(24)', '$timeWanted -ge $nowRd.AddHours(24)'],
    ['horizon-25-h', '$timeWanted -gt $nowRd.AddHours(24)', '$timeWanted -gt $nowRd.AddHours(25)'],
    ['horizon-check-removed', 'if ($timeWanted -gt $nowRd.AddHours(24))', 'if ($false)'],
    ['quota-check-removed', 'if ($qDayStartRd -ne $qDayEndRd)', 'if ($false)'],
    ['run-60-min', '$tUtcRd.AddMinutes(75)', '$tUtcRd.AddMinutes(60)'],
    ['run-90-min', '$tUtcRd.AddMinutes(75)', '$tUtcRd.AddMinutes(90)'],
    ['reset-hour-moved (start side 07 -> 06)', '$qDayStartRd = [math]::Floor(($tUtcRd.AddHours(-7)', '$qDayStartRd = [math]::Floor(($tUtcRd.AddHours(-6)'],
    ['reset-hour-moved (end side 07 -> 06)', '$tUtcRd.AddMinutes(75).AddHours(-7)', '$tUtcRd.AddMinutes(75).AddHours(-6)'],
    ['tz-offset-wrong (+03 -> +02)', '$timeWanted.AddHours(-3)', '$timeWanted.AddHours(-2)'],
    ['bounds-off-for-rd', "if ($Label -eq 'rd') {", "if ($Label -eq 'rdXX') {"],
    ['offset-check-removed', 'if ($offsetRd -ne [timespan]::FromHours(3))', 'if ($false)'],
    ['offset-compared-with-+02', '[timespan]::FromHours(3)) { Exit-Refused ("this machine', '[timespan]::FromHours(2)) { Exit-Refused ("this machine'],
    ['offset-stand-in-ignored', '$offsetRd = $offsetParsed', '$offsetRd = $offsetRd'],
    ['calibration-clock-ignored', '$clockRd = $nowParsed', '$clockRd = Get-Date'],
];
let caught = 0;
log('MUTATION SUITE (rule 8): a copy of register-rd.ps1 with ONE window rule broken must turn at least one case BAD');
for (const [name, find, repl] of MUTANTS) {
    if (!src.includes(find)) throw new Error(`calibration bug: mutant "${name}": text not found: ${find}`);
    const mf = path.join(HERE, 'register-rd.mut.ps1');
    fs.writeFileSync(mf, src.replace(find, () => repl), 'utf8');
    let v;
    try { v = runCases(mf); } finally { fs.rmSync(mf, { force: true }); }
    const turned = v.filter((c) => !c.good).map((c) => c.t);
    const ok = turned.length > 0;
    if (ok) caught++;
    results.push({ id: `mutant:${name.split(' ')[0]}`, good: ok });
    log(`${ok ? 'ok  ' : 'BAD '} ${name}`);
    log(`      cases that turned BAD: [${turned.join(', ')}]`);
}
log('');
const after = snap();
log(`CLEAN-UP: the real rd tasks before and after: ${before === after ? 'identical' : 'CHANGED'} (${before ? before.replace(/\r?\n/g, ', ') : 'none registered'})`);
results.push({ id: 'real-tasks', good: before === after });
const bads = results.filter((x) => !x.good);
log(bads.length ? `WINDOW CALIBRATION: FAILED (${bads.map((b) => b.id).join(', ')})` : `WINDOW CALIBRATION OK ${results.length}/${results.length} (${MUTANTS.length} mutants, ${caught} caught)`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length ? 1 : 0);
