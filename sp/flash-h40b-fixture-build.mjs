// Throwaway: builds the calibration fixture for the h40b grading pipeline (task 4 resolution #2). No
// h40b flight has happened yet, so this exercises flash-h40b-blind-pairs.mjs / score-cal.mjs /
// score-blind.mjs against synthetic data carrying the REAL (h40a-derived) tier ids — imported from
// flash-h40a-tiers.mjs, never retyped — so the pairs/scorer logic is proven before flight day, without
// touching the real SP/flash-h40b/ paths or making any Gemini call.
//   node flash-h40b-fixture-build.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RD_H40A = `${MAIN}/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a`;
const FIX = `${SP}/flash-h40b-fixture`;
const RUN = `${FIX}/run`, FLASH = `${FIX}/flash`;

// The real, h40a-derived tier ids — imported (module-level code only; isMain is false on import, so no
// API calls happen), never retyped by hand.
const { TIERS } = await import(pathToFileURL(`${SP}/flash-h40a-tiers.mjs`).href);

fs.rmSync(FIX, { recursive: true, force: true });
fs.mkdirSync(RUN, { recursive: true });
fs.mkdirSync(FLASH, { recursive: true });

// 1. Copy the real h40a lite answer files (read-only sources) into the fixture's fake run folder.
const LITE_FILES = [
    'interview60.answers.gemini-3.1-flash-lite_captured-low.json',
    'interview60.answers.gemini-3.1-flash-lite_captured-low-r2.json',
    'interview60.answers.gemini-3.1-flash-lite_captured-low-r3.json',
    'interview60.answers.gemini-3.5-flash-lite_captured-high.json',
    'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json',
    'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json',
];
for (const f of LITE_FILES) fs.copyFileSync(`${RD_H40A}/${f}`, `${RUN}/${f}`);

// 2. A fake tiers.json with the real tier ids (h40b's tier 3b reruns tier 3's ids on a second model —
// flash-h40a-tiers.mjs only knows tiers 1-3, so 3b is added here to match the h40b sidecar's PLAN).
const fake = {
    '1': { model: TIERS[1].model, ids: TIERS[1].ids, skipped: [], requests: TIERS[1].ids.length * 3 },
    '2': { model: TIERS[2].model, ids: TIERS[2].ids, skipped: [], requests: TIERS[2].ids.length * 3 },
    '3': { model: TIERS[3].model, ids: TIERS[3].ids, skipped: [], requests: TIERS[3].ids.length },
    '3b': { model: 'gemini-3.5-flash', ids: TIERS[3].ids, skipped: [], requests: TIERS[3].ids.length },
};
fs.writeFileSync(`${FLASH}/tiers.json`, JSON.stringify(fake, null, 1));

// 3. Fake Flash answer files: 'fixture answer' for every tier id, at the reps the sidecar would use.
const REPS = { '1': ['def', 'def-r2', 'def-r3'], '2': ['def', 'def-r2', 'def-r3'], '3': ['def'], '3b': ['def'] };
let fileCount = 0;
for (const [t, { model, ids }] of Object.entries(fake)) {
    for (const tag of REPS[t]) {
        const store = Object.fromEntries(ids.map((id) => [id, { id, q: `fixture question ${id}`, spoken: 'fixture answer', ttft: 1234, total: 2345, thoughts: 10 }]));
        fs.writeFileSync(`${FLASH}/interview60.answers.${model}_${tag}.json`, JSON.stringify(store, null, 1));
        fileCount++;
    }
}
console.log(`fixture built: ${RUN} (${LITE_FILES.length} lite files copied), ${FLASH} (tiers.json + ${fileCount} answer files)`);
console.log(`tier ids: 1=${fake['1'].ids.join(',')}  2=${fake['2'].ids.join(',')}  3=3b=${fake['3'].ids.join(',')}`);
