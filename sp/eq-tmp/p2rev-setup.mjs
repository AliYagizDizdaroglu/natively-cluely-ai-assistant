// P2 review: a throwaway copy of WT's golden + llm dirs for vitest (never WT itself).
import fs from 'node:fs';
import path from 'node:path';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/eq-build';
const MAIN_NM = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/node_modules';
const OUT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/eq-tmp/p2rev';
function copyDir(src, dst, recurse) {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, e.name), d = path.join(dst, e.name);
        if (e.isDirectory()) { if (recurse) copyDir(s, d, recurse); }
        else if (e.isFile()) fs.copyFileSync(s, d);
    }
}
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(WT, 'electron/test/golden'), path.join(OUT, 'electron/test/golden'), false);
copyDir(path.join(WT, 'electron/llm'), path.join(OUT, 'electron/llm'), true);
fs.copyFileSync(path.join(WT, 'package.json'), path.join(OUT, 'package.json'));
fs.writeFileSync(path.join(OUT, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(OUT + '/.vite-cache')}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
fs.symlinkSync(MAIN_NM, path.join(OUT, 'node_modules'), 'junction');
console.log('copied to', OUT);
