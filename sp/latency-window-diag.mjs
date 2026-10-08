// latency-window-diag.mjs — per-window DIAGNOSTICS for the latency rule (never the verdict; that
// is paired-latency.decide.mjs over all three windows). For each window file and each arm: rows,
// median and p90 first token (nearest-rank, the same pct() as decide.mjs), how many were past the
// 10 s budget or produced no token, errors by type, rows with thoughts > 0, plus the order effect
// (the arm's median when it ran first vs second in its pair) and the window's wall-clock span.
//
//   node latency-window-diag.mjs <window.json> [<window.json> ...]
import fs from 'node:fs';

const BUDGET_MS = 10_000;
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };

for (const f of process.argv.slice(2)) {
    const rows = JSON.parse(fs.readFileSync(f, 'utf8'));
    const ats = rows.map((r) => r.at).filter(Boolean).sort();
    console.log(`\n== ${f.split(/[\\/]/).pop()}: ${rows.length} rows, ${new Set(rows.map((r) => r.id)).size} prompts, ${ats[0] ?? '?'} → ${ats.at(-1) ?? '?'}`);
    for (const arm of [...new Set(rows.map((r) => r.arm))]) {
        const a = rows.filter((r) => r.arm === arm);
        const t = a.filter((r) => typeof r.ttft === 'number').map((r) => r.ttft);
        const past = a.filter((r) => r.error || r.ttft === null || r.ttft > BUDGET_MS).length;
        const errs = {};
        for (const r of a) if (r.error) errs[r.error] = (errs[r.error] ?? 0) + 1;
        const noTok = a.filter((r) => !r.error && r.ttft === null).length;
        const thoughts = a.filter((r) => (r.thoughts ?? 0) > 0).length;
        const firstMed = pct(a.filter((r) => r.first && typeof r.ttft === 'number').map((r) => r.ttft), 0.5);
        const secondMed = pct(a.filter((r) => !r.first && typeof r.ttft === 'number').map((r) => r.ttft), 0.5);
        console.log(`  ${arm.padEnd(14)} n=${a.length}  median ${pct(t, 0.5)} ms  p90 ${pct(t, 0.9)} ms  max ${t.length ? Math.max(...t) : '-'} ms  past 10 s or no token: ${past}  errors: ${Object.keys(errs).length ? JSON.stringify(errs) : 'none'}${noTok ? `  no-token: ${noTok}` : ''}  thoughts>0: ${thoughts}/${a.length}  order: first ${firstMed} ms / second ${secondMed} ms`);
    }
}
