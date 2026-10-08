// E\launchers-eq-cal.mjs - calibration driver for the flight-eq launcher family (b7): gen-launchers-eq.mjs + launch-eq-src.txt,
// eq-sha-lines.mjs, eq-proofs.mjs, and the launcher itself run as guards-only copies from MAIN's folder (the flight-launcher-guards
// note's four steps). Writes E\launchers-eq-cal.txt; exit 0 only if every counted case reads as expected.
// SAFETY, stated once. Nothing here starts the app, the probe or a flight, and no scheduled task is touched. MAIN is only READ:
// the guards-only copy runs with the working directory MAIN but its log is redirected into E (the one substitution besides the
// guard line's calibration options, both asserted below). The only file written outside E is the launcher's own error log,
// %TEMP%\natively-eq-launcher-error.log, by the mangled-marker cases; it is deleted after each case and proven absent at the end.
// The cal-generated launchers live in E\launchers-cal\ and hold a CAL commit (MAIN's HEAD) and a CAL T; the controller's real
// launchers are generated into E by the controller with the registered HEAD and T (this driver never writes E\launch-eq*.cmd).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(E, '..');
const CAL = path.join(E, 'launchers-cal');
const OUT = path.join(E, 'launchers-eq-cal.txt');
const STUBS = path.join(E, 'guard-eq-cal-stubs');           // written by guard-eq-cal.mjs (settings, smoke result, precheck stamps)
const ERRLOG = path.join(process.env.TEMP ?? os.tmpdir(), 'natively-eq-launcher-error.log');

function findMain() {
    const od = path.join(os.homedir(), 'OneDrive');
    for (const d of fs.readdirSync(od)) { if (!d.startsWith('Masa')) continue; const c = path.join(od, d, 'natively-cluely-ai-assistant'); if (fs.existsSync(path.join(c, '.git'))) return c; }
    throw new Error('MAIN not found under OneDrive');
}
const MAIN = findMain();
const home = os.homedir().replace(/\\/g, '/');
const REAL_SETTINGS = `//localhost/${home[0]}$/${home.slice(3)}/AppData/Roaming/natively/settings.json`;
const gitMain = (...a) => execFileSync('git', ['--no-optional-locks', '-C', MAIN, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const MAIN_HEAD = gitMain('rev-parse', 'HEAD').trim();
const CAL_T = '2026-10-05 21:00';
const NOW_OK = '2026-10-05T21:01:00+03:00';
const sha12 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
const copyTree = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const ent of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, ent.name), b = path.join(to, ent.name); if (ent.isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b); } };

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);
function record(id, name, good, detail, info = false) {
    results.push({ id, good, info });
    log(`${good ? 'ok  ' : (info ? 'INFO' : 'BAD ')} ${id.padEnd(5)} ${name}`);
    if (detail) log(`      ${clip(detail, 700)}`);
}
const node = (script, args, opts = {}) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 180000, ...opts });
const lastLine = (s) => (s ?? '').trim().split(/\r?\n/).pop() ?? '';

fs.rmSync(CAL, { recursive: true, force: true });
fs.mkdirSync(CAL, { recursive: true });
log('launchers-eq-cal.mjs calibration (b7; A2.10 P7; A4.6 m9; A5.2; the flight-launcher-guards note\'s four steps)');
log('');
log(`MAIN ${MAIN} HEAD ${MAIN_HEAD} (read only); CAL T ${CAL_T}; the cal launchers are in ${CAL}`);
log('');

// ---- 1. the generator ------------------------------------------------------------------------------------------------------
log('GENERATOR (gen-launchers-eq.mjs)');
const GEN = path.join(E, 'gen-launchers-eq.mjs');
const SRC = path.join(E, 'launch-eq-src.txt');
const srcText = fs.readFileSync(SRC, 'latin1');
function genDir(name, srcMutator) {
    const d = path.join(CAL, name);
    fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(GEN, path.join(d, 'gen-launchers-eq.mjs'));
    let t = srcText;
    if (srcMutator) { const m = srcMutator(t); if (m === t) throw new Error(`calibration bug: source mutant ${name} changed nothing`); t = m; }
    fs.writeFileSync(path.join(d, 'launch-eq-src.txt'), t, 'latin1');
    return d;
}
const gen = (d, args) => node(path.join(d, 'gen-launchers-eq.mjs'), args, { cwd: d });

