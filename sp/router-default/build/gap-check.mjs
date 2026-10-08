// node gap-check.mjs <debug log> [--selftest]: for each dispatched turn, did its pipeline "answer end" come before the next dispatch?
// Prints counts and ms only.
import fs from 'node:fs';
function check(text) {
  const ts = (l) => Date.parse(l.slice(0, 24));
  const disp = [], end = new Map();
  for (const l of text.split('\n')) {
    let m = /\[Router\] dispatch turn=(\d+)/.exec(l); if (m) { disp.push({ id: +m[1], t: ts(l) }); continue; }
    m = /\[IntelligenceEngine\] answer end.*?turn=(\d+)/.exec(l); if (m && !end.has(+m[1])) end.set(+m[1], ts(l));
  }
  let over = [], missing = 0;
  for (let i = 0; i < disp.length - 1; i++) {
    const e = end.get(disp[i].id); if (e === undefined) { missing++; continue; }
    if (e > disp[i + 1].t) over.push(e - disp[i + 1].t);
  }
  return { dispatches: disp.length, ends: end.size, missing, overruns: over.length, maxOverrunMs: over.length ? Math.max(...over) : 0 };
}
if (process.argv.includes('--selftest')) {
  const L = (t, s) => `2026-10-06T22:00:${String(t).padStart(2, '0')}.000Z [LOG] ${s}`;
  const ok = [L(1, '[Router] dispatch turn=1 x'), L(5, '[IntelligenceEngine] answer end turn=1 kind=completed'), L(9, '[Router] dispatch turn=2 x'), L(12, '[IntelligenceEngine] answer end turn=2 kind=completed')].join('\n');
  const bad = [L(1, '[Router] dispatch turn=1 x'), L(9, '[Router] dispatch turn=2 x'), L(11, '[IntelligenceEngine] answer end turn=1 kind=completed'), L(12, '[IntelligenceEngine] answer end turn=2 kind=completed')].join('\n');
  const a = check(ok), b = check(bad);
  console.log(`selftest ok-case overruns=${a.overruns} (want 0); bad-case overruns=${b.overruns} max=${b.maxOverrunMs} (want 1, 2000) -> ${a.overruns === 0 && b.overruns === 1 && b.maxOverrunMs === 2000 ? 'PASS' : 'FAIL'}`);
} else {
  console.log(JSON.stringify(check(fs.readFileSync(process.argv[2], 'utf8'))));
}
