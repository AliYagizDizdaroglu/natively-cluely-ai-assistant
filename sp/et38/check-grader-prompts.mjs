// Checks that the eight ET38 grader prompts are one text with only the packet letter and the grader number changed.
//   node check-grader-prompts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'grader-prompts');
const norm = new Set();
for (const p of ['A', 'B', 'C', 'D']) for (const g of [1, 2]) {
    const t = fs.readFileSync(path.join(DIR, `${p}-g${g}.txt`), 'utf8');
    const n = t.split(`packet-${p}.json`).join('packet-X.json').split(`verdicts-${p}-g${g}.json`).join('verdicts-X-gN.json');
    if (!t.includes(`packet-${p}.json`) || !t.includes(`verdicts-${p}-g${g}.json`)) { console.log(`${p}-g${g}: MISSING its own packet or verdicts path`); process.exit(1); }
    norm.add(n);
}
console.log(norm.size === 1 ? 'ONE TEXT: the eight prompts differ only in packet and grader number' : `DIFFER: ${norm.size} distinct texts`);
process.exit(norm.size === 1 ? 0 : 1);
