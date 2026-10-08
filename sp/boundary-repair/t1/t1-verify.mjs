// Throwaway (task 1): compare a staged file against the matching fenced block of task-1-brief.md, byte for byte.
//   node t1-verify.mjs test        staged test file      == brief Step 2 block
//   node t1-verify.mjs skeleton    staged module         == brief Step 4 block
//   node t1-verify.mjs impl        staged module         == Step 4 block with its createBoundaryRepair replaced by the Step 6 block
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const STAGE = `${SP}/stage/electron/audio`;
const mode = process.argv[2];

const raw = fs.readFileSync(`${SP}/sdd/task-1-brief.md`, 'utf8');
console.log('brief CR bytes:', (raw.match(/\r/g) ?? []).length);
const lines = raw.replace(/\r\n/g, '\n').split('\n');
const blocks = [];
let cur = null;
for (const line of lines) {
    if (cur === null) { const m = /^```(\w*)$/.exec(line); if (m) cur = { lang: m[1], body: [] }; }
    else if (line === '```') { blocks.push(cur); cur = null; }
    else cur.body.push(line);
}
console.log('column-0 fenced blocks:', blocks.map((b) => `${b.lang}(${b.body.length} lines)`).join(', '));
const ts = blocks.filter((b) => b.lang === 'ts').map((b) => b.body.join('\n') + '\n');
if (ts.length !== 3) { console.log(`REFUSED: expected 3 ts blocks (test, skeleton, impl), found ${ts.length}`); process.exit(2); }
const [testBlock, skeletonBlock, implBlock] = ts;

let expected, file;
if (mode === 'test') { expected = testBlock; file = `${STAGE}/deepgramBoundaryRepair.test.ts`; }
else if (mode === 'skeleton') { expected = skeletonBlock; file = `${STAGE}/deepgramBoundaryRepair.ts`; }
else if (mode === 'impl') {
    const marker = 'export function createBoundaryRepair(): BoundaryRepair {';
    const at = skeletonBlock.indexOf(marker);
    if (at < 0 || skeletonBlock.indexOf(marker, at + 1) >= 0) { console.log('REFUSED: skeleton marker not found exactly once'); process.exit(2); }
    if (!implBlock.startsWith(marker)) { console.log('REFUSED: impl block does not start with the marker'); process.exit(2); }
    expected = skeletonBlock.slice(0, at) + implBlock;
    file = `${STAGE}/deepgramBoundaryRepair.ts`;
} else { console.log('usage: t1-verify.mjs test|skeleton|impl'); process.exit(2); }

const actual = fs.readFileSync(file, 'utf8');
const crs = (actual.match(/\r/g) ?? []).length;
if (actual === expected && crs === 0) { console.log(`${mode}: IDENTICAL to the brief (${actual.length} chars, ${Buffer.byteLength(actual)} bytes, ${crs} CR)`); process.exit(0); }
let i = 0;
while (i < actual.length && i < expected.length && actual[i] === expected[i]) i++;
console.log(`${mode}: DIFFERENT — CR bytes ${crs}, lengths actual ${actual.length} vs expected ${expected.length}, first difference at char ${i}`);
console.log('actual  :', JSON.stringify(actual.slice(Math.max(0, i - 40), i + 60)));
console.log('expected:', JSON.stringify(expected.slice(Math.max(0, i - 40), i + 60)));
process.exit(1);
