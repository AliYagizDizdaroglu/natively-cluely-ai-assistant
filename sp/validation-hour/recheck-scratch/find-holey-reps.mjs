// Re-check: find real answers files with more than 3 transientError records (a known case for N6's INCOMPLETE).
// Prints folder, file and counts only.
import fs from 'node:fs';
import path from 'node:path';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
for (const d of fs.readdirSync(RUNS).sort()) {
    const dir = path.join(RUNS, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /^interview60\.answers\..+\.json$/.test(x) && !/stale/.test(x))) {
        let s; try { s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
        const v = Object.values(s).filter((x) => x && typeof x === 'object' && x.id);
        const holes = v.filter((x) => x.transientError).length;
        if (holes > 3) console.log(`${d}  ${f}  holes ${holes} of ${v.length}`);
    }
}
