// THROWAWAY: run scenario 1's first 7 mains through both answer arms, using the REAL
// shipped prompt and filter chain (interview60.answers.mjs, which imports them from
// dist-electron). Risk-weighted on purpose: arithmetic (S1Q02), spoken coding (S1Q04),
// heavy coding (S1Q05), SQL (S1Q06) and heavy design (S1Q07) are the question types
// interview60 never contained, so nothing measured before transfers to them.
//
// The answers pass derives its output path from the model name and would write over the
// user's existing answers files, so those are moved aside and restored in a finally —
// the restore must happen even if a pass throws or the quota wall is hit.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = PROJ + '/electron/test/golden/';
const SCRATCH = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';

const ARMS = [
    { model: 'gemini-3.1-flash-lite', out: G + 'interview60.answers.json' },
    { model: 'gemini-3.5-flash-lite', out: G + 'interview60.answers.gemini-3.5-flash-lite.json' },
];

const backups = [];
for (const a of ARMS) {
    if (fs.existsSync(a.out)) {
        const b = path.join(SCRATCH, 'BACKUP-' + path.basename(a.out));
        fs.copyFileSync(a.out, b);
        backups.push([a.out, b]);
        fs.rmSync(a.out);
    }
}
console.log(`moved aside ${backups.length} existing answers file(s); they are restored at the end\n`);

try {
    for (const a of ARMS) {
        console.log(`-- ${a.model} --`);
        try {
            execFileSync(process.execPath, [G + 'interview60.answers.mjs', '--model', a.model, '--limit', '7'], {
                cwd: PROJ,
                env: { ...process.env, NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1' },
                stdio: 'inherit',
                timeout: 15 * 60 * 1000,
            });
        } catch (e) { console.log(`  pass exited: ${e.status ?? e.message}`); }
        if (fs.existsSync(a.out)) {
            fs.copyFileSync(a.out, path.join(SCRATCH, `probe-${a.model}.json`));
            fs.rmSync(a.out);
        }
        console.log('');
    }
} finally {
    for (const [orig, b] of backups) fs.copyFileSync(b, orig);
    console.log(`restored ${backups.length} answers file(s)`);
}
