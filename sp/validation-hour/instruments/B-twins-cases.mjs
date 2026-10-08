// B-twins-cases.mjs [--adapter <path>] [--out <file>]
//
// Builder B's calibration runner for VH\h40d-twins.mjs (r4 section 7.4, known cases (1)-(9)), plus the extras that make
// the instrument show it can fail (rule 8). Real-file cases run the adapter's CLI exactly as the controller will and
// save its output verbatim; synthetic cases are built IN MEMORY from h40c's real files (never written anywhere) and go
// through the same exported `analyze` the CLI calls. Every expected value below is fixed from r4 / the brief / the
// bench's own printed output BEFORE the first run; an `ASSERT FAIL` line is a finding to explain, never an expectation
// to edit. Read-only: node scripts that read files; no API call, no build, no app.
//   node B-twins-cases.mjs                         -> VH\h40d-twins-cal.txt
//   node B-twins-cases.mjs --adapter <mutant.mjs> --out <file>      (the mutation harness runs it on broken copies)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..');
const SP = path.resolve(VH, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const adapterPath = path.resolve(opt('--adapter', path.join(VH, 'h40d-twins.mjs')));
const outFile = path.resolve(opt('--out', path.join(VH, 'h40d-twins-cal.txt')));
const UE = String.fromCharCode(0xfc);   // the u-umlaut of the folder name, made at run time (no non-ASCII literal, no escape in the source)
const MAIN = path.join(os.homedir(), 'OneDrive', `Masa${UE}st${UE}`, 'natively-cluely-ai-assistant');
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
const RUNS = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs');
const H40C = path.join(RUNS, '2026-09-29T11-42-00-h40c');
const H40B = path.join(RUNS, '2026-09-26T11-39-51-h40b');
const S50L = path.join(RUNS, '2026-09-21T08-22-34-s50l');
const S50M = path.join(RUNS, '2026-09-22T08-22-50-s50m');
const BENCH = path.join(HERE, 'twins-bench');
const HIGH = 'gemini-3.5-flash-lite_captured-high', LOW = 'gemini-3.1-flash-lite_captured-low', BENCHFAM = 'gemini-3.5-flash-lite_cues';
const A = await import(pathToFileURL(adapterPath).href);

const OUT = [];
const say = (s = '') => { OUT.push(s); console.log(s); };
let asserts = 0, fails = 0;
const failed = [];
const expect = (what, got, want) => {
    asserts++;
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) { fails++; failed.push(what); }
    say(`  ASSERT ${ok ? 'OK  ' : 'FAIL'} ${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
};
const has = (what, text, needle) => { asserts++; const ok = text.includes(needle); if (!ok) { fails++; failed.push(what); } say(`  ASSERT ${ok ? 'OK  ' : 'FAIL'} ${what}: output ${ok ? 'contains' : 'does NOT contain'} ${JSON.stringify(needle)}`); };
const shorten = (s) => s.split(MAIN).join('<MAIN>').split(HERE).join('<VH>\\instruments').split(VH).join('<VH>').split(SP).join('<SP>');
// The ledger: one line per case, printed at the end. A line is `OK` only if no assertion failed since its case (or part) began,
// so the summary cannot disagree with the evidence above it; its text is typed here from r4 / the brief and checked by those assertions.
const ledger = [];
let caseStart = 0;
const begin = () => { caseStart = fails; };
const done = (text) => ledger.push(`${fails === caseStart ? 'OK      ' : 'MISMATCH'} ${text}`);
const header = (t) => { begin(); say(''); say('='.repeat(110)); say(t); say('='.repeat(110)); };

function cli(args) {
    const r = spawnSync(process.execPath, [adapterPath, ...args], { encoding: 'utf8' });
    say(`$ node <VH>\\h40d-twins.mjs ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).map(shorten).join(' ')}`);
    const text = `${r.stdout}${r.stderr ? `[stderr] ${r.stderr}` : ''}`;
    for (const l of shorten(text).replace(/\r/g, '').split('\n')) if (l !== '') say(`  | ${l}`);
    say(`  | EXIT ${r.status}`);
    return { text, out: r.stdout, err: r.stderr, code: r.status };
}

const chain = A.loadChain();
const fam = (dir, family, needJudge = true) => A.loadFamily(dir, family, needJudge);
// h40c's captured-high files used as the CONTROL against a modified in-memory copy of themselves (cases 6c, 8, 8e): relabelled so the
// h40d reading's refusal of one family on both sides does not fire (the data and the file names are untouched)
const asControl = (f) => { f.family = `${f.family} (the real files, as the control)`; return f; };
const clone = (x) => structuredClone(x);
const EXCL = new Set(A.GATED_EXCLUDED);
const KEY = /^(band|wrong on|cue check|rule 3c reading|NOTE)/;
const run = (cue, control, o = {}) => A.analyze({ chain, cue, control, ...o });
const sline = (s) => `    ${s.side} rep ${s.rep}: ids ${s.n}, answered ${s.answered}, holes [${s.holes.map((h) => h.id).join(' ')}], empty prose [${s.empties.map((e) => `${e.id}:${e.kind}${e.stage ? '/' + e.stage : ''}${e.gated ? '/gated' : ''}`).join(' ')}], acceptable ${s.acceptable}, wrong gated ${s.wrongGated} / all ${s.wrongAll}, cue check n ${s.cue.n} present ${s.cue.present} shaped ${s.cue.shape}`;
const show = (res, reps = []) => {
    for (const [side, r] of reps) say(sline(res.sum3[side][r - 1]));
    for (const l of res.lines.filter((x) => KEY.test(x))) say(`    ${l}`);
    say(`    exit ${res.exit}`);
};

// ---- in-memory builders (never written)
const BLOCK_RAW = '__CUES__\n1| first point\n2| second point\n';
const BLOCK_CUES = ['first point', 'second point'];
function injectCues(f, fourLines = {}) {
    for (const r of f.reps) for (const rec of Object.values(r.store)) {
        if (rec.transientError) continue;
        rec.cues = (fourLines[r.rep] ?? []).includes(rec.id) ? ['one point', 'two point', 'three point', 'four point'] : [...BLOCK_CUES];
    }
}
function toHole(f, rep, id) {
    const r = f.reps[rep - 1], rec = r.store[id];
    const h = Object.fromEntries(['id', 'level', 'scenario', 'topic', 'gapMs', 'q', 'long', 'chain'].filter((k) => k in rec).map((k) => [k, rec[k]]));
    r.store[id] = { ...h, model: rec.model, transientError: 'HTTP 503' };
    if (r.judge) delete r.judge.items[id];
}
function toBlockOnly(f, rep, id, raw = BLOCK_RAW, cues = BLOCK_CUES) {
    const r = f.reps[rep - 1];
    Object.assign(r.store[id], { spoken: '', raw, rawLen: raw.length, cues: [...cues], words: 0, offers: [], finish: 'STOP' });
    if (r.judge) delete r.judge.items[id];
}
const weakGated = (f, rep, n) => {
    const r = f.reps[rep - 1];
    const ids = Object.keys(r.store).filter((id) => !EXCL.has(id) && r.judge.items[id]?.verdict === 'weak');
    if (ids.length < n) throw new Error(`rep ${rep} has only ${ids.length} weak gated ids, need ${n}`);
    return ids.slice(0, n);
};

say(`h40d-twins calibration, ${new Date().toISOString()}`);
say(`adapter: ${shorten(adapterPath)}`);
say(`chain: ${shorten(chain.root)}  filter sha256/16 ${chain.filterSha16}  CUE_RULE sha256/12 ${chain.ruleSha12}`);

// =============================================================================================== CASE 1
header('CASE 1  h40c, captured-low as the control, --pre-cue   (r4 section 4 known case: expected PASS)');
say('Expected before the run (r4 section 4): band cue [36, 38] against control [36, 37] (the control r3 is 36 of 43) -> overlap; gated wrong control 1 / 0 / 0');
say('(R08 in r1; total 1), cue 0 / 0 / 0 (0 <= 1 + 1) -> no stop; all-ids wrong control 2 / 1 / 2, cue 1 / 0 / 2; PASS; the cue check marked not applicable.');
{
    const r = cli([H40C, '--control', LOW, '--pre-cue']);
    has('1 band', r.out, 'control [36, 37] (reps 37 / 37 / 36)  cue [36, 38] (reps 36 / 37 / 38)  -> OVERLAP');
    has('1 gated default', r.out, 'cue 0 (0 / 0 / 0) vs control 1 (1 / 0 / 0) + 1 -> no stop');
    has('1 gated strict', r.out, 'worst control rep 1; cue rep(s) above it: none -> no stop');
    has('1 all-ids', r.out, 'control 2 / 1 / 2, cue 1 / 0 / 2');
    has('1 control r3 hole', r.out, 'answered 43, true holes 1');
    has('1 hole named', r.out, 'R10 (HTTP 503)');
    const readingLine = r.out.split('\n').find((l) => l.startsWith('rule 3c reading:')) ?? '';
    has('1 the reading LINE carries the not-applicable mark', readingLine, 'PRE-CUE KNOWN CASE: the cue check is NOT APPLICABLE and was not read; this line is not a verdict');
    has('1 reading', r.out, 'rule 3c reading: PASS');
    expect('1 exit', r.code, 0);
    has('1 no grader flag when uniform', r.out, 'claude-opus-5-5 / prompt stamp 8564ba96369a: 6');
    done('1  h40c, captured-low as the control, --pre-cue -> PASS (exit 0): band cue [36, 38] vs control [36, 37] overlap (control r3 = 36 of 43, hole R10); gated wrong cue 0/0/0 vs control 1/0/0; all-ids cue 1/0/2 vs control 2/1/2; cue check marked not applicable on the reading line');
}

// =============================================================================================== CASE 2
header('CASE 2  h40b the same way   (r4 section 4: expected PASS under the default AND the strict alternative)');
say('Expected before the run: band cue [36, 39] against control [38, 40] -> overlap; gated wrong control 0 / 0 / 1 (R08 in r3; total 1), cue 0 / 0 / 0; PASS, both readings.');
{
    const r = cli([H40B, '--control', LOW, '--pre-cue']);
    has('2 band', r.out, 'control [38, 40] (reps 40 / 40 / 38)  cue [36, 39] (reps 38 / 36 / 39)  -> OVERLAP');
    has('2 gated default', r.out, 'cue 0 (0 / 0 / 0) vs control 1 (0 / 0 / 1) + 1 -> no stop');
    has('2 gated strict', r.out, 'worst control rep 1; cue rep(s) above it: none -> no stop');
    has('2 reading', r.out, 'rule 3c reading: PASS');
    expect('2 exit', r.code, 0);
    const s = cli([H40B, '--control', LOW, '--pre-cue', '--strict']);
    has('2 strict governing reading', s.out, 'rule 3c reading: PASS');
    expect('2 strict exit', s.code, 0);
    done('2  h40b the same way -> PASS (exit 0) under the default and with --strict governing: band cue [36, 39] vs control [38, 40] overlap; gated wrong cue 0/0/0 vs control 0/0/1');
}

// =============================================================================================== CASE 2b
header('CASE 2b  the strict alternative on REAL data, through the CLI (h40c, roles swapped: cue = captured-low, control = captured-high, --pre-cue): a real STOP and its exit code 1');
say('Expected before the run, from r4 section 4 and the case-1 counts: the 3.5-lite HIGH twins read 0 gated wrong in all three reps (control 0 / 0 / 0) and captured-low has R08 in r1 (gated 1 / 0 / 0);');
say('so under the default (1 <= 0 + 1) no stop -> PASS, exit 0; with --strict (rep 1: 1 > the worst control rep 0) -> STOP, exit 1. The band is not what stops it: cue [36, 37] against control [36, 38].');
{
    const a = cli([H40C, '--cue', LOW, '--control', HIGH, '--pre-cue']);
    has('2b default: band overlap', a.out, 'control [36, 38] (reps 36 / 37 / 38)  cue [36, 37] (reps 37 / 37 / 36)  -> OVERLAP');
    has('2b default: gated cue 1/0/0 vs control 0/0/0, no stop', a.out, 'cue 1 (1 / 0 / 0) vs control 0 (0 / 0 / 0) + 1 -> no stop');
    has('2b default: the strict reading is printed beside as STOP', a.out, 'worst control rep 0; cue rep(s) above it: 1 -> STOP');
    has('2b default reading', a.out, 'rule 3c reading: PASS'); expect('2b default exit', a.code, 0);
    const s = cli([H40C, '--cue', LOW, '--control', HIGH, '--pre-cue', '--strict']);
    has('2b strict reading', s.out, "rule 3c reading: STOP (cue-attributable FAIL: wrong (strict): cue rep(s) 1 have more gated wrong than the worst control rep's 0)");
    expect('2b strict exit (a real STOP through the CLI process)', s.code, 1);
    done('2b  real data, roles swapped (h40c cue = captured-low, control = captured-high), --pre-cue: default PASS (exit 0; gated 1/0/0 vs 0/0/0, 1 <= 0 + 1) and --strict STOP (exit 1; rep 1: 1 > 0) = the strict clause as r4 describes it; a real STOP through the CLI process');
}

// =============================================================================================== CASE 3
header("CASE 3  the cue check WITH cues: Thursday's bench cue answer files copied under the flight naming (twins-bench\\), --answers-only");
say('Expected before the run (SP\\cuebench\\cuebench-score.out.txt): per rep blocks present 38/39, 39/39, 39/39; shaped 38/39, 38/39, 39/39; over 3 lines 0 / 1 / 0;');
say('words over 5, blocks 7/39, 8/39, 7/39 and lines 10/102, 11/108, 12/105; ttft p90 5217 / 4571 / 5133 ms. (No verdicts exist for these reps: the bench graded blind pairs, not');
say('interview60.judge.* files, so only the parts that need no verdicts are tested; nothing is invented.)');
let bench;
{
    const r = cli([BENCH, '--answers-only', '--cue', BENCHFAM]);
    bench = r;
    const lines = r.out.split('\n').filter((l) => l.includes('cue check (net of true holes'));
    expect('3 cue-check lines read', lines.length, 3);
    const want = [
        ['blocks present 38/39 (97.4%), shaped 38/39 (97.4%); over 3 lines 0/39 (0.0%); over 5 words: blocks 7/39 (17.9%), lines 10/102 (9.8%)'],
        ['blocks present 39/39 (100.0%), shaped 38/39 (97.4%); over 3 lines 1/39 (2.6%); over 5 words: blocks 8/39 (20.5%), lines 11/108 (10.2%)'],
        ['blocks present 39/39 (100.0%), shaped 39/39 (100.0%); over 3 lines 0/39 (0.0%); over 5 words: blocks 7/39 (17.9%), lines 12/105 (11.4%)'],
    ];
    want.forEach(([w], i) => has(`3 rep ${i + 1} present/shaped/over-3/over-5`, lines[i] ?? '', w));
    has('3 ttft p90 rep 1', r.out, 'p90 5217 ms'); has('3 ttft p90 rep 2', r.out, 'p90 4571 ms'); has('3 ttft p90 rep 3', r.out, 'p90 5133 ms');
    has('3 benchDecide cue rule holds', r.out, 'holds in every cue rep');
    has('3 reading is not a verdict', r.out, 'rule 3c reading: NOT COMPUTED');
    expect('3 exit', r.code, 0);
    // the bench's own scorer, run live on the ORIGINAL bench files: its per-rep present/shaped must equal the adapter's
    const sc = spawnSync(process.execPath, [path.join(SP, 'cuebench', 'cuebench-score.mjs'), '--cue-dir', path.join(WT, 'electron', 'test', 'golden')], { encoding: 'utf8' });
    say('  independent: cuebench-score.mjs --cue-dir <WT>\\electron\\test\\golden (the bench\'s own scorer on the original files), its per-rep cue columns:');
    const rows = sc.stdout.split('\n').filter((l) => /^rep \d:/.test(l));
    for (const l of rows) say(`    | ${l.replace(/\r/g, '').replace(/\s+acceptable.*?(blocks present)/, ' ... $1')}`);
    rows.forEach((l, i) => {
        const m = l.match(/blocks present (\d+\/\d+)\s+shaped (\d+\/\d+) \(over 3 lines: (\d+)\)\s+words over 5, reported: blocks (\d+\/\d+), lines (\d+\/\d+)/);
        const mine = (lines[i] ?? '').match(/blocks present (\d+\/\d+) \([\d.]+%\), shaped (\d+\/\d+) \([\d.]+%\); over 3 lines (\d+)\/\d+ \([\d.]+%\); over 5 words: blocks (\d+\/\d+) \([\d.]+%\), lines (\d+\/\d+)/);
        expect(`3 rep ${i + 1}: adapter equals the bench's own scorer`, mine && mine.slice(1), m && m.slice(1));
    });
    expect('3 the bench scorer printed three rep rows', rows.length, 3);
    done('3  the bench cue files (copied to the flight naming, byte-identical; --answers-only, no verdicts exist for them) -> NOT COMPUTED as a reading; per rep present 38/39 39/39 39/39, shaped 38/39 38/39 39/39, over 3 lines 0/1/0, over 5 words blocks 7/8/7 lines 10/11/12 = the bench scorer run live on the original files; ttft p90 5217/4571/5133');
}

