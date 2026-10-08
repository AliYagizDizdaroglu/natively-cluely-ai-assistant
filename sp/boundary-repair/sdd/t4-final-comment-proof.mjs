// Task 4 final fix round (throwaway): prove that the edits to the two PRODUCTION files (DeepgramStreamingSTT.ts: E5; deepgramBoundaryRepair.ts: E4)
// are COMMENT ONLY. "Before" = the files as MAIN held them when the round began (sdd\t4-r2\), "after" = the staged files (or MAIN's, --from main).
//   1. line level (LCS diff): every removed and every added line is a comment line (`//`, `/*`, or a block-comment ` *` line)
//   2. the intended edits are exactly there: old phrases gone, new phrases present; for the module the whole header block, read as words, equals the
//      original with exactly the two replacements; every added header line is at most as wide as the block's widest existing line (103 columns) and keeps
//      the ` *          ` continuation indentation
//   3. esbuild transpile (MAIN's own esbuild, loader ts, format cjs): byte-identical before and after
//   4. calibration, once per file: a ONE-CHARACTER code change makes the transpile DIFFERENT; a code line added among the comments makes the line check say
//      NOT comment-only
//   node t4-final-comment-proof.mjs [--from main]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MAIN, HERE, STAGE, rdR2, sha16 } from './t4-final-lib.mjs';
const fromMain = process.argv.includes('--from') && process.argv[process.argv.indexOf('--from') + 1] === 'main';
const rdAfter = (rel) => fs.readFileSync(path.join(fromMain ? MAIN : STAGE, rel), 'utf8');
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const tr = (ts) => esbuild.transformSync(ts, { loader: 'ts', format: 'cjs' }).code;
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok      ' : 'PROBLEM '} ${msg}`); };
const once = (text, oldS, newS) => { if (text.split(oldS).length !== 2) throw new Error(`anchor not unique: ${oldS}`); return text.replace(oldS, () => newS); };

function lineDiff(aText, bText) {
    const a = aText.split('\n'), b = bText.split('\n');
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const removed = [], added = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) { i++; j++; }
        else if (L[i + 1][j] >= L[i][j + 1]) removed.push([i + 1, a[i++]]);
        else added.push([j + 1, b[j++]]);
    }
    while (i < n) removed.push([i + 1, a[i++]]);
    while (j < m) added.push([j + 1, b[j++]]);
    return { removed, added };
}
const isComment = (l) => /^\s*(\/\/|\/\*|\*)/.test(l);
const commentOnly = (aText, bText) => { const d = lineDiff(aText, bText); return { d, ok: d.removed.every(([, l]) => isComment(l)) && d.added.every(([, l]) => isComment(l)) && (d.removed.length + d.added.length) > 0 }; };
const show = (d) => { d.removed.forEach(([n, l]) => console.log(`   - ${String(n).padStart(3)}: ${l.trim()}`)); d.added.forEach(([n, l]) => console.log(`   + ${String(n).padStart(3)}: ${l.trim()}`)); };
const cols = (l) => [...l].length;

// ---------------------------------------------------------------- DeepgramStreamingSTT.ts (E5)
{
    const name = 'DeepgramStreamingSTT.ts', rel = 'electron/audio/' + name;
    const before = rdR2(name).toString('utf8'), after = rdAfter(rel);
    console.log(`\n${rel}: before ${before.length} chars ${sha16(before)}; after (${fromMain ? 'MAIN' : 'STAGE'}) ${after.length} chars ${sha16(after)}`);
    const { d, ok } = commentOnly(before, after);
    check(ok && d.removed.length === 1 && d.added.length === 1, `exactly one line removed and one added, both // comment lines`);
    show(d);
    check(before.includes('(median 187 per flight hour)') && !after.includes('(median 187 per flight hour)'), 'old phrase removed: (median 187 per flight hour)');
    check(!before.includes('(median 187 per run log)') && after.includes('(median 187 per run log)'), 'new phrase present: (median 187 per run log)');
    const tb = tr(before), ta = tr(after);
    console.log(`   transpile before ${tb.length} chars ${sha16(tb)}; after ${ta.length} chars ${sha16(ta)}`);
    check(tb === ta, 'esbuild transpile of before and after is byte-identical');
    check(tr(once(after, 'data.speech_final === true', 'data.speech_final == true')) !== tb, 'calibration: a one-character code change (=== -> ==) makes the transpile DIFFERENT');
    const withCode = once(after, '// An empty FINAL is a pause (median 187 per run log): a cut remembered\n', "// An empty FINAL is a pause (median 187 per run log): a cut remembered\n                            console.log('calibration');\n");
    check(!commentOnly(before, withCode).ok, 'calibration: a code line added among the comments makes the line check say NOT comment-only');
}

