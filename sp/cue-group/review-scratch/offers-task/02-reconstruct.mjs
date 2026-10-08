// Rebuilds the four files from BASE 18da7fa plus the brief's code blocks, applied mechanically, and compares each with
// the working tree byte for byte. Every anchor must occur exactly once in BASE. Also writes the base and working copies
// of verbalStreamFilter.ts to this folder (base.ts, work.ts) for the behavioural checks.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const BASE = '18da7fa11ed8736e20f67109e74f9a73568788b3';
const blocks = JSON.parse(fs.readFileSync(new URL('./blocks.json', import.meta.url), 'utf8'));
const B = (k) => blocks[k].body.join('\n');
const base = (p) => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: WT, encoding: 'utf8', maxBuffer: 64 << 20 });
const work = (p) => fs.readFileSync(`${WT}/${p}`, 'utf8');
const count = (s, sub) => { let n = 0, i = 0; while ((i = s.indexOf(sub, i)) !== -1) { n++; i += sub.length; } return n; };
let problems = 0;
function replaceOnce(s, oldT, newT, label) {
    const n = count(s, oldT);
    if (n !== 1) { console.log(`ANCHOR ${label}: occurs ${n} times in BASE`); problems++; return s; }
    return s.replace(oldT, () => newT);
}
function compare(label, expected, actual) {
    if (expected === actual) { console.log(`${label}: IDENTICAL to BASE + brief (${actual.length} chars)`); return; }
    problems++;
    let i = 0; while (i < expected.length && expected[i] === actual[i]) i++;
    const line = expected.slice(0, i).split('\n').length;
    console.log(`${label}: DIFFERS at char ${i} (line ${line}); expected len ${expected.length}, actual ${actual.length}`);
    console.log('  expected: ' + JSON.stringify(expected.slice(Math.max(0, i - 80), i + 120)));
    console.log('  actual  : ' + JSON.stringify(actual.slice(Math.max(0, i - 80), i + 120)));
}

// verbalStreamFilter.ts: Edits A-D
{
    const p = 'electron/llm/verbalStreamFilter.ts';
    let s = base(p);
    fs.writeFileSync(new URL('./base.ts', import.meta.url), s);
    fs.writeFileSync(new URL('./work.ts', import.meta.url), work(p));
    s = replaceOnce(s, B(8), B(9), 'Edit A');
    s = replaceOnce(s, B(10), B(11), 'Edit B');
    s = replaceOnce(s, B(12), B(13), 'Edit C');
    s = replaceOnce(s, B(14), B(15), 'Edit D');
    compare(p, s, work(p));
}
// verbalStreamFilter.test.ts: line 1 import, 1a insertion before the cutAtWordBudget describe
{
    const p = 'electron/llm/verbalStreamFilter.test.ts';
    let s = base(p);
    const OLD1 = "import { describe, it, expect, vi } from 'vitest';\n";
    if (!s.startsWith(OLD1)) { console.log('line 1 anchor not at start of BASE'); problems++; }
    s = s.replace(OLD1, () => "import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';\n");
    const anchor = B(1) + '\n';
    s = replaceOnce(s, anchor, B(2) + '\n\n' + anchor, '1a anchor');
    compare(p, s, work(p));
}
// WhatToAnswerLLM.cues.test.ts: 1b replaces the end of the file
{
    const p = 'electron/llm/WhatToAnswerLLM.cues.test.ts';
    let s = base(p);
    s = replaceOnce(s, B(3), B(4), '1b end-of-file');
    const b = base(p);
    console.log(`  1b: BASE ends with the old block + ${JSON.stringify(b.slice(b.indexOf(B(3)) + B(3).length))}`);
    compare(p, s, work(p));
}
// WhatToAnswerLLM.hedgeCues.test.ts: 1c insertion before case E
{
    const p = 'electron/llm/WhatToAnswerLLM.hedgeCues.test.ts';
    let s = base(p);
    const anchor = B(5) + '\n';
    s = replaceOnce(s, anchor, B(6) + '\n' + anchor, '1c anchor');
    compare(p, s, work(p));
}
console.log(problems === 0 ? 'ALL FOUR FILES = BASE + the brief, verbatim' : `${problems} problem(s)`);
