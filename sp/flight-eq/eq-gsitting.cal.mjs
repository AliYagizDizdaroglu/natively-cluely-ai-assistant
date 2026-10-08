// Calibration of E\eq-gsitting.ps1 with STUBS only: no model call, no app, no scheduled task touched.
//   node eq-gsitting.cal.mjs            -> prints PASS/FAIL lines and a total; exit 0 iff all pass.
// Seams used: -NodeExe (the real node, running a stub in place of interview60.answers.mjs), -AnswersScript, -LedgerScript, -GoldenDir, -LauncherCmd,
// -LogPath, -OutDir, -NowOverride, -FakeRunningTasks, -FakeElectronCount, -GapLimitMinutes, -SlowMinutes. Mutants: copies of the script with one check broken must make the cal FAIL.
// The real eq-twins parseSitting / tagOf are imported: the runner's logs must parse in the consumer.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(E, 'eq-gsitting.ps1');
const CAL = path.join(E, 'gsitting-cal');
const NODE = process.execPath;
const { parseSitting, tagOf } = await import(pathToFileURL(path.join(E, 'eq-twins.mjs')).href);

// ---- the tiny reader of the log format (what the parser being built will do) ----
export function readLog(text) {
    const steps = []; const bad = []; const other = [];
    const open = new Map();
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
        if (!line.startsWith('STEP')) { other.push(line); continue; }
        let m = /^STEP (\d+) (\S+) start (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)$/.exec(line);
        if (m) { open.set(+m[1], { n: +m[1], tag: m[2], start: Date.parse(m[3]) }); continue; }
        m = /^STEP (\d+) (\S+) end (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z) exit=(-?\d+)$/.exec(line);
        if (m && open.has(+m[1]) && open.get(+m[1]).tag === m[2]) { const o = open.get(+m[1]); steps.push({ ...o, end: Date.parse(m[3]), exit: +m[4] }); open.delete(+m[1]); continue; }
        bad.push(line);
    }
    return { steps, bad, other, unclosed: [...open.keys()] };
}

