// Throwaway: BLINDED grading files for the h40b full-Flash tiers (flash-h40a-blind-pairs.mjs pattern).
// Tier 1/2 questions get 9 shuffled answers under anonymous keys: that tier's Flash model x3 (default
// thinking) beside the flight's own 3.1-lite LOW x3 and 3.5-lite HIGH x3. Tier 3 and 3b share their 11
// questions and each run ONE rep on a different full Flash model, so those questions get 8 answers:
// 3.6-flash x1 + 3.5-flash x1 + the two lite arms x3 each — one blind item per id, not one per tier, so a
// shared id is graded once. The key file maps key -> arm/rep and is never shown to a grader. A missing or
// empty answer gets no item; the scorer counts it as NO ANSWER.
// RUN_DIR / FLASH_DIR / BLIND_DIR env overrides point the whole pipeline elsewhere (a calibration
// fixture); default is the real h40b paths — the newest *-h40b run folder, SP/flash-h40b(/blind).
// h40b finding: a follow-up item's `question` carried only its own text, so the blind grader had no idea
// it leaned on an earlier answer — R09F's rank-one answer graded acceptable x3 blind but wrong x3
// standard (interview60.judge.mjs's questionForGrader appends the parent); this builder now calls that
// same function so blind and standard grading see the same question text.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const F = process.env.FLASH_DIR ?? `${SP}/flash-h40b`;
const OUT = process.env.BLIND_DIR ?? `${F}/blind`;
function discoverRunDir() {
    const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
    const d = fs.readdirSync(RUNS).filter((x) => /-h40b$/.test(x)).sort().pop();
    if (!d) { console.error(`no *-h40b run folder found under ${RUNS} — pass RUN_DIR to override (e.g. a calibration fixture)`); process.exit(2); }
    return `${RUNS}/${d}`;
}
export const RUN = process.env.RUN_DIR ?? discoverRunDir();
const TL = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const J = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.judge.mjs`).href);
if (!fs.existsSync(`${F}/tiers.json`)) { console.error(`${F}/tiers.json missing — run the sidecar (or point FLASH_DIR at a fixture) first`); process.exit(2); }
export const TIERS = JSON.parse(fs.readFileSync(`${F}/tiers.json`, 'utf8'));

const REPS = ['', '-r2', '-r3'];
const LITE = {
    '3.1-lite LOW': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.1-flash-lite_captured-low${r}.json`),
    '3.5-lite HIGH': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.5-flash-lite_captured-high${r}.json`),
};
// Tier 3 and 3b run one rep each ("def" only); tiers 1 and 2 run three ("def", "def-r2", "def-r3").
const repTagsFor = (t) => (t === '3' || t === '3b' ? ['def'] : ['def', 'def-r2', 'def-r3']);
export const FLASH_FILES = Object.fromEntries(Object.entries(TIERS).map(([t, { model }]) => [`${model} default`, repTagsFor(t).map((tag) => `${F}/interview60.answers.${model}_${tag}.json`)]));
export const PER_FILE = 4;

function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const load = (f) => { if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); } return JSON.parse(fs.readFileSync(f, 'utf8')); };
// A missing FLASH rep file is a real, expected gap on flight day (the sidecar's budget gate can skip
// a whole rep, or a tier can capture no ids at all — see flash-h40b-sidecar.mjs's per-pass loop), not
// a builder bug: the header above already promises "a missing or empty answer gets no item; the
// scorer counts it as NO ANSWER". So every id that file would have covered is simply absent from the
// blind items (the existing `missing` counter below already counts it per-id) and the builder keeps
// going. The lite files stay strict via `load`: the flight always writes them, so a missing one IS a bug.
const loadFlash = (f) => { if (!fs.existsSync(f)) { console.error(`missing ${f} (recorded as NO ANSWER for its ids)`); return {}; } return JSON.parse(fs.readFileSync(f, 'utf8')); };

if (process.argv[1] && process.argv[1].endsWith('flash-h40b-blind-pairs.mjs')) {
    if (fs.existsSync(OUT) && fs.readdirSync(OUT).some((f) => /^verdicts\./.test(f))) { console.error(`${OUT} already holds verdicts — refusing to rebuild the keys under them`); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    const lite = Object.fromEntries(Object.entries(LITE).map(([arm, files]) => [arm, files.map(load)]));
    const perQuestion = {}, order = [];
    let missing = 0;
    // Flash arms: looped by tier so a shared id (tier 3 / 3b) picks up BOTH tiers' arms in its one entry.
    for (const [t, { model, ids }] of Object.entries(TIERS)) {
        const arm = `${model} default`;
        const flash = FLASH_FILES[arm].map(loadFlash);
        for (const id of ids) {
            if (!perQuestion[id]) { perQuestion[id] = []; order.push(id); }
            repTagsFor(t).forEach((_, r) => {
                const x = flash[r][id];
                if (!x?.spoken) { missing++; return; }
                perQuestion[id].push({ arm, rep: r + 1, q: x.q, level: x.level ?? null, topic: x.topic ?? null, answer: x.spoken });
            });
        }
    }
    // Lite arms: once per unique id, never per tier.
    for (const id of order) {
        for (const [a, reps] of Object.entries(lite)) {
            for (let r = 0; r < 3; r++) {
                const x = reps[r][id];
                if (!x?.spoken) { missing++; continue; }
                perQuestion[id].push({ arm: a, rep: r + 1, q: x.q, level: x.level ?? null, topic: x.topic ?? null, answer: x.spoken });
            }
        }
    }
    for (const id of order) perQuestion[id] = shuffle(perQuestion[id], rng(`blind:flash-h40b:${id}`));
    const chunks = [];
    for (let i = 0; i < order.length; i += PER_FILE) chunks.push(order.slice(i, i + PER_FILE));
    // BLIND_NO_PARENT=1 is a throwaway calibration switch (h40c Task 2 rule-8 check): it
    // reproduces the h40b bug on demand so blind-parent-check.mjs can be proven to fail.
    const noParent = process.env.BLIND_NO_PARENT === '1';
    chunks.forEach((ids, n) => {
        const items = [], key = {};
        for (const id of ids) perQuestion[id].forEach((e, i) => {
            const k = `${id}#${i + 1}`;
            const question = noParent ? e.q : J.questionForGrader(TL.items.find((i) => i.id === id) ?? { q: e.q }, TL.items);
            items.push({ key: k, id, kind: 'spoken', level: e.level, topic: e.topic, question, heard: e.q, source: 'answers-pass', answer: e.answer });
            key[k] = { arm: e.arm, rep: e.rep, id };
        });
        fs.writeFileSync(`${OUT}/pairs.blind-${n + 1}.json`, JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        fs.writeFileSync(`${OUT}/key.blind-${n + 1}.json`, JSON.stringify(key, null, 1));
        console.log(`pairs.blind-${n + 1}.json  ${items.length} items  ${ids.join(',')}`);
    });
    console.log(`${chunks.length} files, ${order.length} ids; ${missing} arm answers missing (scored as no answer); instrument ${J.graderPromptVersion()}`);
}
