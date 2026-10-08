import fs from 'node:fs'; import path from 'node:path';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const SRC = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-09T15-00-55-s50a';
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { const s = path.join(a, e.name), d = path.join(b, e.name); if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d); } };
const dst = path.join(SPR, 'cwd', 'electron', 'test', 'golden', 'interview60.runs', '2026-09-09T15-00-55-s50a');
copyDir(SRC, dst);
console.log(fs.readdirSync(dst).length, 'entries in', dst);
