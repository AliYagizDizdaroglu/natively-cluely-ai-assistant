// Throwaway: the holdout's follow-up questions (ids ending in F), what each follows, and how the
// arms and the live hour did on them vs the mains. Reads only.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const B = `${SP}/gemma-h40a/blind`;
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const { ARM_FILES } = await import(pathToFileURL(`${SP}/gemma-h40a-blind-pairs.mjs`).href);
const vOf = ({ correctness: c, on_topic: t, delivery: d }) => c === 0 || t === 0 ? 'wrong' : c === 2 && t === 2 && d >= 1 ? 'ok' : 'weak';
const pairs = JSON.parse(fs.readFileSync(`${RD}/interview60.judge.pairs.json`, 'utf8')).items;
const inV = JSON.parse(fs.readFileSync(`${SP}/h40a-verdicts-inapp.json`, 'utf8'));
const isF = (id) => /F$/.test(id);
const F = pairs.filter((p) => isF(p.key));
console.log(`${pairs.length} in-app items: ${pairs.length - F.length} mains, ${F.length} follow-ups\n`);
for (const p of F) {
    const main = pairs.find((m) => m.key === p.key.slice(0, -1));
    console.log(`${p.key.padEnd(5)} ${vOf(inV[p.key]).padEnd(5)} after ${main?.key ?? '?'} "${(main?.question ?? '').slice(0, 60)}"\n      -> "${p.question.slice(0, 110)}"`);
}
// Offline arms: acceptable rate on follow-ups vs mains, all 3 reps.
const tally = {};
for (const f of fs.readdirSync(B).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0], K = JSON.parse(fs.readFileSync(`${B}/${f}`, 'utf8')), V = JSON.parse(fs.readFileSync(`${B}/verdicts.blind-${n}.json`, 'utf8'));
    for (const [k, { arm, id }] of Object.entries(K)) {
        const t = (tally[arm] ??= { main: [0, 0], fu: [0, 0] })[isF(id) ? 'fu' : 'main'];
        t[1]++; if (vOf(V[k]) === 'ok') t[0]++;
    }
}
console.log('\nacceptable, 3 reps pooled:');
for (const [arm, t] of Object.entries(tally)) console.log(`  ${arm.padEnd(18)} mains ${t.main[0]}/${t.main[1]} (${Math.round(100 * t.main[0] / t.main[1])}%)   follow-ups ${t.fu[0]}/${t.fu[1]} (${Math.round(100 * t.fu[0] / t.fu[1])}%)`);
const live = { main: [0, 0], fu: [0, 0] };
for (const p of pairs) { const t = live[isF(p.key) ? 'fu' : 'main']; t[1]++; if (vOf(inV[p.key]) === 'ok') t[0]++; }
console.log(`  ${'live hour'.padEnd(18)} mains ${live.main[0]}/${live.main[1]}   follow-ups ${live.fu[0]}/${live.fu[1]}`);
