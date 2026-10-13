// Builds OLD (worktree HEAD e9881c8e) and NEW (worktree files) turn machines, turnDispatch and the
// worktree ChipDeduper into importable .mjs bundles next to this file. Run before d2-replay.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/.claude/wt-d1';
const ESB = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/node_modules/esbuild/bin/esbuild';
const old = execFileSync('git', ['show', 'e9881c8e:electron/services/interviewerTurn.ts'], { cwd: WT, maxBuffer: 1 << 24 });
fs.writeFileSync(path.join(HERE, 'oldTurn.ts'), old);
const run = (entry, out) => execFileSync('node', [ESB, entry, '--bundle', '--platform=node', '--format=esm', `--outfile=${path.join(HERE, out)}`, '--log-level=warning'], { stdio: 'inherit' });
run(path.join(HERE, 'oldTurn.ts'), 'oldTurn.mjs');
run(`${WT}/electron/services/interviewerTurn.ts`, 'newTurn.mjs');
run(`${WT}/electron/services/turnDispatch.ts`, 'turnDispatch.mjs');
run(`${WT}/electron/services/ChipDeduper.ts`, 'chipDeduper.mjs');
console.log('built', fs.readdirSync(HERE).filter((f) => f.endsWith('.mjs') && f !== 'build.mjs').join(','));
