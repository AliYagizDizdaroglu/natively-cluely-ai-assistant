// P5 build-blind-r40.mjs: the ONE blind grading batch of router40 (registration 6.1, A2.1 m4, A4 D1): live40's build-blind.mjs, three arms.
// Answers: A = live40-r1's 46, L = router40-L's answers, RL = the texts R's reader classes `answer` (Live's own). 47 items in live40 chain order are cut into 4 files of
// 12/12/12/11 whole items; inside a file the answers are shuffled (seed blind:router40:r1) and keyed q01..; arm, id and class live only in keyhold/key.json.
//   node build-blind-r40.mjs [--r-name router40-R] [--runs-dir <dir>] [--out-dir <dir>]
// ONLY the graded `router40-R` run is accepted (a router40-R-<hhmm> or any other name is refused), and only a complete one. Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAIN, R40, L40, readJson, loadItems, argOf } from '../r40-common.mjs';
import { readRun } from '../read-r.mjs';

const GRADE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const R_NAME = argOf(argv, '--r-name') ?? 'router40-R';
const RUNS = argOf(argv, '--runs-dir') ?? `${R40}/runs`;
const OUT = argOf(argv, '--out-dir') ?? GRADE;
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
if (R_NAME !== 'router40-R') refuse(`only the graded router40-R run is accepted (got "${R_NAME}"); a stopped run router40-R-<hhmm>, a smoke or any other name is never graded`);
const SEED = 'blind:router40:r1';
const J = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.judge.mjs`).href);

export function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const { items, chains } = loadItems();
const judgeItems = items.map((i) => ({ id: i.id, q: i.text, chain: i.parent ?? undefined }));
const rRun = readJson(`${RUNS}/${R_NAME}.json`), rAns = readJson(`${RUNS}/${R_NAME}.answers.json`);
if (rRun.complete !== true) refuse('router40-R is not a complete run (reading 1: never graded)');
if (rRun.dry && !argv.includes('--allow-dry')) refuse('router40-R is a dry (mock) run');
if (rRun.variant !== 'B') refuse('router40-R is not variant B');
const lFile = readJson(`${RUNS}/router40-L.answers.json`);
if (lFile.complete !== true) refuse('router40-L is not complete (reading 1: never graded)');
const aFile = readJson(`${L40}/runs/live40-r1.answers.json`);
const { rows } = readRun(rRun, rAns, { variant: 'B' });
const rClass = Object.fromEntries(rows.map((r) => [r.id, r]));

// one list of answers per item, in chain order
const order = chains.flatMap((c) => c.items);
const perItem = order.map((id) => {
    const it = items.find((x) => x.id === id), list = [];
    const q = J.questionForGrader(judgeItems.find((x) => x.id === id), judgeItems);
    if (it.parent) { if (!q.includes(' [Follow-up to: ')) throw new Error(`${id}: a follow-up without its parent text`); } else if (q !== it.text) throw new Error(`${id}: a main, but the grader question was decorated`);
    const a = aFile.answers[id];
    if (a?.text?.trim()) list.push({ arm: 'A', id, question: q, heard: a.heard, answer: a.text });
    const l = lFile.records[id];
    if (l?.spoken) list.push({ arm: 'L', id, question: q, heard: it.text, answer: l.spoken });
    const r = rClass[id];
    if (r.rc === 'answer') list.push({ arm: 'RL', id, question: q, heard: rAns.answers[id].heard, answer: r.T });
    return { id, list };
});
const sizes = [12, 12, 12, 11];
if (sizes.reduce((a, b) => a + b, 0) !== order.length) throw new Error('47 items expected');
fs.mkdirSync(path.join(OUT, 'blind'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'keyhold'), { recursive: true });
const key = {}; const summary = { A: 0, L: 0, RL: 0 };
let at = 0;
sizes.forEach((sz, f) => {
    const no = f + 1, tag = `blind-${no}`;
    const flat = perItem.slice(at, at + sz).flatMap((p) => p.list); at += sz;
    shuffle(flat, rng(SEED)); // a fresh stream per file, the one registered seed
    const pf = path.join(OUT, 'blind', `pairs.${tag}.json`);
    if (fs.existsSync(pf)) refuse(`${path.basename(pf)} exists; refusing to overwrite`);
    const list = [], km = {};
    flat.forEach((x, n) => {
        const k = `q${String(n + 1).padStart(2, '0')}`;
        list.push({ key: k, id: k, kind: 'spoken', level: null, topic: null, question: x.question, heard: x.heard, source: 'answers-pass', answer: x.answer });
        const it = items.find((y) => y.id === x.id);
        km[k] = { arm: x.arm, id: x.id, route: it.route, class: it.class, parent: it.parent ?? null };
        summary[x.arm]++;
    });
    fs.writeFileSync(pf, JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items: list }, null, 1));
    key[tag] = km;
});
const kf = path.join(OUT, 'keyhold', 'key.json');
if (fs.existsSync(kf)) refuse('keyhold/key.json exists; refusing to overwrite');
fs.writeFileSync(kf, JSON.stringify(key, null, 1));
// A's questions against live40's own blind file (via its key): 46/46
const lp = readJson(`${L40}/grade/blind/pairs.blind-1.json`).items, lk = readJson(`${L40}/grade/keyhold/key.json`);
const liveQ = Object.fromEntries(lp.map((p) => [lk[p.key].id, p.question]));
let eq = 0, nA = 0;
for (const [tag, km] of Object.entries(key)) { const items2 = readJson(path.join(OUT, 'blind', `pairs.${tag}.json`)).items; for (const [k, m] of Object.entries(km)) if (m.arm === 'A') { nA++; if (items2.find((x) => x.key === k).question === liveQ[m.id]) eq++; } }
console.log(`built ${sizes.length} files (${sizes.join('/')} items); answers A ${summary.A}, L ${summary.L}, RL ${summary.RL}; A questions equal live40's ${eq}/${nA}; instrument ${J.graderPromptVersion()}`);
if (eq !== nA || nA !== 46) { console.log('FAIL: A questions differ from live40\'s'); process.exit(1); }
