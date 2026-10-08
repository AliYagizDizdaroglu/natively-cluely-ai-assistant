import fs from 'node:fs';
import path from 'node:path';

const src = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-09T15-00-55-s50a';
const dst = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\vitest-cwd-task11\\electron\\test\\golden\\interview60.runs\\2026-09-09T15-00-55-s50a';

function copyRecursive(s, d) {
    fs.mkdirSync(d, { recursive: true });
    for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
        const sp = path.join(s, entry.name);
        const dp = path.join(d, entry.name);
        if (entry.isDirectory()) copyRecursive(sp, dp);
        else fs.copyFileSync(sp, dp);
    }
}

copyRecursive(src, dst);
const countFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1), 0);
console.log(`OK: copied s50a. src files=${countFiles(src)} dst files=${countFiles(dst)}`);
