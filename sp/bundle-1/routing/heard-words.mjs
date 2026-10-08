// The HEARD dispatch word count per live40 id in r1 (spec 1.4: "apply the guard to the r1 heard dispatch text per id (3.1's source)"): the LAST dispatch (answer or supersede) per id,
// ids by the harness's own play-window pairing, words = whitespace tokens. Reads the bench's r1 COPY (bench/r1-repaired). Writes NUMBERS ONLY to routing/heard-words.json. NO network, NO model.
//   node heard-words.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPAIRED, GOLDEN_BUNDLE, ROUTING, loadRoster } from './common.mjs';

export const wc = (t) => (String(t).trim().match(/\S+/g) || []).length;
/** { id: wordCount } of the last dispatch per id. Pure. */
export function wordsPerId(dispatches) { const last = {}; for (const d of dispatches) last[d.id] = wc(d.question); return last; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const P = await import(pathToFileURL(`${GOLDEN_BUNDLE}/interview60.prompts.mjs`).href);
    const dispatches = P.idsForDispatches(P.readDispatches(fs.readFileSync(path.join(REPAIRED, 'natively_debug.log'), 'utf8')), JSON.parse(fs.readFileSync(path.join(REPAIRED, 'interview60.timeline.json'), 'utf8')));
    const words = wordsPerId(dispatches);
    const live = await loadRoster('live40');
    const missing = live.filter((i) => typeof words[i.id] !== 'number').map((i) => i.id);
    if (missing.length) { console.log(`REFUSED: no dispatch for ${missing.join(',')}`); process.exit(2); }
    const out = Object.fromEntries(live.map((i) => [i.id, words[i.id]]));
    fs.writeFileSync(path.join(ROUTING, 'heard-words.json'), JSON.stringify(out, null, 1));
    const over = live.filter((i) => out[i.id] > 12);
    console.log(`heard words: ${live.length} ids; over 12 words: ${over.length} (HARD ${over.filter((i) => i.key === 'HARD').length}, EASY ${over.filter((i) => i.key === 'EASY').length}); RH04 ${out.RH04} words`);
}