// =============================================================================================== CASE 4
header('CASE 4  synthetic, in memory from h40c captured-high: cues on every id, five / four 4-line blocks in one rep (control = h40c captured-low, real)');
say('Expected before the run (r4): five 4-line blocks -> shaped 39 of 44 (88.6%) -> STOP; four -> 40 of 44 (90.9%) -> PASS (0.9 x 44 = 39.6).');
{
    const ctl = fam(H40C, LOW);
    for (const [k, wantReading, wantShaped, wantExit] of [[5, 'STOP', 39, 1], [4, 'PASS', 40, 0]]) {
        begin();
        const cue = clone(fam(H40C, HIGH));
        const ids = Object.keys(cue.reps[0].store);
        injectCues(cue, { 1: ids.slice(0, k) });
        const res = await run(cue, clone(ctl));
        say(`  -- ${k} four-line blocks in rep 1 (ids ${ids.slice(0, k).join(' ')}):`);
        show(res, [['cue', 1], ['cue', 2]]);
        expect(`4 (${k} blocks) rep 1 shaped of n`, [res.sum3.cue[0].cue.shape, res.sum3.cue[0].cue.n], [wantShaped, 44]);
        expect(`4 (${k} blocks) rep 1 present of n`, [res.sum3.cue[0].cue.present, res.sum3.cue[0].cue.n], [44, 44]);
        expect(`4 (${k} blocks) over-3 count in rep 1`, res.sum3.cue[0].cue.over3, k);
        expect(`4 (${k} blocks) a cue-hour reading line carries no pre-cue mark`, res.lines.find((l) => l.startsWith('rule 3c reading:')).includes('PRE-CUE'), false);
        expect(`4 (${k} blocks) reading`, res.reading, wantReading);
        expect(`4 (${k} blocks) exit`, res.exit, wantExit);
        expect(`4 (${k} blocks) only the cue check speaks`, [res.band.cue[1] >= res.band.control[0], res.defaultClause.stop], [true, false]);
        done(`4  synthetic: cues on every id, ${k} four-line blocks in one cue rep -> ${res.reading} (exit ${res.exit}): shaped ${res.sum3.cue[0].cue.shape} of ${res.sum3.cue[0].cue.n} (${(100 * res.sum3.cue[0].cue.shape / res.sum3.cue[0].cue.n).toFixed(1)}%) in that rep, band and gated clauses clear, so only the cue check decides`);
    }
}

