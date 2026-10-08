// Throwaway (scratchpad): prove that the five inserted blocks are byte-verbatim from the brief.
// Reads the brief, extracts its fenced blocks, checks each target file contains the block as one contiguous substring.
const fs = require('fs');
const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const brief = fs.readFileSync(WT + '\\.superpowers\\sdd\\2026-09-30-cue-early-close\\task-1-brief.md', 'utf8');
const lines = brief.split('\n');
const blocks = [];
let cur = null;
for (const line of lines) {
    if (/^```/.test(line)) {
        if (cur === null) cur = { info: line.slice(3).trim(), body: [] };
        else { blocks.push(cur); cur = null; }
    } else if (cur) cur.body.push(line);
}
const text = (b) => { const a = b.body.slice(); while (a.length && a[a.length - 1] === '') a.pop(); return a.join('\n'); };

const find = (pred, label) => {
    const hits = blocks.filter(pred);
    if (hits.length !== 1) throw new Error(label + ': expected exactly 1 matching block in the brief, found ' + hits.length);
    return text(hits[0]);
};

const P = WT + '\\electron\\llm\\';
const src = fs.readFileSync(P + 'verbalStreamFilter.ts', 'utf8');
const tst = fs.readFileSync(P + 'verbalStreamFilter.test.ts', 'utf8');
const hdg = fs.readFileSync(P + 'WhatToAnswerLLM.hedgeCues.test.ts', 'utf8');

const checks = [
    ['parser tests (Step 1, file 1)', find((b) => b.body[0] && b.body[0].startsWith("describe('stripCueBlock — early close"), 'parser tests'), tst],
    ['hedge tests D2 + D3 (Step 1, file 2)', find((b) => b.body[0] && b.body[0].startsWith('    // The window the early close narrows'), 'hedge tests'), hdg],
    ['Edit A (predicate)', find((b) => b.body.some((l) => l.startsWith('const CUE_LINE_PREFIX')) && b.body.some((l) => l.startsWith('/**')), 'edit A'), src],
    ['Edit B (doc comment)', find((b) => b.body.some((l) => l.includes('partial line only while it can still become a cue line')), 'edit B'), src],
    ['Edit C (early close)', find((b) => b.body.some((l) => l.includes('// Early close (spec 2026-09-30 cue-early-close)')), 'edit C'), src],
];
let bad = 0;
for (const [label, block, file] of checks) {
    const ok = file.includes(block);
    const count = file.split(block).length - 1;
    console.log((ok ? 'OK   ' : 'FAIL ') + label + '  (' + block.split('\n').length + ' lines, found ' + count + 'x)');
    if (!ok) bad++;
}
for (const [name, f] of [['verbalStreamFilter.ts', src], ['verbalStreamFilter.test.ts', tst], ['WhatToAnswerLLM.hedgeCues.test.ts', hdg]]) {
    console.log(name + ': raw CR bytes = ' + (f.match(/\r/g) || []).length + ', BOM = ' + (f.charCodeAt(0) === 0xFEFF) + ', ends with newline = ' + f.endsWith('\n'));
}
console.log(bad === 0 ? 'ALL VERBATIM' : 'MISMATCHES: ' + bad);
process.exit(bad === 0 ? 0 : 1);
