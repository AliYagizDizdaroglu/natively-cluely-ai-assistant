// Throwaway: which s50m control records have empty prose, and why (record fields only, no prompt text).
import fs from 'node:fs';
import { controlFile, REPS } from './cuebench-pairs.mjs';
for (const r of REPS) {
    const recs = JSON.parse(fs.readFileSync(controlFile(r), 'utf8'));
    for (const [id, x] of Object.entries(recs)) {
        if (x.transientError || x.spoken) continue;
        console.log(`r${r} ${id}: words ${x.words} ttft ${x.ttft} total ${x.total} finish ${x.finish} rawLen ${x.rawLen} thoughts ${x.thoughts} checks ${JSON.stringify(x.checks)}`);
        console.log(`   raw head: ${JSON.stringify(String(x.raw ?? '').slice(0, 160))}`);
    }
}
