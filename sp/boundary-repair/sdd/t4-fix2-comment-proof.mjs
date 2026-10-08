// Task 4 fix round 2 (throwaway): prove the DeepgramStreamingSTT.ts changes of this round are COMMENT ONLY. Compares the round-1 adapter
// (sdd\t4-r1\, = MAIN before this round) with the staged adapter (or MAIN's, with --from main):
//   1. line level (LCS diff): every removed and every added line is a `//` comment line; the three intended edits are exactly there
//      (old phrases gone, new phrases present, the dependency line equal to the coordinator's wording)
//   2. esbuild transpile (MAIN's own esbuild, loader ts, format cjs): the two outputs are byte-identical
//   3. calibration: the same checks say DIFFERENT / NOT comment-only for (a) a code change (`=== true` -> `== true`), (b) a comma added inside
//      a string literal, (c) a code line added next to the new comment, so they can fail
//   node t4-fix2-comment-proof.mjs [--from main]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage');
const REL = 'electron/audio/DeepgramStreamingSTT.ts';
const fromMain = process.argv.includes('--from') && process.argv[process.argv.indexOf('--from') + 1] === 'main';
const before = fs.readFileSync(path.join(HERE, 't4-r1', 'DeepgramStreamingSTT.ts'), 'utf8');
const after = fs.readFileSync(path.join(fromMain ? MAIN : STAGE, REL), 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok      ' : 'PROBLEM '} ${msg}`); };
console.log(`before (round 1) ${before.length} chars ${sha(before)}; after (${fromMain ? 'MAIN' : 'STAGE'}) ${after.length} chars ${sha(after)}`);

// ---- 1. line-level diff (LCS)
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
const isComment = (l) => /^\s*\/\//.test(l);
const commentOnly = (aText, bText) => { const d = lineDiff(aText, bText); return { d, ok: d.removed.every(([, l]) => isComment(l)) && d.added.every(([, l]) => isComment(l)) && (d.removed.length + d.added.length) > 0 }; };
const { d, ok: lineOk } = commentOnly(before, after);
check(lineOk, `every removed (${d.removed.length}) and every added (${d.added.length}) line is a // comment line`);
d.removed.forEach(([n, l]) => console.log(`   - ${String(n).padStart(3)}: ${l.trim()}`));
d.added.forEach(([n, l]) => console.log(`   + ${String(n).padStart(3)}: ${l.trim()}`));

// the three intended edits, exactly (old phrase gone / new phrase present); nothing else may change wording
const gone = ['(they precede the words of every segment)', '6 of 20 seam plays'];
const present = ["(they are frequent and can precede a segment's words)", 'Deepgram lost a word in 6 of 20 seam1 plays', '// interview60.turns-finals.mjs pairs this line with the final logged just above it: keep the two adjacent'];
gone.forEach((p) => check(before.includes(p) && !after.includes(p), `old phrase removed: ${p}`));
present.forEach((p) => check(!before.includes(p) && after.includes(p), `new phrase present: ${p}`));
// the dependency comment sits directly above the repair log line, inside the `if (repaired?.restored) {` block
const AL = after.split('\n');
const ri = AL.findIndex((l) => l.includes('boundary repair: restored'));
check(ri > 1 && AL[ri - 2].includes('if (repaired?.restored) {') && AL[ri - 1].trim() === present[2], 'the dependency comment is the line directly above the repair log line, inside its `if` block');
// words of the reflowed comment block: identical to the original apart from the one replaced phrase (line breaks and indentation aside)
const words = (t) => t.replace(/\/\//g, ' ').split(/\s+/).filter(Boolean);
const blockOf = (t) => { const L = t.split('\n'); const s = L.findIndex((l) => l.includes('// Deepgram sometimes finalizes short of its own interim')); let e = s; while (isComment(L[e + 1] ?? '')) e++; return L.slice(s, e + 1).join('\n'); };
check(words(blockOf(before)).join(' ').replace('6 of 20 seam plays', 'Deepgram lost a word in 6 of 20 seam1 plays') === words(blockOf(after)).join(' '), 'the reflowed measurement comment differs from the original only by the one replaced phrase (words compared, wrapping aside)');
const widest = Math.max(...AL.filter(isComment).map((l) => l.length));
console.log(`   widest comment line in the new file: ${widest} chars (the new dependency line: ${AL[ri - 1].length}; before: ${Math.max(...before.split('\n').filter(isComment).map((l) => l.length))})`);

// ---- 2. transpile equality
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const tr = (ts) => esbuild.transformSync(ts, { loader: 'ts', format: 'cjs' }).code;
const tb = tr(before), ta = tr(after);
console.log(`transpile before ${tb.length} chars ${sha(tb)}; after ${ta.length} chars ${sha(ta)}`);
check(tb === ta, 'esbuild transpile of before and after is byte-identical');

// ---- 3. calibration: the checks must be able to fail
const once = (text, oldS, newS) => { if (text.split(oldS).length !== 2) throw new Error(`calibration anchor not unique: ${oldS}`); return text.replace(oldS, () => newS); };
check(tr(once(after, 'data.speech_final === true', 'data.speech_final == true')) !== tb, 'calibration (a): a code change (=== -> ==) makes the transpile DIFFERENT');
check(tr(once(after, "'[DeepgramStreaming] Restarting due to config change...'", "'[DeepgramStreaming] Restarting, due to config change...'")) !== tb, 'calibration (b): a comma added inside a string literal makes the transpile DIFFERENT');
const withCode = once(after, `                            ${present[2]}\n`, `                            ${present[2]}\n                            console.log('calibration');\n`);
check(tr(withCode) !== tb && !commentOnly(before, withCode).ok, 'calibration (c): a code line added next to the new comment makes the transpile DIFFERENT and the line check say NOT comment-only');
console.log(bad ? `\n${bad} problem(s)` : '\ncomment-only change proven');
process.exit(bad ? 1 : 0);