// =============================================================================================== CASE 5
header('CASE 5  a hole case: 3 transientError plus 1 empty prose (a block-only twin) in a cue rep   (expected: not INCOMPLETE, wrong +1, cue-check n = 41)');
{
    const ctl = fam(H40C, LOW);
    const base = clone(fam(H40C, HIGH)); injectCues(base);
    const baseRes = await run(clone(base), clone(ctl));
    const mod = clone(base);
    const ids = weakGated(mod, 1, 4);
    for (const id of ids.slice(0, 3)) toHole(mod, 1, id);
    toBlockOnly(mod, 1, ids[3]);
    say(`  -- rep 1: ids ${ids.slice(0, 3).join(' ')} -> transientError; ${ids[3]} -> a raw that is one cue block alone, prose empty (all four ids were graded weak, a gated id each)`);
    const res = await run(mod, clone(ctl));
    say('  baseline (cues injected, nothing modified):'); show(baseRes, [['cue', 1]]);
    say('  modified:'); show(res, [['cue', 1]]);
    const b = baseRes.sum3.cue[0], m = res.sum3.cue[0];
    expect('5 true holes in rep 1', m.holes.length, 3);
    expect('5 not INCOMPLETE', res.incomplete, []);
    expect('5 cue-check n = 44 - 3', m.cue.n, 41);
    expect('5 cue check present / shaped of 41', [m.cue.present, m.cue.shape], [41, 41]);
    expect('5 all-ids wrong = baseline + 1', m.wrongAll, b.wrongAll + 1);
    expect('5 gated wrong = baseline + 1 (a block-only twin on a gated id)', m.wrongGated, b.wrongGated + 1);
    expect('5 the empty prose is a block-only twin emptied by stripCueBlock', [m.empties[0].kind, m.empties[0].stage, m.empties[0].gated], ['block-only', 'stripCueBlock', true]);
    expect('5 acceptable unchanged (the four ids were weak)', m.acceptable, b.acceptable);
    expect('5 reading (cue total 1 <= control total 1 + 1)', res.reading, 'PASS');
    done(`5  synthetic: 3 transientError + 1 empty prose (block-only twin on a gated id) in a cue rep -> not INCOMPLETE (${res.reading}, exit ${res.exit}); true holes ${m.holes.length}, cue-check n ${m.cue.n}, all-ids wrong ${b.wrongAll} -> ${m.wrongAll} (+1), gated wrong ${b.wrongGated} -> ${m.wrongGated} (+1)`);
}

// =============================================================================================== CASE 6
header('CASE 6  4 transientError in a rep -> INCOMPLETE   (and 3 stays decided: case 5)');
{
    const ctl = fam(H40C, LOW);
    const cueBase = clone(fam(H40C, HIGH)); injectCues(cueBase);
    const cueMod = clone(cueBase);
    const ids = weakGated(cueMod, 2, 4);
    for (const id of ids) toHole(cueMod, 2, id);
    say(`  -- cue side: rep 2 ids ${ids.join(' ')} -> transientError`);
    const res = await run(cueMod, clone(ctl));
    show(res, [['cue', 2]]);
    expect('6 cue rep 2 holes', res.sum3.cue[1].holes.length, 4);
    expect('6 reading', res.reading, 'INCOMPLETE');
    expect('6 exit', res.exit, 3);
    has('6 names the rep and count', res.lines.join('\n'), 'more than 3 true holes: cue rep 2 (4)');
    const ctlMod = clone(ctl);
    const cids = weakGated(ctlMod, 1, 4);
    for (const id of cids) toHole(ctlMod, 1, id);
    say(`  -- control side (the symmetric rule): control rep 1 ids ${cids.join(' ')} -> transientError`);
    const res2 = await run(clone(cueBase), ctlMod);
    show(res2, [['control', 1]]);
    expect('6 control reading', res2.reading, 'INCOMPLETE');
    has('6 names the control rep', res2.lines.join('\n'), 'control rep 1 (4)');
    done(`6  synthetic: 4 transientError in a rep -> ${res.reading} (exit ${res.exit}) on the cue side and ${res2.reading} (exit ${res2.exit}) on the control side (symmetric); 3 holes stays decided (case 5)`);
}

// ============================================================================================ CASE 6c / 10
header('CASE 6c  INCOMPLETE while a clause already reads STOP on the ids answered: the reading is INCOMPLETE and the STOP is named beside it');
{
    const ctl = asControl(fam(H40C, HIGH));
    const c = clone(fam(H40C, HIGH)); injectCues(c);
    const probe = clone(fam(H40C, HIGH));
    const g1 = weakGated(probe, 1, 2), h2 = weakGated(probe, 2, 4);
    for (const id of g1) toBlockOnly(c, 1, id);
    for (const id of h2) toHole(c, 2, id);
    say(`  -- cue rep 1: ${g1.join(' ')} -> block-only twins (gated); cue rep 2: ${h2.join(' ')} -> transientError`);
    const res = await run(c, clone(ctl)); show(res, [['cue', 1], ['cue', 2]]);
    expect('6c reading and exit', [res.reading, res.exit], ['INCOMPLETE', 3]);
    has('6c the STOP is named beside the INCOMPLETE', res.lines.join('\n'), 'NOTE: on the ids answered a clause already reads STOP');
    done('6c (extra) 4 holes in one cue rep + two gated block-only twins in another -> INCOMPLETE (exit 3), with the STOP the clauses already read named beside it');
}
header('CASE 10  the band clause through the adapter at its boundary (h40c, --pre-cue, in-memory verdict degradation: acceptable items set to weak by delivery 0)');
say('Control (captured-low) acceptable [37, 37, 36] -> band [36, 37]. Cue reps start at [36, 37, 38]. Expected before the run: cue [35, 35, 35] -> max 35 < control min 36 -> ENTIRELY BELOW -> STOP;');
say('cue [35, 35, 36] -> max 36 >= 36 -> OVERLAP -> PASS ("overlap or exceed"; entirely below = FAIL).');
{
    const ctl = fam(H40C, LOW);
    const degrade = (f, rep, k) => {
        const items = Object.values(f.reps[rep - 1].judge.items).filter((x) => x.verdict === 'acceptable').slice(0, k);
        if (items.length < k) throw new Error(`rep ${rep}: only ${items.length} acceptable items to degrade`);
        for (const it of items) { it.delivery = 0; it.verdict = 'weak'; }
    };
    for (const [name, ks, wantReading, wantExit, wantBand] of [['10a', [1, 2, 3], 'STOP', 1, [35, 35]], ['10b', [1, 2, 2], 'PASS', 0, [35, 36]]]) {
        begin();
        const cue = clone(fam(H40C, HIGH));
        ks.forEach((k, i) => degrade(cue, i + 1, k));
        const res = await run(cue, clone(ctl), { preCue: true });
        say(`  -- ${name}: degrade ${ks.join(' / ')} acceptable items in cue reps 1 / 2 / 3`); show(res, []);
        expect(`${name} cue band`, res.band.cue, wantBand);
        expect(`${name} reading and exit`, [res.reading, res.exit], [wantReading, wantExit]);
        done(`${name} (extra) band clause at its edge (--pre-cue, in-memory degradation): cue [${res.band.cue.join(', ')}] vs control [${res.band.control.join(', ')}] -> ${res.reading} (exit ${res.exit}) (${wantReading === 'STOP' ? 'entirely below = FAIL' : 'overlap or exceed = no stop'})`);
    }
}

