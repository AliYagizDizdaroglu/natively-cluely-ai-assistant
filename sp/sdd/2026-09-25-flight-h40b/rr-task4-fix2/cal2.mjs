// Re-review 2 probe (throwaway): (1) the REAL calibration, untouched, on the real fixture; (2) COPIES of
// score-cal.mjs pointed at rr-task4-fix2/fx/full (a complete fixture copy whose blind/ fx2.mjs built) and
// at MUTATED copies of score-blind.mjs, each made by exact single-match replacement. Deliverables are
// only read; copies live under rr-task4-fix2/sc.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const SC = `${HERE}/sc`;
fs.mkdirSync(SC, { recursive: true });
const CAL_SRC = fs.readFileSync(`${SP}/flash-h40b-score-cal.mjs`, 'utf8');
const SCORE_SRC = fs.readFileSync(`${SP}/flash-h40b-score-blind.mjs`, 'utf8');
const rep1 = (t, from, to) => { const n = t.split(from).length - 1; if (n !== 1) throw new Error(`expected 1 match, found ${n}: ${from.slice(0, 80)}`); return t.replace(from, () => to); };
const scorerCopy = (name, edits) => { let t = SCORE_SRC; for (const [a, b] of edits) t = rep1(t, a, b); const f = `${SC}/sb.${name}.mjs`; fs.writeFileSync(f, t); return f; };
const calCopy = (name, scorer) => {
    let t = rep1(CAL_SRC, "const FIX_RUN = `${SP}/flash-h40b-fixture/run`, FIX_FLASH = `${SP}/flash-h40b-fixture/flash`;", `const FIX_RUN = '${HERE}/fx/full/run', FIX_FLASH = '${HERE}/fx/full/flash';`);
    t = rep1(t, "[`${SP}/flash-h40b-score-blind.mjs`]", `['${scorer}']`);
    const f = `${SC}/cal.${name}.mjs`; fs.writeFileSync(f, t); return f;
};
const run = (label, file, expect) => {
    const r = spawnSync(process.execPath, [file], { encoding: 'utf8' });
    const verdict = /CALIBRATION OK/.test(r.stdout) ? 'OK' : /CALIBRATION FAILED/.test(r.stdout) ? 'FAILED' : `CRASH (exit ${r.status})`;
    const cases = r.stdout.split('\n').filter((l) => /^case /.test(l)).join(' | ');
    const answered = (r.stdout.match(/on tier 1: answered \d+ of \d+[^\n]*/) ?? [''])[0];
    console.log(`${verdict === expect ? 'as expected' : 'UNEXPECTED '}  ${label}: ${verdict} (exit ${r.status}; expected ${expect})  ${cases}${answered ? `  [first failing print: ${answered}]` : ''}`);
    return r;
};

// (1) the real calibration, exactly as flight day runs it
const fixFlash = `${SP}/flash-h40b-fixture/flash`;
const before = fs.readdirSync(fixFlash).join(' ');
const real = run('REAL score-cal.mjs on the untouched fixture', `${SP}/flash-h40b-score-cal.mjs`, 'OK');
console.log(`    last line: ${real.stdout.trim().split('\n').pop()}`);
console.log(`    fixture flash/ unchanged by the run: ${before === fs.readdirSync(fixFlash).join(' ')} (${before})`);

// (2) variants on the complete copy
const ANS = 'const answeredCount = (arm, ids) => ids.reduce((sum, id) => sum + repsOf(arm).filter((rep) => answers[arm][rep - 1]?.[id]?.spoken).length, 0);';
run('control: unmodified scorer copy, complete copy fx/full', calCopy('control', scorerCopy('plain', [])), 'OK');
run('M2 target: answeredCount always 0', calCopy('ans0', scorerCopy('ans0', [[ANS, 'const answeredCount = (arm, ids) => 0;']])), 'FAILED');
run("round 1's id-level count under the new print (ids with EVERY rep)", calCopy('ansids', scorerCopy('ansids', [[ANS, 'const answeredCount = (arm, ids) => ids.filter((id) => repsOf(arm).every((rep) => answers[arm][rep - 1]?.[id]?.spoken)).length;']])), 'FAILED');
run('answeredCount counts rep 1 only', calCopy('ansr1', scorerCopy('ansr1', [[ANS, 'const answeredCount = (arm, ids) => ids.filter((id) => answers[arm][0]?.[id]?.spoken).length;']])), 'FAILED');
run('answeredCount always "full" (ids x reps, never looks at the files)', calCopy('ansfull', scorerCopy('ansfull', [[ANS, 'const answeredCount = (arm, ids) => ids.length * repsOf(arm).length;']])), 'OK');
run('N1 reverted (totals[t] created inside the id loop again)', calCopy('n1rev', scorerCopy('n1rev', [
    ["    totals[t] = { acc: 0, n: 0, ttft: [], thoughts: [], total: [] };   // N1: created even when ids is empty\n", ''],
    ['        totals[t].acc += acc(arm, id); totals[t].n += n;', '        (totals[t] ??= { acc: 0, n: 0, ttft: [], thoughts: [], total: [] });\n        totals[t].acc += acc(arm, id); totals[t].n += n;'],
])), 'OK');
console.log(`fx/full/flash after the variants: ${fs.readdirSync(`${HERE}/fx/full/flash`).filter((x) => !/^interview60/.test(x)).join(' ')}`);
