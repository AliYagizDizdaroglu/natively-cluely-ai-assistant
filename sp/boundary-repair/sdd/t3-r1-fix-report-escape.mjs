// Throwaway (Task 3, fix round 1): the report text I typed with a backslash-u sequence came out of the Write tool with real U+0301
// characters in three places (the M1 table row twice, the "2 literal escapes" sentence once). Print each occurrence in context, then
// turn each into the six literal characters backslash,u,0,3,0,1. Both are built from char codes. Refuses unless there are exactly 3.
//   node t3-r1-fix-report-escape.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(HERE, 'task-3-report.md');
const COMBINING = String.fromCharCode(0x301);
const LITERAL = `${String.fromCharCode(92)}u0301`;
const text = fs.readFileSync(REPORT, 'utf8');
const parts = text.split(COMBINING);
console.log(`U+0301 characters in the report: ${parts.length - 1}`);
let pos = 0;
for (let i = 0; i < parts.length - 1; i++) {
    pos += parts[i].length + (i > 0 ? 1 : 0);
    const before = parts[i].slice(-28).replace(/\n/g, ' ');
    const after = parts[i + 1].slice(0, 28).replace(/\n/g, ' ');
    console.log(`  #${i + 1}: ...${before}[U+0301]${after}...`);
}
if (parts.length !== 4) { console.log('REFUSED: expected exactly 3'); process.exit(1); }
fs.writeFileSync(REPORT, parts.join(LITERAL));
const after = fs.readFileSync(REPORT, 'utf8');
console.log(`after: U+0301 characters ${after.split(COMBINING).length - 1}, literal escapes ${after.split(LITERAL).length - 1}, CR ${after.split('\r').length - 1}, bytes ${Buffer.byteLength(after)}`);
