// Final review (throwaway): calibrate the two parked Task 5 test edits (T3's orphan case, T2's name) against the real extractor
// and single-edit mutants, in a mirror (no interview60.runs/: the two parity tests skip). MAIN is only read.
//   node fr-t5-cal.mjs
import { makeMirror, rdMain } from './fr-mirror.mjs';
const G = 'electron/test/golden/';
const TEST = G + 'interview60.turns-finals.test.ts', MOD = G + 'interview60.turns-finals.mjs';
const test0 = rdMain(TEST).toString('utf8'), mod0 = rdMain(MOD).toString('utf8');
const sub = (s, a, b) => { if (s.split(a).length !== 2) throw new Error(`expected exactly one occurrence of: ${a}`); return s.replace(a, b); };

// The proposed test edits (the ledger's T3 code verbatim; T2 renamed).
const T3_OLD = "        const [, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, rep, rep].join('\\n'), 0)).toThrow(";
const T3_NEW = "        const [iv, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, iv, rep].join('\\n'), 0)).toThrow(";
const T2_OLD = "it('keeps interims and empty finals out, and drops finals before `since`', () => {";
const T2_NEW = "it('keeps interims and empty finals out, drops finals before `since` and keeps a final exactly at it', () => {";
const testP = sub(sub(test0, T3_OLD, T3_NEW), T2_OLD, T2_NEW);

const MUT = {
    M0_real: mod0,
    M1_refuse_only_repair_under_repair: sub(mod0, "!FINAL.test(lines[i - 1] ?? '')", "REPAIR.test(lines[i - 1] ?? '')"),
    M2_orphan_throw_removed: sub(mod0, "if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw", "if (false) throw"),
    M3_wrong_final_throw_removed: sub(mod0, "if (rep && !lines[i + 1].includes(", "if (false && !lines[i + 1].includes("),
    M4_gt_instead_of_ge: sub(mod0, 'at >= sinceMs', 'at > sinceMs'),
};
const mirror = makeMirror('fr-m-t5');
try {
    for (const [tname, ttext] of [['CURRENT', test0], ['PROPOSED', testP]]) {
        for (const [mname, mtext] of Object.entries(MUT)) {
            mirror.put(TEST, ttext);
            mirror.put(MOD, mtext);
            const r = mirror.runJson(TEST);
            const sum = r.results.map((x) => `${x.status[0].toUpperCase()}`).join('');
            const failed = r.results.filter((x) => x.status === 'failed').map((x) => `${x.title.slice(0, 60)} :: ${x.msg.slice(0, 120)}`);
            console.log(`${tname.padEnd(8)} ${mname.padEnd(36)} exit ${r.status}  [${sum}]  ${failed.length ? 'FAILED: ' + failed.join(' | ') : 'no failure'}`);
            if (!r.results.length) console.log('   raw: ' + r.raw);
        }
    }
} finally {
    console.log(mirror.dispose());
}
