// Task 5 (throwaway): snapshot MAIN's extractor BEFORE any byte of Task 5 reaches MAIN (sdd\t5-orig\), and
// check the stage copy is byte-identical to it. Read-only on MAIN and on the stage.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const rel = 'electron/test/golden/interview60.turns-fixture.mjs';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const m = fs.readFileSync(path.join(MAIN, rel));
const s = fs.readFileSync(path.join(HERE, '..', 'stage', rel));
if (m.length !== 5485) { console.log(`STOP: MAIN's extractor is ${m.length} bytes, not 5485`); process.exit(1); }
if (Buffer.compare(m, s) !== 0) { console.log('STOP: staged extractor differs from MAIN'); process.exit(1); }
const dst = path.join(HERE, 't5-orig', 'interview60.turns-fixture.mjs');
fs.mkdirSync(path.dirname(dst), { recursive: true });
if (fs.existsSync(dst)) { console.log('t5-orig already holds a snapshot; not overwriting'); process.exit(1); }
fs.writeFileSync(dst, m);
const c = fs.readFileSync(dst);
console.log(`snapshot: ${c.length} bytes, sha256 ${sha(c)}, identical to MAIN: ${Buffer.compare(c, m) === 0}, CR bytes: ${c.filter((x) => x === 13).length}`);
