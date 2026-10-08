// L20d spec-author check (no network, prints no prompt contents): the comparator files exist, the old Live arm's
// holes and word counts, and ET38's window guard shape.
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const s50m = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/`;
for (const f of ['interview60.judge.pairs.json', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json']) console.log(f, fs.existsSync(s50m + f));
console.log('rubric', fs.existsSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`));
console.log('passes/PREREGISTER-l20c.md in MAIN', fs.existsSync(`${MAIN}/electron/test/golden/passes/PREREGISTER-l20c.md`));
console.log('l20c grader prompts:', fs.readdirSync(`${SP}/et38/l20c-grader-prompts`).join(', '));
let holes = [], n = 0, w = [], ttft = [];
for (const r of [1, 2, 3]) for (const d of ['l20b', 'l20c']) {
    const A = JSON.parse(fs.readFileSync(`${SP}/${d}/runs/live38-r${r}.answers.json`, 'utf8'));
    for (const [id, a] of Object.entries(A)) { n++; if (!a.played || !a.answer?.trim()) holes.push(`r${r} ${id}`); else { w.push(a.words); ttft.push(a.ttftMs); } }
}
w.sort((a, b) => a - b); ttft.sort((a, b) => a - b);
console.log(`old Live arm: slots ${n}, holes ${holes.join(', ')}, answered ${n - holes.length}, words p50 ${w[Math.floor(w.length / 2)]}, first word p50 ${ttft[Math.floor(ttft.length / 2)]} ms`);
console.log('=== et38/go-et38.mjs head');
console.log(fs.readFileSync(`${SP}/et38/go-et38.mjs`, 'utf8').split('\n').slice(0, 45).join('\n'));
