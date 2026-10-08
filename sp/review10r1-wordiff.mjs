// Read-only: word-level comparison of HEAD vs working tree for the ANSWER_MODELS comment
// (flight.mjs) and README line 161, to prove the Gemma facts and the rest of each sentence
// are unchanged apart from the intended edits.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const head = (rel) => execFileSync('git', ['-C', MAIN, 'show', `HEAD:${rel}`], { encoding: 'utf8' });
const now = (rel) => fs.readFileSync(path.join(MAIN, rel), 'utf8');

function commentAbove(text, marker) {
    const lines = text.split('\n');
    const i = lines.findIndex((l) => l.startsWith(marker));
    let j = i - 1;
    while (j >= 0 && lines[j].startsWith('//')) j--;
    return lines.slice(j + 1, i).map((l) => l.replace(/^\/\/ ?/, '')).join(' ').replace(/\s+/g, ' ').trim();
}
const F = 'electron/test/golden/interview60.flight.mjs';
const a = commentAbove(head(F), 'export const ANSWER_MODELS');
const b = commentAbove(now(F), 'export const ANSWER_MODELS');
const tailA = a.slice(a.indexOf('Both Gemma arms are deliberately absent.'));
const tailB = b.slice(b.indexOf('Both Gemma arms are deliberately absent.'));
console.log('Gemma paragraph identical to HEAD (whitespace-normalised):', tailA === tailB, `(${tailA.length} chars)`);
console.log('HEAD head :', a.slice(0, a.indexOf('Both Gemma')));
console.log('NOW  head :', b.slice(0, b.indexOf('Both Gemma')));

const R = 'electron/test/golden/README.md';
const la = head(R).split('\n')[160], lb = now(R).split('\n')[160];
const pre = (s) => s.slice(0, s.indexOf('the arms in `interview60.flight.mjs` ('));
const post = (s) => s.slice(s.indexOf(') — and every item records its `model`.'));
console.log('README 161 text before the parenthetical identical:', pre(la) === pre(lb));
console.log('README 161 text after the parenthetical identical: ', post(la) === post(lb));
console.log('README 161 parenthetical now:', lb.slice(lb.indexOf('the arms in `interview60.flight.mjs` ('), lb.indexOf(') — and every item records')));

// Every changed line number, HEAD vs now, per file (LCS-free: compare via git numstat and --word-diff=porcelain count).
for (const rel of [F, R, 'electron/test/golden/interview60.flight.test.ts']) {
    const out = execFileSync('git', ['-C', MAIN, 'diff', '--unified=0', '--', rel], { encoding: 'utf8' });
    const hunks = [...out.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => `-${m[1]},${m[2] ?? 1} +${m[3]},${m[4] ?? 1}`);
    console.log(`${rel}: hunks ${hunks.join('  ')}`);
}
