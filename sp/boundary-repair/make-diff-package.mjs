// Throwaway (2026-09-29): a before -> after review package for files whose paths exceed MAX_PATH under
// PowerShell. Copies both sides to short temp folders, runs `git diff --no-index -U10`, writes one package.
//   node make-diff-package.mjs <out file> <title> <beforeDir> <afterDir> <file> [<file> ...]
//   (each <file> is a name inside both dirs; afterDir may be MAIN's electron/audio)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const [out, title, beforeDir, afterDir, ...files] = process.argv.slice(2);
if (!files.length) { console.log('usage: make-diff-package.mjs <out> <title> <beforeDir> <afterDir> <file>...'); process.exit(2); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
fs.mkdirSync(path.join(tmp, 'a')); fs.mkdirSync(path.join(tmp, 'b'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
const lines = [`# ${title}`, ''];
const body = [];
for (const f of files) {
    const A = fs.readFileSync(path.join(beforeDir, f)), B = fs.readFileSync(path.join(afterDir, f));
    fs.writeFileSync(path.join(tmp, 'a', f), A); fs.writeFileSync(path.join(tmp, 'b', f), B);
    lines.push(`STAT ${f}  before ${A.length} B sha256 ${sha(A)} -> after ${B.length} B sha256 ${sha(B)}`);
    const d = spawnSync('git', ['diff', '--no-index', '-U10', '--', `a/${f}`, `b/${f}`], { cwd: tmp, encoding: 'utf8' });
    if (d.status !== 0 && d.status !== 1) { console.log(`git diff failed for ${f}: ${d.stderr}`); process.exit(3); }
    body.push(`===== ${f} =====`, d.stdout || '(identical)', '');
}
fs.writeFileSync(out, [...lines, '', ...body].join('\n'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`wrote ${out}: ${files.length} files`);
