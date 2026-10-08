// gen-launchers-rd.mjs: writes launch-rd.cmd and launch-rd-dry.cmd from launch-rd-src.txt and reads every written file back byte by byte
// (SP\flight-eq\gen-launchers-eq.mjs re-pointed to the router-default hour). ASCII, CRLF, never edited by hand and never with sed.
//
//   node gen-launchers-rd.mjs [--commit HASH] [--t "yyyy-MM-dd HH:mm"] [--deadline-min N] [--ctx-sha12 HEX12] [--extra-requests N] [--passes a.md,b.md,...] [--out DIR]
//       --extra-requests is the count of requests made by SCRIPTS (smoke and probe bare calls, replays) that no app log shows: r7 adds it to the ledger's use.
//       Writes launch-rd.cmd and launch-rd-dry.cmd into DIR (default: this folder), then verifies each file.
//       HASH is 40 lowercase hex characters (the registered HEAD). T is the task time, local (+03:00). fix2: T given with --t must be at least now + 15 min and at most
//       now + 24 h, and T + 75 min (the run's expected end) must stay inside ONE quota day (the day starts 07:00Z = 10:00 local); a T kept from the file in DIR
//       is checked for the quota day only. The guard bounds the START against T ([T - 6 min, T + 30 min]). --now <iso> is the calibration clock.
//       --deadline-min is I60_PROBE_DEADLINE_MIN (whole minutes, 1..240); --ctx-sha12 is the smoke's context_sha12 (12 lowercase hex).
//       --passes names the committed texts the launcher prints the sha256 of at HEAD (default: the registration).
//       An option that is left out keeps the value the file in DIR already holds, else the placeholder. The controller picks all four values.
//   node gen-launchers-rd.mjs --check [--armed] [--out DIR]
//       Writes nothing: reads the two files in DIR back against the source. --armed also fails on any placeholder.
//
// Exit 0 = every file passes, 1 = a check failed, 2 = bad arguments or a source problem. Prints names, counts and sha256/12 only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const has = (k) => args.includes(k);
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };

const RUN_LABEL = 'router-default-r1';   // controller ruling: the flight label; the blind export refuses any folder not named <stamp>-router-default-r1
const VALUE_OPTS = ['--commit', '--t', '--deadline-min', '--ctx-sha12', '--extra-requests', '--passes', '--out', '--now'];
const KNOWN = new Set([...VALUE_OPTS, '--check', '--armed']);
args.forEach((a, i) => { if (a.startsWith('--') && !KNOWN.has(a)) refuse(`unknown option ${a}`); if (!a.startsWith('--') && !VALUE_OPTS.includes(args[i - 1])) refuse(`unexpected argument ${a}`); });
for (const k of VALUE_OPTS) if (has(k) && (opt(k) === undefined || opt(k).startsWith('--'))) refuse(`${k} needs a value`);
const OUT = path.resolve(opt('--out') ?? HERE);
if (!fs.existsSync(OUT) || !fs.statSync(OUT).isDirectory()) refuse(`--out is not a folder: ${OUT}`);
const CHECK = has('--check'), ARMED = has('--armed');
if (ARMED && !CHECK) refuse('--armed belongs to --check');
if (CHECK && VALUE_OPTS.filter((k) => k !== '--out' && k !== '--now').some(has)) refuse('--check writes nothing, so it takes no --commit, --t, --deadline-min, --ctx-sha12 or --passes');

