// stall-history.mjs — would condition 4's "zero answers past the 10 s stall budget" have
// failed EARLIER flights too? Count stall-fallback events and the models involved in every
// recorded run's debug log, windowed to that run's own hour.
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
for (const run of fs.readdirSync(RUNS).filter((d) => /^2026-09/.test(d)).sort()) {
    const dir = path.join(RUNS, run);
    const dbg = path.join(dir, 'natively_debug.log');
    const rep = path.join(dir, 'interview60.report.md');
    if (!fs.existsSync(dbg)) continue;
    let from = 0, to = Infinity;
    if (fs.existsSync(rep)) {
        const r = fs.readFileSync(rep, 'utf8');
        const a = r.match(/started (\S+)/), b = r.match(/ended\s+(\S+)/);
        if (a) from = Date.parse(a[1]);
        if (b) to = Date.parse(b[1]);
    }
    const lines = fs.readFileSync(dbg, 'utf8').split(/\r?\n/).filter((l) => {
        const m = l.match(/^(\S+) \[/); if (!m) return false;
        const t = Date.parse(m[1]); return t >= from && t <= to;
    });
    const stalls = lines.filter((l) => /stalled after/.test(l));
    const models = [...new Set(stalls.map((l) => (l.match(/\] (\S+) stalled/) ?? [])[1]))];
    console.log(`${run.padEnd(28)} stalls ${String(stalls.length).padStart(2)}   ${models.join(', ') || '-'}`);
}
