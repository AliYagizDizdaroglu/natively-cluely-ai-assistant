// Task 4 fix round 1 (throwaway): prove the concern-2 change is COMMENT ONLY. Compares the round-0 adapter (sdd\t4-r0\, = MAIN before
// this round) with the staged adapter (or MAIN's, with --from main):
//   1. text level: exactly one character was inserted, it is a comma, on a `//` comment line, and removing it gives back the round-0 file;
//      exactly one line differs (both versions printed)
//   2. esbuild transpile (MAIN's own esbuild, loader ts, format cjs): the two outputs are byte-identical
//   3. calibration: the same transpile check says DIFFERENT for (a) a code change (`=== true` -> `== true`) and (b) a comma added
//      inside a string literal, so it can fail
//   node t4-fix1-comment-proof.mjs [--from main]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage');
const REL = 'electron/audio/DeepgramStreamingSTT.ts';
const fromMain = process.argv.includes('--from') && process.argv[process.argv.indexOf('--from') + 1] === 'main';
const before = fs.readFileSync(path.join(HERE, 't4-r0', 'DeepgramStreamingSTT.ts'), 'utf8');
const after = fs.readFileSync(path.join(fromMain ? MAIN : STAGE, REL), 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok      ' : 'PROBLEM '} ${msg}`); };
console.log(`before (round 0) ${before.length} chars ${sha(before)}; after (${fromMain ? 'MAIN' : 'STAGE'}) ${after.length} chars ${sha(after)}`);

// 1. text level
let i = 0; while (i < before.length && before[i] === after[i]) i++;
const inserted = after[i];
const removedBack = after.slice(0, i) + after.slice(i + 1);
check(after.length === before.length + 1, `exactly one character longer (${after.length - before.length})`);
check(inserted === ',', `the inserted character is ${JSON.stringify(inserted)}`);
check(removedBack === before, 'removing it gives back the round-0 file');
const lineStart = after.lastIndexOf('\n', i) + 1;
const lineEnd = after.indexOf('\n', i);
const lineAfter = after.slice(lineStart, lineEnd);
check(/^\s*\/\//.test(lineAfter), 'the changed line is a // comment line');
const bl = before.split('\n'), al = after.split('\n');
const diffLines = al.map((l, n) => (l !== bl[n] ? n + 1 : 0)).filter(Boolean);
check(al.length === bl.length && diffLines.length === 1, `exactly one line differs (line ${diffLines.join(',')} of ${al.length})`);
console.log(`   before: ${bl[diffLines[0] - 1]}\n   after : ${al[diffLines[0] - 1]}`);
console.log(`   next  : ${al[diffLines[0]]}`);

// 2. transpile equality
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const tr = (ts) => esbuild.transformSync(ts, { loader: 'ts', format: 'cjs' }).code;
const tb = tr(before), ta = tr(after);
console.log(`transpile before ${tb.length} chars ${sha(tb)}; after ${ta.length} chars ${sha(ta)}`);
check(tb === ta, 'esbuild transpile of before and after is byte-identical');

// 3. calibration: the check must be able to say DIFFERENT
const once = (text, oldS, newS) => { if (text.split(oldS).length !== 2) throw new Error(`calibration anchor not unique: ${oldS}`); return text.replace(oldS, () => newS); };
const codeChange = tr(once(after, 'data.speech_final === true', 'data.speech_final == true'));
check(codeChange !== tb, 'calibration (a): a code change (=== -> ==) makes the transpile DIFFERENT');
const stringChange = tr(once(after, "'[DeepgramStreaming] Restarting due to config change...'", "'[DeepgramStreaming] Restarting, due to config change...'"));
check(stringChange !== tb, 'calibration (b): a comma added inside a string literal makes the transpile DIFFERENT');
console.log(bad ? `\n${bad} problem(s)` : '\ncomment-only change proven');
process.exit(bad ? 1 : 0);
