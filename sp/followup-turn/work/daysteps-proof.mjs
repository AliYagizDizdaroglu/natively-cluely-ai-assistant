// throwaway: exercises R/day-steps.mjs (the day's script) inside followup-turn-proof/ (made by makeproof.mjs): the unlisted-script refusal, stop-archive,
// and the "never overwrite a result that holds a DECISION" rule. No model call anywhere (legs-decide reads only synthetic/absent files here).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const FT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROOF = path.join(path.dirname(FT), 'followup-turn-proof');
const R = path.join(PROOF, 'R');
const log = path.join(os.tmpdir(), `daysteps-proof-${Date.now()}.log`);
const steps = (...a) => spawnSync(process.execPath, [path.join(R, 'day-steps.mjs'), ...a], { encoding: 'utf8', env: { ...process.env, TURN_RUNLOG: log }, cwd: PROOF });
let ok = true;
const check = (n, p, d = '') => { ok &&= !!p; console.log(`${p ? 'OK ' : 'BAD'} ${n}${d ? `  [${d}]` : ''}`); };
const before = fs.readdirSync(R).sort().join(',');

// 1. a stray script
const stray = path.join(R, 'scripts', 'zz-stray.mjs');
fs.writeFileSync(stray, '// stray\n');
let r = steps('decide');
fs.unlinkSync(stray);
check('decide with a stray R/scripts/zz-stray.mjs: REFUSED, exit 3', r.status === 3 && /REFUSED/.test(r.stdout) && /zz-stray\.mjs/.test(r.stdout), `exit ${r.status}`);
check('... prints no VOID, saves no RESULT file, ran no legs-decide', !/^VOID/m.test(r.stdout + r.stderr) && !fs.existsSync(path.join(R, 'RESULT-front-back.txt')) && !/step decide: exit/.test(r.stdout));
r = steps('decide-rerun');
check('... decide-rerun too (with the stray gone it is no longer refused for that reason)', !/REFUSED: not listed/.test(r.stdout) && !/zz-stray/.test(r.stdout), `exit ${r.status}`);
fs.rmSync(path.join(R, 'RESULT-front-back-rerun.txt'), { force: true });

// 2. stop-archive
const names = ['interview60.answers.gemini-3.5-flash-lite_fturn-s50m-A-r1.json', 'interview60.answers.gemini-3.5-flash-lite_fturn-s50m-B-r2.json.tmp', 'interview60.answers.gemini-3.1-flash-lite_fturn-s50l-A-r3.json', 'STOPPED-front.txt', 'pass-front.txt'];
for (const n of names) fs.writeFileSync(path.join(R, n), 'x\n');
const keep = 'interview60.answers.gemini-3.5-flash-lite_fquestions-A-r1.json';   // a design-2 style file is NOT a _fturn- file: not moved
fs.writeFileSync(path.join(R, keep), 'x\n');
r = steps('stop-archive');
const arch = fs.readdirSync(R).filter((f) => /^stopped-\d{8}-\d{4}$/.test(f));
check('stop-archive: exit 0, one R/stopped-<YYYYMMDD-HHMM>/ folder', r.status === 0 && arch.length === 1, `exit ${r.status} ${arch}`);
check('... it holds the 3 answer files (one a .tmp), STOPPED-front.txt and the pass stdout', arch.length === 1 && names.every((n) => fs.existsSync(path.join(R, arch[0], n))));
check('... R then holds no _fturn- answer file and no STOPPED marker (precondition 6.1 lists an empty R again), and the other file stays', names.every((n) => !fs.existsSync(path.join(R, n))) && fs.existsSync(path.join(R, keep)));
fs.unlinkSync(path.join(R, keep));
r = steps('stop-archive');
check('stop-archive again with nothing to move: refused, exit 2', r.status === 2 && /nothing to archive/.test(r.stdout));
fs.rmSync(path.join(R, arch[0]), { recursive: true, force: true });

// 3. a result that already holds a DECISION is never overwritten
const res = path.join(R, 'RESULT-front-back.txt');
fs.writeFileSync(res, 'GRADERS...\nDECISION: PASS\n');
r = steps('decide');
const again = fs.readdirSync(R).filter((f) => /^RESULT-front-back\.again-/.test(f));
check('decide with DECISION already on file: RESULT-front-back.txt is byte-identical afterwards, the new output went to RESULT-front-back.again-*.txt', fs.readFileSync(res, 'utf8') === 'GRADERS...\nDECISION: PASS\n' && again.length === 1, `exit ${r.status}; ${again}`);
for (const f of [res, ...again.map((x) => path.join(R, x))]) fs.rmSync(f, { force: true });
check('R is back to its starting listing', fs.readdirSync(R).sort().join(',') === before);
console.log(ok ? 'DAY-STEPS PROOF OK' : 'DAY-STEPS PROOF FAILED');
process.exit(ok ? 0 : 1);
