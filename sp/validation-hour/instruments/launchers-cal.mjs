// launchers-cal.mjs (launcher builder D): calibration of the h40d launchers, the merge script and the dispatch text (rule 8:
// every check is shown against cases whose answer is known before it runs, and each check has a case that must FAIL).
// Writes VH\launchers-cal.txt (the transcript) and exits with the number of FAIL lines. Prints names, counts, exit codes
// and short log lines only; the stub trees hold nothing but this script's own stubs.
//
// SAFETY, stated once. Nothing here starts the app, the probe or a flight, and nothing touches a scheduled task:
//  - every launcher run is a DERIVED COPY in a throwaway tree under launchers-scratch\cal\, run from that tree, in which the
//    only lines that differ from the real launcher are the lines that name the harness scripts (interview60.run.mjs,
//    interview60.flight.mjs) and, in some cases, dist-proof.mjs; those paths point at this script's stubs, which only append
//    a line to a trace file and exit with a scripted code. The script asserts that no other line differs.
//  - the real dist-proof.mjs is run read-only against the stub tree's copy of the worktree's dist files, or against nothing.
//  - the merge runs use a stub judge script. The only real files read are the sources, the real .cmd files and r4.
// The scratchpad path is 191 characters, so cmd (limit 259) is given the 8.3 short path of every folder; Node writes the files.
//   node launchers-cal.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // VH\instruments
const VH = path.resolve(HERE, '..');
const SP = path.resolve(VH, '..');
const SCR = path.join(HERE, 'launchers-scratch');
const CAL = path.join(SCR, 'cal');
const NODE = process.execPath;
const REPORT = path.join(VH, 'launchers-cal.txt');
const GEN = path.join(HERE, 'gen-launchers.mjs');

const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };
let passes = 0, fails = 0;
const verdict = (ok, label, detail = '') => { ok ? passes++ : fails++; say(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  [${detail}]` : ''}`); return ok; };
const sha12 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);

// ---- paths ----------------------------------------------------------------------------------------------------------
function findMain() {
    const od = path.join(process.env.USERPROFILE, 'OneDrive');
    for (const d of fs.readdirSync(od)) { const p = path.join(od, d, 'natively-cluely-ai-assistant'); if (d.startsWith('Masa') && fs.existsSync(path.join(p, '.git'))) return p; }
    throw new Error('MAIN not found');
}
const MAIN = findMain();
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
const shortOf = (p) => execFileSync('powershell.exe', ['-NoProfile', '-Command', '(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:H40D_P).ShortPath'], { env: { ...process.env, H40D_P: p }, encoding: 'utf8' }).trim();
const SCR83 = shortOf(SCR);
const INSTR83 = path.dirname(SCR83);
// every folder name below launchers-scratch\cal is 8.3-compliant (no dot, 8 characters at most), so short = short prefix + same names
const s83 = (p) => path.join(SCR83, path.relative(SCR, p));
const fresh = (d) => { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); };

// ---- the stubs: they stand in for the harness, the flight, the proof and the guard ------------------------------------------
const STUBS = {
    'stub-run.mjs': `// STUB of interview60.run.mjs for launcher calibration. Never the real harness.
import fs from 'node:fs';
const cmd = process.argv[2];
fs.appendFileSync(process.env.STUB_TRACE, 'run ' + cmd + '\\n');
const code = Number(process.env['STUB_' + cmd.replace(':', '_').toUpperCase()] ?? 0);
console.log('STUB run.mjs ' + cmd + ' -> exit ' + code);
process.exit(code);
`,
    'stub-flight.mjs': `// STUB of interview60.flight.mjs for launcher calibration. Never the real flight.
import fs from 'node:fs';
fs.appendFileSync(process.env.STUB_TRACE, 'flight ' + process.argv.slice(2).join(' ') + '\\n');
const code = Number(process.env.STUB_FLIGHT ?? 0);
console.log('STUB flight.mjs ' + process.argv.slice(2).join(' ') + ' -> exit ' + code);
process.exit(code);
`,
    'stub-proof.mjs': `// STUB of dist-proof.mjs for launcher calibration: the nth call exits with the nth code of STUB_PROOF_SEQ (the last repeats).
import fs from 'node:fs';
const seq = (process.env.STUB_PROOF_SEQ ?? '0').split(',').map(Number);
let n = 0;
try { n = Number(fs.readFileSync(process.env.STUB_PROOF_STATE, 'utf8')); } catch { /* first call */ }
n++;
fs.writeFileSync(process.env.STUB_PROOF_STATE, String(n));
const code = seq[Math.min(n - 1, seq.length - 1)];
fs.appendFileSync(process.env.STUB_TRACE, 'proof ' + n + ' -> ' + code + '\\n');
console.log('DIST PROOF: STUB call ' + n + ' -> exit ' + code);
process.exit(code);
`,
    'guard-h40d.mjs': `// STUB of guard-h40d.mjs for launcher calibration. Never the real guard.
import fs from 'node:fs';
fs.appendFileSync(process.env.STUB_TRACE, 'guard\\n');
const code = Number(process.env.STUB_GUARD ?? 0);
console.log(code ? 'GUARD FAILED: stub' : 'GUARD OK: stub');
process.exit(code);
`,
};

const DIST_FILES = ['llm/prompts.js', 'llm/verbalStreamFilter.js', 'IntelligenceEngine.js', 'ipcHandlers.js', 'main.js'];
function buildTree(dir, o = {}) {
    const g = path.join(dir, 'electron', 'test', 'golden');
    fs.mkdirSync(path.join(g, 'interview60.runs'), { recursive: true });
    fs.writeFileSync(path.join(g, 'interview60.flight.mjs'), '// stub tree file, never run\n');
    if (o.wav !== false) fs.writeFileSync(path.join(g, 'holdout40.wav'), '');
    if (o.questions !== false) fs.writeFileSync(path.join(g, 'holdout40.questions.mjs'), '// stub tree file\n');
    fs.writeFileSync(path.join(g, 'interview60.run.mjs'), o.appStopText === false ? '// stub run.mjs without the exit listener\n' : "// stub run.mjs of the calibration tree\n// process.on('exit', appStop)\n");
    fs.writeFileSync(path.join(g, 'interview60.judge.mjs'), '// stub tree file, never run\n');
    fs.writeFileSync(path.join(dir, 'natively_debug.log'), 'stub debug log\n');
    if (o.dist === 'wt') for (const f of DIST_FILES) {
        const to = path.join(dir, 'dist-electron', 'electron', ...f.split('/'));
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(WT, 'dist-electron', 'electron', ...f.split('/')), to);
    }
}

const H1 = '0123456789abcdef0123456789abcdef01234567'; // well-formed, never a real commit
const H2 = 'fedcba9876543210fedcba9876543210fedcba98';
const VARIANT = { flight: 'launch-h40d.cmd', dry: 'launch-h40d-dry.cmd', prestart: 'launch-h40d-prestart.cmd' };
const LABEL = { flight: 'h40d', dry: 'h40d-dry', prestart: 'h40d-prestart' };

// ---- a derived launcher: only the lines naming a harness script or the proof may differ ---------------------------------
function derive(src, stubDir83, stubProof) {
    const orig = fs.readFileSync(src, 'latin1');
    let s = orig;
    const counts = {};
    const swap = (from, to, key) => { counts[key] = s.split(from).length - 1; s = s.split(from).join(to); };
    swap('node.exe" electron\\test\\golden\\interview60.run.mjs ', `node.exe" ${stubDir83}\\stub-run.mjs `, 'run.mjs');
    swap('node.exe" electron\\test\\golden\\interview60.flight.mjs ', `node.exe" ${stubDir83}\\stub-flight.mjs `, 'flight.mjs');
    if (stubProof) swap(`"${SP}\\dist-proof.mjs"`, `"${stubDir83}\\stub-proof.mjs"`, 'dist-proof.mjs');
    const a = orig.split('\r\n'), b = s.split('\r\n');
    const changed = a.map((l, i) => (l !== b[i] ? i : -1)).filter((i) => i >= 0);
    const allowed = changed.every((i) => /interview60\.(run|flight)\.mjs |dist-proof\.mjs/.test(a[i]));
    const total = Object.values(counts).reduce((x, y) => x + y, 0);
    return { text: s, counts, changedLines: changed.length, onlyPathLines: allowed && changed.length === total && a.length === b.length };
}

