import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const M = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const lines = fs.readFileSync(path.join(SPR, 'lstree.txt'), 'utf8').split('\n').filter(Boolean);
let n = 0;
for (const l of lines) {
  const m = l.match(/^(\d+) (\w+) ([0-9a-f]+)\t(.*)$/); if (!m || m[2] !== 'blob') continue;
  let f = m[4]; if (f.startsWith('"')) f = JSON.parse(f);
  const p = path.join(M, f);
  let buf; try { buf = fs.readFileSync(p); } catch { console.log('MISSING', f); continue; }
  const h = crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
  n++;
  if (h !== m[3]) console.log('MOD', f, fs.statSync(p).mtime.toISOString());
}
console.log('checked', n);
