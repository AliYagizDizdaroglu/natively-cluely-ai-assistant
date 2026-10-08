// Throwaway: is the CONTEXT block in the s50k captured prompts the same for every question (static profile) or
// per-question (retrieved knowledge / prior turns)? Prints sizes and how many distinct blocks exist.
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const ids = Object.keys(P).filter((k) => /^S[12]Q\d\dF?$/.test(k)).sort();
const ctx = (id) => { const u = P[id].user ?? ''; const a = u.indexOf('CONTEXT:'), b = u.indexOf('USER QUESTION:'); return a < 0 || b < a ? null : u.slice(a, b); };
const systems = new Set(ids.map((id) => P[id].system));
const blocks = new Map();
for (const id of ids) { const c = ctx(id); if (c == null) continue; blocks.set(c, [...(blocks.get(c) ?? []), id]); }
console.log(`ids ${ids.length}; distinct system prompts ${systems.size}; distinct CONTEXT blocks ${blocks.size}`);
for (const id of ids.slice(0, 6)) {
    const c = ctx(id);
    const heads = c == null ? [] : [...c.matchAll(/^(\[[^\]\n]{2,60}\]|[A-Z][A-Z /_-]{3,40}:)/gm)].map((m) => m[1]).slice(0, 12);
    console.log(id, c == null ? 'no CONTEXT' : `${c.length} chars; headings: ${heads.join(' | ')}`);
}
