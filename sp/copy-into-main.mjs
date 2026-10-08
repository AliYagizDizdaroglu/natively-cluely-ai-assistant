// Throwaway: copy one file into MAIN byte for byte, refusing to overwrite unless --overwrite, refusing
// CR bytes (the commit helper rejects blobs with CR); prints sizes and sha256 of source and copy.
//   node copy-into-main.mjs <source path> <MAIN-relative destination> [--overwrite]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const [src, rel] = process.argv.slice(2);
const overwrite = process.argv.includes('--overwrite');
if (!src || !rel) { console.log('usage: copy-into-main.mjs <source> <MAIN-relative destination> [--overwrite]'); process.exit(2); }
const dst = path.join(MAIN, rel);
const b = fs.readFileSync(src);
const cr = b.filter((x) => x === 13).length;
if (cr) { console.log(`REFUSED: ${src} holds ${cr} CR bytes`); process.exit(3); }
if (fs.existsSync(dst) && !overwrite) { console.log(`REFUSED: ${rel} exists (pass --overwrite to replace it)`); process.exit(4); }
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
const sha = (x) => createHash('sha256').update(x).digest('hex').slice(0, 16);
const c = fs.readFileSync(dst);
console.log(`${rel}: ${b.length} bytes, sha256 ${sha(b)} -> ${sha(c)} ${sha(b) === sha(c) ? 'IDENTICAL' : 'DIFFERENT'}`);
