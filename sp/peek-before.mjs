import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log('answersToNobody', d.answersToNobody);
for (const p of d.pairs) if (p.dispatchedAt && p.dispatchedAt.startsWith('2026-09-26T10:47:3')) console.log(JSON.stringify(p));
for (const i of d.items) if (i.id === 'R07F') console.log(JSON.stringify(i));
