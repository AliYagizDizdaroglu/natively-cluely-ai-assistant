// Builds the L20d harness from L20c's and proves what changed (PREREGISTER-l20d.md, "Live arm" and "Items").
//   items.json = a byte copy of et38/items.json (19 pairs, 38 distinct ids, hard 5 pairs, normal 14 pairs).
//   run.mjs    = l20c/run.mjs with EXACTLY the seven swaps of the pre-registration, each anchor matching once.
// The lines removed and added are printed and counted (expected: 10 removed, 9 added); every other line is proved
// identical and in order by a longest-common-subsequence diff. The instruction's sha256 is checked against the file
// and against the pre-registration's text before anything is written.
//   node make-l20d.mjs [--src <run.mjs>] [--out <run.mjs>] [--items-src <items.json>] [--items-out <items.json>]
// (--src/--out/--items-* exist so that cal-make-l20d.mjs can run this on mutated copies in a temp folder.)
import fs from 'node:fs';
import crypto from 'node:crypto';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SRC = arg('--src', `${SP}/l20c/run.mjs`), OUT = arg('--out', `${SP}/l20d/run.mjs`);
const ITEMS_SRC = arg('--items-src', `${SP}/et38/items.json`), ITEMS_OUT = arg('--items-out', `${SP}/l20d/items.json`);
const INSTRUCTION = arg('--instruction', `${SP}/l20d/instruction.txt`), PREREG = arg('--prereg', `${SP}/l20d/PREREGISTER-l20d.md`);
const HASH = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
const EXPECT_REMOVED = 10, EXPECT_ADDED = 9;
const fail = (m) => { console.log(`REFUSED: ${m}`); process.exit(1); };

// ---- the instruction: file, constant and pre-registration agree --------------------------------------------
const fileHash = crypto.createHash('sha256').update(fs.readFileSync(INSTRUCTION)).digest('hex');
if (fileHash !== HASH) fail(`${INSTRUCTION} has sha256 ${fileHash}, not the registered ${HASH}`);
if (fs.readFileSync(PREREG, 'utf8').split(HASH).length !== 2) fail(`${PREREG} must name the instruction's sha256 exactly once`);
console.log(`instruction.txt: sha256 ${fileHash} = the registered hash (and the pre-registration names it once)`);

// ---- items.json ---------------------------------------------------------------------------------------------
const itemsBytes = fs.readFileSync(ITEMS_SRC);
const items = JSON.parse(itemsBytes.toString('utf8'));
const ids = items.pairs.flat();
if (items.pairs.length !== 19 || new Set(ids).size !== 38 || items.hard.length !== 5 || items.normal.length !== 14) fail(`items: ${items.pairs.length} pairs, ${new Set(ids).size} ids, hard ${items.hard.length}, normal ${items.normal.length}`);
if (items.pairs.some((p) => p.length !== 2)) fail('items: a pair is not a main + follow-up');
if (new Set([...items.hard, ...items.normal].flat()).size !== 38) fail('items: hard and normal do not partition the 38 ids');
fs.writeFileSync(ITEMS_OUT, itemsBytes);
if (!fs.readFileSync(ITEMS_OUT).equals(itemsBytes)) fail('items.json copy differs from its source');
console.log(`items.json: byte copy of ${ITEMS_SRC.split('/').slice(-2).join('/')}; ${items.pairs.length} pairs, ${ids.length} distinct ids, hard ${items.hard.length} pairs (${items.hard.flat().length} items), normal ${items.normal.length} pairs (${items.normal.flat().length} items)`);

// ---- run.mjs: the seven swaps -------------------------------------------------------------------------------
const lines = (...l) => l.join('\n');
const LIVE_MODE_BLOCK = lines(
    'const LIVE_MODE = `[LIVE MODE]',
    'You are listening to a live job interview through the interviewer\'s microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.',
    'When the interviewer finishes a question, reply with exactly what the candidate should say next, following every rule above (spoken, first person, the answer\'s structure and length rules).',
    'Output ONLY the answer itself: no greeting, no acknowledgement, no "let me think", no narration of your reasoning.',
    'Wait until the interviewer has finished the whole question before answering. If what you heard is not a question for the candidate, output nothing.',
    '[END LIVE MODE]`;');
const NEW_INSTRUCTION_BLOCK = lines(
    `const INSTRUCTION_SHA256 = '${HASH}';`,
    'const INSTRUCTION = fs.readFileSync(`${HERE}/instruction.txt`, \'utf8\').replace(/\\r\\n/g, \'\\n\');',
    'if (createHash(\'sha256\').update(INSTRUCTION).digest(\'hex\') !== INSTRUCTION_SHA256) { console.log(\'instruction.txt does not match its registered sha256 (PREREGISTER-l20d.md): refusing to run\'); process.exit(2); }');
