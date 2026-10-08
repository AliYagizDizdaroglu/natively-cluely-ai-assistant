// Task 5 fix round 1 (throwaway): mutant runs on a MIRROR tree (with copies of the two committed runs, so the parity tests run).
// MAIN is only read. Each scenario = (a snapshot of the test file at a step, the module, optionally one single-edit mutation of it)
// with a PREDICTED failing set; the script prints the actual set and marks it as expected / UNEXPECTED.
//   node t5f1-mutants.mjs <set>      sets: f2-before | f2-after | f3-before | f3-after | final
// Test keys: T1 restored+raw, T2 interims/empties/since, T3 old adjacency test (v0-v3), T3r new refusal test (v4), P1/P2 parity.
import fs from 'node:fs';
import path from 'node:path';
import { HERE, makeMirror, MOD_REL, TEST_REL } from './t5f1-lib.mjs';
const setName = process.argv[2];
const steps = (f) => fs.readFileSync(path.join(HERE, 't5f1-steps', f), 'utf8');
const orig = (f) => fs.readFileSync(path.join(HERE, 't5f1-orig', f), 'utf8');
const brief = fs.readFileSync(path.join(HERE, 'task-5-brief.md'), 'utf8');
const blocks = [];
{ let cur = null; for (const ln of brief.split('\n')) { if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } } else if (cur !== null) cur.push(ln); } }
const OLD_PARSE = blocks[1];

const once = (text, label, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence of ${JSON.stringify(oldS)}, found ${n}`);
    return text.replace(oldS, () => newS);
};
const dropLine = (text, label, needle) => {
    const ls = text.split('\n');
    const hits = ls.filter((l) => l.includes(needle));
    if (hits.length !== 1) throw new Error(`mutation "${label}": expected exactly 1 line containing ${JSON.stringify(needle)}, found ${hits.length}`);
    return ls.filter((l) => !l.includes(needle)).join('\n');
};
const MUT = {
    control: (t) => t,
    old: () => OLD_PARSE,
    gt: (t) => once(t, 'gt', 'at >= sinceMs', 'at > sinceMs'),
    nosince: (t) => once(t, 'nosince', 'if (text && at >= sinceMs)', 'if (text)'),
    noempty: (t) => once(t, 'noempty', 'if (text && at >= sinceMs)', 'if (at >= sinceMs)'),
    order: (t) => once(t, 'order', '`${unq(rep[1])} ${unq(m[2])}`', '`${unq(m[2])} ${unq(rep[1])}`'),
    trim: (t) => once(t, 'trim', ': unq(m[2])).trim();', ': unq(m[2]));'),
    direction: (t) => once(t, 'direction', 'const rep = lines[i + 1]?.match(REPAIR);', 'const rep = lines[i - 1]?.match(REPAIR);'),
    nothrow1: (t) => dropLine(t, 'nothrow1', 'is a boundary repair with no final directly above it'),
    nothrow2: (t) => dropLine(t, 'nothrow2', 'is a boundary repair for another final than line'),
};
const keyOf = (title) => (/^a final directly followed by a boundary-repair line/.test(title) ? 'T1'
    : /^keeps interims and empty finals out/.test(title) ? 'T2'
    : /^a repair line that is not the very next line/.test(title) ? 'T3'
    : /^refuses a boundary-repair line that is not right under its own final/.test(title) ? 'T3r'
    : /2026-09-09T15-00-55-s50a fixture/.test(title) ? 'P1'
    : /2026-09-08T08-44-56-after9 fixture/.test(title) ? 'P2' : `? ${title}`);

const m0 = () => orig('interview60.turns-finals.mjs');
const m1 = () => steps('mod.m1.mjs');
// [label, test file text, base module text, mutation, predicted failing keys]
const SETS = {
    'f2-before': () => [
        ['v1 (before F2) + the `>` mutant: the gap, it survives', steps('test.v1.ts'), m0(), 'gt', []],
    ],
    'f2-after': () => [
        ['v2 (F2) + control', steps('test.v2.ts'), m0(), 'control', []],
        ['v2 (F2) + the `>` mutant', steps('test.v2.ts'), m0(), 'gt', ['T2']],
        ['v2 (F2) + no since filter', steps('test.v2.ts'), m0(), 'nosince', ['T2', 'P1', 'P2']],
    ],
    'f3-before': () => [
        ['v2 (before F3) + no empty-text filter', steps('test.v2.ts'), m0(), 'noempty', ['T1', 'P1', 'P2']],
    ],
    'f3-after': () => [
        ['v3 (F3) + control', steps('test.v3.ts'), m0(), 'control', []],
        ['v3 (F3) + no empty-text filter', steps('test.v3.ts'), m0(), 'noempty', ['T1', 'T2', 'P1', 'P2']],
    ],
    final: () => [
        ['control: v4 + the final module (m1)', steps('test.v4.ts'), m1(), 'control', []],
        ['the round-0 module (m0, no refusals)', steps('test.v4.ts'), m0(), 'control', ['T3r']],
        ['the old inline parse', steps('test.v4.ts'), m1(), 'old', ['T1', 'T2', 'T3r']],
        ['repair line looked up BEFORE the final', steps('test.v4.ts'), m1(), 'direction', ['T1', 'T2', 'T3r']],
        ['raw text first, restored words after', steps('test.v4.ts'), m1(), 'order', ['T1', 'T2']],
        ['no empty-text filter', steps('test.v4.ts'), m1(), 'noempty', ['T1', 'T2', 'P1', 'P2']],
        ['no since filter', steps('test.v4.ts'), m1(), 'nosince', ['T2', 'P1', 'P2']],
        ['since exclusive (`>` for `>=`)', steps('test.v4.ts'), m1(), 'gt', ['T2']],
        ['no .trim() (ruling: stays unpinned)', steps('test.v4.ts'), m1(), 'trim', []],
        ['throw 1 removed (repair line with no final directly above it)', steps('test.v4.ts'), m1(), 'nothrow1', ['T3r']],
        ['throw 2 removed (repair under another final)', steps('test.v4.ts'), m1(), 'nothrow2', ['T3r']],
    ],
};
if (!SETS[setName]) { console.log(`usage: node t5f1-mutants.mjs <${Object.keys(SETS).join('|')}>`); process.exit(2); }
const scenarios = SETS[setName]();
const mirror = makeMirror(`t5f1-mut-${setName}`, { runs: true });
let bad = 0;
try {
    for (const [label, testText, baseModule, mut, predicted] of scenarios) {
        mirror.put(TEST_REL, testText);
        mirror.put(MOD_REL, MUT[mut](baseModule));
        const r = mirror.runJson();
        const failed = r.results.filter((x) => x.status === 'failed').map((x) => keyOf(x.title)).sort();
        const passed = r.results.filter((x) => x.status === 'passed').length;
        const skipped = r.results.filter((x) => x.status !== 'passed' && x.status !== 'failed').length;
        const want = [...predicted].sort();
        const ok = JSON.stringify(failed) === JSON.stringify(want) && r.results.length > 0;
        if (!ok) bad++;
        console.log(`[${ok ? 'as expected' : 'UNEXPECTED'}] ${label}: ${failed.length} failed | ${passed} passed${skipped ? ` | ${skipped} skipped` : ''} (${r.results.length}); failing: ${failed.join(', ') || 'none'}${ok ? '' : `; PREDICTED failing: ${want.join(', ') || 'none'}${r.results.length ? '' : ' ' + r.raw}`}`);
    }
} finally {
    console.log(mirror.dispose());
}
console.log(`scenarios that differed from the prediction: ${bad}`);
process.exit(bad ? 1 : 0);
