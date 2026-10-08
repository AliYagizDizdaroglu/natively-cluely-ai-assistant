// Records the user's hold on implementation after the 20:00 cue entries of AGENDA.md.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith('- 20:00 Fri **CUE GRADING CONFIRMED'));
if (i < 0 || lines.some((l) => l.includes('**HOLD (user: "dont implement anything now")'))) { console.log('REFUSED'); process.exit(2); }
lines.splice(i + 1, 0, '- 20:1x Fri **HOLD (user: "dont implement anything now")**: no implementation, no repo change, no build, no smoke until the user says go. The cue-flag SPEC (Fable, SP cue-flag/) may finish as a document only; its Opus review and everything after it wait for the user.');
fs.writeFileSync(F, lines.join('\n'));
console.log('inserted after line', i + 1);
