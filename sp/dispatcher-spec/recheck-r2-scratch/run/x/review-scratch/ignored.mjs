// REVIEW THROWAWAY: every verdict the prototype ignored (stale-turn / stale-finals / dispatched / already-marked) in the
// fix modes, per fixture, and the re-armed classifies it asked, so the review can say how often each path is reached.
import { FX, run } from './calib-check.mjs';
const iso = (t) => new Date(t).toISOString().slice(11, 23);
const extra = process.argv.slice(2);
for (const mode of ['calib', 'fixdet']) {
  const tally = {}; const lines = [];
  for (const [name, fx, log] of FX) {
    const r = run(fx, log, mode, extra);
    const itemAt = (t) => { let cur = null; for (const x of r.rows) if (t >= x.from) cur = x.id; return cur; };
    for (const o of r.outcomes.filter((x) => x.src === 'verdict')) {
      const k = o.o.kind === 'ignored' ? `ignored:${o.o.why}` : o.o.kind;
      tally[k] = (tally[k] ?? 0) + 1;
      if (o.o.kind === 'ignored' || o.o.kind === 'declined') lines.push(`${name} ${itemAt(o.at)} ${iso(o.at)} verdict=${o.verdict} -> ${k}${o.o.again ? ' (again)' : ''}`);
    }
    const rearmed = r.subs.filter((s) => s.rearmed).length;
    if (mode !== 'calib') lines.push(`${name}: substituted ${r.subs.length} (re-armed ${rearmed})`);
  }
  console.log(`== ${mode}: ${JSON.stringify(tally)}\n  ${lines.join('\n  ')}`);
}
