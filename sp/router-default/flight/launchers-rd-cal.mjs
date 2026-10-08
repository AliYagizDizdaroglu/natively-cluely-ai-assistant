// LAB\flight\launchers-rd-cal.mjs: calibration of the launcher family (plan Task 18 step 2): gen-launchers-rd.mjs + launch-rd-src.txt, rd-sha-lines.mjs,
// rd-proofs.mjs, and the two generated launchers run by cmd.exe in stub trees (SP\flight-eq\launchers-eq-cal.mjs's idea, smaller).
//   node launchers-rd-cal.mjs        writes launchers-rd-cal.txt beside it; exit 0 only if every counted case reads as expected.
// SAFETY. Nothing here starts the app, the probe or a flight; no scheduled task is touched; MAIN is not read at all (the stub tree is a copy of the guard
// calibration's stub, cal\guard-stub, which guard-rd-cal.mjs builds: run that first). The only file written outside LAB\flight\cal is the launcher's own
// error log %TEMP%\natively-rd-launcher-error.log by the exit-code cases: it is deleted after each case and proven ABSENT at the end (the precheck's
// error-log gate requires it absent at arming).
// NOT covered: the guard passing end to end through the launcher (RESULT-smoke.md, the real night gates and the real ledger are not stubbed here) and a
// dry run on MAIN with the router build: that is plan Task 18 step 6, the controller's.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(HERE, '..', '..');
const CAL = path.join(HERE, 'cal');
const GEN = path.join(HERE, 'gen-launchers-rd.mjs');
const SRC = path.join(HERE, 'launch-rd-src.txt');
const GUARD_STUB = path.join(CAL, 'guard-stub');
const WORK = path.join(CAL, 'launchers');
const OUT = path.join(HERE, 'launchers-rd-cal.txt');
const ERRLOG = path.join(process.env.TEMP ?? os.tmpdir(), 'natively-rd-launcher-error.log');
if (!fs.existsSync(path.join(GUARD_STUB, 'dist-electron'))) throw new Error('run guard-rd-cal.mjs first: its stub tree cal\\guard-stub is the base of the exit-code cases');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.rmSync(ERRLOG, { force: true });

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function record(id, name, why, detail) {
    results.push({ id, good: why.length === 0 });
    log(`${why.length === 0 ? 'ok  ' : 'BAD '} ${id.padEnd(5)} ${name}`);
    if (detail) log(`      ${clip(detail, 420)}`);
    if (why.length) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
}
const node = (script, args, o = {}) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 120000, ...o });
const last = (s) => (s ?? '').trim().split(/\r?\n/).pop() ?? '';

const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01';
const CTX = 'a1b2c3d4e5f6';
const FILLED = ['--commit', COMMIT, '--t', '2026-10-07 23:00', '--deadline-min', '40', '--ctx-sha12', CTX, '--extra-requests', '12'];
let caseNo = 0;
const folder = (id) => { const d = path.join(WORK, `${String(++caseNo).padStart(2, '0')}-${id}`); fs.mkdirSync(d, { recursive: true }); return d; };
// fix2: T is bounded by the clock, so every generator call carries the calibration clock (--now) unless it names its own
const CAL_NOW = '2026-10-07T00:00:00+03:00';
const gen = (dir, args) => node(GEN, ['--out', dir, ...args, ...(args.includes('--now') ? [] : ['--now', CAL_NOW])]);

log('launchers-rd-cal.mjs: the launcher family (plan Task 18 step 2)');
log(`generator ${GEN} sha256/12 ${sha(fs.readFileSync(GEN)).slice(0, 12)}; source ${SRC} sha256/12 ${sha(fs.readFileSync(SRC)).slice(0, 12)}`);
log('');

