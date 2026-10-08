// Throwaway (2026-09-30): calibrate guard-br1.mjs PRE on a temp git repo (never MAIN). Known answers:
//   golden file modified FIRST in status order, right sha -> OK (the trim bug refused this)
//   a tracked source file outside golden modified         -> FAIL (tracked source modified)
//   wrong sha                                              -> FAIL (HEAD mismatch)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(HERE, 'cal', 'pre-repo');
fs.rmSync(repo, { recursive: true, force: true });
fs.mkdirSync(path.join(repo, 'electron', 'test', 'golden'), { recursive: true });
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
git('init', '-q');
git('config', 'user.email', 'cal@example.invalid'); git('config', 'user.name', 'cal');
// "electron/audio.ts" sorts AFTER "electron/test/golden/..."? No: status sorts by path; put the golden file first
// by naming the source file so it sorts after: electron/zz.ts.
fs.writeFileSync(path.join(repo, 'electron', 'test', 'golden', 'a.json'), '{}\n');
fs.writeFileSync(path.join(repo, 'electron', 'test', 'golden', 'b.md'), 'x\n');
fs.writeFileSync(path.join(repo, 'electron', 'zz.ts'), 'export {};\n');
git('add', '.'); git('commit', '-q', '-m', 'base');
const head = git('rev-parse', 'HEAD').trim();
const GUARD = process.env.GUARD_PATH ?? path.join(HERE, 'guard-br1.mjs');   // GUARD_PATH: calibrate against a broken copy
console.log(`guard under test: ${path.basename(GUARD)}`);
const guard = (sha) => { try { return { code: 0, out: execFileSync(process.execPath, [GUARD, 'pre'], { cwd: repo, encoding: 'utf8', env: { ...process.env, NATIVELY_FLIGHT_COMMIT: sha }, stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; } };
const cases = [];
fs.writeFileSync(path.join(repo, 'electron', 'test', 'golden', 'a.json'), '{"x":1}\n');
fs.writeFileSync(path.join(repo, 'electron', 'test', 'golden', 'b.md'), 'y\n');
cases.push(['golden files modified (first status line is golden), right sha', guard(head), 0, /pre OK/]);
cases.push(['wrong sha', guard('0'.repeat(40)), 1, /not the registered/]);
fs.writeFileSync(path.join(repo, 'electron', 'zz.ts'), 'export const y = 1;\n');
cases.push(['a tracked source file outside golden modified', guard(head), 1, /tracked source files are modified.*electron\/zz\.ts/]);
let bad = 0;
for (const [name, r, want, re] of cases) { const ok = r.code === want && re.test(r.out); if (!ok) bad++; console.log(`${ok ? 'OK ' : 'BAD'} ${name}: exit ${r.code} | ${r.out.trim().split('\n')[0]}`); }
fs.rmSync(repo, { recursive: true, force: true });
console.log(bad ? `CALIBRATION FAILED: ${bad}` : 'CALIBRATION OK: pre passes the golden-only case and fails a source change and a wrong sha');
process.exit(bad ? 1 : 0);
