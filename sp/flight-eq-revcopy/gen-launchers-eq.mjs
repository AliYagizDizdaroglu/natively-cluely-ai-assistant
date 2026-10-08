// gen-launchers-eq.mjs: writes launch-eq.cmd and launch-eq-dry.cmd from launch-eq-src.txt and reads every written file back
// byte by byte (VH\instruments\gen-launchers.mjs, re-pointed to flight-eq: A2.10 P7). ASCII, CRLF, never edited by hand and
// never with sed.
//
//   node gen-launchers-eq.mjs [--commit HASH] [--t "yyyy-MM-dd HH:mm"] [--passes a.md,b.md,...] [--out DIR]
//       Writes launch-eq.cmd and launch-eq-dry.cmd into DIR (default: E, this folder), then verifies each file.
//       HASH is 40 lowercase hex characters (the registered HEAD); T is the task time, local, inside 2026-10-05 19:30 ..
//       2026-10-06 01:00 (A1.1; the guard checks it again); --passes names the committed texts the launcher prints the
//       sha256 of at HEAD (default: the registration, A1..A6). An option that is left out keeps the value the file in DIR
//       already holds, else the placeholder. The controller picks T and the HEAD; this tool never does.
//   node gen-launchers-eq.mjs --check [--armed] [--out DIR]
//       Writes nothing: reads the two files in DIR back against the source. --armed also fails on any placeholder.
//
// Exit 0 = every file passes, 1 = a check failed, 2 = bad arguments or a source problem. Prints names, counts and sha256/12
// fingerprints only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // E
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const has = (k) => args.includes(k);
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };

const VALUE_OPTS = ['--commit', '--t', '--passes', '--out'];
const KNOWN = new Set([...VALUE_OPTS, '--check', '--armed']);
args.forEach((a, i) => { if (a.startsWith('--') && !KNOWN.has(a)) refuse(`unknown option ${a}`); if (!a.startsWith('--') && !VALUE_OPTS.includes(args[i - 1])) refuse(`unexpected argument ${a}`); });
for (const k of VALUE_OPTS) if (has(k) && (opt(k) === undefined || opt(k).startsWith('--'))) refuse(`${k} needs a value`);
const OUT = path.resolve(opt('--out') ?? HERE);
if (!fs.existsSync(OUT) || !fs.statSync(OUT).isDirectory()) refuse(`--out is not a folder: ${OUT}`);
const CHECK = has('--check'), ARMED = has('--armed');
if (ARMED && !CHECK) refuse('--armed belongs to --check');
if (CHECK && VALUE_OPTS.filter((k) => k !== '--out').some(has)) refuse('--check writes nothing, so it takes no --commit, --t or --passes');
const HASH = /^[0-9a-f]{40}$/;
if (has('--commit') && !HASH.test(opt('--commit'))) refuse('--commit is not a full 40 character lowercase hash');
// T: format, a real calendar time, and the evening window (A1.1), read as +03:00 like the guard
const T_FORMAT = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/;
function tInstant(s) {
    const m = T_FORMAT.exec(s ?? '');
    if (!m) return NaN;
    const [y, mo, d, h, mi] = m.slice(1).map(Number);
    const ms = Date.UTC(y, mo - 1, d, h - 3, mi);
    const b = new Date(ms + 3 * 3600000);
    return b.getUTCFullYear() === y && b.getUTCMonth() === mo - 1 && b.getUTCDate() === d && b.getUTCHours() === h && b.getUTCMinutes() === mi ? ms : NaN;
}
const T_LO = tInstant('2026-10-05 19:30'), T_HI = tInstant('2026-10-06 01:00');
if (has('--t')) {
    const ms = tInstant(opt('--t'));
    if (!Number.isFinite(ms)) refuse(`--t is not a valid "yyyy-MM-dd HH:mm" time: ${JSON.stringify(opt('--t'))}`);
    if (ms < T_LO || ms > T_HI) refuse(`--t ${opt('--t')} is outside 2026-10-05 19:30 .. 2026-10-06 01:00 (A1.1)`);
}
const DEFAULT_PASSES = ['PREREGISTER-flight-eq.md', 'flight-eq-AMENDMENT-A1.md', 'flight-eq-AMENDMENT-A2.md', 'flight-eq-AMENDMENT-A3.md', 'flight-eq-AMENDMENT-A4.md', 'flight-eq-AMENDMENT-A5.md', 'flight-eq-AMENDMENT-A6.md'];
// the passes list: the option, else what the launcher already in OUT holds, else the default (--check reads the file's own)
const existingPasses = (() => { const f = path.join(OUT, 'launch-eq.cmd'); return fs.existsSync(f) ? /--passes "([^"]*)"/.exec(fs.readFileSync(f, 'latin1'))?.[1] : undefined; })();
const PASSES = (CHECK ? (existingPasses ?? DEFAULT_PASSES.join(',')) : (opt('--passes') ?? existingPasses ?? DEFAULT_PASSES.join(','))).split(',');
if (PASSES.some((p) => !/^[A-Za-z0-9._-]+\.md$/.test(p)) || new Set(PASSES).size !== PASSES.length) refuse(`--passes must be distinct file names like flight-eq-AMENDMENT-A1.md, comma separated: ${PASSES.join(',')}`);