function runCmd(launcher83, cwd83, env, timeoutMs = 150000) {
    return new Promise((resolve) => {
        const t0 = Date.now();
        const child = spawn('cmd.exe', ['/c', `"${launcher83}"`], { cwd: cwd83, env, windowsVerbatimArguments: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        child.stdout.on('data', (d) => { stdout += d; });
        child.stderr.on('data', (d) => { stdout += d; });
        const timer = setTimeout(() => { child.kill(); }, timeoutMs);
        child.on('exit', (code) => { clearTimeout(timer); resolve({ exit: code, ms: Date.now() - t0, stdout }); });
    });
}

const readOr = (f, d = '') => (fs.existsSync(f) ? fs.readFileSync(f, 'latin1') : d);
const traceOf = (f) => readOr(f).split(/\r?\n/).filter(Boolean);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// =========================================================================================================================
say(`launchers-cal.mjs: ${new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')} local`);
say(`node ${process.version}; MAIN and the worktree are read only (the worktree's five dist files are copied into stub trees)`);
say('');
fs.mkdirSync(CAL, { recursive: true });

// ---- A. the bytes ---------------------------------------------------------------------------------------------------------
say('=== A. bytes of the four generated .cmd files, read by a reader independent of the generator ===');
const FILES = ['launch-h40d.cmd', 'launch-h40d-dry.cmd', 'launch-h40d-prestart.cmd', 'h40d-merge.cmd'];
for (const f of FILES) {
    const b = fs.readFileSync(path.join(VH, f));
    let crlf = 0, bareLf = 0, bareCr = 0, high = 0, ctrl = 0;
    for (let i = 0; i < b.length; i++) { const c = b[i]; if (c === 13) { if (b[i + 1] === 10) { crlf++; i++; } else bareCr++; } else if (c === 10) bareLf++; else if (c > 126) high++; else if (c < 32) ctrl++; }
    const bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    const ends = b[b.length - 2] === 13 && b[b.length - 1] === 10;
    verdict(bareLf === 0 && bareCr === 0 && high === 0 && ctrl === 0 && !bom && ends && crlf > 50, `${f}: ${b.length} bytes, CRLF ${crlf}, bare LF ${bareLf}, bare CR ${bareCr}, bytes above 126 ${high}, other control bytes ${ctrl}, BOM ${bom ? 'YES' : 'no'}, ends with CRLF ${ends ? 'yes' : 'NO'}`, `sha256/12 ${sha12(b)}`);
}
const gen = (args, opts = {}) => spawnSync(NODE, [opts.gen ?? GEN, ...args], { encoding: 'utf8' });
let r = gen(['--check']);
verdict(r.status === 0 && /GENERATOR: ALL 4 FILES PASS/.test(r.stdout) && /structure: .* YES/.test(r.stdout), 'gen-launchers.mjs --check on the four real files: exit 0, all pass, the dry twin equals the flight launcher up to the guard', `exit ${r.status}`);
r = gen(['--check', '--armed']);
verdict(r.status === 1 && /--armed: the commit is still a placeholder/.test(r.stdout), 'known-bad: --check --armed on the real unarmed files fails (the three placeholders)', `exit ${r.status}`);

// mutants: each is ONE change to one real file, copied; --check must exit 1 and name the problem
say('--- mutants: --check must FAIL each one and say why ---');
const MUT = path.join(CAL, 'mut');
const mutate = (name, file, fn, expect) => {
    const d = path.join(MUT, name);
    fresh(d);
    for (const f of FILES) fs.copyFileSync(path.join(VH, f), path.join(d, f));
    let buf = fs.readFileSync(path.join(d, file));
    buf = fn(buf);
    fs.writeFileSync(path.join(d, file), buf);
    const res = gen(['--check', '--out', d]);
    verdict(res.status === 1 && expect.every((e) => e.test(res.stdout)), `mutant ${name}: ${file}`, `exit ${res.status}; ${expect.map((e) => e.source).join(' + ')}`);
};
const nth = (buf, needle, n) => { let i = -1; for (let k = 0; k < n; k++) { i = buf.indexOf(needle, i + 1); if (i < 0) throw new Error('mutation anchor not found'); } return i; };
mutate('m1lf', 'launch-h40d.cmd', (b) => { const i = nth(b, '\r\n', 20); return Buffer.concat([b.subarray(0, i), b.subarray(i + 1)]); }, [/bare LF/]);
mutate('m2high', 'launch-h40d.cmd', (b) => { const i = b.indexOf('holdout40.wav missing'); return Buffer.concat([b.subarray(0, i + 4), Buffer.from([0xc3, 0xbc]), b.subarray(i + 4)]); }, [/above 126/]);
mutate('m3bom', 'launch-h40d-dry.cmd', (b) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), b]), [/BOM/]);
mutate('m4gone', 'launch-h40d-prestart.cmd', (b) => { const i = nth(b, '\r\n', 40), j = nth(b, '\r\n', 41); return Buffer.concat([b.subarray(0, i + 2), b.subarray(j + 2)]); }, [/source line\(s\) are missing|lines, the source gives/]);
mutate('m5altered', 'launch-h40d.cmd', (b) => Buffer.from(b.toString('latin1').replace('appStop)', 'appStopX)'), 'latin1'), [/differ from the source/]);
mutate('m6nocrlf', 'launch-h40d.cmd', (b) => b.subarray(0, b.length - 2), [/does not end with CRLF/]);
mutate('m7short', 'launch-h40d.cmd', (b) => Buffer.from(b.toString('latin1').replace('@@REGISTERED_HEAD_FULL_HASH@@', H1.slice(0, 39)), 'latin1'), [/neither the placeholder nor a full hash/]);
mutate('m8tab', 'launch-h40d-dry.cmd', (b) => Buffer.from(b.toString('latin1').replace('exit /b 9', 'exit\t/b 9'), 'latin1'), [/control byte/]);
mutate('m9merge', 'h40d-merge.cmd', (b) => Buffer.from(b.toString('latin1').replace(/call :arm captured-no-cues-high-r2 .*\r\n/, ''), 'latin1'), [/source line\(s\) are missing|lines, the source gives/]);
mutate('m10upper', 'launch-h40d.cmd', (b) => Buffer.from(b.toString('latin1').replace('@@REGISTERED_HEAD_FULL_HASH@@', H1.toUpperCase()), 'latin1'), [/neither the placeholder nor a full hash/]);
mutate('m11drift', 'launch-h40d-dry.cmd', (b) => Buffer.from(b.toString('latin1').replace('exit /b 5', 'exit /b 55'), 'latin1'), [/differ from the source/, /structure: .* NO/]);

