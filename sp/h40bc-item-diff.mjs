// Throwaway, read-only: per-item best in-app verdict on h40b vs h40c (from the merged judge files),
// listing every item whose verdict changed, to check the result note's "five each way" claim.
import fs from 'node:fs';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const RANK = { acceptable: 2, weak: 1, wrong: 0 };
function best(dir) {
    const tl = JSON.parse(fs.readFileSync(`${RUNS}/${dir}/interview60.timeline.json`, 'utf8'));
    const j = JSON.parse(fs.readFileSync(`${RUNS}/${dir}/interview60.judge.json`, 'utf8'));
    const out = {};
    for (const it of tl.items) out[it.id] = 'unanswered';
    for (const [key, v] of Object.entries(j.items)) {
        const id = v.id ?? key.replace(/#\d+$/, '');
        if (out[id] === 'unanswered' || RANK[v.verdict] > RANK[out[id]]) out[id] = v.verdict;
    }
    return out;
}
const b = best('2026-09-26T11-39-51-h40b');
const c = best('2026-09-29T11-42-00-h40c');
const ups = [], downs = [], same = [];
for (const id of Object.keys(c)) {
    if (b[id] === c[id]) { if (c[id] !== 'acceptable') same.push(`${id}:${c[id]}`); continue; }
    const rb = RANK[b[id]] ?? -1, rc = RANK[c[id]] ?? -1;
    (rc > rb ? ups : downs).push(`${id}: ${b[id]} -> ${c[id]}`);
}
console.log('better on h40c:', ups.join(' | '));
console.log('worse on h40c :', downs.join(' | '));
console.log('same, not acceptable:', same.join(' '));
const cnt = (o) => Object.values(o).filter((v) => v === 'acceptable').length;
console.log(`acceptable items: h40b ${cnt(b)}, h40c ${cnt(c)}`);
