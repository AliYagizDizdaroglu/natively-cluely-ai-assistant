// Blind grading files for the temperature probe. Per item, per leg (high = 3.5-lite HIGH, low = 3.1-lite LOW), nine
// answers: tonight's T04 r1-r3, tonight's TDEF r1-r3, and s50m's PRIOR captured twins at 0.4 (P04 r1-r3, 2026-09-22),
// so ONE grader judges all three sets (prior grades were by claude-opus-5; tonight's graders are opus 5.5). Shuffled by
// a seeded rng under keys `${id}.${leg}#${n}`; 3 files of 3 items; key files beside them, never shown to a grader.
// The grader's question: interview60.judge.mjs questionForGrader(s50m timeline item), as every flight grades.
//   node blind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const OUT = path.join(HERE, 'out'), BLIND = path.join(HERE, 'blind');
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const TL = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const { items } = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
if (fs.existsSync(BLIND) && fs.readdirSync(BLIND).some((f) => /^verdicts\./.test(f))) { console.error('blind/ already holds verdicts; refusing to rebuild keys'); process.exit(2); }
const LEGS = { high: ['captured-high', 'captured-high-r2', 'captured-high-r3'].map((t) => `gemini-3.5-flash-lite_${t}`), low: ['captured-low', 'captured-low-r2', 'captured-low-r3'].map((t) => `gemini-3.1-flash-lite_${t}`) };
const priorOf = (tag, id) => { const a = JSON.parse(fs.readFileSync(`${RUN}/interview60.answers.${tag}.json`, 'utf8')); const recs = Array.isArray(a) ? a : Object.values(a.items ?? a); return recs.find((x) => x.id === id); };
function rng(seedText) { let h = 2166136261; for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
fs.mkdirSync(BLIND, { recursive: true });
const missing = [], empty = [];
const per = {};
for (const { id } of items) for (const leg of Object.keys(LEGS)) {
    const set = [];
    for (const arm of ['T04', 'TDEF']) for (const rep of [1, 2, 3]) {
        const f = path.join(OUT, `answers.${leg}.${arm}.r${rep}.json`);
        const x = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8'))[id] : null;
        if (!x || x.transientError) { missing.push(`${id}.${leg}.${arm}.r${rep}`); continue; }
        if (!x.spoken) { empty.push(`${id}.${leg}.${arm}.r${rep}`); continue; }
        set.push({ arm, rep, answer: x.spoken });
    }
    LEGS[leg].forEach((tag, k) => { const x = priorOf(tag, id); if (!x?.spoken) { missing.push(`${id}.${leg}.P04.r${k + 1}`); return; } set.push({ arm: 'P04', rep: k + 1, answer: x.spoken }); });
    per[`${id}.${leg}`] = shuffle(set, rng(`blind:temp-probe:${id}.${leg}`));
}
const ids = items.map((x) => x.id);
for (let n = 0; n * 3 < ids.length; n++) {
    const chunk = ids.slice(n * 3, n * 3 + 3), out = [], key = {};
    for (const id of chunk) {
        const item = TL.items.find((x) => x.id === id);
        if (!item) { console.error(`${id} not in the s50m timeline`); process.exit(2); }
        const question = J.questionForGrader(item, TL.items);
        for (const leg of Object.keys(LEGS)) per[`${id}.${leg}`].forEach((e, i) => {
            const k = `${id}.${leg}#${i + 1}`;
            out.push({ key: k, id, kind: 'spoken', level: null, topic: null, question, heard: item.q, source: 'answers-pass', answer: e.answer });
            key[k] = { id, leg, arm: e.arm, rep: e.rep };
        });
    }
    fs.writeFileSync(path.join(BLIND, `pairs.blind-${n + 1}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items: out }, null, 1));
    fs.writeFileSync(path.join(BLIND, `key.blind-${n + 1}.json`), JSON.stringify(key, null, 1));
    console.log(`pairs.blind-${n + 1}.json  ${out.length} answers  ${chunk.join(',')}`);
}
console.log(`not graded (transient/missing): ${missing.length ? missing.join(', ') : 'none'}; empty after filters (scored wrong): ${empty.length ? empty.join(', ') : 'none'}; instrument ${J.graderPromptVersion()}`);
