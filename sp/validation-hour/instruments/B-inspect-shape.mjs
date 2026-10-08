// Builder B scratch (read-only, no API): the SHAPE of one answers file and one merged judge file — field names, types,
// counts and lengths only; never a value that is text.
//   node B-inspect-shape.mjs <answers.json> [<judge.json>]
import fs from 'node:fs';
const [af, jf] = process.argv.slice(2);
const kind = (x) => (x === null ? 'null' : Array.isArray(x) ? `array(${x.length})` : typeof x === 'string' ? `string(len ${x.length})` : typeof x);
const a = JSON.parse(fs.readFileSync(af, 'utf8'));
const recs = Object.entries(a);
console.log(`answers file: ${recs.length} entries; top-level keys look like ids: ${recs.slice(0, 5).map(([k]) => k).join(' ')} ...`);
const keyCount = {};
for (const [, v] of recs) for (const k of Object.keys(v)) keyCount[k] = (keyCount[k] ?? 0) + 1;
console.log(`field -> records carrying it: ${JSON.stringify(keyCount)}`);
const [k0, v0] = recs.find(([, v]) => v.spoken) ?? recs[0];
console.log(`one answered record (${k0}) field kinds: ${Object.entries(v0).map(([k, x]) => `${k}=${k === 'checks' ? 'object' : kind(x)}`).join(', ')}`);
const holes = recs.filter(([, v]) => v.transientError).map(([k, v]) => `${k}(${v.transientError})`);
const empties = recs.filter(([, v]) => !v.transientError && !v.spoken).map(([k, v]) => `${k}(rawLen ${v.rawLen ?? 'n/a'}, finish ${v.finish ?? 'n/a'}, cues ${Array.isArray(v.cues) ? v.cues.length : 'n/a'})`);
console.log(`holes (transientError): ${holes.join(' ') || 'none'}`);
console.log(`empty prose without transientError: ${empties.join(' ') || 'none'}`);
console.log(`id field equals the key on every record: ${recs.every(([k, v]) => v.id === k)}`);
console.log(`cues field kinds: ${JSON.stringify(recs.reduce((m, [, v]) => { const t = 'cues' in v ? kind(v.cues).replace(/\(.*/, '') : 'absent'; m[t] = (m[t] ?? 0) + 1; return m; }, {}))}`);
if (jf) {
    const j = JSON.parse(fs.readFileSync(jf, 'utf8'));
    console.log(`judge file top-level keys: ${Object.keys(j).join(', ')}; graderModel ${j.graderModel}; graderPrompt ${j.graderPrompt}`);
    const items = Object.entries(j.items ?? {});
    const ic = {};
    for (const [, v] of items) for (const k of Object.keys(v)) ic[k] = (ic[k] ?? 0) + 1;
    console.log(`judge items ${items.length}; field -> items: ${JSON.stringify(ic)}`);
    console.log(`verdict counts: ${JSON.stringify(items.reduce((m, [, v]) => { m[v.verdict] = (m[v.verdict] ?? 0) + 1; return m; }, {}))}`);
    console.log(`item keys equal ids: ${items.every(([k, v]) => k === v.id)}; kinds: ${JSON.stringify(items.reduce((m, [, v]) => { m[v.kind] = (m[v.kind] ?? 0) + 1; return m; }, {}))}`);
    const spokenIds = recs.filter(([, v]) => !v.transientError && v.spoken).map(([k]) => k);
    const judged = new Set(items.map(([k]) => k));
    console.log(`answered ids ${spokenIds.length}; answered ids with no judge item: ${spokenIds.filter((id) => !judged.has(id)).join(' ') || 'none'}; judge items for non-answered ids: ${items.filter(([k]) => !spokenIds.includes(k)).map(([k]) => k).join(' ') || 'none'}`);
}