// ---- 1. the generator -------------------------------------------------------------------------------------------------------------
log('GENERATOR');
{
    const d = folder('filled');
    const r = gen(d, FILLED);
    const flight = fs.readFileSync(path.join(d, 'launch-rd.cmd'), 'latin1');
    const dry = fs.readFileSync(path.join(d, 'launch-rd-dry.cmd'), 'latin1');
    const why = [];
    if (r.status !== 0 || !/GENERATOR: BOTH FILES PASS/.test(r.stdout)) why.push(`exit ${r.status}: ${last(r.stdout)}`);
    for (const [name, v] of [['NATIVELY_FLIGHT_COMMIT', COMMIT], ['NATIVELY_RD_T', '2026-10-07 23:00'], ['I60_PROBE_DEADLINE_MIN', '40'], ['NATIVELY_ROUTER_CONTEXT_SHA12', CTX], ['NATIVELY_RD_EXTRA_REQUESTS', '12']]) {
        for (const [fn, t] of [['flight', flight], ['dry', dry]]) {
            const m = t.match(new RegExp(`^set ${name}=(.*)\\r$`, 'gm')) ?? [];
            if (m.length !== 1 || m[0] !== `set ${name}=${v}\r`) why.push(`${fn}: ${name} line ${JSON.stringify(m)}`);
        }
    }
    const must = ['set NATIVELY_LIVE_ROUTER=1', 'set NATIVELY_ROSTER=live40', 'set NATIVELY_SCENARIOS=', 'set NATIVELY_EARLIER_QUESTION=', 'set NATIVELY_FLIGHT_ARMS=high,low,captured-high', 'set NATIVELY_FLIGHT_FOCUSED=off', 'set NATIVELY_STT_PROVIDER=deepgram', 'set NATIVELY_VERBAL_HEDGE=', 'set NATIVELY_LIVE_MODEL='];
    for (const l of must) for (const [fn, t] of [['flight', flight], ['dry', dry]]) if (!t.split('\r\n').includes(l)) why.push(`${fn} lacks the line ${l}`);
    if (!flight.includes('interview60.flight.mjs router-default-r1 >>')) why.push('the flight call is not "interview60.flight.mjs router-default-r1"');
    if (dry.includes('interview60.flight.mjs router-default')) why.push('the dry twin calls the flight');
    if (!flight.includes('guard-rd.mjs" --require-precheck >>')) why.push('the flight launcher\'s guard line lacks --require-precheck');
    if (dry.split('\r\n').some((l) => !l.startsWith('rem ') && l.includes('--require-precheck'))) why.push('the dry twin passes --require-precheck');
    if (!/interview60\.run\.mjs wav:check/.test(flight) || !flight.includes('rd-sha-lines.mjs" --root "%CD%" --passes "PREREGISTER-router-default.md" --arming "%~dp0ARMING-flight-rd.md"')) why.push('wav:check or the sha-lines call is missing or changed');
    if ((flight.match(/rd-proofs\.mjs" --root "%CD%"/g) ?? []).length !== 2 || !flight.includes('--same-as-log electron\\test\\golden\\interview60.runs\\flight-rd.launcher.log')) why.push('the router dist proofs before and after are not both present');
    if (/flight-eq|launch-eq|eq-sha|eq-proofs|guard-eq|eqcal|_EQ_|scenario50/i.test(flight + dry)) why.push('an eq name is left in a launcher');
    record('G1', 'all four values given: BOTH FILES PASS, each value on exactly ONE set line per launcher, the router env block, the flight call router-default-r1, --require-precheck in the flight launcher only, the sha lines, wav:check, the two router dist proofs, no eq name left', why, `${last(r.stdout)}; ${flight.split('\r\n').length} and ${dry.split('\r\n').length} lines`);
    const c = node(GEN, ['--check', '--armed', '--out', d]);
    record('G2', '--check --armed on the filled pair -> exit 0, GENERATOR: BOTH FILES PASS', c.status === 0 && /BOTH FILES PASS/.test(c.stdout) ? [] : [`exit ${c.status}: ${last(c.stdout)}`], last(c.stdout));
}
{
    const d = folder('placeholders');
    const r = gen(d, []);
    const flight = fs.readFileSync(path.join(d, 'launch-rd.cmd'), 'latin1');
    const c = node(GEN, ['--check', '--armed', '--out', d]);
    const why = [];
    if (r.status !== 0) why.push(`generation exit ${r.status}`);
    for (const p of ['@@REGISTERED_HEAD_FULL_HASH@@', '@@T@@', '@@DEADLINE_MIN@@', '@@CONTEXT_SHA12@@', '@@EXTRA_REQUESTS@@']) if (!flight.includes(`=${p}\r\n`)) why.push(`the placeholder ${p} is not on its set line`);
    if (c.status !== 1 || !/--armed: a commit, T, deadline or context sha is still a placeholder/.test(c.stdout)) why.push(`--check --armed exit ${c.status}, wanted 1 with the placeholder message`);
    const c2 = node(GEN, ['--check', '--out', d]);
    if (c2.status !== 0) why.push(`--check without --armed exit ${c2.status}, wanted 0 (placeholders are allowed until arming)`);
    record('G3', 'no values: four placeholders, each on its own set line; --check passes, --check --armed FAILS naming the placeholder', why, last(c.stdout));
}
{
    const d = folder('incremental');
    gen(d, ['--commit', COMMIT]);
    gen(d, ['--t', '2026-10-07 08:00']);
    gen(d, ['--deadline-min', '55', '--ctx-sha12', CTX, '--extra-requests', '12']);
    const f = fs.readFileSync(path.join(d, 'launch-rd.cmd'), 'latin1');
    const why = [];
    for (const l of [`set NATIVELY_FLIGHT_COMMIT=${COMMIT}`, 'set NATIVELY_RD_T=2026-10-07 08:00', 'set I60_PROBE_DEADLINE_MIN=55', `set NATIVELY_ROUTER_CONTEXT_SHA12=${CTX}`, 'set NATIVELY_RD_EXTRA_REQUESTS=12']) if (!f.split('\r\n').includes(l)) why.push(`lost ${l}`);
    const c = node(GEN, ['--check', '--armed', '--out', d]);
    if (c.status !== 0) why.push(`--check --armed exit ${c.status}`);
    record('G4', 'values given one run at a time are kept by the next run (an option left out keeps what the file holds)', why, last(c.stdout));
}
{
    const bad = (id, name, args, wantRe) => { const d = folder(id); const r = gen(d, args); const left = fs.readdirSync(d); record(id, name, [...(r.status === 2 && wantRe.test(r.stdout) ? [] : [`exit ${r.status}: ${last(r.stdout)}`]), ...(left.length === 0 ? [] : [`files written: ${left.join(', ')}`])], last(r.stdout)); };
    bad('G5a', '--commit 39 characters', ['--commit', COMMIT.slice(0, 39)], /^REFUSED: --commit .* not a full 40 character lowercase hash/m);
    bad('G5b', '--commit uppercase', ['--commit', COMMIT.toUpperCase()], /^REFUSED: --commit/m);
    bad('G5c', '--commit 41 characters', ['--commit', `${COMMIT}0`], /^REFUSED: --commit/m);
    const TFMT = /^REFUSED: --t .* not a "yyyy-MM-dd HH:mm" time whose run \(T \+ 75 min\) stays inside one quota day/m;
    const TLEAD = /^REFUSED: --t .* is less than 15 min after now/m, THOR = /^REFUSED: --t .* is more than 24 h after now/m;
    // now = 2026-10-07 00:00 +03:00. Format and calendar cases, the quota reset (10:00 local: T + 75 min must not reach it), the lead (now + 15 min) and the horizon (now + 24 h)
    for (const [id, t, what, re] of [['G5d', '2026-10-07 08:45', 'T + 75 min is exactly 10:00, the quota reset', TFMT], ['G5e', '2026-10-07 09:00', 'the run crosses the reset', TFMT], ['G5f', '2026-10-07 09:59', 'one minute before the reset: the run crosses it', TFMT], ['G5g', '2026-10-08 08:45', 'the next day reset', TFMT],
        ['G5h', '2026-10-07 00:14', 'one minute short of now + 15 min', TLEAD], ['G5i', '2026-10-06 23:00', 'a T in the past', TLEAD], ['G5j', '2026-10-05 21:00', 'the eq hour T', TLEAD], ['G5ja', '2026-10-07 00:00', 'T equal to now', TLEAD],
        ['G5jb', '2026-10-08 00:01', 'one minute past now + 24 h', THOR], ['G5jc', '2026-10-09 03:00', 'two days ahead', THOR],
        ['G5k', '2026-10-07 23:00 ', 'a trailing space', TFMT], ['G5l', '2026-10-07T23:00', 'the ISO form', TFMT], ['G5m', '2026-10-07 25:00', 'an impossible time', TFMT], ['G5n', '2026-02-30 23:00', 'an impossible date', TFMT]]) {
        bad(id, `--t ${JSON.stringify(t)} (${what})`, ['--t', t], re);
    }
    for (const [id, v] of [['G5o', '0'], ['G5p', '241'], ['G5q', '30 '], ['G5r', 'abc'], ['G5s', '04'], ['G5t', '-5']]) bad(id, `--deadline-min ${JSON.stringify(v)}`, ['--deadline-min', v], /^REFUSED: --deadline-min .* not a whole number of minutes from 1 to 240/m);
    for (const [id, v] of [['G5u', CTX.slice(0, 11)], ['G5v', CTX.toUpperCase()], ['G5w', `${CTX}0`]]) bad(id, `--ctx-sha12 ${JSON.stringify(v)}`, ['--ctx-sha12', v], /^REFUSED: --ctx-sha12 .* not 12 lowercase hex characters/m);
    for (const [id, v] of [['G5ua', '-1'], ['G5ub', '10000'], ['G5uc', '5 '], ['G5ud', 'many']]) bad(id, `--extra-requests ${JSON.stringify(v)}`, ['--extra-requests', v], /^REFUSED: --extra-requests .* not a whole number of requests from 0 to 9999/m);
    bad('G5x', 'an unknown option', ['--bogus'], /^REFUSED: unknown option --bogus/m);
    bad('G5y', 'a stray positional argument', ['extra'], /^REFUSED: unexpected argument extra/m);
    bad('G5z', '--passes with a path separator', ['--passes', 'sub/PREREGISTER-router-default.md'], /^REFUSED: --passes must be distinct file names/m);
    bad('G5za', '--passes with a duplicate', ['--passes', 'a.md,a.md'], /^REFUSED: --passes must be distinct file names/m);
    bad('G5zb', '--passes not a .md', ['--passes', 'notes.txt'], /^REFUSED: --passes must be distinct file names/m);
    bad('G5zc', '--commit with no value', ['--commit'], /^REFUSED: --commit needs a value/m);
    const d = folder('check-with-values'); gen(d, []);
    const r = node(GEN, ['--check', '--commit', COMMIT, '--out', d]);
    record('G5zd', '--check together with --commit is refused (a check writes nothing)', r.status === 2 && /^REFUSED: --check writes nothing/m.test(r.stdout) ? [] : [`exit ${r.status}: ${last(r.stdout)}`], last(r.stdout));
    const r2 = node(GEN, ['--armed']);
    record('G5ze', '--armed without --check is refused', r2.status === 2 && /^REFUSED: --armed belongs to --check/m.test(r2.stdout) ? [] : [`exit ${r2.status}: ${last(r2.stdout)}`], last(r2.stdout));
    const r3 = node(GEN, ['--out', path.join(WORK, 'no-such-folder')]);
    record('G5zf', '--out a folder that does not exist is refused', r3.status === 2 && /^REFUSED: --out is not a folder/m.test(r3.stdout) ? [] : [`exit ${r3.status}: ${last(r3.stdout)}`], last(r3.stdout));
}
{
    for (const [id, t, what] of [['G6a', '2026-10-07 00:15', 'exactly now + 15 min'], ['G6b', '2026-10-07 08:44', 'the last T whose run ends before the reset'], ['G6c', '2026-10-07 10:00', 'T exactly at the reset'], ['G6d', '2026-10-07 04:30', 'an early-morning T'], ['G6e', '2026-10-07 23:00', 'the earlier fallback T'], ['G6f', '2026-10-08 00:00', 'exactly now + 24 h']]) {
        const d = folder(id); const r = gen(d, ['--t', t]);
        record(id, `--t ${t} (${what}) accepted: the bound is inclusive`, r.status === 0 && fs.readFileSync(path.join(d, 'launch-rd.cmd'), 'latin1').includes(`set NATIVELY_RD_T=${t}\r\n`) ? [] : [`exit ${r.status}: ${last(r.stdout)}`], last(r.stdout));
    }
    for (const [id, v] of [['G6g', '1'], ['G6h', '240']]) { const d = folder(id); const r = gen(d, ['--deadline-min', v]); record(id, `--deadline-min ${v} accepted`, r.status === 0 ? [] : [`exit ${r.status}: ${last(r.stdout)}`], last(r.stdout)); }
    const d = folder('G6i'); const r = gen(d, ['--passes', 'PREREGISTER-router-default.md,AMENDMENT-A1.md']);
    record('G6i', 'two --passes names accepted and carried into the sha-lines call', r.status === 0 && fs.readFileSync(path.join(d, 'launch-rd.cmd'), 'latin1').includes('--passes "PREREGISTER-router-default.md,AMENDMENT-A1.md"') ? [] : [`exit ${r.status}`], last(r.stdout));
}

// ---- 2. tamper detection: --check must fail on a changed file ---------------------------------------------------------------------
log('');
log('TAMPER (--check reads the written bytes back against the source)');
{
    const base = folder('tamper-base'); gen(base, FILLED);
    const orig = fs.readFileSync(path.join(base, 'launch-rd.cmd'));
    const tamper = (id, name, fn) => {
        const d = folder(id);
        fs.copyFileSync(path.join(base, 'launch-rd-dry.cmd'), path.join(d, 'launch-rd-dry.cmd'));
        fs.writeFileSync(path.join(d, 'launch-rd.cmd'), fn(Buffer.from(orig)));
        const r = node(GEN, ['--check', '--armed', '--out', d]);
        record(id, name, r.status === 1 && /FAIL/.test(r.stdout) ? [] : [`--check exit ${r.status}, wanted 1: ${last(r.stdout)}`], r.stdout.split(/\r?\n/).filter((l) => /^ {4}- /.test(l)).slice(0, 2).join(' | '));
    };
    const text = (fn) => (b) => Buffer.from(fn(b.toString('latin1')), 'latin1');
    tamper('T1', 'a trailing space added to a set line', text((t) => t.replace('set NATIVELY_LIVE_ROUTER=1\r\n', 'set NATIVELY_LIVE_ROUTER=1 \r\n')));
    tamper('T2', 'one CRLF turned into a bare LF', text((t) => t.replace('@echo off\r\n', '@echo off\n')));
    tamper('T3', 'one character of a rem line changed', text((t) => t.replace('Flight rd, task', 'Flight rx, task')));
    tamper('T4', 'a line deleted', text((t) => t.replace('set NATIVELY_FLIGHT_FOCUSED=off\r\n', '')));
    tamper('T5', 'a UTF-8 BOM put at the start', (b) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), b]));
    tamper('T6', 'a non-ASCII byte put into a rem line', (b) => { const i = b.indexOf('Registration PREREGISTER'); const o = Buffer.from(b); o[i] = 0xe9; return o; });
    tamper('T7', 'the placeholder-free value replaced by a different valid commit', text((t) => t.replace(COMMIT, '0'.repeat(40))));
    tamper('T8', 'the flight call changed to another label', text((t) => t.replace('router-default-r1 >>', 'router-default-r2 >>')));
    tamper('T9', 'the file truncated (the last two lines gone)', text((t) => t.split('\r\n').slice(0, -3).join('\r\n') + '\r\n'));
    tamper('T10', 'the --require-precheck argument removed from the flight guard line', text((t) => t.replace('guard-rd.mjs" --require-precheck >>', 'guard-rd.mjs" >>')));
    const ok = node(GEN, ['--check', '--armed', '--out', base]);
    record('T0', 'control: the untouched pair passes --check --armed', ok.status === 0 ? [] : [`exit ${ok.status}`], last(ok.stdout));
}

