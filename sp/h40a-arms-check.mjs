// Throwaway: did every offline arm actually produce answers? Counts items, errors and empty answers
// per answers file in the h40a run folder, plus first-token p50/p90 where the file records ttft.
import fs from 'node:fs';

const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
for (const f of fs.readdirSync(RD).filter((n) => /^interview60\.answers.*\.json$/.test(n)).sort()) {
    const j = JSON.parse(fs.readFileSync(`${RD}/${f}`, 'utf8'));
    const arr = Array.isArray(j) ? j : j.answers ?? j.items ?? Object.values(j);
    const err = arr.filter((x) => x.error || x.finish === 'ERROR');
    const empty = arr.filter((x) => !x.error && !(x.spoken ?? x.answer ?? '').trim());
    const tt = arr.map((x) => x.ttft).filter((x) => typeof x === 'number');
    const errKinds = [...new Set(err.map((x) => String(x.error ?? x.finish).slice(0, 40)))].join(' | ');
    console.log(`${f.replace('interview60.answers', '').replace('.json', '') || '(bare 3.1)'}`.padEnd(40) + ` items ${String(arr.length).padStart(2)}  errors ${String(err.length).padStart(2)}  empty ${String(empty.length).padStart(2)}  first token p50 ${tt.length ? (pct(tt, 0.5) / 1000).toFixed(1) : '-'} p90 ${tt.length ? (pct(tt, 0.9) / 1000).toFixed(1) : '-'} s${errKinds ? '   ' + errKinds : ''}`);
}
