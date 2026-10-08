// Builder B scratch (read-only, no API): what do the WT's and MAIN's dists look like to the adapter?
// Prints names, limits, sha prefixes and mtimes only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const MAIN = path.join(os.homedir(), 'OneDrive', 'Masaüstü', 'natively-cluely-ai-assistant');
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
for (const [label, root] of [['WT', WT], ['MAIN', MAIN]]) {
    const ff = path.join(root, 'dist-electron/electron/llm/verbalStreamFilter.js');
    const pf = path.join(root, 'dist-electron/electron/llm/prompts.js');
    console.log(`${label}: root exists ${fs.existsSync(root)}; filter exists ${fs.existsSync(ff)} mtime ${fs.existsSync(ff) ? fs.statSync(ff).mtime.toISOString() : '-'}; prompts exists ${fs.existsSync(pf)}`);
    if (!fs.existsSync(ff)) continue;
    console.log(`  filter sha256/16 ${crypto.createHash('sha256').update(fs.readFileSync(ff)).digest('hex').slice(0, 16)}`);
    const req = createRequire(path.join(root, 'package.json'));
    const F = req(ff);
    console.log(`  filter exports: ${['stripCueBlock', 'filterCodeFences', 'filterVerbalLines', 'stripSuggestionBlock', 'stripSpokenNotation', 'trimCues'].map((n) => `${n}:${typeof F[n]}`).join(' ')}`);
    const P = req(pf);
    console.log(`  prompts: CUE_MAX_LINES ${P.CUE_MAX_LINES} CUE_MAX_WORDS ${P.CUE_MAX_WORDS} CUE_RULE ${typeof P.CUE_RULE === 'string' ? 'sha256/12 ' + crypto.createHash('sha256').update(P.CUE_RULE).digest('hex').slice(0, 12) : 'absent'}`);
}
