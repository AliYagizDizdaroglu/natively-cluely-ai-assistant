// Throwaway: sweep the guard change over every real answer s50i produced — the 40 live ones and
// the 39 from the offline twin — before (floor 200) and after (floor 120). What must hold: no
// answer that was uncut becomes cut, no answer loses words it used to keep unless it was being
// truncated, and nothing ends mid-sentence any more unless it has no sentence boundary at all.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = path.join(PROJ, '.claude/worktrees/whole-turn');
const require_ = createRequire(path.join(WT, 'package.json'));
const { cutAtWordBudget, SPOKEN_WORD_GUARD } = require_(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');

const sources = {
    'offline twin (39)': Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_captured-low.json'), 'utf8'))).filter(([, v]) => v?.spoken).map(([k, v]) => [k, v.spoken])),
    'live hour (40)': Object.fromEntries(JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.pairs.json'), 'utf8')).items.map((p) => [p.id, p.answer ?? ''])),
};
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const endsClean = (s) => /[.!?]["')\]]?$/.test(String(s).trimEnd());
const BEFORE = { limit: 200, floor: 200, ceiling: 200 };

async function guard(text, opts) {
    const src = (async function* () { for (let i = 0; i < text.length; i += 12) yield text.slice(i, i + 12); })();
    let done = null, out = '';
    for await (const c of cutAtWordBudget(src, { ...opts, onDone: (r) => { done = r; } })) out += c;
    return { out, done };
}

for (const [label, store] of Object.entries(sources)) {
    let cutBefore = 0, cutAfter = 0, danglingBefore = 0, danglingAfter = 0, changed = [];
    for (const [id, text] of Object.entries(store)) {
        if (!text) continue;
        const b = await guard(text, BEFORE), a = await guard(text, SPOKEN_WORD_GUARD);
        if (b.done.cut) cutBefore++;
        if (a.done.cut) cutAfter++;
        if (b.done.cut && !endsClean(b.out)) danglingBefore++;
        if (a.done.cut && !endsClean(a.out)) danglingAfter++;
        if (b.out !== a.out) changed.push(`${id}: ${b.done.words}w${endsClean(b.out) ? '' : ' (dangling)'} -> ${a.done.words}w${endsClean(a.out) ? '' : ' (dangling)'}`);
    }
    console.log(`${label}`);
    console.log(`   answers cut:      before ${cutBefore}   after ${cutAfter}`);
    console.log(`   cut mid-sentence: before ${danglingBefore}   after ${danglingAfter}`);
    console.log(`   answers whose text changed at all: ${changed.length}${changed.length ? '\n     ' + changed.join('\n     ') : ''}\n`);
}
