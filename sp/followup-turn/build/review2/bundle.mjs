// Bundles the WT's earlierQuestion.ts (read-only) into this folder as ESM, then writes app-as-ref.mjs:
// the app's functions under the reference's export names, plus insertBlock/BEFORE_MARKER from the
// design-2 reference (not part of Task 2), so earlierQuestion.ref.test.mjs can run against the app via EQ_REF.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/eq-build`;
const require = createRequire(`${MAIN}/package.json`);
const esbuild = require('esbuild');
await esbuild.build({
    entryPoints: [`${WT}/electron/llm/earlierQuestion.ts`],
    bundle: true, format: 'esm', platform: 'node', outfile: path.join(HERE, 'app-eq.mjs'), logLevel: 'warning',
    absWorkingDir: HERE,
});
await esbuild.build({
    entryPoints: [`${WT}/electron/services/questionReconcile.ts`],
    bundle: true, format: 'esm', platform: 'node', outfile: path.join(HERE, 'app-qr.mjs'), logLevel: 'warning',
    absWorkingDir: HERE,
});
fs.writeFileSync(path.join(HERE, 'app-as-ref.mjs'), `export * from './app-eq.mjs';
export { gate } from './app-gate.mjs';
export { sameAnchor } from './app-qr.mjs';
export { insertBlock, BEFORE_MARKER } from '../../../followup-context/earlierQuestions.ref.mjs';
`);
await esbuild.build({
    entryPoints: [`${WT}/electron/llm/earlierQuestionGate.ts`],
    bundle: true, format: 'esm', platform: 'node', outfile: path.join(HERE, 'app-gate.mjs'), logLevel: 'warning',
    absWorkingDir: HERE,
});
console.log('bundled');
