// Throwaway: for h40b's ten in-app misses, the roster question text and the per-model record on the same
// item (3.1-lite LOW twins x3, 3.5-lite HIGH twins x3, the bare arms), so each miss can be read as model
// capability (both models miss), model choice (one model gets it) or pipeline (the twins get it, in-app not).
import fs from 'node:fs';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const RUN = `${G}/interview60.runs/2026-09-26T11-39-51-h40b`;
const J = (f) => JSON.parse(fs.readFileSync(`${RUN}/${f}`, 'utf8'));
const acc = (v) => v && v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1;
const mark = (v) => (!v ? '·' : acc(v) ? 'A' : v.correctness === 0 ? 'X' : 'w');
const src = fs.readdirSync(G).filter((f) => /^holdout40.*\.mjs$/.test(f)).map((f) => fs.readFileSync(`${G}/${f}`, 'utf8')).join('\n');
const qtext = (id) => { const m = src.match(new RegExp(`id:\\s*'${id}'[\\s\\S]{0,300}?q:\\s*(["'\`])([\\s\\S]*?)\\1`)); return m ? m[2].replace(/\s+/g, ' ') : '(not found)'; };
const groups = {
    '3.1 LOW twins': ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3'],
    '3.5 HIGH twins': ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3'],
    'bare 3.1 LOW / 3.5 HIGH': ['gemini-3.1-flash-lite_low', 'gemini-3.5-flash-lite_high'],
};
const V = Object.fromEntries(Object.values(groups).flat().map((a) => [a, J(`interview60.judge.verdicts.${a}.json`)]));
const inapp = J('interview60.judge.verdicts.json');
for (const id of ['R02F', 'R05', 'R07', 'R07F', 'R08', 'R09F', 'R11F', 'R12', 'R26', 'R30']) {
    const parent = id.endsWith('F') ? id.slice(0, -1) : null;
    console.log(`\n${id} in-app ${mark(inapp[id])} | ${Object.entries(groups).map(([g, arms]) => `${g} ${arms.map((a) => mark(V[a][id])).join('')}`).join(' | ')}`);
    if (parent) console.log(`  parent ${parent}: ${qtext(parent).slice(0, 160)}`);
    console.log(`  Q: ${qtext(id).slice(0, 260)}`);
}
console.log('\nA acceptable, w weak, X wrong, · no verdict (not asked / not answered)');