// T: format, a real calendar time, and its run inside one quota day, read as +03:00 like the guard
const T_FORMAT = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/;
function tInstant(s) {
    const m = T_FORMAT.exec(s ?? '');
    if (!m) return NaN;
    const [y, mo, d, h, mi] = m.slice(1).map(Number);
    const ms = Date.UTC(y, mo - 1, d, h - 3, mi);
    const b = new Date(ms + 3 * 3600000);
    return b.getUTCFullYear() === y && b.getUTCMonth() === mo - 1 && b.getUTCDate() === d && b.getUTCHours() === h && b.getUTCMinutes() === mi ? ms : NaN;
}
// fix2: the quota day starts 07:00Z and the run ends T + 75 min: both must fall in the same quota day. The clock rule applies to a T GIVEN now (below).
const RUN_MIN = 75, LEAD_MIN = 15, HORIZON_H = 24;
const quotaDay = (ms) => Math.floor((ms - 7 * 3600000) / 86400000);
const sameQuotaDay = (ms) => quotaDay(ms) === quotaDay(ms + RUN_MIN * 60000);
let NOW_MS = Date.now();
if (has('--now')) { NOW_MS = Date.parse(opt('--now')); if (!Number.isFinite(NOW_MS)) refuse(`--now ${opt('--now')} is not an ISO instant`); }
const HASH = /^[0-9a-f]{40}$/;
const CTX = /^[0-9a-f]{12}$/;
const deadlineOk = (s) => /^[1-9]\d{0,2}$/.test(s ?? '') && +s <= 240;
const KINDS = {
    commit: { name: 'NATIVELY_FLIGHT_COMMIT', opt: '--commit', placeholder: '@@REGISTERED_HEAD_FULL_HASH@@', valid: (v) => HASH.test(v ?? ''), why: 'not a full 40 character lowercase hash' },
    t: { name: 'NATIVELY_RD_T', opt: '--t', placeholder: '@@T@@', valid: (v) => Number.isFinite(tInstant(v)) && sameQuotaDay(tInstant(v)), why: 'not a "yyyy-MM-dd HH:mm" time whose run (T + 75 min) stays inside one quota day (the day resets at 10:00 local = 07:00Z)' },
    deadline: { name: 'I60_PROBE_DEADLINE_MIN', opt: '--deadline-min', placeholder: '@@DEADLINE_MIN@@', valid: deadlineOk, why: 'not a whole number of minutes from 1 to 240' },
    // requests made by SCRIPTS (the smoke's and the probes' bare calls, replays): in no app log, so the arming step counts them from the smoke and probe records (r7)
    extra: { name: 'NATIVELY_RD_EXTRA_REQUESTS', opt: '--extra-requests', placeholder: '@@EXTRA_REQUESTS@@', valid: (v) => /^\d{1,4}$/.test(v ?? ''), why: 'not a whole number of requests from 0 to 9999' },
    ctx: { name: 'NATIVELY_ROUTER_CONTEXT_SHA12', opt: '--ctx-sha12', placeholder: '@@CONTEXT_SHA12@@', valid: (v) => CTX.test(v ?? ''), why: 'not 12 lowercase hex characters' },
};
for (const k of Object.values(KINDS)) if (has(k.opt) && !k.valid(opt(k.opt))) refuse(`${k.opt} ${JSON.stringify(opt(k.opt))} is ${k.why}`);
if (has('--t')) {
    const tm = tInstant(opt('--t'));
    if (tm < NOW_MS + LEAD_MIN * 60000) refuse(`--t ${opt('--t')} is less than ${LEAD_MIN} min after now (T must be at least now + ${LEAD_MIN} min; a T in the past is refused)`);
    if (tm > NOW_MS + HORIZON_H * 3600000) refuse(`--t ${opt('--t')} is more than ${HORIZON_H} h after now`);
}

const DEFAULT_PASSES = ['PREREGISTER-router-default.md'];
// the passes list: the option, else what the launcher already in OUT holds, else the default (--check reads the file's own)
const existingPasses = (() => { const f = path.join(OUT, 'launch-rd.cmd'); return fs.existsSync(f) ? /--passes "([^"]*)"/.exec(fs.readFileSync(f, 'latin1'))?.[1] : undefined; })();
const PASSES = (CHECK ? (existingPasses ?? DEFAULT_PASSES.join(',')) : (opt('--passes') ?? existingPasses ?? DEFAULT_PASSES.join(','))).split(',');
if (PASSES.some((p) => !/^[A-Za-z0-9._-]+\.md$/.test(p)) || new Set(PASSES).size !== PASSES.length) refuse(`--passes must be distinct file names like PREREGISTER-router-default.md, comma separated: ${PASSES.join(',')}`);

