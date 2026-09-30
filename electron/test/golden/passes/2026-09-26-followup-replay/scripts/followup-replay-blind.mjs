// Throwaway (h40c Task 6): builds BLINDED grading files for the follow-up parent restore
// replay. Same seeded-rng shuffle + PER_FILE chunking pattern as flash-h40b-blind-pairs.mjs
// (SP\flash-h40b-blind-pairs.mjs), applied to the 10 ids x 2 arms x 3 reps = 60 answers here.
//
//   node followup-replay-blind.mjs
//
// Reads the six answers files (A r1-3, B r1-3) from SP\followup-replay\, builds per id 6
// entries (A r1, A r2, A r3, B r1, B r2, B r3) shuffled deterministically per id, keys
// `${id}#${n}`, `question` = J.questionForGrader(timelineItem, timeline.items) so the blind
// grader sees the same "[Follow-up to: ...]" framing as the standard judge — the h40b lesson
// (a follow-up's bare question graded acceptable blind but wrong standard because the blind
// pairs builder had not called questionForGrader). PER_FILE=4 -> 3 files (10 ids / 4).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const SP = 'C:\\Users\\sotka\\AppData\\Local\\Temp\\claude\\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\\9c5886c7-cdbd-48af-b8bc-e9275012ec64\\scratchpad';
const REPLAY_DIR = path.join(SP, 'followup-replay');
const OUT = path.join(REPLAY_DIR, 'blind');
const RUN_DIR = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', '2026-09-22T08-22-50-s50m');

const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const TL = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'interview60.timeline.json'), 'utf8'));

export const TARGET_IDS = ['S1Q04F', 'S1Q05F', 'S1Q06F', 'S1Q07F', 'S1Q08F', 'S2Q04F', 'S2Q05F', 'S2Q06F', 'S2Q07F', 'S2Q08F'];
export const PER_FILE = 4;
const REPS = [1, 2, 3];
const ARMS = ['A', 'B'];

const fileFor = (arm, rep) => path.join(REPLAY_DIR, `interview60.answers.gemini-3.1-flash-lite_fparent-${arm}-r${rep}.json`);

function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const load = (f) => { if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); } return JSON.parse(fs.readFileSync(f, 'utf8')); };

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('followup-replay-blind.mjs')) {
    if (fs.existsSync(OUT) && fs.readdirSync(OUT).some((f) => /^verdicts\./.test(f))) { console.error(`${OUT} already holds verdicts — refusing to rebuild the keys under them`); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });

    const answers = {};
    for (const arm of ARMS) for (const rep of REPS) answers[`${arm}${rep}`] = load(fileFor(arm, rep));

    const missing = [];
    const perQuestion = {};
    for (const id of TARGET_IDS) {
        perQuestion[id] = [];
        for (const arm of ARMS) {
            for (const rep of REPS) {
                const x = answers[`${arm}${rep}`][id];
                if (!x?.spoken) { missing.push(`${arm}r${rep}:${id}`); continue; }
                perQuestion[id].push({ arm, rep, q: x.q, level: x.level ?? null, topic: x.topic ?? null, answer: x.spoken });
            }
        }
        perQuestion[id] = shuffle(perQuestion[id], rng(`blind:followup-replay:${id}`));
    }

    const chunks = [];
    for (let i = 0; i < TARGET_IDS.length; i += PER_FILE) chunks.push(TARGET_IDS.slice(i, i + PER_FILE));

    chunks.forEach((ids, n) => {
        const items = [], key = {};
        for (const id of ids) {
            const tlItem = TL.items.find((it) => it.id === id) ?? { id, q: perQuestion[id][0]?.q ?? '', chain: null };
            perQuestion[id].forEach((e, i) => {
                const k = `${id}#${i + 1}`;
                const question = J.questionForGrader(tlItem, TL.items);
                items.push({ key: k, id, kind: 'spoken', level: e.level, topic: e.topic, question, heard: e.q, source: 'answers-pass', answer: e.answer });
                key[k] = { arm: e.arm, rep: e.rep, id };
            });
        }
        fs.writeFileSync(path.join(OUT, `pairs.blind-${n + 1}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        fs.writeFileSync(path.join(OUT, `key.blind-${n + 1}.json`), JSON.stringify(key, null, 1));
        console.log(`pairs.blind-${n + 1}.json  ${items.length} items  ${ids.join(',')}`);
    });
    console.log(`${chunks.length} files, ${TARGET_IDS.length} ids; ${missing.length} arm answers missing (scored as no answer)${missing.length ? ': ' + missing.join(', ') : ''}; instrument ${J.graderPromptVersion()}`);
}
