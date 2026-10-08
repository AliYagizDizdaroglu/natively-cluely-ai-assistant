// Reviewer's own verbatim check (task 1): the brief's fenced blocks against the diff's hunk images.
const fs = require('fs');
const path = require('path');
const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const SDD = path.join(WT, '.superpowers', 'sdd', '2026-09-30-cue-early-close');
const brief = fs.readFileSync(path.join(SDD, 'task-1-brief.md'), 'utf8').replace(/\r\n/g, '\n');
let diff = fs.readFileSync(path.join(SDD, 'review-task1-e49886c..worktree.diff'), 'utf8').replace(/\r\n/g, '\n');
// Calibration: PERTURB=1 alters one test literal and the production regex inside the diff (in memory only).
if (process.env.PERTURB === '1') {
    diff = diff.replace("+        expect(r.reportedAfter).toBe(2);", "+        expect(r.reportedAfter).toBe(3);");
    diff = diff.replace("+const CUE_LINE_PREFIX = /^\\d+\\s*(\\|\\s*.*)?$/;", "+const CUE_LINE_PREFIX = /^\\d+\\s*(\\|.*)?$/;");
    diff = diff.replace("+    const DIES_INSIDE_THE_HOLDS = { thenFail: ['__CUES__\\n1| first stream cue a\\n', 'Te'] };", "+    const DIES_INSIDE_THE_HOLDS = { thenFail: ['__CUES__\\n1| first stream cue a\\n', 'Ten'] };");
}

// fenced blocks at column 0
const blocks = [];
{
    const lines = brief.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^```(\w*)$/);
        if (!m) continue;
        const start = i + 1;
        let j = start;
        while (j < lines.length && lines[j] !== '```') j++;
        blocks.push({ lang: m[1], line: start, text: lines.slice(start, j).join('\n') });
        i = j;
    }
}

// hunks per file: pre-image, post-image, added-only
const files = {};
{
    const parts = diff.split(/^diff --git /m).slice(1);
    for (const p of parts) {
        const name = p.match(/^a\/(\S+)/)[1];
        const hunks = [];
        for (const h of p.split(/^@@[^\n]*\n/m).slice(1)) {
            const ls = h.split('\n');
            const pre = [], post = [], added = [], removed = [];
            for (const l of ls) {
                if (l.startsWith('diff --git')) break;
                if (l.startsWith(' ')) { pre.push(l.slice(1)); post.push(l.slice(1)); }
                else if (l.startsWith('+')) { post.push(l.slice(1)); added.push(l.slice(1)); }
                else if (l.startsWith('-')) { pre.push(l.slice(1)); removed.push(l.slice(1)); }
                else if (l === '') { /* trailing */ }
                else if (l.startsWith('\\')) { /* no newline marker */ }
            }
            hunks.push({ pre: pre.join('\n'), post: post.join('\n'), added, removed });
        }
        files[name] = hunks;
    }
}

const count = (hay, needle) => { let n = 0, k = -1; while ((k = hay.indexOf(needle, k + 1)) !== -1) n++; return n; };
const show = (b) => `brief block @line ${b.line} (${b.lang || 'plain'}), first line: ${JSON.stringify(b.text.split('\n')[0].slice(0, 70))}`;

const VSF = 'electron/llm/verbalStreamFilter.ts';
const VSFT = 'electron/llm/verbalStreamFilter.test.ts';
const HEDGE = 'electron/llm/WhatToAnswerLLM.hedgeCues.test.ts';
console.log('files in diff:', Object.keys(files).map((f) => `${f} (${files[f].length} hunks)`).join(', '));

