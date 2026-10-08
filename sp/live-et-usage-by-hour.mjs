// Throwaway: for each live-et-spike run, its wall-clock span (UTC and the chart's UTC-8) and two token totals:
// "re-read" = the sum of every usage message's promptTokenCount (what a per-turn re-read accounting would log),
// and "new input" = the last turn's context size (system + everything heard + said, counted once).
//   node live-et-usage-by-hour.mjs <run.json>...
import fs from 'node:fs';
import path from 'node:path';
for (const f of process.argv.slice(2)) {
    const R = JSON.parse(fs.readFileSync(f, 'utf8'));
    const E = R.events;
    // the file name is new Date().toISOString() taken ~500 ms after the last event
    const endUtc = new Date(path.basename(f).slice(0, 19).replace(/T(\d\d)-(\d\d)-(\d\d)/, 'T$1:$2:$3') + 'Z');
    const lastT = E.length ? E[E.length - 1].t : 0;
    const t0 = endUtc.getTime() - lastT - 500;
    const fmt = (ms) => new Date(ms).toISOString().slice(11, 19);
    const fmt8 = (ms) => new Date(ms - 8 * 3600e3).toISOString().slice(11, 19);
    const U = E.filter((e) => e.kind === 'usage');
    const reread = U.reduce((s, u) => s + (u.prompt ?? 0), 0);
    const maxCtx = U.reduce((m, u) => Math.max(m, u.prompt ?? 0), 0);
    const byHour = {};
    for (const u of U) { const h = fmt8(t0 + u.t).slice(0, 2) + ':00'; byHour[h] = (byHour[h] ?? 0) + (u.prompt ?? 0); }
    console.log(`${path.basename(f)}\n  UTC ${fmt(t0)}-${fmt(t0 + lastT)}  chart UTC-8 ${fmt8(t0)}-${fmt8(t0 + lastT)}  items played ${new Set(E.filter((e) => e.kind === 'clipStart').map((e) => e.item)).size}  closed ${JSON.stringify(R.closed)}`);
    console.log(`  usage messages ${U.length}; re-read sum ${reread}; largest context ${maxCtx}; re-read by UTC-8 hour ${JSON.stringify(byHour)}`);
}
