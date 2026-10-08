// Verify report()'s new computeRunFromFiles-based logic against the REAL run1
// snapshot folder (read-only — never touches the live checkout's files, never
// starts/stops/talks to the app). Throwaway prototype script per rule 2/8.
import path from 'path';
import { pathToFileURL } from 'url';
const metricsUrl = pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.metrics.mjs').href;
const { computeRunFromFiles, evaluateGate } = await import(metricsUrl);

const DIR = path.resolve('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-03T05-10-58-after');

const m = computeRunFromFiles({
    debugLog: path.join(DIR, 'natively_debug.log'),
    diagLog: path.join(DIR, 'verbal-diag.log'),
    timelinePath: path.join(DIR, 'interview60.timeline.json'),
    answersPath: path.join(DIR, 'interview60.answers.json'),
});
const g = evaluateGate(m);
const routeCount = m.routes.reduce((a, r) => ({ ...a, [r.route]: (a[r.route] || 0) + 1 }), {});

const md = `# 60-minute interview run

- started ${m.startedAt}
- ended   ${m.endedAt ?? '(incomplete)'}
- items played: ${m.items.length} spoken questions + ${m.cues.length} screenshot cues

## Gate
${g.rows.map((r) => `- ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}: ${r.value}   (before: ${r.before})`).join('\n')}

**${g.pass ? 'GATE PASSED' : 'GATE FAILED — ' + g.rows.filter((r) => !r.pass).map((r) => r.label).join('; ')}**

## Answer routing
- routes taken: ${JSON.stringify(routeCount)}
- fallback redirects: ${m.redirects.length}
- hard failures: ${m.hardFails.length}

## Heard by neither detector
${m.items.filter((i) => i.heardBy === null).map((i) => `- ${i.id}: ${i.q}`).join('\n') || '(none — every spoken question was heard by at least one detector)'}
`;
console.log(md);
