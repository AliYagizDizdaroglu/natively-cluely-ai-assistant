// Throwaway: which spoken roster questions classify as NEGOTIATION under the
// old (HEAD) and new (working-tree) lists. Calibration: holdout40 old must be ['R09'].
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const cls = {
    old: (await import(pathToFileURL(join(here, 'bundle-old.mjs')).href)).classifyIntent,
    new: (await import(pathToFileURL(join(here, 'bundle-new.mjs')).href)).classifyIntent,
};
for (const name of ['holdout40', 'interview60', 'scenario50']) {
    const { SPOKEN } = await import(pathToFileURL(G + `${name}.questions.mjs`).href);
    for (const tag of ['old', 'new']) {
        const hits = SPOKEN.filter((i) => cls[tag](i.q) === 'negotiation');
        console.log(`${name} (${SPOKEN.length} spoken) ${tag}: ${hits.length} negotiation ${JSON.stringify(hits.map((i) => i.id))}`);
        if (tag === 'new') for (const h of hits) console.log(`    ${h.id}: ${h.q}`);
    }
}
