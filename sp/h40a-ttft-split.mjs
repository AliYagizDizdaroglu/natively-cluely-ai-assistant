// Throwaway: the live hour's first-word times split by who answered — 3.1 directly, or 3.5 after a
// 3.1 failure (503 or 10 s stall) — and 3.5's own time from when it was started. Hour window only
// (07:14:22Z on; the two probe answers before it are excluded). Reads the run folder's diag log.
import fs from 'node:fs';

const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const lines = fs.readFileSync(`${RD}/verbal-diag.log`, 'utf8').split(/\r?\n/).filter((l) => /^\[2026-09-24T0(7:1[4-9]|7:[2-5]\d|8:[01]\d|8:20)/.test(l));
const ts = (l) => Date.parse(l.slice(1, 25));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.5)]; };
const start = Date.parse('2026-09-24T07:14:22.763Z');
const answers = [];
let cur = null;
for (const l of lines) {
    if (/=== generateStream invoked ===/.test(l)) { cur = ts(l) >= start ? { t0: ts(l), via: '3.1', switchAt: null } : null; continue; }
    if (!cur) continue;
    if (/verbal primary FAILED pre-token/.test(l)) { cur.via = '3.5 after 503'; cur.switchAt = ts(l); }
    else if (/__model_source:gemini-3\.5-flash-lite \(fallback\)/.test(l)) { cur.via = '3.5 after stall'; cur.switchAt ??= ts(l); }
    const m = l.match(/first token (\d+)ms/);
    if (m) { cur.ttft = +m[1]; cur.own = cur.switchAt ? cur.t0 + cur.ttft - cur.switchAt : cur.ttft; answers.push(cur); cur = null; }
}
const by = (v) => answers.filter((a) => a.via === v);
console.log(`answers in the hour: ${answers.length}`);
for (const v of ['3.1', '3.5 after 503', '3.5 after stall']) {
    const a = by(v); if (!a.length) continue;
    console.log(`${v.padEnd(16)} n=${String(a.length).padStart(2)}  first word from the question: median ${(med(a.map((x) => x.ttft)) / 1000).toFixed(1)} s${v !== '3.1' ? `   3.5's own time from its start: median ${(med(a.map((x) => x.own)) / 1000).toFixed(1)} s` : ''}`);
}
console.log(`all              n=${answers.length}  median ${(med(answers.map((x) => x.ttft)) / 1000).toFixed(1)} s`);
