// The SAME 3.5-lite T04 answers (temp-bench/out/answers.high.T04.r1-3) were graded twice tonight: in the lite probe's
// blind files (neighbours: other lite answers) and in the Live probe's blind files (neighbours: Live answers). Prints,
// per item and rep, both sets' scores (c/o) and reasons. Calibration of the join: each answer is matched by exact text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
function graded(dir) {
    const byText = {};
    for (const n of [1, 2, 3]) {
        const pf = path.join(dir, `pairs.blind-${n}.json`);
        if (!fs.existsSync(pf)) continue;
        const pairs = J(pf).items, gs = ['g1', 'g2'].map((g) => J(path.join(dir, `verdicts.blind-${n}.${g}.json`)));
        for (const it of pairs) (byText[it.answer] ??= []).push(...gs.map((v) => v[it.key]));
    }
    return byText;
}
const lite = graded(path.join(SP, 'temp-bench', 'blind')), live = graded(path.join(HERE, 'blind'));
const items = process.argv.slice(2).length ? process.argv.slice(2) : ['S1Q02', 'S2Q10F', 'S2Q02'];
let matched = 0, total = 0;
for (const id of items) for (const rep of [1, 2, 3]) {
    const a = J(path.join(SP, 'temp-bench', 'out', `answers.high.T04.r${rep}.json`))[id]?.spoken;
    total++;
    const L = lite[a], V = live[a];
    if (!L || !V) { console.log(`${id} r${rep}: NOT MATCHED (lite ${!!L}, live ${!!V})`); continue; }
    matched++;
    const f = (vs) => vs.map((v) => `${v.correctness}/${v.on_topic}`).join(' ');
    console.log(`${id} r${rep}  lite-files ${f(L)}  live-files ${f(V)}`);
    for (const v of L) console.log(`    lite: ${String(v.reason).slice(0, 150)}`);
    for (const v of V) console.log(`    live: ${String(v.reason).slice(0, 150)}`);
}
console.log(`matched ${matched}/${total}`);
