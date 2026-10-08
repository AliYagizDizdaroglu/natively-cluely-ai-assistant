// guard-b1-cal.mjs: calibrates guard-b1.mjs (rule 8: a check that decides something must answer differently when its premise is false). The BASE environment is parsed from the
// launcher's own `set NAME=VALUE` lines (an empty value UNSETS the name, as in cmd), so the launcher bytes and the guard are tested together. Each mutant changes ONE thing and must
// fail with exactly the named tag; the base must print GUARD OK. Run from MAIN (cwd) in the task context or the Claude session; the guard is --dry here (no clock, no precheck).
//   node guard-b1-cal.mjs [--out <file>]
// Real checks that CANNOT be mutated from here and are not calibrated: s1 (the session id of a non-interactive task), h1's other-tasks (needs a second Natively task Running), b1's stale-dist rule
// (would need an edit of a MAIN source file), g5 and g4-clock (the real launcher only: the precheck stamp and the clock window).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(HERE, 'guard-b1.mjs');
const out = [];
const say = (s) => { out.push(s); console.log(s); };

function envFromLauncher(file) {
    const env = { ...process.env };
    const text = fs.readFileSync(file, 'latin1');
    for (const line of text.split(/\r?\n/)) {
        const m = /^set ([A-Za-z0-9_]+)=(.*)$/.exec(line);
        if (!m) continue;
        if (m[2] === '') delete env[m[1]]; else env[m[1]] = m[2];
    }
    env.NATIVELY_B1_T = '2026-10-09 01:00';   // the launcher takes it from %1
    return env;
}
function runGuard(kind, env, extra = []) {
    const r = spawnSync(process.execPath, [GUARD, '--kind', kind, '--dry', ...extra], { env, cwd: process.cwd(), encoding: 'utf8', timeout: 180000 });
    const firstFail = /GUARD FAILED: \(([^)]+)\)/.exec(r.stderr ?? '');
    return { status: r.status, tag: firstFail ? firstFail[1] : (/^GUARD OK/m.test(r.stdout ?? '') ? 'OK' : `none(${r.status}) ${String(r.stderr).slice(0, 120)}`), stderr: r.stderr ?? '' };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-b1-cal-'));
const settingsOn = path.join(tmp, 'settings-on.json'); fs.writeFileSync(settingsOn, JSON.stringify({ knowledgeMode: true }));
const settingsOff = path.join(tmp, 'settings-off.json'); fs.writeFileSync(settingsOff, JSON.stringify({ knowledgeMode: false }));
const baseArgs = ['--settings', settingsOn];

let bad = 0;
const check = (name, kind, env, extra, want) => {
    const r = runGuard(kind, env, extra);
    const good = r.tag === want;
    if (!good) bad++;
    say(`${good ? 'ok  ' : 'BAD '} ${kind.padEnd(6)} ${name.padEnd(52)} got ${r.tag} (want ${want})${good ? '' : '   ' + r.stderr.split(/\r?\n/)[0].slice(0, 200)}`);
};

const smokeEnv = envFromLauncher(path.join(HERE, 'launch-b1-smoke-dry.cmd'));
const flightEnv = envFromLauncher(path.join(HERE, '..', 'flight', 'launch-b1-flight-dry.cmd'));
const mut = (env, patch) => { const e = { ...env }; for (const [k, v] of Object.entries(patch)) { if (v === undefined) delete e[k]; else e[k] = v; } return e; };

