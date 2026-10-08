// Throwaway: does Important #2 materialise in run 1? Count Live answers with verdict=unverifiable,
// and "double answers": two dispatch:answer lines within 15 s whose anchors share >= 0.25 content words.
import fs from 'node:fs';
const log = fs.readFileSync(process.argv[2], 'utf8');
const t0 = process.argv[3];
const re = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop) source=(\w+) anchor="([^"]*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(\w+))?/gm;
const words = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
const ds = [];
for (const m of log.matchAll(re)) if (m[1] >= t0) ds.push({ at: Date.parse(m[1]), iso: m[1], action: m[2], source: m[3], anchor: m[4], verdict: m[5], dupOf: m[6], answered: m[7] });
const answers = ds.filter((d) => d.action === 'answer');
const byVerdict = {}; for (const d of answers) byVerdict[`${d.source}/${d.verdict}`] = (byVerdict[`${d.source}/${d.verdict}`] ?? 0) + 1;
console.log('answers since', t0, '=', answers.length, JSON.stringify(byVerdict));
const doubles = [];
for (let i = 0; i < answers.length; i++) for (let j = i + 1; j < answers.length; j++) {
  const a = answers[i], b = answers[j]; if (b.at - a.at > 15000) break;
  const o = Math.max(overlap(a.anchor, b.anchor), overlap(b.anchor, a.anchor));
  if (o >= 0.25) doubles.push(`${a.iso.slice(11,19)} ${a.source}/${a.verdict} "${a.anchor.slice(0,40)}" → +${((b.at-a.at)/1000).toFixed(1)}s ${b.source}/${b.verdict} "${b.anchor.slice(0,40)}" overlap=${o.toFixed(2)}`);
}
console.log('double answers (<=15 s, overlap>=0.25):', doubles.length); for (const d of doubles) console.log('  ' + d);
const drops = ds.filter((d) => d.action === 'drop'); const dropBy = {}; for (const d of drops) dropBy[`${d.source} dup of ${d.dupOf} answered=${d.answered}`] = (dropBy[`${d.source} dup of ${d.dupOf} answered=${d.answered}`] ?? 0) + 1;
console.log('drops:', JSON.stringify(dropBy));
