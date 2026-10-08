// Throwaway calibration for score.mjs: fake verdicts whose unblinded answer is known in advance.
// g1 marks every et-low answer WRONG (correctness 0) and everything else 2/2/2; g2 marks every et-high answer
// delivery 0 (weak, not wrong) and everything else 2/2/2. Expected: app arms 10/10 on both graders; et-low 0 (g1)
// and 10 (g2) with 10 wrong on g1; et-high 10 (g1) and 0 (g2) with 10 delivery-0 on g2; both ET arms mean 5.0
// → quality FAIL; et-low safety FAIL (wrong), et-high safety per its real system errors.
// --batch2 does the same on key2.json with live38 (WRONG on g1) and et-medium (delivery 0 on g2) as the marked arms;
// expected there: every other arm 10/10, live38 0/10 with 10 wrong on g1, et-medium 10/0 with 10 delivery-0 on g2.
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/et10';
const B2 = process.argv.includes('--batch2');
const DIR = B2 ? `${HERE}-calib2` : `${HERE}-calib`;
const { key } = JSON.parse(fs.readFileSync(`${HERE}-key/${B2 ? 'key2' : 'key'}.json`, 'utf8'));
const [WRONG_ARM, D0_ARM] = B2 ? ['live38', 'et-medium'] : ['et-low', 'et-high'];
const ok = { correctness: 2, on_topic: 2, delivery: 2, reason: 'calibration' };
const g1 = {}, g2 = {};
for (const [k, arm] of Object.entries(key)) {
    g1[k] = arm === WRONG_ARM ? { ...ok, correctness: 0 } : ok;
    g2[k] = arm === D0_ARM ? { ...ok, delivery: 0 } : ok;
}
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(`${DIR}/verdicts-g1.json`, JSON.stringify(g1));
fs.writeFileSync(`${DIR}/verdicts-g2.json`, JSON.stringify(g2));
console.log(`wrote ${DIR}`);
