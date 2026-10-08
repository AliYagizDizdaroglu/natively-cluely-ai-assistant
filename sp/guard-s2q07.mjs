// Throwaway: verify the guard fix against the ORIGINAL SYMPTOM, not a synthetic case.
// s50i answered S2Q07 offline in 218 words; the live app cut it at exactly 200, mid-sentence,
// and the grader marked it weak for the ending it never reached. Replay that exact text through
// the guard as it was (floor 200 = the shipped behaviour that flight) and as it is now (floor 120),
// streamed in small chunks the way the provider delivers it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = path.join(PROJ, '.claude/worktrees/whole-turn');
const require_ = createRequire(path.join(WT, 'package.json'));
const { cutAtWordBudget, SPOKEN_WORD_GUARD } = require_(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));

const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');
const off = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_captured-low.json'), 'utf8'));
const text = off.S2Q07.spoken;
const words = (s) => (String(s).match(/\S+/g) ?? []).length;

async function run(opts) {
    const src = (async function* () { for (let i = 0; i < text.length; i += 12) yield text.slice(i, i + 12); })();
    let done = null, out = '';
    for await (const c of cutAtWordBudget(src, { ...opts, onDone: (r) => { done = r; } })) out += c;
    return { out, done };
}
const tail = (s) => '…' + String(s).replace(/\s+/g, ' ').slice(-95);

console.log(`S2Q07, the answer the app truncated in flight s50i — ${words(text)} words as the model wrote it\n`);
for (const [label, opts] of [['BEFORE  floor 200 (what flew)', { limit: 200, floor: 200, ceiling: 200 }],
                             ['AFTER   floor 120 (shipped now)', SPOKEN_WORD_GUARD]]) {
    const { out, done } = await run(opts);
    const ends = /[.!?]["')\]]?$/.test(out.trimEnd());
    console.log(`${label}`);
    console.log(`   words ${done.words}  cut ${done.cut}  ends on a finished sentence: ${ends ? 'YES' : 'NO'}`);
    console.log(`   ${tail(out)}\n`);
}
