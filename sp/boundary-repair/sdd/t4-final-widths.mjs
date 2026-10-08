// Task 4 final fix round (throwaway): the width of the module's header comment block (the first /** ... */), measured on the ORIGINAL in sdd\t4-r2\,
// so the re-wrapped lines of edit E4 can be held to "the block's existing width". Prints the widest lines and a histogram tail. Read-only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const L = fs.readFileSync(path.join(HERE, 't4-r2', 'deepgramBoundaryRepair.ts'), 'utf8').split('\n');
const end = L.findIndex((l, i) => i > 0 && l.trim() === '*/');
const block = L.slice(0, end + 1);
const w = block.map((l) => [...l].length);        // code points, as an editor counts columns
const max = Math.max(...w);
console.log(`header block: lines 1-${end + 1}, widest ${max} columns`);
block.map((l, i) => [i + 1, w[i], l]).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([n, x, l]) => console.log(`  ${String(n).padStart(3)}: ${x} cols  ${l.slice(0, 60)}...`));
const bullets = block.filter((l) => /^ \*          \S/.test(l)).map((l) => [...l].length);
console.log(`continuation lines of the CUT/PAUSE/REPAIR bullets (' *          '): ${bullets.length}, widest ${Math.max(...bullets)}`);
