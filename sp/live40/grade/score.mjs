// Scores live40-r1: acceptable = both graders correctness 2 AND on_topic 2; wrong = any grader correctness 0. RH14 (no answer) is a miss.
// Prints ids, counts and scores only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const GRADE = path.dirname(fileURLToPath(import.meta.url));
const key = JSON.parse(fs.readFileSync(path.join(GRADE, 'keyhold/key.json'), 'utf8'));
const unanswered = JSON.parse(fs.readFileSync(path.join(GRADE, 'keyhold/unanswered.json'), 'utf8'));
const items = JSON.parse(fs.readFileSync(path.join(GRADE, '../items.json'), 'utf8')).items;
const V = ['g1', 'g2'].map((g) => JSON.parse(fs.readFileSync(path.join(GRADE, `blind/verdicts.blind-1.${g}.json`), 'utf8')));
const per = {};
for (const [k, m] of Object.entries(key)) {
    const [a, b] = [V[0][k], V[1][k]];
    per[m.id] = {
        k, route: m.route, fu: !!m.parent, g1: a, g2: b,
        acceptable: a.correctness === 2 && a.on_topic === 2 && b.correctness === 2 && b.on_topic === 2,
        wrong: a.correctness === 0 || b.correctness === 0,
    };
}
const groupOf = (it) => (it.route === 'EASY' ? 'EASY' : it.parent ? 'HARD follow-up' : 'HARD standalone');
const G = {};
for (const it of items) {
    const g = (G[groupOf(it)] ??= { n: 0, answered: 0, acceptable: 0, wrong: 0, nonAcc: [], wrongIds: [], none: [] });
    g.n++;
    if (unanswered.includes(it.id)) { g.none.push(it.id); g.nonAcc.push(it.id); continue; }
    const p = per[it.id];
    g.answered++;
    if (p.acceptable) g.acceptable++; else g.nonAcc.push(it.id);
    if (p.wrong) { g.wrong++; g.wrongIds.push(it.id); }
}
const total = { n: 0, answered: 0, acceptable: 0, wrong: 0 };
const lines = [];
lines.push('| group | items | answered | acceptable | wrong (any grader c=0) | not acceptable (incl. unanswered) |');
lines.push('|---|---|---|---|---|---|');
for (const name of ['EASY', 'HARD standalone', 'HARD follow-up']) {
    const g = G[name];
    for (const f of Object.keys(total)) total[f] += g[f];
    lines.push(`| ${name} | ${g.n} | ${g.answered} | ${g.acceptable} | ${g.wrong} | ${g.nonAcc.length} |`);
}
lines.push(`| ALL | ${total.n} | ${total.answered} | ${total.acceptable} | ${total.wrong} | ${total.n - total.acceptable} |`);
const hard = ['HARD standalone', 'HARD follow-up'].map((n) => G[n]);
lines.push(`| HARD (both) | ${hard[0].n + hard[1].n} | ${hard[0].answered + hard[1].answered} | ${hard[0].acceptable + hard[1].acceptable} | ${hard[0].wrong + hard[1].wrong} | ${hard[0].nonAcc.length + hard[1].nonAcc.length} |`);
const out = [];
out.push(lines.join('\n'));
out.push('');
for (const name of Object.keys(G)) {
    const g = G[name];
    out.push(`${name}: wrong = [${g.wrongIds.join(', ')}]; not acceptable = [${g.nonAcc.join(', ')}]; no answer = [${g.none.join(', ')}]`);
}
out.push('');
// per non-acceptable answered item: the six scores
out.push('Scores of the answered non-acceptable items (g1 c/o/d | g2 c/o/d):');
for (const it of items) {
    const p = per[it.id]; if (!p || p.acceptable) continue;
    const s = (x) => `${x.correctness}/${x.on_topic}/${x.delivery}`;
    out.push(`  ${it.id} (${groupOf(it)}): ${s(p.g1)} | ${s(p.g2)}${p.wrong ? '  WRONG' : ''}`);
}
out.push('');
// agreement
const ans = Object.values(per);
const agree = (f) => ans.filter((p) => f(p.g1) === f(p.g2)).length;
const within1 = (f) => ans.filter((p) => Math.abs(f(p.g1) - f(p.g2)) <= 1).length;
const cls = (x) => (x.correctness === 0 || x.on_topic === 0 ? 'wrong' : x.correctness === 2 && x.on_topic === 2 ? 'ok' : 'weak');
out.push(`Grader agreement over ${ans.length} answered items:`);
out.push(`  correctness exact ${agree((x) => x.correctness)}/${ans.length}; on_topic exact ${agree((x) => x.on_topic)}/${ans.length}; delivery exact ${agree((x) => x.delivery)}/${ans.length}`);
out.push(`  class (wrong / weak / full c2+o2) same ${agree(cls)}/${ans.length}; per-grader acceptable (c2+o2): g1 ${ans.filter((p) => p.g1.correctness === 2 && p.g1.on_topic === 2).length}, g2 ${ans.filter((p) => p.g2.correctness === 2 && p.g2.on_topic === 2).length}; both ${ans.filter((p) => p.acceptable).length}`);
out.push(`  wrong per grader: g1 ${ans.filter((p) => p.g1.correctness === 0).length}, g2 ${ans.filter((p) => p.g2.correctness === 0).length}; both ${ans.filter((p) => p.g1.correctness === 0 && p.g2.correctness === 0).length}`);
out.push(`  disagreements on acceptable: [${Object.entries(per).filter(([, p]) => (p.g1.correctness === 2 && p.g1.on_topic === 2) !== (p.g2.correctness === 2 && p.g2.on_topic === 2)).map(([id]) => id).join(', ')}]`);
const dist = (g, f) => [0, 1, 2].map((v) => ans.filter((p) => p[g][f] === v).length).join('/');
out.push(`  score distributions 0/1/2 - g1 correctness ${dist('g1', 'correctness')} on_topic ${dist('g1', 'on_topic')}; g2 correctness ${dist('g2', 'correctness')} on_topic ${dist('g2', 'on_topic')}`);
console.log(out.join('\n'));
fs.writeFileSync(path.join(GRADE, 'score.out.txt'), out.join('\n') + '\n');
