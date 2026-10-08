// Merge review M3: the cue specs and plans exist only in the whole-turn worktree (docs/superpowers/ is git-ignored),
// yet the merged code cites them. Copy them (and the holdout roster spec, same situation) into MAIN's
// docs/superpowers/, byte-verified. Refuses to overwrite. Read-only on the worktree.
//   node copy-cue-specs-to-main.mjs
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
const FILES = [
    'specs/2026-09-20-cue-mode-design.md',
    'specs/2026-09-21-holdout-roster-design.md',
    'specs/2026-09-30-cue-early-close.md',
    'specs/2026-09-30-cue-mode-small-cues.md',
    'specs/2026-09-30-offers-before-answer.md',
    'plans/2026-09-21-cue-mode.md',
    'plans/2026-09-30-cue-early-close.md',
    'plans/2026-09-30-cue-mode-small-cues.md',
    'plans/2026-09-30-offers-before-answer.md',
];
let bad = 0;
for (const rel of FILES) {
    const from = path.join(WT, 'docs', 'superpowers', rel);
    const to = path.join(MAIN, 'docs', 'superpowers', rel);
    if (!fs.existsSync(from)) { console.log(`MISSING in the worktree: ${rel}`); bad++; continue; }
    if (!fs.existsSync(path.dirname(to))) { console.log(`REFUSED ${rel}: MAIN has no ${path.dirname(rel)} folder`); bad++; continue; }
    if (fs.existsSync(to)) { console.log(`REFUSED ${rel}: already in MAIN`); bad++; continue; }
}
if (bad) { console.log('nothing copied'); process.exit(2); }
for (const rel of FILES) {
    const from = path.join(WT, 'docs', 'superpowers', rel);
    const to = path.join(MAIN, 'docs', 'superpowers', rel);
    fs.copyFileSync(from, to);
    const same = Buffer.compare(fs.readFileSync(from), fs.readFileSync(to)) === 0;
    console.log(`${same ? 'copied' : 'COPY MISMATCH'} ${rel} (${fs.statSync(to).size} bytes)`);
    if (!same) bad++;
}
process.exit(bad ? 3 : 0);
