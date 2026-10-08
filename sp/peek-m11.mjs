import fs from 'node:fs';
const tl = JSON.parse(fs.readFileSync('C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-07T08-14-12-after8\\interview60.timeline.json', 'utf8'));
const it = tl.items.find((i) => i.id === 'M11');
console.log(JSON.stringify(it, null, 2));
