// Read-only reviewer check for Task 2. Writes nothing into MAIN.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brief = fs.readFileSync(path.join(SDD, 'task-2-brief.md'), 'utf8');

// 1. hashes + CR counts of the five files
const files = [
    'electron/audio/DeepgramStreamingSTT.ts',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts',
    'electron/audio/deepgramBoundaryRepair.ts',
    'electron/audio/deepgramBoundaryRepair.test.ts',
    'electron/audio/deepgramBoundaryRepair.fixtures.json',
];
for (const f of files) {
    const buf = fs.readFileSync(path.join(MAIN, f));
    const cr = buf.filter((b) => b === 13).length;
    const st = fs.statSync(path.join(MAIN, f));
    console.log(`HASH ${f} ${buf.length} B sha256 ${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)} CR=${cr} mtime=${st.mtime.toISOString()}`);
}

// 2. the brief's fenced blocks vs MAIN (with negative controls)
const blocks = [...brief.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);
console.log(`brief ts blocks: ${blocks.length}`);
const [testBlock, importBlock, perSocketBlock, oldHandler, newHandler] = blocks;
const testSrc = fs.readFileSync(path.join(MAIN, files[1]), 'utf8');
const prodSrc = fs.readFileSync(path.join(MAIN, files[0]), 'utf8');
console.log(`test file === brief Step 1 block: ${testSrc === testBlock}`);
console.log(`control: test file === brief Step 1 block with one char changed: ${testSrc === testBlock.replace('0.9 }', '0.8 }')}`);
console.log(`prod contains import block: ${prodSrc.includes(importBlock)}`);
console.log(`prod import directly after keytermsFor import: ${prodSrc.includes("import { keytermsFor } from './deepgramKeyterms';\n" + importBlock)}`);
console.log(`prod contains per-socket block directly after stale: ${prodSrc.includes('            const stale = (): boolean => this.live !== live;\n' + perSocketBlock)}`);
console.log(`prod contains NEW handler block: ${prodSrc.includes(newHandler)}`);
console.log(`control: prod contains OLD handler block (expect false): ${prodSrc.includes(oldHandler)}`);
console.log(`Transcript event lines in prod: ${prodSrc.split('\n').filter((l) => l.includes('Transcript event')).length}`);
console.log(`createBoundaryRepair occurrences in prod: ${(prodSrc.match(/createBoundaryRepair/g) ?? []).length}`);

// 3. files under MAIN modified since 2026-09-29 16:00 local (skip deps, builds, git, worktrees)
const cutoff = new Date(2026, 8, 29, 16, 0, 0).getTime();
const skip = new Set(['node_modules', '.git', '.claude', 'dist', 'dist-electron', 'release', 'out', 'build']);
const recent = [];
const walk = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); continue; }
        try { const st = fs.statSync(p); if (st.mtimeMs >= cutoff) recent.push([st.mtime.toISOString(), path.relative(MAIN, p)]); } catch { }
    }
};
walk(MAIN);
recent.sort();
console.log(`files modified since ${new Date(cutoff).toISOString()}: ${recent.length}`);
for (const [t, p] of recent) console.log(`  ${t}  ${p}`);
