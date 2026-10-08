// r2 THROWAWAY: reproduces every r2 measurement and reader, one at a time, saving each output as out-<name>.txt.
// Read-only on the repos and the logs; writes only under r2/. usage: node run-r2.mjs [name ...]  (no names = all)
// Order matters only for build-fx (the fixtures) and peritem-s50c (its fixture), which come first.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const jobs = [
  ['run-review', ['run-review.mjs'], HERE],                     // the reviewer's scripts, unchanged (rule 8 baseline) -> out-review-*.txt
  ['build-fx', ['build-fx.mjs'], HERE],                         // cuesmoke2, s50e, s50g fixtures + offsets
  ['peritem-s50c', ['peritem-s50c.mjs'], HERE],                 // s50c per-item offsets -> fx-s50c-peritem.json
  ['timer-lateness', ['timer-lateness.mjs'], HERE],             // C1: the race window's provenance
  ['pairing', [path.join('..', 'review-scratch', 'pairing.mjs')], HERE], // Minor 1 (the reviewer's script)
  ['crafted-r2', ['crafted-r2.mjs'], HERE],                     // S-1..S-16 with their checks
  ['calib-r2-j50', ['calib-r2.mjs', '--jitter', '50'], HERE],   // R1 per fixture, log-ordered races within 50 ms
  ['calib-r2-j0', ['calib-r2.mjs', '--jitter', '0'], HERE],     // the same with the timer always first (comparison)
  ['rows-r2', ['rows-r2.mjs', '--jitter', '50'], HERE],         // R3-R16, R5 controls, R14
  ['legacy-r2', ['legacy-r2.mjs'], HERE],                       // R2 on the committed s50a/after9 fixtures
  ['quote-metrics', ['quote-metrics.mjs'], HERE],               // I7: the negative class (on-time claims)
  ['echo-pairs', ['echo-pairs.mjs'], HERE],                     // I7: the positive class (Live-only turns)
  ['mark-vs-finals', ['mark-vs-finals.mjs'], HERE],             // the revive side's score distribution
  ['absorbed-table', ['absorbed-table.mjs', '--jitter', '50'], HERE], // R11: every absorbed claim
  ['traces', ['traces.mjs', '--jitter', '50'], HERE],           // per-item traces -> out-trace-*.txt
];
for (const [name, args, cwd] of jobs) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  let out;
  try {
    out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', ...args], { cwd, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = `EXIT ${e.status}\n${e.stdout ?? ''}\n${e.stderr ?? ''}`;
  }
  if (!['run-review', 'traces'].includes(name)) fs.writeFileSync(path.join(HERE, `out-${name}.txt`), out);
  console.log(`${name.padEnd(18)} ${String(out.split('\n').length).padStart(5)} lines  ${((Date.now() - t0) / 1000).toFixed(1)} s${/^EXIT/.test(out) ? '  FAILED' : ''}`);
}
