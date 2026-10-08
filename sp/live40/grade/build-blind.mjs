// Builds the ONE blind grading file for live40-r1 (46 answered items). Approach of followup-turn-blind.mjs, MAIN's judge exports.
// Neutral keys q01..q46 after a seeded shuffle; the key map goes to keyhold/key.json (outside the blind folder).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const GRADE = path.dirname(fileURLToPath(import.meta.url));
const L40 = path.dirname(GRADE);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);

export function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SEED = 'blind:live40:r1';

const items = JSON.parse(fs.readFileSync(path.join(L40, 'items.json'), 'utf8')).items;
const run = JSON.parse(fs.readFileSync(path.join(L40, 'runs/live40-r1.answers.json'), 'utf8'));
const judgeItems = items.map((i) => ({ id: i.id, q: i.text, chain: i.parent ?? undefined }));

const answered = [], unanswered = [];
for (const it of items) {
    const a = run.answers[it.id];
    if (!a || !a.text || !a.text.trim()) { unanswered.push(it.id); continue; }
    answered.push(it);
}
if (answered.length !== 46 || unanswered.join() !== 'RH14') throw new Error(`expected 46 answered and RH14 unanswered, got ${answered.length} / ${unanswered}`);

shuffle(answered, rng(SEED));
const list = [], keyMap = {};
answered.forEach((it, n) => {
    const key = `q${String(n + 1).padStart(2, '0')}`;
    const q = J.questionForGrader(judgeItems.find((x) => x.id === it.id), judgeItems);
    if (it.parent) { if (!q.includes(' [Follow-up to: ')) throw new Error(`${it.id}: follow-up without parent text`); }
    else if (q !== it.text) throw new Error(`${it.id}: a main, but the grader question was decorated`);
    const a = run.answers[it.id];
    list.push({ key, id: key, kind: 'spoken', level: null, topic: null, question: q, heard: a.heard, source: 'answers-pass', answer: a.text });
    keyMap[key] = { id: it.id, route: it.route, class: it.class, parent: it.parent ?? null };
});
fs.mkdirSync(path.join(GRADE, 'blind'), { recursive: true });
fs.mkdirSync(path.join(GRADE, 'keyhold'), { recursive: true });
const pf = path.join(GRADE, 'blind/pairs.blind-1.json');
if (fs.existsSync(pf)) throw new Error('pairs.blind-1.json exists; refusing');
fs.writeFileSync(pf, JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items: list }, null, 1));
fs.writeFileSync(path.join(GRADE, 'keyhold/key.json'), JSON.stringify(keyMap, null, 1));
fs.writeFileSync(path.join(GRADE, 'keyhold/unanswered.json'), JSON.stringify(unanswered));
console.log(`pairs.blind-1.json ${list.length} answers; follow-ups ${answered.filter((i) => i.parent).length}; unanswered ${unanswered}; instrument ${J.graderPromptVersion()}`);
