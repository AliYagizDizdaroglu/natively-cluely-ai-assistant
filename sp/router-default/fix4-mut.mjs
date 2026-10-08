import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const wt = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b';
const f = wt + '/electron/services/routerArbiter.ts';
const orig = fs.readFileSync(f, 'utf8');
const muts = {
  'M1 drop the visible guard': ['if (!t.visible && (o.ch', 'if (false && (o.ch'],
  'M2 never mark visible': ["t.visible = true;", "void 0;"],
};
try {
  for (const [name, [a, b]] of Object.entries(muts)) {
    if (orig.split(a).length !== 2) throw new Error('missing ' + name);
    fs.writeFileSync(f, orig.replace(a, () => b));
    let out = '';
    try { out = execFileSync('node', [wt + '/node_modules/vitest/vitest.mjs', 'run', '--root', wt, 'electron/services/routerArbiter.test.ts'], { cwd: process.env.TEMP, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
    console.log(name, '=>', (out.match(/Tests .*/) || ['?'])[0].replace(/\x1b\[[0-9;]*m/g, ''));
  }
} finally { fs.writeFileSync(f, orig); }
