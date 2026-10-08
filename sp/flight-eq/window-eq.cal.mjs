// E\window-eq.cal.mjs - calibration driver for window-eq.mjs; writes E\window-eq.cal.txt. Exit 0 iff all cases read as
// expected AND every mutant of the tool flips the case(s) it targets.
// The whole case list runs twice: with the machine's time zone and with TZ=UTC; the two outputs must be identical lines.
// Fix round 1: W-m1 (a mistyped run-dir is a usage error, exit 2, not UNREADABLE) and W-m2 (the hand-run mutants are part of
// the driver now, plus W1, the local-getters mutant, which is the one that proves the TZ=UTC pass bites).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const E = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(E, 'window-eq.mjs');
const S50M = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-22T08-22-50-s50m';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'window-eq-cal-'));
const noStart = path.join(TMP, 'nostart'); fs.mkdirSync(noStart);
const tl = JSON.parse(fs.readFileSync(path.join(S50M, 'interview60.timeline.json'), 'utf8'));
delete tl.startedAt;
fs.writeFileSync(path.join(noStart, 'interview60.timeline.json'), JSON.stringify(tl));
const noFile = path.join(TMP, 'nofile'); fs.mkdirSync(noFile);
const badJson = path.join(TMP, 'badjson'); fs.mkdirSync(badJson);
fs.writeFileSync(path.join(badJson, 'interview60.timeline.json'), '{not json');
const noSuchDir = path.join(TMP, 'no-such-run-dir');                         // never created: a mistyped run-dir
const aFile = path.join(noStart, 'interview60.timeline.json');               // an existing FILE where a dir is expected

