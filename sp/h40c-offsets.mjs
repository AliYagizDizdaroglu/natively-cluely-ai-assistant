import fs from 'node:fs';
const p = process.argv[2];
const text = fs.readFileSync(p, 'utf8');
const marker = process.argv[3];
const idx = text.indexOf(marker);
if (idx < 0) { console.error('marker not found'); process.exit(1); }
console.log(Buffer.byteLength(text.slice(0, idx), 'utf8'));
console.log('total bytes:', Buffer.byteLength(text, 'utf8'));
