import fs from 'node:fs';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-26T11-39-51-h40b';
const tl = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
console.log('total items', tl.items.length);
const chainItems = tl.items.filter((i) => i.chain);
console.log('chain items:', chainItems.length);
console.log(chainItems.map((i) => i.id));
console.log(JSON.stringify(chainItems[0], null, 1));
