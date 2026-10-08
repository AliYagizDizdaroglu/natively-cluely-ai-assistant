// Throwaway: every non-acceptable blind answer on h40a with the grader's reason, grouped by question,
// plus the live hour's misses — the raw material for a "why it failed" summary. Reads only.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const B = `${SP}/gemma-h40a/blind`;
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const vOf = ({ correctness: c, on_topic: t, delivery: d }) => c === 0 || t === 0 ? 'wrong' : c === 2 && t === 2 && d >= 1 ? 'ok' : 'weak';
const ab = { '3.1-lite LOW': '3.1', '3.5-lite HIGH': '3.5', 'Gemma 26B MINIMAL': 'Gemma' };
const Q = {};
for (const f of fs.readdirSync(B).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0], K = JSON.parse(fs.readFileSync(`${B}/${f}`, 'utf8')), V = JSON.parse(fs.readFileSync(`${B}/verdicts.blind-${n}.json`, 'utf8'));
    const P = Object.fromEntries(JSON.parse(fs.readFileSync(`${B}/pairs.blind-${n}.json`, 'utf8')).items.map((i) => [i.key, i]));
    for (const [k, { arm, rep, id }] of Object.entries(K)) {
        Q[id] ??= { q: P[k].question, miss: [] };
        const v = vOf(V[k]);
        if (v !== 'ok') Q[id].miss.push(`${ab[arm]} r${rep} ${v}: ${V[k].reason}`);
    }
}
for (const [id, x] of Object.entries(Q).sort()) if (x.miss.length) {
    console.log(`\n${id}  ${x.q.slice(0, 170)}`);
    for (const m of x.miss.sort()) console.log(`   ${m.slice(0, 230)}`);
}
const inV = JSON.parse(fs.readFileSync(`${SP}/h40a-verdicts-inapp.json`, 'utf8'));
console.log('\nLIVE HOUR misses:');
for (const [k, v] of Object.entries(inV)) if (vOf(v) !== 'ok') console.log(`   ${k} ${vOf(v)}: ${String(v.reason).slice(0, 200)}`);
