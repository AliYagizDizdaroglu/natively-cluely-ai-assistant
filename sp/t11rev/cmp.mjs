import fs from 'node:fs'; import path from 'node:path';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const M = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const files = fs.readFileSync(path.join(SPR, 'files.txt'), 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const a = fs.readFileSync(path.join(SPR, 'head', f)); const b = fs.readFileSync(path.join(M, f));
  const cr = b.includes(13); const bom = b[0] === 0xef && b[1] === 0xbb;
  console.log(a.equals(b) ? 'SAME' : 'DIFF', f, 'CR=' + cr, 'BOM=' + bom, 'mtime=' + fs.statSync(path.join(M, f)).mtime.toISOString());
}