// =============================================================================================== CASE 7
header('CASE 7  the real empty-prose cases: s50l captured-high-r3 S1Q06, s50m captured-high-r2 S2Q06   (expected: wrong in the all-ids line, filterCodeFences, kept out of the gated clause)');
say('Both folders are scenario50 hours: every id is a "gated" id here (none is one of the five holdout follow-ups), so the kind alone keeps the record out of the gated clause.');
say('Run twice per folder: --answers-only (the stage and the empty-prose contribution), and full with the SAME family on both sides and --pre-cue (these hours predate cue mode; verdicts exist),');
say('where the all-ids wrong of the rep with the empty record must be its verdict-wrongs + 1 and its gated wrong must stay at its verdict-wrongs.');
for (const [dir, rep, id] of [[S50L, 3, 'S1Q06'], [S50M, 2, 'S2Q06']]) {
    begin();
    const a = cli([dir, '--answers-only']);
    has(`7 ${id} named`, a.out, `empty prose: ${id}  PIPELINE EVENT: emptied by filterCodeFences`);
    has(`7 ${id} all-ids contribution`, a.out, 'empty-prose wrong, all reps (verdict-wrongs not read): cue gated 0 / all 1');
    expect(`7 ${id} answers-only exit`, a.code, 0);
    const f = cli([dir, '--cue', HIGH, '--control', HIGH, '--pre-cue']);
    expect(`7 ${id} full exit`, f.code, 0);
    const lines = f.out.split('\n');
    const idx = lines.findIndex((l) => l.includes(`empty prose: ${id}`));
    const repLine = lines.slice(idx, idx + 3).find((l) => l.includes('acceptable')) ?? '';
    has(`7 ${id} rep ${rep}: counted wrong in the all-ids line`, repLine, 'wrong: gated 0, all ids 1');
    has(`7 ${id} rep ${rep}: kept out of the gated clause`, repLine, 'plus empty prose 0 gated / 1 all');
    done(`7  the real empty-prose record ${path.basename(dir).slice(-4)} captured-high-r${rep} ${id} -> counted wrong in the all-ids line (+1), named "PIPELINE EVENT: emptied by filterCodeFences" (the re-checker's replay-stages.mjs agrees: words after stripCueBlock, none after filterCodeFences), gated clause +0 (on a scenario50 hour every id is a gated id, so the kind alone keeps it out)`);
}

// =============================================================================================== CASE 8
header('CASE 8  synthetic, in memory: block-only twins on gated ids against a 0 / 0 / 0 control (control = h40c captured-high, real; cue = a copy with cues injected)');
say('Expected before the run (r4): two gated block-only twins -> STOP under the default (2 > 0 + 1); ONE -> named, no STOP under the default (1 <= 1), STOP under the strict');
say('alternative; both readings printed. Extra contrasts: two twins on EXCLUDED follow-ups -> all-ids line only, no STOP; the same ids with the strict flag governing.');
{
    const ctl = asControl(fam(H40C, HIGH));
    const ctlRes = await run(clone(ctl), clone(ctl), { preCue: true });
    expect('8 the control is 0 / 0 / 0 on the gated ids', ctlRes.sum3.control.map((s) => s.wrongGated), [0, 0, 0]);
    const mk = (spec) => { const c = clone(fam(H40C, HIGH)); injectCues(c); for (const [rep, id] of spec) toBlockOnly(c, rep, id); return c; };
    const probe = clone(fam(H40C, HIGH));
    const g1 = weakGated(probe, 1, 2), g2 = weakGated(probe, 2, 1);
    say(`  gated ids used: rep 1 ${g1.join(' ')}; rep 2 ${g2.join(' ')}`);

    say('  -- 8a: two gated block-only twins in ONE rep (rep 1)');
    begin();
    let res = await run(mk([[1, g1[0]], [1, g1[1]]]), clone(ctl)); show(res, [['cue', 1]]);
    expect('8a gated wrong per cue rep', res.defaultClause.cue, [2, 0, 0]);
    expect('8a default STOP (2 > 0 + 1)', [res.defaultClause.stop, res.reading, res.exit], [true, 'STOP', 1]);
    expect('8a strict also stops', res.strictClause.reps, [1]);
    done(`8a synthetic: two gated block-only twins in one cue rep against a 0/0/0 control -> ${res.reading} (exit ${res.exit}) under the default (cue gated wrong ${res.defaultClause.cue.join('/')} = 2 > 0 + 1); the strict alternative also stops`);

    say('  -- 8b: one gated block-only twin in each of two reps (rep 1 and rep 2)');
    begin();
    res = await run(mk([[1, g1[0]], [2, g2[0]]]), clone(ctl)); show(res, [['cue', 1], ['cue', 2]]);
    expect('8b gated wrong per cue rep', res.defaultClause.cue, [1, 1, 0]);
    expect('8b default STOP (2 > 0 + 1)', [res.defaultClause.stop, res.reading, res.exit], [true, 'STOP', 1]);
    done(`8b synthetic: one gated block-only twin in each of two cue reps against a 0/0/0 control -> ${res.reading} (exit ${res.exit}) under the default (cue gated wrong ${res.defaultClause.cue.join('/')} = 2 > 0 + 1)`);

    say('  -- 8c: ONE gated block-only twin (named in the rep line); default and strict both printed');
    begin();
    res = await run(mk([[1, g1[0]]]), clone(ctl)); show(res, [['cue', 1]]);
    expect('8c gated wrong per cue rep', res.defaultClause.cue, [1, 0, 0]);
    expect('8c default: no STOP (1 <= 0 + 1)', [res.defaultClause.stop, res.reading, res.exit], [false, 'PASS', 0]);
    expect('8c strict alternative: STOP in rep 1', res.strictClause.reps, [1]);
    has('8c the twin is named in the rep line', res.lines.join('\n'), `empty prose: ${g1[0]}  BLOCK-ONLY TWIN`);
    has('8c both readings are printed', res.lines.join('\n'), 'STRICT alternative (per rep): worst control rep 0; cue rep(s) above it: 1 -> STOP');
    const strictRes = await run(mk([[1, g1[0]]]), clone(ctl), { strict: true }); show(strictRes, []);
    expect('8c with --strict governing: STOP, exit 1', [strictRes.reading, strictRes.exit], ['STOP', 1]);
    done(`8c synthetic: ONE gated block-only twin -> named in the rep line; default ${res.reading} (exit ${res.exit}, 1 <= 0 + 1) AND strict alternative STOP (rep 1), both printed; with --strict governing -> ${strictRes.reading} (exit ${strictRes.exit})`);

    say('  -- 8d: two block-only twins on EXCLUDED follow-ups (R02F, R04F) in rep 1: all-ids line only');
    begin();
    const cx = clone(fam(H40C, HIGH)); injectCues(cx); toBlockOnly(cx, 1, 'R02F'); toBlockOnly(cx, 1, 'R04F');
    const base = await run((() => { const c = clone(fam(H40C, HIGH)); injectCues(c); return c; })(), clone(ctl));
    res = await run(cx, clone(ctl)); show(res, [['cue', 1]]);
    expect('8d gated wrong unchanged', res.defaultClause.cue, [0, 0, 0]);
    expect('8d all-ids wrong = baseline + 2', res.sum3.cue[0].wrongAll, base.sum3.cue[0].wrongAll + 2);
    expect('8d reading', res.reading, 'PASS');
    has('8d the label says why it is not gated', res.lines.join('\n'), 'on an excluded follow-up: all-ids line only');
    done(`8d (extra) two block-only twins on EXCLUDED follow-ups (R02F, R04F) -> all-ids wrong +2 (${base.sum3.cue[0].wrongAll} -> ${res.sum3.cue[0].wrongAll}), gated wrong unchanged (${res.defaultClause.cue.join('/')}), ${res.reading}`);
}

