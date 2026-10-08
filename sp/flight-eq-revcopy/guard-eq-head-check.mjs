// E\guard-eq-head-check.mjs - the two guard readings the controller re-runs at final-list steps 8 and 9 (A5 m7): the REAL guard-eq.mjs, the
// dry form, run from MAIN's folder under the launcher's environment block, once with NATIVELY_FLIGHT_COMMIT = MAIN's HEAD (must read GUARD OK)
// and once with the PARENT of HEAD (must read GUARD FAILED (10b): a moved HEAD, no commit is ever made on MAIN to test it).
//   node guard-eq-head-check.mjs --t "yyyy-MM-dd HH:mm" [--expect-head <40 hex>]
// --t is the task time the launchers carry (the guard's g4 and its night gates read it); --expect-head asserts HEAD is the registered HEAD
// (step 9: the passes commit). The only option passed to the guard is --settings, the REAL settings file by its admin-share path (from a Claude
// session %APPDATA% is a shadow copy); the smoke result, parity-dist and night-gates.ps1 are the real ones. Prints names, tags and counts only;
// MAIN is only read; no app, no model call. Exit 0 = both readings as expected, 1 = not, 2 = usage.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const usage = (m) => { console.log(`HEAD CHECK usage error: ${m}`); console.log('usage: node guard-eq-head-check.mjs --t "yyyy-MM-dd HH:mm" [--expect-head <40 hex>]'); process.exit(2); };
argv.forEach((a, i) => { if (a.startsWith('--') && !['--t', '--expect-head'].includes(a)) usage(`unknown option ${a}`); if (!a.startsWith('--') && !['--t', '--expect-head'].includes(argv[i - 1])) usage(`unexpected argument ${a}`); });
const T = opt('--t');
if (!T || !/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(T)) usage('--t must be "yyyy-MM-dd HH:mm"');
const expectHead = opt('--expect-head');
if (expectHead !== undefined && !/^[0-9a-f]{40}$/.test(expectHead)) usage('--expect-head must be 40 lowercase hex characters');

const od = path.join(os.homedir(), 'OneDrive');
let MAIN;
for (const d of fs.readdirSync(od)) { if (!d.startsWith('Masa')) continue; const c = path.join(od, d, 'natively-cluely-ai-assistant'); if (fs.existsSync(path.join(c, '.git'))) MAIN = c; }
if (!MAIN) usage('MAIN not found under OneDrive');
const git = (...a) => execFileSync('git', ['--no-optional-locks', '-C', MAIN, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const head = git('rev-parse', 'HEAD'), parent = git('rev-parse', 'HEAD~1');
const home = os.homedir().replace(/\\/g, '/');
const settings = `//localhost/${home[0]}$/${home.slice(3)}/AppData/Roaming/natively/settings.json`;

function guard(commit) {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/^(NATIVELY_|EQ_)/i.test(k)) delete env[k];
    Object.assign(env, { NATIVELY_STT_PROVIDER: 'deepgram', NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2', NATIVELY_EARLIER_QUESTION: '1', NATIVELY_FLIGHT_FOCUSED: 'off', NATIVELY_EQ_T: T, NATIVELY_FLIGHT_COMMIT: commit });
    const r = spawnSync(process.execPath, [path.join(E, 'guard-eq.mjs'), '--settings', settings], { cwd: MAIN, env, encoding: 'utf8', timeout: 240000 });
    const okLine = (r.stdout ?? '').split(/\r?\n/).find((l) => l.startsWith('GUARD OK: '));
    const errLine = (r.stderr ?? '').trim().split(/\r?\n/).pop() ?? '';
    return { status: r.status, okLine, errLine };
}
let good = true;
const say = (ok, text) => { if (!ok) good = false; console.log(`${ok ? 'PASS' : 'FAIL'} ${text}`); };
console.log(`HEAD CHECK MAIN HEAD ${head}; parent ${parent}; T ${T}`);
if (expectHead !== undefined) say(head === expectHead, `MAIN HEAD equals the expected registered HEAD ${expectHead.slice(0, 12)}`);
const a = guard(head);
say(a.status === 0 && !!a.okLine, `NATIVELY_FLIGHT_COMMIT = HEAD -> ${a.okLine ? `GUARD OK (${a.okLine.slice(0, 90)}...)` : `exit ${a.status}: ${a.errLine.slice(0, 200)}`}`);
const b = guard(parent);
say(b.status === 1 && /^GUARD FAILED: \(10b\) MAIN HEAD is /.test(b.errLine), `NATIVELY_FLIGHT_COMMIT = HEAD's PARENT -> ${b.errLine.slice(0, 200) || `exit ${b.status}`}`);
console.log(good ? 'HEAD CHECK: BOTH READINGS AS EXPECTED' : 'HEAD CHECK: FAILED');
process.exit(good ? 0 : 1);
