// Calibration of 02-reconstruct: rebuild verbalStreamFilter.ts from BASE + brief, then compare it with (1) the working
// copy (expect equal), (2) the working copy with one character changed inside Edit D (expect a difference),
// (3) the working copy with one space appended to one line of the untouched stripCueBlock (expect a difference).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const BASE = '18da7fa11ed8736e20f67109e74f9a73568788b3';
const blocks = JSON.parse(fs.readFileSync(new URL('./blocks.json', import.meta.url), 'utf8'));
const B = (k) => blocks[k].body.join('\n');
let s = execFileSync('git', ['show', `${BASE}:electron/llm/verbalStreamFilter.ts`], { cwd: WT, encoding: 'utf8' });
for (const [o, n] of [[8, 9], [10, 11], [12, 13], [14, 15]]) s = s.replace(B(o), () => B(n));
const w = fs.readFileSync(new URL('./work.ts', import.meta.url), 'utf8');
const m1 = w.replace("if (spoke) { phase = 'tail';", "if (spoke) { phase = 'tail' ;");
const m2 = w.replace("const lead = pending.replace(/^\\s+/, '');", "const lead = pending.replace(/^\\s+/, ''); ");
console.log('mutations applied:', m1 !== w, m2 !== w);
console.log('work equal:', s === w, '| one char in Edit D equal:', s === m1, '| stripCueBlock line equal:', s === m2);
