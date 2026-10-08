// Throwaway (2026-09-29): can the L20 harness run the OTHER 20 scenario50 S1+S2 items (the complement of
// items.json)? Checks, per item: the TTS clip exists (run.mjs reads scenario50-tts-local/<id>.wav), the main has
// a captured s50k prompt with CONTEXT/USER QUESTION markers (run.mjs systemFor), and 3.5-lite HIGH answers exist
// in s50m (in-app + captured-high x3). Read-only.
//   node check-complement.mjs
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const L20 = JSON.parse(fs.readFileSync(new URL('items.json', import.meta.url), 'utf8')).pairs.flat();
const all = [];
for (const s of ['S1', 'S2']) for (let q = 1; q <= 10; q++) { const id = `${s}Q${String(q).padStart(2, '0')}`; all.push(id, `${id}F`); }
const comp = all.filter((id) => !L20.includes(id));
const P = JSON.parse(fs.readFileSync(`${RUNS}/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const s50m = `${RUNS}/2026-09-22T08-22-50-s50m`;
const arms = ['', '.gemini-3.5-flash-lite_captured-high', '.gemini-3.5-flash-lite_captured-high-r2', '.gemini-3.5-flash-lite_captured-high-r3'];
const pairsFiles = arms.map((s) => JSON.parse(fs.readFileSync(`${s50m}/interview60.judge.pairs${s}.json`, 'utf8')).items);
console.log(`complement: ${comp.length} items: ${comp.join(' ')}`);
let bad = 0;
for (const id of comp) {
    const wav = fs.existsSync(`${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`);
    const main = id.replace(/F$/, '');
    const p = P[main];
    const prompt = !!(p?.system && p?.user && p.user.indexOf('CONTEXT:') >= 0 && p.user.indexOf('USER QUESTION:') > p.user.indexOf('CONTEXT:'));
    const ans = pairsFiles.map((items) => !!items.find((x) => x.key === id)?.answer?.trim());
    const ok = wav && prompt && ans.every(Boolean);
    if (!ok) bad++;
    console.log(`${id.padEnd(7)} wav ${wav ? 'yes' : 'NO '}  s50k prompt(${main}) ${prompt ? 'yes' : 'NO '}  s50m 3.5 answers [inapp,cap1,cap2,cap3] ${ans.map((b) => (b ? 'y' : 'N')).join('')}${ok ? '' : '   <-- GAP'}`);
}
console.log(bad ? `${bad} item(s) with a gap` : 'all 20 complement items runnable and paired');
