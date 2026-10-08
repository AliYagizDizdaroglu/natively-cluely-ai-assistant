// Blind grading files for the 3.8 Live temperature probe. Per item, twelve answers judged together by ONE grader:
//   LT04   tonight's Live, temperature 0.4, r1-r3          (runs/live38-T04-r*.answers.json)
//   LTDEF  tonight's Live, no temperature, r1-r3            (runs/live38-TDEF-r*.answers.json)
//   LPRIOR the L20b/L20c Live answers, no temperature, r1-r3 (2026-09-29/30)
//   APP    tonight's app answer model, 3.5-lite HIGH at 0.4 on s50m captured prompts (temp-bench T04 r1-r3)
// A Live item not answered (empty, apology, not played) is a hole: not graded, listed. Shuffled by a seeded rng;
// 2 files of 4 items; keys beside them, moved out before graders are dispatched. Question = questionForGrader on the
// s50m timeline, as every flight grades.
//   node blind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const TL = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const IDS = ['S2Q02', 'S2Q06F', 'S2Q07F', 'S1Q02', 'S1Q04F', 'S2Q02F', 'S2Q10F', 'S1Q02F'];
const BLIND = path.join(HERE, 'blind');
if (fs.existsSync(BLIND) && fs.readdirSync(BLIND).some((f) => /^verdicts\./.test(f))) { console.error('blind/ already holds verdicts'); process.exit(2); }
const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
const l20bIds = new Set(JSON.parse(fs.readFileSync(`${SP}/l20b/items.json`, 'utf8')).pairs.flat());
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
function rng(seedText) { let h = 2166136261; for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const holes = [], per = {};
for (const id of IDS) {
    const set = [];
    for (const rep of [1, 2, 3]) {
        for (const arm of ['T04', 'TDEF']) {
            const a = load(path.join(HERE, 'runs', `live38-${arm}-r${rep}.answers.json`))[id];
            if (isAnswered(a)) set.push({ arm: `L${arm}`, rep, answer: a.answer.trim() }); else holes.push(`${id} L${arm} r${rep}`);
        }
        const p = load(`${SP}/${l20bIds.has(id) ? 'l20b' : 'l20c'}/runs/live38-r${rep}.answers.json`)[id];
        if (isAnswered(p)) set.push({ arm: 'LPRIOR', rep, answer: p.answer.trim() }); else holes.push(`${id} LPRIOR r${rep}`);
        const app = load(`${SP}/temp-bench/out/answers.high.T04.r${rep}.json`)[id];
        if (app?.spoken) set.push({ arm: 'APP', rep, answer: app.spoken }); else holes.push(`${id} APP r${rep}`);
    }
    per[id] = shuffle(set, rng(`blind:temp-live:${id}`));
}
fs.mkdirSync(BLIND, { recursive: true });
for (let n = 0; n * 4 < IDS.length; n++) {
    const chunk = IDS.slice(n * 4, n * 4 + 4), items = [], key = {};
    for (const id of chunk) {
        const item = TL.items.find((x) => x.id === id);
        const question = J.questionForGrader(item, TL.items);
        per[id].forEach((e, i) => { const k = `${id}#${i + 1}`; items.push({ key: k, id, kind: 'spoken', level: null, topic: null, question, heard: item.q, source: 'answers-pass', answer: e.answer }); key[k] = { id, arm: e.arm, rep: e.rep }; });
    }
    fs.writeFileSync(path.join(BLIND, `pairs.blind-${n + 1}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
    fs.writeFileSync(path.join(BLIND, `key.blind-${n + 1}.json`), JSON.stringify(key, null, 1));
    console.log(`pairs.blind-${n + 1}.json  ${items.length} answers  ${chunk.join(',')}`);
}
console.log(`holes (not graded): ${holes.length ? holes.join('; ') : 'none'}; instrument ${J.graderPromptVersion()}`);
