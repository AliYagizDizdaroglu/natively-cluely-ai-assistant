// Throwaway: the SHAPE of s50m-gated.json (keys, field names, lengths) — never its prompt text, which
// carries the user's profile. Prints `current` only (the pinned interviewer question, roster text).
import fs from 'node:fs';
const g = JSON.parse(fs.readFileSync(new URL('./s50m-gated.json', import.meta.url), 'utf8'));
for (const [id, o] of Object.entries(g)) {
    const shape = Object.entries(o).map(([k, v]) => `${k}:${typeof v === 'string' ? v.length : JSON.stringify(v)?.slice(0, 40)}`).join(' ');
    console.log(`${id}\t${shape}`);
    console.log(`\tcurrent: ${String(o.current).slice(0, 140)}`);
}
