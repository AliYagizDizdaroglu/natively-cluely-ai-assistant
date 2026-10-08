// Throwaway (Task 3, fix round 1): this round changes only COMMENTS in the module. Prove it: compile the round-1 module
// (BR\sdd\t3-r1-orig, 10262 B) and the new staged module with MAIN's esbuild (comments are dropped by the compiler) and compare the
// output. Calibrated: a one-token CODE change (MAX_SKIPPED_WORDS 2 -> 3) must compile differently. MAIN is only read.
//   node t3-r1-code-unchanged.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const compile = (ts, format) => esbuild.transformSync(ts, { loader: 'ts', format }).code;
const start = fs.readFileSync(path.join(HERE, 't3-r1-orig', 'deepgramBoundaryRepair.ts'), 'utf8');
const now = fs.readFileSync(path.join(HERE, '..', 'stage', 'electron', 'audio', 'deepgramBoundaryRepair.ts'), 'utf8');
let bad = 0;
for (const format of ['cjs', 'esm']) {
    const a = compile(start, format), b = compile(now, format);
    console.log(`compiled ${format}: round-1 module ${a.length} chars, new module ${b.length} chars, identical: ${a === b}`);
    if (a !== b) bad++;
}
const needle = 'const MAX_SKIPPED_WORDS = 2;';
if (now.split(needle).length !== 2) throw new Error('calibration anchor not found exactly once');
const mutated = compile(now.replace(needle, () => 'const MAX_SKIPPED_WORDS = 3;'), 'cjs');
const differs = mutated !== compile(start, 'cjs');
console.log(`calibration (MAX_SKIPPED_WORDS 2 -> 3 must compile differently): differs: ${differs}`);
if (!differs) bad++;
console.log(`source sizes: round-1 module ${Buffer.byteLength(start)} B -> new module ${Buffer.byteLength(now)} B`);
process.exit(bad ? 1 : 0);
