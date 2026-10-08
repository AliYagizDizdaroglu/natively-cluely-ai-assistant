// Calibration of the concern: two consecutive items 45 s apart (W01->W02 shape,
// shared word "docker"), each answered exactly once, cleanly. A correct metric
// must report 0 doubles. Uses the committed module via file: URL, read-only.
import fs from 'node:fs';
import path from 'node:path';
import { computeRunFromFiles, evaluateGate } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.metrics.mjs';
const dir = process.argv[2];
const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();
const q1 = 'What is the difference between a Docker image and a container?';
const q2 = 'Why do Docker layers matter for build times?';
const timeline = { startedAt: iso(T0), startedMs: T0, startDebug: 0, endDebug: 1e9, startDiag: 0, endDiag: 1e9, endedAt: iso(T0 + 200000),
  items: [ { id: 'W01', kind: 'spoken', q: q1, playedAt: T0, clipSecs: 3 },
           { id: 'W02', kind: 'spoken', q: q2, playedAt: T0 + 48000, clipSecs: 3 } ] };
const dbg = [
  `${iso(T0 + 5000)} [LOG] [Main] dispatch: answer source=live anchor=${JSON.stringify(q1)} verdict=match`,
  `${iso(T0 + 53000)} [LOG] [Main] dispatch: answer source=live anchor=${JSON.stringify(q2)} verdict=match`,
].join('\n') + '\n';
const diag = [ `[${iso(T0 + 5200)}] route: VERBAL-TECHNICAL (selected model, filtered)`,
               `[${iso(T0 + 53200)}] route: VERBAL-TECHNICAL (selected model, filtered)` ].join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify(timeline));
fs.writeFileSync(path.join(dir, 'natively_debug.log'), dbg);
fs.writeFileSync(path.join(dir, 'verbal-diag.log'), diag);
const m = computeRunFromFiles({ debugLog: path.join(dir, 'natively_debug.log'), diagLog: path.join(dir, 'verbal-diag.log'), timelinePath: path.join(dir, 'interview60.timeline.json'), answersPath: path.join(dir, 'none.json') });
for (const i of m.items) console.log(i.id, 'dispatches=', i.dispatches, 'answered=', i.answered, 'heardBy=', i.heardBy, 'detectMs=', i.detectMs);
console.log('surfacedMulti=', m.surfacedMulti, 'answered=', m.answered, 'answersToNobody=', m.answersToNobody);
console.log('gate surfaced row:', evaluateGate(m).rows.find(r => r.label.startsWith('Surfaced')));
