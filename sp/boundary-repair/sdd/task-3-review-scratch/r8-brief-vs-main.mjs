// Task 3 review (Opus), throwaway. Read-only. Independent of the implementer's t3-verify-stage.mjs: writes the brief's
// two fenced blocks (Step 1 test block, Step 3 module) next to this script so `git diff --no-index` can show every line
// MAIN differs from the brief (expected: only the M-a ruling's lines). Also: CR/BOM of MAIN's module, and the
// fixtures file is byte-identical to BR/fixtures-v3.json.
//   node r8-brief-vs-main.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const brief = fs.readFileSync(path.join(BR, 'sdd', 'task-3-brief.md'), 'utf8');
const blocks = [...brief.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);
console.log(`ts blocks in the brief: ${blocks.length} (interfaces, Step 1 tests, Step 3 module)`);
const testBlock = blocks.find((b) => b.startsWith("describe('deepgramBoundaryRepair v4"));
const moduleBlock = blocks.find((b) => b.startsWith('/**\n * Puts back'));
const orig = fs.readFileSync(path.join(HERE, '..', 't3-orig', 'deepgramBoundaryRepair.test.ts'), 'utf8');
// The brief: "Append this block at the END ... (after the closing `});`)": v3 file + a blank line + the block.
fs.writeFileSync(path.join(HERE, 'brief-expected.test.ts.txt'), `${orig}\n${testBlock}`);
fs.writeFileSync(path.join(HERE, 'brief-expected.module.ts.txt'), moduleBlock);
const mod = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'));
console.log(`MAIN module: CR ${mod.includes(13)}, BOM ${mod[0] === 0xef}, ends with LF ${mod[mod.length - 1] === 10}`);
const fxMain = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'));
const fxBr = fs.readFileSync(path.join(BR, 'fixtures-v3.json'));
console.log(`fixtures.json == BR/fixtures-v3.json byte for byte: ${Buffer.compare(fxMain, fxBr) === 0} (${fxMain.length} B)`);
