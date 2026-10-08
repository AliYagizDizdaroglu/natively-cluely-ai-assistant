// Task 3 review (Opus), throwaway. Read-only on MAIN.
// 1. The v3 originals in sdd/t3-orig are the brief's starting files (7691 B c57ef099 / 5940 B 4653b898).
// 2. MAIN's test file = the v3 test file byte for byte + an appended tail (nothing above it changed).
// 3. Unicode form of the non-ASCII literals in the test file (NFC or NFD bytes?), and any combining marks.
// 4. The negative #28 fixture's real timings (the test comment says "a 5852 ms gap").
//   node r2-bytes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIG = path.resolve(HERE, '..', 't3-orig');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);

const oTest = fs.readFileSync(path.join(ORIG, 'deepgramBoundaryRepair.test.ts'));
const oMod = fs.readFileSync(path.join(ORIG, 'deepgramBoundaryRepair.ts'));
console.log(`t3-orig test  : ${oTest.length} B sha256 ${sha(oTest)} (brief: 7691 B c57ef099)`);
console.log(`t3-orig module: ${oMod.length} B sha256 ${sha(oMod)} (brief: 5940 B 4653b898)`);

const mTest = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.test.ts'));
const prefixSame = Buffer.compare(mTest.subarray(0, oTest.length), oTest) === 0;
console.log(`MAIN test's first ${oTest.length} bytes == t3-orig test byte for byte: ${prefixSame}`);
const tail = mTest.subarray(oTest.length).toString('utf8');
console.log(`appended tail: ${Buffer.byteLength(tail)} B; starts ${JSON.stringify(tail.slice(0, 40))}; ends ${JSON.stringify(tail.slice(-8))}`);
const count = (s, re) => (s.match(re) ?? []).length;
console.log(`it( in v3 file: ${count(oTest.toString('utf8'), /^\s*it\(/gm)} static + forEach-generated; it( in tail: ${count(tail, /^\s*it\(/gm)}; describe( in tail: ${count(tail, /^describe\(/gm)}`);
console.log(`CR bytes in MAIN test: ${mTest.includes(13)}; BOM: ${mTest[0] === 0xef}`);

// Unicode form of the literals
const t = mTest.toString('utf8');
console.log(`MAIN test is NFC: ${t === t.normalize('NFC')}; combining marks (\\p{M}) in the file: ${count(t, /\p{M}/gu)}`);
for (const word of ['résumé', 'İzmir', 'veritabanını', 'seçtiniz']) {
    const i = t.indexOf(word);
    console.log(`  "${word}" (NFC code points ${[...word].map((c) => c.codePointAt(0).toString(16)).join(' ')}) found as NFC: ${i >= 0}; NFD form present: ${t.includes(word.normalize('NFD'))}`);
}
const mMod = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
console.log(`MAIN module is NFC: ${mMod === mMod.normalize('NFC')}; non-ASCII chars in the module: ${[...new Set([...mMod].filter((c) => c.codePointAt(0) > 127))].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' ')}`);

// Negative #28
const fx = JSON.parse(fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), 'utf8'));
const n28 = fx.negatives[27];
console.log(`negative #28 (${n28.run}, ${n28.cls}):`);
for (const e of n28.events) console.log(`  ${e.isFinal ? 'FINAL  ' : 'interim'} atMs ${String(e.atMs).padStart(5)} ${JSON.stringify(e.text)}`);
const [I, F1, F2] = n28.events;
console.log(`  F1->F2 ${F2.atMs - F1.atMs} ms; I->F2 ${F2.atMs - I.atMs} ms; I->F1 ${F1.atMs - I.atMs} ms`);
