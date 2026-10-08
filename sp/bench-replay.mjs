/**
 * THROWAWAY BENCH — replay the app's exact captured calls (s50e, 39 questions: 19 mains + 20
 * follow-ups) against the app's own model at the app's own temperature, N reps per arm, with
 * ONE change per arm: a block appended to the END of the system instruction. Same filter
 * chain and word count as the flight harness.
 *
 * Records per answer: spoken text, words, ttft (first token of anything), ttfs (first token of
 * SPOKEN text — differs from ttft only on the scaffold arm, where a stripped __PARTS__ block
 * precedes the answer), total, finish reason, raw.
 *
 *   node bench-replay.mjs --arm control|coverage|scaffold [--reps 3] [--only S1Q02,...]
 *
 * Resumable: an id already present in the rep's output file is skipped, so a quota stop
 * (429) can be picked up after the 07:00 UTC reset without re-spending answers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-14T08-22-28-s50e');
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const OUT = path.join(HERE, 'bench');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(PROJ, 'package.json'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } =
    require(path.join(PROJ, 'dist-electron/electron/llm/verbalStreamFilter.js'));

// In-process only, never printed.
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.1-flash-lite';

// Bare bytes = what interview60.answers.mjs sends for its bare arm: the shipped verbal prompt
// as the system instruction and the scripted question alone in the user turn. No prior turns,
// no knowledge block, no pinned-question trailer. Mains only — a standalone follow-up has no
// parent to follow up on (the answers script skips them for the same reason).
const P = require(path.join(PROJ, 'dist-electron/electron/llm/prompts.js'));
const { SCENARIO50 } = await import(`file:///${path.join(PROJ, 'electron/test/golden/scenario50.questions.mjs').replace(/\\/g, '/')}`);
const ROSTER = new Map(SCENARIO50.map((i) => [i.id, i]));
const bareBytes = (id) => {
    const item = ROSTER.get(id);
    if (!item) throw new Error(`roster has no ${id}`);
    return { system: P.VERBAL_WHAT_TO_ANSWER_PROMPT, user: `The interviewer just asked: "${item.q}"\n\nWhat should I say?` };
};
const think = (level) => ({ thinkingConfig: { thinkingLevel: level } });

const COVERAGE = `

[BEFORE YOU ANSWER — THIS OVERRIDES EVERYTHING ABOVE]
Count the parts the interviewer named: every item in a list, every "and", every "how would you", every sub-question. Your answer must address EVERY one of them, in the order asked, and for each part say the specific thing that part asks for — the mechanism, the named service, the number, the filter, the trade-off, the design. A part that asks you to design something gets the design, not a mention of it. Leaving a named part out, or covering it with a generic sentence, is the failure that costs the most — more than being a little long.`;

const SCAFFOLD = `

[BEFORE YOU ANSWER — THIS OVERRIDES EVERYTHING ABOVE]
First, on its own lines, list the parts the interviewer's question names, in this exact form and nothing else:
__PARTS__
1| <the first thing asked, 3-8 words>
2| <the next, if any>
__ANSWER__
Then, after the __ANSWER__ line, give the spoken answer. It must address every listed part, in order, and for each part say the specific thing that part asks for — the mechanism, the named service, the number, the filter, the trade-off, the design. The __PARTS__ block is never spoken; only the answer after __ANSWER__ is. Everything else about the answer's form stays as instructed above.`;

const ARMS = {
    control: { apply: (s) => s, scaffold: false },
    coverage: { apply: (s) => s + COVERAGE, scaffold: false },
    scaffold: { apply: (s) => s + SCAFFOLD, scaffold: true },
    // Same prompt, one generation-config change: thinking_level LOW (the app sends no
    // thinkingConfig, which the Gemini 3 docs say means MINIMAL on 3.1 Flash-Lite).
    'think-low': { apply: (s) => s, scaffold: false, config: think('LOW') },
    // MEDIUM is not honoured by 3.1 Flash-Lite (s50h: 38 of 43 requests at zero thought
    // tokens; three probes the same) — kept only so an old rep file still has an arm name.
    'think-medium': { apply: (s) => s, scaffold: false, config: think('MEDIUM') },
    'think-high': { apply: (s) => s, scaffold: false, config: think('HIGH') },
    // Bare arms: different BYTES, not a different prompt suffix — they measure the app's own
    // context (prior turns, knowledge, trailer) against the bare verbal prompt, paired on the
    // same question. bytes(id) replaces both system and user; mainsOnly drops the follow-ups.
    bare: { bytes: bareBytes, scaffold: false, mainsOnly: true },
    'bare-low': { bytes: bareBytes, scaffold: false, mainsOnly: true, config: think('LOW') },
    'bare-high': { bytes: bareBytes, scaffold: false, mainsOnly: true, config: think('HIGH') },
    // A different MODEL on the app's captured bytes: Gemma 4 26B exactly as the app's Gemma
    // branch sends it (LLMHelper gemmaConfig: MINIMAL, temperature 0.3, 4096-token cap). The
    // 2026-09-17 probe (n=1 per cell) had it right on S1Q02 and wrong on S1Q06 at MINIMAL,
    // with first token 1.7–8 s; Gemma rejects LOW/MEDIUM (400) and thinks by default at
    // 44–111 s to the first token, so MINIMAL is the only live-shaped setting.
    'gemma26-min': { apply: (s) => s, scaffold: false, model: 'gemma-4-26b-a4b-it', config: { ...think('MINIMAL'), temperature: 0.3, maxOutputTokens: 4096 } },
    // Same model on the bare bytes (19 mains): paired with gemma26-min it is the app tax on
    // Gemma; paired with bare it is model against model with no app context in the way.
    'gemma26-min-bare': { bytes: bareBytes, scaffold: false, mainsOnly: true, model: 'gemma-4-26b-a4b-it', config: { ...think('MINIMAL'), temperature: 0.3, maxOutputTokens: 4096 } },
    // 2026-09-18: the stall-fallback model at a level it actually honours. Probes (n=2 per
    // cell) showed 3.5-lite ignores LOW (thoughts n/a 3 of 4) and honours MEDIUM and HIGH; only
    // HIGH derived the S1Q02 arithmetic. App bytes, all 39 ids, paired against control and think-low.
    'think35-medium': { apply: (s) => s, scaffold: false, model: 'gemini-3.5-flash-lite', config: think('MEDIUM') },
    'think35-high': { apply: (s) => s, scaffold: false, model: 'gemini-3.5-flash-lite', config: think('HIGH') },
};
// --dry: build the first id's bytes and print their shape, never calling the model.
const DRY = process.argv.includes('--dry');

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const ARM = arg('--arm', null);
if (!ARMS[ARM]) { console.error(`--arm must be one of ${Object.keys(ARMS).join(', ')}`); process.exit(2); }
const REPS = Number(arg('--reps', '3'));
const ONLY = arg('--only', null)?.split(',');

const PROMPTS = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.prompts.json'), 'utf8'));
const IDS = Object.keys(PROMPTS).filter((id) => !ONLY || ONLY.includes(id)).filter((id) => !ARMS[ARM].mainsOnly || !id.endsWith('F')).sort();
const words = (s) => (s.trim().match(/\S+/g) || []).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The scaffold's preamble is stripped here, in the bench; if the arm wins, the app's filter
// chain grows the same strip. Everything after the __ANSWER__ line is the spoken candidate.
const ANSWER_MARK = /__ANSWER__[ \t]*\r?\n?/;
function splitScaffold(raw) {
    const m = raw.match(ANSWER_MARK);
    if (!m) return { parts: null, body: raw, marked: false };
    return { parts: raw.slice(0, m.index).trim(), body: raw.slice(m.index + m[0].length), marked: true };
}

async function ask(system, user, scaffold, config = {}, model = MODEL) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, ...config },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`;
    const t0 = Date.now();
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    // thoughts: usageMetadata.thoughtsTokenCount off the last chunk, absent when the model did
    // not think. Recorded per answer since 2026-09-18, because the think35-* arms could not prove
    // from their own rep files that the level rode on the request (it took a separate probe).
    let buf = '', raw = '', ttft = null, ttfs = null, finish = null, thoughts = null;
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
            const piece = (cand?.content?.parts || []).map((p) => p.text || '').join('');
            if (piece) {
                if (ttft === null) ttft = Date.now() - t0;
                raw += piece;
                if (ttfs === null) {
                    if (!scaffold) ttfs = ttft;
                    else if (splitScaffold(raw).marked && splitScaffold(raw).body.trim()) ttfs = Date.now() - t0;
                }
            }
            if (cand?.finishReason) finish = cand.finishReason;
            if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
        }
    }
    const total = Date.now() - t0;
    const { parts, body: candidate, marked } = scaffold ? splitScaffold(raw) : { parts: null, body: raw, marked: null };
    async function* gen() { for (const ch of candidate) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen()), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, words: words(spoken), ttft, ttfs: ttfs ?? total, total, finish, offers, parts, marked, thoughts, rawLen: raw.length, raw };
}

for (let rep = 1; rep <= REPS; rep++) {
    const file = path.join(OUT, `${ARM}.rep${rep}.json`);
    const store = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const todo = IDS.filter((id) => !store[id]?.spoken);
    console.log(`\n=== ${ARM} rep${rep}: ${todo.length} to answer (${IDS.length - todo.length} already on disk)`);
    let quotaStop = false;
    for (const id of todo) {
        const p = PROMPTS[id];
        const { system, user } = ARMS[ARM].bytes ? ARMS[ARM].bytes(id) : { system: ARMS[ARM].apply(p.system), user: p.user };
        if (ARM !== 'control' && !ARMS[ARM].config && !ARMS[ARM].bytes && system === p.system) throw new Error(`arm ${ARM} changed nothing on ${id}`);
        if (ARMS[ARM].bytes && (system === p.system || user === p.user)) throw new Error(`arm ${ARM} bytes equal the captured bytes on ${id}`);
        if (DRY) {
            console.log(`DRY ${ARM} ${id}: model ${ARMS[ARM].model ?? MODEL}, system ${system.length} chars (captured ${p.system.length}), user ${user.length} chars (captured ${p.user.length}), config ${JSON.stringify(ARMS[ARM].config ?? {})}`);
            console.log(`DRY user head: ${JSON.stringify(user.slice(0, 160))}`);
            console.log(`DRY ids: ${IDS.length} (${IDS.filter((i) => i.endsWith('F')).length} follow-ups)`);
            process.exit(0);
        }
        let r = null, last = null;
        for (let attempt = 0; attempt < 4 && !r?.spoken; attempt++) {
            if (attempt) await sleep(8000 * attempt);
            r = await ask(system, user, ARMS[ARM].scaffold, ARMS[ARM].config, ARMS[ARM].model);
            last = r?.transient ?? null;
        }
        if (!r?.spoken) {
            console.log(`  ${id} ${last ?? 'empty'} — giving up on this id for now`);
            if (last === 'HTTP 429') { quotaStop = true; break; }
            continue;
        }
        store[id] = { id, ...r };
        fs.writeFileSync(file, JSON.stringify(store, null, 1));
        const flag = ARMS[ARM].scaffold ? (r.marked ? `parts ${r.parts.split('\n').length - 1}` : 'NO MARKER') : '';
        console.log(`  ${id.padEnd(6)} ${String(r.words).padStart(3)}w  ttfs ${String(r.ttfs).padStart(5)}ms  ${flag}`);
        await sleep(600);
    }
    if (quotaStop) { console.log(`\nQUOTA STOP (429) on ${ARM} rep${rep} — rerun after the 07:00 UTC reset to resume`); process.exit(3); }
    const done = Object.values(store).filter((v) => v.spoken);
    const ws = done.map((v) => v.words).sort((a, b) => a - b);
    console.log(`  -> ${done.length}/${IDS.length}  words p50 ${ws[Math.floor(ws.length / 2)]} max ${ws[ws.length - 1]}  ttfs p50 ${done.map((v) => v.ttfs).sort((a, b) => a - b)[Math.floor(done.length / 2)]}ms`);
}
console.log(`\nBENCH REPLAY DONE ${ARM}`);
