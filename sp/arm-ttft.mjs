// THROWAWAY: first-token / total / words per answer arm of the s50a flight, read from the
// answers files the arms wrote (same hour as the in-app run, bare prompt, no app in between).
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = process.argv[2] ?? path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a');
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const files = fs.readdirSync(RUN).filter((f) => /^interview60\.answers(\..+)?\.json$/.test(f));
console.log(`answers files in run dir: ${files.join(', ') || '(none yet)'}`);
for (const f of files) {
    const store = JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'));
    const rows = Object.values(store).filter((v) => v && typeof v === 'object' && v.spoken);
    if (!rows.length) { console.log(`${f}: no spoken answers`); continue; }
    const model = rows[0].model ?? f;
    const ttft = rows.map((v) => v.ttft).filter((x) => typeof x === 'number');
    const total = rows.map((v) => v.total).filter((x) => typeof x === 'number');
    const words = rows.map((v) => v.words ?? (v.spoken.match(/\S+/g) ?? []).length);
    const errors = Object.values(store).filter((v) => v && typeof v === 'object' && !v.spoken).length;
    console.log(`${model.padEnd(24)} n=${rows.length}${errors ? ` (+${errors} without answer)` : ''}  ttft p50 ${pct(ttft, .5)}ms p90 ${pct(ttft, .9)}ms max ${Math.max(...ttft)}ms   total p50 ${pct(total, .5)}ms   words p50 ${pct(words, .5)} max ${Math.max(...words)}`);
    console.log(`  keys: ${Object.keys(rows[0]).join(' ')}`);
}
