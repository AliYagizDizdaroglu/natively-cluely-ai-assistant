// Throwaway rule-8 check OF the calibration: each mutant of decide() must make the calibration FAIL.
// Writes mutant-decide.mjs + mutant-calibrate.mjs beside this file, runs them, deletes them.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const here = (f) => new URL(`./${f}`, import.meta.url);
const decideSrc = fs.readFileSync(here('followup-questions-decide.mjs'), 'utf8');
const calSrc = fs.readFileSync(here('followup-questions-decide-calibrate.mjs'), 'utf8').replace("from './followup-questions-decide.mjs'", "from './mutant-decide.mjs'");
const MUTANTS = [
    ['clause 1 tolerates one new wrong', 'const c1 = wrongB <= wrongA ?', 'const c1 = wrongB <= wrongA + 1 ?'],
    ['clause 2 dropped', "const c2 = offB <= offA ? 'holds' : 'FAIL';", "const c2 = 'holds';"],
    ['clause 3a FAIL bar at 1500', 'dTtft > 1000', 'dTtft > 1500'],
    ['clause 3a holds bar at 600', 'dTtft <= 500', 'dTtft <= 600'],
    ['clause 3b margin 5000', 'p90B <= p90A + 2000', 'p90B <= p90A + 5000'],
    ['clause 3c allowance floored', 'Math.ceil((2 * n) / 39)', 'Math.floor((2 * n) / 39)'],
    ['clause 4 FAIL bar at 12', 'dWords > 10', 'dWords > 12'],
    ['clause 5 counts every pair', "const roster = pairs.filter((p) => p.kind === 'roster');", 'const roster = pairs;'],
    ['clause 5 fixed bars (no pooled scaling)', 'const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);', 'const passBar = 4, failBar = 1;'],
    ['pooled INCONCLUSIVE not turned into FAIL', "if (pooled && outcome === 'INCONCLUSIVE') outcome = 'FAIL';", ''],
    ['consensus wrong by either grader', 'const wrong = (s) => s.g1.correctness === 0 && s.g2.correctness === 0;', 'const wrong = (s) => s.g1.correctness === 0 || s.g2.correctness === 0;'],
    ['consensus acceptable by either grader', "const acceptable = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';", "const acceptable = (s) => verdictOf(s.g1) === 'acceptable' || verdictOf(s.g2) === 'acceptable';"],
    ['score validation off', "if (!s || !SCORE(s.g1) || !SCORE(s.g2)) throw", 'if (!s) throw'],
];
let ok = true;
for (const [name, from, to] of MUTANTS) {
    if (decideSrc.split(from).length !== 2) { console.log(`ANCHOR NOT FOUND EXACTLY ONCE for "${name}"`); ok = false; continue; }
    fs.writeFileSync(here('mutant-decide.mjs'), decideSrc.replace(from, () => to));
    fs.writeFileSync(here('mutant-calibrate.mjs'), calSrc);
    const r = spawnSync(process.execPath, [new URL(here('mutant-calibrate.mjs')).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { encoding: 'utf8' });
    const caught = r.status === 1 && /CALIBRATION FAILED/.test(r.stdout);
    ok &&= caught;
    const bad = (r.stdout.match(/^BAD .*$/m) ?? [''])[0].slice(0, 110);
    console.log(`${caught ? 'caught ' : 'MISSED '} ${name}${caught ? `  (${bad})` : `  exit ${r.status} ${r.stderr.slice(0, 200)}`}`);
}
for (const f of ['mutant-decide.mjs', 'mutant-calibrate.mjs']) if (fs.existsSync(here(f))) fs.unlinkSync(here(f));
console.log(ok ? '\nEVERY MUTANT CAUGHT: the calibration can fail' : '\nA MUTANT SURVIVED');
process.exit(ok ? 0 : 1);