{   // the good generation, filled
    const d = genDir('ok');
    const r = gen(d, ['--commit', MAIN_HEAD, '--t', CAL_T, '--passes', '2026-10-04-turn-followup-result.md,PREREGISTER-h40d.md']);
    record('L1', 'generate with a full commit, T and a passes list -> BOTH FILES PASS, exit 0, the two structure lines YES', r.status === 0 && /GENERATOR: BOTH FILES PASS/.test(r.stdout) && (r.stdout.match(/: YES/g) ?? []).length === 2 && /commit filled {2}T filled/.test(r.stdout), lastLine(r.stdout));
    const c = gen(d, ['--check', '--armed']);
    record('L2', '--check --armed on the filled launchers -> PASS, PLACEHOLDERS: none', c.status === 0 && /PLACEHOLDERS: none/.test(c.stdout), lastLine(c.stdout));
    const a = fs.readFileSync(path.join(d, 'launch-eq.cmd')), b = fs.readFileSync(path.join(d, 'launch-eq-dry.cmd'));
    const nonAscii = (buf) => [...buf].filter((x) => x > 0x7e || (x < 0x20 && x !== 0x0d && x !== 0x0a)).length;
    const crs = (buf) => [...buf].filter((x) => x === 0x0d).length;
    const lines = (buf) => buf.toString('latin1').split('\r\n').length - 1;
    const bareLf = (buf) => buf.toString('latin1').replace(/\r\n/g, '').split('').filter((x) => x === '\n').length;
    record('L3', 'an INDEPENDENT scan (not the generator\'s own): both files ASCII, CR count == line count == CRLF count, no bare LF, no BOM',
        [a, b].every((f) => nonAscii(f) === 0 && crs(f) === lines(f) && bareLf(f) === 0 && !(f[0] === 0xef)), `launch-eq.cmd ${a.length} bytes ${lines(a)} lines ${crs(a)} CR; launch-eq-dry.cmd ${b.length} bytes ${lines(b)} lines ${crs(b)} CR`);
    const txt = a.toString('latin1');
    record('L4', 'the real launcher passes --require-precheck on its guard line; the dry launcher does not', /guard-eq\.mjs" --require-precheck >>/.test(txt) && !/--require-precheck/.test(b.toString('latin1').replace(/^rem .*$/gm, '')), '');
    record('L5', 'the sha lines come first: the eq-sha-lines call is the first command after the start banner in both launchers, before wav:check and the proofs',
        [txt, b.toString('latin1')].every((t) => { const i = t.indexOf('eq-sha-lines.mjs'), j = t.indexOf('wav:check >>'), k = t.indexOf('eq-proofs.mjs'); const s = t.indexOf('=== LAUNCHER'); return s > 0 && s < i && i < j && j < k; }), '');
    record('L6', 'the T and the commit and the flag lines are in the environment block: NATIVELY_EARLIER_QUESTION=1, NATIVELY_FLIGHT_FOCUSED=off, NATIVELY_EQ_T=<T>, NATIVELY_ROSTER=scenario50, NATIVELY_SCENARIOS=S1,S2, no trailing space',
        ['set NATIVELY_EARLIER_QUESTION=1\r\n', 'set NATIVELY_FLIGHT_FOCUSED=off\r\n', `set NATIVELY_EQ_T=${CAL_T}\r\n`, 'set NATIVELY_ROSTER=scenario50\r\n', 'set NATIVELY_SCENARIOS=S1,S2\r\n', `set NATIVELY_FLIGHT_COMMIT=${MAIN_HEAD}\r\n`, 'set NATIVELY_VERBAL_HEDGE=\r\n', 'set NATIVELY_FOLLOWUP_PARENT=\r\n'].every((l) => txt.includes(l)), '');
}
{   // option refusals: nothing written
    const d = genDir('refuse');
    const refuse = (id, name, args, want) => { const r = gen(d, args); record(id, name, r.status === 2 && want.test(r.stdout) && !fs.existsSync(path.join(d, 'launch-eq.cmd')), `exit ${r.status} :: ${lastLine(r.stdout)}`); };
    refuse('L7', '--commit with 39 hex characters -> refused, nothing written', ['--commit', MAIN_HEAD.slice(0, 39)], /--commit is not a full 40 character/);
    refuse('L8', '--commit in uppercase -> refused', ['--commit', MAIN_HEAD.toUpperCase()], /--commit is not a full 40 character/);
    refuse('L9', '--t before the window (19:29) -> refused', ['--t', '2026-10-05 19:29'], /outside 2026-10-05 19:30/);
    refuse('L10', '--t after the window (2026-10-06 03:01) -> refused (A7: was 01:01)', ['--t', '2026-10-06 03:01'], /outside 2026-10-05 19:30 \.\. 2026-10-06 03:00/);
    refuse('L11', '--t impossible date -> refused', ['--t', '2026-02-30 21:00'], /not a valid/);
    refuse('L12', '--t in ISO form -> refused', ['--t', '2026-10-05T21:00'], /not a valid/);
    refuse('L13', '--passes with a path in it -> refused', ['--passes', '..\\x.md'], /--passes must be distinct file names/);
    refuse('L14', '--passes with a duplicate -> refused', ['--passes', 'a.md,a.md'], /--passes must be distinct/);
    refuse('L15', 'an unknown option -> refused', ['--bogus'], /unknown option --bogus/);
    refuse('L16', '--armed without --check -> refused', ['--armed'], /--armed belongs to --check/);
    refuse('L17', '--check with --commit -> refused', ['--check', '--commit', MAIN_HEAD], /--check writes nothing/);
    refuse('L18', '--t with no value -> refused', ['--t'], /--t needs a value/);
    const lo = gen(d, ['--t', '2026-10-05 19:30']), hi = gen(d, ['--t', '2026-10-06 03:00']), mid = gen(d, ['--t', '2026-10-06 01:01']);
    record('L19', '--t 2026-10-05 19:30, --t 2026-10-06 03:00 (A7 upper bound) and --t 2026-10-06 01:01 (outside before A7) are all accepted (the bounds are inclusive, as the guard\'s g4)', lo.status === 0 && hi.status === 0 && mid.status === 0, `exit ${lo.status} / ${hi.status} / ${mid.status}`);
}
{   // lint refusals: a mutated source text must be refused and nothing written
    const lintCase = (id, name, mut, want) => { const d = genDir(`lint-${id}`, mut); const r = gen(d, []); record(id, name, r.status === 2 && want.test(r.stdout) && !fs.existsSync(path.join(d, 'launch-eq.cmd')), `exit ${r.status} :: ${clip(r.stdout.trim().split(/\r?\n/).slice(0, 2).join(' | '), 200)}`); };
    lintCase('L20', 'a parenthesis in an echo inside an if-block (the 2026-09-20 defect) -> refused', (t) => t.replace('echo a committed text is missing at HEAD - see flight-{{LABEL}}.launcher.log', 'echo a committed text is missing at HEAD (see flight-{{LABEL}}.launcher.log)'), /an echo inside an if-block holds one of/);
    lintCase('L21', 'a percent sign in a rem line -> refused', (t) => t.replace('rem Guard: the harness must stop the app when a run ends - 5952b23.', 'rem Guard: the harness must stop the app when a run ends - 100% sure.'), /a rem line holds one of/);
    lintCase('L22', 'a non-ASCII character -> refused', (t) => t.replace('rem Guard: the audio must hold', 'rem Gu\u00e4rd: the audio must hold'), /outside printable ASCII/);
    lintCase('L23', 'a trailing space after a set value -> refused', (t) => t.replace('set NATIVELY_EQ_T={{T}}', 'set NATIVELY_EQ_T={{T}} '), /trailing whitespace/);
    lintCase('L24', 'an @@ token outside the commit and T lines -> refused', (t) => t.replace('set NATIVELY_API_URL=', 'set NATIVELY_API_URL=@@X@@'), /an @@ token outside/);
    lintCase('L25', 'an unknown macro -> refused', (t) => t.replace('wav:check >> {{LOG}}', 'wav:check >> {{LOGG}}'), /unknown macro/);
    lintCase('L26', 'a missing section -> refused', (t) => t.replace('=== guard-dry ===', '=== guard-wet ==='), /section guard-dry is missing|not used by any launcher/);
    lintCase('L27', 'a digit directly before >> (reads as a handle redirect) -> refused', (t) => t.replace('exit /b 9\n)', 'exit /b 9\n)\necho 2>> x\n'), /digit directly before/);
    lintCase('L28', 'an if-block never closed -> refused', (t) => t.replace('  exit /b 3\n)\nexit /b %FLIGHT_EXIT%', '  exit /b 3\nexit /b %FLIGHT_EXIT%'), /if-block is never closed/);
}
{   // byte tamper cases against the good launchers: --check must fail
    const base = path.join(CAL, 'ok');
    const tamper = (id, name, fn, want) => {
        const d = path.join(CAL, `tamper-${id}`);
        copyTree(base, d);
        const f = path.join(d, 'launch-eq.cmd');
        fn(f);
        const r = gen(d, ['--check']);
        record(id, name, r.status === 1 && want.test(r.stdout), `exit ${r.status} :: ${clip(r.stdout.split(/\r?\n/).find((l) => want.test(l)) ?? lastLine(r.stdout), 240)}`);
    };
    tamper('L29', 'the launcher saved with LF line ends only (what the Write tool produces) -> --check FAILS naming bare LF', (f) => fs.writeFileSync(f, fs.readFileSync(f, 'latin1').replace(/\r\n/g, '\n'), 'latin1'), /bare LF/);
    tamper('L30', 'the launcher with a UTF-8 BOM -> FAILS', (f) => fs.writeFileSync(f, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), fs.readFileSync(f)])), /UTF-8 BOM/);
    tamper('L31', 'one line changed by one character -> FAILS (differing)', (f) => fs.writeFileSync(f, fs.readFileSync(f, 'latin1').replace('exit /b 12', 'exit /b 13'), 'latin1'), /differ from the source/);
    tamper('L32', 'a smart quote (a byte above 126) added -> FAILS', (f) => fs.writeFileSync(f, fs.readFileSync(f, 'latin1').replace('rem Guard: the audio', 'rem Guard: the \u00e9audio'), 'latin1'), /above 126|byte\(s\) above/);
    tamper('L33', 'the commit value shortened to 39 characters in the file -> FAILS (neither the placeholder nor a hash)', (f) => fs.writeFileSync(f, fs.readFileSync(f, 'latin1').replace(`set NATIVELY_FLIGHT_COMMIT=${MAIN_HEAD}`, `set NATIVELY_FLIGHT_COMMIT=${MAIN_HEAD.slice(0, 39)}`), 'latin1'), /neither the placeholder nor a valid value/);
    // placeholders and --armed: the placeholder pair (E's own)
    const d = path.join(CAL, 'placeholders');
    fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(GEN, path.join(d, 'gen-launchers-eq.mjs')); fs.copyFileSync(SRC, path.join(d, 'launch-eq-src.txt'));
    const w = gen(d, []);
    const c1 = gen(d, ['--check']), c2 = gen(d, ['--check', '--armed']);
    record('L34', 'placeholder launchers: --check PASSES, --check --armed FAILS naming the placeholder', w.status === 0 && c1.status === 0 && c2.status === 1 && /still a placeholder/.test(c2.stdout), `write exit ${w.status}, check exit ${c1.status}, armed check exit ${c2.status}`);
    const k = gen(d, ['--commit', MAIN_HEAD]);
    const c3 = gen(d, ['--check', '--armed']);
    record('L35', 'a commit given but T left: --check --armed still FAILS (T is a placeholder); then T given -> the commit is KEPT and --armed PASSES', k.status === 0 && c3.status === 1 && /T placeholder/.test(c3.stdout) && gen(d, ['--t', CAL_T]).status === 0 && gen(d, ['--check', '--armed']).status === 0 && fs.readFileSync(path.join(d, 'launch-eq.cmd'), 'latin1').includes(`set NATIVELY_FLIGHT_COMMIT=${MAIN_HEAD}`), '');
}
log('');

