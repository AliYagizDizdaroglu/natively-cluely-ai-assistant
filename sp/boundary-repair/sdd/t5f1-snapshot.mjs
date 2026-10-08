// Task 5 fix round 1 (throwaway): snapshot a STAGED file into sdd\t5f1-steps\ under a step label, so every later evidence run reads
// the exact bytes that existed at that step (the staged file keeps evolving). Prints size + sha256. Read-only on MAIN.
//   node t5f1-snapshot.mjs test v1      -> t5f1-steps\test.v1.ts   (from stage\...\interview60.turns-finals.test.ts)
//   node t5f1-snapshot.mjs module m1    -> t5f1-steps\mod.m1.mjs   (from stage\...\interview60.turns-finals.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage', 'electron', 'test', 'golden');
const [kind, label] = process.argv.slice(2);
const MAP = { test: ['interview60.turns-finals.test.ts', `test.${label}.ts`], module: ['interview60.turns-finals.mjs', `mod.${label}.mjs`] };
if (!MAP[kind] || !label) { console.log('usage: node t5f1-snapshot.mjs <test|module> <label>'); process.exit(2); }
const [src, dstName] = MAP[kind];
const dst = path.join(HERE, 't5f1-steps', dstName);
fs.mkdirSync(path.dirname(dst), { recursive: true });
const b = fs.readFileSync(path.join(STAGE, src));
fs.writeFileSync(dst, b);
const c = fs.readFileSync(dst);
console.log(`${dstName}: ${c.length} B sha256 ${createHash('sha256').update(c).digest('hex').slice(0, 16)}, CR bytes ${c.filter((x) => x === 13).length}`);
