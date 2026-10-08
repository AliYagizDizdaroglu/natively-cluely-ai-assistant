// Structure peek: prints a captured prompt's user turn from "USER QUESTION:" on (the profile CONTEXT part is never
// printed); the app's previous-answer lines are cut to 40 chars. Never prints the system prompt.
//   node peek.mjs <prompts.json> <id> [...]
import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const id of process.argv.slice(3)) {
    const u = P[id].user.split('\n'); const k = u.findIndex((l) => l.startsWith('USER QUESTION:'));
    console.log(`== ${id} user lines ${u.length}, from ${k}; system ${P[id].system.length} chars; keys ${Object.keys(P[id]).join(',')}`);
    u.slice(k).forEach((l, i) => console.log(String(k + i).padStart(3), l.startsWith('[ASSISTANT]') || l.startsWith('1. "') ? l.slice(0, 40) + ' ...[cut]' : l.slice(0, 150)));
}