// arming through the generator: fill, keep, refuse
say('--- arming: --commit and --prestart-commit ---');
const ARM = path.join(CAL, 'arm');
fresh(ARM);
r = gen(['--out', ARM]);
verdict(r.status === 0 && /PLACEHOLDERS: launch-h40d\.cmd, launch-h40d-dry\.cmd, launch-h40d-prestart\.cmd still hold/.test(r.stdout), 'a fresh out folder: all three launchers hold a placeholder', `exit ${r.status}`);
const commitLine = (f) => /^set NATIVELY_FLIGHT_COMMIT=(.*)$/m.exec(fs.readFileSync(path.join(ARM, f), 'latin1').replace(/\r\n/g, '\n'))?.[1];
r = gen(['--out', ARM, '--commit', H1]);
verdict(r.status === 0 && commitLine('launch-h40d.cmd') === H1 && commitLine('launch-h40d-dry.cmd') === H1 && /^@@MAIN_HEAD_AT_PRESTART@@$/.test(commitLine('launch-h40d-prestart.cmd')) && /PLACEHOLDERS: launch-h40d-prestart\.cmd still hold/.test(r.stdout), '--commit fills the flight and the dry twin and leaves the prestart on its own placeholder', `exit ${r.status}`);
r = gen(['--check', '--armed', '--out', ARM]);
verdict(r.status === 1 && /--armed: the commit is still a placeholder/.test(r.stdout), 'known-bad: --check --armed with the prestart still unfilled fails', `exit ${r.status}`);
r = gen(['--out', ARM, '--prestart-commit', H2]);
verdict(r.status === 0 && commitLine('launch-h40d.cmd') === H1 && commitLine('launch-h40d-dry.cmd') === H1 && commitLine('launch-h40d-prestart.cmd') === H2 && /PLACEHOLDERS: none/.test(r.stdout), '--prestart-commit fills the prestart and KEEPS the flight and dry values already in the files', `exit ${r.status}`);
r = gen(['--check', '--armed', '--out', ARM]);
verdict(r.status === 0 && /GENERATOR: ALL 4 FILES PASS/.test(r.stdout), '--check --armed on the fully armed folder: exit 0', `exit ${r.status}`);
for (const [what, args] of [['a 39 character hash', ['--commit', H1.slice(0, 39)]], ['an uppercase hash', ['--commit', H1.toUpperCase()]], ['a 41 character hash', ['--prestart-commit', `${H2}0`]], ['a short git hash', ['--commit', 'fed4b07']], ['an unknown option', ['--bogus']], ['--armed without --check', ['--armed']]]) {
    r = gen(['--out', ARM, ...args]);
    verdict(r.status === 2 && /REFUSED/.test(r.stdout), `known-bad: ${what} is refused`, `exit ${r.status}`);
}
verdict(commitLine('launch-h40d.cmd') === H1 && commitLine('launch-h40d-prestart.cmd') === H2, 'the refusals above wrote nothing (the armed values are unchanged)');
// the order the days actually run in: the prestart is armed FIRST (MAIN's HEAD on the quota day before), the flight and the dry
// twin later (the registered HEAD, the pre-registration commit); then a re-arm after the HEAD moved. The case above ran the other way.
{
    const ARM2 = path.join(CAL, 'arm2');
    fresh(ARM2);
    const line2 = (f) => /^set NATIVELY_FLIGHT_COMMIT=(.*)$/m.exec(fs.readFileSync(path.join(ARM2, f), 'latin1').replace(/\r\n/g, '\n'))?.[1];
    const H3 = '1111111111111111111111111111111111111111';
    r = gen(['--out', ARM2, '--prestart-commit', H2]);
    verdict(r.status === 0 && line2('launch-h40d-prestart.cmd') === H2 && /^@@REGISTERED_HEAD_FULL_HASH@@$/.test(line2('launch-h40d.cmd')) && /^@@REGISTERED_HEAD_FULL_HASH@@$/.test(line2('launch-h40d-dry.cmd')), 'the real order, step 1: --prestart-commit alone fills the prestart and leaves the flight and the dry twin on their placeholder', `exit ${r.status}`);
    r = gen(['--out', ARM2, '--commit', H1]);
    verdict(r.status === 0 && line2('launch-h40d.cmd') === H1 && line2('launch-h40d-dry.cmd') === H1 && line2('launch-h40d-prestart.cmd') === H2 && /PLACEHOLDERS: none/.test(r.stdout), 'the real order, step 2: --commit then fills the flight and the dry twin and KEEPS the prestart value of step 1', `exit ${r.status}`);
    r = gen(['--check', '--armed', '--out', ARM2]);
    verdict(r.status === 0 && /GENERATOR: ALL 4 FILES PASS/.test(r.stdout), 'the real order: --check --armed passes on the result', `exit ${r.status}`);
    r = gen(['--out', ARM2, '--commit', H3]);
    verdict(r.status === 0 && line2('launch-h40d.cmd') === H3 && line2('launch-h40d-dry.cmd') === H3 && line2('launch-h40d-prestart.cmd') === H2, 're-arming after the HEAD moved: a second --commit replaces the flight and dry values and still keeps the prestart value', `exit ${r.status}`);
    // rule 8 on the keep logic itself: a generator that forgets the values already in the files must lose the prestart value in
    // the real order, which is what the checks above would have FAILED on
    const MG = path.join(CAL, 'mutgen');
    fresh(MG);
    const mgIns = path.join(MG, 'instruments');
    fs.mkdirSync(mgIns);
    const keepLine = "commit = given ?? (existing !== null && state(v.key, existing) !== 'INVALID' ? existing : PLACEHOLDER[v.key]);";
    const genText = fs.readFileSync(GEN, 'utf8');
    if (genText.split(keepLine).length !== 2) throw new Error('the keep line was not found exactly once in gen-launchers.mjs');
    fs.writeFileSync(path.join(mgIns, 'gen-launchers.mjs'), genText.replace(keepLine, 'commit = given ?? PLACEHOLDER[v.key];'));
    fs.copyFileSync(path.join(HERE, 'launch-h40d-src.txt'), path.join(mgIns, 'launch-h40d-src.txt'));
    fs.copyFileSync(path.join(HERE, 'h40d-merge-src.txt'), path.join(mgIns, 'h40d-merge-src.txt'));
    const mutGen = (args) => spawnSync(NODE, [path.join(mgIns, 'gen-launchers.mjs'), '--out', MG, ...args], { encoding: 'utf8' });
    mutGen(['--prestart-commit', H2]);
    mutGen(['--commit', H1]);
    const lostValue = /^set NATIVELY_FLIGHT_COMMIT=(.*)$/m.exec(fs.readFileSync(path.join(MG, 'launch-h40d-prestart.cmd'), 'latin1').replace(/\r\n/g, '\n'))?.[1];
    verdict(lostValue !== H2 && /^@@/.test(lostValue ?? ''), 'known-bad: a generator that forgets the values already in the files loses the prestart value in the real order (the check above reads KEEPS and would fail on it)', `prestart value after step 2: ${(lostValue ?? '').startsWith('@@') ? 'the placeholder' : 'something else'}`);
}

