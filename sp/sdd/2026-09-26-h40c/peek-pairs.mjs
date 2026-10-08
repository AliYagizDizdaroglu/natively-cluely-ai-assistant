import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const p = JSON.parse(fs.readFileSync(`${SP}/flash-h40b/blind/pairs.blind-1.json`, 'utf8'));
console.log('model', p.model);
console.log('items', p.items.length);
console.log(JSON.stringify(p.items.slice(0, 3), null, 1));
const ids = [...new Set(p.items.map((i) => i.id))];
console.log('unique ids', ids);
