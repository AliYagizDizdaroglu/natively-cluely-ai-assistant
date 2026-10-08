// Re-review probe (throwaway): can the fixture calibration FAIL? Builds COPIES of score-cal.mjs (and of
// score-blind.mjs, mutated) under rr-task4-fix1/, each edited by exact single-match replacement, and runs
// them. The deliverables are only read. Fixture copies: fx-full (complete), fx-a (tier 2 rep 3 missing).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix1`;
const CAL_SRC = fs.readFileSync(`${SP}/flash-h40b-score-cal.mjs`, 'utf8');
const SCORE_SRC = fs.readFileSync(`${SP}/flash-h40b-score-blind.mjs`, 'utf8');
const rep1 = (t, from, to) => { const n = t.split(from).length - 1; if (n !== 1) throw new Error(`expected 1 match, found ${n}: ${from.slice(0, 70)}`); return t.replace(from, () => to); };

function scorerCopy(name, from, to) {
    const f = `${HERE}/score-blind.${name}.mjs`;
    fs.writeFileSync(f, from ? rep1(SCORE_SRC, from, to) : SCORE_SRC);
    return f;
}
function calCopy(name, fixture, scorerPath) {
    let t = rep1(CAL_SRC, "const FIX_RUN = `${SP}/flash-h40b-fixture/run`, FIX_FLASH = `${SP}/flash-h40b-fixture/flash`;", `const FIX_RUN = '${HERE}/${fixture}/run', FIX_FLASH = '${HERE}/${fixture}/flash';`);
    t = rep1(t, "[`${SP}/flash-h40b-score-blind.mjs`]", `['${scorerPath}']`);
    const f = `${HERE}/score-cal.${name}.mjs`;
    fs.writeFileSync(f, t);
    return f;
}
const run = (label, calPath, expect) => {
    const r = spawnSync(process.execPath, [calPath], { encoding: 'utf8' });
    const last = r.stdout.trim().split('\n').filter((l) => /^(case|CALIBRATION)/.test(l));
    const verdict = /CALIBRATION OK/.test(r.stdout) ? 'OK' : /CALIBRATION FAILED/.test(r.stdout) ? 'FAILED' : `CRASH (exit ${r.status}) ${r.stderr.split('\n').find((l) => /Error/.test(l)) ?? ''}`;
    const hits = (r.stdout.match(/on tier \d+b?: \d+\/\d+ acceptable|3\.1 LOW \d+\/\d+, 3\.5 HIGH \d+\/\d+/g) ?? []).slice(0, 5);
    console.log(`${verdict === expect ? 'as expected' : 'UNEXPECTED '}  ${label}: ${verdict} (exit ${r.status}; expected ${expect})  ${last.filter((l) => /^case/.test(l)).join(' | ')}${hits.length ? `  first printed totals: ${hits.join('; ')}` : ''}`);
};

const plain = scorerCopy('plain', null);
run('control: unmodified scorer copy, complete fixture copy fx-full', calCopy('control', 'fx-full', plain), 'OK');
run('wrong fixture: fx-a (tier 2 rep 3 file deleted, pairs rebuilt)', calCopy('holed', 'fx-a', plain), 'FAILED');
const rc3 = scorerCopy('repcount3', "(t === '3' || t === '3b') ? 1 : 3]", "3]");
run('mutated scorer: every arm 3 reps (the 11/33 bug)', calCopy('repcount3', 'fx-full', rc3), 'FAILED');
const dbl = scorerCopy('litedouble', 'for (const id of uniqueIds) for', "for (const id of Object.values(TIERS).flatMap(({ ids }) => ids)) for");
run('mutated scorer: lite totals over tier ids with repeats (the 81/81 bug)', calCopy('litedouble', 'fx-full', dbl), 'FAILED');
const ans = scorerCopy('answered-broken', 'const answeredCount = (arm, ids) => ids.filter((id) => repsOf(arm).every((rep) => answers[arm][rep - 1]?.[id]?.spoken)).length;', 'const answeredCount = (arm, ids) => 0;');
run('mutated scorer: answeredCount always 0 (the new "answered N of M" line broken)', calCopy('answered-broken', 'fx-full', ans), 'OK');
const x35 = scorerCopy('arms-swapped', "const outcome = (arm, rep, id) => grade[arm]?.[rep]?.[id]?.verdict", "const swapArm = (a) => (a === 'gemini-3.6-flash default' ? 'gemini-3.5-flash default' : a === 'gemini-3.5-flash default' ? 'gemini-3.6-flash default' : a);\nconst outcome = (arm, rep, id) => grade[swapArm(arm)]?.[rep]?.[id]?.verdict");
run('mutated scorer: 3.6 and 3.5 grades cross-wired (deferred Q-m1)', calCopy('arms-swapped', 'fx-full', x35), 'OK');
// the copies' own blind-cal dirs are removed by each calibration copy; list what is left
for (const fx of ['fx-full', 'fx-a']) console.log(`${fx}/flash after runs: ${fs.readdirSync(`${HERE}/${fx}/flash`).filter((x) => !/^interview60/.test(x)).join(' ')}`);
