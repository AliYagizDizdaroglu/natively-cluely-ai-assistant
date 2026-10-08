// E\launch-eq-check.mjs - the flight-launcher-guards note's steps 1, 2 and 4 for a GENERATED flight-eq launcher (final-list step 10, b7):
//   1. a guards-only copy of the launcher, run with cmd.exe from MAIN's folder, must print GUARDS_ALL_PASSED and exit 0, and its log must
//      hold the whole chain (start banner, committed-text shas first, wav:check, EQ proofs, GUARD OK, NIGHT GATES OK);
//   2. the same copy with ONE guard's marker mangled must exit with THAT guard's code and write THAT guard's line to the launcher's error log
//      (9 folder, 8 audio, 7 roster, 6 harness stop, 12 commit, 14 committed text, 5 wav:check, 3 dist proofs, 4 guard x2);
//   4. the artifacts are deleted and the real error log %TEMP%\natively-eq-launcher-error.log is proven ABSENT (arming requires it absent).
// The launcher is read, never edited: T, the commit and the passes list come FROM ITS OWN TEXT, and the copy differs from it ONLY in (a) the log
// path (redirected into E, so MAIN's interview60.runs is not written), (b) the guard line, which gets the guard's calibration options
// --settings (the REAL settings file by its admin-share path: from a Claude session %APPDATA% is a shadow copy), --precheck-file (a stub stamped
// T - 7 min, written here) and --now (T + 1 min) when it is the real launcher (--require-precheck), and (c) the cut before the flight line and the
// GUARDS_ALL_PASSED marker. Every substitution is asserted to apply. No app, no model call; MAIN is only read.
//   node launch-eq-check.mjs [--launcher <launch-eq.cmd | launch-eq-dry.cmd>] [--out <result file>]      (default: E\launch-eq.cmd)
// Exit 0 = every check as expected, 1 = not, 2 = usage or a launcher that still holds a placeholder. The copy must live in E (its helpers are
// %~dp0-relative), so the launcher under test is read from wherever it is and the copy is written beside the helpers.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const usage = (m) => { console.log(`LAUNCH CHECK usage error: ${m}`); console.log('usage: node launch-eq-check.mjs [--launcher <file>] [--out <file>]'); process.exit(2); };
argv.forEach((a, i) => { if (a.startsWith('--') && !['--launcher', '--out'].includes(a)) usage(`unknown option ${a}`); if (!a.startsWith('--') && !['--launcher', '--out'].includes(argv[i - 1])) usage(`unexpected argument ${a}`); });
const launcher = path.resolve(opt('--launcher') ?? path.join(E, 'launch-eq.cmd'));
const outFile = opt('--out') ? path.resolve(opt('--out')) : null;
if (!fs.existsSync(launcher)) usage(`no launcher at ${launcher}`);
const base = fs.readFileSync(launcher, 'latin1');
if (base.includes('@@')) usage(`${launcher} still holds a placeholder (node gen-launchers-eq.mjs --commit <registered HEAD> --t <T>)`);
const T = /^set NATIVELY_EQ_T=(\d{4}-\d\d-\d\d \d\d:\d\d)\r?$/m.exec(base)?.[1];
const commit = /^set NATIVELY_FLIGHT_COMMIT=([0-9a-f]{40})\r?$/m.exec(base)?.[1];
const label = /^echo === LAUNCHER (\S+) start /m.exec(base)?.[1];
const real = /guard-eq\.mjs" --require-precheck >>/.test(base);
if (!T || !commit || !label) usage('could not read T, the commit and the label from the launcher text');
const passesArg = /--passes "([^"]*)"/.exec(base)?.[1];
if (!passesArg) usage('no --passes argument in the launcher');

