// Runs the hour's read-only readers on h40d (§9 steps 2-3) and saves each one's output beside the others.
// Every reader prints ids, counts, timestamps and log-line kinds only (never answers or prompts).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const VH = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(VH);
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const RUN = `${RUNS}/2026-10-02T11-39-41-h40d`;
const jobs = [
    ['h40d-hedge-stats.out.txt', [`${SP}/h40c-hedge-stats.mjs`, RUN], undefined],
    ['h40d-clocks.list.out.txt', [`${VH}/h40d-clocks.mjs`, RUN, '--list'], undefined],
    ['h40d-hold-read.out.txt', [`${SP}/cue-group/hold-read.mjs`, RUN, '--list'], undefined],
    ['h40d-check-cues.out.txt', [`${SP}/check-smoke-cues.mjs`, 'h40d', '--runs', RUNS], undefined],
    ['h40d-smoke-facts.out.txt', [`${SP}/cue-group/smoke-facts.mjs`, RUN], undefined],
    ['h40d-knowledge-lines.out.txt', [`${VH}/h40d-knowledge-lines.mjs`, '2026-10-02T11-39-41-h40d'], RUNS],
];
for (const [out, args, cwd] of jobs) {
    const r = spawnSync(process.execPath, args, { cwd: cwd ?? VH, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(VH, out), `${r.stdout ?? ''}${r.stderr ?? ''}\n[exit ${r.status}]\n`);
    console.log(`${out}: exit ${r.status}, ${(r.stdout ?? '').split('\n').length} lines`);
}
