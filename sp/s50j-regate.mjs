// Re-evaluate s50j's gate now that the Opus verdicts are merged. At flight time the judge row
// read "not run", so the FAIL in the report was about a missing grade, not a missed bar.
import { pathToFileURL } from 'node:url';
const base = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const { computeRun, evaluateGate, gradeable } = await import(pathToFileURL(base + 'interview60.metrics.mjs').href);

const m = computeRun('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j');
const g = evaluateGate(m);
console.log('mains in the bar:', gradeable(m.items), '  bar =', Math.floor(gradeable(m.items) * 47 / 52), 'acceptable and 0 wrong');
console.log('judge base row  :', JSON.stringify(m.judge?.n !== undefined ? { n: m.judge.n, acceptable: m.judge.acceptable, weak: m.judge.weak, wrong: m.judge.wrong } : m.judge));
console.log();
for (const r of g.rows) console.log((r.pass ? 'PASS  ' : 'FAIL  ') + r.label.padEnd(54) + (r.value ?? ''));
console.log('\nGATE OVERALL:', g.pass ? 'PASS' : 'FAIL');
