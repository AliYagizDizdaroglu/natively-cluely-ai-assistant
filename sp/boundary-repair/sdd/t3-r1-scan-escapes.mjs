// Throwaway (Task 3, fix round 1): for every file I wrote this round (sdd\t3-r1-*.mjs / .md, the report, and the two staged files), count
// real U+0301 characters and literal backslash-u-0301 escapes, so the report says exactly what each tool did. Read-only.
//   node t3-r1-scan-escapes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMBINING = String.fromCharCode(0x301);
const LITERAL = `${String.fromCharCode(92)}u0301`;
const files = fs.readdirSync(HERE).filter((n) => /^t3-r1-.*\.(mjs|md)$/.test(n)).map((n) => path.join(HERE, n));
files.push(path.join(HERE, 'task-3-report.md'));
files.push(path.join(HERE, '..', 'stage', 'electron', 'audio', 'deepgramBoundaryRepair.test.ts'));
files.push(path.join(HERE, '..', 'stage', 'electron', 'audio', 'deepgramBoundaryRepair.ts'));
for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    console.log(`${path.basename(f).padEnd(48)} real U+0301: ${String(t.split(COMBINING).length - 1).padStart(2)}   literal escapes: ${String(t.split(LITERAL).length - 1).padStart(2)}`);
}
