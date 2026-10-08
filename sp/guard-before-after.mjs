// Throwaway: before/after of the stream cut over the s50c bare-arm answers.
// BEFORE = the main checkout's shipped dist (spokenWordBudget, question-scaled cut).
// AFTER  = the worktree's freshly built dist (SPOKEN_WORD_GUARD, 200-word clamp).
// Both run the same shipped cutAtWordBudget over the same recorded answers, chunked
// 9 chars at a time like the wiring test. Calibration: BEFORE must reproduce the
// 7/20 cut count from budget-cut-spike.mjs on the 3.1-lite arm.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = path.join(MAIN, '.claude/worktrees/whole-turn');
const RUN = path.join(MAIN, 'electron/test/golden/interview60.runs/2026-09-12T08-22-49-s50c');
const req = createRequire(path.join(MAIN, 'package.json'));
const before = req(path.join(MAIN, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const after = req(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));
if (typeof before.spokenWordBudget !== 'function') throw new Error('BEFORE dist has no spokenWordBudget — main already rebuilt?');
if (!after.SPOKEN_WORD_GUARD) throw new Error('AFTER dist has no SPOKEN_WORD_GUARD — worktree not built?');

const words = (s) => (s.trim().match(/\S+/g) || []).length;
async function cutWith(mod, opts, text) {
    let out = '', r = null;
    async function* gen() { for (let i = 0; i < text.length; i += 9) yield text.slice(i, i + 9); }
    for await (const p of mod.cutAtWordBudget(gen(), { ...opts, onDone: (x) => { r = x; } })) out += p;
    return { out, cut: !!r?.cut, words: words(out) };
}

const ARMS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'openai_gpt-oss-120b', 'qwen_qwen3.8-27b'];
for (const arm of ARMS) {
    const f = path.join(RUN, `interview60.judge.${arm}.json`);
    if (!fs.existsSync(f)) { console.log(`${arm}: no judge file`); continue; }
    const items = JSON.parse(fs.readFileSync(f, 'utf8')).items;
    const ids = Object.keys(items).filter((k) => /^S[12]Q\d\d$/.test(k)).sort();
    let cutBefore = 0, cutAfter = 0, lostBefore = 0, maxWords = 0;
    const rows = [];
    for (const id of ids) {
        const q = items[id].question, a = items[id].answer;
        const b = await cutWith(before, before.spokenWordBudget(words(q)), a);
        const g = await cutWith(after, after.SPOKEN_WORD_GUARD, a);
        if (b.cut) { cutBefore++; lostBefore += words(a) - b.words; }
        if (g.cut) cutAfter++;
        maxWords = Math.max(maxWords, words(a));
        if (b.cut || g.cut) rows.push(`  ${id}  arm ${words(a)}w  before -> ${b.words}w ${b.cut ? 'CUT' : 'kept'}   after -> ${g.words}w ${g.cut ? 'CUT' : 'kept'}   verdict ${items[id].verdict}`);
    }
    console.log(`${arm}: ${ids.length} answers, max ${maxWords}w — BEFORE cut ${cutBefore}/${ids.length} (${lostBefore} words dropped), AFTER cut ${cutAfter}/${ids.length}`);
    for (const r of rows) console.log(r);
}