const IN = ' IN WINDOW 2026-10-05 19:30 .. 2026-10-06 03:30';
const OUT = ' OUT OF WINDOW (cannot PASS; NO LATENCY VERDICT)';
const UNR = 'WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS';
const USAGE = /^usage:/;
const USAGE_DIR = /^usage:.*not an existing directory/;
// [id, label, args, expected stdout (exact) or null (usage: stderr must match the 5th field), exit, usageRe]
const CASES = [
    ['c1', '16:29:59.999Z out (just before)', ['--at', '2026-10-05T16:29:59.999Z'], 'WINDOW-EQ startedAt=2026-10-05T16:29:59.999Z local=2026-10-05 19:29:59+03' + OUT, 3],
    ['c2', '16:30:00.000Z in (exact lower bound)', ['--at', '2026-10-05T16:30:00.000Z'], 'WINDOW-EQ startedAt=2026-10-05T16:30:00.000Z local=2026-10-05 19:30:00+03' + IN, 0],
    ['c3', '20:59Z = 23:59 local in', ['--at', '2026-10-05T20:59:00.000Z'], 'WINDOW-EQ startedAt=2026-10-05T20:59:00.000Z local=2026-10-05 23:59:00+03' + IN, 0],
    ['c4', '21:00Z = 00:00 on the 6th local in (midnight crossing)', ['--at', '2026-10-05T21:00:00.000Z'], 'WINDOW-EQ startedAt=2026-10-05T21:00:00.000Z local=2026-10-06 00:00:00+03' + IN, 0],
    ['c5', '00:30:00.000Z in (A7 exact upper bound: 03:30:00 local; was 22:30Z)', ['--at', '2026-10-06T00:30:00.000Z'], 'WINDOW-EQ startedAt=2026-10-06T00:30:00.000Z local=2026-10-06 03:30:00+03' + IN, 0],
    ['c6', '00:30:00.001Z out (A7 one ms past)', ['--at', '2026-10-06T00:30:00.001Z'], 'WINDOW-EQ startedAt=2026-10-06T00:30:00.001Z local=2026-10-06 03:30:00+03' + OUT, 3],
    ['c7', '00:30:59.999Z out (A2 said in; A3 m14 wins)', ['--at', '2026-10-06T00:30:59.999Z'], 'WINDOW-EQ startedAt=2026-10-06T00:30:59.999Z local=2026-10-06 03:30:59+03' + OUT, 3],
    ['c8', '00:31:00.000Z out', ['--at', '2026-10-06T00:31:00.000Z'], 'WINDOW-EQ startedAt=2026-10-06T00:31:00.000Z local=2026-10-06 03:31:00+03' + OUT, 3],
    ['c9', '2026-10-04T21:30:00Z (00:30 on the 5th) out', ['--at', '2026-10-04T21:30:00Z'], 'WINDOW-EQ startedAt=2026-10-04T21:30:00.000Z local=2026-10-05 00:30:00+03' + OUT, 3],
    ['c10', 'offset input 19:30:00.000+03:00 in (same instant as 16:30Z)', ['--at', '2026-10-05T19:30:00.000+03:00'], 'WINDOW-EQ startedAt=2026-10-05T16:30:00.000Z local=2026-10-05 19:30:00+03' + IN, 0],
    ['c11', 'offset input 19:29:59.999+03:00 out', ['--at', '2026-10-05T19:29:59.999+03:00'], 'WINDOW-EQ startedAt=2026-10-05T16:29:59.999Z local=2026-10-05 19:29:59+03' + OUT, 3],
    ['c12', 'offset input 03:30:00.000+03:00 on the 6th in', ['--at', '2026-10-06T03:30:00.000+03:00'], 'WINDOW-EQ startedAt=2026-10-06T00:30:00.000Z local=2026-10-06 03:30:00+03' + IN, 0],
    ['c13', 'offset input 03:30:00.001+03:00 on the 6th out', ['--at', '2026-10-06T03:30:00.001+03:00'], 'WINDOW-EQ startedAt=2026-10-06T00:30:00.001Z local=2026-10-06 03:30:00+03' + OUT, 3],
    ['c14', 's50m run folder (2026-09-22) -> out', [S50M], 'WINDOW-EQ startedAt=2026-09-22T07:14:07.873Z local=2026-09-22 10:14:07+03' + OUT, 3],
    ['c15', 'copy of s50m timeline WITHOUT startedAt -> unreadable', [noStart], UNR, 4],
    ['c16', 'run dir with no timeline file -> unreadable', [noFile], UNR, 4],
    ['c17', 'run dir with a corrupt timeline -> unreadable', [badJson], UNR, 4],
    ['c18', 'impossible date 2026-02-30 -> unreadable (Date would roll it to Mar 2)', ['--at', '2026-02-30T20:00:00Z'], UNR, 4],
    ['c19', 'no zone (machine-TZ dependent) -> unreadable', ['--at', '2026-10-05T20:00:00'], UNR, 4],
    ['c20', '4 fraction digits (Date would truncate 22:30:00.0009 into the window) -> unreadable', ['--at', '2026-10-05T22:30:00.0009Z'], UNR, 4],
    ['c21', '24:00 -> unreadable', ['--at', '2026-10-05T24:00:00Z'], UNR, 4],
    ['c22', 'junk -> unreadable', ['--at', 'tonight'], UNR, 4],
    ['c23', 'no args -> usage exit 2', [], null, 2, USAGE],
    ['c24', '--at without a value -> usage exit 2', ['--at'], null, 2, USAGE],
    ['c25', 'W-m1: a mistyped run-dir (no such directory) -> usage exit 2, NOT unreadable exit 4', [noSuchDir], null, 2, USAGE_DIR],
    ['c26', 'W-m1: a FILE where the run-dir should be -> usage exit 2', [aFile], null, 2, USAGE_DIR],
    ['c27', 'A7: 22:30:00.001Z (01:30:00 local, the old end plus 1 ms) now IN', ['--at', '2026-10-05T22:30:00.001Z'], 'WINDOW-EQ startedAt=2026-10-05T22:30:00.001Z local=2026-10-06 01:30:00+03' + IN, 0],
    ['c28', 'A7: 22:31:00.000Z (01:31 local, out before A7) now IN', ['--at', '2026-10-05T22:31:00.000Z'], 'WINDOW-EQ startedAt=2026-10-05T22:31:00.000Z local=2026-10-06 01:31:00+03' + IN, 0],
];

