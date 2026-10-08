// Re-check (read-only, no API): replays the stored `raw` of the two known empty-prose twin records through the
// BUILT filter chain, composed exactly as interview60.answers.mjs:188 composes it, once with the worktree's combined
// dist (Oct 1 00:03, the offers fix d83fdfe included) and once with MAIN's current dist (pre-cue; no stripCueBlock).
// Prints word counts, offer counts and cue counts only: never the text.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const DISTS = {
    'WT combined (Oct 1 00:03)': 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn',
    'MAIN current (pre-cue)': 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant',
};
const CASES = [
    ['2026-09-21T08-22-34-s50l', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json', 'S1Q06'],
    ['2026-09-22T08-22-50-s50m', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json', 'S2Q06'],
];
const words = (s) => (s.trim().match(/\S+/g) || []).length;
async function* chunks(text, size) { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); }

for (const [label, root] of Object.entries(DISTS)) {
    const req = createRequire(path.join(root, 'package.json'));
    const F = req(path.join(root, 'dist-electron/electron/llm/verbalStreamFilter.js'));
    const hasCue = typeof F.stripCueBlock === 'function';
    for (const [run, file, id] of CASES) {
        const rec = JSON.parse(fs.readFileSync(path.join(RUNS, run, file), 'utf8'))[id];
        for (const size of [100000, 40, 7]) {
            let spoken = '', offers = null, cues = [];
            const inner = hasCue ? F.stripCueBlock(chunks(rec.raw, size), (c) => { cues = c; }) : chunks(rec.raw, size);
            for await (const p of F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(inner)), (o) => { offers = o; }))) spoken += p;
            console.log(`${label.padEnd(26)} ${run.slice(-4)} ${id} chunk ${String(size).padStart(6)}: spoken words ${words(spoken)}, offers ${Array.isArray(offers) ? offers.length : offers}, cues ${Array.isArray(cues) ? cues.length : cues} (stored record: words ${rec.words}, rawLen ${rec.rawLen})`);
        }
    }
}
