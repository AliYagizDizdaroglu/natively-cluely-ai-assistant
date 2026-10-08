// gen-launchers.mjs: writes the four h40d .cmd files from their source texts (launch-h40d-src.txt, h40d-merge-src.txt)
// and reads every written file back byte by byte. ASCII, CRLF, never edited by hand and never with sed (r4 section 7.4).
//
//   node gen-launchers.mjs [--commit HASH] [--prestart-commit HASH] [--out DIR]
//       Writes launch-h40d.cmd, launch-h40d-dry.cmd, launch-h40d-prestart.cmd and h40d-merge.cmd into DIR (default: the
//       validation-hour folder), then verifies each file. HASH is 40 lowercase hex characters; anything else is refused.
//       --commit fills NATIVELY_FLIGHT_COMMIT of the flight and dry launchers (the registered HEAD, known only once the
//       pre-registration is committed); --prestart-commit fills the prestart launcher's (MAIN's HEAD when the prestart
//       runs, which is BEFORE the pre-registration commit, so it is a different hash). A commit option that is left out
//       keeps the value the file in DIR already holds, else the placeholder.
//   node gen-launchers.mjs --check [--armed] [--out DIR]
//       Writes nothing: reads the four files in DIR back against the sources. --armed also fails on any placeholder.
//
// Exit 0 = every file passes, 1 = a check failed, 2 = bad arguments or a source problem. Prints names, counts and
// sha256/12 fingerprints only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // VH\instruments
const VH = path.resolve(HERE, '..');
const SP = path.resolve(VH, '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const has = (k) => args.includes(k);
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };

const KNOWN = new Set(['--commit', '--prestart-commit', '--out', '--check', '--armed']);
args.forEach((a, i) => { if (a.startsWith('--') && !KNOWN.has(a)) refuse(`unknown option ${a}`); if (!a.startsWith('--') && !['--commit', '--prestart-commit', '--out'].includes(args[i - 1])) refuse(`unexpected argument ${a}`); });
const OUT = path.resolve(opt('--out') ?? VH);
if (!fs.existsSync(OUT) || !fs.statSync(OUT).isDirectory()) refuse(`--out is not a folder: ${OUT}`);
const CHECK = has('--check'), ARMED = has('--armed');
if (ARMED && !CHECK) refuse('--armed belongs to --check');
if (CHECK && (opt('--commit') !== undefined || opt('--prestart-commit') !== undefined)) refuse('--check writes nothing, so it takes no commit option');
const HASH = /^[0-9a-f]{40}$/;
for (const k of ['--commit', '--prestart-commit']) if (has(k) && !HASH.test(opt(k) ?? '')) refuse(`${k} is not a full 40 character lowercase hash`);

const NODE = '"C:\\Program Files\\nodejs\\node.exe"';
const ERR = '"%TEMP%\\natively-h40d-launcher-error.log"';
const PROOF = '{{NODE}} "{{SP}}\\dist-proof.mjs" --root "%CD%" --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer"';
const PLACEHOLDER = { flight: '@@REGISTERED_HEAD_FULL_HASH@@', prestart: '@@MAIN_HEAD_AT_PRESTART@@' };
const VARIANTS = [
    { file: 'launch-h40d.cmd', label: 'h40d', parts: ['head-flight', 'common', 'tail-flight'], key: 'flight' },
    { file: 'launch-h40d-dry.cmd', label: 'h40d-dry', parts: ['head-dry', 'common', 'tail-dry'], key: 'flight' },
    { file: 'launch-h40d-prestart.cmd', label: 'h40d-prestart', parts: ['head-prestart', 'common', 'tail-prestart'], key: 'prestart' },
];
const MERGE = 'h40d-merge.cmd';

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
    for (let n = 0; n < 6 && /\{\{[A-Z]+\}\}/.test(s); n++) {
        s = s.replace(/\{\{([A-Z]+)\}\}/g, (m, k) => { if (!(k in vars)) throw new SourceError(`unknown macro ${m}`); return vars[k]; });
    }
    if (/\{\{|\}\}/.test(s)) throw new SourceError(`a macro is left unexpanded in: ${line}`);
    return s;
}