// ---------------------------------------------------------------- deepgramBoundaryRepair.ts (E4)
{
    const name = 'deepgramBoundaryRepair.ts', rel = 'electron/audio/' + name;
    const before = rdR2(name).toString('utf8'), after = rdAfter(rel);
    console.log(`\n${rel}: before ${before.length} chars ${sha16(before)}; after (${fromMain ? 'MAIN' : 'STAGE'}) ${after.length} chars ${sha16(after)}`);
    const { d, ok } = commentOnly(before, after);
    check(ok, `every removed (${d.removed.length}) and every added (${d.added.length}) line is a comment line`);
    show(d);
    const header = (t) => { const L = t.split('\n'); const end = L.findIndex((l, i) => i > 0 && l.trim() === '*/'); return L.slice(0, end + 1); };
    const hb = header(before), ha = header(after);
    const words = (L) => L.join('\n').replace(/^\/\*\*|\*\/$/g, ' ').split('\n').map((l) => l.replace(/^\s*\*/, ' ')).join(' ').split(/\s+/).filter(Boolean).join(' ');
    const ADD31 = ', as [A-Za-z0-9\']+ runs: punctuation inside a word is lost ("4.1" -> "4 1", "C++" -> "C"); none of the 25 non-holdout restores held such a word, so the effect is unmeasured';
    let expected = words(hb);
    expected = once(expected, "Traw = the same words in I's own spelling.", `Traw = the same words in I's own spelling${ADD31}.`);
    expected = once(expected, '0 of 29 log repairs had an empty final', '0 of the 25 non-holdout log repairs had an empty final');
    check(words(ha) === expected, 'the header block, read as words, equals the original with exactly the two intended replacements (line wrapping aside)');
    check(hb.length === 63 && ha.length === 65, `the header grew from ${hb.length} to ${ha.length} lines (the :31 sentence 1 -> 3 lines; the :34-36 sentence still 3 lines)`);
    check(after.includes("Traw = the same words in I's own spelling, as [A-Za-z0-9']+ runs:") && after.includes('none of the 25\n *          non-holdout restores held such a word, so the effect is unmeasured.\n'), 'the :31 addition ends the CUT bullet and keeps its final period');
    check(!after.includes('0 of 29 log') && after.includes('0 of the 25\n *          non-holdout log repairs had an empty final'), 'the :34 wording: "0 of the 25 non-holdout log repairs had an empty final"');
    const widest = Math.max(...hb.map(cols));
    const addedLines = d.added.map(([, l]) => l);
    check(addedLines.every((l) => cols(l) <= widest), `every added line is at most ${widest} columns (the header's widest existing line); widest added: ${Math.max(...addedLines.map(cols))}`);
    check(addedLines.every((l) => /^ \*          \S/.test(l)), 'every added line keeps the " *          " continuation indentation');
    const tb = tr(before), ta = tr(after);
    console.log(`   transpile before ${tb.length} chars ${sha16(tb)}; after ${ta.length} chars ${sha16(ta)}`);
    check(tb === ta, 'esbuild transpile of before and after is byte-identical');
    check(tr(once(after, 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 5001;')) !== tb, 'calibration: a one-character code change (5000 -> 5001) makes the transpile DIFFERENT');
    const withCode = once(after, " *          non-holdout restores held such a word, so the effect is unmeasured.\n", " *          non-holdout restores held such a word, so the effect is unmeasured.\nconsole.log('calibration');\n");
    check(!commentOnly(before, withCode).ok, 'calibration: a code line added among the header comments makes the line check say NOT comment-only');
}
console.log(bad ? `\n${bad} problem(s)` : '\ncomment-only changes proven for both production files');
process.exit(bad ? 1 : 0);
