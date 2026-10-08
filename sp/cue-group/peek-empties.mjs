// Throwaway: what an EMPTY cue block looked like in the spikes (the head of the raw output only, 140 chars,
// where the block should be), to tell a missing sentinel from a malformed line grammar.
import fs from 'node:fs';
const files = fs.readdirSync(new URL('.', import.meta.url)).filter((f) => /^spike\d?-.*\.json$/.test(f) || /^spike\d-2026.*\.json$/.test(f));
for (const f of files) {
    const rows = JSON.parse(fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8'));
    for (const r of rows.filter((x) => x.n === 0)) console.log(`${f.slice(0, 7)} ${r.id} ${r.model} ${r.arm} rep${r.rep}: raw head ${JSON.stringify(String(r.raw).slice(0, 140))}`);
}
