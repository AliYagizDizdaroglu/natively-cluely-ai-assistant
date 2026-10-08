/**
 * THROWAWAY (scratchpad). Is a weak answer a property of the QUESTION or of the ROLL?
 *
 * Across after7/after8/after9 the hour scored 46, 45, 46 acceptable of 52 — a flat mean
 * with an almost completely different set of failing questions each time (only M21 failed
 * in all three). That is the signature of a stochastic process, not a fixed wall. This
 * spike measures the per-question failure probability directly: answer the same question
 * N times and see how often it comes out badly.
 *
 * Same model, prompt, filter chain and temperature as interview60.answers.mjs, so the
 * answers are comparable with the flight arms. A second temperature arm tests whether
 * lowering sampling temperature narrows the spread.
 *
 *   node spike-repeat.mjs [--reps 5] [--temps 0.4,0.1]
 *
 * Writes spike-repeat.out.json: one record per (item, temp, rep) with the spoken answer,
 * ready to hand to a grader.
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
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const REPS = Number(opt('reps', '5'));
const TEMPS = String(opt('temps', '0.4,0.1')).split(',').map(Number);

// Every base question that was graded below acceptable at least once across after7/8/9,
// in the hour or in the 3.1 arm. If failure is a property of the question these repeat;
// if it is a property of the roll they mostly pass.
const SUSPECT = ['M21', 'M14', 'H09', 'H02', 'H06', 'H07', 'W10', 'M27', 'M08', 'H11', 'H08', 'H10', 'M03', 'M25', 'M17', 'H03'];
// Never weak in any flight — the control. If these also fail ~1 in 6, the failure rate is
// a property of the whole question set, not of the suspects.
const CONTROL = ['W01', 'W05', 'M01', 'M09', 'H01', 'H12'];

const pick = (ids) => ids.map((id) => INTERVIEW.find((x) => x.id === id)).filter(Boolean);
const ITEMS = [...pick(SUSPECT).map((i) => ({ ...i, group: 'suspect' })), ...pick(CONTROL).map((i) => ({ ...i, group: 'control' }))];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

async function answer(question, temperature) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: `The interviewer just asked: "${question}"\n\nWhat should I say?` }] }],
        systemInstruction: { parts: [{ text: P.VERBAL_WHAT_TO_ANSWER_PROMPT }] },
        generationConfig: { temperature, maxOutputTokens: 65536 },
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
    spoken = spoken.trim();
    return { spoken, words: words(spoken), finish };
}

const OUT = path.join(HERE, 'spike-repeat.out.json');
const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const total = ITEMS.length * TEMPS.length * REPS;
console.log(`repeat spike: ${ITEMS.length} questions x ${TEMPS.length} temps x ${REPS} reps = ${total} answers on ${MODEL}\n`);

let n = 0;
for (const item of ITEMS) {
    for (const temp of TEMPS) {
        for (let r = 1; r <= REPS; r++) {
            const key = `${item.id}|t${temp}|r${r}`;
            n++;
            if (store[key]?.spoken) continue;
            let res, err;
            for (let a = 0; a < 3; a++) {
                try { res = await answer(item.q, temp); if (!res.transient) break; err = res.transient; await sleep(6000 * (a + 1)); }
                catch (e) { err = e.message; await sleep(4000 * (a + 1)); }
            }
            if (!res || res.transient) { store[key] = { id: item.id, group: item.group, temp, rep: r, error: err ?? 'no result' }; }
            else store[key] = { id: item.id, group: item.group, temp, rep: r, q: item.q, spoken: res.spoken, words: res.words, finish: res.finish };
            fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
            if (n % 10 === 0 || r === REPS) console.log(`  ${String(n).padStart(3)}/${total}  ${item.id} t${temp} r${r}  ${store[key].error ? 'ERROR ' + store[key].error : store[key].words + 'w'}`);
            await sleep(700);
        }
    }
}
const done = Object.values(store).filter((v) => v.spoken).length;
console.log(`\nwrote ${done} answers (${Object.values(store).filter((v) => v.error).length} errors) -> ${OUT}`);
