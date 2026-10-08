// Throwaway: the non-prompt fields of s50m-gated.json (kinds, chains, refs), never userA/userB/system.
import fs from 'node:fs';
const g = JSON.parse(fs.readFileSync(new URL('./s50m-gated.json', import.meta.url), 'utf8'));
for (const [id, o] of Object.entries(g)) {
    const { userA, userB, system, block, current, refQuestion, ...rest } = o;
    console.log(id, JSON.stringify(rest), refQuestion ? `refQuestion: ${refQuestion.slice(0, 90)}` : '');
}
