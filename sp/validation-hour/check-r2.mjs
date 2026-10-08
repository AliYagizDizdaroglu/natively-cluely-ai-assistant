import fs from 'node:fs';
const v = JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/validation-hour/h40d-verdicts-captured-no-cues-high-r2.json', 'utf8'));
const p = JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d/interview60.judge.pairs.gemini-3.5-flash-lite_captured-no-cues-high-r2.json', 'utf8'));
const k = Object.keys(v); const ik = p.items.map(i => i.key);
console.log('keys', k.length, 'items', ik.length, 'missing', ik.filter(x => !v[x]));
let b = 0, z = 0; const c = {};
for (const x of k) { const e = v[x]; if (e.correctness === 2 && e.on_topic === 2) b++; if (e.correctness === 0 || e.on_topic === 0) z++; const s = `${e.correctness}/${e.on_topic}/${e.delivery}`; c[s] = (c[s] || 0) + 1; }
console.log('both2', b, 'zero', z, JSON.stringify(c));