const byFirst = (s) => blocks.find((b) => b.text.startsWith(s));
const describeBlock = byFirst("describe('stripCueBlock — early close");
const hedgeBlock = byFirst('    // The window the early close narrows');
const editAold = blocks.find((b) => b.text === "const CUE_LINE = /^(\\d+)\\s*\\|\\s*(.+)$/;\nconst cuePhrase = (m: RegExpMatchArray): string => m[2].trim().replace(/^[\"'`]|[\"'`]$/g, '');");
const editAnew = byFirst("const CUE_LINE = /^(\\d+)\\s*\\|\\s*(.+)$/;\n/**");
const editBold = byFirst(' * Holds back only what it must: before the decision, at most a partial sentinel (so an\n * answer with no block is delayed by the length of "__CUES__" at most); inside the block,\n');
const editBnew = byFirst(' * Holds back only what it must: before the decision, at most a partial sentinel (so an\n * answer with no block is delayed by the length of "__CUES__" at most); inside the block, a\n');
const editCs = blocks.filter((b) => b.text.startsWith("            phase = 'prose';\n            report();\n            yield pending;   // this line and everything after it, intact"));
const [editCold, editCnew] = editCs;
for (const [k, v] of Object.entries({ describeBlock, hedgeBlock, editAold, editAnew, editBold, editBnew, editCold, editCnew })) {
    if (!v) { console.log('MISSING brief block:', k); process.exitCode = 1; }
}
if (process.exitCode) process.exit();

let ok = true;
const check = (label, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`); if (!cond) ok = false; };

// Test inserts: the added lines of the one hunk ARE the brief's block (plus exactly one blank separator line).
{
    const h = files[VSFT];
    check(`${VSFT}: exactly one hunk, no removed line`, h.length === 1 && h[0].removed.length === 0);
    const added = h[0].added.join('\n');
    check(`${VSFT}: added lines == brief describe + one blank line`, added === describeBlock.text + '\n', `added ${h[0].added.length} lines, brief ${describeBlock.text.split('\n').length}`);
    check(`${VSFT}: inserted right before the trimCues describe`, h[0].post.includes(describeBlock.text + "\n\ndescribe('trimCues — the cue block as DISPLAYED"));
    check(`${VSFT}: inserted right after the stripCueBlock describe's close`, h[0].post.includes("    });\n});\n\n" + describeBlock.text));
}
{
    const h = files[HEDGE];
    check(`${HEDGE}: exactly one hunk, no removed line`, h.length === 1 && h[0].removed.length === 0);
    const added = h[0].added.join('\n');
    check(`${HEDGE}: added lines == brief D2/D3 block (which ends in its blank line)`, added === hedgeBlock.text, `added ${h[0].added.length} lines, brief ${hedgeBlock.text.split('\n').length}`);
    check(`${HEDGE}: sits between case D's close + blank line and case E`, h[0].post.includes("    });\n\n" + hedgeBlock.text + "\n    it('E. hedge OFF"));
}
// Production edits: each "Replace" in some pre-image, each "with" in the matching post-image, once.
{
    const h = files[VSF];
    check(`${VSF}: three hunks`, h.length === 3);
    const pairs = [['A', editAold, editAnew], ['B', editBold, editBnew], ['C', editCold, editCnew]];
    pairs.forEach(([name, o, n], i) => {
        check(`Edit ${name}: brief "Replace" text in hunk ${i + 1} pre-image, once`, count(h[i].pre, o.text) === 1);
        check(`Edit ${name}: brief "with" text in hunk ${i + 1} post-image, once`, count(h[i].post, n.text) === 1);
        // the hunk's net change is exactly the brief's replacement: pre with o replaced by n == post
        check(`Edit ${name}: pre-image with Replace->with applied == post-image`, h[i].pre.replace(o.text, n.text) === h[i].post);
    });
    const totalAdded = h.reduce((s, x) => s + x.added.length, 0), totalRemoved = h.reduce((s, x) => s + x.removed.length, 0);
    console.log(`     ${VSF}: +${totalAdded} -${totalRemoved}`);
}
console.log(ok ? 'ALL VERBATIM' : 'NOT VERBATIM');
