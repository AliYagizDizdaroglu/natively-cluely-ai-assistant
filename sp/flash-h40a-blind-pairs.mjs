// Throwaway: BLINDED grading files for the full-Flash tiers (gemma-h40a-blind-pairs.mjs pattern). Each
// tier question gets 9 shuffled answers under anonymous keys: the tier's Flash model ×3 (default
// thinking) beside the flight's own 3.1-lite LOW ×3 and 3.5-lite HIGH ×3, RE-GRADED in the same file so
// one grader's severity lands on all three arms. The key file maps key -> arm/rep and is never shown to
// a grader. A missing or empty answer gets no item; the scorer counts it as NO ANSWER.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F = `${SP}/flash-h40a`;
const OUT = `${F}/blind`;
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const J = await import(pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.judge.mjs').href);
// The run's own record of which model answered each tier (a stand-in may have replaced tier 1's model).
const { TIERS: PLANNED } = await import(pathToFileURL(`${SP}/flash-h40a-tiers.mjs`).href);
const TIERS = fs.existsSync(`${F}/tiers.json`) ? JSON.parse(fs.readFileSync(`${F}/tiers.json`, 'utf8')) : PLANNED;
export { TIERS };

const REPS = ['', '-r2', '-r3'];
const LITE = {
    '3.1-lite LOW': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.1-flash-lite_captured-low${r}.json`),
    '3.5-lite HIGH': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.5-flash-lite_captured-high${r}.json`),
};
export const FLASH_FILES = Object.fromEntries(Object.values(TIERS).map(({ model }) => [`${model} default`, ['def', 'def-r2', 'def-r3'].map((t) => `${F}/interview60.answers.${model}_${t}.json`)]));
// Tiers a stand-in served share a model (and its files) with another tier: the pairs are still per
// question, so nothing collides; the scorer labels them by tier.
export const PER_FILE = 4;

function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const load = (f) => { if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); } return JSON.parse(fs.readFileSync(f, 'utf8')); };

if (process.argv[1] && process.argv[1].endsWith('flash-h40a-blind-pairs.mjs')) {
    if (fs.existsSync(OUT) && fs.readdirSync(OUT).some((f) => /^verdicts\./.test(f))) { console.error(`${OUT} already holds verdicts — refusing to rebuild the keys under them`); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    const lite = Object.fromEntries(Object.entries(LITE).map(([arm, files]) => [arm, files.map(load)]));
    const perQuestion = {}, order = [];
    let missing = 0;
    for (const { model, ids } of Object.values(TIERS)) {
        const arm = `${model} default`;
        const flash = FLASH_FILES[arm].map(load);
        for (const id of ids) {
            const entries = [];
            for (const [a, reps] of [[arm, flash], ...Object.entries(lite)]) {
                for (let r = 0; r < 3; r++) {
                    const x = reps[r][id];
                    if (!x?.spoken) { missing++; continue; }
                    entries.push({ arm: a, rep: r + 1, q: x.q, level: x.level ?? null, topic: x.topic ?? null, answer: x.spoken });
                }
            }
            perQuestion[id] = shuffle(entries, rng(`blind:flash-h40a:${id}`));
            order.push(id);
        }
    }
    const chunks = [];
    for (let i = 0; i < order.length; i += PER_FILE) chunks.push(order.slice(i, i + PER_FILE));
    chunks.forEach((ids, n) => {
        const items = [], key = {};
        for (const id of ids) perQuestion[id].forEach((e, i) => {
            const k = `${id}#${i + 1}`;
            items.push({ key: k, id, kind: 'spoken', level: e.level, topic: e.topic, question: e.q, heard: e.q, source: 'answers-pass', answer: e.answer });
            key[k] = { arm: e.arm, rep: e.rep, id };
        });
        fs.writeFileSync(`${OUT}/pairs.blind-${n + 1}.json`, JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        fs.writeFileSync(`${OUT}/key.blind-${n + 1}.json`, JSON.stringify(key, null, 1));
        console.log(`pairs.blind-${n + 1}.json  ${items.length} items  ${ids.join(',')}`);
    });
    console.log(`${chunks.length} files, ${order.length} ids; ${missing} arm answers missing (scored as no answer); instrument ${J.graderPromptVersion()}`);
}