{
    say('  -- 8e: an empty prose record with NO cue block, emptied by filterVerbalLines (a dropped complexity line), on a gated id of cue rep 1 (r4 names no gated clause for it)');
    begin();
    const ctl = asControl(fam(H40C, HIGH));
    const cy = clone(fam(H40C, HIGH)); injectCues(cy);
    const [oid] = weakGated(clone(fam(H40C, HIGH)), 1, 1);
    const raw = 'Time: O(n)\nSpace: O(1)\n';
    Object.assign(cy.reps[0].store[oid], { spoken: '', raw, rawLen: raw.length, cues: [], words: 0, offers: [], finish: 'STOP' });
    delete cy.reps[0].judge.items[oid];
    const baseCy = clone(fam(H40C, HIGH)); injectCues(baseCy);
    const b = await run(baseCy, clone(ctl)), res8e = await run(cy, clone(ctl)); show(res8e, [['cue', 1]]);
    const e = res8e.sum3.cue[0].empties[0];
    expect('8e kind / stage / gated flag', [e.id, e.kind, e.stage, e.gated], [oid, 'other', 'filterVerbalLines', false]);
    expect('8e all-ids wrong = baseline + 1, gated wrong unchanged', [res8e.sum3.cue[0].wrongAll, res8e.sum3.cue[0].wrongGated], [b.sum3.cue[0].wrongAll + 1, b.sum3.cue[0].wrongGated]);
    expect('8e the absent block is in the cue check (43 of 44 present)', [res8e.sum3.cue[0].cue.present, res8e.sum3.cue[0].cue.n], [43, 44]);
    has('8e the label is rendered', res8e.lines.join('\n'), `empty prose: ${oid}  EMPTY PROSE, NO CUE BLOCK: emptied by filterVerbalLines`);
    done(`8e (extra) empty prose with no cue block, emptied by filterVerbalLines (${oid}) -> all-ids wrong +1, gated wrong +0, named "EMPTY PROSE, NO CUE BLOCK", an absent block in the cue check (43 of 44); r4 names no gated clause for this kind`);
}

// =============================================================================================== CASE 9
header('CASE 9  the real no-text record: the bench\'s cues-r1 S2Q06F (rawLen 0, MALFORMED_RESPONSE)   (expected: named no-text, wrong in the all-ids line, absent in the cue check, in neither side\'s gated clause)');
say('The same bench copy is given as BOTH sides so each side\'s gated clause is printed; --answers-only (no verdicts exist for these reps).');
{
    const r = cli([BENCH, '--answers-only', '--cue', BENCHFAM, '--control', BENCHFAM]);
    has('9 named as no-text with its finish reason', r.out, 'empty prose: S2Q06F  NO-TEXT RECORD: rawLen 0, finish MALFORMED_RESPONSE');
    has('9 cue side: wrong gated 0 / all 1', r.out, 'empty-prose wrong, all reps (verdict-wrongs not read): cue gated 0 / all 1; control gated 0 / all 1');
    has('9 absent in the cue check (38 of 39 present in that rep)', r.out, 'blocks present 38/39 (97.4%), shaped 38/39');
    has('9 not a hole', r.out, 'answered 38, true holes 0, empty prose 1');
    expect('9 exit', r.code, 0);
    // the contrast: the SAME record with text (rawLen > 0) and a block alone would be a block-only twin
    const f = fam(BENCH, BENCHFAM, false);
    const g = clone(f); toBlockOnly(g, 1, 'S2Q06F');
    const s = await A.summarizeRep({ chain, side: 'cue', rep: 1, file: g.reps[0].afile, store: g.reps[0].store, judge: null, mode: 'answers-only', excluded: EXCL });
    say(`  contrast (in memory): S2Q06F given rawLen > 0 and a block alone -> ${s.empties.map((e) => `${e.id}: ${e.kind}${e.stage ? '/' + e.stage : ''}${e.gated ? '/gated' : ''}`).join(', ')}; gated empty-prose wrong ${s.emptyWrongGated}`);
    expect('9 contrast: with text it WOULD enter the gated clause', [s.empties[0].kind, s.emptyWrongGated], ['block-only', 1]);
    done('9  the real no-text record (bench cues-r1 S2Q06F, rawLen 0, MALFORMED_RESPONSE; answers-only) -> named NO-TEXT RECORD with its finish reason; empty-prose wrong all-ids +1, gated 0 on the cue side and on the control side; cue check 38 of 39 present in that rep (an absent block, kept in n); not a hole. Contrast: the same record with text and a block alone is a gated block-only twin');
}

