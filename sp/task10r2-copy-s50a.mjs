import fs from 'node:fs';
import path from 'node:path';

// fs.cpSync is known to exit silently (127) on paths containing non-ASCII characters
// (this repo lives under "...Masaüstü..."), so copy by hand with readdirSync + copyFileSync.
const src = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-09T15-00-55-s50a";
const dst = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\vitest-cwd-task10\\electron\\test\\golden\\interview60.runs\\2026-09-09T15-00-55-s50a";

if (!fs.existsSync(src)) { console.error('SOURCE MISSING: ' + src); process.exit(1); }

let files = 0, bytes = 0;
function copyDir(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const f = path.join(from, entry.name);
        const t = path.join(to, entry.name);
        if (entry.isDirectory()) { copyDir(f, t); continue; }
        fs.copyFileSync(f, t); // source is never written to
        files++;
        bytes += fs.statSync(t).size;
    }
}
copyDir(src, dst);
console.log(`COPIED files=${files} bytes=${bytes} -> ${dst}`);

// Sanity: source unchanged (still readable, same file count as before).
const srcCount = fs.readdirSync(src, { recursive: true }).filter((n) => fs.statSync(path.join(src, n)).isFile()).length;
console.log('source file count still: ' + srcCount);
