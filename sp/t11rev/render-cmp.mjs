// Renders every run folder with the HEAD (391f1fc) and working-tree pass-record modules and diffs.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const M = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const G = path.join(M, 'electron', 'test', 'golden');
const RUNS = path.join(G, 'interview60.runs');
const prep = (src, name) => {
  let t = fs.readFileSync(src, 'utf8');
  for (const dep of ['interview60.metrics.mjs', 'interview60.judge.mjs']) {
    t = t.replace(`'./${dep}'`, `'${pathToFileURL(path.join(G, dep)).href}'`);
  }
  const out = path.join(SPR, 'pr', name); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, t); return out;
};
const H = await import(pathToFileURL(prep(path.join(SPR, 'head', 'electron', 'test', 'golden', 'interview60.pass-record.mjs'), 'head.mjs')).href);
const W = await import(pathToFileURL(prep(path.join(G, 'interview60.pass-record.mjs'), 'wt.mjs')).href);
let same = 0, diff = 0, err = 0;
for (const d of fs.readdirSync(RUNS)) {
  const dir = path.join(RUNS, d);
  if (!fs.existsSync(path.join(dir, 'interview60.timeline.json'))) continue;
  let a, b;
  try { a = H.renderPassRecord(H.collectPass(dir)); } catch (e) { a = 'ERR ' + e.message; }
  try { b = W.renderPassRecord(W.collectPass(dir)); } catch (e) { b = 'ERR ' + e.message; }
  if (a.startsWith('ERR')) err++;
  if (a === b) same++; else { diff++; console.log('DIFF', d); }
  const pa = JSON.stringify(a.startsWith('ERR') ? a : H.passRow(H.collectPass(dir)));
  const pb = JSON.stringify(b.startsWith('ERR') ? b : W.passRow(W.collectPass(dir)));
  if (pa !== pb) console.log('ROWDIFF', d);
  const vh = b.startsWith('ERR') ? null : W.collectPass(dir).meta.verbalHedge;
  if (vh !== null) console.log('verbalHedge not null', d, vh);
}
const ia = H.renderPassIndex(H.indexRows(RUNS)); const ib = W.renderPassIndex(W.indexRows(RUNS));
console.log(`records same=${same} diff=${diff} (errored-at-HEAD=${err}); INDEX identical=${ia === ib} (${ia.split('\n').length} lines)`);
// Also compare against the committed passes/*.md
const P = path.join(G, 'passes');
if (fs.existsSync(P)) {
  let ok = 0, bad = 0;
  for (const f of fs.readdirSync(P)) {
    if (!f.endsWith('.md') || f === 'INDEX.md') continue;
    const dir = path.join(RUNS, f.replace(/\.md$/, ''));
    if (!fs.existsSync(dir)) continue;
    const rendered = W.renderPassRecord(W.collectPass(dir));
    if (rendered === fs.readFileSync(path.join(P, f), 'utf8')) ok++; else { bad++; console.log('committed record differs from working render:', f, 'HEAD render equal to committed:', H.renderPassRecord(H.collectPass(dir)) === fs.readFileSync(path.join(P, f), 'utf8')); }
  }
  console.log(`committed passes: equal=${ok} differ=${bad}`);
}
