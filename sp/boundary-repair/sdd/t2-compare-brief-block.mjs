// Throwaway (Task 2): pull the Nth fenced code block out of task-2-brief.md and compare it byte for byte
// with a file. Calibrated by also comparing against a DIFFERENT block, which must say DIFFERENT.
//   node t2-compare-brief-block.mjs <block index, 0-based> <file to compare>
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SDD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair/sdd';
const brief = fs.readFileSync(`${SDD}/task-2-brief.md`, 'utf8');
const crInBrief = (brief.match(/\r/g) || []).length;
// fenced blocks: a line starting with ``` opens, the next line starting with ``` closes
const lines = brief.split('\n');
const blocks = [];
let cur = null;
for (const ln of lines) {
    if (ln.startsWith('```')) {
        if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; }
    } else if (cur !== null) cur.push(ln);
}
const [idxArg, file] = process.argv.slice(2);
const idx = Number(idxArg);
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
console.log(`brief: ${crInBrief} CR chars; ${blocks.length} fenced blocks`);
blocks.forEach((b, i) => console.log(`  block ${i}: ${b.length} chars, first line: ${b.split('\n')[0].slice(0, 70)}`));
const want = blocks[idx];
const have = fs.readFileSync(file, 'utf8');
console.log(`compare block ${idx} (${sha(want)}) with ${file.split('/').pop()} (${sha(have)}): ${want === have ? 'IDENTICAL' : 'DIFFERENT'}`);
if (want !== have) {
    let i = 0; while (i < want.length && i < have.length && want[i] === have[i]) i++;
    console.log(`  first difference at char ${i}: brief=${JSON.stringify(want.slice(i, i + 40))} file=${JSON.stringify(have.slice(i, i + 40))}`);
}
