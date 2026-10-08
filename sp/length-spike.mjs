/**
 * THROWAWAY SPIKE — does prompt wording get the answer under the grader's delivery cliff?
 *
 * Instrument: the s50e captured prompts (the app's own systemInstruction + user turn, byte
 * for byte) replayed against the app's own model at the app's own temperature, with ONE
 * substitution in the system text: the length rule. Same filter chain, same word count as
 * interview60.answers.mjs, so the numbers are comparable to the flight's own.
 *
 * The control arm is the calibration: replayed verbatim it must reproduce s50e's in-app
 * word distribution (p50 ~109, max 166, 4 of 19 over 154). If it does not, the instrument is
 * measuring something other than the app's call and no variant result means anything.
 *
 *   node length-spike.mjs [--arms A,B,C,D] [--reps 1]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-14T08-22-28-s50e');
const OUT = path.dirname(new URL(import.meta.url).pathname.slice(1));
const require = createRequire(path.join(PROJ, 'package.json'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } =
    require(path.join(PROJ, 'dist-electron/electron/llm/verbalStreamFilter.js'));

// In-process only, never printed.
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.1-flash-lite';

const RULE_A = 'Keep it to AT MOST 60 words — roughly 30 seconds. Say the single most important thing completely and correctly; do not try to cover every angle. Never sacrifice the core technical claim to save words.';
const RULE_B = 'Length follows the number of parts: roughly 20 to 30 words per part, never more than 150 words in total. A one-part question stays under the usual limit.';

// Each arm is a function system -> system. Every one of them MUST change the text; a
// substitution that silently finds nothing would run the control four times and read as
// "wording does nothing".
const ARMS = {
    A: { note: 'control — captured system verbatim', apply: (s) => s },
    B: {
        note: 'lower the multi-part budget: 150 -> 120 words, 20-30 -> 15-25 per part',
        apply: (s) => s.replace(RULE_B, 'Length follows the number of parts: roughly 15 to 25 words per part, never more than 120 words in total. A one-part question stays under the usual limit.'),
    },
    C: {
        note: 'hard ceiling appended as the last line of the system prompt; every existing rule untouched',
        apply: (s) => `${s}\n\n[HARD CEILING — THIS OVERRIDES EVERY LENGTH RULE ABOVE]\nYour entire spoken answer must be 130 words or fewer, whatever the question asks for. If covering every part would take more, say each part in fewer words rather than going over. Going over 130 words is a failure even when the content is right.`,
    },
    D: {
        note: 'time-framed instead of word-counted: both caps restated as seconds of speech',
        apply: (s) => s
            .replace(RULE_A, 'Keep it to AT MOST 25 seconds of speech — about 60 words. Say the single most important thing completely and correctly; do not try to cover every angle. Never sacrifice the core technical claim to save words.')
            .replace(RULE_B, 'Length follows the number of parts, but the whole answer must still be speakable in 45 seconds — about 115 words, and never longer. Give each part one short spoken sentence; with four or five parts that means about 20 words each. A one-part question stays under the usual limit.'),
    },
};

const ai = process.argv.indexOf('--arms');
const WANT = (ai >= 0 && process.argv[ai + 1] ? process.argv[ai + 1] : 'A,B,C,D').split(',');
const ri = process.argv.indexOf('--reps');
const REPS = ri >= 0 && process.argv[ri + 1] ? Number(process.argv[ri + 1]) : 1;

const PROMPTS = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.prompts.json'), 'utf8'));
const oi = process.argv.indexOf('--only');
const ONLY = oi >= 0 && process.argv[oi + 1] ? new Set(process.argv[oi + 1].split(',')) : null;
const IDS = Object.keys(PROMPTS).filter((id) => !id.endsWith('F')).filter((id) => !ONLY || ONLY.has(id)).sort();
const words = (s) => (s.trim().match(/\S+/g) || []).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(system, user) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536 },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:streamGenerateContent?alt=sse`;
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', finish = null;
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const cand = j.candidates?.[0];
            raw += (cand?.content?.parts || []).map((p) => p.text || '').join('');
            if (cand?.finishReason) finish = cand.finishReason;
        }
    }
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen()), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, words: words(spoken), finish, offers };
}

const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };

const results = {};
for (const arm of WANT) {
    const spec = ARMS[arm];
    if (!spec) throw new Error(`unknown arm ${arm}`);
    console.log(`\n=== ARM ${arm}: ${spec.note}`);
    const rows = [];
    for (let rep = 0; rep < REPS; rep++) {
        for (const id of IDS) {
            const p = PROMPTS[id];
            const system = spec.apply(p.system);
            if (arm !== 'A' && system === p.system) throw new Error(`arm ${arm} changed nothing on ${id} — the anchor text moved`);
            let r = null;
            for (let attempt = 0; attempt < 4 && !r?.spoken; attempt++) {
                if (attempt) await sleep(6000 * attempt);
                r = await ask(system, p.user);
            }
            if (!r?.spoken) { console.log(`  ${id} rep${rep} ${r?.transient ?? 'empty'}`); continue; }
            rows.push({ id, rep, words: r.words, finish: r.finish, spoken: r.spoken });
            console.log(`  ${id} rep${rep} ${String(r.words).padStart(3)}w ${r.words > 154 ? 'OVER' : ''}`);
            await sleep(700);
        }
    }
    const ws = rows.map((r) => r.words);
    results[arm] = { note: spec.note, n: rows.length, p50: pct(ws, .5), p90: pct(ws, .9), max: Math.max(...ws), over154: ws.filter((w) => w > 154).length, over130: ws.filter((w) => w > 130).length, rows };
    const s = results[arm];
    console.log(`  -> n=${s.n}  p50 ${s.p50}  p90 ${s.p90}  max ${s.max}  over154 ${s.over154}/${s.n}`);
}

fs.writeFileSync(path.join(OUT, 'length-spike.json'), JSON.stringify(results, null, 1));
console.log('\nARM  n   p50  p90  max  >154  >130   note');
for (const [arm, s] of Object.entries(results)) {
    console.log(`${arm}    ${String(s.n).padStart(2)}  ${String(s.p50).padStart(3)}  ${String(s.p90).padStart(3)}  ${String(s.max).padStart(3)}  ${String(s.over154).padStart(4)}  ${String(s.over130).padStart(4)}   ${s.note}`);
}
console.log('\nwritten: length-spike.json');