const ERRLOG = path.join(process.env.TEMP ?? os.tmpdir(), 'natively-eq-launcher-error.log');
const od = path.join(os.homedir(), 'OneDrive');
let MAIN;
for (const d of fs.readdirSync(od)) { if (!d.startsWith('Masa')) continue; const c = path.join(od, d, 'natively-cluely-ai-assistant'); if (fs.existsSync(path.join(c, '.git'))) MAIN = c; }
if (!MAIN) usage('MAIN not found under OneDrive');
const home = os.homedir().replace(/\\/g, '/');
const SETTINGS = `//localhost/${home[0]}$/${home.slice(3)}/AppData/Roaming/natively/settings.json`;
const COPY = path.join(E, 'launch-eq-guardsonly.cmd');
const COPYLOG = path.join(E, 'guardsonly.launcher.log');
const REL_E = path.relative(MAIN, E);                              // E as seen from MAIN's working directory (relative: the .cmd must stay ASCII, and E holds a non-ASCII folder name)
const REL = REL_E.split(path.sep).join('\\');
if (/[^\x20-\x7e]/.test(REL)) usage(`E is not reachable by an ASCII relative path from MAIN (${REL})`);
const liveLog = `electron\\test\\golden\\interview60.runs\\flight-${label}.launcher.log`;

