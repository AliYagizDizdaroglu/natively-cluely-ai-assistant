// End-to-end: the real startup line, as the app's console.log override writes it, through collectPass → render.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const G = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden';
const SRC = path.join(G, 'interview60.runs', '2026-09-09T15-00-55-s50a');
const W = await import(pathToFileURL(path.join(SPR, 'pr', process.argv[2] ?? 'wt.mjs')).href);
const H = await import(pathToFileURL(path.join(SPR, 'pr', 'head.mjs')).href);
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { const s = path.join(a, e.name), d = path.join(b, e.name); if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d); } };
const base = H.renderPassRecord(H.collectPass(SRC));
for (const [tag, line] of [['on', '[LOG] [Main] verbal hedge: on trigger=5000ms'], ['off', '[LOG] [Main] verbal hedge: off'], ['none', null]]) {
  const dst = path.join(SPR, 'e2e', tag, '2026-09-09T15-00-55-s50a');
  fs.rmSync(path.join(SPR, 'e2e', tag), { recursive: true, force: true });
  copyDir(SRC, dst);
  if (line) {
    const f = path.join(dst, 'natively_debug.log');
    const t = fs.readFileSync(f, 'utf8').split('\n');
    t.splice(1, 0, line, '[LOG] [Main] follow-up parent: off');   // right after the session header, as main.ts logs it
    fs.writeFileSync(f, t.join('\n'));
  }
  const p = W.collectPass(dst);
  const md = W.renderPassRecord(p);
  const extra = md.split('\n').filter((l) => !base.split('\n').includes(l));
  console.log(tag, 'meta.verbalHedge =', JSON.stringify(p.meta.verbalHedge), '| changed/added lines:', extra.length);
  for (const l of extra) console.log('   ', l.replace(/C:\\\S+/g, '<dir>'));
}
