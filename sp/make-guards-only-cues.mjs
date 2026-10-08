// Builds guardcheck-smoke-cues.cmd from launch-smoke-cues.cmd: the launcher's own guard chain, verbatim,
// followed by one echo. Generated, never hand-copied, so the check cannot drift from the launcher.
// Run the result with the worktree as cwd; it prints GUARDS_ALL_PASSED only if every guard let it through.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'launch-smoke-cues.cmd'), 'latin1');
const lines = src.split('\r\n');
const cut = lines.findIndex((l) => l.startsWith('set NODE='));
if (cut < 0) throw new Error('launcher has no "set NODE=" line: the guard chain\'s end is unknown');
const guards = lines.slice(0, cut);
const exits = guards.filter((l) => /^\s*exit \/b \d+$/.test(l)).length;
if (exits !== 4) throw new Error(`expected 4 guard exits above "set NODE=", found ${exits}`);
const out = [...guards, 'echo GUARDS_ALL_PASSED', ''].join('\r\n');
if (/[^\x00-\x7f]/.test(out)) throw new Error('non-ASCII byte in the guard chain');
if (out.replace(/\r\n/g, '').includes('\n') || out.replace(/\r\n/g, '').includes('\r')) throw new Error('a line ending that is not CRLF');
const dest = path.join(HERE, 'guardcheck-smoke-cues.cmd');
fs.writeFileSync(dest, out, 'latin1');
console.log(`wrote ${path.basename(dest)}: ${guards.length} launcher lines + 1 echo, ${exits} guards`);
