// Re-review probe (throwaway): copies of the fixture for the incomplete-data paths. Reads the real
// fixture, writes ONLY under rr-task4-fix1/fx-*. The real fixture is never modified.
//   fx-a      minus gemini-3.7-flash_def-r3.json (tier 2's third rep never ran)
//   fx-empty  tier 1 captured no ids: tiers.json '1' = { ids: [], skipped: [R02F, R08] }, no tier-1 files
//   fx-skip   tier 2's R09F uncaptured: tiers.json '2' = { ids: [R03, R16], skipped: [R09F] }
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const FIX = `${SP}/flash-h40b-fixture`;
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix1`;
const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        if (e.isDirectory()) { if (e.name === 'blind') continue; copyDir(`${from}/${e.name}`, `${to}/${e.name}`); }
        else fs.copyFileSync(`${from}/${e.name}`, `${to}/${e.name}`);
    }
};
for (const name of ['fx-a', 'fx-empty', 'fx-skip']) {
    const to = `${HERE}/${name}`;
    fs.rmSync(to, { recursive: true, force: true });
    copyDir(`${FIX}/run`, `${to}/run`);
    copyDir(`${FIX}/flash`, `${to}/flash`);   // the fixture's blind/ is NOT copied: each copy builds its own
}
fs.rmSync(`${HERE}/fx-a/flash/interview60.answers.gemini-3.7-flash_def-r3.json`);

const te = JSON.parse(fs.readFileSync(`${HERE}/fx-empty/flash/tiers.json`, 'utf8'));
te['1'] = { ...te['1'], ids: [], skipped: ['R02F', 'R08'], requests: 0 };
fs.writeFileSync(`${HERE}/fx-empty/flash/tiers.json`, JSON.stringify(te, null, 1));
for (const tag of ['def', 'def-r2', 'def-r3']) fs.rmSync(`${HERE}/fx-empty/flash/interview60.answers.gemini-3.8-flash_${tag}.json`);

const ts = JSON.parse(fs.readFileSync(`${HERE}/fx-skip/flash/tiers.json`, 'utf8'));
ts['2'] = { ...ts['2'], ids: ['R03', 'R16'], skipped: ['R09F'], requests: 6 };
fs.writeFileSync(`${HERE}/fx-skip/flash/tiers.json`, JSON.stringify(ts, null, 1));

for (const name of ['fx-a', 'fx-empty', 'fx-skip']) console.log(name, fs.readdirSync(`${HERE}/${name}/flash`).join(' '));
