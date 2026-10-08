// Calibration of replay-empties.mjs (rule 8): the same replay on every NON-empty record of the same two files must
// reproduce each record's stored `words` (the chain that produced them was an older dist, so a few may differ;
// most must match). Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const F = createRequire(path.join(ROOT, 'package.json'))(path.join(ROOT, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const words = (s) => (s.trim().match(/\S+/g) || []).length;
async function* one(text) { yield text; }
for (const [run, file] of [['2026-09-21T08-22-34-s50l', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json'], ['2026-09-22T08-22-50-s50m', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json']]) {
    const store = JSON.parse(fs.readFileSync(path.join(RUNS, run, file), 'utf8'));
    let n = 0, same = 0, zeroNow = 0;
    const diffs = [];
    for (const v of Object.values(store)) {
        if (!v || !v.id || v.transientError || !v.spoken || typeof v.raw !== 'string') continue;
        let spoken = '';
        for await (const p of F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(one(v.raw), () => {}))), () => {}))) spoken += p;
        n++;
        const w = words(spoken);
        if (w === v.words) same++; else diffs.push(`${v.id} ${v.words}->${w}`);
        if (w === 0) zeroNow++;
    }
    console.log(`${run.slice(-4)} ${file.slice(-12)}: non-empty records ${n}, replay words == stored words ${same}, differ ${diffs.length} [${diffs.slice(0, 8).join(', ')}], replay empties ${zeroNow}`);
}
