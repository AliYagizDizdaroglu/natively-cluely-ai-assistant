// Prints the SHAPE (keys, types, counts) of the files the follow-up map will read: never values that carry answers,
// prompts or the profile. Roster files: the exported arrays' names, lengths and per-item keys; kinds and chain fields.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const R = `${G}/interview60.runs/2026-09-22T08-22-50-s50m`;
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const shape = (o, d = 0) => Array.isArray(o) ? `array(${o.length}) of ${o.length ? shape(o[0], d + 1) : '?'}` : o && typeof o === 'object' ? `{${Object.keys(o).slice(0, 25).map((k) => d < 1 ? `${k}: ${shape(o[k], d + 1)}` : k).join(', ')}}` : typeof o;
for (const f of ['interview60.judge.json', 'interview60.judge.pairs.json', 'interview60.timeline.json']) {
    try { const o = J(`${R}/${f}`); console.log(`${f}: ${shape(o)}`); } catch (e) { console.log(`${f}: ${e.message}`); }
}
const p = J(`${R}/interview60.prompts.json`); const k0 = Object.keys(p)[0];
console.log(`interview60.prompts.json: ${Object.keys(p).length} keys, e.g. ${k0}: ${shape(p[k0])}`);
for (const f of fs.readdirSync(G).filter((x) => /questions\.mjs$|roster/i.test(x))) {
    try {
        const m = await import(pathToFileURL(`${G}/${f}`).href);
        for (const [name, v] of Object.entries(m)) if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
            const kinds = {}; for (const x of v) kinds[x.kind ?? x.level ?? '?'] = (kinds[x.kind ?? x.level ?? '?'] ?? 0) + 1;
            console.log(`${f} export ${name}: ${v.length} items, keys ${Object.keys(v[0]).join(',')}; kinds ${JSON.stringify(kinds)}; with chain ${v.filter((x) => x.chain).length}`);
        }
    } catch (e) { console.log(`${f}: ${e.message.slice(0, 120)}`); }
}