// ============================================================================================ CASE 9b / 9c
header("CASE 9b  the user's alternative of r4 section 12 item 6 (--notext-gated): the same real no-text record ALSO counts in the gated clause, on either side");
{
    const r = cli([BENCH, '--answers-only', '--cue', BENCHFAM, '--control', BENCHFAM, '--notext-gated']);
    has('9b the record is labelled as inside the gated clause', r.out, 'empty prose: S2Q06F  NO-TEXT RECORD: rawLen 0, finish MALFORMED_RESPONSE; counts wrong in the all-ids line, an absent block in the cue check, IN the gated clause');
    has('9b gated 1 / all 1 on both sides', r.out, 'empty-prose wrong, all reps (verdict-wrongs not read): cue gated 1 / all 1; control gated 1 / all 1');
    has('9b the header says which choice governs', r.out, 'no-text records: IN the gated clause on either side (--notext-gated)');
    expect('9b exit', r.code, 0);
    done('9b (alternative) --notext-gated on the same real record -> counted in the gated clause on both sides (cue gated 1 / all 1; control gated 1 / all 1), the choice named in the header; without the flag (case 9) it stays out');
}
header("CASE 9c  --notext-gated against r4 section 12 item 6's own description of its consequences (in memory; control = h40c captured-high, 0 / 0 / 0 gated wrong)");
say('r4: "ONE [no-text record] on a gated cue id STOPs under the strict per-rep clause when the control\'s worst rep is 0, and under the sums default it STOPs together with one more');
say('cue-side gated wrong when the control\'s total is 0". Expected before the run: (i) flag off, one no-text on a gated cue id: gated 0/0/0, PASS; (ii) flag on: 1/0/0, default no stop, strict STOP;');
say('(iii) flag on plus one block-only twin in another rep: 1/1/0 -> default STOP; (iv) flag on, no-text on an EXCLUDED follow-up: gated unchanged; (v) either side: a no-text on a gated CONTROL id');
say('(flag on) lifts the control total to 1, so two cue-side block-only twins (2 <= 1 + 1) no longer stop, where with the flag off they do (2 > 0 + 1).');
{
    const ctl = asControl(fam(H40C, HIGH));
    const probe = clone(fam(H40C, HIGH));
    const g1 = weakGated(probe, 1, 3), g2 = weakGated(probe, 2, 1);
    const toNoText = (f, rep, id) => { const r = f.reps[rep - 1]; Object.assign(r.store[id], { spoken: '', raw: '', rawLen: 0, cues: [], words: 0, offers: [], finish: 'MALFORMED_RESPONSE' }); if (r.judge) delete r.judge.items[id]; };
    const mk = (spec) => { const c = clone(fam(H40C, HIGH)); injectCues(c); for (const [kind, rep, id] of spec) (kind === 'notext' ? toNoText : toBlockOnly)(c, rep, id); return c; };
    const baseRes = await run(mk([]), clone(ctl));

    begin();
    let res = await run(mk([['notext', 1, g1[0]]]), clone(ctl));
    say(`  -- (i) one no-text record on gated cue id ${g1[0]} (rep 1), flag OFF`); show(res, [['cue', 1]]);
    expect('9c-i gated wrong per cue rep (flag off)', res.defaultClause.cue, [0, 0, 0]);
    expect('9c-i all-ids wrong +1', res.sum3.cue[0].wrongAll, baseRes.sum3.cue[0].wrongAll + 1);
    expect('9c-i reading', [res.reading, res.exit], ['PASS', 0]);
    done('9c-i one no-text record on a gated cue id, flag off -> gated wrong 0/0/0 (all-ids +1), PASS');

    begin();
    res = await run(mk([['notext', 1, g1[0]]]), clone(ctl), { notextGated: true });
    say('  -- (ii) the same record, flag ON'); show(res, [['cue', 1]]);
    expect('9c-ii gated wrong per cue rep (flag on)', res.defaultClause.cue, [1, 0, 0]);
    expect('9c-ii default: no STOP (1 <= 0 + 1)', [res.defaultClause.stop, res.reading, res.exit], [false, 'PASS', 0]);
    expect('9c-ii strict alternative stops in rep 1', res.strictClause.reps, [1]);
    const strictRes = await run(mk([['notext', 1, g1[0]]]), clone(ctl), { notextGated: true, strict: true });
    expect('9c-ii with --strict governing: STOP, exit 1', [strictRes.reading, strictRes.exit], ['STOP', 1]);
    done(`9c-ii the same record, --notext-gated -> gated 1/0/0: default ${res.reading} (1 <= 0 + 1), strict STOP in rep 1 (with --strict governing: ${strictRes.reading}, exit ${strictRes.exit}) = r4's description`);

    begin();
    res = await run(mk([['notext', 1, g1[0]], ['block', 2, g2[0]]]), clone(ctl), { notextGated: true });
    say(`  -- (iii) flag ON, plus one block-only twin on gated id ${g2[0]} in rep 2`); show(res, [['cue', 1], ['cue', 2]]);
    expect('9c-iii gated wrong per cue rep', res.defaultClause.cue, [1, 1, 0]);
    expect('9c-iii default STOP (2 > 0 + 1)', [res.defaultClause.stop, res.reading, res.exit], [true, 'STOP', 1]);
    done(`9c-iii --notext-gated plus one more cue-side gated wrong -> gated 1/1/0, default ${res.reading} (exit ${res.exit}, 2 > 0 + 1) = r4's description`);

    begin();
    res = await run(mk([['notext', 1, 'R02F']]), clone(ctl), { notextGated: true });
    say('  -- (iv) flag ON, the no-text record on the EXCLUDED follow-up R02F'); show(res, [['cue', 1]]);
    expect('9c-iv gated wrong unchanged', res.defaultClause.cue, [0, 0, 0]);
    expect('9c-iv all-ids wrong +1', res.sum3.cue[0].wrongAll, baseRes.sum3.cue[0].wrongAll + 1);
    done('9c-iv --notext-gated, no-text record on an excluded follow-up -> gated wrong unchanged 0/0/0 (all-ids +1)');

    begin();
    const ctlNT = asControl(fam(H40C, HIGH)); toNoText(ctlNT, 1, g1[2]);
    const twins = mk([['block', 1, g1[0]], ['block', 1, g1[1]]]);
    const off = await run(clone(twins), clone(ctlNT));
    const on = await run(clone(twins), clone(ctlNT), { notextGated: true });
    say(`  -- (v) either side: a no-text record on gated CONTROL id ${g1[2]} (rep 1) against two cue-side block-only twins; flag OFF then ON`);
    say('  flag off:'); show(off, [['control', 1]]); say('  flag on:'); show(on, [['control', 1]]);
    expect('9c-v flag off: control gated 0/0/0, cue 2/0/0 -> STOP (2 > 0 + 1)', [off.defaultClause.control, off.defaultClause.cue, off.reading], [[0, 0, 0], [2, 0, 0], 'STOP']);
    expect('9c-v flag on: control gated 1/0/0, cue 2/0/0 -> no STOP (2 <= 1 + 1)', [on.defaultClause.control, on.defaultClause.cue, on.reading], [[1, 0, 0], [2, 0, 0], 'PASS']);
    done('9c-v either side: a no-text record on a gated control id lifts the control total to 1 only under --notext-gated, so two cue-side block-only twins STOP with the flag off (2 > 0 + 1) and not with it on (2 <= 1 + 1)');
}

// ============================================================================================ extras
header('X1  independent cross-check: the adapter\'s thoughts / ttft p50 / p90 per rep against h40d-thoughts-noise.mjs on h40c');
{
    const t = spawnSync(process.execPath, [path.join(VH, 'h40d-thoughts-noise.mjs'), H40C, '--cue', HIGH, '--control', LOW], { encoding: 'utf8' });
    const rows = t.stdout.split('\n').filter((l) => /^\s+-r\d interview60\.answers\..*thoughts p50 \d+ p90 \d+; ttft p50 \d+ p90 \d+ ms/.test(l)).map((l) => l.match(/thoughts p50 (\d+) p90 (\d+); ttft p50 (\d+) p90 (\d+) ms/).slice(1).map(Number));
    const res = await run(fam(H40C, HIGH), fam(H40C, LOW), { preCue: true });
    const mine = [...res.sum3.cue, ...res.sum3.control].map((s) => [s.thoughts.p50, s.thoughts.p90, s.ttft.p50, s.ttft.p90]);
    say(`  h40d-thoughts-noise.mjs rows (cue r1-r3, control r1-r3): ${JSON.stringify(rows)}`);
    say(`  adapter rows                                           : ${JSON.stringify(mine)}`);
    expect('X1 six rows of four numbers equal', mine, rows);
    done('X1 (cross-check) thoughts and ttft p50/p90 per rep on h40c equal h40d-thoughts-noise.mjs\'s, all six reps');
}
header('X2  independent cross-check: acceptable / verdict-wrong counts against B-expected-counts.mjs (written before the adapter, no shared code), h40c and h40b');
for (const dir of [H40C, H40B]) {
    begin();
    const t = spawnSync(process.execPath, [path.join(HERE, 'B-expected-counts.mjs'), dir, HIGH, LOW], { encoding: 'utf8' });
    const rows = t.stdout.split('\n').filter((l) => /^(control|cue)\s+rep \d:/.test(l)).map((l) => { const m = l.match(/acceptable (\d+), verdict-wrong all (\d+) \[[^\]]*\], gated (\d+)/); return [Number(m[1]), Number(m[2]), Number(m[3])]; });
    const res = await run(fam(dir, HIGH), fam(dir, LOW), { preCue: true });
    const mine = [...res.sum3.control, ...res.sum3.cue].map((s) => [s.acceptable, s.verdictWrongAll, s.verdictWrongGated]);
    say(`  ${path.basename(dir).slice(-4)} independent [acceptable, wrong all, wrong gated] control r1-r3 then cue r1-r3: ${JSON.stringify(rows)}`);
    say(`  ${path.basename(dir).slice(-4)} adapter                                                                     : ${JSON.stringify(mine)}`);
    expect(`X2 ${path.basename(dir).slice(-4)} twelve counts equal`, mine, rows);
    done(`X2 (cross-check) ${path.basename(dir).slice(-4)}: acceptable / verdict-wrong (all, gated) per rep, both sides, equal the independent tally written before the adapter (B-expected-counts.mjs, no shared code)`);
}
header('X3  independent cross-check: the stage that empties the two real records, against the re-checker\'s replay-stages.mjs');
{
    const t = spawnSync(process.execPath, [path.join(VH, 'recheck-scratch', 'replay-stages.mjs')], { encoding: 'utf8' });
    for (const l of t.stdout.split('\n').filter(Boolean)) say(`  | ${l.replace(/\r/g, '')}`);
    const ok = t.stdout.split('\n').filter((l) => l.includes('after stripCueBlock')).every((l) => /after stripCueBlock [1-9]\d*, filterCodeFences 0,/.test(l));
    expect('X3 both records still have words after stripCueBlock and none after filterCodeFences', ok, true);
    done('X3 (cross-check) the stage the adapter names for the two real empties (filterCodeFences) is the one the re-checker\'s replay-stages.mjs finds (words after stripCueBlock, none after filterCodeFences)');
}

