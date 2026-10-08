/**
 * THROWAWAY — turn a length-spike arm into an answers-pass file the frozen judge can grade,
 * so "shorter" can be checked against "still covers the question" with the same instrument
 * the flights use. Scripted question text comes from the roster, exactly as the judge expects.
 *
 *   node spike-to-answers.mjs <arm>   ->  spike-answers.<arm>.json
 */
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const OUT = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { SCENARIO50 } = await import(`file:///${path.join(PROJ, 'electron/test/golden/scenario50.questions.mjs').replace(/\\/g, '/')}`);

const arm = process.argv[2];
if (!arm) { console.error('usage: spike-to-answers.mjs <arm>'); process.exit(2); }
const spike = JSON.parse(fs.readFileSync(path.join(OUT, 'length-spike.json'), 'utf8'));
if (!spike[arm]) { console.error(`no arm ${arm} in length-spike.json`); process.exit(2); }

const byId = new Map(SCENARIO50.map((i) => [i.id, i]));
const store = {};
for (const row of spike[arm].rows) {
    const item = byId.get(row.id);
    if (!item) { console.error(`roster has no ${row.id}`); process.exit(2); }
    store[row.id] = {
        id: row.id, level: item.level ?? null, topic: item.topic ?? null, q: item.q,
        spoken: row.spoken, words: row.words, model: `spike-${arm}`,
    };
}
const file = path.join(OUT, `spike-answers.${arm}.json`);
fs.writeFileSync(file, JSON.stringify(store, null, 1));
console.log(`${Object.keys(store).length} answers -> ${file}`);
