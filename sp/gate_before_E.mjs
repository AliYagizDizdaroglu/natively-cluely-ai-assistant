// Scratch-only: prints the gate table for a run dir using the pre-round-3
// (commit 818a70f) metrics.mjs, so it can be diffed against the real
// `node interview60.run.mjs gate <dir>` output after the round-3 change.
// Mirrors run.mjs's own gate() function verbatim (read, not modified).
import path from 'node:path';
import { computeRun, evaluateGate } from './metrics_before_E.mjs';

const dir = path.resolve(process.argv[2]);
const m = computeRun(dir);
const g = evaluateGate(m);
console.log(`GATE  ${path.basename(dir)}  ${m.startedAt} → ${m.endedAt}\n`);
for (const r of g.rows) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label.padEnd(56)} ${r.value}   (before: ${r.before})`);
console.log(`\n  ${g.pass ? 'GATE PASSED' : 'GATE FAILED — ' + g.rows.filter((r) => !r.pass).map((r) => r.label).join('; ')}`);
console.log(`\n  liveFragmentsDropped field present: ${'liveFragmentsDropped' in m}`);
