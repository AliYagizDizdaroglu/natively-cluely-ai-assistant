// Throwaway (scratchpad only): list the files in MAIN whose mtime is at or after a cutoff, sorted by time,
// and say for each whether it is one of the 16 files of the hedge-default change, an electron/audio file
// (another task's uncommitted work), or something else. Read-only: it stats, it never opens or changes a file.
//   node mtime-scan.mjs <ISO cutoff>
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const cutoff = Date.parse(process.argv[2] ?? '');
if (!Number.isFinite(cutoff)) { console.log('usage: mtime-scan.mjs <ISO cutoff, e.g. 2026-09-29T12:00:00Z>'); process.exit(2); }

const MINE = new Set([
    'electron/llm/verbalHedge.ts', 'electron/llm/verbalHedge.test.ts', 'electron/llm/verbalPrimaryModel.ts',
    'electron/llm/WhatToAnswerLLM.answeringModel.test.ts', 'electron/LLMHelper.ts', 'electron/LLMHelper.verbalHedge.test.ts',
    'electron/LLMHelper.abortOnClose.test.ts', 'electron/LLMHelper.geminiThinking.test.ts', 'electron/LLMHelper.stallFallback.test.ts',
    'electron/LLMHelper.verbalPrimary.test.ts', 'electron/LLMHelper.emptyStream.test.ts',
    'electron/LLMHelper.geminiSystemInstruction.test.ts', 'electron/LLMHelper.customNotes.test.ts',
    'electron/test/golden/interview60.pass-record.test.ts', 'electron/test/golden/interview60.pass-record.mjs',
    'electron/test/golden/interview60.flight.mjs',
]);
// Heavy or foreign trees: dependencies, git internals, build output, and the other worktrees under .claude.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'release', '.claude', '.vite', 'out', 'build']);

const hits = [];
let scanned = 0;
function walk(dir, rel) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { console.log(`UNREADABLE: ${rel || '.'}: ${e.code}`); return; }
    for (const e of entries) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), r); continue; }
        if (!e.isFile()) continue;
        scanned++;
        let st;
        try { st = fs.statSync(path.join(dir, e.name)); } catch { continue; }
        if (st.mtimeMs >= cutoff) hits.push({ r, t: st.mtimeMs, size: st.size });
    }
}
walk(MAIN, '');
hits.sort((a, b) => a.t - b.t);
let mine = 0, audio = 0, other = 0;
for (const h of hits) {
    const kind = MINE.has(h.r) ? 'MINE ' : h.r.startsWith('electron/audio/') ? 'AUDIO' : 'OTHER';
    if (kind === 'MINE ') mine++; else if (kind === 'AUDIO') audio++; else other++;
    console.log(`${kind} ${new Date(h.t).toISOString()} ${String(h.size).padStart(8)} B  ${h.r}`);
}
const missing = [...MINE].filter((f) => !hits.some((h) => h.r === f));
console.log(`\nscanned ${scanned} files (skipping ${[...SKIP_DIRS].join(', ')}); modified at/after ${new Date(cutoff).toISOString()}: ${hits.length} = MINE ${mine} + AUDIO ${audio} + OTHER ${other}`);
console.log(`my 16 files NOT in the modified set (expected none if the cutoff predates round 0): ${missing.length ? missing.join(', ') : 'none'}`);