header('X4  the stage table: synthetic raw texts through the SHIPPED chain, each classified (decided before the run)');
{
    const FENCE = '```python\nprint(1)\n```\n';
    const OFFERS = '__MORE__\n1| offer one\n2| offer two\n';
    const rows = [
        ['a  cue block alone', BLOCK_RAW, BLOCK_CUES, 'block-only', 'stripCueBlock', true],
        ['b  cue block + offers block, no prose', BLOCK_RAW + OFFERS, BLOCK_CUES, 'block-only', 'stripSuggestionBlock', true],
        ['c  cue block + a fenced answer', BLOCK_RAW + FENCE, BLOCK_CUES, 'pipeline', 'filterCodeFences', false],
        ['d  fenced answer, no block', FENCE, [], 'pipeline', 'filterCodeFences', false],
        ['e  a dropped complexity line, no block', 'Time: O(n)\nSpace: O(1)\n', [], 'other', 'filterVerbalLines', false],
        ['f  cue block + a dropped complexity line', BLOCK_RAW + 'Time: O(n)\n', BLOCK_CUES, 'block-only', 'filterVerbalLines', true],
    ];
    for (const [name, raw, cues, kind, stage, gated] of rows) {
        const rec = { id: 'X01', model: 'x', spoken: '', raw, rawLen: raw.length, cues, finish: 'STOP' };
        const s = await A.summarizeRep({ chain, side: 'cue', rep: 1, file: 'synthetic.json', store: { X01: rec }, judge: null, mode: 'answers-only', excluded: EXCL });
        const e = s.empties[0];
        say(`  ${name.padEnd(42)} -> ${e.kind}${e.stage ? ' / ' + e.stage : ''}${e.gated ? ' / gated clause' : ' / all-ids line only'}`);
        expect(`X4 ${name.trim().slice(0, 1)} kind / stage / gated`, [e.kind, e.stage, e.gated], [kind, stage, gated]);
    }
    const nt = { id: 'X01', model: 'x', spoken: '', raw: '', rawLen: 0, cues: [], finish: 'MALFORMED_RESPONSE' };
    const s = await A.summarizeRep({ chain, side: 'cue', rep: 1, file: 'synthetic.json', store: { X01: nt }, judge: null, mode: 'answers-only', excluded: EXCL });
    expect('X4 g  rawLen 0 -> no-text, finish named, not gated', [s.empties[0].kind, s.empties[0].finish, s.empties[0].gated], ['no-text', 'MALFORMED_RESPONSE', false]);
    for (const [name, rec, why] of [
        ['h  stored prose empty but the chain leaves words of the raw', { id: 'X01', model: 'x', spoken: '', raw: 'A plain spoken answer sentence.', rawLen: 31, cues: [], finish: 'STOP' }, 'leaves words'],
        ['i  recorded cues differ from the replayed block', { id: 'X01', model: 'x', spoken: '', raw: BLOCK_RAW, rawLen: BLOCK_RAW.length, cues: ['other words'], finish: 'STOP' }, 'differs from the recorded cues'],
        ['j  empty prose with neither rawLen nor raw', { id: 'X01', model: 'x', spoken: '', finish: 'STOP', cues: [] }, 'neither rawLen nor raw'],
    ]) {
        let msg = null;
        try { await A.summarizeRep({ chain, side: 'cue', rep: 1, file: 'synthetic.json', store: { X01: rec }, judge: null, mode: 'answers-only', excluded: EXCL }); } catch (e) { msg = e instanceof A.Refusal ? e.message : `NOT A REFUSAL: ${e.message}`; }
        say(`  ${name.padEnd(62)} -> ${msg ? 'REFUSED: ' + shorten(msg) : 'NOT REFUSED'}`);
        expect(`X4 ${name.trim().slice(0, 1)} refused`, !!msg && msg.includes(why), true);
    }
    done('X4 (extra) the stage table through the shipped chain: cue block alone -> block-only (stripCueBlock); cue block + offers block -> block-only (stripSuggestionBlock); cue block + fenced answer and a bare fenced answer -> pipeline (filterCodeFences, never gated even with cues present); a dropped complexity line with no block -> other (filterVerbalLines, all-ids only); with a block -> block-only (filterVerbalLines); rawLen 0 -> no-text; three inconsistent records refused');
}

header('X5  boundary refusals and INCOMPLETE paths (each must refuse or stop reading; in memory)');
{
    const ctl = fam(H40C, LOW);
    const mkCue = () => { const c = clone(fam(H40C, HIGH)); injectCues(c); return c; };
    const attempt = async (name, build, want) => {
        let out;
        try { const res = await build(); out = `${res.reading} (exit ${res.exit})${res.incomplete?.length ? ': ' + shorten(res.incomplete.join('; ')).slice(0, 200) : ''}`; }
        catch (e) { out = e instanceof A.Refusal ? `REFUSED: ${shorten(e.message).slice(0, 220)}` : `NOT A REFUSAL: ${e.message}`; }
        say(`  ${name.padEnd(66)} -> ${out}`);
        expect(`X5 ${name.slice(0, 2)} ${name.slice(3, 40).trim()}`, out.startsWith(want), true);
    };
    await attempt('a  --pre-cue on a family that carries cue blocks', () => run(mkCue(), clone(ctl), { preCue: true }), 'REFUSED');
    await attempt('b  judge file of rep 2 handed to rep 1 (another answers file)', () => { const c = mkCue(); c.reps[0].judge = clone(c.reps[1].judge); return run(c, clone(ctl)); }, 'REFUSED');
    await attempt('c  a verdict that is not verdictOf of its own scores', () => { const c = mkCue(); const it = Object.values(c.reps[0].judge.items).find((x) => x.verdict === 'acceptable'); it.correctness = 0; return run(c, clone(ctl)); }, 'REFUSED');
    await attempt('d  an id missing from one rep (and its graded item)', () => { const c = mkCue(); const id = Object.keys(c.reps[1].store)[3]; delete c.reps[1].store[id]; delete c.reps[1].judge.items[id]; return run(c, clone(ctl)); }, 'REFUSED');
    // (the id stays in every file's id set, so the id-set guard of (d) cannot be what catches this: only the stale graded item does)
    await attempt('e  a graded id the answers file holds only as a hole (stale judge file)', () => { const c = mkCue(); const id = Object.keys(c.reps[0].store)[3]; const rec = c.reps[0].store[id]; c.reps[0].store[id] = { id, model: rec.model, transientError: 'HTTP 503' }; return run(c, clone(ctl)); }, 'REFUSED');
    await attempt('f  one judge file missing', () => { const c = mkCue(); c.reps[2].judge = null; return run(c, clone(ctl)); }, 'INCOMPLETE');
    await attempt('g  an ungraded (error) verdict', () => { const c = mkCue(); const it = Object.values(c.reps[0].judge.items)[0]; it.verdict = 'error'; return run(c, clone(ctl)); }, 'INCOMPLETE');
    await attempt('h  a whole answers file missing', () => { const c = mkCue(); c.reps[1].store = null; return run(c, clone(ctl)); }, 'INCOMPLETE');
    await attempt('i  --pre-cue and --answers-only together', () => run(mkCue(), clone(ctl), { preCue: true, answersOnly: true }), 'REFUSED');
    // (k) a family set against itself reads clean whatever it holds: refused for the h40d reading, allowed for the calibration modes (case 7, case 9)
    await attempt('k  the cue and the control family are the same one (h40d reading)', () => { const c = mkCue(); return run(c, clone(c)); }, 'REFUSED');
    // (j) graders: a cue-against-no-cue band read across two graders is confounded, so a mixed set is flagged on its own line
    const mixed = mkCue(); mixed.reps[1].judge.graderModel = 'claude-opus-5';
    const rm = await run(mixed, clone(ctl));
    say(`  j  one cue judge file merged by another grader model -> ${rm.lines.filter((l) => l.startsWith('graders')).map((l) => l.slice(0, 200)).join(' ')}`);
    has('X5 j GRADER MIXED is flagged', rm.lines.join('\n'), 'GRADER MIXED');
    const ru = await run(mkCue(), clone(ctl));
    expect('X5 j2 no flag when every judge file has the one grader', ru.lines.join('\n').includes('GRADER MIXED'), false);
    done('X5 (extra) boundary guards: --pre-cue on a cue family, a swapped judge file, a verdict that is not verdictOf of its scores, an id missing from one rep, a stale graded item for a hole, the same family as cue and control -> each REFUSED; a missing judge file, an ungraded verdict, a missing answers file -> INCOMPLETE; mixed graders flagged');
}

