// Throwaway: reproduces calibration case A (everything acceptable) OUTSIDE flash-h40b-score-cal.mjs so
// the scorer's full totals output can be captured and quoted (score-cal.mjs only prints output on
// FAILURE). Verification-only; not one of task 4's deliverables.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F = `${SP}/flash-h40b-fixture/flash`, REAL = `${F}/blind`, CAL = `${F}/blind-cal-demo`;
const RUN_DIR = `${SP}/flash-h40b-fixture/run`;
const keys = fs.readdirSync(REAL).filter((x) => /^key\.blind-\d+\.json$/.test(x));
fs.rmSync(CAL, { recursive: true, force: true }); fs.mkdirSync(CAL, { recursive: true });
for (const f of keys) {
    const key = JSON.parse(fs.readFileSync(`${REAL}/${f}`, 'utf8'));
    fs.copyFileSync(`${REAL}/${f}`, `${CAL}/${f}`);
    const V = Object.fromEntries(Object.keys(key).map((k) => [k, { correctness: 2, on_topic: 2, delivery: 2, reason: 'fine' }]));
    fs.writeFileSync(`${CAL}/verdicts.blind-${f.match(/\d+/)[0]}.json`, JSON.stringify(V, null, 1));
}
const out = execFileSync(process.execPath, [`${SP}/flash-h40b-score-blind.mjs`], { env: { ...process.env, RUN_DIR, FLASH_DIR: F, BLIND_DIR: CAL }, encoding: 'utf8' });
console.log(out);
fs.rmSync(CAL, { recursive: true, force: true });
