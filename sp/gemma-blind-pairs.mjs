// Throwaway: builds BLINDED multi-arm grading files for the Gemma comparison.
//
// Why: tonight's re-grade of s50m's 3.1-lite captured-low arm (identical answers, identical
// frozen instrument 8564ba96369a) scored 22 acceptable where the 09-22 grader scored 29, with
// 7 down and 0 up. One grader instance's severity is larger than the arm differences being
// measured, so arms graded by different instances cannot be compared. Here every file holds
// EVERY arm's answer(s) to the same questions, shuffled under anonymous keys (S1Q02#1..#18),
// so each grader's severity lands on all six arms equally. The key file maps key -> arm/rep
// and is never shown to a grader.
//
// Arms: 3.1-lite LOW and 3.5-lite HIGH (s50m captured reps 1-3) and Gemma 31B/26B at MINIMAL
// and HIGH (this run). Struggle questions carry reps 1-3 of every arm; the rest carry rep 1.
// A missing or empty answer gets no item; the scorer counts it as NO ANSWER.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const ARMS = `${SP}/gemma-arms`;
const OUT = `${ARMS}/blind`;
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const J = await import(pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.judge.mjs').href);

const IDS = 'S1Q01F,S1Q02,S1Q02F,S1Q03,S1Q03F,S1Q04,S1Q04F,S1Q05,S1Q05F,S1Q06,S1Q06F,S1Q07,S1Q07F,S1Q08,S1Q08F,S1Q09,S1Q09F,S1Q10,S1Q10F,S2Q01,S2Q01F,S2Q02,S2Q02F,S2Q03,S2Q03F,S2Q04,S2Q04F,S2Q05,S2Q05F,S2Q06,S2Q06F,S2Q07,S2Q07F,S2Q08,S2Q08F,S2Q09,S2Q09F,S2Q10,S2Q10F'.split(',');
const STRUGGLE = 'S2Q02,S2Q06F,S2Q07F,S1Q02,S1Q04F,S2Q02F,S2Q10F,S1Q04,S1Q06,S1Q06F,S1Q10,S2Q08F'.split(',');
const REPS = ['', '-r2', '-r3'];
export const ARM_FILES = {
    '3.1-lite LOW': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.1-flash-lite_captured-low${r}.json`),
    '3.5-lite HIGH': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.5-flash-lite_captured-high${r}.json`),
    'Gemma 31B MINIMAL': REPS.map((r) => `${ARMS}/interview60.answers.gemma-4-31b-it_min${r}.json`),
    'Gemma 31B HIGH': REPS.map((r) => `${ARMS}/interview60.answers.gemma-4-31b-it_high${r}.json`),
    'Gemma 26B MINIMAL': REPS.map((r) => `${ARMS}/interview60.answers.gemma-4-26b-a4b-it_min${r}.json`),
    'Gemma 26B HIGH': REPS.map((r) => `${ARMS}/interview60.answers.gemma-4-26b-a4b-it_high${r}.json`),
};

// Deterministic shuffle per question, so a rebuild gives the same keys.
function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

if (process.argv[1] && process.argv[1].endsWith('gemma-blind-pairs.mjs')) {
    const stores = Object.fromEntries(Object.entries(ARM_FILES).map(([arm, files]) => [arm, files.map((f) => {
        if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
        return JSON.parse(fs.readFileSync(f, 'utf8'));
    })]));
    fs.mkdirSync(OUT, { recursive: true });
    const perQuestion = {};
    let missing = 0;
    for (const id of IDS) {
        const entries = [];
        for (const [arm, reps] of Object.entries(stores)) {
            for (let r = 0; r < (STRUGGLE.includes(id) ? 3 : 1); r++) {
                const a = reps[r][id];
                if (!a?.spoken) { missing++; continue; }
                entries.push({ arm, rep: r + 1, q: a.q, level: a.level ?? null, topic: a.topic ?? null, answer: a.spoken });
            }
        }
        perQuestion[id] = shuffle(entries, rng(`blind:${id}`));
    }
    // Files: struggle questions 3 per file (18 answers each), the rest 9 per file (6 each).
    const chunks = [];
    for (let i = 0; i < STRUGGLE.length; i += 3) chunks.push(STRUGGLE.slice(i, i + 3));
    const rest = IDS.filter((id) => !STRUGGLE.includes(id));
    for (let i = 0; i < rest.length; i += 9) chunks.push(rest.slice(i, i + 9));
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
    console.log(`${chunks.length} files; ${missing} arm answers missing (scored as no answer); instrument ${J.graderPromptVersion()}`);
}
