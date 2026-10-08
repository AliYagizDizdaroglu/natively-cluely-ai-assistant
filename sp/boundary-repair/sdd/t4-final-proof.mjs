// Task 4 final fix round (throwaway): the two mutant calibrations of the dispatch, on MIRROR trees (MAIN only READ; no mutant ever in MAIN).
//   Part A (E1) the adapter's clock: the real adapter and a mutant that passes a constant 0 as atMs (the 5 s window then never closes),
//               against the CURRENT adapter test file (10 tests) and the NEW one (11). Reproduces the reviewer's fr-t4-cal.out.txt.
//   Part B (E3) the Task 5 extractor test: the real extractor and single-edit mutants M1-M4, against the CURRENT test file and the NEW one.
//               Reproduces fr-t5-cal.out.txt.
// Also proves that the two edited test files are byte-identical to the files the reviewer's scripts (fr-t4-cal.mjs / fr-t5-cal.mjs) build.
//   node t4-final-proof.mjs            NEW side = the STAGE (before anything is copied into MAIN)
//   node t4-final-proof.mjs --from main  NEW side = MAIN (the final state)
import { makeMirror, rdMain, rdStage, rdR2, sub, sha16 } from './t4-final-lib.mjs';
const fromMain = process.argv.includes('--from') && process.argv[process.argv.indexOf('--from') + 1] === 'main';
const rdNew = (rel) => (fromMain ? rdMain(rel) : rdStage(rel));
const A = 'electron/audio/', G = 'electron/test/golden/';
const T4_TEST = A + 'DeepgramStreamingSTT.boundaryRepair.test.ts', T4_ADP = A + 'DeepgramStreamingSTT.ts';
const T5_TEST = G + 'interview60.turns-finals.test.ts', T5_MOD = G + 'interview60.turns-finals.mjs';
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok      ' : 'PROBLEM '} ${msg}`); };
console.log(`NEW side = ${fromMain ? 'MAIN' : 'STAGE'}`);

// ---------------------------------------------------------------- Part A
const t4Cur = rdR2('DeepgramStreamingSTT.boundaryRepair.test.ts').toString('utf8');
const t4New = rdNew(T4_TEST).toString('utf8');
const adp = rdNew(T4_ADP).toString('utf8');
// the reviewer's proposal (fr-t4-cal.mjs, verbatim logic): the new test inserted right before the Indonesian comment, plus the wording nit
const ANCHOR = "        // Indonesian is written in plain ASCII, so the module's own non-ASCII guard does not refuse it: the rule ALONE";
const NEW_TEST = [
    "        it('the 5 s window runs on the arrival clock: F2 5001 ms after F1 is emitted as received, no repair line', () => {",
    '            const { stt, seen } = start();',
    '            playSeam(() => vi.advanceTimersByTime(5001 - (F2.atMs - F1.atMs)));   // F1 -> F2 = 5001 ms, one past the window',
    '            stt.stop();',
    '            expect(seen).toEqual(unchanged);',
    '            expect(repairs()).toEqual([]);',
    '        });',
    '',
    '',
].join('\n');
const NIT_OLD = 'The restart test above covers stop() + start(); this covers the other way a socket is replaced:';
const NIT_NEW = 'The restart test above covers stop() + start(); this covers another way a socket is replaced:';
const t4Reviewer = sub(sub(t4Cur, ANCHOR, NEW_TEST + ANCHOR), NIT_OLD, NIT_NEW);
check(t4New === t4Reviewer, `the adapter test file (${t4New.length} chars, ${sha16(t4New)}) is byte-identical to the file fr-t4-cal.mjs proposes (${t4Reviewer.length} chars, ${sha16(t4Reviewer)})`);
const CALL = 'boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true)';
const ADAPTERS = { A0_real: adp, A1_clock_constant_0: sub(adp, CALL, 'boundaryRepair?.onTranscript(transcript, isFinal, 0, data.speech_final === true)') };
const NEWNAME = 'the 5 s window runs on the arrival clock';
const EXPECT_A = {
    'CURRENT|A0_real': { total: 10, failed: [] },
    'CURRENT|A1_clock_constant_0': { total: 10, failed: [] },           // the gap: 10/10 passes with the clock stuck at 0
    'NEW|A0_real': { total: 11, failed: [] },
    'NEW|A1_clock_constant_0': { total: 11, failed: [NEWNAME] },        // 10/11: ONLY the new test
};
const mA = makeMirror('t4-mirror-final-a');
try {
    for (const rel of [A + 'deepgramBoundaryRepair.ts']) mA.put(rel, rdNew(rel));
    for (const rel of [A + 'deepgramKeyterms.ts', A + 'deepgramBoundaryRepair.fixtures.json', 'electron/config/languages.ts']) mA.put(rel, rdMain(rel));
    console.log('\nPart A: the adapter test file against the real adapter and the clock-stuck-at-0 mutant');
    for (const [tname, ttext] of [['CURRENT', t4Cur], ['NEW', t4New]]) {
        for (const [aname, atext] of Object.entries(ADAPTERS)) {
            mA.put(T4_TEST, ttext); mA.put(T4_ADP, atext);
            const r = mA.runJson(T4_TEST);
            const passed = r.results.filter((x) => x.status === 'passed').length;
            const failed = r.results.filter((x) => x.status !== 'passed').map((x) => x.title);
            const want = EXPECT_A[`${tname}|${aname}`];
            const ok = r.results.length === want.total && failed.length === want.failed.length && failed.every((f) => want.failed.some((w) => f.includes(w)));
            if (!ok) bad++;
            console.log(`[${ok ? 'as expected' : 'UNEXPECTED'}] ${tname.padEnd(7)} ${aname.padEnd(20)} exit ${r.status}  ${passed}/${r.results.length} passed${failed.length ? '  NOT PASSED: ' + failed.map((f) => f.slice(0, 60)).join(' | ') : ''}`);
            if (failed.length) r.results.filter((x) => x.status !== 'passed').forEach((x) => console.log(`             ${x.msg.slice(0, 150)}`));
            if (!r.results.length) console.log('   raw: ' + r.raw);
        }
    }
} finally { console.log(mA.dispose()); }

