// Copies live40's gitignored audio assets from the lane D worktree into MAIN (readdirSync + copyFileSync; cpSync fails on the Masaustu path).
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const SRC = `${MAIN}\\.claude\\worktrees\\live-router-d\\electron\\test\\golden`;
const DST = `${MAIN}\\electron\\test\\golden`;
for (const dir of ['live40-tts-local', 'live40-tts']) {
  const s = path.join(SRC, dir);
  if (!fs.existsSync(s)) { console.log(`absent ${dir}`); continue; }
  const d = path.join(DST, dir);
  fs.mkdirSync(d, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(s)) {
    const sp = path.join(s, f);
    if (fs.statSync(sp).isFile()) { fs.copyFileSync(sp, path.join(d, f)); n++; }
  }
  console.log(`${dir}: ${n} files copied`);
}
