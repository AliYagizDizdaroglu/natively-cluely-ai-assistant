// SDD task brief from a single-task plan: the plan's header, Global Constraints, Execution notes and the task's own
// section, WITHOUT the operator's closing section and the self-review (an implementer must not build, arm or read
// them as steps). Optional controller notes are appended under their own heading. Prints what it kept and cut.
//   node make-brief.mjs <plan.md> <out.md> [--notes <file>]
import fs from 'node:fs';
const [plan, out] = process.argv.slice(2);
const ni = process.argv.indexOf('--notes');
const notes = ni > 0 ? fs.readFileSync(process.argv[ni + 1], 'utf8') : '';
const text = fs.readFileSync(plan, 'utf8').replace(/\r\n/g, '\n');
const lines = text.split('\n');
const taskAt = lines.findIndex((l) => /^### Task\b/.test(l));
if (taskAt < 0) throw new Error('no "### Task" heading');
if (lines.filter((l) => /^### Task\b/.test(l)).length !== 1) throw new Error('more than one task: this script is for single-task plans');
// the task ends at the first level-2 heading after it (the operator's section or the self-review)
let end = lines.findIndex((l, i) => i > taskAt && /^## /.test(l));
if (end < 0) end = lines.length;
while (end > taskAt && (lines[end - 1].trim() === '' || lines[end - 1].trim() === '---')) end--;
const cut = lines.slice(end).filter((l) => /^## /.test(l)).map((l) => l.replace(/^## /, ''));
const body = lines.slice(0, end).join('\n');
const head = `<!-- TASK BRIEF, extracted from ${plan.split(/[\\/]/).pop()} by the controller. It is your requirements: use its exact values verbatim. The plan's operator section and self-review are left out on purpose: you never build, arm or schedule anything. -->\n\n`;
fs.writeFileSync(out, head + body + '\n' + (notes ? `\n---\n\n## Controller notes (they override the text above where they differ)\n\n${notes.trim()}\n` : ''));
console.log(`${out.split(/[\\/]/).pop()}: ${end} of ${lines.length} plan lines kept (through the task's Step ${[...body.matchAll(/\*\*Step (\d+):/g)].pop()?.[1] ?? '?'}); cut sections: ${cut.join(' | ') || 'none'}; notes ${notes ? `${notes.trim().split('\n').length} lines` : 'none'}`);
