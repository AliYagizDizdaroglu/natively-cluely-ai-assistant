// Read-only against MAIN: copies the historical s50a run folder into the review's scratch cwd,
// so interview60.pass-record.test.ts (which resolves S50A against process.cwd()) runs its
// s50a block from a temp cwd instead of skipping it.
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const REL = 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const CWD = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'vitest-cwd-review10');
const src = path.join(MAIN, REL);
const dest = path.join(CWD, REL);
fs.mkdirSync(dest, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    if (!fs.statSync(s).isFile()) continue;
    fs.copyFileSync(s, path.join(dest, f));
    n++;
}
console.log(`copied ${n} files to ${dest}`);
console.log(`judge present: ${fs.existsSync(path.join(dest, 'interview60.judge.json'))}`);
