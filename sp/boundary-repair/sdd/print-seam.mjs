import fs from 'node:fs';
const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/audio/deepgramBoundaryRepair.fixtures.json';
const f = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('top-level keys:', Object.keys(f).join(', '));
console.log(JSON.stringify(f.seam, null, 2));