// the precheck stub for THIS launcher's T (real launcher only): the file shape the precheck task writes, stamped T - 7 min
const pad = (n) => String(n).padStart(2, '0');
const [Y, Mo, D, H, Mi] = [...T.matchAll(/\d+/g)].map((m) => +m[0]);
const tMs = Date.UTC(Y, Mo - 1, D, H - 3, Mi);                     // T is a +03:00 clock reading
const stampOf = (ms) => { const d = new Date(ms + 3 * 3600000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
const PRECHECK_STUB = path.join(E, 'guard-eq-cal-stubs', 'pre-launch-check.txt');
const NOW_ISO = `${stampOf(tMs + 60000)}+03:00`;
if (real) {
    fs.mkdirSync(path.dirname(PRECHECK_STUB), { recursive: true });
    fs.writeFileSync(PRECHECK_STUB, `PRECHECK flight-task: OK stub\nPRECHECK OK ${stampOf(tMs - 7 * 60000)}+03\n`);
}

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);
function record(id, name, good, detail) { results.push({ id, good }); log(`${good ? 'ok  ' : 'BAD '} ${id.padEnd(4)} ${name}`); if (detail) log(`      ${clip(detail, 600)}`); }

function derive(mutate = (t) => t) {
    let t = base;
    const sub = (from, to) => { const n = t.split(from).length - 1; if (n < 1) throw new Error(`launch-eq-check: "${from.slice(0, 60)}" not found in the launcher`); t = t.split(from).join(to); return n; };
    sub(liveLog, `${REL}\\guardsonly.launcher.log`);                // the log goes into E, never into MAIN
    sub('guard-eq.mjs"', `guard-eq.mjs"`);                          // (asserts the guard call exists)
    // the guard line's calibration options: --settings (the real file, by its admin-share path) and, for the real launcher, the precheck stub and clock
    const opts = real ? ` --settings "${SETTINGS}" --precheck-file "${REL}\\guard-eq-cal-stubs\\pre-launch-check.txt" --now ${NOW_ISO}` : ` --settings "${SETTINGS}"`;
    const guardFrom = real ? 'guard-eq.mjs" --require-precheck >>' : 'guard-eq.mjs" >>';
    sub(guardFrom, `${guardFrom.slice(0, -3)}${opts} >>`);
    // cut before the flight (real) or before the dry twin's own done line, then the marker
    const cutReal = t.indexOf('rem The flight itself.');
    const cutDry = t.indexOf(`echo === LAUNCHER ${label} done`);
    const cut = cutReal >= 0 ? cutReal : cutDry;
    if (cut < 0) throw new Error('launch-eq-check: the run section marker was not found');
    t = `${t.slice(0, cut)}echo GUARDS_ALL_PASSED\r\nexit /b 0\r\n`;
    t = mutate(t);
    if (!/^[\x00-\x7f]*$/.test(t)) throw new Error('launch-eq-check: the guards-only copy is not ASCII');
    fs.writeFileSync(COPY, t, 'latin1');
}
function runCopy() {
    fs.rmSync(ERRLOG, { force: true });
    fs.rmSync(COPYLOG, { force: true });
    const r = spawnSync('cmd.exe', ['/c', COPY], { cwd: MAIN, encoding: 'utf8', timeout: 240000 });
    const logText = fs.existsSync(COPYLOG) ? fs.readFileSync(COPYLOG, 'utf8') : '';
    const errText = fs.existsSync(ERRLOG) ? fs.readFileSync(ERRLOG, 'utf8') : null;
    fs.rmSync(ERRLOG, { force: true });
    return { r, logText, errText };
}

log(`launch-eq-check.mjs: ${launcher} (${real ? 'the REAL form, --require-precheck' : 'the dry form'}); label ${label}; T ${T}; commit ${commit.slice(0, 12)}; passes ${passesArg.split(',').length} files; MAIN ${MAIN} (read only)`);
log('');
try {
    derive();
    const { r, logText, errText } = runCopy();
    const flat = logText.split(/\r?\n/);
    const has = (re) => flat.some((l) => re.test(l));
    const idx = (re) => flat.findIndex((l) => re.test(l));
    record('G1', 'step 1: the guards-only copy, run with cmd.exe from MAIN\'s folder -> prints GUARDS_ALL_PASSED, exit 0, no error log', r.status === 0 && /GUARDS_ALL_PASSED/.test(r.stdout) && errText === null, `exit ${r.status}, stdout "${r.stdout.trim()}", error log ${errText === null ? 'absent' : `PRESENT: ${errText.trim().slice(0, 150)}`}`);
    const checks = [
        ['the start banner with the commit and T', has(new RegExp(`^=== LAUNCHER ${label} start .* commit ${commit} T ${T} ===`))],
        ['a PASSES sha256 line for every named text', passesArg.split(',').every((n) => has(new RegExp(`^PASSES ${n.replace(/[.]/g, '\\.')} sha256=[0-9a-f]{64}$`)))],
        ['ARMING absent or ARMING sha256= (printed BEFORE wav:check)', has(/^ARMING (absent|sha256=[0-9a-f]{64})$/) && idx(/^ARMING /) < idx(/^scenario50\.wav matches /)],
        ['wav:check says the audio matches', has(/^scenario50\.wav matches /)],
        ['EQ PROOFS: ALL PASSED', has(/^EQ PROOFS: ALL PASSED$/)],
        ['GUARD OK', has(/^GUARD OK: /)],
        ['NIGHT GATES OK', has(/^NIGHT GATES OK$/)],
        ...(real ? [['PRECHECK ACCEPTED <stamp>', has(/^PRECHECK ACCEPTED \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+03$/)]] : []),
    ];
    for (const [i, [name, ok]] of checks.entries()) record(`G2.${i + 1}`, `the copy's log holds: ${name}`, ok, '');
    const gl = flat.find((l) => l.startsWith('GUARD OK: ')) ?? '';
    log(`      (the GUARD OK line, for the arming record: ${clip(gl, 330)})`);
    log(`      (the ARMING line: ${flat.find((l) => /^ARMING /.test(l)) ?? '(none)'}; the first PASSES lines: ${flat.filter((l) => /^PASSES /.test(l)).slice(0, 2).map((l) => l.replace(/sha256=([0-9a-f]{12})[0-9a-f]+/, 'sha256=$1...')).join(' | ')})`);

    const mangle = (id, name, mut, wantCode, wantErr) => {
        derive(mut);
        const x = runCopy();
        record(id, name, x.r.status === wantCode && x.errText !== null && wantErr.test(x.errText) && !/GUARDS_ALL_PASSED/.test(x.r.stdout), `exit ${x.r.status} (want ${wantCode}); stdout "${x.r.stdout.trim()}"; error log: ${x.errText === null ? 'ABSENT' : x.errText.trim().slice(0, 130)}`);
    };
    const lastPass = passesArg.split(',').pop();
    mangle('M1', 'step 2: the harness-stop marker mangled -> exit 6 and its error-log line', (t) => t.replace("findstr /C:\"process.on('exit', appStop)\"", "findstr /C:\"process.on('exit', appStopX)\""), 6, /the harness does not stop the app/);
    mangle('M2', 'step 2: the commit replaced by the placeholder token -> exit 12', (t) => t.replace(`set NATIVELY_FLIGHT_COMMIT=${commit}`, 'set NATIVELY_FLIGHT_COMMIT=@@REGISTERED_HEAD_FULL_HASH@@'), 12, /not a full 40 character hash/);
    mangle('M3', 'step 2: the guard script name mangled -> exit 4 (a guard that cannot run refuses)', (t) => t.replace('guard-eq.mjs"', 'guard-eq-mangled.mjs"'), 4, /behavioural guard failed/);
    mangle('M4', `step 2: the last committed text named wrongly in the sha-lines call (${lastPass}) -> exit 14`, (t) => t.replace(lastPass, 'flight-eq-no-such-text.md'), 14, /a committed text is missing at HEAD/);
    mangle('M5', 'step 2: the roster file name mangled -> exit 7', (t) => t.replace('scenario50.questions.mjs', 'scenario50.questionz.mjs'), 7, /scenario50 roster missing/);
    mangle('M6', 'step 2: the audio file name mangled -> exit 8', (t) => t.replace('electron\\test\\golden\\scenario50.wav', 'electron\\test\\golden\\scenario50x.wav'), 8, /scenario50\.wav missing/);
    mangle('M7', 'step 2: the working-directory check mangled -> exit 9', (t) => t.replace('if not exist "electron\\test\\golden\\interview60.flight.mjs"', 'if not exist "electron\\test\\golden\\interview60.flightx.mjs"'), 9, /wrong working directory/);
    mangle('M8', 'step 2: wav:check pointed at a subcommand that fails -> exit 5', (t) => t.replace('interview60.run.mjs wav:check', 'interview60.run.mjs wav:chek'), 5, /does not match the scenario50 roster/);
    mangle('M9', 'step 2: the dist proofs refusing (a relative --root) -> exit 3', (t) => t.replace('eq-proofs.mjs" --root "%CD%" >>', 'eq-proofs.mjs" --root "." >>'), 3, /dist proofs 1 failed/);
    if (real) mangle('M10', 'step 2: the precheck stamp stale (now = T + 11 min) -> the REAL guard refuses (g5) -> exit 4', (t) => t.replace(`--now ${NOW_ISO}`, `--now ${stampOf(tMs + 11 * 60000)}+03:00`), 4, /behavioural guard failed/);
} catch (e) {
    record('ERR', `the check itself failed: ${String(e.message).slice(0, 200)}`, false, '');
}
fs.rmSync(COPY, { force: true });
fs.rmSync(COPYLOG, { force: true });
fs.rmSync(PRECHECK_STUB, { force: true });
record('G4', 'step 4: artifacts deleted (the guards-only copy, its log, the precheck stub) and the real error log %TEMP%\\natively-eq-launcher-error.log is ABSENT', !fs.existsSync(COPY) && !fs.existsSync(COPYLOG) && !fs.existsSync(ERRLOG), ERRLOG);
log('');
const bads = results.filter((x) => !x.good);
log(bads.length === 0 ? `LAUNCH CHECK OK ${results.length}/${results.length}: GUARDS_ALL_PASSED and every mangled marker exiting with its own code` : `LAUNCH CHECK FAILED: ${bads.map((b) => b.id).join(', ')} (${results.length - bads.length}/${results.length} ok)`);
if (outFile) fs.writeFileSync(outFile, `${out.join('\n')}\n`);
process.exit(bads.length === 0 ? 0 : 1);
