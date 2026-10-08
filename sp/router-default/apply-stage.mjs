// node apply-stage.mjs <task-id>: copy LAB\stage\<task-id>\** into WT, same relative paths. readdirSync+copyFileSync (cpSync fails on Masaüstü).
import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto';
const LAB = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default';
const WTS = ['live-router', 'live-router-a', 'live-router-b', 'live-router-c', 'live-router-d'].map((n) => `C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/${n}`);
const id = process.argv[2]; const WT = (process.argv[3] ?? '').replace(/\\/g, '/').replace(/\/$/, '');
if (!id || !WTS.includes(WT)) { console.log(`usage: apply-stage.mjs <task-id> <one of: ${WTS.join(' | ')}>`); process.exit(2); }
const root = path.join(LAB, 'stage', id); if (!fs.existsSync(root)) { console.log(`no stage ${root}`); process.exit(2); }
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root)) {
  const rel = path.relative(root, f); const dest = path.join(WT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(f, dest);
  console.log(`copied ${rel.replace(/\\/g, '/')} sha12=${createHash('sha256').update(fs.readFileSync(dest)).digest('hex').slice(0, 12)}`);
}
