// Throwaway: are 3.5-lite HIGH's slow first tokens (>15 s) long thinking or waiting? Compare each slow
// call's thought-token count with the arm's typical count, and show R30 (slow in all three runs). Reads only.
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const { ARM_FILES } = await import(pathToFileURL(`${SP}/gemma-h40a-blind-pairs.mjs`).href);
const med = (a) => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; };
const all = [];
ARM_FILES['3.5-lite HIGH'].forEach((f, i) => {
    for (const [id, a] of Object.entries(JSON.parse(fs.readFileSync(f, 'utf8')))) all.push({ id, rep: i + 1, ttft: a.ttft, thoughts: a.thoughts });
});
const fast = all.filter((x) => x.ttft <= 15000), slow = all.filter((x) => x.ttft > 15000);
console.log(`3.5 HIGH calls: ${all.length}; thoughts field present on ${all.filter((x) => typeof x.thoughts === 'number').length}`);
console.log(`<=15 s: n=${fast.length} thoughts p50 ${med(fast.map((x) => x.thoughts))}   ttft p50 ${med(fast.map((x) => x.ttft))} ms`);
console.log(`>15 s : n=${slow.length} thoughts p50 ${med(slow.map((x) => x.thoughts))}   ttft p50 ${med(slow.map((x) => x.ttft))} ms`);
for (const x of slow.sort((a, b) => a.rep - b.rep || a.id.localeCompare(b.id))) console.log(`   r${x.rep} ${x.id.padEnd(5)} ttft ${(x.ttft / 1000).toFixed(1)} s  thoughts ${x.thoughts}`);
console.log('R30 all runs:', all.filter((x) => x.id === 'R30').map((x) => `r${x.rep} ${(x.ttft / 1000).toFixed(1)} s / ${x.thoughts} thoughts`).join('   '));