// lint: a source with a cmd hazard is refused and nothing is written
say('--- lint: the generator refuses a source with a cmd hazard (exit 2, nothing written) ---');
const srcText = fs.readFileSync(path.join(HERE, 'launch-h40d-src.txt'), 'latin1');
const mergeText = fs.readFileSync(path.join(HERE, 'h40d-merge-src.txt'), 'latin1');
const lintCase = (name, edit, expect, srcName = 'launch-h40d-src.txt') => {
    const d = path.join(CAL, `lint${name}`);
    fresh(d);
    const ins = path.join(d, 'instruments');
    fs.mkdirSync(ins);
    fs.copyFileSync(GEN, path.join(ins, 'gen-launchers.mjs'));
    const s = srcName === 'launch-h40d-src.txt' ? edit(srcText) : srcText;
    const m = srcName === 'h40d-merge-src.txt' ? edit(mergeText) : mergeText;
    fs.writeFileSync(path.join(ins, 'launch-h40d-src.txt'), s, 'latin1');
    fs.writeFileSync(path.join(ins, 'h40d-merge-src.txt'), m, 'latin1');
    const res = spawnSync(NODE, [path.join(ins, 'gen-launchers.mjs'), '--out', d], { encoding: 'utf8' });
    const wrote = FILES.some((f) => fs.existsSync(path.join(d, f)));
    verdict(res.status === 2 && expect.test(res.stdout) && !wrote, `lint ${name}`, `exit ${res.status}; ${expect.source}; files written: ${wrote}`);
};
const once = (s, from, to) => { if (s.split(from).length !== 2) throw new Error(`anchor not unique: ${from}`); return s.replace(from, to); };
lintCase('1paren', (s) => once(s, 'echo holdout40.wav missing - build the audio first >>', 'echo holdout40.wav missing (build the audio first) >>'), /an echo inside an if-block/);
lintCase('2remamp', (s) => once(s, 'rem Guard: the harness must stop the app when a run ends - 5952b23.', 'rem Guard: the harness must stop the app when a run ends & echo hi'), /a rem line holds one of/);
lintCase('3high', (s) => once(s, 'rem Knowledge mode ON is a persisted setting', 'rem Knowledge mode \xfc ON is a persisted setting'), /outside printable ASCII/);
lintCase('4atat', (s) => once(s, 'rem Guard: the audio must hold exactly the roster', 'rem @@ Guard: the audio must hold exactly the roster'), /an @@ token outside the commit line/);
lintCase('5digit', (s) => once(s, 'echo === DIST BEFORE THE RUN === >> {{LOG}}', 'echo === DIST BEFORE THE RUN 1>> {{LOG}}'), /digit directly before >>/);
lintCase('6macro', (s) => once(s, 'echo === DIST BEFORE THE RUN ===', 'echo === {{BOGUS}} ==='), /unknown macro/);
lintCase('7open', (s) => once(s, '  exit /b 6\n)\n', '  exit /b 6\n'), /an echo inside an if-block|never closed/);
lintCase('8dupsec', (s) => `${s}\n=== tail-dry ===\nexit /b 0\n`, /appears twice/);
lintCase('9nosec', (s) => once(s, '=== tail-dry ===', '=== tail-dry-x ==='), /section tail-dry is missing|not used by any launcher/);
// the next case edits the merge source with a parenthesis in a one-line if: that is NOT a hazard (no block), so it must be ACCEPTED, a calibration that the lint does not over-refuse
{
    const d = path.join(CAL, 'lint10b');
    fresh(d);
    const ins = path.join(d, 'instruments');
    fs.mkdirSync(ins);
    fs.copyFileSync(GEN, path.join(ins, 'gen-launchers.mjs'));
    fs.writeFileSync(path.join(ins, 'launch-h40d-src.txt'), srcText, 'latin1');
    fs.writeFileSync(path.join(ins, 'h40d-merge-src.txt'), once(mergeText, 'echo WRONG CWD: the judge script is not here, run this from MAIN', 'echo WRONG CWD: the judge script is not here (run this from MAIN)'), 'latin1');
    const res = spawnSync(NODE, [path.join(ins, 'gen-launchers.mjs'), '--out', d], { encoding: 'utf8' });
    verdict(res.status === 0 && FILES.every((q) => fs.existsSync(path.join(d, q))), 'lint is not over-strict: parentheses in a ONE-LINE if echo outside any block are accepted (only a block-level echo is the hazard the style rule names)', `exit ${res.status}`);
}
say('');

// ---- B. the launcher flows ---------------------------------------------------------------------------------------------------
say('=== B. launcher flows: derived copies run by cmd in stub trees (the harness, flight, proof and guard are stubs) ===');
const FILLED = path.join(CAL, 'fill');
fresh(FILLED);
r = gen(['--out', FILLED, '--commit', H1, '--prestart-commit', H2]);
if (r.status !== 0) { say('FAIL  could not generate the filled launchers for the flow cases'); process.exit(1); }

const CASES = [
    { id: 'b01a', what: 'the dry launcher COPY CUT BEFORE THE GUARD, run from a wrong folder (VH\\instruments), as the brief names it', variant: 'dry', cut: true, filled: false, cwd: 'instruments', exit: 9, trace: [], err: /wrong working directory/ },
    { id: 'b01b', what: 'flight launcher from a wrong folder', variant: 'flight', cwd: 'empty', exit: 9, trace: [], err: /wrong working directory/ },
    { id: 'b01c', what: 'dry launcher from a wrong folder', variant: 'dry', cwd: 'empty', exit: 9, trace: [], err: /wrong working directory/ },
    { id: 'b01d', what: 'prestart launcher from a wrong folder', variant: 'prestart', cwd: 'empty', exit: 9, trace: [], err: /wrong working directory/ },
    { id: 'b01e', what: 'the same cut copy from the RIGHT folder is not exit 9 (it reaches the commit check, unarmed)', variant: 'dry', cut: true, filled: false, exit: 12, trace: [], err: /not a full 40 character hash/ },
    { id: 'b02', what: 'dry, holdout40.wav missing', variant: 'dry', tree: { wav: false }, exit: 8, trace: [], err: /holdout40\.wav missing/ },
    { id: 'b03', what: 'dry, roster file missing', variant: 'dry', tree: { questions: false }, exit: 7, trace: [], err: /roster missing/ },
    { id: 'b04', what: 'dry, the harness file lacks the exit listener (the h40a mangled-copy mutation)', variant: 'dry', tree: { appStopText: false }, exit: 6, trace: [], err: /does not stop the app/ },
    { id: 'b05a', what: 'flight, UNARMED (the placeholder is still in the file)', variant: 'flight', filled: false, exit: 12, trace: [], err: /not a full 40 character hash/ },
    { id: 'b05b', what: 'dry, UNARMED', variant: 'dry', filled: false, exit: 12, trace: [], err: /not a full 40 character hash/ },
    { id: 'b05c', what: 'prestart, UNARMED', variant: 'prestart', filled: false, exit: 12, trace: [], err: /not a full 40 character hash/ },
    { id: 'b06', what: 'dry, wav:check fails', variant: 'dry', env: { STUB_WAV_CHECK: '1' }, exit: 5, trace: ['run wav:check'], err: /does not match the holdout40 roster/ },
    { id: 'b07', what: 'dry, the REAL dist-proof against a tree with no dist', variant: 'dry', tree: { dist: 'none' }, exit: 3, trace: ['run wav:check'], err: /dist proof 1 failed/, log: [/DIST PROOF: missing prompts/] },
    { id: 'b08', what: 'dry, the real dist-proof passes on the worktree dist, the guard fails', variant: 'dry', tree: { dist: 'wt' }, env: { STUB_GUARD: '1' }, exit: 4, trace: ['run wav:check', 'guard'], err: /behavioural guard failed/, log: [/THE COMBINED BUILD, every marker as expected/, /GUARD FAILED/] },
    { id: 'b09', what: 'dry, everything passes: no flight and no app step', variant: 'dry', tree: { dist: 'wt' }, exit: 0, trace: ['run wav:check', 'guard'], err: null, log: [/THE COMBINED BUILD, every marker as expected/, /GUARD OK/, /LAUNCHER h40d-dry done/], count: [[/THE COMBINED BUILD, every marker as expected/, 1]] },
    { id: 'b10', what: 'flight, everything passes, flight exit 0: both dist proofs real', variant: 'flight', tree: { dist: 'wt' }, exit: 0, trace: ['run wav:check', 'guard', 'flight h40d'], err: null, log: [/FLIGHT EXIT 0/, /DIST BEFORE THE RUN/, /DIST AFTER THE RUN/], count: [[/THE COMBINED BUILD, every marker as expected/, 2]] },
    { id: 'b11', what: 'flight, the flight exits 1: the launcher exits 1', variant: 'flight', tree: { dist: 'wt' }, env: { STUB_FLIGHT: '1' }, exit: 1, trace: ['run wav:check', 'guard', 'flight h40d'], err: null, log: [/FLIGHT EXIT 1/] },
    { id: 'b12', what: 'flight, dist proof 1 passes and dist proof 2 fails (the dist changed during the run)', variant: 'flight', stubProof: '0,1', exit: 3, trace: ['run wav:check', 'proof 1 -> 0', 'guard', 'flight h40d', 'proof 2 -> 1'], err: /dist proof 2 failed/ },
    { id: 'b13', what: 'flight, dist proof 1 fails: no guard, no flight', variant: 'flight', stubProof: '1', exit: 3, trace: ['run wav:check', 'proof 1 -> 1'], err: /dist proof 1 failed/ },
    { id: 'b14', what: 'prestart, everything passes, with the REAL 60 s wait', variant: 'prestart', tree: { dist: 'wt' }, exit: 0, trace: ['run wav:check', 'guard', 'run app:start', 'run probe', 'run app:stop'], err: null, log: [/app:start exit 0/, /probe exit 0/, /WAIT 60 s begins/, /WAIT 60 s ends/, /app:stop exit 0/, /natively_debug\.log/, /DIST AFTER THE RUN/, /LAUNCHER h40d-prestart done/], count: [[/THE COMBINED BUILD, every marker as expected/, 2]], wait: [59, 66] },
    { id: 'b15', what: 'prestart, app:start fails: no probe, no wait, app:stop still runs', variant: 'prestart', tree: { dist: 'wt' }, env: { STUB_APP_START: '1' }, exit: 10, trace: ['run wav:check', 'guard', 'run app:start', 'run app:stop'], err: /app:start failed/, log: [/app:start exit 1/, /app:stop exit 0/], notLog: [/WAIT 60 s/, /probe exit/], notErr: [/probe not ready/] },
    { id: 'b16', what: 'prestart, the probe is NOT READY: the wait and app:stop still run', variant: 'prestart', tree: { dist: 'wt' }, env: { STUB_PROBE: '1' }, exit: 11, trace: ['run wav:check', 'guard', 'run app:start', 'run probe', 'run app:stop'], err: /probe not ready/, log: [/probe exit 1/, /WAIT 60 s begins/, /WAIT 60 s ends/], wait: [59, 66] },
    { id: 'b17', what: 'prestart, dist proof 2 fails after a clean run: app:stop already ran', variant: 'prestart', stubProof: '0,1', exit: 3, trace: ['run wav:check', 'proof 1 -> 0', 'guard', 'run app:start', 'run probe', 'run app:stop', 'proof 2 -> 1'], err: /dist proof 2 failed/, wait: [59, 66] },
    { id: 'b18', what: 'prestart, app:start fails AND dist proof 2 fails: exit 3, and the error log names both', variant: 'prestart', stubProof: '0,1', env: { STUB_APP_START: '1' }, exit: 3, trace: ['run wav:check', 'proof 1 -> 0', 'guard', 'run app:start', 'run app:stop', 'proof 2 -> 1'], errAll: [/app:start failed/, /dist proof 2 failed/] },
    { id: 'b19', what: 'prestart, app:stop itself fails: exit 13 and the error log says an app may still be running', variant: 'prestart', tree: { dist: 'wt' }, env: { STUB_APP_STOP: '1' }, exit: 13, trace: ['run wav:check', 'guard', 'run app:start', 'run probe', 'run app:stop'], err: /app:stop failed - an app may still be running/, wait: [59, 66] },
];

