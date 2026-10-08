// REVIEW THROWAWAY: every quote-test decision the prototype made in fixdet mode on the eight fixtures, with its score and
// the competing score, so the review can say how far the known cases sit from QUOTE_MIN = 0.5. Also, for every Live
// claim, the echo test's two scores. Question text only (first 60 chars).
import { FX, run } from './calib-check.mjs';
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const extra = process.argv.slice(2);
const rev = [], rep = [], abs = [], near = [];
for (const [name, fx, log] of FX) {
  const r = run(fx, log, 'fixdet', extra);
  const itemAt = (t) => { let cur = null; for (const x of r.rows) if (t >= x.from) cur = x.id; return cur; };
  for (const o of r.outcomes) {
    if (o.o.kind === 'revived' && o.src !== 'verdict') rev.push(`${name} ${itemAt(o.at)} ${iso(o.at)} by ${o.src}${o.rverdict ? '/' + o.rverdict : ''} score ${o.o.score.toFixed(2)} finals ${o.o.finals}`);
    if (o.o.kind === 'revived' && o.src === 'verdict') rev.push(`${name} ${itemAt(o.at)} ${iso(o.at)} by verdict`);
    if (o.o.kind === 'replaced-declined') rep.push(`${name} ${itemAt(o.at)} ${iso(o.at)} by ${o.src} score ${o.o.score.toFixed(2)} closed ${o.o.closed} q=${JSON.stringify((o.text ?? '').slice(0, 60))}`);
  }
  for (const a of r.absorbed) abs.push(`${name} ${itemAt(a.at)} ${iso(a.at)} echo ${a.score.toFixed(2)} vs open ${a.openScore.toFixed(2)} age ${(a.ageMs / 1000).toFixed(1)}s q=${JSON.stringify(a.text.slice(0, 60))}`);
}
console.log(`revived (${rev.length}):\n  ${rev.join('\n  ')}\nreplaced-declined (${rep.length}):\n  ${rep.join('\n  ')}\nabsorbed (${abs.length}):\n  ${abs.join('\n  ')}`);
