// Authoritative in-app latency for s50j, straight from the metrics module the gate uses.
import { computeRun } from 'file:///C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.metrics.mjs';
import { readFileSync } from 'node:fs';

const DIR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j';
const m = computeRun(DIR);

const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

console.log('ttftSource     ', m.ttftSource);
console.log('ttft p90 (gate)', m.ttftP90, 'ms');
console.log('detect p50     ', m.detectP50, 'ms');
console.log('budget         ', JSON.stringify(m.budget));
console.log('delivered      ', m.delivered);

// the same population the gate uses, so p50 is comparable to p90 above
const { logSince } = await import('file:///C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.lib.mjs');
const timeline = JSON.parse(readFileSync(`${DIR}/interview60.timeline.json`, 'utf8'));
const diag = logSince(`${DIR}/verbal-diag.log`, timeline.startDiag, timeline.endDiag);
const ft = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((x) => Number(x[2])).sort((a, b) => a - b);
console.log(`\nin-app first token, run window only: n ${ft.length}  p50 ${pct(ft, .5)}  p90 ${pct(ft, .9)}  max ${ft.at(-1)}`);