async function runCase(c) {
    const dir = path.join(CAL, c.id);
    fresh(dir);
    const tree = path.join(dir, 'tree'), stub = path.join(dir, 'stub'), tmp = path.join(dir, 'tmp'), empty = path.join(dir, 'empty');
    for (const d of [tree, stub, tmp, empty]) fs.mkdirSync(d, { recursive: true });
    buildTree(tree, c.tree ?? {});
    for (const [n, t] of Object.entries(STUBS)) fs.writeFileSync(path.join(n === 'guard-h40d.mjs' ? dir : stub, n), t);
    const srcFile = c.filled === false ? path.join(VH, VARIANT[c.variant]) : path.join(FILLED, VARIANT[c.variant]);
    const d = derive(srcFile, s83(stub), !!c.stubProof);
    let text = d.text;
    if (c.cut) { const ls = text.split('\r\n'); const k = ls.findIndex((l) => l.includes('guard-h40d.mjs')); text = ls.slice(0, k).join('\r\n') + '\r\n'; }
    fs.writeFileSync(path.join(dir, 'launcher.cmd'), text, 'latin1');
    const env = { ...process.env, TEMP: s83(tmp), TMP: s83(tmp), STUB_TRACE: path.join(s83(dir), 'trace.txt'), STUB_PROOF_STATE: path.join(s83(dir), 'proofstate.txt'), ...(c.stubProof ? { STUB_PROOF_SEQ: c.stubProof } : {}), ...(c.env ?? {}) };
    for (const k of Object.keys(env)) if (k.startsWith('NATIVELY_')) delete env[k];
    const cwd = c.cwd === 'instruments' ? INSTR83 : c.cwd === 'empty' ? s83(empty) : s83(tree);
    const run = await runCmd(path.join(s83(dir), 'launcher.cmd'), cwd, env);
    const log = readOr(path.join(tree, 'electron', 'test', 'golden', 'interview60.runs', `flight-${LABEL[c.variant]}.launcher.log`));
    const errlog = readOr(path.join(tmp, 'natively-h40d-launcher-error.log'));
    return { c, d, run, trace: traceOf(path.join(dir, 'trace.txt')), log, errlog };
}

const results = [];
{
    const queue = [...CASES];
    const worker = async () => { while (queue.length) { const c = queue.shift(); results[CASES.indexOf(c)] = await runCase(c); } };
    await Promise.all(Array.from({ length: 8 }, worker));
}
for (const { c, d, run, trace, log, errlog } of results) {
    const p = [];
    if (run.exit !== c.exit) p.push(`exit ${run.exit}, expected ${c.exit}`);
    if (!same(trace, c.trace)) p.push(`trace [${trace.join(' | ')}], expected [${c.trace.join(' | ')}]`);
    if (c.err === null && errlog.trim() !== '') p.push('the error log is not empty');
    if (c.err instanceof RegExp && !c.err.test(errlog)) p.push(`error log lacks ${c.err.source}`);
    for (const e of c.errAll ?? []) if (!e.test(errlog)) p.push(`error log lacks ${e.source}`);
    for (const e of c.notErr ?? []) if (e.test(errlog)) p.push(`error log holds ${e.source}`);
    for (const e of c.log ?? []) if (!e.test(log)) p.push(`launcher log lacks ${e.source}`);
    for (const e of c.notLog ?? []) if (e.test(log)) p.push(`launcher log holds ${e.source}`);
    for (const [e, n] of c.count ?? []) { const got = log.split(/\r?\n/).filter((l) => e.test(l)).length; if (got !== n) p.push(`launcher log has ${got} of ${e.source}, expected ${n}`); }
    if (c.wait) {
        const t = (re) => { const m = re.exec(log); return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 100 : null; };
        const a = t(/WAIT 60 s begins\s+(\d{1,2}):(\d\d):(\d\d)[,.](\d\d)/), b = t(/WAIT 60 s ends\s+(\d{1,2}):(\d\d):(\d\d)[,.](\d\d)/);
        const dt = a === null || b === null ? null : ((b - a) + 86400) % 86400;
        if (dt === null || dt < c.wait[0] || dt > c.wait[1]) p.push(`the two WAIT timestamps are ${dt === null ? 'missing' : dt.toFixed(2) + ' s'} apart, expected ${c.wait[0]} to ${c.wait[1]} s`);
        else c.waitSeen = dt;
    }
    if (!d.onlyPathLines) p.push('the derived copy differs from the real launcher in a line that is not a path line');
    const shown = `${c.id} ${c.what}: exit ${run.exit} (expected ${c.exit}), trace [${trace.join(' | ')}]${c.waitSeen ? `, the WAIT timestamps ${c.waitSeen.toFixed(2)} s apart` : ''}, derived-copy swaps ${JSON.stringify(d.counts)} (${d.changedLines} line(s) changed, path lines only: ${d.onlyPathLines})`;
    verdict(p.length === 0, shown, p.join('; '));
}
// the one cut-copy case in the brief's words
const b01a = results.find((x) => x.c.id === 'b01a');
say(`INFO  b01a error log (the line the controller would read): ${b01a.errlog.trim().replace(/\s+/g, ' ').slice(0, 120)}`);
say(`INFO  b01a cut copy has ${fs.readFileSync(path.join(CAL, 'b01a', 'launcher.cmd'), 'latin1').split('\r\n').length - 1} lines of the real dry launcher's ${fs.readFileSync(path.join(VH, 'launch-h40d-dry.cmd'), 'latin1').split('\r\n').length - 1}; no guard, dist proof 2 or flight line is in it`);
say('');

