// Builds the ET38 harness from L20c's, and proves what changed (PREREGISTER-et38.md, "Harness").
//   items.json = L20b's 10 pairs + L20c's 9 pairs: the 38 items L20c graded.
//   run.mjs    = l20c/run.mjs with ONLY: the folder, the model, a --level argument passed as
//                thinkingConfig.thinkingLevel, the run file's name, and the level stored in the file.
// Each replacement must match exactly once. The lines removed and added are printed and counted.
//   node make-et38.mjs
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const b = JSON.parse(fs.readFileSync(`${SP}/l20b/items.json`, 'utf8')), c = JSON.parse(fs.readFileSync(`${SP}/l20c/items.json`, 'utf8'));
const items = { note: 'ET38: the 38 items of L20c = L20b\'s 10 pairs + L20c\'s 9 pairs', hard: b.hard, normal: [...b.normal, ...c.normal], pairs: [...b.pairs, ...c.pairs] };
const ids = items.pairs.flat();
if (items.pairs.length !== 19 || new Set(ids).size !== 38 || items.hard.length !== 5 || items.normal.length !== 14) throw new Error(`items: ${items.pairs.length} pairs, ${new Set(ids).size} ids, hard ${items.hard.length}, normal ${items.normal.length}`);
fs.writeFileSync(`${SP}/et38/items.json`, JSON.stringify(items, null, 1));
console.log(`items.json: ${items.pairs.length} pairs, ${ids.length} items (hard ${items.hard.flat().length}, normal ${items.normal.flat().length})`);

const src = fs.readFileSync(`${SP}/l20c/run.mjs`, 'utf8');
const swaps = [
    ['// L20 runner (see PREREGISTER-l20.md)', '// ET38 runner (PREREGISTER-et38.md): l20c/run.mjs with the folder, the model, its thinking level and the run file\'s name changed; make-et38.mjs proves it.\n// L20 runner (see PREREGISTER-l20.md)'],
    ['/scratchpad/l20c\';', '/scratchpad/et38\';'],
    ['const REP = arg(\'--rep\');\nif (![\'1\', \'2\', \'3\'].includes(REP)) { console.log(\'usage: --rep 1|2|3\'); process.exit(2); }', 'const REP = arg(\'--rep\');\nconst LEVEL = arg(\'--level\');\nif (![\'1\', \'2\', \'3\'].includes(REP) || ![\'low\', \'medium\'].includes(LEVEL)) { console.log(\'usage: --level low|medium --rep 1|2|3\'); process.exit(2); }'],
    ['const MODEL = \'gemini-3.8-live\';', 'const MODEL = \'gemini-3.8-live-extended-thinking\';'],
    ['const outFile = `${HERE}/runs/live38-r${REP}.json`;', 'const outFile = `${HERE}/runs/et-${LEVEL}-r${REP}.json`;'],
    ['{ model: MODEL, level: \'none\', rep: Number(REP),', '{ model: MODEL, level: LEVEL, rep: Number(REP),'],
    ['            responseModalities: [\'AUDIO\'],\n', '            responseModalities: [\'AUDIO\'],\n            thinkingConfig: { thinkingLevel: LEVEL },\n'],
];
let out = src.replace(/\r\n/g, '\n');
for (const [from, to] of swaps) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`expected exactly one match, found ${n}: ${from.slice(0, 60)}`);
    out = out.replace(from, to);
}
fs.writeFileSync(`${SP}/et38/run.mjs`, out);
const A = src.replace(/\r\n/g, '\n').split('\n'), B = out.split('\n');
const removed = A.filter((l) => !B.includes(l)), added = B.filter((l) => !A.includes(l));
console.log(`run.mjs: ${A.length} lines -> ${B.length} lines; removed ${removed.length}, added ${added.length}`);
for (const l of removed) console.log(`  - ${l.trim().slice(0, 150)}`);
for (const l of added) console.log(`  + ${l.trim().slice(0, 150)}`);
// every other line is the same line in the same order
const keep = (L, drop) => L.filter((l) => !drop.includes(l)).join('\n');
const same = keep(A, removed) === keep(B, added);
console.log(same && removed.length === 5 && added.length === 8 ? 'RUNNER AS REGISTERED (5 lines replaced, 3 added; every other line identical and in order)' : 'RUNNER DIFFERS FROM THE REGISTERED CHANGE');
process.exit(same && removed.length === 5 && added.length === 8 ? 0 : 1);
