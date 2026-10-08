// Throwaway: per-question verdict matrix (in-app + every arm) for one run dir, plus the
// transcript gap: roster words missing from the question the app actually dispatched.
// usage: node verdict-matrix.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => /^interview60\.judge(\.[^.]+.*)?\.json$/.test(f) && !f.includes('.pairs') && !f.includes('.verdicts'));
const cols = [];
for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const name = f === 'interview60.judge.json' ? 'in-app' : f.replace('interview60.judge.', '').replace('.json', '').replace('gemini-', '').replace('openai_', '').replace('qwen_', '');
    cols.push({ name, items: j.items });
}
const order = ['in-app', '3.1-flash-lite', '3.5-flash-lite', 'qwen3.8-27b', 'gpt-oss-120b', '3.5-flash', '3.6-flash', '3.7-flash', '3.8-flash'];
cols.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
const letter = (it) => { if (!it) return '  .  '; const v = it.verdict ?? it.grade?.verdict; const s = it.scores ?? it.grade ?? it; const c = s.correctness ?? '?', t = s.on_topic ?? '?', d = s.delivery ?? '?'; return `${(v ?? '?')[0].toUpperCase()}${c}${t}${d} `; };
const ids = [...new Set(cols.flatMap((c) => Object.keys(c.items)))].filter((k) => /^S[12]Q\d\d$/.test(k)).sort();
console.log('id      ' + cols.map((c) => c.name.padEnd(15)).join(''));
for (const id of ids) console.log(id.padEnd(8) + cols.map((c) => { const it = c.items[id]; return letter(it).padEnd(15); }).join(''));
// transcript gap: roster text (arm pairs, clean) vs dispatched text (in-app pairs)
const clean = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.judge.pairs.gemini-3.1-flash-lite.json'), 'utf8')).items;
const app = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.judge.pairs.json'), 'utf8')).items;
const tok = (s) => (s ?? '').toLowerCase().replace(/\[.*$/s, '').replace(/[^a-z0-9%.\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
console.log('\ntranscript gap (roster words the dispatched question lacks):');
for (const id of ids) {
    const r = clean.find((i) => i.key === id), a = app.find((i) => i.key === id);
    if (!r || !a) continue;
    const have = new Set(tok(a.question));
    const missing = [...new Set(tok(r.question))].filter((w) => !have.has(w));
    console.log(`${id}  roster ${tok(r.question).length}w  dispatched ${tok(a.question).length}w  missing ${missing.length}: ${missing.join(' ')}`);
}
