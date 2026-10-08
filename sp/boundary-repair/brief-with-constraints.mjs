// Throwaway (2026-09-29): prepend PLAN-v4.md's "Paths." paragraph and its Global Constraints section to each
// extracted task brief, so an implementer reads one file (the SDD rule: never make a subagent read the whole plan).
//   node brief-with-constraints.mjs 3 4 5
import fs from 'node:fs';
const plan = fs.readFileSync(new URL('./PLAN-v4.md', import.meta.url), 'utf8');
const paths = plan.split('\n').find((l) => l.startsWith('**Paths.**'));
const a = plan.indexOf('## Global Constraints'), b = plan.indexOf('\n---', a);
if (!paths || a < 0 || b < 0) { console.log('REFUSED: Paths paragraph or Global Constraints not found'); process.exit(3); }
const head = `# Brief (extracted from PLAN-v4.md; the spec is DESIGN-v4.md in the same folder)\n\n${paths}\n\n${plan.slice(a, b).trim()}\n\n---\n\n`;
for (const n of process.argv.slice(2)) {
    const f = new URL(`./sdd/task-${n}-brief.md`, import.meta.url);
    const body = fs.readFileSync(f, 'utf8');
    if (body.startsWith('# Brief (extracted')) { console.log(`task ${n}: already has the header`); continue; }
    fs.writeFileSync(f, head + body);
    console.log(`task ${n}: ${head.split('\n').length} header lines + ${body.split('\n').length} task lines`);
}