function runAll(env, tool) {
    const rows = [];
    for (const [id, label, args, expect, code, usageRe] of CASES) {
        const r = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', env });
        const actual = expect === null ? (r.stderr ?? '').trim() : (r.stdout ?? '').trim();
        const pass = r.status === code && (expect === null ? usageRe.test(actual) && (r.stdout ?? '').trim() === '' : actual === expect);
        rows.push({ id, label, actual, code: r.status, pass, expect, expCode: code });
    }
    const tz = spawnSync(process.execPath, ['-e', 'console.log(new Date().getTimezoneOffset())'], { encoding: 'utf8', env }).stdout.trim();
    return { rows, tz };
}
const envLocal = { ...process.env }; delete envLocal.TZ;
const envUtc = { ...process.env, TZ: 'UTC' };

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
let fails = 0;
try {
    log(`window-eq calibration  ${new Date().toISOString()}`);
    log(`tool sha256 ${sha(TOOL)}`);
    log(`driver sha256 ${sha(fileURLToPath(import.meta.url))}`);
    const A = runAll(envLocal, TOOL), B = runAll(envUtc, TOOL);
    log(`pass 1: machine time zone (getTimezoneOffset ${A.tz} min)    pass 2: TZ=UTC (getTimezoneOffset ${B.tz} min)`);
    if (A.tz === B.tz) { log('FAIL: TZ=UTC did not change the child process zone, so the second pass proves nothing'); fails++; }
    log('');
    A.rows.forEach((a, i) => {
        const b = B.rows[i];
        const same = a.actual === b.actual && a.code === b.code;
        const ok = a.pass && b.pass && same;
        if (!ok) fails++;
        log(`${i + 1}. ${a.label}`);
        log(`   expected: ${a.expect === null ? '(usage text on stderr, nothing on stdout)' : a.expect}  (exit ${a.expCode})`);
        log(`   actual  : ${a.actual}  (exit ${a.code})`);
        log(`   TZ=UTC  : ${same ? 'identical' : 'DIFFERENT: ' + b.actual + ' (exit ' + b.code + ')'}   => ${ok ? 'PASS' : 'FAIL'}`);
    });

    // ---- mutants (W-m2): a copy of the tool with ONE edit; the targeted case(s) must stop reading as expected -------------
    log('');
    log(`Mutants (a copy of window-eq.mjs with ONE edit, run through the same ${CASES.length} cases in both zones; the targeted case must flip):`);
    const src = fs.readFileSync(TOOL, 'utf8');
    const local03 = /function local03\(t\) \{[\s\S]*?\n\}\n/.exec(src)?.[0];
    const MUTS = [
        ['W-upper: upper bound exclusive (t <= HI -> t < HI)', 't <= HI)', 't < HI)', ['c5'], 'both'],
        ['W-lower: lower bound exclusive (t >= LO -> t > LO)', 't >= LO', 't > LO', ['c2'], 'both'],
        ['W-A2: A2\'s old +59.999 s tolerance (t <= HI -> t <= HI + 59999)', 't <= HI)', 't <= HI + 59999)', ['c6', 'c7'], 'both'],
        ['W1: local-time getters in the local= display (no fixed +03:00)', local03, 'function local03(t) {\n    const d = new Date(t);\n    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+03`;\n}\n', ['c1', 'c5'], 'utc-only'],
        ['W-A7-old: the upper bound left at A3\'s 22:30Z (01:30 local)', 'Date.UTC(2026, 9, 6, 0, 30, 0, 0)', 'Date.UTC(2026, 9, 5, 22, 30, 0, 0)', ['c5', 'c27', 'c28'], 'both'],
        ['W-m1: the run-dir existence check removed (a typo reads UNREADABLE again)', 'if (!fs.existsSync(argv[0]) || !fs.statSync(argv[0]).isDirectory()) usage(\'run-dir is not an existing directory\');', '', ['c25', 'c26'], 'both'],
    ];
    for (const [label, from, to, targets, where] of MUTS) {
        if (!from || !src.includes(from)) { log(`  MUTANT ANCHOR NOT FOUND: ${label}`); fails++; continue; }
        const mp = path.join(TMP, 'window-eq.mutant.mjs');
        fs.writeFileSync(mp, src.replace(from, () => to));
        const MA = runAll(envLocal, mp), MB = runAll(envUtc, mp);
        const flipA = MA.rows.filter((r) => !r.pass).map((r) => r.id);
        const flipB = MB.rows.filter((r) => !r.pass).map((r) => r.id);
        const hit = targets.every((t) => (where === 'utc-only' ? flipB : [...flipA, ...flipB]).includes(t));
        const pass = hit;   // W1 flips only under TZ=UTC on a +03:00 machine, so its targets are required in the UTC pass only
        if (!pass) fails++;
        log(`  ${label}`);
        log(`    machine-zone pass flips: ${flipA.length ? flipA.join(',') : 'none'}   TZ=UTC pass flips: ${flipB.length ? flipB.join(',') : 'none'}   targets ${targets.join(',')} => ${pass ? 'FLIPPED (calibrated)' : 'DID NOT FLIP (FAIL)'}`);
        if (where === 'utc-only') log(`    (on this machine zone ${A.tz} min the local getters equal +03:00, so only the TZ=UTC pass can see it: that is why the second pass exists)`);
    }
} finally {
    fs.rmSync(TMP, { recursive: true, force: true });
}
log('');
log(fails ? `CALIBRATION FAILED (${fails})` : `CALIBRATION PASSED (${CASES.length} cases x 2 time zones, identical; 6 mutants flipped)`);
fs.writeFileSync(path.join(E, 'window-eq.cal.txt'), out.join('\n') + '\n', 'utf8');
process.exit(fails ? 1 : 0);
