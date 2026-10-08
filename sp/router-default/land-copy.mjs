// node land-copy.mjs [--go]  -> copies the router-default branch's changed paths from the integration worktree into MAIN.
// Without --go: prints the plan only. Refuses if a target is modified in MAIN's working tree or the source is missing.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const WT = `${MAIN}\\.claude\\worktrees\\live-router`;
const LAB = path.dirname(fileURLToPath(import.meta.url));
const g = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });
const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=17d199d').slice(7);
const lines = g(WT, 'diff', '--name-status', BASE, 'feat/live-router').trim().split('\n');
const dirty = new Set(g(MAIN, 'status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3).trim()));
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const paths = [];
for (const l of lines) {
  const [st, p] = l.split('\t');
  if (!['A', 'M'].includes(st)) { console.log(`REFUSED: status ${st} for ${p}`); process.exit(2); }
  if (dirty.has(p)) { console.log(`REFUSED: ${p} is modified in MAIN's working tree`); process.exit(2); }
  paths.push(p);
}
const go = process.argv.includes('--go');
for (const p of paths) {
  const src = path.join(WT, p); const dst = path.join(MAIN, p);
  const b = fs.readFileSync(src);
  if (go) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
  const back = go ? sha(fs.readFileSync(dst)) : '-';
  console.log(`${go ? 'COPIED' : 'PLAN'} ${p} ${sha(b)} ${back}`);
}
fs.writeFileSync(path.join(LAB, 'land-paths.txt'), paths.join('\n') + '\n');
console.log(`${paths.length} paths; list written to land-paths.txt`);
