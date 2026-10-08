import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const G = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden';
const H = await import(pathToFileURL(path.join(SPR, 'pr', 'head.mjs')).href);
for (const n of ['2026-09-15T08-22-29-s50f', '2026-09-26T11-39-51-h40b']) {
  const a = H.renderPassRecord(H.collectPass(path.join(G, 'interview60.runs', n))).split('\n');
  const b = fs.readFileSync(path.join(G, 'passes', n + '.md'), 'utf8').split('\n');
  let c = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && c < 3; i++) if (a[i] !== b[i]) { c++; console.log(n, i, '\nR:', (a[i] || '').slice(0, 200), '\nC:', (b[i] || '').slice(0, 200)); }
}
