// The composed system per variant (PREREGISTER-l38m.md "reported"): per turn the first useful text = Live's RIGHT line
// on E/QF, else the pipeline's first token (offline; the app adds its ~0.6 s gate); lines that reach the screen wrong =
// a Live answer on AF/H/HF (or a wrong E/QF line); pipeline quality on what it carries.  node compose.mjs v1 v2
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { read } from './read.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));
const I = J('items.json'), P = J('runs/pipeline.json').records;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
const f = (ms) => `${(ms / 1000).toFixed(1)} s`;
for (const v of process.argv.slice(2)) {
    const run = J(`runs/l38m-${v}.json`), A = J(`runs/l38m-${v}.answers.json`), r = read(run, A);
    const easy = I.chains.flat().filter((id) => ['E', 'QF'].includes(I.class[id]));
    const first = easy.map((id) => (r.right[id] ? A[id].ttftMs : P[id].ttft));
    const pipeOnly = easy.map((id) => P[id].ttft);
    const wrongOnScreen = I.chains.flat().filter((id) => (['E', 'QF'].includes(I.class[id]) ? r.cls[id] === 'routed' && !r.right[id] : ['routed', 'long'].includes(r.cls[id])));
    console.log(`${v}: easy turns (E+QF, 25): first useful text p50 ${f(pct(first, 0.5))} p90 ${f(pct(first, 0.9))} vs pipeline alone p50 ${f(pct(pipeOnly, 0.5))} p90 ${f(pct(pipeOnly, 0.9))}; Live carried ${easy.filter((id) => r.right[id]).length}/25; lines on screen that are not answers or are unsafe: ${wrongOnScreen.length} (${wrongOnScreen.map((id) => `${id} ${JSON.stringify(A[id].answer)}`).join(', ')})`);
}
