// Which stage of the built chain empties the two known empty-prose twin records? Word counts per stage only.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const F = createRequire(path.join(ROOT, 'package.json'))(path.join(ROOT, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const words = (s) => (s.trim().match(/\S+/g) || []).length;
async function* one(text) { yield text; }
async function drain(gen) { let s = ''; for await (const p of gen) s += p; return s; }
for (const [run, file, id] of [['2026-09-21T08-22-34-s50l', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json', 'S1Q06'], ['2026-09-22T08-22-50-s50m', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json', 'S2Q06']]) {
    const raw = JSON.parse(fs.readFileSync(path.join(RUNS, run, file), 'utf8'))[id].raw;
    const s0 = await drain(F.stripCueBlock(one(raw), () => {}));
    const s1 = await drain(F.filterCodeFences(one(s0)));
    const s2 = await drain(F.filterVerbalLines(one(s1)));
    const s3 = await drain(F.stripSuggestionBlock(one(s2), () => {}));
    const s4 = await drain(F.stripSpokenNotation(one(s3)));
    const fences = (raw.match(/```/g) || []).length;
    console.log(`${run.slice(-4)} ${id}: raw words ${words(raw)}, fence markers ${fences}; after stripCueBlock ${words(s0)}, filterCodeFences ${words(s1)}, filterVerbalLines ${words(s2)}, stripSuggestionBlock ${words(s3)}, stripSpokenNotation ${words(s4)}`);
}
