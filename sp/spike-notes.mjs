/**
 * THROWAWAY (scratchpad). Does grounding the answer in prep notes fix the recurring
 * failures, and does it damage the questions the notes do not cover?
 *
 * The app injects the whole notes box, not a per-question snippet, so this does the same:
 * every question in the spike gets the identical notes block prepended to the system
 * prompt. Four of the eight questions are covered by the notes (M14, M21, H09, M08 — the
 * ones that fail across flights); four are not (M25, H06, H07, H02) and act as the
 * control for distraction, which matters because the after9 hour showed a concept from
 * the injected context bleeding into two unrelated answers.
 *
 * Compare against spike-repeat.out.json, which answered the same questions with the same
 * model, temperature and filter chain and no notes.
 *
 *   node spike-notes.mjs [--reps 5]
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const GOLDEN = path.join(PROJ, 'electron/test/golden');
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const require = createRequire(path.join(PROJ, 'package.json'));
const P = require(path.join(PROJ, 'dist-electron/electron/llm/prompts.js'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } =
    require(path.join(PROJ, 'dist-electron/electron/llm/verbalStreamFilter.js'));
const { INTERVIEW } = await import(pathToFileURL(path.join(GOLDEN, 'interview60.questions.mjs')).href);

const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.1-flash-lite';
const TEMP = 0.4;
const argv = process.argv.slice(2);
const REPS = Number((argv.indexOf('--reps') >= 0 ? argv[argv.indexOf('--reps') + 1] : '5'));

// The drafted prep notes, read in process. Kept out of the log: only its length is printed.
const NOTES = fs.readFileSync(path.join(HERE, 'prep-notes-draft.md'), 'utf8')
    .split('\n').filter((l) => !l.startsWith('# ') && !l.startsWith('Paste-ready')).join('\n').trim();

const COVERED = ['M14', 'M21', 'H09', 'M08'];
const CONTROL = ['M25', 'H06', 'H07', 'H02'];
const pick = (ids, g) => ids.map((id) => ({ ...INTERVIEW.find((x) => x.id === id), group: g }));
const ITEMS = [...pick(COVERED, 'covered'), ...pick(CONTROL, 'control')];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

async function answer(question) {
    // Mirrors how the app frames injected knowledge: the candidate's own prepared notes,
    // ahead of the standard verbal instructions.
    const system = `The candidate has prepared these notes. When a note is relevant to the question, ground your answer in it and use its specifics. When no note is relevant, answer normally and do not mention the notes.\n\n<notes>\n${NOTES}\n</notes>\n\n${P.VERBAL_WHAT_TO_ANSWER_PROMPT}`;
    const body = {
        contents: [{ role: 'user', parts: [{ text: `The interviewer just asked: "${question}"\n\nWhat should I say?` }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature: TEMP, maxOutputTokens: 65536 },
    };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:streamGenerateContent?alt=sse`,
        { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = '', raw = '', finish = null;
    for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const cand = j.candidates?.[0];
            const piece = (cand?.content?.parts || []).map((p) => p.text || '').join('');
            if (piece) raw += piece;
            if (cand?.finishReason) finish = cand.finishReason;
        }
    }
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen()), (o) => { offers = o; }))) spoken += p;
    return { spoken: spoken.trim(), words: words(spoken.trim()), finish };
}

const OUT = path.join(HERE, 'spike-notes.out.json');
const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
console.log(`notes spike: ${ITEMS.length} questions x ${REPS} reps = ${ITEMS.length * REPS} answers; notes block ${NOTES.length} chars (~${Math.round(NOTES.length / 4)} tokens)\n`);
let n = 0;
for (const item of ITEMS) {
    for (let r = 1; r <= REPS; r++) {
        const key = `${item.id}|r${r}`; n++;
        if (store[key]?.spoken) continue;
        let res, err;
        for (let a = 0; a < 3; a++) {
            try { res = await answer(item.q); if (!res.transient) break; err = res.transient; await sleep(6000 * (a + 1)); }
            catch (e) { err = e.message; await sleep(4000 * (a + 1)); }
        }
        store[key] = (!res || res.transient)
            ? { id: item.id, group: item.group, rep: r, error: err ?? 'no result' }
            : { id: item.id, group: item.group, rep: r, q: item.q, spoken: res.spoken, words: res.words, finish: res.finish };
        fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
        console.log(`  ${String(n).padStart(3)}/${ITEMS.length * REPS}  ${item.id} (${item.group}) r${r}  ${store[key].error ? 'ERROR' : store[key].words + 'w'}`);
        await sleep(700);
    }
}
console.log(`\nwrote ${Object.values(store).filter((v) => v.spoken).length} answers -> ${OUT}`);
