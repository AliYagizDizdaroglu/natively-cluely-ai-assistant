// Throwaway calibration for l20/score.mjs: fake verdicts whose unblinded answer is known in advance, written per
// packet and grader exactly as the real graders will write them.
//   app arms: acceptable in both slots             -> 20 / hard 10 / normal 10, consensus-wrong 0
//   live38-r1: correctness 0 in both slots          -> 0 / 0 / 0, consensus-wrong 20
//   live38-r2: delivery 0 in slot 1 only            -> 10 / 5 / 5, consensus-wrong 0
//   live38-r3: acceptable in both slots             -> 20 / 10 / 10
// so: live38 mean 10.0 vs app 20.0 (quality FAIL), normal 5.0 vs 10.0 (FAIL), band 0 vs 20 (FAIL),
// consensus-wrong 20 > 1 (safety FAIL); agreement 120/140.
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const DIR = `${HERE}-calib`;
const { key, packets } = JSON.parse(fs.readFileSync(`${HERE}-key/key.json`, 'utf8'));
const ok = { correctness: 2, on_topic: 2, delivery: 2, reason: 'calibration' };
const grade = (arm, slot) => (arm === 'live38-r1' ? { ...ok, correctness: 0 } : arm === 'live38-r2' && slot === 1 ? { ...ok, delivery: 0 } : ok);
fs.mkdirSync(DIR, { recursive: true });
for (const p of ['A', 'B']) for (const [slot, g] of [[1, 'g1'], [2, 'g2']]) {
    const v = {};
    for (const [k, arm] of Object.entries(key)) if (packets[p].includes(k.split('#')[0])) v[k] = grade(arm, slot);
    fs.writeFileSync(`${DIR}/verdicts-${p}-${g}.json`, JSON.stringify(v));
}
console.log(`wrote ${DIR}`);
