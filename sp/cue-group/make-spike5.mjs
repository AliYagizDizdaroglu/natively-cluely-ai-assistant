// Throwaway: spike5.mjs = spike3.mjs with ONE arm, "cap-strict-ex" (the cap sentence FIRST, as in spike 2's cap3,
// which held 3 lines on complex questions; then spike 4's answer-first + only-asked-parts + example, which scaled
// simple questions down), a MODELS env filter (3.1-lite's quota is spent until 10:00 local), its own prefix.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('./spike3.mjs', import.meta.url), 'utf8');
const ARMS_OLD = "const ARMS = { cap3: CAP3, 'cap3-min': CAP3_MIN };";
const RULE = "- At most 3 lines, each at most 5 words. The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked \"Tabs or spaces?\", the whole block is 1| Spaces). Add a line only for another part the QUESTION names, never for a point you add on your own; when it names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.";
const ARMS_NEW = `const CAP_STRICT_EX = ${JSON.stringify(RULE)};\nconst ARMS = { 'cap-strict-ex': CAP_STRICT_EX };`;
const MODELS_OLD = 'const MODELS = [';
const LOOP_OLD = 'for (const it of items) for (const m of MODELS) for (const [arm, rule] of Object.entries(ARMS)) {';
const LOOP_NEW = "const RUN_MODELS = MODELS.filter((m) => !process.env.MODELS || process.env.MODELS.split(',').some((k) => m.name.startsWith(k)));\nfor (const it of items) for (const m of RUN_MODELS) for (const [arm, rule] of Object.entries(ARMS)) {";
for (const [a, n] of [[ARMS_OLD, 1], [LOOP_OLD, 1], ['spike3-${', 1], [MODELS_OLD, 1]]) if (src.split(a).length - 1 !== n) { console.log(`REFUSED: anchor "${a.slice(0, 50)}" found ${src.split(a).length - 1} times`); process.exit(1); }
const out = src.replace(ARMS_OLD, ARMS_NEW).replace(LOOP_OLD, LOOP_NEW).replace('spike3-${', 'spike5-${')
    .replace('// Throwaway spike 3', '// Throwaway spike 5 (made by make-spike5.mjs from spike3.mjs: one arm, cap-strict-ex; MODELS=3.5 runs one model).\n// Throwaway spike 3');
fs.writeFileSync(new URL('./spike5.mjs', import.meta.url), out);
console.log('wrote spike5.mjs');
