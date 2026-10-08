// Throwaway: copy MAIN's cached scenario50 TTS clips (test audio, gitignored) into the whole-turn worktree so
// interview60.build-audio-local.mjs can build the smoke stimulus there without re-synthesising anything.
// readdirSync + copyFileSync on purpose: fs.cpSync exits 127 silently on the accented path (memory).
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const src = `${MAIN}/electron/test/golden/scenario50-tts-local`, dst = `${WT}/electron/test/golden/scenario50-tts-local`;
fs.mkdirSync(dst, { recursive: true });
let n = 0, bytes = 0;
for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (!fs.statSync(s).isFile()) continue;
    if (fs.existsSync(d) && fs.statSync(d).size === fs.statSync(s).size) continue;
    fs.copyFileSync(s, d); n++; bytes += fs.statSync(s).size;
}
console.log(`copied ${n} files (${(bytes / 1e6).toFixed(1)} MB); worktree clip dir now has ${fs.readdirSync(dst).length} entries`);