say(`guard-b1 calibration ${new Date().toISOString()}  cwd ${process.cwd()}`);
check('base (launcher env as parsed)', 'smoke', smokeEnv, baseArgs, 'OK');
check('drill spec with a space after the comma', 'smoke', mut(smokeEnv, { NATIVELY_FAULT_DRILL: 'router-drop@600, ear-mute@750' }), baseArgs, 'd1');
check('drill spec timing changed (ear-mute@1500)', 'smoke', mut(smokeEnv, { NATIVELY_FAULT_DRILL: 'router-drop@600,ear-mute@1500' }), baseArgs, 'd1');
check('drill unset', 'smoke', mut(smokeEnv, { NATIVELY_FAULT_DRILL: undefined }), baseArgs, 'd1');
check('autostart meeting unset (the parser would refuse not-harness)', 'smoke', mut(smokeEnv, { NATIVELY_AUTOSTART_MEETING: undefined }), baseArgs, 'd1');
check('router flag 0', 'smoke', mut(smokeEnv, { NATIVELY_LIVE_ROUTER: '0' }), baseArgs, 'r2');
check('hedge variable set', 'smoke', mut(smokeEnv, { NATIVELY_VERBAL_HEDGE: '1' }), baseArgs, '6');
check('thinking level override', 'smoke', mut(smokeEnv, { NATIVELY_GEMINI_THINKING_LEVEL: 'HIGH' }), baseArgs, '3');
check('earlier-question variable set', 'smoke', mut(smokeEnv, { NATIVELY_EARLIER_QUESTION: '0' }), baseArgs, 'r4');
check('roster not live40', 'smoke', mut(smokeEnv, { NATIVELY_ROSTER: 'holdout40' }), baseArgs, 'r1');
check('T malformed', 'smoke', mut(smokeEnv, { NATIVELY_B1_T: '01:00' }), baseArgs, 'g4');
check('commit is another hash', 'smoke', mut(smokeEnv, { NATIVELY_FLIGHT_COMMIT: 'dcefca0000000000000000000000000000000000' }), baseArgs, '10b');
check('commit is not 40 hex', 'smoke', mut(smokeEnv, { NATIVELY_FLIGHT_COMMIT: '527e9ee' }), baseArgs, '10b');
check('kind env disagrees with --kind', 'smoke', mut(smokeEnv, { NATIVELY_B1_KIND: 'flight' }), baseArgs, 'k0');
check('script requests so many that headroom is short', 'smoke', mut(smokeEnv, { NATIVELY_B1_EXTRA_REQUESTS: '480' }), baseArgs, 'r7');
check('script request count missing', 'smoke', mut(smokeEnv, { NATIVELY_B1_EXTRA_REQUESTS: undefined }), baseArgs, 'r7');
check('knowledge mode off', 'smoke', smokeEnv, ['--settings', settingsOff], '13');
check('night gates script absent', 'smoke', smokeEnv, [...baseArgs, '--night-gates-script', path.join(tmp, 'nope.ps1')], 'g2');

// host state: a stand-in electron.exe, and an orphaned tail.exe
const fakeEl = path.join(tmp, 'electron.exe'); fs.copyFileSync(process.execPath, fakeEl);
const elProc = spawn(fakeEl, ['-e', 'setTimeout(()=>{},60000)'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
check('an electron.exe is running', 'smoke', smokeEnv, baseArgs, 'h1');
elProc.kill();
await new Promise((r) => setTimeout(r, 1000));
const TAIL = 'C:\\Program Files\\Git\\usr\\bin\\tail.exe';
if (fs.existsSync(TAIL)) {
    const f = path.join(tmp, 'x.log'); fs.writeFileSync(f, 'x\n');
    spawnSync('cmd.exe', ['/c', `start "" /b "${TAIL}" -f "${f}"`], { stdio: 'ignore', windowsVerbatimArguments: true });   // the cmd parent exits: the tail is an orphan
    await new Promise((r) => setTimeout(r, 1500));
    check('an orphaned tail.exe', 'smoke', smokeEnv, baseArgs, 'h1');
    spawnSync('taskkill.exe', ['/F', '/IM', 'tail.exe'], { stdio: 'ignore' });
} else say(`SKIP orphaned tail: ${TAIL} not found`);

// flight kind
check('base (launcher env as parsed)', 'flight', flightEnv, baseArgs, 'OK');
check('drill set in the flight', 'flight', mut(flightEnv, { NATIVELY_FAULT_DRILL: 'router-drop@600,ear-mute@750' }), baseArgs, 'd1');
check('arms changed', 'flight', mut(flightEnv, { NATIVELY_FLIGHT_ARMS: 'high,low' }), baseArgs, 'r5');
check('focused arms not off', 'flight', mut(flightEnv, { NATIVELY_FLIGHT_FOCUSED: undefined }), baseArgs, 'r5');
check('smoke env under the flight guard', 'flight', smokeEnv, baseArgs, 'k0');

fs.rmSync(tmp, { recursive: true, force: true });
say(bad ? `CALIBRATION FAILED (${bad})` : 'CALIBRATION PASSED');
const o = process.argv.indexOf('--out');
if (o > 0) fs.writeFileSync(process.argv[o + 1], out.join('\r\n') + '\r\n');
process.exit(bad ? 1 : 0);
