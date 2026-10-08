import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const p = JSON.parse(fs.readFileSync(`${SP}/flash-h40b-blind-cal/pairs.blind-1.json`, 'utf8'));
const r09f = p.items.filter((i) => i.id === 'R09F');
console.log(JSON.stringify(r09f[0], null, 1));