// cmd hazards, linted on the finished lines. Calibrated by launchers-cal.mjs (a mutated line must be refused).
function lint(lines, file) {
    const bad = [];
    let inBlock = false;
    lines.forEach((l, i) => {
        const at = `${file} line ${i + 1}`;
        if (!/^[\x20-\x7e]*$/.test(l)) bad.push(`${at}: a character outside printable ASCII`);
        if (l.includes('@@') && !/^set NATIVELY_FLIGHT_COMMIT=@@[A-Z_]+@@$/.test(l)) bad.push(`${at}: an @@ token outside the commit line`);
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

function composeLauncher(v, sections, commit) {
    const vars = { LABEL: v.label, LOG: `electron\\test\\golden\\interview60.runs\\flight-${v.label}.launcher.log`, ERR, NODE, SP, VH, PROOF, COMMIT: commit };
    const parts = v.parts.map((p) => { if (!sections.has(p)) throw new SourceError(`section ${p} is missing`); return sections.get(p).map((l) => expand(l, vars)); });
    const lines = parts.flat();
    const bad = lint(lines, v.file);
    if (lines.filter((l) => l.startsWith('set NATIVELY_FLIGHT_COMMIT=')).length !== 1) bad.push(`${v.file}: not exactly one NATIVELY_FLIGHT_COMMIT line`);
    if (lines[0] !== '@echo off') bad.push(`${v.file}: the first line is not @echo off`);
    return { lines, parts, bad };
}

function composeMerge() {
    const lines = trimEnd(dropNotes(readSource('h40d-merge-src.txt'))).map((l) => expand(l, { VH, SP }));
    return { lines, bad: lint(lines, MERGE) };
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

function commitOf(buf) {
    const m = /^set NATIVELY_FLIGHT_COMMIT=(.*)$/m.exec(buf.toString('latin1').replace(/\r\n/g, '\n'));
    return m ? m[1] : null;
}

const fingerprint = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
const state = (key, value) => (value === PLACEHOLDER[key] ? 'placeholder' : HASH.test(value ?? '') ? 'filled' : 'INVALID');

let sections, merge;
try {
    sections = parseSections(readSource('launch-h40d-src.txt'));
    const known = new Set(VARIANTS.flatMap((v) => v.parts));
    for (const k of sections.keys()) if (!known.has(k)) throw new SourceError(`section ${k} is not used by any launcher`);
    merge = composeMerge();
} catch (e) {
    if (e instanceof SourceError) refuse(e.message);
    throw e;
}

// the commit value of each launcher: the option, else what the file in OUT holds, else the placeholder
const plan = VARIANTS.map((v) => {
    const file = path.join(OUT, v.file);
    const existing = fs.existsSync(file) ? commitOf(fs.readFileSync(file)) : null;
    let commit;
    if (CHECK) commit = existing ?? '(no commit line)';
    else {
        const given = opt(v.key === 'flight' ? '--commit' : '--prestart-commit');
        commit = given ?? (existing !== null && state(v.key, existing) !== 'INVALID' ? existing : PLACEHOLDER[v.key]);
    }
    return { v, file, commit };
});

let failures = 0;
const results = [];
const composed = [];
for (const { v, file, commit } of plan) {
    if (CHECK && !fs.existsSync(file)) {
        results.push({ name: v.file, problems: ['the file is missing'], line: `${v.file}: MISSING` });
        failures++;
        composed.push(null);
        continue;
    }
    if (CHECK && state(v.key, commit) === 'INVALID') {
        results.push({ name: v.file, problems: [`the commit value is neither the placeholder nor a full hash`], line: `${v.file}: not read further` });
        failures++;
        composed.push(null);
        continue;
    }
    let c;
    try { c = composeLauncher(v, sections, commit); } catch (e) { if (e instanceof SourceError) refuse(e.message); throw e; }
    composed.push(c);
}
if (!CHECK) {
    const allBad = [...composed.flatMap((c) => c.bad), ...merge.bad];
    if (allBad.length) { console.log('REFUSED: the sources do not lint, nothing was written:'); allBad.forEach((b) => console.log(`  ${b}`)); process.exit(2); }
}

const rows = [...plan.map((p, i) => ({ name: p.v.file, file: p.file, expected: composed[i]?.lines, key: p.v.key, commit: p.commit, lintBad: composed[i]?.bad ?? [] })), { name: MERGE, file: path.join(OUT, MERGE), expected: merge.lines, key: null, commit: null, lintBad: merge.bad }];
for (const r of rows) {
    if (!r.expected) continue; // a launcher whose commit value was invalid was already counted
    if (!CHECK) fs.writeFileSync(r.file, toBytes(r.expected));
    if (!fs.existsSync(r.file)) { results.push({ name: r.name, problems: ['the file is missing'], line: `${r.name}: MISSING` }); failures++; continue; }
    const buf = fs.readFileSync(r.file);
    const { problems, stats } = verifyBytes(buf, r.expected);
    const allProblems = [...problems, ...(CHECK ? r.lintBad : [])];
    const st = r.key ? state(r.key, r.commit) : null;
    if (ARMED && st === 'placeholder') allProblems.push('--armed: the commit is still a placeholder');
    const line = `${r.name.padEnd(26)} ${String(stats.bytes).padStart(5)} bytes ${String(stats.lines).padStart(3)} lines  CRLF ${stats.crlf}  bare LF ${stats.bareLf}  bare CR ${stats.bareCr}  above 126: ${stats.high}  other control: ${stats.ctrl}  BOM ${stats.bom ? 'YES' : 'no'}  ends with CRLF ${stats.endsCrlf ? 'yes' : 'NO'}  source lines missing ${stats.missing}  differing ${stats.differing}  commit ${st ?? 'n/a'}  sha256/12 ${fingerprint(buf)}  ${allProblems.length ? 'FAIL' : 'PASS'}`;
    results.push({ name: r.name, problems: allProblems, line, st });
    if (allProblems.length) failures++;
}

// the dry twin is the flight launcher up to and including the guard (r4 section 7.4): after the head, the common
// section of the one equals the common section of the other once the label is normalised
{
    const iF = 0, iD = 1;
    if (composed[iF] && composed[iD]) {
        const read = (i) => (fs.existsSync(plan[i].file) ? fs.readFileSync(plan[i].file).toString('latin1').split('\r\n') : []);
        const lenCommon = composed[iF].parts[1].length;
        const f = read(iF).slice(composed[iF].parts[0].length, composed[iF].parts[0].length + lenCommon);
        const d = read(iD).slice(composed[iD].parts[0].length, composed[iD].parts[0].length + lenCommon).map((l) => l.split('h40d-dry').join('h40d'));
        const same = f.length === lenCommon && d.length === lenCommon && f.every((l, i) => l === d[i]);
        console.log(`structure: the dry twin's preconditions, environment, commit check, wav:check, dist proof 1 and guard (${lenCommon} lines) equal the flight launcher's after label normalisation: ${same ? 'YES' : 'NO'}`);
        if (!same) failures++;
    }
}

console.log(`${CHECK ? 'CHECK' : 'WROTE AND READ BACK'} in ${OUT}`);
results.forEach((r) => { console.log(r.line); r.problems.forEach((p) => console.log(`    - ${p}`)); });
const placeholders = results.filter((r) => r.st === 'placeholder').map((r) => r.name);
console.log(`PLACEHOLDERS: ${placeholders.length ? `${placeholders.join(', ')} still hold a placeholder${ARMED ? ' (--armed: a failure)' : ''}` : 'none'}`);
console.log(failures ? `GENERATOR: FAILED (${failures} check(s))` : 'GENERATOR: ALL 4 FILES PASS');
process.exit(failures ? 1 : 0);
