// Throwaway: apply the later tasks' built-file guards to esbuild bundles of the
// working-tree source (new) and of the HEAD list (old, calibration: must trip).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const GUARD = /["']salary["']\s*,/;
for (const tag of ['old', 'new']) {
    const js = readFileSync(join(here, `bundle-${tag}.mjs`), 'utf8');
    const m = js.match(GUARD);
    console.log(`${tag}: standalone-salary guard ${m ? 'TRIPS on ' + JSON.stringify(m[0]) : 'clean'}; 'salary expectations' ${js.includes('salary expectations') ? 'present' : 'ABSENT'}`);
}
