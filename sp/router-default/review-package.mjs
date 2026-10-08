// node review-package.mjs <worktree-name> <base> <task-id>  -> writes LAB\reviews\<task-id>.diff (log + stat + diff -U10)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const LAB = path.dirname(fileURLToPath(import.meta.url));
const [name, base, id] = process.argv.slice(2);
if (!name || !base || !id) { console.log('usage: review-package.mjs <wt-name> <base> <task-id>'); process.exit(2); }
const WT = `C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\.claude\\worktrees\\${name}`;
const g = (...a) => execFileSync('git', ['-C', WT, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const text = [g('log', '--oneline', `${base}..HEAD`), g('diff', '--stat', base, 'HEAD'), g('diff', '-U10', base, 'HEAD')].join('\n');
fs.mkdirSync(path.join(LAB, 'reviews'), { recursive: true });
const out = path.join(LAB, 'reviews', `${id}.diff`);
fs.writeFileSync(out, text);
console.log(`${out} ${text.length} chars; HEAD ${g('rev-parse', '--short', 'HEAD').trim()}`);
