// Throwaway, read-only: list the h40c judge pairs files, their item counts and the stamp-relevant
// fields, and print the done.json `next` field, before dispatching graders.
import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2];
for (const f of fs.readdirSync(run).filter((n) => n.startsWith('interview60.judge.pairs')).sort()) {
    const p = JSON.parse(fs.readFileSync(path.join(run, f), 'utf8'));
    const items = p.items || [];
    const followups = items.filter((i) => /F\d*$/.test(String(i.key).replace(/-r\d+$/, ''))).length;
    console.log(`${f}  items=${items.length}  followups~${followups}  rubricChars=${(p.rubric || '').length}  model=${p.model}`);
}
const done = JSON.parse(fs.readFileSync(path.join(run, 'interview60.flight.done.json'), 'utf8'));
console.log('done.next:', done.next);
console.log('done keys:', Object.keys(done).join(', '));
