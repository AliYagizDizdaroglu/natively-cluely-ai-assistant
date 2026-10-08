// Rule-8 calibration of et38/blind.mjs on a batch whose holes are known: L20's Live run 1 (L20b r1 + L20c r1 merged
// into one 38-item answers file) stands in for an ET run. L20c's key recorded its holes: live38-r1 S1Q02, S1Q02F and
// S1Q09F, and br1's S1Q08. Plus one made-up apology, which ET38's rule (unlike L20c's) must count as a hole.
// Runs blind.mjs --dry on a calibration folder; writes nothing outside et38/cal-blind/. Prints counts and ids only.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const DIR = `${SP}/et38/cal-blind`;
fs.mkdirSync(`${DIR}/runs`, { recursive: true });
fs.copyFileSync(`${SP}/et38/items.json`, `${DIR}/items.json`);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const merged = { ...J(`${SP}/l20b/runs/live38-r1.answers.json`), ...J(`${SP}/l20c/runs/live38-r1.answers.json`) };
fs.writeFileSync(`${DIR}/runs/et-low-r1.answers.json`, JSON.stringify(merged));
const withApology = { ...merged, S2Q10: { ...merged.S2Q10, answer: 'I am sorry, I ran into a system error and cannot answer.' } };
fs.writeFileSync(`${DIR}/runs/et-medium-r1.answers.json`, JSON.stringify(withApology));
const r = spawnSync(process.execPath, [`${SP}/et38/blind.mjs`, '--dry', '--dir', DIR, '--keydir', `${DIR}/key`], { encoding: 'utf8' });
const out = r.stdout + r.stderr;
let ok = true;
const check = (name, cond) => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}`); };
const holes = (out.match(/^holes \(not graded\): (.*)$/m)?.[1] ?? '').split(', ').sort();
check('exit 0 and nothing written', r.status === 0 && /dry run: nothing written/.test(out) && !fs.existsSync(`${DIR}/key/key.json`));
check(`holes are exactly br1 S1Q08, low-r1 S1Q02 S1Q02F S1Q09F, medium-r1 the same three plus the apology S2Q10 (got: ${holes.join(', ')})`,
    JSON.stringify(holes) === JSON.stringify(['br1-inapp S1Q08', 'et-low-r1 S1Q02', 'et-low-r1 S1Q02F', 'et-low-r1 S1Q09F', 'et-medium-r1 S1Q02', 'et-medium-r1 S1Q02F', 'et-medium-r1 S1Q09F', 'et-medium-r1 S2Q10'].sort()));
check('per arm: br1 37, et-low-r1 35, et-medium-r1 34', /br1-inapp 37, et-low-r1 35, et-medium-r1 34/.test(out));
check('answers 106 = 37 + 35 + 34', /answers 106;/.test(out));
const sizes = [...out.matchAll(/^packet ([A-D]): (\d+) answers \(([^)]*)\)/gm)].map((m) => [m[1], Number(m[2]), m[3].split(' ').length]);
check(`four packets of 10, 10, 10 and 8 items (got ${JSON.stringify(sizes.map((x) => x[2]))}) whose answers sum to 106`, JSON.stringify(sizes.map((x) => x[2])) === '[10,10,10,8]' && sizes.reduce((n, x) => n + x[1], 0) === 106);
console.log(ok ? 'ET38 BLIND CALIBRATION OK' : `ET38 BLIND CALIBRATION FAILED\n${out.slice(0, 1500)}`);
process.exit(ok ? 0 : 1);
