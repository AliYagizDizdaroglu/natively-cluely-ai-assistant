// Throwaway: was any ET answer cut? Print how each answer's turns ended and the answer's last characters.
//   node check-endings.mjs runs/et10-low.answers.json
import fs from 'node:fs';
const A = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [id, a] of Object.entries(A)) {
    const answerTurns = (a.turns ?? []).filter((t) => !t.premature && t.atMs >= (a.ttftMs ?? Infinity));
    console.log(`${id.padEnd(7)} turns ${answerTurns.map((t) => t.how).join(',') || '-'}  ends "...${a.answer.slice(-60)}"`);
}