header('X6  CLI misuse and the wrong build (each must refuse or stop reading)');
{
    let r = cli([H40C, '--control', LOW]);
    has('X6a a cue-hour reading on a pre-cue family is refused', r.err, 'carry no cues array'); expect('X6a exit', r.code, 2);
    // X6b: a build without stripCueBlock cannot name the stage that emptied a record. A stand-in root that lacks it is ALWAYS tried (this
    // runner must read the same before and after today's merge); MAIN's own dist is the real example only while it is still pre-merge.
    const stubRoot = (name, filterSrc) => {
        const root = path.join(HERE, 'fake-inputs', name), llm = path.join(root, 'dist-electron', 'electron', 'llm');
        fs.mkdirSync(llm, { recursive: true });
        fs.writeFileSync(path.join(root, 'package.json'), '{}\n');
        fs.writeFileSync(path.join(llm, 'verbalStreamFilter.js'), filterSrc);
        fs.writeFileSync(path.join(llm, 'prompts.js'), "module.exports = { CUE_MAX_LINES: 3, CUE_MAX_WORDS: 5, CUE_RULE: 'a stand-in rule' };\n");
        return root;
    };
    const noStage = stubRoot('dist-no-cue-stage', 'module.exports = { filterCodeFences() {}, filterVerbalLines() {}, stripSuggestionBlock() {}, stripSpokenNotation() {} };\n');
    r = cli([H40C, '--control', LOW, '--pre-cue', '--dist', noStage]);
    has('X6b a dist without stripCueBlock is refused', r.err, 'has no stripCueBlock'); expect('X6b exit', r.code, 2);
    const hasCueStage = (root) => { try { return fs.readFileSync(path.join(root, 'dist-electron', 'electron', 'llm', 'verbalStreamFilter.js'), 'utf8').includes('stripCueBlock'); } catch { return false; } };
    if (!hasCueStage(MAIN)) {
        r = cli([H40C, '--control', LOW, '--pre-cue', '--dist', MAIN]);
        has('X6b2 MAIN\'s own pre-merge dist (no stripCueBlock) is refused', r.err, 'has no stripCueBlock'); expect('X6b2 exit', r.code, 2);
    } else say('  X6b2 skipped: MAIN\'s dist already holds stripCueBlock (merged and rebuilt); the stand-in root above carries the refusal check');
    r = cli([H40C, '--control', LOW, '--prcue']);
    has('X6c an unknown option is refused', r.err, 'unknown option --prcue'); expect('X6c exit', r.code, 2);
    r = cli([H40C, '--pre-cue', '--answers-only']);
    has('X6d the exclusive flags are refused', r.err, 'exclusive'); expect('X6d exit', r.code, 2);
    r = cli([path.join(RUNS, 'no-such-run')]);
    has('X6e a missing folder is refused', r.err, 'does not exist'); expect('X6e exit', r.code, 2);
    r = cli([BENCH, '--cue', BENCHFAM]);
    has('X6f the bench folder has no judge files and no control: INCOMPLETE, not a silent pass', r.out, 'rule 3c reading: INCOMPLETE (files missing:'); expect('X6f exit', r.code, 3);
    // X6g: the positive --dist path. An explicit root must read exactly as the default does (case 1's numbers). The worktree is always tried;
    // MAIN is tried once its dist holds the cue build (after today's merge + rebuild), so this runner is re-run on Friday morning to cover it.
    for (const [name, root] of [['the worktree', WT], ['MAIN', MAIN]]) {
        if (!hasCueStage(root)) { say(`  X6g --dist ${name}: skipped, its dist holds no stripCueBlock yet (MAIN before the merge + rebuild): run this runner again after it`); continue; }
        r = cli([H40C, '--control', LOW, '--pre-cue', '--dist', root]);
        has(`X6g --dist ${name}: the same band line as the default`, r.out, 'control [36, 37] (reps 37 / 37 / 36)  cue [36, 38] (reps 36 / 37 / 38)  -> OVERLAP');
        has(`X6g --dist ${name}: the same reading as the default`, r.out, 'rule 3c reading: PASS  [PRE-CUE KNOWN CASE'); expect(`X6g --dist ${name} exit`, r.code, 0);
        say(`  X6g --dist ${name}: ${(r.out.split('\n').find((l) => l.includes('verbalStreamFilter.js sha256/16')) ?? '(no sha line)').trim()}`);
    }
    done('X6 (extra) CLI: a cue-hour reading of a pre-cue family, a dist without stripCueBlock (a stand-in root; MAIN\'s own pre-merge dist too while MAIN is pre-merge), an unknown option, exclusive flags, a missing folder -> each REFUSED (exit 2); the bench folder in full mode (no verdict files) -> INCOMPLETE (exit 3), never a silent pass; --dist given explicitly (the worktree; MAIN once merged) reads as the default does');
}

header('X7  the instrument refuses a build or a file it cannot trust (fake dist roots and malformed files in <VH>\\instruments\\fake-inputs\\, obviously synthetic, never a run folder)');
{
    const FAKE = path.join(HERE, 'fake-inputs');
    const stubFilter = 'module.exports = { stripCueBlock() {}, filterCodeFences() {}, filterVerbalLines() {}, stripSuggestionBlock() {}, stripSpokenNotation() {} };\n';
    const mkRoot = (name, prompts) => {
        const root = path.join(FAKE, name), llm = path.join(root, 'dist-electron', 'electron', 'llm');
        fs.mkdirSync(llm, { recursive: true });
        fs.writeFileSync(path.join(root, 'package.json'), '{}\n');
        fs.writeFileSync(path.join(llm, 'verbalStreamFilter.js'), stubFilter);
        fs.writeFileSync(path.join(llm, 'prompts.js'), prompts);
        return root;
    };
    const limits = mkRoot('dist-limits-4x5', "module.exports = { CUE_MAX_LINES: 4, CUE_MAX_WORDS: 5, CUE_RULE: 'a stand-in rule' };\n");
    const rule = mkRoot('dist-other-rule', "module.exports = { CUE_MAX_LINES: 3, CUE_MAX_WORDS: 5, CUE_RULE: 'a different rule text' };\n");
    let r = cli([H40C, '--control', LOW, '--pre-cue', '--dist', limits]);
    has('X7a a dist with other cue limits is refused, by its limits', r.err, 'has cue limits 4 x 5; r4 registers 3 x 5'); expect('X7a exit', r.code, 2);
    r = cli([H40C, '--control', LOW, '--pre-cue', '--dist', rule]);
    has('X7b a dist with the right limits but another CUE_RULE is refused, by its rule', r.err, 'r4 registers 8e15e4e7dd41'); expect('X7b exit', r.code, 2);
    const BAD = path.join(HERE, 'fake-inputs', 'bad-files');
    fs.mkdirSync(BAD, { recursive: true });
    fs.writeFileSync(path.join(BAD, 'interview60.answers.bad-json.json'), '{not json, SECRET-MARKER-TEXT');
    fs.writeFileSync(path.join(BAD, 'interview60.answers.bad-key.json'), JSON.stringify({ R01: { id: 'R02', spoken: 'x' } }));
    r = cli([BAD, '--answers-only', '--cue', 'bad-json']);
    has('X7c invalid JSON is refused', r.err, 'not valid JSON'); expect('X7c exit', r.code, 2);
    expect('X7c the refusal does not echo any file content', r.text.includes('SECRET-MARKER-TEXT'), false);
    r = cli([BAD, '--answers-only', '--cue', 'bad-key']);
    has('X7d an entry whose id is not its key is refused', r.err, 'the entry keyed R01 does not carry that id'); expect('X7d exit', r.code, 2);
    done('X7 (extra) a dist with other cue limits, a dist with another CUE_RULE, an answers file that is not valid JSON (no content echoed), an entry whose id is not its key -> each REFUSED (exit 2)');
}

header('X8  the default family names resolve to the six arm file names of r4 section 2 (typed here from r4, not from the adapter)');
{
    const want = (tag) => [['', ''], ['-r2', '-r2'], ['-r3', '-r3']].map(([a]) => [`interview60.answers.gemini-3.5-flash-lite_${tag}${a}.json`, `interview60.judge.gemini-3.5-flash-lite_${tag}${a}.json`]);
    const got = (family) => A.loadFamily(HERE, family, true).reps.map((r) => [path.basename(r.afile), path.basename(r.jfile)]);
    expect('X8 cue twins: captured-high, -r2, -r3 (answers and judge file names)', got(A.DEFAULT_FAMILIES.cue), want('captured-high'));
    expect('X8 no-cue twins: captured-no-cues-high, -r2, -r3 (answers and judge file names)', got(A.DEFAULT_FAMILIES.control), want('captured-no-cues-high'));
    done('X8 (extra) the default cue family resolves to captured-high{,-r2,-r3} and the default control to captured-no-cues-high{,-r2,-r3}, answers and judge file names, as r4 section 2 names the arms');
}

say('');
say('='.repeat(110));
say('CASE -> READING (each line is OK only if every assertion of its case passed)');
say('='.repeat(110));
for (const l of ledger) say(l);
say('');
say('='.repeat(110));
say(`SUMMARY: ${asserts} assertions, ${asserts - fails} OK, ${fails} FAIL${fails ? '  -> ' + failed.join(' | ') : ''}`);
fs.writeFileSync(outFile, OUT.join('\n') + '\n', 'utf8');
console.log(`written ${outFile}`);
process.exit(fails ? 1 : 0);