// ---- 3. the lint: a mutated source must be REFUSED, the unmutated copy must pass --------------------------------------------------------
log('');
log('LINT (a copy of the generator beside a MUTATED source: refused, nothing written)');
{
    const srcText = fs.readFileSync(SRC, 'latin1');
    const mutant = (id, name, find, repl, wantRe) => {
        if (!srcText.includes(find)) throw new Error(`calibration bug: ${id}: text not found in the source: ${find}`);
        const d = folder(id);
        fs.copyFileSync(GEN, path.join(d, 'gen-launchers-rd.mjs'));
        fs.writeFileSync(path.join(d, 'launch-rd-src.txt'), srcText.replace(find, () => repl), 'latin1');
        const outDir = path.join(d, 'out'); fs.mkdirSync(outDir);
        const r = node(path.join(d, 'gen-launchers-rd.mjs'), ['--out', outDir, ...FILLED]);
        const written = fs.readdirSync(outDir);
        record(id, name, [...(r.status === 2 && wantRe.test(r.stdout) ? [] : [`exit ${r.status}: ${last(r.stdout)}`]), ...(written.length === 0 ? [] : [`files written: ${written.join(', ')}`])], r.stdout.split(/\r?\n/).filter((l) => /^ {2}\S/.test(l)).slice(0, 1).join(' ') || last(r.stdout));
    };
    {
        const d = folder('L0');
        fs.copyFileSync(GEN, path.join(d, 'gen-launchers-rd.mjs')); fs.writeFileSync(path.join(d, 'launch-rd-src.txt'), srcText, 'latin1');
        const outDir = path.join(d, 'out'); fs.mkdirSync(outDir);
        const r = node(path.join(d, 'gen-launchers-rd.mjs'), ['--out', outDir, ...FILLED]);
        record('L0', 'control: the UNMUTATED source through the same copy of the generator -> exit 0 (so the refusals below are the mutations\' doing)', r.status === 0 ? [] : [`exit ${r.status}: ${last(r.stdout)}`], last(r.stdout));
    }
    mutant('L1', 'a trailing space after a set value', 'set NATIVELY_LIVE_ROUTER=1\n', 'set NATIVELY_LIVE_ROUTER=1 \n', /trailing whitespace/);
    mutant('L2', 'a parenthesis inside an echo of an if-block (the 2026-09-20 failure shape)', 'echo live40 roster missing from this checkout >>', 'echo live40 roster (missing) from this checkout >>', /an echo inside an if-block holds one of/);
    mutant('L3', 'a percent sign inside an echo of an if-block', 'echo live40.wav missing - build the audio first >>', 'echo live40.wav 100% missing >>', /an echo inside an if-block holds one of/);
    mutant('L4', 'a parenthesis in a rem line', 'rem Guard: the harness must stop the app when a run ends - 5952b23.', 'rem Guard (the harness) must stop the app when a run ends - 5952b23.', /a rem line holds one of/);
    mutant('L5', 'a non-ASCII character', 'rem Guard: the audio must hold', 'rem Guard: the audio müst hold', /a character outside printable ASCII/);
    mutant('L6', 'an @@ token on a line that is not a placeholder set line', 'set NATIVELY_STT_PROVIDER=deepgram', 'set NATIVELY_STT_PROVIDER=@@deepgram@@', /an @@ token outside the four placeholder set lines/);
    mutant('L7', 'an unknown macro', 'set NATIVELY_RD_T={{T}}', 'set NATIVELY_RD_T={{TT}}', /unknown macro \{\{TT\}\}/);
    mutant('L8', 'a digit directly before >> (a handle redirect)', '{{NODE}} electron\\test\\golden\\interview60.run.mjs wav:check >> {{LOG}} 2>&1', '{{NODE}} electron\\test\\golden\\interview60.run.mjs wav:check 2>> {{LOG}} 2>&1', /a digit directly before >>/);
    mutant('L9', 'an if-block that is never closed (the last block of the flight launcher loses its closing parenthesis)', '  exit /b 3\n)\nexit /b %FLIGHT_EXIT%', '  exit /b 3\nexit /b %FLIGHT_EXIT%', /an if-block is never closed/);
    mutant('L9b', 'a closing parenthesis missing in the MIDDLE (two blocks run together): flagged because a block opens inside an open one', '  exit /b 7\n)\n', '  exit /b 7\n', /an if-block opens while the previous one is still open/);
    mutant('L10', 'a duplicated set line for a registered value (two NATIVELY_RD_T lines)', 'set NATIVELY_RD_T={{T}}\n', 'set NATIVELY_RD_T={{T}}\nset NATIVELY_RD_T={{T}}\n', /not exactly one NATIVELY_RD_T line/);
    mutant('L11', 'a section the generator does not use', '=== tail-dry ===', '=== tail-extra ===\nexit /b 0\n\n=== tail-dry ===', /section tail-extra is not used by any launcher/);
    mutant('L12', 'a section missing (tail-dry renamed)', '=== tail-dry ===', '=== tail-drx ===', /section tail-drx is not used|section tail-dry is missing/);
    mutant('L13', 'the registered-T set line removed', 'set NATIVELY_RD_T={{T}}\n', '', /not exactly one NATIVELY_RD_T line/);
    {
        const find = '{{NODE}} "%~dp0guard-rd.mjs" >> {{LOG}} 2>&1';
        if (!srcText.includes(find)) throw new Error('calibration bug: L14 text not found');
        const d = folder('L14');
        fs.copyFileSync(GEN, path.join(d, 'gen-launchers-rd.mjs'));
        fs.writeFileSync(path.join(d, 'launch-rd-src.txt'), srcText.replace(find, () => '{{NODE}} "%~dp0guard-rd.mjs" --require-precheck >> {{LOG}} 2>&1'), 'latin1');
        const outDir = path.join(d, 'out'); fs.mkdirSync(outDir);
        const r = node(path.join(d, 'gen-launchers-rd.mjs'), ['--out', outDir, ...FILLED]);
        record('L14', 'the dry guard line gets --require-precheck too (the twins no longer differ by exactly that one argument): the structure check FAILS, exit 1', r.status === 1 && /differ by exactly --require-precheck, in the flight launcher only: NO/.test(r.stdout) && /GENERATOR: FAILED/.test(r.stdout) ? [] : [`exit ${r.status}: ${last(r.stdout)}`], last(r.stdout));
    }
}

