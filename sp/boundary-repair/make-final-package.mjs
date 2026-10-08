// Throwaway (2026-09-29): the whole-change review package for the boundary repair — MAIN's working tree
// against HEAD for the 10 files of Tasks 1-5. Modified files as `git diff -U10 HEAD`, new files in full with
// line numbers, the fixtures JSON by stat only (plus whether it is byte-identical to BR/fixtures-v3.json).
// Read-only on MAIN (git diff / rev-parse / status only).
//   node make-final-package.mjs <out file>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const out = process.argv[2];
if (!out) { console.log('usage: make-final-package.mjs <out file>'); process.exit(2); }
const FILES = [
    'electron/audio/deepgramBoundaryRepair.ts',
    'electron/audio/deepgramBoundaryRepair.test.ts',
    'electron/audio/deepgramBoundaryRepair.fixtures.json',
    'electron/audio/DeepgramStreamingSTT.ts',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts',
    'electron/audio/deepgramKeyterms.ts',
    'electron/audio/deepgramKeyterms.test.ts',
    'electron/test/golden/interview60.turns-finals.mjs',
    'electron/test/golden/interview60.turns-finals.test.ts',
    'electron/test/golden/interview60.turns-fixture.mjs',
];
const git = (...a) => execFileSync('git', ['-C', MAIN, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const head = git('rev-parse', 'HEAD').trim();
const status = new Map(git('status', '--porcelain=v1', '--untracked-files=all', '--', ...FILES).split('\n').filter(Boolean).map((l) => [l.slice(3), l.slice(0, 2)]));
const lines = [`# Boundary repair: whole-change review package`, `MAIN working tree vs HEAD ${head} (generated ${new Date().toISOString()})`, ''];
const body = [];
for (const f of FILES) {
    const buf = fs.readFileSync(path.join(MAIN, f));
    const st = status.get(f) ?? '  ';
    const kind = st === '??' ? 'NEW' : st.trim() === 'M' ? 'MODIFIED' : `UNCHANGED(${st})`;
    const crlf = buf.includes('\r\n') ? ' CRLF!' : '';
    lines.push(`STAT ${kind.padEnd(9)} ${f}  ${buf.length} B  sha256 ${sha(buf).slice(0, 16)}${crlf}`);
    if (f.endsWith('.json')) {
        const ref = fs.readFileSync(path.join(HERE, 'fixtures-v3.json'));
        body.push(`===== ${f} (stat only) =====`, `byte-identical to BR/fixtures-v3.json: ${Buffer.compare(buf, ref) === 0}`, '');
    } else if (kind === 'NEW') {
        const text = buf.toString('utf8').split('\n');
        body.push(`===== ${f} (new, full, line-numbered) =====`, ...text.map((l, i) => `${String(i + 1).padStart(4)}| ${l}`), '');
    } else {
        body.push(`===== ${f} (git diff -U10 HEAD) =====`, git('diff', '-U10', 'HEAD', '--', f) || '(no diff)', '');
    }
}
fs.writeFileSync(out, [...lines, '', ...body].join('\n'));
console.log(`wrote ${out}: ${FILES.length} files vs ${head.slice(0, 7)}`);
console.log(lines.filter((l) => l.startsWith('STAT')).join('\n'));
