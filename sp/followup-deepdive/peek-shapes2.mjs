// Shapes only: one graded item of interview60.judge.json (keys and value types), and the section markers of one
// captured follow-up prompt (marker names, their order and line counts; never the text).
import fs from 'node:fs';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const R = `${G}/interview60.runs/2026-09-22T08-22-50-s50m`;
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const j = J(`${R}/interview60.judge.json`);
const it = j.items.S1Q04F;
console.log('judge item S1Q04F:', Array.isArray(it) ? `array(${it.length}) of keys ${Object.keys(it[0] ?? {}).join(',')}` : `keys ${Object.keys(it).join(',')}`);
if (!Array.isArray(it)) for (const [k, v] of Object.entries(it)) console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v)?.slice(0, 80).replace(/"[^"]{30,}"/g, '"…"') : typeof v === 'string' ? `string(${v.length})` : v}`);
const p = J(`${R}/interview60.prompts.json`).S1Q04F.user.split('\n');
const markers = [];
p.forEach((l, i) => { const m = l.match(/^([A-Z][A-Z ()]{6,}[A-Z):]|\[[A-Z]+\]:|\d+\. "|<\/?[a-z_]+>)/); if (m) markers.push(`${i}:${m[1].slice(0, 40)}`); });
console.log(`S1Q04F user prompt: ${p.length} lines; markers: ${markers.join(' | ')}`);
const pv = J(`${G}/interview60.runs/2026-10-02T11-39-41-h40d/interview60.prompts.json`).R11F.user.split('\n');
const m2 = []; pv.forEach((l, i) => { const m = l.match(/^([A-Z][A-Z ()]{6,}[A-Z):]|\[[A-Z]+\]:|\d+\. "|<\/?[a-z_]+>)/); if (m) m2.push(`${i}:${m[1].slice(0, 40)}`); });
console.log(`h40d R11F user prompt: ${pv.length} lines; markers: ${m2.join(' | ')}`);
