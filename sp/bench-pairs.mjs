/**
 * THROWAWAY BENCH — build a BLINDED, PAIRED pairs file for the frozen grader from two arms'
 * rep files: for every question both answers appear, adjacent, under the harness's own
 * doubled-key convention (S1Q02 and S1Q02#2), with which arm got the plain key decided by a
 * coin flip per question and recorded in a key file the grader never sees. One grader
 * instance scores both answers to a question, so its severity cancels inside the pair.
 *
 *   node bench-pairs.mjs --a control --arep 1 --b coverage --brep 1 --half 1|2
 *
 * Writes bench/pairs.<a>r<arep>-vs-<b>r<brep>.h<half>.json (for the grader) and the matching
 * .key.json (for bench-score.mjs). Halves split the 39 questions so a grader run stays ~40 items.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const OUT = path.join(HERE, 'bench');
const { RUBRIC } = await import(`file:///${path.join(PROJ, '.claude/worktrees/whole-turn/electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);
const { SCENARIO50 } = await import(`file:///${path.join(PROJ, 'electron/test/golden/scenario50.questions.mjs').replace(/\\/g, '/')}`);

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const A = arg('--a'), AREP = arg('--arep'), B = arg('--b'), BREP = arg('--brep'), HALF = Number(arg('--half'));
if (!A || !AREP || !B || !BREP || ![1, 2].includes(HALF)) { console.error('usage: --a <arm> --arep <n> --b <arm> --brep <n> --half 1|2'); process.exit(2); }

const load = (arm, rep) => JSON.parse(fs.readFileSync(path.join(OUT, `${arm}.rep${rep}.json`), 'utf8'));
const sa = load(A, AREP), sb = load(B, BREP);
const byId = new Map(SCENARIO50.map((i) => [i.id, i]));

// The grader sees the scripted question, with a follow-up's parent appended the way the
// harness does it (interview60.judge.mjs pairAnswers), so it grades against the whole thing.
const questionFor = (id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`roster has no ${id}`);
    const parent = item.chain ? byId.get(item.chain) : null;
    return parent ? `${item.q} [Follow-up to: ${parent.q}]` : item.q;
};

const ids = Object.keys(sa).filter((id) => sa[id]?.spoken && sb[id]?.spoken).sort();
const half = ids.filter((_, n) => (n % 2 === 0) === (HALF === 1));
const tag = `${A}r${AREP}-vs-${B}r${BREP}.h${HALF}`;
// Deterministic coin per (comparison, question): reproducible, and different questions flip
// independently, so position never tells the grader which arm is which.
const coin = (id) => createHash('sha256').update(`${tag}:${id}`).digest()[0] % 2 === 0;

const items = [], key = {};
for (const id of half) {
    const item = byId.get(id);
    const aFirst = coin(id);
    const first = aFirst ? { arm: A, rep: AREP, v: sa[id] } : { arm: B, rep: BREP, v: sb[id] };
    const second = aFirst ? { arm: B, rep: BREP, v: sb[id] } : { arm: A, rep: AREP, v: sa[id] };
    for (const [k, x] of [[id, first], [`${id}#2`, second]]) {
        items.push({ key: k, id, kind: 'spoken', level: item.level ?? null, topic: item.topic ?? null, question: questionFor(id), heard: questionFor(id), source: 'bench', verdict: 'n/a', dispatchedAt: null, answer: x.v.spoken, model: 'bench' });
        key[k] = { id, arm: x.arm, rep: x.rep, words: x.v.words };
    }
}
fs.writeFileSync(path.join(OUT, `pairs.${tag}.json`), JSON.stringify({ model: 'bench', rubric: RUBRIC, items }, null, 1));
fs.writeFileSync(path.join(OUT, `pairs.${tag}.key.json`), JSON.stringify(key, null, 1));
console.log(`${tag}: ${half.length} questions, ${items.length} items -> bench/pairs.${tag}.json (+ .key.json)`);