const NODE = '"C:\\Program Files\\nodejs\\node.exe"';
const ERR = '"%TEMP%\\natively-eq-launcher-error.log"';
const PLACEHOLDER = { commit: '@@REGISTERED_HEAD_FULL_HASH@@', t: '@@T@@' };
const VARIANTS = [
    { file: 'launch-eq.cmd', label: 'eq', parts: ['head-flight', 'common', 'guard-flight', 'tail-flight'] },
    { file: 'launch-eq-dry.cmd', label: 'eq-dry', parts: ['head-dry', 'common', 'guard-dry', 'tail-dry'] },
];

class SourceError extends Error {}
const readSource = (name) => fs.readFileSync(path.join(HERE, name), 'latin1').replace(/\r\n/g, '\n').split('\n');
const dropNotes = (lines) => lines.filter((l) => !l.startsWith('##'));
const trimEnd = (lines) => { const r = [...lines]; while (r.length && r[r.length - 1].trim() === '') r.pop(); return r; };

function parseSections(lines) {
    const sections = new Map();
    let cur = null;
    dropNotes(lines).forEach((l, i) => {
        const m = /^=== ([a-z-]+) ===$/.exec(l);
        if (m) { if (sections.has(m[1])) throw new SourceError(`section ${m[1]} appears twice`); cur = []; sections.set(m[1], cur); return; }
        if (cur === null) { if (l.trim() === '') return; throw new SourceError(`source line ${i + 1} is outside any section`); }
        cur.push(l);
    });
    for (const [k, v] of sections) sections.set(k, trimEnd(v));
    return sections;
}

function expand(line, vars) {
    let s = line;
    for (let n = 0; n < 6 && /\{\{[A-Z0-9]+\}\}/.test(s); n++) {
        s = s.replace(/\{\{([A-Z0-9]+)\}\}/g, (m, k) => { if (!(k in vars)) throw new SourceError(`unknown macro ${m}`); return vars[k]; });
    }
    if (/\{\{|\}\}/.test(s)) throw new SourceError(`a macro is left unexpanded in: ${line}`);
    return s;
}

