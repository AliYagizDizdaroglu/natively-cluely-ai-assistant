// Throwaway (2026-09-29): print one seam-probe play's finals, each with the interim that preceded it.
//   node seam-dump.mjs <stamp> <id> <play>
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'seam-probe');
const [stamp, id, play] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(path.join(dir, `plan-${stamp}.json`), 'utf8'));
const events = fs.readFileSync(path.join(dir, `events-${stamp}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const i = plan.plan.findIndex((p) => p.id === id && String(p.play) === String(play));
const p = plan.plan[i], next = plan.plan[i + 1];
console.log(`script: ${plan.script[id]}`);
let lastInterim = null;
for (const e of events.filter((x) => x.kind === 'transcript' && x.text)) {
    const end = e.start + e.duration;
    if (!e.isFinal) { lastInterim = e; continue; }
    if (end >= p.startS && end < (next?.startS ?? Infinity)) {
        console.log(`  interim  ${JSON.stringify(lastInterim?.text ?? null)}`);
        console.log(`  FINAL    ${JSON.stringify(e.text)}  [${e.start.toFixed(2)}+${e.duration.toFixed(2)}s speechFinal=${e.speechFinal}]`);
    }
    lastInterim = null;
}
