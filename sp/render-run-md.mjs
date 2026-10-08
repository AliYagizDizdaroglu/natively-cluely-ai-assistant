// Throwaway: render a run folder's interview60.report.md with the SAME template
// as interview60.run.mjs report(), but computed over the run folder (so the
// judge row reads the folder's interview60.judge.json instead of "not run").
// usage: node render-run-md.mjs <repo-root> <run-dir> [copy-to-path]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, dir, copyTo] = process.argv.slice(2);
const metrics = await import(pathToFileURL(path.join(root, 'electron/test/golden/interview60.metrics.mjs')).href);
const m = metrics.computeRun(dir);
const g = metrics.evaluateGate(m);
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
const out = path.join(dir, 'interview60.report.md');
fs.writeFileSync(out, md);
console.log(`wrote ${out}`);
if (copyTo) { fs.writeFileSync(copyTo, md); console.log(`copied to ${copyTo}`); }
console.log(md.split('\n').filter((l) => /judge|GATE/.test(l)).join('\n'));
