// THROWAWAY: the judge counts PAIRS (a doubled question contributes two verdicts). This
// prints the per-QUESTION view of a merged judge file: for each spoken main, the best verdict
// among its answers, plus how the doubles graded (head-only answer vs the later one).
import fs from 'node:fs';
const file = process.argv[2];
if (!file) { console.error('usage: per-question.mjs <interview60.judge[.model].json>'); process.exit(2); }
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const RANK = { acceptable: 3, weak: 2, wrong: 1, error: 0 };
const byId = new Map();
for (const [key, v] of Object.entries(j.items ?? {})) {
    if (v.kind !== 'spoken') continue;
    const id = v.id ?? key.replace(/[#@].*$/, '');
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push({ key, level: v.level, verdict: v.verdict, at: v.dispatchedAt ?? 0, reason: v.reason ?? '' });
}
const isMain = (l) => l !== 'long' && l !== 'followup';
let mainsBest = { acceptable: 0, weak: 0, wrong: 0, error: 0 }, mains = 0, doubled = 0, doubledFirstWeakLaterOk = 0, doubledAllOk = 0;
const rows = [];
for (const [id, list] of [...byId].sort()) {
    list.sort((a, b) => a.at - b.at);
    const best = list.reduce((m, x) => (RANK[x.verdict] ?? -1) > (RANK[m.verdict] ?? -1) ? x : m, list[0]);
    if (isMain(list[0].level)) {
        mains++; mainsBest[best.verdict] = (mainsBest[best.verdict] ?? 0) + 1;
        if (list.length > 1) {
            doubled++;
            if (list.every((x) => x.verdict === 'acceptable')) doubledAllOk++;
            else if (list[0].verdict !== 'acceptable' && list.slice(1).some((x) => x.verdict === 'acceptable')) doubledFirstWeakLaterOk++;
        }
    }
    rows.push(`  ${id.padEnd(7)} ${String(list[0].level).padEnd(11)} ${list.map((x) => x.verdict).join(' → ').padEnd(34)} ${best.verdict !== 'acceptable' ? best.reason.slice(0, 90) : ''}`);
}
console.log(`${file.split(/[\\/]/).pop()}  model=${j.model}  grader=${j.graderPrompt}`);
console.log(`mains by QUESTION (best of its answers): ${mains} questions — acceptable ${mainsBest.acceptable}, weak ${mainsBest.weak}, wrong ${mainsBest.wrong}${mainsBest.error ? `, error ${mainsBest.error}` : ''}`);
console.log(`doubled mains: ${doubled} — all answers acceptable ${doubledAllOk}, first not acceptable but a later one is ${doubledFirstWeakLaterOk}`);
console.log(rows.join('\n'));