// ---- 4. rd-sha-lines.mjs and rd-proofs.mjs on the stub tree ---------------------------------------------------------------------------
log('');
log('HELPERS on a stub tree (a copy of the guard calibration\'s stub, cal\\launcher-stub: a throwaway repo, never MAIN)');
const STUB = path.join(CAL, 'launcher-stub');
fs.rmSync(STUB, { recursive: true, force: true, maxRetries: 5 });
function copyTree(from, to) { fs.mkdirSync(to, { recursive: true }); for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name); if (e.isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b); } }
copyTree(GUARD_STUB, STUB);
const touchTree = (dir, when) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) touchTree(p, when); else fs.utimesSync(p, when, when); } };
const gitS = (...a) => execFileSync('git', ['--no-optional-locks', '-C', STUB, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const put = (rel, text) => { const f = path.join(STUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
touchTree(path.join(STUB, 'dist-electron'), new Date(Date.now() + 60000));   // the dist is newer than every source (guard checks 9, r2, r3)
gitS('reset', '--hard', '-q');          // the guard calibration leaves its stub clean; make sure
const REG_TEXT = '# PREREGISTER-router-default (stub)\n';
put('electron/test/golden/passes/PREREGISTER-router-default.md', REG_TEXT);
put('electron/test/golden/live40.wav', 'RIFF stub\n');
put('electron/test/golden/interview60.run.mjs', "// stub harness. The marker the launcher greps for: process.on('exit', appStop)\nconst a = process.argv[2];\nprocess.exit(a === 'wav:check' ? (process.env.STUB_WAVCHECK === 'fail' ? 1 : 0) : 0);\n");
put('electron/test/golden/interview60.runs/.keep', '');
put('.gitignore', `${fs.readFileSync(path.join(STUB, '.gitignore'), 'utf8')}*.log\nelectron/test/golden/interview60.runs/*.log\n`);   // as MAIN's .gitignore does: the launcher's own log is untracked
gitS('add', '-A');
gitS('-c', 'user.name=cal', '-c', 'user.email=cal@example.invalid', 'commit', '-q', '-m', 'launcher stub');
const HEAD = gitS('rev-parse', 'HEAD').trim();
{
    const sl = path.join(HERE, 'rd-sha-lines.mjs');
    const r = node(sl, ['--root', STUB, '--passes', 'PREREGISTER-router-default.md', '--arming', path.join(WORK, 'no-arming.md')]);
    const want = sha(Buffer.from(REG_TEXT));
    record('H1', 'rd-sha-lines: the committed registration -> HEAD line, its sha256, ARMING absent, exit 0', r.status === 0 && r.stdout.includes(`SHA LINES HEAD ${HEAD}`) && r.stdout.includes(`PASSES PREREGISTER-router-default.md sha256=${want}`) && /^ARMING absent$/m.test(r.stdout) ? [] : [`exit ${r.status}: ${clip(r.stdout, 300)}`], last(r.stdout));
    const arm = path.join(WORK, 'arming-stub.md'); fs.writeFileSync(arm, 'stub record\n');
    const r2 = node(sl, ['--root', STUB, '--passes', 'PREREGISTER-router-default.md', '--arming', arm]);
    record('H2', 'rd-sha-lines: an arming record present -> its sha256 line', r2.status === 0 && r2.stdout.includes(`ARMING sha256=${sha(Buffer.from('stub record\n'))}`) ? [] : [`exit ${r2.status}: ${clip(r2.stdout, 300)}`], last(r2.stdout));
    const r3 = node(sl, ['--root', STUB, '--passes', 'PREREGISTER-router-default.md,NOT-COMMITTED.md', '--arming', arm]);
    record('H3', 'rd-sha-lines: a text that is not committed at HEAD -> "MISSING at HEAD", exit 1', r3.status === 1 && /^PASSES NOT-COMMITTED\.md MISSING at HEAD$/m.test(r3.stdout) ? [] : [`exit ${r3.status}: ${clip(r3.stdout, 300)}`], last(r3.stdout));
    fs.writeFileSync(path.join(STUB, 'electron/test/golden/passes/PREREGISTER-router-default.md'), 'EDITED AFTER THE COMMIT\n');
    const r4 = node(sl, ['--root', STUB, '--passes', 'PREREGISTER-router-default.md', '--arming', arm]);
    record('H4', 'rd-sha-lines: the working copy edited after the commit -> the line still prints the COMMITTED text\'s sha256', r4.status === 0 && r4.stdout.includes(`sha256=${want}`) ? [] : [`exit ${r4.status}: ${clip(r4.stdout, 300)}`], last(r4.stdout));
    gitS('checkout', '-q', '--', 'electron/test/golden/passes/PREREGISTER-router-default.md');
    const r5 = node(sl, ['--root', STUB, '--passes', 'a/b.md', '--arming', arm]);
    record('H5', 'rd-sha-lines: a --passes name with a path separator -> usage, exit 2', r5.status === 2 ? [] : [`exit ${r5.status}`], last(r5.stdout));
}
{
    const prf = path.join(HERE, 'rd-proofs.mjs');
    const LAYOUT = path.join(WORK, 'proofs-layout');
    // rd-proofs resolves SP two folders above itself: mirror that (dist-proof.mjs at the root, the script in router-default\flight)
    fs.mkdirSync(path.join(LAYOUT, 'router-default', 'flight'), { recursive: true });
    fs.copyFileSync(path.join(SP, 'dist-proof.mjs'), path.join(LAYOUT, 'dist-proof.mjs'));
    fs.copyFileSync(prf, path.join(LAYOUT, 'router-default', 'flight', 'rd-proofs.mjs'));
    const rp = path.join(LAYOUT, 'router-default', 'flight', 'rd-proofs.mjs');
    const D = path.join(STUB, 'dist-electron', 'electron');
    const logFile = path.join(WORK, 'launcher.log');
    const before = node(rp, ['--root', STUB]);
    const shaLines = before.stdout.split(/\r?\n/).filter((l) => /^RD PROOFS \S+ sha256 [0-9a-f]{64}$/.test(l));
    record('H6', 'rd-proofs (before the run): the cue build proof passes, the three router markers read True, three sha256 lines, "RD PROOFS: ALL PASSED", exit 0', before.status === 0 && /RD PROOFS: ALL PASSED/.test(before.stdout) && shaLines.length === 3 && (before.stdout.match(/^RD MARKER .* True$/gm) ?? []).length === 3 ? [] : [`exit ${before.status}: ${clip(before.stdout.split(/\r?\n/).slice(-8).join(' | '), 400)}`], last(before.stdout));
    const writeLog = (body) => fs.writeFileSync(logFile, `=== LAUNCHER x ===\n=== DIST BEFORE THE RUN ===\n${body}\n=== FLIGHT EXIT 0 ===\n=== DIST AFTER THE RUN ===\n`);
    writeLog(before.stdout);
    const same = node(rp, ['--root', STUB, '--same-as-log', logFile]);
    record('H7', 'rd-proofs --same-as-log with the unchanged dist -> three "unchanged since the run started: yes", ALL PASSED, exit 0', same.status === 0 && (same.stdout.match(/unchanged since the run started: yes/g) ?? []).length === 3 ? [] : [`exit ${same.status}: ${clip(same.stdout.split(/\r?\n/).slice(-5).join(' | '), 400)}`], last(same.stdout));
    for (const [id, rel] of [['H8', 'audio/LiveRouterSession'], ['H9', 'services/routerArbiter'], ['H10', 'services/routeReader']]) {
        const f = path.join(D, `${rel}.js`); const keep = fs.readFileSync(f);
        fs.appendFileSync(f, '\n// one byte changed during the run\n');
        const r = node(rp, ['--root', STUB, '--same-as-log', logFile]);
        fs.writeFileSync(f, keep);
        record(id, `rd-proofs --same-as-log after ${rel}.js changed during the run -> FAILED (sha-changed ${rel}), exit 1 (the other two still read yes)`, r.status === 1 && r.stdout.includes(`sha-changed ${rel}`) && (r.stdout.match(/unchanged since the run started: yes/g) ?? []).length === 2 ? [] : [`exit ${r.status}: ${last(r.stdout)}`], last(r.stdout));
    }
    fs.writeFileSync(logFile, `=== LAUNCHER x ===\nno banner here\n`);
    const nb = node(rp, ['--root', STUB, '--same-as-log', logFile]);
    record('H11', 'rd-proofs --same-as-log with NO "DIST BEFORE THE RUN" banner in the log -> FAILED (sha-before-not-found), exit 1', nb.status === 1 && /sha-before-not-found/.test(nb.stdout) ? [] : [`exit ${nb.status}: ${last(nb.stdout)}`], last(nb.stdout));
    // fix1 M1: the REAL shape. The launcher appends the proofs' own stdout to the log it reads (a file descriptor, not a captured pipe), AFTER the AFTER banner.
    const appendRun = (logText, rpScript) => {
        fs.writeFileSync(logFile, logText);
        const fd = fs.openSync(logFile, 'a');
        const r = spawnSync(process.execPath, [rpScript, '--root', STUB, '--same-as-log', logFile], { stdio: ['ignore', fd, fd], timeout: 120000 });
        fs.closeSync(fd);
        return { status: r.status, text: fs.readFileSync(logFile, 'utf8') };
    };
    const beforeLines = before.stdout.split(/\r?\n/);
    const lackOne = beforeLines.filter((l) => !/^RD PROOFS services\/routeReader\.js sha256 /.test(l)).join('\n');
    const full = `=== LAUNCHER x ===\n=== DIST BEFORE THE RUN ===\n${before.stdout}\n=== FLIGHT EXIT 0 ===\n=== DIST AFTER THE RUN ===\n`;
    const short = `=== LAUNCHER x ===\n=== DIST BEFORE THE RUN ===\n${lackOne}\n=== FLIGHT EXIT 0 ===\n=== DIST AFTER THE RUN ===\n`;
    const good = appendRun(full, rp);
    record('H11c', 'rd-proofs in the launcher\'s real shape (its stdout APPENDED to the log after the AFTER banner), complete before section -> exit 0', good.status === 0 && (good.text.match(/unchanged since the run started: yes/g) ?? []).length === 3 ? [] : [`exit ${good.status}`], `exit ${good.status}`);
    const lack = appendRun(short, rp);
    record('H11b', 'rd-proofs in the real shape with a before section that LACKS the routeReader line: the after line must not be compared with itself -> FAILED (sha-before-not-found routeReader), exit 1', lack.status === 1 && /sha-before-not-found services\/routeReader/.test(lack.text) ? [] : [`exit ${lack.status}`], `exit ${lack.status}`);
    const OLDP = path.join(LAYOUT, 'router-default', 'flight', 'rd-proofs-unbounded.mjs');
    const psrc = fs.readFileSync(prf, 'utf8');
    const cut = "if (j >= 0) section = section.slice(0, j);";
    if (!psrc.includes(cut)) throw new Error('calibration bug: the bound line is not in rd-proofs.mjs');
    fs.writeFileSync(OLDP, psrc.replace(cut, '// (bound removed)'));
    const unb = appendRun(short, OLDP);
    record('H11d', 'MUTANT: rd-proofs without the AFTER-banner bound reads H11b as a PASS (the vacuous path the review found) -> H11b would read BAD', unb.status === 0 ? [] : [`the unbounded mutant exited ${unb.status}, not 0: H11b cannot tell it from the real script`], `exit ${unb.status} (0 = the vacuous pass)`);
    fs.writeFileSync(logFile, `=== LAUNCHER x ===\n=== DIST BEFORE THE RUN ===\n${before.stdout}\n=== FLIGHT EXIT 0 ===\n=== DIST AFTER THE RUN ===\n`);
    const f1 = path.join(D, 'main.js'); const k1 = fs.readFileSync(f1);
    fs.writeFileSync(f1, k1.toString('utf8').split('[Router] flag NATIVELY_LIVE_ROUTER=').join('[Router] flag NATIVELY_LIVE_ROUTOR='));
    const nm = node(rp, ['--root', STUB]);
    fs.writeFileSync(f1, k1);
    record('H12', 'rd-proofs: the built main.js without the [Router] flag line code -> FAILED (marker main), exit 1', nm.status === 1 && /RD MARKER dist-electron\/electron\/main\.js \[Router\] flag NATIVELY_LIVE_ROUTER= False/.test(nm.stdout) && /marker main/.test(nm.stdout) ? [] : [`exit ${nm.status}: ${last(nm.stdout)}`], last(nm.stdout));
    const f2 = path.join(D, 'audio/LiveRouterSession.js'); const k2 = fs.readFileSync(f2);
    fs.writeFileSync(f2, k2.toString('utf8').split('ROUTER_SHAS_OK').join('ROUTER_SHAS_OX'));
    const nm2 = node(rp, ['--root', STUB]);
    fs.writeFileSync(f2, k2);
    record('H13', 'rd-proofs: LiveRouterSession.js without ROUTER_SHAS_OK -> FAILED, exit 1', nm2.status === 1 && /marker audio\/LiveRouterSession ROUTER_SHAS_OK/.test(nm2.stdout) ? [] : [`exit ${nm2.status}: ${last(nm2.stdout)}`], last(nm2.stdout));
    const f3 = path.join(D, 'services/routeReader.js'); const k3 = fs.readFileSync(f3); fs.rmSync(f3);
    const nm3 = node(rp, ['--root', STUB]);
    fs.writeFileSync(f3, k3);
    record('H14', 'rd-proofs: routeReader.js missing from the dist -> FAILED (routeReader.js missing), exit 1', nm3.status === 1 && /services\/routeReader\.js missing/.test(nm3.stdout) ? [] : [`exit ${nm3.status}: ${last(nm3.stdout)}`], last(nm3.stdout));
    const f4 = path.join(D, 'llm/verbalStreamFilter.js'); const k4 = fs.readFileSync(f4);
    fs.writeFileSync(f4, k4.toString('utf8').split('CUE_LINE_PREFIX').join('CUE_LINE_PFX'));
    const nm4 = node(rp, ['--root', STUB]);
    fs.writeFileSync(f4, k4);
    record('H15', 'rd-proofs: the cue build proof fails (CUE_LINE_PREFIX renamed) -> FAILED (dist-proof), exit 1', nm4.status === 1 && /RD PROOFS: FAILED \(dist-proof\)/.test(nm4.stdout) ? [] : [`exit ${nm4.status}: ${last(nm4.stdout)}`], last(nm4.stdout));
    const r1 = node(rp, ['--root', 'electron']);
    record('H16', 'rd-proofs: a relative --root -> usage, exit 2 (dist-proof.mjs fails on a relative root)', r1.status === 2 && /must be an absolute path/.test(r1.stdout) ? [] : [`exit ${r1.status}: ${last(r1.stdout)}`], last(r1.stdout));
}

// ---- 5. the launchers run by cmd.exe: the exit-code ladder ------------------------------------------------------------------------------------
log('');
log('EXIT CODES (cmd.exe running the GENERATED launchers in the stub tree; the helpers sit beside the launcher as in the real folder)');
{
    // fix2: the guard (g4) reads the REAL clock, so these runs use a T five minutes from the real now (the start window is [T - 6, T + 30]); the generator gets a calibration clock 20 min before T.
    // (The generator refuses a T whose run crosses 10:00 local, so this section cannot be run between 08:45 and 10:00 local.)
    const tm5 = new Date(Math.floor(Date.now() / 60000) * 60000 + 5 * 60000);
    const RUN_T = new Date(tm5.getTime() + 3 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
    const RUN_NOW = new Date(tm5.getTime() - 20 * 60000).toISOString();
    const LAY = path.join(WORK, 'cmd-layout', 'router-default', 'flight');
    fs.mkdirSync(LAY, { recursive: true });
    fs.copyFileSync(path.join(SP, 'dist-proof.mjs'), path.join(WORK, 'cmd-layout', 'dist-proof.mjs'));
    for (const f of ['rd-sha-lines.mjs', 'rd-proofs.mjs', 'guard-rd.mjs', 'guard-rd-g' + 'it.mjs']) fs.copyFileSync(path.join(HERE, f), path.join(LAY, f));
    const mk = (args) => { gen(LAY, args); };
    const run = (id, name, launcher, cwd, wantExit, wantErrRe, env = {}) => {
        fs.rmSync(ERRLOG, { force: true });
        const r = spawnSync('cmd.exe', ['/c', path.join(LAY, launcher)], { cwd, encoding: 'utf8', timeout: 180000, env: { ...process.env, ...env } });
        const err = fs.existsSync(ERRLOG) ? fs.readFileSync(ERRLOG, 'latin1').trim() : '(no error log)';
        fs.rmSync(ERRLOG, { force: true });
        const why = [];
        if (r.status !== wantExit) why.push(`exit ${r.status}, wanted ${wantExit}`);
        if (wantErrRe && !wantErrRe.test(err)) why.push(`error log ${JSON.stringify(clip(err, 120))} does not match ${wantErrRe}`);
        record(id, name, why, `exit ${r.status}; error log: ${clip(err.replace(/\r?\n/g, ' / '), 200)}`);
        return { r, err };
    };
    const logOf = () => { const f = path.join(STUB, 'electron', 'test', 'golden', 'interview60.runs', 'flight-rd-dry.launcher.log'); return fs.existsSync(f) ? fs.readFileSync(f, 'latin1') : ''; };
    const empty = path.join(WORK, 'empty-cwd'); fs.mkdirSync(empty, { recursive: true });
    mk(['--commit', HEAD, '--t', RUN_T, '--now', RUN_NOW, '--deadline-min', '40', '--ctx-sha12', CTX, '--extra-requests', '12']);
    run('X9', 'cwd without interview60.flight.mjs -> exit 9 "wrong working directory"', 'launch-rd-dry.cmd', empty, 9, /wrong working directory/);
    const flightMjs = path.join(STUB, 'electron/test/golden/interview60.flight.mjs');
    const wav = path.join(STUB, 'electron/test/golden/live40.wav'); const q = path.join(STUB, 'electron/test/golden/live40.questions.mjs'); const rm = path.join(STUB, 'electron/test/golden/interview60.run.mjs');
    const keepWav = fs.readFileSync(wav); fs.rmSync(wav);
    run('X8', 'live40.wav missing -> exit 8', 'launch-rd-dry.cmd', STUB, 8, /live40\.wav missing/);
    fs.writeFileSync(wav, keepWav);
    const keepQ = fs.readFileSync(q); fs.rmSync(q);
    run('X7', 'live40.questions.mjs missing -> exit 7', 'launch-rd-dry.cmd', STUB, 7, /live40 roster missing/);
    fs.writeFileSync(q, keepQ);
    const keepRm = fs.readFileSync(rm, 'utf8');
    fs.writeFileSync(rm, keepRm.replace("process.on('exit', appStop)", "process.on('exit', appStopX)"));
    run('X6', 'the harness without the appStop marker -> exit 6', 'launch-rd-dry.cmd', STUB, 6, /does not stop the app/);
    fs.writeFileSync(rm, keepRm);
    mk(['--commit', '@@REGISTERED_HEAD_FULL_HASH@@']);
    // regenerate with the placeholder commit but filled other values: generate into a fresh folder state
    fs.rmSync(path.join(LAY, 'launch-rd.cmd'), { force: true }); fs.rmSync(path.join(LAY, 'launch-rd-dry.cmd'), { force: true });
    gen(LAY, ['--t', RUN_T, '--now', RUN_NOW, '--deadline-min', '40', '--ctx-sha12', CTX, '--extra-requests', '12']);
    run('X12', 'the commit still a placeholder -> exit 12 "not a full 40 character hash"', 'launch-rd-dry.cmd', STUB, 12, /not a full 40 character hash/);
    const ph = fs.readFileSync(path.join(LAY, 'launch-rd-dry.cmd'), 'latin1');
    for (const [id, bad, what] of [['X12b', COMMIT.slice(0, 39), 'a 39-character hash'], ['X12c', `${COMMIT}0`, 'a 41-character hash'], ['X12d', COMMIT.toUpperCase(), 'an uppercase hash'], ['X12e', 'g'.repeat(40), 'non-hex characters']]) {
        const f = path.join(LAY, 'cmd-bad.cmd');
        fs.writeFileSync(f, ph.replace('@@REGISTERED_HEAD_FULL_HASH@@', bad), 'latin1');
        fs.rmSync(ERRLOG, { force: true });
        const r = spawnSync('cmd.exe', ['/c', f], { cwd: STUB, encoding: 'utf8', timeout: 120000 });
        const err = fs.existsSync(ERRLOG) ? fs.readFileSync(ERRLOG, 'latin1').trim() : '(none)'; fs.rmSync(ERRLOG, { force: true });
        record(id, `the launcher's commit check refuses ${what} -> exit 12`, r.status === 12 && /not a full 40 character hash/.test(err) ? [] : [`exit ${r.status}; ${err}`], `exit ${r.status}`);
    }
    fs.rmSync(path.join(LAY, 'cmd-bad.cmd'), { force: true });
    // a full hash that is not HEAD's passes the launcher's own format check, then the committed-text lines run
    fs.rmSync(path.join(LAY, 'launch-rd.cmd'), { force: true }); fs.rmSync(path.join(LAY, 'launch-rd-dry.cmd'), { force: true });
    gen(LAY, ['--commit', HEAD, '--t', RUN_T, '--now', RUN_NOW, '--deadline-min', '40', '--ctx-sha12', CTX, '--extra-requests', '12', '--passes', 'PREREGISTER-router-default.md,NOT-COMMITTED.md']);
    run('X14', 'a committed text missing at HEAD (the --passes list names one that is not there) -> exit 14', 'launch-rd-dry.cmd', STUB, 14, /a committed text is missing at HEAD/);
    fs.rmSync(path.join(LAY, 'launch-rd.cmd'), { force: true }); fs.rmSync(path.join(LAY, 'launch-rd-dry.cmd'), { force: true });
    gen(LAY, ['--commit', HEAD, '--t', RUN_T, '--now', RUN_NOW, '--deadline-min', '40', '--ctx-sha12', CTX, '--extra-requests', '12']);
    run('X5', 'wav:check failing (the stub harness exits 1 for it) -> exit 5', 'launch-rd-dry.cmd', STUB, 5, /does not match the live40 roster/, { STUB_WAVCHECK: 'fail' });
    const lg = logOf();
    record('X5b', 'the dry launcher\'s own log shows the sha lines FIRST (SHA LINES HEAD, PASSES ... sha256=, ARMING absent) before the wav:check failure', /SHA LINES HEAD [0-9a-f]{40}\r?\nPASSES PREREGISTER-router-default\.md sha256=[0-9a-f]{64}\r?\nARMING absent/.test(lg) ? [] : ['the log lacks the sha lines'], clip(lg.replace(/\r?\n/g, ' / '), 300));
    const keepDist = path.join(STUB, 'dist-electron', 'electron', 'services', 'routeReader.js'); const kd = fs.readFileSync(keepDist); fs.rmSync(keepDist);
    run('X3', 'the router dist proofs failing before the run (routeReader.js missing from the dist) -> exit 3', 'launch-rd-dry.cmd', STUB, 3, /router dist proofs 1 failed/);
    fs.writeFileSync(keepDist, kd);
    run('X4', 'every step before the guard passing, the guard then refusing (no RESULT-smoke.md at LAB in this stub layout) -> exit 4 "behavioural guard failed"', 'launch-rd-dry.cmd', STUB, 4, /behavioural guard failed/);
    const lg2 = logOf();
    const guardFail = (lg2.match(/GUARD FAILED: \((\w+)\)/g) ?? []).pop();
    record('X4b', 'the log names the guard\'s first failing check as r6 (the smoke result): every earlier guard check passed through the REAL launcher environment (roster, models, hedge, router flag, earlier-question, T window, tree, ANSWER_MODELS, arms, cue build, router build)', guardFail === 'GUARD FAILED: (r6)' ? [] : [`the last guard failure line: ${guardFail ?? '(none)'}`], guardFail ?? '(none)');
    const lgDist = /=== DIST BEFORE THE RUN ===[\s\S]*RD PROOFS: ALL PASSED/.test(lg2);
    record('X4c', 'the log holds the BEFORE banner and "RD PROOFS: ALL PASSED" (the proofs ran inside the launcher)', lgDist ? [] : ['no proof output in the log'], '');
    // the real flight launcher: the same chain with --require-precheck, then the guard refusing at r6 first (the precheck stamp is read at g5, after r6)
    const f = path.join(LAY, 'launch-rd.cmd');
    fs.rmSync(ERRLOG, { force: true });
    const rf = spawnSync('cmd.exe', ['/c', f], { cwd: STUB, encoding: 'utf8', timeout: 180000, env: { ...process.env } });
    fs.rmSync(ERRLOG, { force: true });
    const flightLog = fs.readFileSync(path.join(STUB, 'electron', 'test', 'golden', 'interview60.runs', 'flight-rd.launcher.log'), 'latin1');
    record('X4d', 'the FLIGHT launcher through the same ladder stops at the guard too (exit 4) and never starts the flight: no "FLIGHT EXIT" line in its log', rf.status === 4 && !/FLIGHT EXIT/.test(flightLog) && /GUARD FAILED: \(r6\)/.test(flightLog) ? [] : [`exit ${rf.status}; FLIGHT EXIT in log: ${/FLIGHT EXIT/.test(flightLog)}`], `exit ${rf.status}`);
    // fix4 H1: the guard's window-only exit (10) through the REAL generated launchers, with the real guard swapped for a stub that exits with a chosen code (the real guard's own
    // exit 10 is proved in guard-rd-cal; the stub proves the LAUNCHER's reading of it: log line, no error log, exit code). The real guard is put back afterwards.
    {
        const gpath = path.join(LAY, 'guard-rd.mjs'); const greal = fs.readFileSync(gpath);
        const stubGuard = (code, line) => fs.writeFileSync(gpath, "console.error(" + JSON.stringify(line) + "); process.exit(" + code + ");\n");
        const lastLine = (txt) => txt.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).pop() ?? '';
        const dryLogF = path.join(STUB, 'electron', 'test', 'golden', 'interview60.runs', 'flight-rd-dry.launcher.log');
        const flightLogF = path.join(STUB, 'electron', 'test', 'golden', 'interview60.runs', 'flight-rd.launcher.log');
        const runL = (launcher) => { fs.rmSync(ERRLOG, { force: true }); const r = spawnSync('cmd.exe', ['/c', path.join(LAY, launcher)], { cwd: STUB, encoding: 'utf8', timeout: 180000 }); const errExists = fs.existsSync(ERRLOG); const err = errExists ? fs.readFileSync(ERRLOG, 'latin1').trim() : ''; fs.rmSync(ERRLOG, { force: true }); return { status: r.status, errExists, err }; };
        const WINDOW_LINE = 'GUARD FAILED: (g4-clock) stub: only the clock';
        try {
            stubGuard(10, WINDOW_LINE);
            const a = runL('launch-rd-dry.cmd'); const aLog = fs.readFileSync(dryLogF, 'latin1');
            record('X5a', 'DRY launcher, the guard exiting 10 (window only): exit 10 and NO error log written', a.status === 10 && !a.errExists ? [] : [`exit ${a.status}, error log ${a.errExists ? JSON.stringify(a.err.slice(0, 80)) : 'absent'}`], `exit ${a.status}; error log ${a.errExists ? 'PRESENT' : 'absent'}`);
            record('X5b2', 'the dry log ENDS with the launcher line "GUARD WINDOW ONLY exit 10" and the guard\'s own g4-clock line is just above it', /^=== LAUNCHER rd-dry GUARD WINDOW ONLY exit 10 - only g4-clock failed - no error log written ===$/.test(lastLine(aLog)) && aLog.trimEnd().split(/\r?\n/).slice(-2)[0].trim() === WINDOW_LINE ? [] : [`last line: ${lastLine(aLog)}`], lastLine(aLog));
            stubGuard(1, 'GUARD FAILED: (r6) stub: a real failure');
            const b = runL('launch-rd-dry.cmd'); const bLog = fs.readFileSync(dryLogF, 'latin1');
            record('X5c', 'DRY launcher, the guard exiting 1 (a real failure): exit 4 and the error log IS written', b.status === 4 && b.errExists && /behavioural guard failed/.test(b.err) ? [] : [`exit ${b.status}, error log ${b.errExists ? 'present' : 'ABSENT'}`], `exit ${b.status}; error log ${b.errExists ? 'PRESENT' : 'absent'}`);
            record('X5d', 'a real failure leaves the guard line last in the dry log (no WINDOW ONLY line)', /GUARD FAILED: \(r6\) stub/.test(lastLine(bLog)) && !/WINDOW ONLY/.test(lastLine(bLog)) ? [] : [`last line: ${lastLine(bLog)}`], lastLine(bLog));
            stubGuard(10, WINDOW_LINE);
            const c = runL('launch-rd.cmd'); const cLog = fs.readFileSync(flightLogF, 'latin1');
            record('X5e', 'the FLIGHT launcher, the guard exiting 10: the window is a real failure there: exit 4, the error log IS written, no flight', c.status === 4 && c.errExists && !/FLIGHT EXIT/.test(cLog) ? [] : [`exit ${c.status}, error log ${c.errExists ? 'present' : 'ABSENT'}`], `exit ${c.status}; error log ${c.errExists ? 'PRESENT' : 'absent'}`);
            stubGuard(0, 'x');
            // mutant: the dry launcher with the exit-10 branch looking for another code reads the window-only failure as a real one
            const dryTxt = fs.readFileSync(path.join(LAY, 'launch-rd-dry.cmd'), 'latin1');
            if (!dryTxt.includes('if "%GUARD_EXIT%"=="10" (')) throw new Error('calibration bug: the exit-10 branch is not in the dry launcher');
            stubGuard(10, WINDOW_LINE);
            fs.writeFileSync(path.join(LAY, 'launch-rd-dry-mut.cmd'), dryTxt.replace('if "%GUARD_EXIT%"=="10" (', 'if "%GUARD_EXIT%"=="11" ('), 'latin1');
            const m = runL('launch-rd-dry-mut.cmd');
            record('X5f', 'MUTANT: the exit-10 branch removed from the dry launcher reads the window-only failure as a real one (exit 4, error log written) -> X5a would read BAD', m.status === 4 && m.errExists ? [] : [`mutant exit ${m.status}, error log ${m.errExists ? 'present' : 'absent'}: X5a cannot tell it from the real launcher`], `mutant exit ${m.status}; error log ${m.errExists ? 'PRESENT' : 'absent'}`);
            fs.rmSync(path.join(LAY, 'launch-rd-dry-mut.cmd'), { force: true });
        } finally { fs.writeFileSync(gpath, greal); }
    }
}
log('');
const errLeft = fs.existsSync(ERRLOG);
record('Z1', 'clean-up: %TEMP%\\natively-rd-launcher-error.log is ABSENT (the precheck\'s error-log gate requires it absent at arming)', errLeft ? ['the error log is PRESENT'] : [], ERRLOG);

const bads = results.filter((x) => !x.good);
log('');
log(bads.length ? `LAUNCHER CALIBRATION: FAILED (${bads.map((b) => b.id).join(', ')})` : `LAUNCHER CALIBRATION OK ${results.length}/${results.length}`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length ? 1 : 0);