// ---------------------------------------------------------------- Part B
const t5Cur = rdR2('interview60.turns-finals.test.ts').toString('utf8');
const t5New = rdNew(T5_TEST).toString('utf8');
const mod = rdMain(T5_MOD).toString('utf8');
// the reviewer's proposal (fr-t5-cal.mjs, verbatim logic)
const T3_OLD = "        const [, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, rep, rep].join('\\n'), 0)).toThrow(";
const T3_NEW = "        const [iv, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, iv, rep].join('\\n'), 0)).toThrow(";
const T2_OLD = "it('keeps interims and empty finals out, and drops finals before `since`', () => {";
const T2_NEW = "it('keeps interims and empty finals out, drops finals before `since` and keeps a final exactly at it', () => {";
const t5Reviewer = sub(sub(t5Cur, T3_OLD, T3_NEW), T2_OLD, T2_NEW);
check(t5New === t5Reviewer, `the extractor test file (${t5New.length} chars, ${sha16(t5New)}) is byte-identical to the file fr-t5-cal.mjs proposes (${t5Reviewer.length} chars, ${sha16(t5Reviewer)})`);
const MUT = {
    M0_real: mod,
    M1_refuse_only_repair_under_repair: sub(mod, "!FINAL.test(lines[i - 1] ?? '')", "REPAIR.test(lines[i - 1] ?? '')"),
    M2_orphan_throw_removed: sub(mod, "if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw", 'if (false) throw'),
    M3_wrong_final_throw_removed: sub(mod, 'if (rep && !lines[i + 1].includes(', 'if (false && !lines[i + 1].includes('),
    M4_gt_instead_of_ge: sub(mod, 'at >= sinceMs', 'at > sinceMs'),
};
// T1 T2 T3 + the two parity tests (they skip in the mirror: interview60.runs/ is gitignored and absent there)
const EXPECT_B = {
    'CURRENT|M0_real': 'PPPSS', 'CURRENT|M1_refuse_only_repair_under_repair': 'PPPSS', 'CURRENT|M2_orphan_throw_removed': 'PPFSS', 'CURRENT|M3_wrong_final_throw_removed': 'PPFSS', 'CURRENT|M4_gt_instead_of_ge': 'PFPSS',
    'NEW|M0_real': 'PPPSS', 'NEW|M1_refuse_only_repair_under_repair': 'PPFSS', 'NEW|M2_orphan_throw_removed': 'PPFSS', 'NEW|M3_wrong_final_throw_removed': 'PPFSS', 'NEW|M4_gt_instead_of_ge': 'PFPSS',
};
const mB = makeMirror('t4-mirror-final-b');
try {
    console.log('\nPart B: the extractor test file against the real extractor and single-edit mutants (S = skipped: no interview60.runs/ in the mirror)');
    for (const [tname, ttext] of [['CURRENT', t5Cur], ['NEW', t5New]]) {
        for (const [mname, mtext] of Object.entries(MUT)) {
            mB.put(T5_TEST, ttext); mB.put(T5_MOD, mtext);
            const r = mB.runJson(T5_TEST);
            const sum = r.results.map((x) => x.status[0].toUpperCase()).join('');
            const failed = r.results.filter((x) => x.status === 'failed');
            const ok = sum === EXPECT_B[`${tname}|${mname}`];
            if (!ok) bad++;
            console.log(`[${ok ? 'as expected' : 'UNEXPECTED'}] ${tname.padEnd(7)} ${mname.padEnd(42)} exit ${r.status}  [${sum}]  ${failed.length ? 'FAILED: ' + failed.map((x) => x.title.slice(0, 58)).join(' | ') : 'no failure'}`);
            if (!r.results.length) console.log('   raw: ' + r.raw);
        }
    }
} finally { console.log(mB.dispose()); }
console.log(bad ? `\n${bad} problem(s)` : '\nall calibration rows as expected');
process.exit(bad ? 1 : 0);
