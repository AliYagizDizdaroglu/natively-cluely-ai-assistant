// LAB\flight\rd-sha-lines.mjs: the launcher's FIRST printed lines (flight-eq eq-sha-lines.mjs, re-pointed to the router-default hour): the sha256 of each committed text at MAIN's
// HEAD, then the arming record's sha256 or `ARMING absent`. Reads MAIN with `git show HEAD:<path>` (so what is printed is what is
// COMMITTED, whatever the working tree holds); writes nothing.
//   node rd-sha-lines.mjs --root <MAIN> --passes a.md,b.md --arming <file>
// Output (names and hashes only):
//   SHA LINES HEAD <40 hex>
//   PASSES <name> sha256=<64 hex>            one per name, or  PASSES <name> MISSING at HEAD
//   ARMING sha256=<64 hex>                   if <file> exists, else  ARMING absent
// Exit 0 = every named text is committed at HEAD (an absent arming record is not an error: the dry run precedes it);
// 1 = a text is missing at HEAD; 2 = usage.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const usage = (m) => { console.log(`SHA LINES usage error: ${m}`); console.log('usage: node rd-sha-lines.mjs --root <MAIN> --passes a.md,b.md --arming <file>'); process.exit(2); };
const known = new Set(['--root', '--passes', '--arming']);
argv.forEach((a, i) => { if (a.startsWith('--') && !known.has(a)) usage(`unknown option ${a}`); if (!a.startsWith('--') && !known.has(argv[i - 1])) usage(`unexpected argument ${a}`); });
const root = opt('--root'), passes = opt('--passes'), arming = opt('--arming');
if (!root || !passes || !arming || [root, passes, arming].some((v) => v.startsWith('--'))) usage('--root, --passes and --arming are all required');
const names = passes.split(',');
if (names.some((n) => !/^[A-Za-z0-9._-]+\.md$/.test(n))) usage(`--passes holds a name that is not a plain .md file name: ${passes}`);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const git = (...a) => execFileSync('git', ['--no-optional-locks', '-C', root, ...a], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, timeout: 60000 });

let head;
try { head = git('rev-parse', 'HEAD').toString('utf8').trim(); } catch (e) { console.log(`SHA LINES: git rev-parse HEAD failed in ${root}`); process.exit(1); }
console.log(`SHA LINES HEAD ${head}`);
let missing = 0;
for (const n of names) {
    try { console.log(`PASSES ${n} sha256=${sha(git('show', `HEAD:electron/test/golden/passes/${n}`))}`); } catch { console.log(`PASSES ${n} MISSING at HEAD`); missing++; }
}
console.log(fs.existsSync(arming) ? `ARMING sha256=${sha(fs.readFileSync(arming))}` : 'ARMING absent');
process.exit(missing ? 1 : 0);
