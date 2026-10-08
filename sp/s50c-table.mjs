// Throwaway: per-question verdict table for flight s50c — in-app vs the 3.1-lite arm on all 20
// mains, and every model on the five focused questions.
import fs from 'node:fs';
import path from 'node:path';

const RUN = process.argv[2];
const load = (tag) => { const f = path.join(RUN, `interview60.judge${tag}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).items : null; };
const cols = {
    'in-app': load(''), '3.1-lite': load('.gemini-3.1-flash-lite'), '3.5-lite': load('.gemini-3.5-flash-lite'),
    'gpt-oss': load('.openai_gpt-oss-120b'), qwen: load('.qwen_qwen3.8-27b'),
    '3.8F': load('.gemini-3.8-flash'), '3.7F': load('.gemini-3.7-flash'), '3.6F': load('.gemini-3.6-flash'), '3.5F': load('.gemini-3.5-flash'),
};
const ids = []; for (const s of ['S1', 'S2']) for (let i = 1; i <= 10; i++) ids.push(`${s}Q${String(i).padStart(2, '0')}`);
const cell = (items, id) => { const v = items?.[id]; if (!v) return '   -   '; return `${v.correctness}/${v.on_topic}/${v.delivery}${v.verdict === 'acceptable' ? ' ok' : v.verdict === 'wrong' ? ' XX' : ' wk'}`; };
const names = Object.keys(cols).filter((k) => cols[k]);
console.log('id     ' + names.map((n) => n.padEnd(10)).join(''));
for (const id of ids) console.log(id + '  ' + names.map((n) => cell(cols[n], id).padEnd(10)).join(''));
console.log('\nacceptable: ' + names.map((n) => { const it = Object.values(cols[n]).filter((v) => v.kind === 'spoken' && !v.id?.endsWith('F') && v.level !== 'followup'); const mains = Object.entries(cols[n]).filter(([k]) => ids.includes(k)); return `${n} ${mains.filter(([, v]) => v.verdict === 'acceptable').length}/${mains.length}`; }).join('  '));
const app = cols['in-app'];
if (app) {
    const fu = Object.entries(app).filter(([k]) => /F$/.test(k));
    console.log(`in-app follow-ups acceptable: ${fu.filter(([, v]) => v.verdict === 'acceptable').length}/${fu.length}`);
    for (const [k, v] of Object.entries(app)) if (ids.includes(k) && v.verdict !== 'acceptable') console.log(`  ${k} [${v.verdict}] ${v.reason}`);
}
