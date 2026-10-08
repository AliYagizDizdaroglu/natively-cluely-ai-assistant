// Sync the fix-round-1 files from MAIN into the mirror and re-create the node_modules junction.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const M = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const R = path.join(SPR, 'mirror');
const files = fs.readFileSync(path.join(SPR, 'files.txt'), 'utf8').split('\n').filter(Boolean);
for (const f of files) fs.copyFileSync(path.join(M, f), path.join(R, f));
const nm = path.join(R, 'node_modules');
if (!fs.existsSync(nm)) execFileSync('cmd', ['/c', 'mklink', '/J', nm, path.join(M, 'node_modules')], { stdio: 'inherit' });
console.log('synced', files.length);
