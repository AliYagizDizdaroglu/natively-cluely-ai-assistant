// Throwaway: per model, how many question attempts answered vs died on 503 so far, from the tier logs.
// Each TRANSIENT line is one question attempt the runner gave up on after its own 4 HTTP tries (8–32 s
// apart); each answer line is one that got through. Also the answered calls' first-token times.
import fs from 'node:fs';

const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/flash-h40a';
const pct = (a, p) => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); return (s[Math.min(s.length - 1, Math.floor(s.length * p))] / 1000).toFixed(1); };
for (const f of fs.readdirSync(D).filter((x) => /^gemini-.*\.log$/.test(x)).sort()) {
    const L = fs.readFileSync(`${D}/${f}`, 'utf8').split(/\r?\n/);
    const ans = L.filter((l) => /^\s+R\S+\s+\d+w\s+ttft/.test(l)), tr = L.filter((l) => /TRANSIENT/.test(l));
    const ttft = ans.map((l) => +l.match(/ttft\s+(\d+)ms/)[1]), th = ans.map((l) => +(l.match(/thoughts\s+(\d+)/)?.[1] ?? 0));
    const codes = tr.map((l) => l.match(/TRANSIENT (.*)$/)[1].trim()).reduce((a, c) => (a[c] = (a[c] ?? 0) + 1, a), {});
    const first = L.find((l) => /^=== /.test(l))?.match(/=== \S+ (\d\d:\d\d:\d\d)/)?.[1], last = [...L].reverse().find((l) => /^=== /.test(l))?.match(/=== \S+ (\d\d:\d\d:\d\d)/)?.[1];
    console.log(`${f.replace('.log', '').padEnd(17)} ${first}–${last}  answered ${ans.length}  gave up ${tr.length} (${Object.entries(codes).map(([k, v]) => `${k} ×${v}`).join(', ') || '-'})  first token p50 ${pct(ttft, 0.5)} s p90 ${pct(ttft, 0.9)} s  thinking tokens p50 ${pct(th.map((x) => x * 1000), 0.5)}`);
}
