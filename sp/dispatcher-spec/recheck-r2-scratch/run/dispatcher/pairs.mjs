// Read-only: for every `turn: classify`, find the classify's own detector call and the detector's NEXT call made
// on the SAME set of interviewer finals (no new final between the classify line and that call's issue), and
// tabulate the two verdicts. Also records whether a final arrived after the classify was asked but before its
// verdict (the verdict then describes less text than the turn holds).
// usage: node pairs.mjs <runDir>...   (prints rows + a 2x2 table; question text only, never answers)
import fs from 'node:fs';
import path from 'node:path';
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
const verdictOf = (res) => {
  if (!res) return '?';
  if (res.startsWith('null')) return 'null';
  const m = res.match(/detected=(\w+) conf=([\d.]+) q\.len=(\d+)/);
  if (!m) return '?';
  return m[1] === 'true' && Number(m[2]) >= 0.6 && Number(m[3]) > 0 ? 'Q' : 'noQ';
};
const table = {}; const rows = [];
let lateFinal = 0, classifyTotal = 0;
for (const dir of process.argv.slice(2)) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  // sequential detect calls (single-flight): pair issued -> returned in order
  const calls = []; let open = null;
  L.forEach((l, i) => {
    if (/\[QD-timing\] detect issued/.test(l)) { open = { issuedAt: T(l), i }; }
    const m = l.match(/\[QD-timing\] detect returned \+\d+ms result=(.*)$/);
    if (m && open) { calls.push({ ...open, returnedAt: T(l), res: m[1], j: i }); open = null; }
  });
  const finals = L.map((l, i) => ({ l, i })).filter((x) => /\[Engine-timing\] segment-final speaker=interviewer/.test(x.l)).map((x) => T(x.l));
  L.forEach((l, i) => {
    const m = l.match(/\[Main\] turn: classify finals=(\d+) question="((?:[^"\\]|\\.)*)"/);
    if (!m) return;
    classifyTotal++;
    const at = T(l);
    const own = calls.find((c) => c.i > i);
    if (!own) return;
    const ownV = verdictOf(own.res);
    // a final landing between the classify line and the verdict
    const late = finals.some((f) => f > at && f <= own.returnedAt);
    if (late) lateFinal++;
    // next call on the same finals: first call issued after own returned, with no interviewer final in (at, issue]
    const next = calls.find((c) => c.issuedAt >= own.returnedAt && c.i > own.j);
    let nextV = '-';
    if (next && next.issuedAt - own.returnedAt < 4000 && !finals.some((f) => f > at && f <= next.issuedAt)) nextV = verdictOf(next.res);
    const key = `${ownV}|${nextV}`;
    table[key] = (table[key] ?? 0) + 1;
    const closed = L.slice(own.j, own.j + 4).some((x) => /close reason=not-a-question/.test(x));
    rows.push(`${run.padEnd(22)} ${iso(at)} f=${m[1].padStart(2)} own=${ownV.padEnd(4)} next=${nextV.padEnd(4)} lateFinal=${late ? 'Y' : 'n'} ${closed ? 'CLOSED' : '      '} ${JSON.stringify(m[2].slice(0, 70))}`);
  });
}
for (const r of rows) console.log(r);
console.log(`\nclassify calls: ${classifyTotal}; a final arrived between classify and its verdict: ${lateFinal}`);
console.log('own|next (next = the detector\'s own next call on the same finals, within 4 s; "-" = none such)');
for (const [k, v] of Object.entries(table).sort()) console.log(`  ${k.padEnd(10)} ${v}`);
