// Throwaway (Task 3): transpile the STAGED module with MAIN's esbuild, the way verify-plan-v4.mjs does it
// (esbuild.transformSync(ts, { loader: 'ts', ... })), into sdd\t3-check\ — as CommonJS .js (check-v4.mjs loads a .js through
// require, and the real build in dist-electron is CommonJS) and as ESM .mjs (the form verify-plan-v4.mjs writes).
// Also asserts the staged module is byte-identical to MAIN's copy, so the check covers what is in MAIN. Read-only on MAIN.
//   node t3-transpile.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const REL = 'electron/audio/deepgramBoundaryRepair.ts';
const staged = fs.readFileSync(path.join(HERE, '..', 'stage', REL));
const inMain = fs.readFileSync(path.join(MAIN, REL));
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
if (Buffer.compare(staged, inMain) !== 0) { console.log(`STOP: staged module (${sha(staged)}) differs from MAIN's (${sha(inMain)})`); process.exit(1); }
console.log(`staged module == MAIN's copy: ${staged.length} bytes, sha256 ${sha(staged)}`);
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
console.log(`esbuild ${esbuild.version}`);
const outDir = path.join(HERE, 't3-check');
fs.mkdirSync(outDir, { recursive: true });
for (const [format, ext] of [['cjs', 'js'], ['esm', 'mjs']]) {
    const js = esbuild.transformSync(staged.toString('utf8'), { loader: 'ts', format }).code;
    const p = path.join(outDir, `deepgramBoundaryRepair.${ext}`);
    fs.writeFileSync(p, js);
    console.log(`wrote ${p} (${format}, ${js.length} chars)`);
}
