// Throwaway: spike4.mjs = spike3.mjs with two new arms (the "answer first, only asked parts" rule, with and
// without a neutral example) and its own output prefix. Refuses if spike3's anchors moved.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('./spike3.mjs', import.meta.url), 'utf8');
const ARMS_OLD = "const ARMS = { cap3: CAP3, 'cap3-min': CAP3_MIN };";
const STRICT = "- The first line is the answer itself in the fewest words that carry it: one or two words when that is enough. Add a line only for another part the QUESTION names, never for a point you add on your own. At most 3 lines, each at most 5 words; when the question names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.";
const STRICT_EX = "- The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked \"Tabs or spaces?\", the whole block is 1| Spaces). Add a line only for another part the QUESTION names, never for a point you add on your own. At most 3 lines, each at most 5 words; when the question names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.";
const ARMS_NEW = `const STRICT = ${JSON.stringify(STRICT)};\nconst STRICT_EX = ${JSON.stringify(STRICT_EX)};\nconst ARMS = { strict: STRICT, 'strict-ex': STRICT_EX };`;
for (const [a, n] of [[ARMS_OLD, 1], ['spike3-${', 1], ['// Throwaway spike 3', 1]]) if (src.split(a).length - 1 !== n) { console.log(`REFUSED: anchor "${a}" found ${src.split(a).length - 1} times`); process.exit(1); }
const out = src.replace(ARMS_OLD, ARMS_NEW).replace('spike3-${', 'spike4-${')
    .replace('// Throwaway spike 3', '// Throwaway spike 4 (made by make-spike4.mjs from spike3.mjs; only the arms and the output prefix differ).\n// Throwaway spike 3');
fs.writeFileSync(new URL('./spike4.mjs', import.meta.url), out);
console.log('wrote spike4.mjs');
