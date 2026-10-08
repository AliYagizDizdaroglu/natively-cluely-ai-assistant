// The four AGENDA entries written this afternoon carry a guessed "18:xx"; the file's mtime (17:36 local) is when the
// last of them was written. Replace exactly those four stamps, keep every other byte (CRs included).
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const src = fs.readFileSync(F, 'utf8');
const lines = src.split('\n');
let n = 0;
for (const i of [589, 623, 624, 625]) {
    const before = lines[i];
    lines[i] = lines[i].replace('2026-10-02 18:xx', '2026-10-02 17:36').replace(/^- 18:xx Fri/, '- 17:36 Fri');
    if (lines[i] !== before) n++;
}
if (n !== 4) { console.log(`REFUSED: expected 4 stamps, matched ${n}`); process.exit(2); }
fs.writeFileSync(F, lines.join('\n'));
console.log(`replaced ${n} stamps; 18:xx left in file: ${(lines.join('\n').match(/18:xx/g) ?? []).length}`);
