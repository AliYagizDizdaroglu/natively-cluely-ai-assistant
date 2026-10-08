// Task 5 fix round 1 (throwaway): are the staged (and MAIN) test file and module exactly what task-5-fix1.md prescribes, applied to the
// round-0 files in sdd\t5f1-orig\?
//   node t5f1-verify-fix.mjs --list
//   node t5f1-verify-fix.mjs --expect test[,module] [--main] [--test-file <path>]
// The TEST FILE is derived edit by edit from the note (F1 block -> block, F2 inline, F3 remove + insert, F4a remove orphan + replace T3)
// and compared byte for byte. The MODULE's code is derived from the note's F4b block (old -> new); its header comment must equal the
// round-0 header with ONE sentence added (compared after joining the wrapped lines), every other header line untouched and every header
// line no longer than the longest line of the round-0 header. Calibration: each comparison is repeated against a perturbed derivation
// (one character dropped), which must say DIFFERENT. Read-only.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const note = fs.readFileSync(path.join(HERE, 'task-5-fix1.md'), 'utf8');
if (note.includes('\r')) throw new Error('the note holds CR bytes');
const blocks = [];
{ let cur = null; for (const ln of note.split('\n')) { if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } } else if (cur !== null) cur.push(ln); } }
if (process.argv.includes('--list')) { blocks.forEach((b, i) => console.log(`block ${i}: ${b.length} chars, first line: ${b.split('\n')[0].slice(0, 100)}`)); process.exit(0); }
if (blocks.length !== 6) throw new Error(`expected 6 fenced blocks in the note, found ${blocks.length}`);
const [F1_OLD, F1_NEW, F3_INSERT, F4A_T3, F4B_OLD, F4B_NEW] = blocks;
const rd = (p) => fs.readFileSync(p, 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const once = (hay, needle, what) => { const i = hay.indexOf(needle); if (i < 0 || hay.indexOf(needle, i + 1) >= 0) throw new Error(`${what}: anchor found ${i < 0 ? 0 : 'more than 1'} times`); return i; };
const replaceOnce = (hay, o, n, what) => { const i = once(hay, o, what); return hay.slice(0, i) + n + hay.slice(i + o.length); };
const inline = (re, what) => { const m = re.exec(note); if (!m) throw new Error(`${what}: not found in the note`); return m; };

const deriveTest = () => {
    let t = rd(path.join(HERE, 't5f1-orig', 'interview60.turns-finals.test.ts'));
    t = replaceOnce(t, F1_OLD, F1_NEW, 'F1 block');
    const f2 = inline(/change `(at\('2026-09-29T11:19:29\.000Z'\))` to `(at\('2026-09-29T11:19:29\.373Z'\))`/, 'F2 inline');
    t = replaceOnce(t, f2[1], f2[2], 'F2 since');
    const f3 = inline(/Remove the line `('2026-09-29T11:19:28\.500Z[^`]*)`/, 'F3 removal')[1];
    t = replaceOnce(t, `    ${f3}\n`, '', 'F3 removal line');
    const anchor = t.split('\n').find((l) => l.includes('restored "hallucinations" before'));
    if (!anchor) throw new Error('F3: repair line not found');
    t = replaceOnce(t, `${anchor}\n`, `${anchor}\n${F3_INSERT}`, 'F3 insert after the repair line');
    const f4o = inline(/Remove the orphan line from LOG: `('2026-09-29T11:19:31\.002Z[^`]*)`/, 'F4a orphan')[1];
    t = replaceOnce(t, `    ${f4o}\n`, '', 'F4a orphan line');
    const s = t.indexOf("    it('a repair line that is not the very next line after a final is not applied");
    if (s < 0) throw new Error('F4a: old T3 not found');
    const e = t.indexOf('\n    });\n', s) + '\n    });\n'.length;
    return t.slice(0, s) + F4A_T3 + t.slice(e);
};
const headerOf = (t) => { const ls = t.split('\n'); let n = 0; while (n < ls.length && ls[n].startsWith('//')) n++; return { header: ls.slice(0, n), rest: ls.slice(n).join('\n') }; };
const norm = (ls) => ls.map((l) => l.replace(/^\/\/ ?/, '')).join(' ').replace(/\s+/g, ' ').trim();
const SENTENCE = 'A repair line anywhere else (no final right above it, or under a final its `before` text does not name) refuses: that log is not what the app saw.';
const moduleCheck = (staged) => {
    const orig = rd(path.join(HERE, 't5f1-orig', 'interview60.turns-finals.mjs'));
    const o = headerOf(orig), s = headerOf(staged);
    const expectedRest = replaceOnce(o.rest, F4B_OLD, F4B_NEW, 'F4b block');
    const problems = [];
    if (s.rest !== expectedRest) problems.push('code (everything below the header) is not the note\'s F4b replacement applied to the round-0 module');
    const A = o.header.findIndex((l) => l.startsWith('// so a final directly followed by that line replays as'));
    const B = o.header.findIndex((l, i) => i >= A && l.endsWith('parse exactly as they always did.'));
    if (A < 0 || B < A) throw new Error('round-0 header anchors not found');
    const sA = s.header.findIndex((l) => l.startsWith('// so a final directly followed by that line replays as'));
    const sB = s.header.findIndex((l, i) => i >= sA && l.endsWith('parse exactly as they always did.'));
    if (sA < 0 || sB < sA) problems.push('staged header: the touched region was not found');
    else {
        const before = o.header.slice(0, A), after = o.header.slice(B + 1);
        if (JSON.stringify(s.header.slice(0, sA)) !== JSON.stringify(before)) problems.push('header lines BEFORE the touched region changed');
        if (JSON.stringify(s.header.slice(sB + 1)) !== JSON.stringify(after)) problems.push('header lines AFTER the touched region changed');
        const origTouched = norm(o.header.slice(A, B + 1));
        const at = origTouched.indexOf('`<words> <raw>`.') + '`<words> <raw>`.'.length;
        const expectedTouched = `${origTouched.slice(0, at)} ${SENTENCE}${origTouched.slice(at)}`;
        if (norm(s.header.slice(sA, sB + 1)) !== expectedTouched) problems.push('the touched header region is not the round-0 text with the one sentence inserted after "`<words> <raw>`."');
    }
    const maxOld = Math.max(...o.header.map((l) => l.length));
    const longest = Math.max(...s.header.map((l) => l.length));
    if (longest > Math.max(maxOld, 105)) problems.push(`a header line is ${longest} chars, longer than ${Math.max(maxOld, 105)} (the round-0 maximum is ${maxOld})`);
    return { problems, maxOld, longest, headerLines: `${o.header.length} -> ${s.header.length}` };
};
const perturb = (t) => t.slice(0, Math.floor(t.length / 2)) + t.slice(Math.floor(t.length / 2) + 1);
const wants = (process.argv[process.argv.indexOf('--expect') + 1] ?? '').split(',').filter(Boolean);
if (!wants.length) throw new Error('usage: --expect test[,module] [--main] [--test-file <path>]');
const useMain = process.argv.includes('--main');
const testFile = process.argv.includes('--test-file') ? path.resolve(process.argv[process.argv.indexOf('--test-file') + 1]) : path.join(STAGE, G + 'interview60.turns-finals.test.ts');
let bad = 0;
if (wants.includes('test')) {
    const exp = deriveTest();
    const staged = rd(testFile);
    const ok = staged === exp, cal = staged === perturb(exp);
    console.log(`test file (${testFile.includes('t5f1-steps') ? 'step snapshot' : 'staged'}): ${staged.length} chars ${sha(staged)} | derived-from-note ${exp.length} chars ${sha(exp)} -> ${ok ? 'IDENTICAL' : 'DIFFERENT'}`);
    console.log(`  calibration (vs a perturbed derivation): ${cal ? 'IDENTICAL (BAD: the comparison cannot fail)' : 'DIFFERENT (good)'}`);
    if (!ok || cal) bad++;
    if (useMain) { const m = rd(path.join(MAIN, G + 'interview60.turns-finals.test.ts')); const same = m === staged; console.log(`  MAIN ${m.length} chars ${sha(m)} vs the file compared -> ${same ? 'IDENTICAL' : 'DIFFERENT'}`); if (!same) bad++; }
}
if (wants.includes('module')) {
    const staged = rd(path.join(STAGE, G + 'interview60.turns-finals.mjs'));
    const r = moduleCheck(staged);
    console.log(`module (staged): ${staged.length} chars ${sha(staged)}; header lines ${r.headerLines}, longest header line ${r.longest} (round-0 max ${r.maxOld}) -> ${r.problems.length ? 'PROBLEMS' : 'matches the note'}`);
    for (const p of r.problems) console.log(`  PROBLEM: ${p}`);
    if (r.problems.length) bad++;
    // calibration: a perturbed staged module must be reported
    const cal = moduleCheck(perturb(staged));
    console.log(`  calibration (perturbed module): ${cal.problems.length ? 'reported (good)' : 'NOT reported (BAD: the check cannot fail)'}`);
    if (!cal.problems.length) bad++;
    if (useMain) { const m = rd(path.join(MAIN, G + 'interview60.turns-finals.mjs')); const same = m === staged; console.log(`  MAIN ${m.length} chars ${sha(m)} vs staged -> ${same ? 'IDENTICAL' : 'DIFFERENT'}`); if (!same) bad++; }
}
console.log(bad ? `PROBLEMS: ${bad}` : 'all requested comparisons hold, all calibrations fail as they should');
process.exit(bad ? 1 : 0);
