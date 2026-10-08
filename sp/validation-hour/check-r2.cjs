const fs = require('fs');
const v = JSON.parse(fs.readFileSync(__dirname + '/h40d-verdicts-captured-high-r2.json', 'utf8'));
const p = JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json', 'utf8'));
const k = Object.keys(v);
const ik = p.items.map(i => i.key);
console.log('verdicts', k.length, 'items', ik.length, 'allPresent', ik.every(x => k.includes(x)));
const c = {};
for (const x of k) { const s = v[x]; const t = `c${s.correctness}/o${s.on_topic}/d${s.delivery}`; c[t] = (c[t] || 0) + 1; }
console.log(JSON.stringify(c));
console.log('c2o2', k.filter(x => v[x].correctness === 2 && v[x].on_topic === 2).length, 'c0|o0', k.filter(x => v[x].correctness === 0 || v[x].on_topic === 0).length);