let pass = 0, fail = 0;
const out = [];
const check = (name, ok, extra = '') => { (ok ? pass++ : fail++); out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`); };

const rd = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const reset = () => { fs.rmSync(CAL, { recursive: true, force: true }); fs.mkdirSync(CAL, { recursive: true }); };

const LAUNCHER = 'rem cal launcher\r\nset NATIVELY_STT_PROVIDER=deepgram\r\nset NATIVELY_ROSTER=scenario50\r\nset NATIVELY_SCENARIOS=S1,S2\r\nset NATIVELY_EQ_T=2026-10-06 03:00\r\nset NATIVELY_GEMINI_THINKING_LEVEL=\r\nset NATIVELY_VERBAL_HEDGE=\r\nset COMMIT_OK=1\r\n';

function layout(c) {
    const o = {
        golden: path.join(CAL, c, 'golden'), run: path.join(CAL, c, 'run'), outdir: path.join(CAL, c, 'out'),
        log: path.join(CAL, c, 'gsitting.log'), reader: path.join(CAL, c, 'reader.txt'), b4: path.join(CAL, c, 'b4.txt'),
        ledger: path.join(CAL, c, 'ledger-stub.mjs'), argsLog: path.join(CAL, c, 'args.log'), launcher: path.join(CAL, c, 'launch-eq.cmd'),
    };
    w(path.join(o.run, 'interview60.prompts.json'), '{}');
    w(o.launcher, LAUNCHER);
    w(path.join(o.golden, 'stub-answers.mjs'), `
import fs from 'node:fs';
import path from 'node:path';
const a = process.argv.slice(2);
const v = (f) => a[a.indexOf(f) + 1];
fs.appendFileSync(${JSON.stringify(o.argsLog)}, JSON.stringify({ model: v('--model'), tag: v('--tag'), thinking: v('--thinking'), noBlock: a.includes('--no-block'), captured: v('--captured'), only: v('--only'), cwd: process.cwd() }) + '\\n');
// B1: the env crossing. The launcher's SET values must arrive, its EMPTY names must be gone (the parent env carries wrong values for both on purpose).
if (process.env.NATIVELY_ROSTER !== 'scenario50' || process.env.NATIVELY_SCENARIOS !== 'S1,S2' || process.env.NATIVELY_GEMINI_THINKING_LEVEL !== undefined || process.env.NATIVELY_EQ_T !== '2026-10-06 03:00') process.exit(9);
if (process.env.STUB_SLEEP_MS) await new Promise((r) => setTimeout(r, +process.env.STUB_SLEEP_MS));
const file = path.join(${JSON.stringify(o.golden)}, 'interview60.answers.' + v('--model') + '_' + v('--tag') + '.json');
if (process.env.STUB_FAIL_TAG === v('--tag')) { if (process.env.STUB_PARTIAL) fs.writeFileSync(file, '{"partial":true}'); process.exit(+(process.env.STUB_FAIL_CODE ?? 7)); }
fs.writeFileSync(file, JSON.stringify(Object.fromEntries(v('--only').split(',').map((id) => [id, { id, spoken: 'x' }]))));
`);
    w(o.ledger, `
import fs from 'node:fs';
fs.appendFileSync(${JSON.stringify(path.join(CAL, c, 'ledger.arg'))}, process.argv[2] + '\\n');
if (process.env.STUB_LEDGER_EXIT) process.exit(+process.env.STUB_LEDGER_EXIT);
console.log(process.env.STUB_LEDGER_NOFIRST ? 'garbage' : 'quota day starts ' + process.argv[2] + ' (10:00 local); generated now');
console.log('\\n1. app logs');
console.log('  natively_debug.log: last line x; 3 lines since the reset; lite mentions {"gemini-3.5-flash-lite":22,"gemini-3.1-flash-lite":12}');
`);
    w(o.reader, 'READER run: window = the timeline\'s startedAt..endedAt\nREAD G = {S1Q04F, S1Q06F, S2Q05F, S2Q08F} (4)\nREAD G_twin = {S1Q04F, S1Q06F, S2Q05F, S2Q08F} (4); in G but out of G_twin: -\n');
    w(o.b4, 'B4CAL run=run ids=40 g=4 [S1Q04F,S1Q06F,S2Q05F,S2Q08F]\nTRANSCRIPT OK 40/40\nBLOCK OK 4/4\nLABEL OUTSIDE --g NONE\n');
    return o;
}

// returns { code, text, o }
function runner(c, extra = {}, { script = SCRIPT, env = {}, now = '2026-10-06T04:20:00', head35 = 478, head31 = 439, whatif = false, fakeTasks = null, fakeElectron = 0, flags = [] } = {}) {
    const o = extra.o ?? layout(c);
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Run', o.run, '-ReaderOut', o.reader, '-B4CalOut', o.b4,
        '-Headroom35', String(head35), '-Headroom31', String(head31), '-NodeExe', NODE, '-AnswersScript', path.join(o.golden, 'stub-answers.mjs'),
        '-LedgerScript', o.ledger, '-GoldenDir', o.golden, '-LogPath', o.log, '-OutDir', o.outdir, '-LauncherCmd', o.launcher, '-NowOverride', now, '-FakeElectronCount', String(fakeElectron), ...flags];
    if (fakeTasks) args.push('-FakeRunningTasks', fakeTasks.join(','));
    if (whatif) args.push('-WhatIf');
    const r = spawnSync('powershell.exe', args, { encoding: 'utf8', env: { ...process.env, NATIVELY_ROSTER: 'WRONG', NATIVELY_GEMINI_THINKING_LEVEL: 'bogus', ...env }, windowsHide: true });
    return { code: r.status, text: (r.stdout ?? '') + (r.stderr ?? ''), o };
}
const log = (o) => (fs.existsSync(o.log) ? fs.readFileSync(o.log, 'utf8') : '');
const argsLines = (o) => (fs.existsSync(o.argsLog) ? fs.readFileSync(o.argsLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const ansFiles = (d) => fs.readdirSync(d).filter((f) => f.startsWith('interview60.answers.'));

const EXPECT = [
    ['captured-g-high', false, 'HIGH', 'gemini-3.5-flash-lite'], ['captured-no-block-high', true, 'HIGH', 'gemini-3.5-flash-lite'],
    ['captured-no-block-high-r2', true, 'HIGH', 'gemini-3.5-flash-lite'], ['captured-g-high-r2', false, 'HIGH', 'gemini-3.5-flash-lite'],
    ['captured-g-high-r3', false, 'HIGH', 'gemini-3.5-flash-lite'], ['captured-no-block-high-r3', true, 'HIGH', 'gemini-3.5-flash-lite'],
    ['captured-no-block-high-r4', true, 'HIGH', 'gemini-3.5-flash-lite'], ['captured-g-high-r4', false, 'HIGH', 'gemini-3.5-flash-lite'],
    ['captured-g-high-r5', false, 'HIGH', 'gemini-3.5-flash-lite'], ['captured-no-block-high-r5', true, 'HIGH', 'gemini-3.5-flash-lite'],
    ['captured-g-low', false, 'LOW', 'gemini-3.1-flash-lite'], ['captured-no-block-low', true, 'LOW', 'gemini-3.1-flash-lite'],
    ['captured-no-block-low-r2', true, 'LOW', 'gemini-3.1-flash-lite'], ['captured-g-low-r2', false, 'LOW', 'gemini-3.1-flash-lite'],
    ['captured-g-low-r3', false, 'LOW', 'gemini-3.1-flash-lite'], ['captured-no-block-low-r3', true, 'LOW', 'gemini-3.1-flash-lite'],
];
const holeStore = (ids, holeIds) => JSON.stringify(Object.fromEntries(ids.map((id) => [id, holeIds.includes(id) ? { id, transientError: '429' } : { id, spoken: 'x' }])));
const GIDS = ['S1Q04F', 'S1Q06F', 'S2Q05F', 'S2Q08F'];
const putHole = (o, tags, model, holeIds) => { for (const t of tags) w(path.join(o.golden, `interview60.answers.${model}_${t}.json`), holeStore(GIDS, holeIds)); };

function suite(label, script, only) {
    const want = (n) => !only || only.includes(n);
    reset();
    // 1. clean full run
    if (want('clean')) {
        const r = runner('clean', {}, { script });
        const L = readLog(log(r.o)); const A = argsLines(r.o);
        check(`${label} clean run exits 0 (the stub exits 9 unless the launcher's env block crossed)`, r.code === 0, `exit ${r.code} ${r.code ? r.text.slice(0, 200) : ''}`);
        check(`${label} clean: 16 steps, numbered 1..16 in order, tag order = A3.4 counterbalanced`, L.steps.length === 16 && L.steps.every((s, i) => s.n === i + 1 && s.tag === EXPECT[i][0]), L.steps.map((s) => s.tag).join(' ').slice(0, 60));
        check(`${label} clean: every STEP line parses back; all exit=0; none unclosed`, L.bad.length === 0 && L.unclosed.length === 0 && L.steps.every((s) => s.exit === 0 && s.end >= s.start));
        const ps = parseSitting(log(r.o));
        check(`${label} clean: the CONSUMER eq-twins parseSitting reads the log with 0 problems and 16 tags`, ps.problems.length === 0 && ps.steps.size === 16, ps.problems.join('; '));
        check(`${label} clean: steps strictly sequential (each start >= the previous end)`, L.steps.every((s, i) => i === 0 || s.start >= L.steps[i - 1].end));
        check(`${label} clean: non-STEP lines all start GSITTING, no BOM`, L.other.length >= 2 && L.other.every((l) => l.startsWith('GSITTING')) && fs.readFileSync(r.o.log)[0] !== 0xEF, `${L.other.length} lines`);
        check(`${label} clean: args per step = model, thinking, --no-block only on no-block tags, captured path, --only = the reader's ids`,
            A.length === 16 && A.every((a, i) => a.tag === EXPECT[i][0] && a.noBlock === EXPECT[i][1] && a.thinking === EXPECT[i][2] && a.model === EXPECT[i][3]
                && a.only === 'S1Q04F,S1Q06F,S2Q05F,S2Q08F' && a.captured.endsWith('interview60.prompts.json') && a.captured.startsWith(r.o.run)));
        check(`${label} clean: children run with cwd = MAIN`, A.every((a) => a.cwd.toLowerCase().endsWith('natively-cluely-ai-assistant')), A[0]?.cwd.slice(-30));
        check(`${label} clean: 16 output files copied into the run folder and the copy is logged`, ansFiles(r.o.run).length === 16 && /16 of 16 output files COPIED/.test(log(r.o)));
        check(`${label} clean: the ledger got the quota-day start of 04:20 (10:00 the day before, as UTC Z)`, /^2026-10-05T07:00:00\.000Z$/m.test(fs.readFileSync(path.join(CAL, 'clean', 'ledger.arg'), 'utf8')), fs.readFileSync(path.join(CAL, 'clean', 'ledger.arg'), 'utf8').trim());
    }
    // 1b. B1 launcher refusals
    if (want('env')) {
        let o = layout('env-missing'); fs.rmSync(o.launcher);
        let r = runner('env-missing', { o }, { script, whatif: true });
        check(`${label} B1: launcher file missing refuses`, r.code === 2 && /launcher file not found/.test(r.text), `exit ${r.code}`);
        o = layout('env-zero'); w(o.launcher, 'rem nothing\r\nset COMMIT_OK=1\r\n');
        r = runner('env-zero', { o }, { script, whatif: true });
        check(`${label} B1: launcher yielding 0 names refuses`, r.code === 2 && /yields 0 env names/.test(r.text), `exit ${r.code}`);
        o = layout('env-noroster'); w(o.launcher, 'set NATIVELY_SCENARIOS=S1,S2\r\nset NATIVELY_GEMINI_THINKING_LEVEL=\r\n');
        r = runner('env-noroster', { o }, { script, whatif: true });
        check(`${label} B1: launcher without NATIVELY_ROSTER refuses`, r.code === 2 && /no NATIVELY_ROSTER/.test(r.text), `exit ${r.code}`);
        r = runner('env-wi', {}, { script, whatif: true });
        check(`${label} B1: -WhatIf names the env counts (set 4, cleared 2)`, r.code === 0 && /env set 4 cleared 2/.test(r.text), r.text.slice(0, 150));
    }
    // 2. exit-code stop at step 4, then -Resume (I2)
    if (want('stop')) {
        const r = runner('stop', {}, { script, env: { STUB_FAIL_TAG: 'captured-g-high-r2', STUB_FAIL_CODE: '7', STUB_PARTIAL: '1' } });
        const L = readLog(log(r.o)); const A = argsLines(r.o);
        check(`${label} stop: non-zero step exit stops the runner with exit 1`, r.code === 1, `exit ${r.code}`);
        check(`${label} stop: steps 1..4 logged, step 4 ends exit=7, no step 5 started, stub saw 4 calls`, L.steps.length === 4 && L.steps[3].exit === 7 && L.steps[3].tag === 'captured-g-high-r2' && A.length === 4 && L.unclosed.length === 0);
        check(`${label} stop: the stop line names step 4 and its tag; stdout says so too`, /GSITTING stop .*step 4 captured-g-high-r2 exit=7/.test(log(r.o)) && /step 4 captured-g-high-r2/.test(r.text));
        check(`${label} stop: no outputs were copied`, ansFiles(r.o.run).length === 0);
        const r2 = runner('stop', { o: r.o }, { script });
        check(`${label} stop: a second plain call refuses (stale tags), makes no call`, r2.code === 2 && /tags are never reused/.test(r2.text) && argsLines(r.o).length === 4, `exit ${r2.code}`);
        const o3 = layout('stop2'); w(o3.log, 'STEP 1 captured-g-high start 2026-10-06T01:00:00.000Z\n');
        const r3 = runner('stop2', { o: o3 }, { script });
        check(`${label} stop: a log that already holds a STEP line refuses a plain call (no outputs present, so only this check can fire), no call`, r3.code === 2 && /already holds STEP lines/.test(r3.text) && argsLines(o3).length === 0, `exit ${r3.code}`);
        // I2: resume
        const wi = runner('stop', { o: r.o }, { script, whatif: true, flags: ['-Resume'] });
        check(`${label} resume: -WhatIf prints only steps 4..16 (13 lines), first CMD 4 captured-g-high-r2`, wi.code === 0 && (wi.text.match(/^CMD /gm) ?? []).length === 13 && /^CMD 4 captured-g-high-r2:/m.test(wi.text), `exit ${wi.code}`);
        const partialBefore = fs.existsSync(path.join(r.o.golden, 'interview60.answers.gemini-3.5-flash-lite_captured-g-high-r2.json'));
        const logBefore = log(r.o);
        const rr = runner('stop', { o: r.o }, { script, flags: ['-Resume'] });
        const L2 = readLog(log(r.o)); const A2 = argsLines(r.o);
        check(`${label} resume: exits 0 and re-runs only steps 4..16 (stub calls 4 + 13 = 17)`, rr.code === 0 && A2.length === 17 && A2.slice(4).every((a, i) => a.tag === EXPECT[i + 3][0]), `exit ${rr.code} calls ${A2.length}`);
        const dirs = fs.existsSync(r.o.outdir) ? fs.readdirSync(r.o.outdir).filter((d) => d.startsWith('failed-4-')) : [];
        const inFailed = dirs.length ? fs.readdirSync(path.join(r.o.outdir, dirs[0])) : [];
        check(`${label} resume: the partial output (existed: ${partialBefore}) and step-4 out/err were MOVED to failed-4-<stamp>, with the pre-resume log copy`, partialBefore && dirs.length === 1 && inFailed.includes('interview60.answers.gemini-3.5-flash-lite_captured-g-high-r2.json') && inFailed.includes('step-4.out.txt') && inFailed.includes('step-4.err.txt') && inFailed.includes('gsitting.log.before-resume'), inFailed.join(','));
        check(`${label} resume: the moved partial is the failed attempt's ({"partial":true}), the canonical file now holds the new answer ({})`, dirs.length === 1 && rd(path.join(r.o.outdir, dirs[0], 'interview60.answers.gemini-3.5-flash-lite_captured-g-high-r2.json')) === '{"partial":true}' && fs.readFileSync(path.join(r.o.golden, 'interview60.answers.gemini-3.5-flash-lite_captured-g-high-r2.json'), 'utf8').includes('"S1Q04F"'));
        const before = dirs.length ? rd(path.join(r.o.outdir, dirs[0], 'gsitting.log.before-resume')) : '';
        check(`${label} resume: the saved log copy equals the log before the resume`, before === logBefore);
        check(`${label} resume: a GSITTING resume line and 2 GSITTING failed-attempt lines for step 4 (start, end exit=7)`, /^GSITTING resume .*from step 4 captured-g-high-r2; [0-9]+ partial file\(s\) moved \(not deleted\)/m.test(log(r.o)) && (log(r.o).match(/^GSITTING failed-attempt STEP 4 /gm) ?? []).length === 2);
        const ps = parseSitting(log(r.o));
        check(`${label} resume: eq-twins parseSitting reads the resumed log with 0 problems, 16 tags, all exit=0, numbers increasing`, ps.problems.length === 0 && ps.steps.size === 16 && [...ps.steps.values()].every((s) => s.exit === 0), ps.problems.join('; '));
        check(`${label} resume: ends with 16 STEP-clean steps for the tiny reader too, 13 of 13 copied`, L2.steps.length === 16 && L2.steps.every((s) => s.exit === 0 || s.n === 4) && /13 of 13 output files COPIED/.test(log(r.o)) && ansFiles(r.o.run).length === 13, `${L2.steps.length}`);
        const r4 = runner('stop', { o: r.o }, { script, flags: ['-Resume'] });
        check(`${label} resume: a second -Resume on a complete sitting refuses`, r4.code === 2 && /nothing to resume/.test(r4.text), `exit ${r4.code}`);
        const o5 = layout('stop-nolog');
        const r5 = runner('stop-nolog', { o: o5 }, { script, flags: ['-Resume'] });
        check(`${label} resume: no STEP line in the log refuses`, r5.code === 2 && /nothing to resume/.test(r5.text), `exit ${r5.code}`);
        const o6 = layout('stop-startonly'); w(o6.log, 'STEP 1 captured-g-high start 2026-10-06T01:00:00.000Z\n');
        const r6 = runner('stop-startonly', { o: o6 }, { script, whatif: true, flags: ['-Resume'] });
        check(`${label} resume: a step with a start line and no end resumes from that step (CMD 1..16)`, r6.code === 0 && (r6.text.match(/^CMD /gm) ?? []).length === 16 && /^CMD 1 captured-g-high:/m.test(r6.text), `exit ${r6.code}`);
        const o7 = layout('stop-ghost'); w(o7.log, 'STEP 1 captured-g-high start 2026-10-06T01:00:00.000Z\nSTEP 1 captured-g-high end 2026-10-06T01:01:00.000Z exit=0\nSTEP 2 captured-no-block-high start 2026-10-06T01:01:00.000Z\nSTEP 2 captured-no-block-high end 2026-10-06T01:02:00.000Z exit=3\n');
        w(path.join(o7.golden, 'interview60.answers.gemini-3.5-flash-lite_captured-g-high.json'), '{}');
        w(path.join(o7.golden, 'interview60.answers.gemini-3.5-flash-lite_captured-g-high-r3.json'), '{}');
        const r7 = runner('stop-ghost', { o: o7 }, { script, whatif: true, flags: ['-Resume'] });
        check(`${label} resume: an output file for a step that never ran refuses (tags never reused)`, r7.code === 2 && /never ran/.test(r7.text), `exit ${r7.code}`);
        const r8 = runner('stop-mx', { o: layout('stop-mx') }, { script, whatif: true, flags: ['-Resume', '-Holes', '3:S1Q04F'] });
        check(`${label} resume: -Resume with -Holes refuses`, r8.code === 2 && /exclusive/.test(r8.text), `exit ${r8.code}`);
    }
    // 2b. -Holes (I3)
    if (want('holes')) {
        const base = runner('holes', {}, { script });
        const o = base.o;
        check(`${label} holes: the clean sitting underneath ran (exit 0)`, base.code === 0, `exit ${base.code}`);
        putHole(o, ['captured-g-high-r3', 'captured-no-block-high-r3'], 'gemini-3.5-flash-lite', ['S1Q04F']);
        putHole(o, ['captured-g-low-r2', 'captured-no-block-low-r2'], 'gemini-3.1-flash-lite', ['S1Q06F']);
        const norm = fs.readFileSync(o.log, 'utf8');
        let r = runner('holes', { o }, { script, flags: ['-Holes', '3:S1Q04F'] });
        let A = argsLines(o).slice(16); const L = readLog(log(o));
        check(`${label} holes: "3:S1Q04F" exits 0, runs exactly 2 steps, numbered 17, 18`, r.code === 0 && A.length === 2 && L.steps.length === 18 && L.steps[16].n === 17 && L.steps[17].n === 18, `exit ${r.code} ${r.code ? r.text.slice(0, 200) : ''}`);
        check(`${label} holes: tags are eq-twins' tagOf(front, blk/nob, 3, b=true), block first (rep 3 odd), --only = the hole id, --no-block only on the no-block step`, A[0]?.tag === tagOf('front', 'blk', 3, true) && A[1]?.tag === tagOf('front', 'nob', 3, true) && A.every((a) => a.only === 'S1Q04F') && !A[0].noBlock && A[1].noBlock && A.every((a) => a.thinking === 'HIGH' && a.model === 'gemini-3.5-flash-lite'), A.map((a) => a.tag).join(' '));
        const ps = parseSitting(log(o));
        check(`${label} holes: eq-twins parseSitting reads the log with 18 tags and 0 problems; the first 16 lines are untouched`, ps.problems.length === 0 && ps.steps.size === 18 && log(o).startsWith(norm), ps.problems.join('; '));
        check(`${label} holes: the -b outputs were copied (2 of 2) and logged`, /mode=holes, 2 step\(s\) exit 0; 2 of 2 output files COPIED/.test(log(o)) && ansFiles(o.run).filter((f) => f.endsWith('-b.json')).length === 2);
        r = runner('holes', { o }, { script, flags: ['-Holes', '3:S1Q04F'] });
        check(`${label} holes: the same rep again refuses (tags never reused)`, r.code === 2 && /already in the log/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', '4:S1Q04F'] });
        check(`${label} holes: a rep without a hole refuses, naming it`, r.code === 2 && /front rep 4 id S1Q04F is no hole/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', '2:S1Q04F'] });
        check(`${label} holes: a rep whose files hold no hole at all (front rep 2) refuses`, r.code === 2 && /no hole/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', 'b2:S1Q04F'] });
        check(`${label} holes: an id that is no hole in a rep that has other holes refuses`, r.code === 2 && /back rep 2 id S1Q04F is no hole/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', '3:S9Q99'] });
        check(`${label} holes: an id outside G_twin refuses`, r.code === 2 && /not in G_twin/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', 'x3:S1Q04F'] });
        check(`${label} holes: a malformed spec refuses`, r.code === 2 && /not <rep>:<ids>/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', '9:S1Q04F'] });
        check(`${label} holes: a rep that does not exist refuses`, r.code === 2 && /does not exist/.test(r.text), `exit ${r.code}`);
        r = runner('holes', { o }, { script, flags: ['-Holes', 'b2:S1Q06F'], now: '2026-10-06T04:30:00' });
        A = argsLines(o).slice(18);
        check(`${label} holes: "b2:S1Q06F" (back rep 2) runs no-block first, tags from tagOf(back,...,2,b), numbered 19, 20, 3.1-lite LOW`, r.code === 0 && A.length === 2 && A[0].tag === tagOf('back', 'nob', 2, true) && A[1].tag === tagOf('back', 'blk', 2, true) && A[0].noBlock && A.every((a) => a.thinking === 'LOW' && a.model === 'gemini-3.1-flash-lite' && a.only === 'S1Q06F') && readLog(log(o)).steps.slice(18).map((s) => s.n).join() === '19,20', `exit ${r.code}`);
        const wi = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', '3:S1Q04F;b2:S1Q06F'], now: '2026-10-06T09:50:00' });
        check(`${label} holes: cutoff counts 2 steps per rep (09:50 + 2 reps x 2 x 3 min = 10:02 refuses)`, wi.code === 2 && /A7 I3 cutoff/.test(wi.text), `exit ${wi.code}`);
        // not finished sitting
        const s = runner('holes-nf', {}, { script, env: { STUB_FAIL_TAG: 'captured-g-high-r2' } });
        putHole(s.o, ['captured-g-high-r3', 'captured-no-block-high-r3'], 'gemini-3.5-flash-lite', ['S1Q04F']);
        r = runner('holes-nf', { o: s.o }, { script, whatif: true, flags: ['-Holes', '3:S1Q04F'] });
        check(`${label} holes: before 16 clean steps it refuses and points at -Resume`, r.code === 2 && /-Resume/.test(r.text), `exit ${r.code}`);
        // m6 bars for holes scale with the hole ids (1 id: 22 / 14)
        putHole(o, ['captured-g-high-r4', 'captured-no-block-high-r4'], 'gemini-3.5-flash-lite', ['S2Q05F']);
        r = runner('holes', { o }, { script, whatif: true, flags: ['-Holes', '4:S2Q05F'], head35: 21 });
        check(`${label} holes: m6 bars use the hole-id count (1 id: 3.5-lite bar 22; 21 refuses)`, r.code === 2 && /3\.5-lite headroom 21 < 22/.test(r.text) , `exit ${r.code}`);
    }
    // 3. cutoff
    if (want('cutoff')) {
        const at = (t, tag) => runner('cut-' + tag, {}, { script, now: `2026-10-06T${t}`, whatif: true });
        let r = at('09:13:00', '0913');
        check(`${label} cutoff: simulated 09:13 refuses, exit 2, names A7 I3, no STEP line`, r.code === 2 && /A7 I3 cutoff/.test(r.text) && !/^STEP/m.test(log(r.o)) && argsLines(r.o).length === 0, `exit ${r.code}`);
        r = at('09:12:00', '0912');
        check(`${label} cutoff: 09:12 (projected end exactly 10:00, not before) refuses`, r.code === 2 && /A7 I3 cutoff/.test(r.text), `exit ${r.code}`);
        r = at('09:11:00', '0911');
        check(`${label} cutoff: 09:11 (ends 09:59) accepted`, r.code === 0, `exit ${r.code}`);
        r = at('10:00:00', '1000');
        check(`${label} cutoff: 10:00 accepted (after 10:00 on a fresh ledger read)`, r.code === 0, `exit ${r.code}`);
        r = at('10:40:00', '1040');
        check(`${label} cutoff: 10:40 accepted, ledger asked for the NEW quota day (2026-10-06T07:00:00.000Z)`, r.code === 0 && /^2026-10-06T07:00:00\.000Z$/m.test(fs.readFileSync(path.join(CAL, 'cut-1040', 'ledger.arg'), 'utf8')));
    }
    // 4. quiet / ledger
    if (want('quiet')) {
        let r = runner('q-task', {}, { script, whatif: true, fakeTasks: ['Natively-flight-eq'] });
        check(`${label} quiet: a Natively-* task Running refuses, naming it`, r.code === 2 && /Natively-flight-eq/.test(r.text), `exit ${r.code}`);
        r = runner('q-el', {}, { script, whatif: true, fakeElectron: 2 });
        check(`${label} quiet: electron.exe running refuses`, r.code === 2 && /electron\.exe processes: 2/.test(r.text), `exit ${r.code}`);
        r = runner('q-led', {}, { script, whatif: true, env: { STUB_LEDGER_EXIT: '1' } });
        check(`${label} ledger: unreadable (exit 1) refuses`, r.code === 2 && /ledger not readable/.test(r.text), `exit ${r.code}`);
        r = runner('q-led2', {}, { script, whatif: true, env: { STUB_LEDGER_NOFIRST: '1' } });
        check(`${label} ledger: exit 0 but no first line refuses`, r.code === 2 && /ledger not readable/.test(r.text), `exit ${r.code}`);
    }
    // 5. G ids
    if (want('gids')) {
        const RH = 'READER run: window\n';
        let o = layout('g-none'); w(o.reader, RH + 'READ G = {A} (1)\n');
        let r = runner('g-none', { o }, { script, whatif: true });
        check(`${label} G: no READ G_twin line refuses`, r.code === 2 && /need exactly 1/.test(r.text), `exit ${r.code}`);
        o = layout('g-two'); w(o.reader, RH + 'READ G_twin = {S1Q04F, S1Q06F} (2); in G but out of G_twin: S2Q05F(other)\n');
        r = runner('g-two', { o }, { script, whatif: true });
        check(`${label} G: |G_twin| = 2 refuses (A2.4)`, r.code === 2 && /< 3/.test(r.text), `exit ${r.code}`);
        o = layout('g-cnt'); w(o.reader, RH + 'READ G_twin = {A1, B2, C3, D4} (3); x\n');
        r = runner('g-cnt', { o }, { script, whatif: true });
        check(`${label} G: count disagreeing with the ids refuses`, r.code === 2 && /count says/.test(r.text), `exit ${r.code}`);
        o = layout('g-five'); w(o.reader, RH + 'READ G_twin = {A1, B2, C3, D4, E5} (5); x\n');
        r = runner('g-five', { o }, { script, whatif: true, head35: 62, head31: 38 });
        check(`${label} G: 5 ids are carried through to every command line (bars 62/38 met by 62/38)`, r.code === 0 && (r.text.match(/--only A1,B2,C3,D4,E5/g) ?? []).length === 16, `exit ${r.code}`);
        r = runner('g-five', { o }, { script, whatif: true, head35: 61, head31: 38 });
        check(`${label} m6: |G|=5 bar is 10*5+12 = 62; 61 refuses`, r.code === 2 && /3\.5-lite headroom 61 < 62/.test(r.text), `exit ${r.code}`);
    }
    // 5b. I1 run names
    if (want('runname')) {
        let o = layout('rn-reader'); w(o.reader, fs.readFileSync(o.reader, 'utf8').replace('READER run:', 'READER smoke-eq-on:'));
        let r = runner('rn-reader', { o }, { script, whatif: true });
        check(`${label} I1: a reader file for another run refuses, naming both`, r.code === 2 && /reader output is for run 'smoke-eq-on', not -Run 'run'/.test(r.text), `exit ${r.code}`);
        o = layout('rn-noreader'); w(o.reader, fs.readFileSync(o.reader, 'utf8').replace(/^READER .*\n/, ''));
        r = runner('rn-noreader', { o }, { script, whatif: true });
        check(`${label} I1: a reader file with no READER line refuses`, r.code === 2 && /no 'READER <run>:' line/.test(r.text), `exit ${r.code}`);
        o = layout('rn-b4'); w(o.b4, fs.readFileSync(o.b4, 'utf8').replace('B4CAL run=run', 'B4CAL run=smoke-eq-on'));
        r = runner('rn-b4', { o }, { script, whatif: true });
        check(`${label} I1: a b4cal file for another run refuses`, r.code === 2 && /eq-b4-cal output is for run 'smoke-eq-on'/.test(r.text), `exit ${r.code}`);
        o = layout('rn-b4n'); w(o.b4, fs.readFileSync(o.b4, 'utf8').replace(/^B4CAL .*\n/, ''));
        r = runner('rn-b4n', { o }, { script, whatif: true });
        check(`${label} I1: a b4cal file with no B4CAL line refuses`, r.code === 2 && /B4CAL run=/.test(r.text), `exit ${r.code}`);
        o = layout('rn-slash'); r = runner('rn-slash', { o: { ...o, run: o.run + '\\' } }, { script, whatif: true });
        check(`${label} I1: -Run with a trailing backslash still matches`, r.code === 0, `exit ${r.code}`);
        o = layout('rn-out'); w(o.b4, fs.readFileSync(o.b4, 'utf8').replace('LABEL OUTSIDE --g NONE', 'LABEL OUTSIDE --g S2Q09F'));
        r = runner('rn-out', { o }, { script, whatif: true });
        check(`${label} I1: LABEL OUTSIDE --g S2Q09F refuses, naming A5.5 B-I1`, r.code === 2 && /A5\.5 B-I1/.test(r.text), `exit ${r.code}`);
        o = layout('rn-out0'); w(o.b4, fs.readFileSync(o.b4, 'utf8').replace(/^LABEL OUTSIDE.*\n/m, ''));
        r = runner('rn-out0', { o }, { script, whatif: true });
        check(`${label} I1: an absent LABEL OUTSIDE line refuses`, r.code === 2 && /A5\.5 B-I1/.test(r.text), `exit ${r.code}`);
    }
    // 6. b4cal
    if (want('b4')) {
        const H = 'B4CAL run=run ids=40 g=4\n', O = 'LABEL OUTSIDE --g NONE\n';
        const b4 = (name, txt, code, re) => { const o = layout('b4-' + name); w(o.b4, txt); const r = runner('b4-' + name, { o }, { script, whatif: true }); check(`${label} b4cal: ${name}`, r.code === code && (!re || re.test(r.text)), `exit ${r.code}`); };
        b4('DIFF refuses', H + 'TRANSCRIPT DIFF S1Q04F\nBLOCK OK 4/4\n' + O, 2, /TRANSCRIPT DIFF/);
        b4('BLOCK FAIL refuses', H + 'TRANSCRIPT OK 40/40\nBLOCK FAIL S1Q04F\n' + O, 2, /BLOCK FAIL/);
        b4('BLOCK FAIL marker-first only is accepted', H + 'TRANSCRIPT OK 40/40\nBLOCK FAIL S1Q04F (marker-first marker=3 label=9)\n' + O, 0);
        b4('two marker-first ids accepted', H + 'TRANSCRIPT OK 40/40\nBLOCK FAIL S1Q04F (marker-first marker=3 label=9),S1Q06F (marker-first marker=1 label=2)\n' + O, 0);
        b4('marker-first plus a plain failing id refuses', H + 'TRANSCRIPT OK 40/40\nBLOCK FAIL S1Q04F (marker-first marker=3 label=9),S1Q06F\n' + O, 2, /not marker-first/);
        b4('UNCALIBRATED accepted', H + 'TRANSCRIPT UNCALIBRATED 2; G-ids also failing: S1Q04F\nBLOCK OK 4/4\n' + O, 0);
        b4('empty file refuses', '', 2, /lacks exactly one/);
    }
    // 7. m6
    if (want('m6')) {
        let r = runner('m6a', {}, { script, whatif: true, head35: 51 });
        check(`${label} m6: 3.5-lite 51 < 52 (10*4+12) refuses`, r.code === 2 && /3\.5-lite headroom 51 < 52/.test(r.text), `exit ${r.code}`);
        r = runner('m6b', {}, { script, whatif: true, head31: 31 });
        check(`${label} m6: 3.1-lite 31 < 32 (6*4+8) refuses`, r.code === 2 && /3\.1-lite headroom 31 < 32/.test(r.text), `exit ${r.code}`);
        r = runner('m6c', {}, { script, whatif: true, head35: 52, head31: 32 });
        check(`${label} m6: exactly 52/32 accepted`, r.code === 0, `exit ${r.code}`);
        r = runner('m6d', {}, { script, whatif: true, head35: 490 });
        check(`${label} m6: claimed 3.5-lite headroom 490 > 500 - 22 (ledger mentions) refuses`, r.code === 2 && /exceeds 500 - ledger mentions 22/.test(r.text), `exit ${r.code}`);
    }
    // 8. stale / whatif
    if (want('stale')) {
        const o = layout('stale'); w(path.join(o.golden, 'interview60.answers.gemini-3.1-flash-lite_captured-g-low-r2.json'), '{}');
        const r = runner('stale', { o }, { script, whatif: true });
        check(`${label} stale: an existing output for a tag refuses, naming it`, r.code === 2 && /captured-g-low-r2/.test(r.text), `exit ${r.code}`);
        const w1 = runner('wi', {}, { script, whatif: true });
        const cmds = w1.text.split(/\r?\n/).filter((l) => l.startsWith('CMD '));
        check(`${label} whatif: prints 16 command lines in order, makes no call, writes no log`, w1.code === 0 && cmds.length === 16 && cmds.every((l, i) => l.startsWith(`CMD ${i + 1} ${EXPECT[i][0]}:`)) && argsLines(w1.o).length === 0 && log(w1.o) === '', `exit ${w1.code}`);
        check(`${label} whatif: the 16 lines carry --no-block exactly 8 times and never print a prompt`, cmds.filter((l) => l.includes('--no-block')).length === 8 && !/INTERVIEWER|"user"/.test(w1.text));
    }
    // 9. m1 and I4: gap note start-to-start, front only; slow-step note
    if (want('notes')) {
        const r = runner('notes', {}, { script, env: { STUB_SLEEP_MS: '1500' }, flags: ['-GapLimitMinutes', '0.01', '-SlowMinutes', '0.01'] });
        const t = log(r.o);
        const gaps = t.match(/^GSITTING note: front rep (\d) second step starts [\d.]+ min after the first \(> 0\.01\): 2c is reported for this rep$/gm) ?? [];
        check(`${label} notes: exit 0; the gap note fires for the 5 FRONT reps only, worded "2c is reported", never for the back reps`, r.code === 0 && gaps.length === 5 && !/back rep/.test(t) && !/2c[^\n]*back|back[^\n]*2c/.test(t), `exit ${r.code} gaps ${gaps.length}`);
        const slow = t.match(/^GSITTING note slow step (\d+) [\d.]+$/gm) ?? [];
        check(`${label} notes: "GSITTING note slow step <n> <min>" fires for each of the 16 steps over the threshold`, slow.length === 16 && /note slow step 1 /.test(t) && /note slow step 16 /.test(t), `slow ${slow.length}`);
        const r2 = runner('notes2', {}, { script, env: { STUB_SLEEP_MS: '1500' } });
        check(`${label} notes: at the real thresholds (15 / 10 min) a 1.5 s step logs neither note`, r2.code === 0 && !/GSITTING note/.test(log(r2.o)));
        const gapStart = (() => { const L = readLog(t); return [1, 3, 5, 7, 9].every((k, i) => true) && L.steps.length === 16; })();
        check(`${label} notes: the sitting itself still logged 16 clean steps`, gapStart);
    }
}

reset();
suite('REAL', SCRIPT);
const realFail = fail;

// ---- mutants: each must break its own cases ----
const src = fs.readFileSync(SCRIPT);
const MUT = [
    ['cutoff -ge -> -gt', (s) => s.replace('$vProjEnd -ge $vTen', '$vProjEnd -gt $vTen'), ['cutoff']],
    ['cutoff removed', (s) => s.replace('if ($vNow -lt $vTen -and $vProjEnd -ge $vTen)', 'if ($false)'), ['cutoff']],
    ['exit-code stop removed', (s) => s.replace('if ($vCode -ne 0) {', 'if ($false) {'), ['stop']],
    ['counterbalance flipped', (s) => s.replace('if (($vRep % 2) -eq 1) { $vPair', 'if (($vRep % 2) -eq 0) { $vPair'), ['clean']],
    ['--no-block dropped', (s) => s.replace('if ($vS.NoBlock) { $vArgs', 'if ($false) { $vArgs'), ['clean']],
    ['G ids hand-typed', (s) => s.replace("$vGcsv = $vGids -join ','", "$vGcsv = 'S1Q04F,S1Q06F'"), ['clean']],
    ['B1: launcher SET values dropped (empties only)', (s) => s.replace('foreach ($vName in $vEnvSet.Keys) { [Environment]::SetEnvironmentVariable($vName, $vEnvSet[$vName], \'Process\') }', ''), ['clean']],
    ['B1: launcher EMPTY names not cleared', (s) => s.replace('foreach ($vName in $vEnvClear) { [Environment]::SetEnvironmentVariable($vName, $null, \'Process\') }', ''), ['clean']],
    ['B1: 0-names refusal removed', (s) => s.replace('if (($vEnvSet.Count + $vEnvClear.Count) -eq 0)', 'if ($false)'), ['env']],
    ['B1: launcher-missing refusal removed', (s) => s.replace('if (-not (Test-Path -LiteralPath $LauncherCmd))', 'if ($false)'), ['env']],
    ['b4cal DIFF check removed', (s) => s.replace("if ($vTr -match '^TRANSCRIPT DIFF')", 'if ($false)'), ['b4']],
    ['marker-first exception removed', (s) => s.replace("$_ -notmatch '\\(marker-first'", '$true'), ['b4']],
    ['I1: reader run-name check removed', (s) => s.replace('if (-not $vRm.Success -or $vRm.Groups[1].Value -ne $vRunName)', 'if ($false)'), ['runname']],
    ['I1: b4cal run-name check removed', (s) => s.replace('if ($vBm.Groups[1].Value -ne $vRunName)', 'if ($false)'), ['runname']],
    ['I1: LABEL OUTSIDE check removed', (s) => s.replace("if ($vOutsideLines.Count -ne 1 -or $vOutsideLines[0].TrimEnd() -ne 'LABEL OUTSIDE --g NONE')", 'if ($false)'), ['runname']],
    ['I2: resume does not move the partial output', (s) => s.replace('Move-Item -LiteralPath $vP -Destination (Join-Path $vFailDir (Split-Path -Leaf $vP)); $vMoved++', '$vMoved++'), ['stop']],
    ['I2: resume keeps the failed attempt as STEP lines', (s) => s.replace("'GSITTING failed-attempt ' + $_", '$_'), ['stop']],
    ['I2: resume re-runs from step 1', (s) => s.replace('$vFirstIdx = $vI; break', '$vFirstIdx = 0; break'), ['stop']],
    ['I3: holes no-hole check removed', (s) => s.replace('if (-not $vIsHole)', 'if ($false)'), ['holes']],
    ['I3: holes tag lacks -b', (s) => s.replace("$vSfx2 = '-r' + $vSp2.Rep + '-b'", "$vSfx2 = '-r' + $vSp2.Rep"), ['holes']],
    ['I3: holes --only = all of G_twin', (s) => s.replace("$vOnly = $vS.OnlyIds", "$vOnly = $vGcsv"), ['holes']],
    ['I3: holes before 16 clean steps allowed', (s) => s.replace('if (($null -eq $vSt) -or ($null -eq $vSt.End) -or ($vSt.Exit -ne 0))', 'if ($false)'), ['holes']],
    ['I4: slow-step note removed', (s) => s.replace('if ($vDurMin -gt $vSlowMin)', 'if ($false)'), ['notes']],
    ['m1: gap note also for the back leg', (s) => s.replace("$vS.Second -and $vS.Leg -eq 'front' -and", '$vS.Second -and'), ['notes']],
    ['m6 3.5 bar removed', (s) => s.replace('if ($Headroom35 -lt $vBar35)', 'if ($false)'), ['m6']],
    ['task-running refusal removed', (s) => s.replace('if ($vRunTasks.Count -gt 0)', 'if ($false)'), ['quiet']],
    ['ledger-unreadable refusal removed', (s) => s.replace("if ($vLedgerExit -ne 0 -or $vLedgerText -notmatch 'quota day starts')", 'if ($false)'), ['quiet']],
    ['stale-output refusal removed', (s) => s.replace('if ($vStale.Count -gt 0)', 'if ($false)'), ['stale']],
    ['existing-STEP-log refusal removed', (s) => s.replace('if ((-not $WhatIf) -and $vLogState.Count -gt 0)', 'if ($false)'), ['stop']],
    ['BOM-writing log (Add-Content UTF8)', (s) => s.replace(/function Write-Log\(\[string\]\$vLine\) \{.*\}\r?\n/, 'function Write-Log([string]$vLine) { Add-Content -LiteralPath $LogPath -Value $vLine -Encoding UTF8 }\r\n'), ['clean']],
    ['|G_twin|<3 refusal removed', (s) => s.replace('if ($vGids.Count -lt 3)', 'if ($false)'), ['gids']],
];
const mutDir = path.join(E, 'gsitting-cal-mut');
fs.mkdirSync(mutDir, { recursive: true });
let mutKilled = 0;
for (const [name, fn, only] of MUT) {
    const text = src.toString('utf8');
    const changed = fn(text);
    if (changed === text) { check(`MUTANT ${name}: the mutation applied`, false, 'pattern not found'); continue; }
    const p = path.join(mutDir, 'eq-gsitting.mut.ps1');
    fs.writeFileSync(p, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(changed.replace(/^\uFEFF/, ''), 'utf8')]));
    const before = fail, beforePass = pass;
    const saveOut = out.length;
    suite('MUT', p, only);
    const killed = fail > before;
    out.splice(saveOut); // drop the mutant's own detail lines; keep the verdict
    fail = before; pass = beforePass; // the mutant's expected failures are not failures of the cal
    check(`MUTANT ${name}: the cal FAILS on it (killed)`, killed);
    if (killed) mutKilled++;
}
fs.rmSync(mutDir, { recursive: true, force: true });
fs.rmSync(CAL, { recursive: true, force: true });
out.push(`TOTAL ${pass} PASS ${fail} FAIL  (real-script checks failing: ${realFail}; mutants killed ${mutKilled} of ${MUT.length})`);
const txt = out.join('\n');
console.log(txt);
fs.writeFileSync(path.join(E, 'eq-gsitting.cal.txt'), txt + '\n');
process.exit(fail ? 1 : 0);