// ---- 2. eq-sha-lines.mjs ---------------------------------------------------------------------------------------------------
log('SHA LINES (eq-sha-lines.mjs)');
{
    const SHA = path.join(E, 'eq-sha-lines.mjs');
    const known = '2026-10-04-turn-followup-result.md';
    const want = crypto.createHash('sha256').update(fs.readFileSync(path.join(MAIN, 'electron', 'test', 'golden', 'passes', known))).digest('hex');
    const noArming = path.join(CAL, 'no-arming.md');
    const r = node(SHA, ['--root', MAIN, '--passes', `${known},PREREGISTER-h40d.md`, '--arming', noArming]);
    record('S1', 'a committed passes file: the printed sha256 equals an independent hash of the file; PREREGISTER-h40d.md too; `ARMING absent`; exit 0', r.status === 0 && r.stdout.includes(`PASSES ${known} sha256=${want}`) && /PASSES PREREGISTER-h40d\.md sha256=[0-9a-f]{64}/.test(r.stdout) && /^ARMING absent$/m.test(r.stdout) && new RegExp(`^SHA LINES HEAD ${MAIN_HEAD}$`, 'm').test(r.stdout), r.stdout.trim().replace(/\r?\n/g, ' | ').replace(/sha256=([0-9a-f]{12})[0-9a-f]+/g, 'sha256=$1...'));
    const arming = path.join(CAL, 'arming-stub.md');
    fs.writeFileSync(arming, 'T: 2026-10-05 21:00\n');
    const r2 = node(SHA, ['--root', MAIN, '--passes', known, '--arming', arming]);
    record('S2', 'an arming record present: `ARMING sha256=` equals the independent hash of its bytes', r2.status === 0 && r2.stdout.includes(`ARMING sha256=${crypto.createHash('sha256').update(fs.readFileSync(arming)).digest('hex')}`), '');
    const r3 = node(SHA, ['--root', MAIN, '--passes', `${known},flight-eq-no-such-text.md`, '--arming', noArming]);
    record('S3', 'a text NOT committed at HEAD (a name that is in no commit): `MISSING at HEAD`, the other line still printed, exit 1 (the launcher exits 14)', r3.status === 1 && /PASSES flight-eq-no-such-text\.md MISSING at HEAD/.test(r3.stdout) && r3.stdout.includes(`PASSES ${known} sha256=`), r3.stdout.trim().split(/\r?\n/).pop());
    // committed, not the working tree: a stub repo whose file is edited after the commit
    const repo = path.join(CAL, 'shalines-repo');
    fs.mkdirSync(path.join(repo, 'electron', 'test', 'golden', 'passes'), { recursive: true });
    const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.name=cal', '-c', 'user.email=cal@example.invalid', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });
    g('init', '-q');
    const pf = path.join(repo, 'electron', 'test', 'golden', 'passes', 'x.md');
    fs.writeFileSync(pf, 'committed text\n'); g('add', '-A'); g('commit', '-q', '-m', 'c');
    fs.writeFileSync(pf, 'edited after the commit\n');
    const r4 = node(SHA, ['--root', repo, '--passes', 'x.md', '--arming', noArming]);
    const committedSha = crypto.createHash('sha256').update('committed text\n').digest('hex');
    record('S4', 'the working-tree file edited AFTER the commit: the printed sha is the COMMITTED text\'s (git show HEAD:), not the edited file\'s', r4.status === 0 && r4.stdout.includes(`sha256=${committedSha}`), '');
    const bad = (id, name, args) => { const x = node(SHA, args); record(id, name, x.status === 2 && /usage/.test(x.stdout), `exit ${x.status}`); };
    bad('S5', 'usage: --passes with a path -> exit 2', ['--root', MAIN, '--passes', '..\\x.md', '--arming', noArming]);
    bad('S6', 'usage: a missing --arming -> exit 2', ['--root', MAIN, '--passes', known]);
    bad('S7', 'usage: an unknown option -> exit 2', ['--root', MAIN, '--passes', known, '--arming', noArming, '--x', '1']);
}
log('');

