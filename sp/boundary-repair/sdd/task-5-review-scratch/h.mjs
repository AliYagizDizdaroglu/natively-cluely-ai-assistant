// Lists MAIN files modified since the review started (23:10 local), skipping .git, node_modules, .claude, dist*;
// then the vite/vitest cache dirs, which only the sanctioned TEST-form run may touch.
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const since = process.argv[2] ? new Date(Date.now() - Number(process.argv[2]) * 60000) : (() => { const d = new Date(); d.setHours(23, 10, 0, 0); return d; })();
const hits = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.claude'].includes(e.name) || e.name.startsWith('dist')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (fs.statSync(p).mtime >= since) hits.push(`${path.relative(MAIN, p)} ${fs.statSync(p).mtime.toISOString()}`);
} };
walk(MAIN);
console.log(`MAIN files modified since ${since.toISOString()}: ${hits.length ? `\n  ${hits.join('\n  ')}` : 'none'}`);
for (const c of ['node_modules/.vite', 'node_modules/.vitest', 'node_modules/.vite/vitest']) {
    const p = path.join(MAIN, c);
    console.log(`${c}: ${fs.existsSync(p) ? `mtime ${fs.statSync(p).mtime.toISOString()}` : 'absent'}`);
}