// ---- C. the dist proof call: the root argument ------------------------------------------------------------------------------
say('=== C. the dist proof call, from the launcher text, against the worktree (read-only) ===');
const proofArgs = ['--expect', 'combined', '--prefix-count', '3', '--offers-marker', 'offers block before the spoken answer'];
const PROOF = path.join(SP, 'dist-proof.mjs');
let rr = spawnSync(NODE, [PROOF, '--root', '.', ...proofArgs], { cwd: WT, encoding: 'utf8' });
verdict(rr.status === 1 && /ERR_INVALID_ARG_VALUE/.test(rr.stderr) && !/every marker as expected/.test(rr.stdout), "known-bad: the literal r4 and brief form '--root .' crashes dist-proof.mjs (createRequire needs an absolute path) after its marker lines, never printing a verdict", `exit ${rr.status}`);
{
    const d = path.join(CAL, 'c02');
    fresh(d);
    const real = fs.readFileSync(path.join(VH, 'launch-h40d-dry.cmd'), 'latin1').split('\r\n');
    const proofLine = real.find((l) => l.startsWith('"') && l.includes('dist-proof.mjs')).split(' >> ')[0];
    fs.writeFileSync(path.join(d, 'run.cmd'), `@echo off\r\n${proofLine} > "${path.join(s83(d), 'out.txt')}" 2>&1\r\n`, 'latin1');
    const res = spawnSync('cmd.exe', ['/c', `"${path.join(s83(d), 'run.cmd')}"`], { cwd: WT, encoding: 'utf8', windowsVerbatimArguments: true });
    const out = fs.readFileSync(path.join(d, 'out.txt'), 'latin1');
    verdict(res.status === 0 && /DIST PROOF: THE COMBINED BUILD, every marker as expected/.test(out) && /filter sha256\/16 42d9bc42dbd17870/.test(out), "the launcher's own dist proof line (--root \"%CD%\", read from the real dry launcher), run by cmd from the worktree: exit 0, the verdict line, the filter hash of the 05:00 re-smoke", `exit ${res.status}`);
}
// the cmd facts the launcher text rests on, measured here so that r4's and the old notes' claims are not taken on trust
say('--- cmd facts the launchers rely on, measured ---');
{
    const d = path.join(CAL, 'fact');
    fresh(d);
    const cmdFile = (name, body) => { fs.writeFileSync(path.join(d, name), body.join('\r\n') + '\r\n', 'latin1'); return path.join(s83(d), name); };
    const runIt = (file) => spawnSync('cmd.exe', ['/c', `"${file}"`], { cwd: s83(d), encoding: 'latin1', windowsVerbatimArguments: true });
    for (const [n, accept] of [[10, true], [16, false], [40, false]]) {
        const f = cmdFile(`fs${n}.cmd`, ['@echo off', `echo ${H1.slice(0, n)}| findstr /R /X "${'[0-9a-f]'.repeat(n)}" >nul 2>&1`, 'if errorlevel 1 (echo REFUSED) else (echo ACCEPTED)']);
        const out = runIt(f).stdout.trim();
        verdict(out === (accept ? 'ACCEPTED' : 'REFUSED'), `findstr /R /X with ${n} character classes on a ${n} character hex line reads ${out}`, 'the engine accepts 10 classes and silently refuses 16 and 40, so the commit check cannot be one 40-class pattern');
    }
    const u = runIt(cmdFile('undef.cmd', ['@echo off', 'set X1=', 'echo [%X1:~39,1%]'])).stdout.trim();
    verdict(u === '[~39,1]', 'an undefined variable with a substring modifier expands to ~39,1, not to nothing', 'so the commit check tests hex-ness first; a length test alone would pass an unset variable');
    const remOut = runIt(cmdFile('remx.cmd', ['@echo off', 'rem a & echo BOOM1 | echo BOOM2 > remx-redirect.txt ( ) ^ 100%', 'echo after'])).stdout.trim();
    verdict(remOut === 'after' && !fs.existsSync(path.join(d, 'remx-redirect.txt')), 'a rem line holding & | > ( ) ^ % executes nothing', 'the generator refuses them in rem lines anyway, which is stricter than cmd needs');
    let t0 = Date.now();
    const to = spawnSync('cmd.exe', ['/c', 'timeout /t 5 < nul 2>&1'], { encoding: 'latin1' });
    const dt1 = Date.now() - t0;
    verdict(to.status === 1 && dt1 < 1500 && /Input redirection is not supported/.test(to.stdout), `timeout /t 5 with redirected input exits ${to.status} after ${dt1} ms with its refusal message`, "r4's reason for ping");
    t0 = Date.now();
    const pg = spawnSync('cmd.exe', ['/c', 'ping -n 3 127.0.0.1 >nul < nul'], { encoding: 'latin1' });
    const dt2 = Date.now() - t0;
    verdict(pg.status === 0 && dt2 >= 1700 && dt2 <= 4000, `ping -n 3 127.0.0.1 with redirected input waits ${dt2} ms (n minus 1 seconds, so ping -n 61 is 60 s)`, '');
}
// what the launchers' own preconditions read in MAIN today: file presence and one text line, read only, nothing is run
say("--- what the launchers' first checks read in MAIN today (read only) ---");
{
    const golden = path.join(MAIN, 'electron', 'test', 'golden');
    for (const [f, code] of [['interview60.flight.mjs', 9], ['holdout40.wav', 8], ['holdout40.questions.mjs', 7]]) verdict(fs.existsSync(path.join(golden, f)), `MAIN holds ${f}, so the launcher's exit ${code} check passes there`);
    verdict(fs.readFileSync(path.join(golden, 'interview60.run.mjs'), 'utf8').includes("process.on('exit', appStop)"), "MAIN's harness holds the exit listener line that the launcher's exit 6 check looks for");
    verdict(fs.existsSync(path.join(golden, 'interview60.runs')), "MAIN's interview60.runs folder exists (every launcher log line is appended there, and a redirect into a missing folder fails)");
    const stale = fs.readdirSync(path.join(golden, 'interview60.runs')).filter((n) => /^flight-h40d/.test(n));
    say(`INFO  flight-h40d launcher logs in MAIN at this moment: ${stale.length} (the logs are appended to, so a stale one would mix two runs; this line is a state, not a check, and reads differently after the dry twin has run)`);
    say(`INFO  the launcher error log in the real TEMP folder at this moment: ${fs.existsSync(path.join(process.env.TEMP, 'natively-h40d-launcher-error.log')) ? 'EXISTS' : 'absent'} (r4: it must not exist at arming)`);
}
say('');

