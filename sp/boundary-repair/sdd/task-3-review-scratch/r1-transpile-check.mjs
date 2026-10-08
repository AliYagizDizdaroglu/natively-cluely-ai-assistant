// Task 3 review (Opus), throwaway. Read-only on MAIN.
// 1. Fingerprint MAIN's two changed files (must be the reviewed 10262 B / 8aca65e4 and 13159 B / 10d8040a).
// 2. Transpile MAIN's module (not the stage) with MAIN's esbuild, using build-electron.js's options
//    (format cjs, platform node, target node20), into this folder as deepgramBoundaryRepair.js.
// 3. Run check-v4.mjs --module on it; save the full output next to this script and print the verdict lines.
//   node r1-transpile-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const want = {
    'electron/audio/deepgramBoundaryRepair.ts': [10262, '8aca65e4'],
    'electron/audio/deepgramBoundaryRepair.test.ts': [13159, '10d8040a'],
};
let ok = true;
for (const [rel, [size, prefix]] of Object.entries(want)) {
    const b = fs.readFileSync(path.join(MAIN, rel));
    const h = sha(b);
    const match = b.length === size && h.startsWith(prefix);
    if (!match) ok = false;
    console.log(`${match ? 'OK  ' : 'DIFF'} ${rel}: ${b.length} B sha256 ${h.slice(0, 16)} (reviewed: ${size} B ${prefix})`);
}
if (!ok) { console.log('STOP: MAIN is not the reviewed state'); process.exit(1); }

const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const src = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
const js = esbuild.transformSync(src, { loader: 'ts', format: 'cjs', platform: 'node', target: 'node20' }).code;
const out = path.join(HERE, 'deepgramBoundaryRepair.js');
fs.writeFileSync(out, js);
console.log(`esbuild ${esbuild.version}: wrote ${out} (${Buffer.byteLength(js)} B, sha256 ${sha(js).slice(0, 16)})`);
// The regex must survive transpilation untouched (a lowered /u regex would change behaviour).
console.log(`NON_ASCII_LETTER in the output: ${(js.match(/const NON_ASCII_LETTER = .*;/) ?? ['(missing)'])[0]}`);

const r = spawnSync(process.execPath, [path.join(BR, 'check-v4.mjs'), '--module', out], { encoding: 'utf8', timeout: 300000 });
const text = `${r.stdout}${r.stderr}`;
fs.writeFileSync(path.join(HERE, 'r1-check-v4.out.txt'), text);
console.log(`check-v4.mjs --module exit ${r.status}; FAIL lines: ${text.split('\n').filter((l) => l.startsWith('FAIL')).length}; PASS lines: ${text.split('\n').filter((l) => l.startsWith('PASS')).length}`);
for (const l of text.split('\n')) if (/^(candidate:|PASS  data:|EQUIVALENT|NOT EQUIVALENT|ALL CHECKS|\d+ CHECK)/.test(l)) console.log(`  ${l}`);
