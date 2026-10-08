import fs from 'node:fs'; import { spawnSync } from 'node:child_process'; import os from 'node:os';
const good = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/stage/smoke-fix-pad/electron/audio/LiveRouterSession.ts';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router';
const dest = WT + '/electron/audio/LiveRouterSession.ts';
const src = fs.readFileSync(good, 'utf8');
const mutants = {
  'no-pad': ['if (deficit >= PAD_FLOOR_MS) {', 'if (false) {'],
  'no-timer': ['if (up) this.startPadTimer(); else this.stopPadTimer();', 'if (!up) this.stopPadTimer();'],
  'no-cap': ['const PAD_CAP_MS = 1000;', 'const PAD_CAP_MS = 1e9;'],
  'pad-on-loud': ['else if (deficit >= PAD_FLOOR_MS) {', 'if (deficit >= PAD_FLOOR_MS) {'],
  'timer-pads-loud': ['if (!this.lastChunkZero || t - this.lastWriteAt', 'if (t - this.lastWriteAt'],
  'timer-ignores-generation': ['if (gen !== this.generation || !this.up || !this.session) { this.stopPadTimer(); return; }', 'if (!this.session) { this.stopPadTimer(); return; }'],
  'stop-keeps-timer': ['    this.stopPadTimer();\n    if (this.reconnectTimer)', '    if (this.reconnectTimer)'],
};
const run = () => spawnSync('node', [WT + '/node_modules/vitest/vitest.mjs', 'run', '--root', WT, 'electron/audio/LiveRouterSession.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8' });
for (const [name, [o, n]] of Object.entries(mutants)) {
  if (!src.includes(o)) { console.log(name, 'PATTERN MISSING'); continue; }
  fs.writeFileSync(dest, src.replace(o, () => n));
  const r = run(); const out = r.stdout + r.stderr;
  const failed = [...out.matchAll(/FAIL .*? > ([IP]\d)\./g)].map((m) => m[1]);
  console.log(name, 'exit', r.status, 'failed:', [...new Set(failed)].join(',') || '(none)', (out.match(/Tests .*/) || [''])[0]);
}
fs.writeFileSync(dest, src);
const r = run(); console.log('restored', r.status, (r.stdout.match(/Tests .*/) || [''])[0]);