// ---- D. the merge script ---------------------------------------------------------------------------------------------------------
say('=== D. h40d-merge.cmd: derived copies with the verdicts folder pointed at a scratch folder and a stub judge ===');
const ARM_TAGS = [['captured-low', 'gemini-3.1-flash-lite_captured-low'], ['captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r2'], ['captured-low-r3', 'gemini-3.1-flash-lite_captured-low-r3'], ['captured-minimal', 'gemini-3.1-flash-lite_captured-minimal'], ['low', 'gemini-3.1-flash-lite_low'], ['captured-high', 'gemini-3.5-flash-lite_captured-high'], ['captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r2'], ['captured-high-r3', 'gemini-3.5-flash-lite_captured-high-r3'], ['captured-no-cues-high', 'gemini-3.5-flash-lite_captured-no-cues-high'], ['captured-no-cues-high-r2', 'gemini-3.5-flash-lite_captured-no-cues-high-r2'], ['captured-no-cues-high-r3', 'gemini-3.5-flash-lite_captured-no-cues-high-r3'], ['high', 'gemini-3.5-flash-lite_high'], ['bare35', 'gemini-3.5-flash-lite']];
const MODEL_ID = 'claude-opus-5-5';
function mergeSetup(id, { verdicts = [], withRunDir = true, staleFor = null, scriptSrc = path.join(VH, 'h40d-merge.cmd'), prefix = 'h40d' } = {}) {
    const dir = path.join(CAL, id);
    fresh(dir);
    const tree = path.join(dir, 'tree'), verd = path.join(dir, 'verd'), tmp = path.join(dir, 'tmp'), other = path.join(dir, 'other'), stub = path.join(dir, 'stub');
    for (const d of [tree, verd, tmp, other, stub]) fs.mkdirSync(d, { recursive: true });
    fs.mkdirSync(path.join(tree, 'electron', 'test', 'golden'), { recursive: true });
    fs.writeFileSync(path.join(tree, 'electron', 'test', 'golden', 'interview60.judge.mjs'), `import fs from 'node:fs';\nconst a = process.argv.slice(2).join(' ');\nfs.appendFileSync(process.env.STUB_TRACE, 'judge ' + a + '\\n');\nconst bad = process.env.STUB_JUDGE_FAIL_ON;\nif (bad && a.includes(bad)) process.exit(1);\nprocess.exit(Number(process.env.STUB_JUDGE ?? 0));\n`);
    const run = path.join(tree, 'electron', 'test', 'golden', 'interview60.runs', 'RUNDIR-h40d');
    if (withRunDir) { fs.mkdirSync(run, { recursive: true }); fs.writeFileSync(path.join(run, 'interview60.flight.done.json'), '{}'); }
    for (const tag of verdicts) fs.writeFileSync(path.join(verd, `${prefix}-verdicts-${tag}.json`), `marker:${tag}`);
    if (staleFor) fs.writeFileSync(path.join(run, `interview60.judge.verdicts.${staleFor}.json`), 'STALE');
    let t = fs.readFileSync(scriptSrc, 'latin1');
    const setLine = t.split('\r\n').find((l) => l.startsWith('set S='));
    t = t.replace(setLine, `set S=${s83(verd)}`);
    fs.writeFileSync(path.join(dir, 'merge.cmd'), t, 'latin1');
    return { dir, tree, verd, tmp, other, run, relRun: 'electron\\test\\golden\\interview60.runs\\RUNDIR-h40d', setLine };
}
const runMerge = (m, args, cwd83, env = {}) => new Promise((resolve) => {
    const child = spawn('cmd.exe', ['/c', `"${path.join(s83(m.dir), 'merge.cmd')}" ${args}`], { cwd: cwd83, env: { ...process.env, TEMP: s83(m.tmp), STUB_TRACE: path.join(s83(m.dir), 'trace.txt'), ...env }, windowsVerbatimArguments: true, windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
    child.on('exit', (code) => resolve({ exit: code, out }));
});
const ALL_TAGS = ['inapp', ...ARM_TAGS.map((a) => a[0]), 'bare31'];
{
    const realMerge = fs.readFileSync(path.join(VH, 'h40d-merge.cmd'), 'latin1');
    const setLineReal = realMerge.split('\r\n').find((l) => l.startsWith('set S='));
    verdict(setLineReal === `set S=${VH}`, 'the real merge script reads its verdicts from the validation-hour folder', setLineReal.length > 60 ? 'set S=<VH>' : setLineReal);
    let m = mergeSetup('d01');
    let x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, INSTR83);
    verdict(x.exit === 13 && /WRONG CWD OR RUN DIR/.test(x.out) && traceOf(path.join(m.dir, 'trace.txt')).length === 0, 'd01 wrong cwd (VH\\instruments) with a relative run dir: exit 13 and the judge is never called', `exit ${x.exit}`);
    m = mergeSetup('d03');
    x = await runMerge(m, '', s83(m.tree));
    verdict(x.exit === 12 && /USAGE: h40d-merge\.cmd grader-model-id run-dir/.test(x.out), 'd03 no arguments: exit 12 and the usage line', `exit ${x.exit}`);
    m = mergeSetup('d02', { verdicts: ['inapp'] });
    const abs = path.join(m.dir, 'abs');
    fs.mkdirSync(abs);
    fs.writeFileSync(path.join(abs, 'interview60.flight.done.json'), '{}');
    x = await runMerge(m, `${MODEL_ID} ${s83(abs)}`, s83(m.other));
    verdict(x.exit === 13 && /WRONG CWD: the judge script is not here/.test(x.out) && !fs.existsSync(path.join(abs, 'interview60.judge.verdicts.json')) && traceOf(path.join(m.dir, 'trace.txt')).length === 0, 'd02 an ABSOLUTE run dir that exists, run from a wrong folder: exit 13 and NOTHING was copied into the run folder', `exit ${x.exit}; copied: ${fs.existsSync(path.join(abs, 'interview60.judge.verdicts.json'))}`);
    // the known-bad contrast: h40c's script in the same situation copies first and fails afterwards
    {
        const dir = path.join(CAL, 'd02h40c');
        fresh(dir);
        const verd = path.join(dir, 'verd'), other = path.join(dir, 'other'), tmp = path.join(dir, 'tmp'), run = path.join(dir, 'run');
        for (const q of [verd, other, tmp, run]) fs.mkdirSync(q, { recursive: true });
        fs.writeFileSync(path.join(run, 'interview60.flight.done.json'), '{}');
        fs.writeFileSync(path.join(verd, 'h40c-verdicts-inapp.json'), 'marker:inapp');
        let t = fs.readFileSync(path.join(SP, 'h40c-merge.cmd'), 'latin1');
        t = t.replace(t.split('\r\n').find((l) => l.startsWith('set S=')), `set S=${s83(verd)}`);
        fs.writeFileSync(path.join(dir, 'merge.cmd'), t, 'latin1');
        const res = await new Promise((resolve) => { const c = spawn('cmd.exe', ['/c', `"${path.join(s83(dir), 'merge.cmd')}" ${MODEL_ID} ${s83(run)}`], { cwd: s83(other), env: { ...process.env, TEMP: s83(tmp) }, windowsVerbatimArguments: true, windowsHide: true }); let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; }); c.on('exit', (code) => resolve({ exit: code, out })); });
        verdict(res.exit === 1 && fs.existsSync(path.join(run, 'interview60.judge.verdicts.json')), "known-bad contrast: h40c's merge script in the same situation exits 1 only AFTER copying the verdicts file into the run folder (the gap the added check closes)", `exit ${res.exit}; copied: ${fs.existsSync(path.join(run, 'interview60.judge.verdicts.json'))}`);
    }
    m = mergeSetup('d04', { verdicts: ['captured-high'] });
    x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, s83(m.tree));
    verdict(x.exit === 10 && /MISSING h40d-verdicts-inapp\.json/.test(x.out) && traceOf(path.join(m.dir, 'trace.txt')).length === 0 && !fs.existsSync(path.join(m.run, 'interview60.judge.verdicts.json')), 'd04 the in-app verdicts missing (another arm present): exit 10, nothing merged', `exit ${x.exit}`);
    m = mergeSetup('d05', { verdicts: ['inapp'] });
    x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, s83(m.tree));
    let tr = traceOf(path.join(m.dir, 'trace.txt'));
    const skipped = [...x.out.matchAll(/SKIPPED-MISSING (\S+)/g)].map((q) => q[1]);
    const expectSkipped = [...ARM_TAGS.map((a) => a[0]), 'bare31'];
    verdict(x.exit === 0 && same(skipped, expectSkipped) && tr.length === 1 && / --verdicts \S+interview60\.judge\.verdicts\.json --model claude-opus-5-5$/.test(tr[0]) && /ALL MERGES RAN/.test(x.out), `d05 only the in-app verdicts present: the judge runs once (in-app, with --model), ${skipped.length} other arms print SKIPPED-MISSING with their tag`, `exit ${x.exit}; skipped=${skipped.length}`);
    m = mergeSetup('d06', { verdicts: ALL_TAGS });
    x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, s83(m.tree));
    tr = traceOf(path.join(m.dir, 'trace.txt'));
    let wrong = [];
    for (const [tag, id] of ARM_TAGS) {
        const f = path.join(m.run, `interview60.judge.verdicts.${id}.json`);
        if (readOr(f) !== `marker:${tag}`) wrong.push(`${tag}: holds '${readOr(f)}'`);
        const call = tr.find((l) => l.includes(`--answers ${m.relRun}\\interview60.answers.${id}.json --verdicts ${m.relRun}\\interview60.judge.verdicts.${id}.json `));
        if (!call || !call.endsWith(`--model ${MODEL_ID}`)) wrong.push(`${tag}: judge call missing or without --model`);
    }
    if (readOr(path.join(m.run, 'interview60.judge.verdicts.json')) !== 'marker:inapp') wrong.push('inapp file wrong');
    if (readOr(path.join(m.run, 'interview60.judge.verdicts.gemini-3.1-flash-lite.json')) !== 'marker:bare31') wrong.push('bare31 file wrong');
    verdict(x.exit === 0 && wrong.length === 0 && tr.length === 15 && !/SKIPPED/.test(x.out) && tr.every((l) => l.endsWith(`--model ${MODEL_ID}`)), 'd06 every verdicts file present (each holding its own tag): 15 judge calls, every one with --model, and each arm received ITS OWN verdicts file, the three no-cue arms included', `exit ${x.exit}; calls ${tr.length}; ${wrong.join('; ')}`);
    const staleId = 'gemini-3.5-flash-lite_captured-no-cues-high-r2';
    m = mergeSetup('d07', { verdicts: ALL_TAGS.filter((t) => t !== 'captured-no-cues-high-r2'), staleFor: staleId });
    x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, s83(m.tree));
    tr = traceOf(path.join(m.dir, 'trace.txt'));
    verdict(x.exit === 0 && same([...x.out.matchAll(/SKIPPED-MISSING (\S+)/g)].map((q) => q[1]), ['captured-no-cues-high-r2']) && !tr.some((l) => l.includes(staleId)) && readOr(path.join(m.run, `interview60.judge.verdicts.${staleId}.json`)) === 'STALE' && tr.length === 14, 'd07 one graded verdicts file missing (captured-no-cues-high-r2) with a STALE file already in the run folder: exactly one SKIPPED-MISSING, that arm is never merged, the stale file is untouched', `exit ${x.exit}; calls ${tr.length}`);
    m = mergeSetup('d08', { verdicts: ALL_TAGS });
    x = await runMerge(m, `grader-model-9-9 ${m.relRun}`, s83(m.tree));
    tr = traceOf(path.join(m.dir, 'trace.txt'));
    verdict(tr.length === 15 && tr.every((l) => l.endsWith('--model grader-model-9-9')), 'd08 the model id given on the command line is passed unchanged to every merge', `calls ${tr.length}`);
    m = mergeSetup('d09', { verdicts: ALL_TAGS });
    x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, s83(m.tree), { STUB_JUDGE: '1' });
    verdict(x.exit === 1 && traceOf(path.join(m.dir, 'trace.txt')).length === 1, 'd09 the in-app merge fails (the judge exits 1): the script stops with exit 1 before any other arm', `exit ${x.exit}`);
    m = mergeSetup('d10', { verdicts: ALL_TAGS });
    x = await runMerge(m, `${MODEL_ID} ${m.relRun}`, s83(m.tree), { STUB_JUDGE_FAIL_ON: 'captured-high-r2' });
    tr = traceOf(path.join(m.dir, 'trace.txt'));
    const failedArms = [...x.out.matchAll(/MERGE-FAILED (\S+)/g)].map((q) => q[1]);
    verdict(x.exit === 0 && same(failedArms, ['captured-high-r2']) && tr.length === 15 && /ALL MERGES RAN/.test(x.out), 'd10 one arm merge fails (the judge exits 1 for captured-high-r2 only): that arm prints MERGE-FAILED with its tag, the other 14 merges still run, the script still ends with ALL MERGES RAN, exit 0 (h40c behaviour kept: the controller reads the lines)', `exit ${x.exit}; failed=${failedArms.join(',')}; calls ${tr.length}`);
}
// the arm list against the flight's own list of paired arms (imported from the worktree, which is what MAIN becomes)
{
    const flight = await import(pathToFileURL(path.join(WT, 'electron', 'test', 'golden', 'interview60.flight.mjs')).href);
    const arms = flight.PAIRED_ARMS.map((a) => ({ tag: a.tag, id: `${a.model}_${a.tag}` }));
    const mergeText2 = fs.readFileSync(path.join(VH, 'h40d-merge.cmd'), 'latin1');
    const h40cText = fs.readFileSync(path.join(SP, 'h40c-merge.cmd'), 'latin1');
    const has = (txt, a) => new RegExp(`call :arm ${a.tag}\\s+${a.id.replace(/[.]/g, '\\.')}\\r?$`, 'm').test(txt);
    const missing = arms.filter((a) => !has(mergeText2, a)).map((a) => a.tag);
    verdict(arms.length === 12 && missing.length === 0, `the merge script has an :arm line, with the exact answers-file id, for every one of the flight's ${arms.length} paired arms (PAIRED_ARMS, imported from the worktree)`, missing.length ? `missing: ${missing.join(', ')}` : '');
    const missingOld = arms.filter((a) => !has(h40cText, a)).map((a) => a.tag);
    verdict(missingOld.length === 3 && missingOld.every((t) => t.startsWith('captured-no-cues-high')), "known-bad: the same check run on h40c's merge script finds exactly the three no-cue arms missing", `missing: ${missingOld.join(', ')}`);
    // the dispatch text against the same list
    const disp = fs.readFileSync(path.join(VH, 'h40d-grader-dispatch.txt'), 'utf8');
    const graded = arms.filter((a) => /^captured-(high|no-cues-high|low)(-r[23])?$/.test(a.tag));
    const rowOf = (tag) => disp.split('\n').find((l) => l.startsWith(`  ${tag} `));
    const bad = [];
    const expectRow = (tag, pairs) => { const l = rowOf(tag); if (!l || !l.includes(` PAIRS ${pairs} `) || !l.endsWith(`VERDICTS h40d-verdicts-${tag}.json`)) bad.push(tag); };
    expectRow('inapp', 'interview60.judge.pairs.json');
    for (const a of graded) expectRow(a.tag, `interview60.judge.pairs.${a.id}.json`);
    verdict(graded.length === 9 && bad.length === 0, "the dispatch text's ten rows carry the pairs file names the flight's own formula gives (interview60.judge.pairs.MODEL_TAG.json) and the verdicts names the merge script reads", bad.length ? `bad rows: ${bad.join(', ')}` : `${graded.length + 1} rows`);
    const mutated = disp.replace('gemini-3.5-flash-lite_captured-no-cues-high-r2.json', 'gemini-3.1-flash-lite_captured-no-cues-high-r2.json');
    const rowM = mutated.split('\n').find((l) => l.startsWith('  captured-no-cues-high-r2 '));
    verdict(!(rowM.includes(' PAIRS interview60.judge.pairs.gemini-3.5-flash-lite_captured-no-cues-high-r2.json ')), 'known-bad: a dispatch row with the wrong model (3.1 for a no-cue twin) fails the same row comparison', '');
    const h40c = fs.readFileSync(path.join(SP, 'h40c-grader-dispatch.txt'), 'utf8');
    const MARK = '----- dispatch text (substitute RUN, VERDICTS and TAG) -----';
    verdict(disp.slice(disp.indexOf(MARK)) === h40c.slice(h40c.indexOf(MARK)), "the dispatch text proper (from its marker line to the end) equals h40c's, character for character", `${Buffer.byteLength(h40c.slice(h40c.indexOf(MARK)))} bytes`);
    verdict(disp.slice(disp.indexOf(MARK)) !== (h40c.slice(h40c.indexOf(MARK)).replace('grading one arm', 'grading ONE arm')), 'known-bad: a one-word change in the dispatch text proper would be seen by the same comparison', '');
}
say('');
say('=== E. register-h40d.ps1 and h40d-precheck.ps1: instruments\\ps-cal.ps1 (the parser, the functions cut out by AST, real tasks read-only, the precheck known case) ===');
const psr = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false); & '${path.join(HERE, 'ps-cal.ps1')}'; exit $LASTEXITCODE`], { encoding: 'utf8', timeout: 240000 });
for (const l of psr.stdout.split(/\r?\n/)) if (l !== '') say(l);
const psm = /SUMMARY ps-cal: (\d+) PASS, (\d+) FAIL/.exec(psr.stdout);
if (!psm || psr.status !== Number(psm[2])) verdict(false, 'ps-cal.ps1 did not end with its SUMMARY line', `exit ${psr.status}`);
else { passes += Number(psm[1]); fails += Number(psm[2]); }
say('');
say(`SUMMARY launchers-cal: ${passes} PASS, ${fails} FAIL (sections A-D counted by this script, section E by ps-cal.ps1)`);
fs.writeFileSync(REPORT, lines.join('\n') + '\n', 'utf8');
process.exit(fails);
