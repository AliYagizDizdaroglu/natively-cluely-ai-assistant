// Throwaway: BLINDED 3-arm grading files for the h40a Gemma sidecar (gemma-blind-pairs.mjs pattern).
// Every file holds every arm's answers to the same questions, shuffled under anonymous keys (R02#1..#9),
// so one grader's severity lands on all three arms equally — graders differ by 4–7 of 39 on identical
// answers (2026-09-24), more than the arm differences measured. The key file maps key -> arm/rep and
// is never shown to a grader. Arms, all on the hour's captured prompts, 3 reps each, all 44 ids:
// the flight's own captured-low (3.1-lite LOW) and captured-high (3.5-lite HIGH) reps, and the
// sidecar's Gemma 26B MINIMAL reps. A missing or empty answer gets no item; the scorer counts it as
// NO ANSWER.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const G = `${SP}/gemma-h40a`;
const OUT = `${G}/blind`;
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const J = await import(pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.judge.mjs').href);

const REPS = ['', '-r2', '-r3'];
export const ARM_FILES = {
    '3.1-lite LOW': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.1-flash-lite_captured-low${r}.json`),
    '3.5-lite HIGH': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.5-flash-lite_captured-high${r}.json`),
    'Gemma 26B MINIMAL': ['min', 'min-r2', 'min-r3'].map((t) => `${G}/interview60.answers.gemma-4-26b-a4b-it_${t}.json`),
};
// The ids the flight's captured arms answered (the hour's captured prompts), in roster order.
export const IDS = Object.keys(JSON.parse(fs.readFileSync(ARM_FILES['3.1-lite LOW'][0], 'utf8')));
export const PER_FILE = 5; // questions per file: 5 x 3 arms x 3 reps = 45 answers, a flight pairs file's size

function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

if (process.argv[1] && process.argv[1].endsWith('gemma-h40a-blind-pairs.mjs')) {
    const stores = Object.fromEntries(Object.entries(ARM_FILES).map(([arm, files]) => [arm, files.map((f) => {
        if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
        return JSON.parse(fs.readFileSync(f, 'utf8'));
    })]));
    if (fs.existsSync(OUT) && fs.readdirSync(OUT).some((f) => /^verdicts\./.test(f))) { console.error(`${OUT} already holds verdicts — refusing to rebuild the keys under them`); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    const perQuestion = {};
    let missing = 0;
    for (const id of IDS) {
        const entries = [];
        for (const [arm, reps] of Object.entries(stores)) {
            for (let r = 0; r < 3; r++) {
                const a = reps[r][id];
                if (!a?.spoken) { missing++; continue; }
                entries.push({ arm, rep: r + 1, q: a.q, level: a.level ?? null, topic: a.topic ?? null, answer: a.spoken });
            }
        }
        perQuestion[id] = shuffle(entries, rng(`blind:h40a:${id}`));
    }
    const chunks = [];
    for (let i = 0; i < IDS.length; i += PER_FILE) chunks.push(IDS.slice(i, i + PER_FILE));
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
    console.log(`${chunks.length} files, ${IDS.length} ids; ${missing} arm answers missing (scored as no answer); instrument ${J.graderPromptVersion()}`);
}
