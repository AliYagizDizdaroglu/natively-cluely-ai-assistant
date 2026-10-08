import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const wt = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b';
const f = wt + '/electron/services/routerArbiter.ts';
const orig = fs.readFileSync(f, 'utf8');
const muts = {
  'M1 drop early superseded flag': ["      t.superseded = true;\n      this.deps.diag(`[Router] superseded", "      this.deps.diag(`[Router] superseded"],
  'M2 drop diag line': ["      this.deps.diag(`[Router] superseded turn=${t.id} phase=${t.live.phase === 'streaming' ? 'streaming' : 'done'} line_written=${t.lineWritten ? 'yes' : 'no'}`);\n", ''],
  'M3 live-branch source: any held source': ["if (last && last.ch === 'source') this.sendPipeline(t, last);", "const anySrc = [...held0].reverse().find((o) => o.ch === 'source'); if (anySrc) this.sendPipeline(t, anySrc);"],
  'M4 keep pipeFirstAt': ['t.pipeEndKind = null; t.pipeFirstAt = null;', 't.pipeEndKind = null;'],
};
try {
  for (const [name, [a, b]] of Object.entries(muts)) {
    let s = orig;
    if (s.split(a).length !== 2) throw new Error('mutation target missing: ' + name);
    s = s.replace(a, () => b);
    if (name.startsWith('M3')) s = s.replace("const last = t.held[t.held.length - 1];   // fix2", "const held0 = t.held; const last = t.held[t.held.length - 1];   // fix2");
    fs.writeFileSync(f, s);
    let out = '';
    try { out = execFileSync('node', [wt + '/node_modules/vitest/vitest.mjs', 'run', '--root', wt, 'electron/services/routerArbiter.test.ts'], { cwd: process.env.TEMP, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
    console.log(name, '=>', (out.match(/Tests .*/) || ['?'])[0].replace(/\x1b\[[0-9;]*m/g, ''));
  }
} finally { fs.writeFileSync(f, orig); }
