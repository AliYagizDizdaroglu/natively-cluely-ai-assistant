// Builds the OLD (HEAD) and NEW (working tree) verbalStreamFilter into scratch cjs files; MAIN's dist-electron is never touched.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const M = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
const { build } = createRequire(M + '/package.json')('esbuild');
const here = path.dirname(fileURLToPath(import.meta.url));
for (const v of ['old', 'new']) {
    await build({ entryPoints: [`${here}/build/${v}/verbalStreamFilter.ts`], outfile: `${here}/build/${v}/verbalStreamFilter.cjs`, bundle: false, platform: 'node', target: 'node20', format: 'cjs', absWorkingDir: here });
    console.log('built', v);
}