const NODE = '"C:\\Program Files\\nodejs\\node.exe"';
const ERR = '"%TEMP%\\natively-rd-launcher-error.log"';
const VARIANTS = [
    { file: 'launch-rd.cmd', label: 'rd', parts: ['head-flight', 'common', 'guard-flight', 'tail-flight'] },
    { file: 'launch-rd-dry.cmd', label: 'rd-dry', parts: ['head-dry', 'common', 'guard-dry', 'tail-dry'] },
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

const PLACEHOLDER_LINES = new RegExp(`^set (${Object.values(KINDS).map((k) => `${k.name}=${k.placeholder}`).join('|')})$`);
// cmd hazards, linted on the finished lines. Calibrated by launchers-rd-cal.mjs (a mutated line must be refused).
function lint(lines, file) {
    const bad = [];
    let inBlock = false;
    lines.forEach((l, i) => {
        const at = `${file} line ${i + 1}`;
        if (!/^[\x20-\x7e]*$/.test(l)) bad.push(`${at}: a character outside printable ASCII`);
        if (/\s$/.test(l)) bad.push(`${at}: trailing whitespace (a trailing space after a set value is part of the value in cmd)`);
        if (l.includes('@@') && !PLACEHOLDER_LINES.test(l)) bad.push(`${at}: an @@ token outside the four placeholder set lines`);
        if (/^\s*rem(\s|$)/i.test(l) && /[%()&|<>^]/.test(l)) bad.push(`${at}: a rem line holds one of % ( ) & | < > ^`);
        if (/\d>>/.test(l)) bad.push(`${at}: a digit directly before >> would read as a handle redirect`);
        if (inBlock && /^\s*echo /i.test(l)) {
            const msg = l.trimStart().slice(5).split(' >> ')[0].split('%CD%').join('');
            if (/[()&|<>^%!"]/.test(msg)) bad.push(`${at}: an echo inside an if-block holds one of ( ) & | < > ^ % ! or a quote`);
        }
        if (/^if .*\($/i.test(l)) { if (inBlock) bad.push(`${at}: an if-block opens while the previous one is still open (a closing parenthesis is missing)`); inBlock = true; }
        else if (l === ')') inBlock = false;
    });
    if (inBlock) bad.push(`${file}: an if-block is never closed`);
    return bad;
}

function composeLauncher(v, sections, values) {
    const proofBase = `${NODE} "%~dp0rd-proofs.mjs" --root "%CD%"`;
    const log = `electron\\test\\golden\\interview60.runs\\flight-${v.label}.launcher.log`;
    const vars = { LABEL: v.label, RUNLABEL: RUN_LABEL, LOG: log, ERR, NODE, PROOFS1: proofBase, PROOFS2: `${proofBase} --same-as-log ${log}`, PASSES: PASSES.join(','), COMMIT: values.commit, T: values.t, DEADLINE: values.deadline, CTX: values.ctx, EXTRA: values.extra };
    const parts = v.parts.map((p) => { if (!sections.has(p)) throw new SourceError(`section ${p} is missing`); return sections.get(p).map((l) => expand(l, vars)); });
    const lines = parts.flat();
    const bad = lint(lines, v.file);
    for (const k of Object.values(KINDS)) if (lines.filter((l) => l.startsWith(`set ${k.name}=`)).length !== 1) bad.push(`${v.file}: not exactly one ${k.name} line`);
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
const stateOf = (kind, value) => (value === KINDS[kind].placeholder ? 'placeholder' : KINDS[kind].valid(value) ? 'filled' : 'INVALID');

let sections;
try {
    sections = parseSections(readSource('launch-rd-src.txt'));
    const known = new Set(VARIANTS.flatMap((v) => v.parts));
    for (const k of sections.keys()) if (!known.has(k)) throw new SourceError(`section ${k} is not used by any launcher`);
} catch (e) {
    if (e instanceof SourceError) refuse(e.message);
    throw e;
}

// the four values of each launcher: the option, else what the file in OUT holds, else the placeholder
const plan = VARIANTS.map((v) => {
    const file = path.join(OUT, v.file);
    const buf = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const values = {};
    for (const [kind, k] of Object.entries(KINDS)) {
        const existing = buf ? valueOf(buf, k.name) : null;
        if (CHECK) values[kind] = existing ?? '(no line)';
        else values[kind] = opt(k.opt) ?? (existing !== null && stateOf(kind, existing) !== 'INVALID' ? existing : k.placeholder);
    }
    return { v, file, values };
});

let failures = 0;
const results = [];
const composed = [];
for (const { v, file, values } of plan) {
    if (CHECK && !fs.existsSync(file)) { results.push({ name: v.file, problems: ['the file is missing'], line: `${v.file}: MISSING`, states: [] }); failures++; composed.push(null); continue; }
    if (CHECK && Object.keys(KINDS).some((kind) => stateOf(kind, values[kind]) === 'INVALID')) {
        results.push({ name: v.file, problems: ['a commit, T, deadline or context sha value is neither its placeholder nor a valid value'], line: `${v.file}: not read further`, states: [] }); failures++; composed.push(null); continue;
    }
    try { composed.push(composeLauncher(v, sections, values)); } catch (e) { if (e instanceof SourceError) refuse(e.message); throw e; }
}
if (!CHECK) {
    const allBad = composed.flatMap((c) => c.bad);
    if (allBad.length) { console.log('REFUSED: the sources do not lint, nothing was written:'); allBad.forEach((b) => console.log(`  ${b}`)); process.exit(2); }
}

for (const [i, { v, file, values }] of plan.entries()) {
    const c = composed[i];
    if (!c) continue;
    if (!CHECK) fs.writeFileSync(file, toBytes(c.lines));
    if (!fs.existsSync(file)) { results.push({ name: v.file, problems: ['the file is missing'], line: `${v.file}: MISSING`, states: [] }); failures++; continue; }
    const buf = fs.readFileSync(file);
    const { problems, stats } = verifyBytes(buf, c.lines);
    const allProblems = [...problems, ...(CHECK ? c.bad : [])];
    const states = Object.keys(KINDS).map((kind) => [kind, stateOf(kind, values[kind])]);
    if (ARMED && states.some(([, s]) => s === 'placeholder')) allProblems.push('--armed: a commit, T, deadline or context sha is still a placeholder');
    const line = `${v.file.padEnd(18)} ${String(stats.bytes).padStart(5)} bytes ${String(stats.lines).padStart(3)} lines  CRLF ${stats.crlf}  bare LF ${stats.bareLf}  bare CR ${stats.bareCr}  above 126: ${stats.high}  other control: ${stats.ctrl}  BOM ${stats.bom ? 'YES' : 'no'}  ends with CRLF ${stats.endsCrlf ? 'yes' : 'NO'}  source lines missing ${stats.missing}  differing ${stats.differing}  ${states.map(([k, s]) => `${k} ${s}`).join('  ')}  sha256/12 ${fingerprint(buf)}  ${allProblems.length ? 'FAIL' : 'PASS'}`;
    results.push({ name: v.file, problems: allProblems, line, states });
    if (allProblems.length) failures++;
}

// the dry twin is the flight launcher up to and including the guard, but for ONE argument on the guard line
{
    const f = composed[0], d = composed[1];
    if (f && d) {
        const read = (i) => (fs.existsSync(plan[i].file) ? fs.readFileSync(plan[i].file).toString('latin1').split('\r\n') : []);
        const lenCommon = f.parts[1].length;
        const fc = read(0).slice(f.parts[0].length, f.parts[0].length + lenCommon);
        const dc = read(1).slice(d.parts[0].length, d.parts[0].length + lenCommon).map((l) => l.split('flight-rd-dry.launcher.log').join('flight-rd.launcher.log').split('LAUNCHER rd-dry').join('LAUNCHER rd').split('flight-rd-dry.').join('flight-rd.'));
        const same = fc.length === lenCommon && dc.length === lenCommon && fc.every((l, i) => l === dc[i]);
        const fg = f.parts[2].filter((l) => !l.startsWith('rem '));
        const dg = d.parts[2].filter((l) => !l.startsWith('rem '));
        const guardLineF = fg.find((l) => l.includes('guard-rd.mjs')) ?? '';
        const guardLineD = dg.find((l) => l.includes('guard-rd.mjs')) ?? '';
        const oneArg = guardLineF.includes(' --require-precheck') && !guardLineD.includes('--require-precheck') && guardLineF.replace(' --require-precheck', '').split('flight-rd.launcher.log').join('X') === guardLineD.split('flight-rd-dry.launcher.log').join('X');
        console.log(`structure: the dry twin's preconditions, environment, commit check, committed-text shas, wav:check and dist proofs 1 (${lenCommon} lines) equal the flight launcher's after label normalisation: ${same ? 'YES' : 'NO'}`);
        console.log(`structure: the two guard lines differ by exactly --require-precheck, in the flight launcher only: ${oneArg ? 'YES' : 'NO'}`);
        if (!same) failures++;
        if (!oneArg) failures++;
    }
}

console.log(`${CHECK ? 'CHECK' : 'WROTE AND READ BACK'} in ${OUT}`);
results.forEach((r) => { console.log(r.line); r.problems.forEach((p) => console.log(`    - ${p}`)); });
const placeholders = results.filter((r) => r.states.some(([, s]) => s === 'placeholder')).map((r) => `${r.name} (${r.states.filter(([, s]) => s === 'placeholder').map(([k]) => k).join(', ')})`);
console.log(`PLACEHOLDERS: ${placeholders.length ? `${placeholders.join(', ')} still hold a placeholder${ARMED ? ' (--armed: a failure)' : ''}` : 'none'}`);
console.log(`PASSES (printed by the launcher, committed texts at HEAD): ${PASSES.join(', ')}`);
console.log(failures ? `GENERATOR: FAILED (${failures} check(s))` : 'GENERATOR: BOTH FILES PASS');
process.exit(failures ? 1 : 0);