// cmd hazards, linted on the finished lines. Calibrated by launchers-eq-cal.mjs (a mutated line must be refused).
function lint(lines, file) {
    const bad = [];
    let inBlock = false;
    lines.forEach((l, i) => {
        const at = `${file} line ${i + 1}`;
        if (!/^[\x20-\x7e]*$/.test(l)) bad.push(`${at}: a character outside printable ASCII`);
        if (/\s$/.test(l)) bad.push(`${at}: trailing whitespace (a trailing space after a set value is part of the value in cmd)`);
        if (l.includes('@@') && !/^set NATIVELY_(FLIGHT_COMMIT=@@REGISTERED_HEAD_FULL_HASH@@|EQ_T=@@T@@)$/.test(l)) bad.push(`${at}: an @@ token outside the commit and T lines`);
        if (/^\s*rem(\s|$)/i.test(l) && /[%()&|<>^]/.test(l)) bad.push(`${at}: a rem line holds one of % ( ) & | < > ^`);
        if (/\d>>/.test(l)) bad.push(`${at}: a digit directly before >> would read as a handle redirect`);
        if (inBlock && /^\s*echo /i.test(l)) {
            const msg = l.trimStart().slice(5).split(' >> ')[0].split('%CD%').join('');
            if (/[()&|<>^%!"]/.test(msg)) bad.push(`${at}: an echo inside an if-block holds one of ( ) & | < > ^ % ! or a quote`);
        }
        if (/^if .*\($/i.test(l)) inBlock = true;
        else if (l === ')') inBlock = false;
    });
    if (inBlock) bad.push(`${file}: an if-block is never closed`);
    return bad;
}

function composeLauncher(v, sections, commit, t) {
    const proofBase = `${NODE} "%~dp0eq-proofs.mjs" --root "%CD%"`;
    const log = `electron\\test\\golden\\interview60.runs\\flight-${v.label}.launcher.log`;
    const vars = { LABEL: v.label, LOG: log, ERR, NODE, PROOFS1: proofBase, PROOFS2: `${proofBase} --same-as-log ${log}`, PASSES: PASSES.join(','), COMMIT: commit, T: t };
    const parts = v.parts.map((p) => { if (!sections.has(p)) throw new SourceError(`section ${p} is missing`); return sections.get(p).map((l) => expand(l, vars)); });
    const lines = parts.flat();
    const bad = lint(lines, v.file);
    if (lines.filter((l) => l.startsWith('set NATIVELY_FLIGHT_COMMIT=')).length !== 1) bad.push(`${v.file}: not exactly one NATIVELY_FLIGHT_COMMIT line`);
    if (lines.filter((l) => l.startsWith('set NATIVELY_EQ_T=')).length !== 1) bad.push(`${v.file}: not exactly one NATIVELY_EQ_T line`);
    if (lines[0] !== '@echo off') bad.push(`${v.file}: the first line is not @echo off`);
    return { lines, parts, bad };
}

const toBytes = (lines) => Buffer.from(lines.join('\r\n') + '\r\n', 'latin1');

function verifyBytes(buf, expected) {
    const p = [];
    let crlf = 0, bareLf = 0, bareCr = 0, high = 0, ctrl = 0;
    for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        if (c === 0x0d) { if (buf[i + 1] === 0x0a) { crlf++; i++; } else bareCr++; }
        else if (c === 0x0a) bareLf++;
        else if (c > 0x7e) high++;
        else if (c < 0x20) ctrl++;
    }
    const bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const endsCrlf = buf.length >= 2 && buf[buf.length - 2] === 0x0d && buf[buf.length - 1] === 0x0a;
    if (bom) p.push('a UTF-8 BOM at the start');
    if (bareLf) p.push(`${bareLf} line end(s) are a bare LF`);
    if (bareCr) p.push(`${bareCr} bare CR byte(s)`);
    if (high) p.push(`${high} byte(s) above 126`);
    if (ctrl) p.push(`${ctrl} control byte(s) other than CR LF`);
    if (!endsCrlf) p.push('the file does not end with CRLF');
    const got = buf.toString('latin1').split('\r\n');
    if (got[got.length - 1] === '') got.pop();
    const gotSet = new Set(got);
    const missing = expected.filter((l) => !gotSet.has(l)).length;
    const differing = [];
    for (let i = 0; i < Math.max(got.length, expected.length); i++) if (got[i] !== expected[i]) differing.push(i + 1);
    if (got.length !== expected.length) p.push(`${got.length} lines, the source gives ${expected.length}`);
    if (missing) p.push(`${missing} source line(s) are missing from the file`);
    if (differing.length) p.push(`${differing.length} line(s) differ from the source, the first at line ${differing[0]}`);
    return { problems: p, stats: { bytes: buf.length, lines: got.length, crlf, bareLf, bareCr, high, ctrl, bom, endsCrlf, missing, differing: differing.length } };
}

const valueOf = (buf, name) => { const m = new RegExp(`^set ${name}=(.*)$`, 'm').exec(buf.toString('latin1').replace(/\r\n/g, '\n')); return m ? m[1] : null; };
const fingerprint = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
const stateOf = (kind, value) => (value === PLACEHOLDER[kind] ? 'placeholder' : (kind === 'commit' ? HASH.test(value ?? '') : Number.isFinite(tInstant(value))) ? 'filled' : 'INVALID');

let sections;
try {
    sections = parseSections(readSource('launch-eq-src.txt'));
    const known = new Set(VARIANTS.flatMap((v) => v.parts));
    for (const k of sections.keys()) if (!known.has(k)) throw new SourceError(`section ${k} is not used by any launcher`);
} catch (e) {
    if (e instanceof SourceError) refuse(e.message);
    throw e;
}

// the commit and T of each launcher: the option, else what the file in OUT holds, else the placeholder
const plan = VARIANTS.map((v) => {
    const file = path.join(OUT, v.file);
    const buf = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const pick = (kind, name, optName) => {
        const existing = buf ? valueOf(buf, name) : null;
        if (CHECK) return existing ?? '(no line)';
        return opt(optName) ?? (existing !== null && stateOf(kind, existing) !== 'INVALID' ? existing : PLACEHOLDER[kind]);
    };
    return { v, file, commit: pick('commit', 'NATIVELY_FLIGHT_COMMIT', '--commit'), t: pick('t', 'NATIVELY_EQ_T', '--t') };
});

let failures = 0;
const results = [];
const composed = [];
for (const { v, file, commit, t } of plan) {
    if (CHECK && !fs.existsSync(file)) { results.push({ name: v.file, problems: ['the file is missing'], line: `${v.file}: MISSING` }); failures++; composed.push(null); continue; }
    if (CHECK && (stateOf('commit', commit) === 'INVALID' || stateOf('t', t) === 'INVALID')) {
        results.push({ name: v.file, problems: ['the commit or T value is neither the placeholder nor a valid value'], line: `${v.file}: not read further` }); failures++; composed.push(null); continue;
    }
    try { composed.push(composeLauncher(v, sections, commit, t)); } catch (e) { if (e instanceof SourceError) refuse(e.message); throw e; }
}
if (!CHECK) {
    const allBad = composed.flatMap((c) => c.bad);
    if (allBad.length) { console.log('REFUSED: the sources do not lint, nothing was written:'); allBad.forEach((b) => console.log(`  ${b}`)); process.exit(2); }
}

for (const [i, { v, file, commit, t }] of plan.entries()) {
    const c = composed[i];
    if (!c) continue;
    if (!CHECK) fs.writeFileSync(file, toBytes(c.lines));
    if (!fs.existsSync(file)) { results.push({ name: v.file, problems: ['the file is missing'], line: `${v.file}: MISSING` }); failures++; continue; }
    const buf = fs.readFileSync(file);
    const { problems, stats } = verifyBytes(buf, c.lines);
    const allProblems = [...problems, ...(CHECK ? c.bad : [])];
    const sc = stateOf('commit', commit), st = stateOf('t', t);
    if (ARMED && (sc === 'placeholder' || st === 'placeholder')) allProblems.push('--armed: the commit or T is still a placeholder');
    const line = `${v.file.padEnd(20)} ${String(stats.bytes).padStart(5)} bytes ${String(stats.lines).padStart(3)} lines  CRLF ${stats.crlf}  bare LF ${stats.bareLf}  bare CR ${stats.bareCr}  above 126: ${stats.high}  other control: ${stats.ctrl}  BOM ${stats.bom ? 'YES' : 'no'}  ends with CRLF ${stats.endsCrlf ? 'yes' : 'NO'}  source lines missing ${stats.missing}  differing ${stats.differing}  commit ${sc}  T ${st}  sha256/12 ${fingerprint(buf)}  ${allProblems.length ? 'FAIL' : 'PASS'}`;
    results.push({ name: v.file, problems: allProblems, line, sc, st });
    if (allProblems.length) failures++;
}

// the dry twin is the flight launcher up to and including the guard, but for ONE argument on the guard line
{
    const f = composed[0], d = composed[1];
    if (f && d) {
        const read = (i) => (fs.existsSync(plan[i].file) ? fs.readFileSync(plan[i].file).toString('latin1').split('\r\n') : []);
        const lenCommon = f.parts[1].length;
        const fc = read(0).slice(f.parts[0].length, f.parts[0].length + lenCommon);
        const dc = read(1).slice(d.parts[0].length, d.parts[0].length + lenCommon).map((l) => l.split('flight-eq-dry.launcher.log').join('flight-eq.launcher.log').split('LAUNCHER eq-dry').join('LAUNCHER eq').split('flight-eq-dry.').join('flight-eq.'));
        const same = fc.length === lenCommon && dc.length === lenCommon && fc.every((l, i) => l === dc[i]);
        const fg = f.parts[2].filter((l) => !l.startsWith('rem '));
        const dg = d.parts[2].filter((l) => !l.startsWith('rem '));
        const guardLineF = fg.find((l) => l.includes('guard-eq.mjs')) ?? '';
        const guardLineD = dg.find((l) => l.includes('guard-eq.mjs')) ?? '';
        const oneArg = guardLineF.includes(' --require-precheck') && !guardLineD.includes('--require-precheck') && guardLineF.replace(' --require-precheck', '').split('flight-eq.launcher.log').join('X') === guardLineD.split('flight-eq-dry.launcher.log').join('X');
        console.log(`structure: the dry twin's preconditions, environment, commit check, committed-text shas, wav:check and dist proofs 1 (${lenCommon} lines) equal the flight launcher's after label normalisation: ${same ? 'YES' : 'NO'}`);
        console.log(`structure: the two guard lines differ by exactly --require-precheck, in the flight launcher only: ${oneArg ? 'YES' : 'NO'}`);
        if (!same) failures++;
        if (!oneArg) failures++;
    }
}

console.log(`${CHECK ? 'CHECK' : 'WROTE AND READ BACK'} in ${OUT}`);
results.forEach((r) => { console.log(r.line); r.problems.forEach((p) => console.log(`    - ${p}`)); });
const placeholders = results.filter((r) => r.sc === 'placeholder' || r.st === 'placeholder').map((r) => `${r.name} (${[r.sc === 'placeholder' ? 'commit' : null, r.st === 'placeholder' ? 'T' : null].filter(Boolean).join(', ')})`);
console.log(`PLACEHOLDERS: ${placeholders.length ? `${placeholders.join(', ')} still hold a placeholder${ARMED ? ' (--armed: a failure)' : ''}` : 'none'}`);
console.log(`PASSES (printed by the launcher, committed texts at HEAD): ${PASSES.join(', ')}`);
console.log(failures ? `GENERATOR: FAILED (${failures} check(s))` : 'GENERATOR: BOTH FILES PASS');
process.exit(failures ? 1 : 0);
