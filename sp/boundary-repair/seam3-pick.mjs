// Throwaway (2026-09-29): pick FRESH non-holdout clips for the v4 seam probe (DESIGN-v4 §7 item 5): items whose
// non-holdout logs showed a SKIP loss (rule-v3.out.txt TRUE lines, h4* runs excluded) and that were NOT streamed
// in seam1/seam2; plus, for breadth, every other scenario50/interview60 item with a cached clip whose question
// is long (>= 18 words: long questions are where Deepgram splits finals). Prints ids + clip seconds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTERVIEW } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs';
import { SCENARIO50 } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/scenario50.questions.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const used = new Set();
for (const f of fs.readdirSync(path.join(HERE, 'seam-probe')).filter((f) => f.startsWith('plan-'))) {
    for (const p of JSON.parse(fs.readFileSync(path.join(HERE, 'seam-probe', f), 'utf8')).plan) used.add(p.id);
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const items = [...SCENARIO50, ...INTERVIEW].map((i) => ({ id: i.id, q: i.q, n: norm(i.q) }));
const clip = (id) => [`${G}/scenario50-tts-local/${id}.wav`, `${G}/interview60-tts-local/${id}.wav`].find((f) => fs.existsSync(f));
const secs = (f) => { const b = fs.readFileSync(f); return b.length / (b.readUInt32LE(28)); }; // bytes / byteRate (header-ish; for sizing only)
const losses = fs.readFileSync(path.join(HERE, 'evidence', 'rule-v3.out.txt'), 'utf8').split('\n')
    .filter((l) => /^TRUE\s/.test(l) && !/\bh4/.test(l.split(/\s+/)[1] ?? ''))
    .map((l) => { const m = l.match(/restored "(.*?)" before "(.*)"$/); return m && norm(`${m[1]} ${m[2]}`).split(' ').slice(0, 6).join(' '); })
    .filter(Boolean);
const lossIds = new Map();
for (const phrase of losses) {
    const hit = items.filter((i) => i.n.includes(phrase));
    for (const h of hit) lossIds.set(h.id, (lossIds.get(h.id) ?? 0) + 1);
    if (!hit.length) console.log(`(no roster item holds "${phrase}")`);
}
console.log('LOSS ITEMS (non-holdout logs):');
for (const [id, n] of lossIds) {
    const c = clip(id);
    console.log(`  ${id.padEnd(7)} losses ${n}  ${used.has(id) ? 'USED in seam1/2' : 'FRESH'}  clip ${c ? `${secs(c).toFixed(1)} s` : 'NONE'}  ${items.find((i) => i.id === id).q.slice(0, 90)}`);
}
const long = items.filter((i) => !used.has(i.id) && !lossIds.has(i.id) && i.n.split(' ').length >= 18 && clip(i.id));
console.log(`\nOTHER FRESH LONG ITEMS with clips: ${long.length}`);
for (const i of long) console.log(`  ${i.id.padEnd(7)} ${i.n.split(' ').length} words  ${secs(clip(i.id)).toFixed(1)} s  ${i.q.slice(0, 80)}`);