// ---- 3. eq-proofs.mjs ------------------------------------------------------------------------------------------------------
log('DIST PROOFS (eq-proofs.mjs)');
{
    const PR = path.join(E, 'eq-proofs.mjs');
    const r = node(PR, ['--root', MAIN]);
    const okLine = lastLine(r.stdout);
    const shaLine = r.stdout.split(/\r?\n/).find((l) => l.startsWith('EQ PROOFS earlierQuestion.js sha256/16 '));
    record('D1', 'MAIN\'s real dist: ALL PASSED, exit 0; dist-proof, four markers True, the sha line, parity-dist both lines all in the output', r.status === 0 && okLine === 'EQ PROOFS: ALL PASSED' && /DIST PROOF: THE COMBINED BUILD/.test(r.stdout) && (r.stdout.match(/^EQ MARKER .* True$/gm) ?? []).length === 4 && !!shaLine && /PARITY DIST: 126 fixture entries/.test(r.stdout), `${okLine} :: ${shaLine}`);
    // a stub root (a copy of MAIN's dist) to break
    const root = path.join(CAL, 'proof-root');
    copyTree(path.join(MAIN, 'dist-electron'), path.join(root, 'dist-electron'));
    const brk = (rel, from, to) => { const f = path.join(root, 'dist-electron', 'electron', rel); const t = fs.readFileSync(f, 'utf8'); if (!t.includes(from)) throw new Error(`calibration bug: ${from} not in ${rel}`); fs.writeFileSync(f, t.split(from).join(to)); return () => fs.writeFileSync(f, t); };
    const r0 = node(PR, ['--root', root]);
    record('D2', 'the stub root (a copy of the real dist), unbroken -> ALL PASSED (the baseline of the next cases)', r0.status === 0 && lastLine(r0.stdout) === 'EQ PROOFS: ALL PASSED', lastLine(r0.stdout));
    for (const [i, [rel, needle]] of [['llm/earlierQuestion.js', 'EARLIER QUESTION (asked earlier; context only'], ['IntelligenceEngine.js', 'earlier question: gate='], ['main.js', 'describeEarlierQuestionAtStartup'], ['llm/WhatToAnswerLLM.js', 'earlierQuestionBlock']].entries()) {
        const undo = brk(rel, needle, `${needle.slice(0, -1)}#`);
        const x = node(PR, ['--root', root]);
        undo();
        record(`D${3 + i}`, `marker ${rel} "${needle}" broken -> that EQ MARKER line False, FAILED, exit 1`, x.status === 1 && /EQ PROOFS: FAILED/.test(x.stdout) && x.stdout.includes(`EQ MARKER dist-electron/electron/${rel} False`), lastLine(x.stdout));
    }
    {   const undo = brk('llm/verbalStreamFilter.js', 'CUE_LINE_PREFIX', 'CUE_LINE_PFX'); const x = node(PR, ['--root', root]); undo();
        record('D7', 'the cue build broken (CUE_LINE_PREFIX renamed in the filter) -> FAILED (dist-proof), exit 1', x.status === 1 && /FAILED \(dist-proof/.test(lastLine(x.stdout)), lastLine(x.stdout)); }
    {   const x = node(PR, ['--root', MAIN], { env: { ...process.env, EQ_DIST_BREAK: '1' } });
        record('D8', 'parity-dist with EQ_DIST_BREAK=1 (MISMATCH lines) -> FAILED (parity-dist), exit 1', x.status === 1 && /FAILED \(parity-dist\)/.test(lastLine(x.stdout)), lastLine(x.stdout)); }
    const logSame = path.join(CAL, 'launcher-same.log'), logDiff = path.join(CAL, 'launcher-diff.log'), logNone = path.join(CAL, 'launcher-none.log');
    const sha = shaLine?.split(' ').pop() ?? '';
    fs.writeFileSync(logSame, `old stuff\n=== DIST BEFORE THE RUN ===\nEQ PROOFS earlierQuestion.js sha256/16 ${'0'.repeat(16)}\n=== DIST BEFORE THE RUN ===\nEQ PROOFS earlierQuestion.js sha256/16 ${sha}\n=== FLIGHT EXIT 0 ===\n`);
    fs.writeFileSync(logDiff, `=== DIST BEFORE THE RUN ===\nEQ PROOFS earlierQuestion.js sha256/16 ${'f'.repeat(16)}\n=== FLIGHT EXIT 0 ===\n`);
    fs.writeFileSync(logNone, '=== FLIGHT EXIT 0 ===\n');
    const same = node(PR, ['--root', MAIN, '--same-as-log', logSame]);
    record('D9', '--same-as-log, the sha after the LAST before-banner equals the current sha (an older banner holds zeros: the last one wins) -> ALL PASSED, "unchanged ... yes"', same.status === 0 && /unchanged since the run started: yes/.test(same.stdout), lastLine(same.stdout));
    const diff = node(PR, ['--root', MAIN, '--same-as-log', logDiff]);
    record('D10', '--same-as-log, the sha before the run differs (the dist was rebuilt into something else) -> "unchanged ... NO", FAILED (sha-changed), exit 1', diff.status === 1 && /unchanged since the run started: NO/.test(diff.stdout) && /FAILED \(sha-changed\)/.test(lastLine(diff.stdout)), lastLine(diff.stdout));
    const none = node(PR, ['--root', MAIN, '--same-as-log', logNone]);
    record('D11', '--same-as-log with no before-banner in the log -> NOT FOUND, FAILED, exit 1 (never a silent pass)', none.status === 1 && /sha before the run: NOT FOUND/.test(none.stdout), lastLine(none.stdout));
    const rel = node(PR, ['--root', 'electron']);
    record('D12', 'usage: a relative --root -> exit 2', rel.status === 2 && /absolute/.test(rel.stdout), `exit ${rel.status}`);
}
log('');

// ---- 4. the launcher itself: guards-only copies from MAIN's folder ----------------------------------------------------------
log('GUARDS-ONLY COPIES of the real launcher, run with cmd.exe from MAIN (the flight-launcher-guards note\'s steps 1, 2 and 4)');
const GUARDS_ONLY = path.join(E, 'launch-eq-guardsonly.cmd');      // must live in E: the launcher's helpers are %~dp0-relative
const REL_E = path.relative(MAIN, E).split(path.sep).join('\\');  // E (this driver's own folder, never a hard-coded one: review m7) as seen from MAIN's working directory (ASCII: the .cmd must be)
if (/[^\x20-\x7e]/.test(REL_E)) throw new Error(`E is not reachable by an ASCII relative path from MAIN (${REL_E})`);
const relFromMain = (p) => `${REL_E}\\${path.relative(E, p)}`;
const realLog = 'electron\\test\\golden\\interview60.runs\\flight-eq.launcher.log';
const calLog = `${REL_E}\\guardsonly.launcher.log`;
const base = fs.readFileSync(path.join(CAL, 'ok', 'launch-eq.cmd'), 'latin1');
function derive(mutate = (t) => t) {
    let t = base;
    const sub = (from, to) => { const n = t.split(from).length - 1; if (n < 1) throw new Error(`calibration bug: "${from.slice(0, 50)}" not found in the launcher`); t = t.split(from).join(to); return n; };
    sub(realLog, calLog);                                            // the log goes into E, never into MAIN
    const guardFrom = 'guard-eq.mjs" --require-precheck >>';
    sub(guardFrom, `guard-eq.mjs" --require-precheck --settings "${REAL_SETTINGS}" --precheck-file "${relFromMain(path.join(STUBS, 'pre-ok-t-7.txt'))}" --now ${NOW_OK} >>`);
    const cut = t.indexOf('rem The flight itself.');
    if (cut < 0) throw new Error('calibration bug: the run section marker was not found');
    t = `${t.slice(0, cut)}echo GUARDS_ALL_PASSED\r\nexit /b 0\r\n`;
    t = mutate(t);
    if (!/^[\x00-\x7f]*$/.test(t)) throw new Error('calibration bug: the guards-only copy is not ASCII');
    fs.writeFileSync(GUARDS_ONLY, t, 'latin1');
    return t;
}
function runCopy() {
    fs.rmSync(ERRLOG, { force: true });
    fs.rmSync(path.join(E, 'guardsonly.launcher.log'), { force: true });
    const r = spawnSync('cmd.exe', ['/c', GUARDS_ONLY], { cwd: MAIN, encoding: 'utf8', timeout: 240000 });
    const logText = fs.existsSync(path.join(E, 'guardsonly.launcher.log')) ? fs.readFileSync(path.join(E, 'guardsonly.launcher.log'), 'utf8') : '';
    const errText = fs.existsSync(ERRLOG) ? fs.readFileSync(ERRLOG, 'utf8') : null;
    fs.rmSync(ERRLOG, { force: true });
    return { r, logText, errText };
}
if (!fs.existsSync(path.join(STUBS, 'pre-ok-t-7.txt'))) throw new Error('run guard-eq-cal.mjs first: its stub pre-ok-t-7.txt is the guards-only copy\'s calibration input');
{
    derive();
    const asciiCrlf = (() => { const b = fs.readFileSync(GUARDS_ONLY); return ![...b].some((x) => x > 0x7e) && [...b].filter((x) => x === 0x0d).length === b.toString('latin1').split('\r\n').length - 1; })();
    const { r, logText, errText } = runCopy();
    const flat = logText.split(/\r?\n/);
    const has = (re) => flat.some((l) => re.test(l));
    record('G1', 'step 1: the guards-only copy of the real launcher, from MAIN\'s folder -> prints GUARDS_ALL_PASSED, exit 0, no error log (the guard line is the REAL one plus the guard\'s calibration options --settings --precheck-file --now only; the smoke result is the REAL RESULT-smoke-eq.md)', r.status === 0 && /GUARDS_ALL_PASSED/.test(r.stdout) && errText === null && asciiCrlf, `exit ${r.status}, stdout "${r.stdout.trim()}", error log ${errText === null ? 'absent' : 'PRESENT'}`);
    record('G2', 'the copy\'s log (E\\guardsonly.launcher.log) holds the whole chain: start banner with commit and T, PASSES sha256 lines and ARMING absent BEFORE wav:check, EQ PROOFS ALL PASSED, GUARD OK, NIGHT GATES OK, PRECHECK ACCEPTED',
        has(/^=== LAUNCHER eq start .* commit [0-9a-f]{40} T 2026-10-05 21:00 ===/) && has(/^PASSES 2026-10-04-turn-followup-result\.md sha256=[0-9a-f]{64}$/) && has(/^ARMING absent$/) && has(/^scenario50\.wav matches /) && has(/^EQ PROOFS: ALL PASSED$/) && has(/^GUARD OK: /) && has(/^NIGHT GATES OK$/) && has(/^PRECHECK ACCEPTED 2026-10-05T20:53:00\+03$/)
        && flat.findIndex((l) => /^ARMING absent$/.test(l)) < flat.findIndex((l) => /^scenario50\.wav matches /.test(l)), flat.filter((l) => /^(=== |PASSES |ARMING |scenario50|EQ PROOFS: |NIGHT GATES|PRECHECK ACC)/.test(l)).map((l) => l.replace(/sha256=([0-9a-f]{12})[0-9a-f]+/, 'sha256=$1...').slice(0, 70)).join(' | '));
    const gl = flat.find((l) => l.startsWith('GUARD OK: ')) ?? '';
    record('G3', 'the guard line in that log read the TRUE environment through the launcher\'s own env block: flag exactly 1, focused arms OFF, T 2026-10-05 21:00, the cmd-set values arrived (INFORMATION: depends on the smoke stub, the real settings and the machine\'s night gates)', /earlier question flag exactly 1/.test(gl) && /focused Flash arms OFF/.test(gl) && /T 2026-10-05 21:00/.test(gl) && /night gates OK/.test(gl), clip(gl, 400), true);
}
{   // step 2: each mangled marker exits with ITS code and writes ITS error-log line
    const mangle = (id, name, mut, wantCode, wantErr) => {
        derive(mut);
        const { r, errText } = runCopy();
        record(id, name, r.status === wantCode && errText !== null && wantErr.test(errText) && !/GUARDS_ALL_PASSED/.test(r.stdout), `exit ${r.status} (want ${wantCode}); stdout "${r.stdout.trim()}"; error log: ${errText === null ? 'ABSENT' : errText.trim().slice(0, 140)}`);
    };
    mangle('M1', 'step 2: the harness-stop marker mangled (process.on exit appStop searched with a typo) -> exit 6 and the error-log line', (t) => t.replace("findstr /C:\"process.on('exit', appStop)\"", "findstr /C:\"process.on('exit', appStopX)\""), 6, /the harness does not stop the app/);
    mangle('M2', 'step 2: the commit placeholder left in -> exit 12 and the error-log line', (t) => t.replace(`set NATIVELY_FLIGHT_COMMIT=${MAIN_HEAD}`, 'set NATIVELY_FLIGHT_COMMIT=@@REGISTERED_HEAD_FULL_HASH@@'), 12, /not a full 40 character hash/);
    mangle('M3', 'step 2: the guard script name mangled -> exit 4 and the error-log line (a guard that cannot run refuses)', (t) => t.replace('guard-eq.mjs" --require-precheck', 'guard-eq-mangled.mjs" --require-precheck'), 4, /behavioural guard failed/);
    mangle('M4', 'step 2: a passes file that is not committed at HEAD named in the sha-lines call -> exit 14 and the error-log line', (t) => t.replace('--passes "2026-10-04-turn-followup-result.md,PREREGISTER-h40d.md"', '--passes "2026-10-04-turn-followup-result.md,flight-eq-no-such-text.md"'), 14, /a committed text is missing at HEAD/);
    mangle('M5', 'step 2: the precheck stamp stale (now = T + 11 min) -> the real guard refuses (g5) -> exit 4', (t) => t.replace(`--now ${NOW_OK}`, '--now 2026-10-05T21:11:00+03:00'), 4, /behavioural guard failed/);
    mangle('M6', 'step 2: the roster file name mangled -> exit 7', (t) => t.replace('scenario50.questions.mjs', 'scenario50.questionz.mjs'), 7, /scenario50 roster missing/);
    mangle('M7', 'step 2: the audio file name mangled -> exit 8', (t) => t.replace('electron\\test\\golden\\scenario50.wav', 'electron\\test\\golden\\scenario50x.wav'), 8, /scenario50\.wav missing/);
    mangle('M8', 'step 2: the working directory check mangled -> exit 9', (t) => t.replace('if not exist "electron\\test\\golden\\interview60.flight.mjs"', 'if not exist "electron\\test\\golden\\interview60.flightx.mjs"'), 9, /wrong working directory/);
    mangle('M9', 'step 2: wav:check pointed at a harness subcommand that fails (a mangled subcommand name) -> exit 5', (t) => t.replace('interview60.run.mjs wav:check', 'interview60.run.mjs wav:chek'), 5, /does not match the scenario50 roster/);
}
{   // the dist-proofs-1 refusal: eq-proofs fails -> exit 3 (the marker string in the proofs call mangled to a non-absolute root)
    derive((t) => t.replace('eq-proofs.mjs" --root "%CD%" >>', 'eq-proofs.mjs" --root "." >>'));
    const { r, errText } = runCopy();
    record('M10', 'step 2: dist proofs 1 refusing (a relative --root) -> exit 3 and the error-log line', r.status === 3 && errText !== null && /dist proofs 1 failed/.test(errText), `exit ${r.status}; error log: ${errText === null ? 'ABSENT' : errText.trim().slice(0, 100)}`);
}
{   // review m1: a guard that dies natively exits NEGATIVE (0xC0000005 = -1073741819), which `if errorlevel 1` lets through; the launcher must stop
    const NEG = '-e "process.exit(-1073741819)" --';              // a node child with a negative native exit code; the args after -- are the guard line's own
    const stub = (t) => { const from = '"%~dp0guard-eq.mjs" --require-precheck'; if (!t.includes(from)) throw new Error('calibration bug: the guard line was not found'); return t.replace(from, NEG + ' --require-precheck'); };
    derive(stub);
    const a = runCopy();
    record('M11', 'review m1: the guard stub exits -1073741819 (a native crash) -> the launcher STOPS: exit 4, the error-log line, no GUARDS_ALL_PASSED', a.r.status === 4 && a.errText !== null && /behavioural guard failed/.test(a.errText) && !/GUARDS_ALL_PASSED/.test(a.r.stdout), `exit ${a.r.status} (want 4); stdout "${a.r.stdout.trim()}"; error log: ${a.errText === null ? 'ABSENT' : a.errText.trim().slice(0, 100)}`);
    // the case's own calibration: the OLD form of that one check lets the same stub through (else M11 could not tell the forms apart)
    derive((t) => { const s = stub(t); const old = 'if not "%errorlevel%"=="0" (\r\n  echo behavioural guard failed'; if (!s.includes(old)) throw new Error('calibration bug: the guard check was not found'); return s.replace(old, 'if errorlevel 1 (\r\n  echo behavioural guard failed'); });
    const b = runCopy();
    record('M12', 'review m1, the mutant: the OLD `if errorlevel 1` form with the same crashing stub -> the launcher is let through (GUARDS_ALL_PASSED, exit 0), so M11 does discriminate', b.r.status === 0 && /GUARDS_ALL_PASSED/.test(b.r.stdout) && b.errText === null, `exit ${b.r.status}; stdout "${b.r.stdout.trim()}"`);
}
// step 4: the artifacts are removed, and the real error log is proven absent
fs.rmSync(GUARDS_ONLY, { force: true });
fs.rmSync(path.join(E, 'guardsonly.launcher.log'), { force: true });
record('G4', 'artifacts deleted: E\\launch-eq-guardsonly.cmd and E\\guardsonly.launcher.log are gone, and the real error log %TEMP%\\natively-eq-launcher-error.log is ABSENT (arming requires it absent)', !fs.existsSync(GUARDS_ONLY) && !fs.existsSync(path.join(E, 'guardsonly.launcher.log')) && !fs.existsSync(ERRLOG), ERRLOG);
log('');

// ---- 5. launch-eq-check.mjs, the controller's step-10 tool, on the cal launchers -------------------------------------------------------
log('LAUNCH-EQ-CHECK (E\\launch-eq-check.mjs, the same guards-only chain as a tool the controller runs on the REAL generated launcher)');
{
    const CHK = path.join(E, 'launch-eq-check.mjs');
    const okReal = path.join(CAL, 'ok', 'launch-eq.cmd'), okDry = path.join(CAL, 'ok', 'launch-eq-dry.cmd');
    const run = (launcher) => { const r = node(CHK, ['--launcher', launcher]); return { status: r.status, text: r.stdout ?? '' }; };
    const a = run(okReal);
    record('K1', 'the REAL form of the cal launcher (--require-precheck): LAUNCH CHECK OK, exit 0, G1 GUARDS_ALL_PASSED, ten mangles each ok, G4 clean', a.status === 0 && /LAUNCH CHECK OK \d+\/\d+/.test(a.text) && /PRECHECK ACCEPTED/.test(a.text) && (a.text.match(/^ok {3}M\d+ /gm) ?? []).length === 10, lastLine(a.text));
    const b = run(okDry);
    record('K2', 'the DRY form of the cal launcher: LAUNCH CHECK OK, exit 0 (no precheck stamp involved), nine mangles', b.status === 0 && /LAUNCH CHECK OK \d+\/\d+/.test(b.text) && !/PRECHECK ACCEPTED/.test(b.text) && (b.text.match(/^ok {3}M\d+ /gm) ?? []).length === 9, lastLine(b.text));
    const phDir = path.join(CAL, 'ph'); fs.mkdirSync(phDir, { recursive: true });
    const gp = node(path.join(E, 'gen-launchers-eq.mjs'), ['--out', phDir]);
    const c = run(path.join(phDir, 'launch-eq.cmd'));
    record('K3', 'a launcher that still holds the placeholders -> usage, exit 2, "still holds a placeholder" (nothing run)', gp.status === 0 && c.status === 2 && /still holds a placeholder/.test(c.text), lastLine(c.text));
    const badDir = path.join(CAL, 'bad'); fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, 'launch-eq.cmd'), fs.readFileSync(okReal, 'latin1').replace("findstr /C:\"process.on('exit', appStop)\"", "findstr /C:\"process.on('exit', appStopX)\""), 'latin1');
    const d = run(path.join(badDir, 'launch-eq.cmd'));
    record('K4', 'a launcher with its OWN harness-stop marker mangled (a launcher that cannot pass) -> LAUNCH CHECK FAILED, exit 1, G1 BAD (the check can fail)', d.status === 1 && /^BAD {2}G1 /m.test(d.text) && /LAUNCH CHECK FAILED/.test(d.text), lastLine(d.text));
    record('K5', 'no artifact left behind by the tool (the guards-only copy deleted, the real error log absent)', !fs.existsSync(path.join(E, 'launch-eq-guardsonly.cmd')) && !fs.existsSync(ERRLOG), '');
}
log('');

const counted = results.filter((x) => !x.info);
const bads = counted.filter((x) => !x.good);
log(bads.length === 0 ? `LAUNCHER CALIBRATION OK ${counted.length}/${counted.length} (${results.filter((x) => x.info).length} informational case recorded and not counted)` : `LAUNCHER CALIBRATION FAILED: ${bads.map((b) => b.id).join(', ')} (${counted.length - bads.length}/${counted.length} ok)`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length === 0 ? 0 : 1);