const swaps = [
    // 1. a header line before line 1 (the original line stays)
    ['// L20 runner (see PREREGISTER-l20.md)', '// L20d runner (PREREGISTER-l20d.md): l20c/run.mjs with the folder, the instruction (hash-checked), the run file\'s name and the instruction\'s hash in the run file changed; make-l20d.mjs proves it.\n// L20 runner (see PREREGISTER-l20.md)'],
    // 2. the hash import after line 13
    ['import { createRequire } from \'node:module\';', 'import { createRequire } from \'node:module\';\nimport { createHash } from \'node:crypto\';'],
    // 3. line 16: the folder
    ['/scratchpad/l20c\';', '/scratchpad/l20d\';'],
    // 4. lines 31-36: the LIVE MODE block becomes the hash-checked instruction
    [LIVE_MODE_BLOCK, NEW_INSTRUCTION_BLOCK],
    // 5. line 42: the system instruction is the instruction + the CONTEXT slice
    ['return `${p.system}\\n\\n${p.user.slice(a, b).trim()}\\n\\n${LIVE_MODE}`;', 'return `${INSTRUCTION}\\n\\n${p.user.slice(a, b).trim()}`;'],
    // 6. line 74: the run file's name
    ['`${HERE}/runs/live38-r${REP}.json`', '`${HERE}/runs/l20d-r${REP}.json`'],
    // 7. line 76: the instruction's hash in the run file
    ['level: \'none\',', 'level: \'none\', instruction: INSTRUCTION_SHA256,'],
    ['const CHUNK = 1920;', 'const CHUNK = 1921;'],
];
const srcText = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
let out = srcText;
swaps.forEach(([from, to], i) => {
    const n = out.split(from).length - 1;
    if (n !== 1) fail(`swap ${i + 1}: expected its anchor to match exactly once, found ${n}: ${from.slice(0, 70).replace(/\n/g, '\\n')}`);
    out = out.replace(from, () => to);
});
fs.writeFileSync(OUT, out);

// ---- the diff: LCS over lines -------------------------------------------------------------------------------
const A = srcText.split('\n'), B = out.split('\n');
const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1));
for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const removed = [], added = [];
for (let i = 0, j = 0; i < A.length || j < B.length;) {
    if (i < A.length && j < B.length && A[i] === B[j]) { i++; j++; } else if (j < B.length && (i === A.length || L[i][j + 1] >= L[i + 1][j])) added.push([j + 1, B[j++]]); else removed.push([i + 1, A[i++]]);
}
console.log(`run.mjs: ${A.length} lines -> ${B.length} lines; removed ${removed.length}, added ${added.length}; common (identical, in order) ${A.length - removed.length}`);
for (const [n, l] of removed) console.log(`  - L${n}: ${l.trim().slice(0, 150)}`);
for (const [n, l] of added) console.log(`  + L${n}: ${l.trim().slice(0, 150)}`);
// the removed lines must be exactly the source lines the swaps 3-7 touch, and the added ones the swap texts
const touched = new Set();
for (const [from] of swaps.slice(2)) { const at = srcText.indexOf(from); const first = srcText.slice(0, at).split('\n').length, last = first + from.split('\n').length - 1; for (let n = first; n <= last; n++) touched.add(n); }
const sameRemoved = removed.length === touched.size && removed.every(([n]) => touched.has(n));
// the added lines, in file order, must each contain the text the swap that made it adds
const wantAdded = ['// L20d runner (PREREGISTER-l20d.md)', "import { createHash } from 'node:crypto';", "/scratchpad/l20d'", ...NEW_INSTRUCTION_BLOCK.split('\n'), 'return `${INSTRUCTION}', 'l20d-r${REP}.json', 'instruction: INSTRUCTION_SHA256,'];
const sameAdded = added.length === wantAdded.length && added.every(([, l], i) => l.includes(wantAdded[i]));
const ok = sameRemoved && sameAdded && removed.length === EXPECT_REMOVED && added.length === EXPECT_ADDED;
console.log(ok ? `RUNNER AS REGISTERED (${EXPECT_REMOVED} lines removed, ${EXPECT_ADDED} added; every other line identical and in order; removed lines = the lines swaps 3-7 touch)` : `RUNNER DIFFERS FROM THE REGISTERED CHANGE (removed ${removed.length}/${EXPECT_REMOVED}, added ${added.length}/${EXPECT_ADDED}, removed-lines-as-swapped ${sameRemoved}, added-lines-as-swapped ${sameAdded})`);
process.exit(ok ? 0 : 1);
