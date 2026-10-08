// Throwaway: every h40b roster item the IN-APP answer did not get right (not acceptable, unanswered or
// ungraded), with the question, the in-app answer's opening, the grader's reason, and how the offline arms
// did on the SAME item (acceptable / graded), which separates model capability from pipeline loss.
import fs from 'node:fs';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-26T11-39-51-h40b';
const J = (f) => JSON.parse(fs.readFileSync(`${RUN}/${f}`, 'utf8'));
const acc = (v) => v && v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1;
const inapp = J('interview60.judge.verdicts.json');
const pairs = J('interview60.judge.pairs.json');
const pairList = Array.isArray(pairs) ? pairs : Object.values(pairs.pairs ?? pairs);
const byId = {};
for (const p of pairList) { const id = p.id ?? p.item ?? p.key; if (id && !byId[id]) byId[id] = p; }
const arms = fs.readdirSync(RUN).filter((f) => /^interview60\.judge\.verdicts\..+\.json$/.test(f));
const armV = Object.fromEntries(arms.map((f) => [f.replace(/^interview60\.judge\.verdicts\.|\.json$/g, ''), J(f)]));
const roster = Object.keys(J('interview60.prompts.json')).concat(Object.keys(inapp)).filter((v, i, a) => a.indexOf(v) === i).sort();
const all = new Set([...roster, 'R05', 'R07F']);
let n = 0;
for (const id of [...all].sort()) {
    const v = inapp[id];
    if (acc(v)) continue;
    n++;
    const p = byId[id] ?? {};
    const q = String(p.question ?? p.q ?? p.played ?? '').replace(/\s+/g, ' ');
    const a = String(p.answer ?? p.inApp ?? p.spoken ?? '').replace(/\s+/g, ' ');
    const others = Object.entries(armV).filter(([, V]) => V[id]);
    const okOthers = others.filter(([, V]) => acc(V[id])).length;
    const grade = v ? `c${v.correctness} o${v.on_topic} d${v.delivery}` : 'NO IN-APP VERDICT';
    console.log(`\n${id}  in-app ${grade}  | other arms acceptable ${okOthers}/${others.length}`);
    if (q) console.log(`  Q: ${q.slice(0, 220)}`);
    if (a) console.log(`  A: ${a.slice(0, 220)}`);
    if (v?.reason) console.log(`  grader: ${v.reason}`);
}
console.log(`\nnot acceptable in-app: ${n}; pair keys sample: ${JSON.stringify(Object.keys(pairList[0] ?? {}))}`);
