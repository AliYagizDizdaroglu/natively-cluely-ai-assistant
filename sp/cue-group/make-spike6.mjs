// Throwaway: spike6.mjs = spike3.mjs with three arms head to head at the same n, per model (MODELS=3.1 or 3.5):
//   cap3-min  (spike 3: best one-line rate on 3.5-lite, 11/18, but the direct answer sometimes comes last or never)
//   strict-ex (spike 4: the first line was the direct answer every time, one-line 7/18)
//   one-first (NEW: strict-ex's answer-first + example, plus cap3-min's "A one-part question gets exactly one line",
//              cap sentence first as in spike 5, which held complex questions to 3 lines better)
// Also fixes spike 3's "<= 2 words" count, which counted EMPTY blocks (0 words) as short answers; adds first<=2.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('./spike3.mjs', import.meta.url), 'utf8');
const STRICT_EX = "- The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked \"Tabs or spaces?\", the whole block is 1| Spaces). Add a line only for another part the QUESTION names, never for a point you add on your own. At most 3 lines, each at most 5 words; when the question names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.";
const ONE_FIRST = "- At most 3 lines, each at most 5 words. The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked \"Tabs or spaces?\", the whole block is 1| Spaces). A one-part question gets exactly one line. Add a line only for another part the QUESTION names, never for a point you add on your own; when it names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.";
const EDITS = [
    ["const ARMS = { cap3: CAP3, 'cap3-min': CAP3_MIN };",
        `const STRICT_EX = ${JSON.stringify(STRICT_EX)};\nconst ONE_FIRST = ${JSON.stringify(ONE_FIRST)};\nconst ARMS = { 'cap3-min': CAP3_MIN, 'strict-ex': STRICT_EX, 'one-first': ONE_FIRST };\n` +
        "// Does the FIRST cue line carry the direct answer to the simple question? (X2's answer is no: trees are scale-invariant.)\n" +
        "const TERMS = { X1: /boost/i, X2: /\\bno\\b|\\bnot\\b|n't|unnecessary|invarian/i, X3: /cpu/i, X4: /parquet/i, X5: /log/i, X6: /batch/i };\n" +
        'const firstCarries = (r) => r.n >= 1 && Boolean(TERMS[r.id]?.test(r.cues[0]));'],
    ['for (const it of items) for (const m of MODELS) for (const [arm, rule] of Object.entries(ARMS)) {',
        "const RUN_MODELS = MODELS.filter((m) => !process.env.MODELS || process.env.MODELS.split(',').some((k) => m.name.startsWith(k)));\nfor (const it of items) for (const m of RUN_MODELS) for (const [arm, rule] of Object.entries(ARMS)) {"],
    ['spike3-${', 'spike6-${'],
    ['<=2 words ${rows.filter((r) => r.total <= 2).length}',
        '<=2 words ${rows.filter((r) => r.n >= 1 && r.total <= 2).length}  first<=2 ${rows.filter((r) => r.n >= 1 && words(r.cues[0]) <= 2).length}${kind === \'simple\' ? `  answer-first ${rows.filter(firstCarries).length}  one-line-answer ${rows.filter((r) => r.n === 1 && firstCarries(r)).length}` : \'\'}'],
    ['blocks of <= 2 words;', 'non-empty blocks of <= 2 words; non-empty blocks whose FIRST line is <= 2 words;'],
    ['// Throwaway spike 3', '// Throwaway spike 6 (made by make-spike6.mjs from spike3.mjs: arms cap3-min, strict-ex, one-first; MODELS=3.1|3.5).\n// Throwaway spike 3'],
];
let out = src;
for (const [a, b] of EDITS) {
    const n = out.split(a).length - 1;
    if (n !== 1) { console.log(`REFUSED: anchor "${a.slice(0, 60)}" found ${n} times`); process.exit(1); }
    out = out.replace(a, () => b);
}
fs.writeFileSync(new URL('./spike6.mjs', import.meta.url), out);
console.log('wrote spike6.mjs');
