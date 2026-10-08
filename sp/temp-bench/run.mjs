// Temperature probe runner (2026-10-02 evening; exploratory, decides nothing — the Sunday bench decides).
// Replays s50m's CAPTURED prompts (system + user bytes, pre-cue) for the items fixed in items.json, on the two shipped
// hedge legs (3.5-lite thinking HIGH, 3.1-lite thinking LOW), arm T04 = temperature 0.4 (what the app sends) vs arm
// TDEF = no temperature (Google's Gemini 3.x guidance: the default, 1.0). Request shape, filter chain and record fields
// are followup-questions-run.mjs's (itself a copy of interview60.answers.mjs's answerStreamedGemini). Arms interleave:
// for item index i, rep r, model index m, T04 first when (i + r + m) is even, else TDEF first; 1.5 s pause after
// every call, so each pair is measured seconds apart. Resumable. Prints ids, numbers and flags only.
//   node run.mjs --dry-run | node run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const OUT = path.join(HERE, 'out');
const MODELS = [{ model: 'gemini-3.5-flash-lite', thinking: 'HIGH', leg: 'high' }, { model: 'gemini-3.1-flash-lite', thinking: 'LOW', leg: 'low' }];
const ARMS = { T04: 0.4, TDEF: null };
const REPS = [1, 2, 3];
const PAUSE_MS = 1500, ATTEMPTS = 5;
const DRY = process.argv.includes('--dry-run');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);

const { items } = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
const IDS = items.map((x) => x.id);
const prompts = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
for (const id of IDS) if (!prompts[id]?.system || !prompts[id]?.user) { console.log(`REFUSED: ${id} has no captured prompt`); process.exit(2); }

const FILTER_JS = path.join(MAIN, 'dist-electron/electron/llm/verbalStreamFilter.js');
const require = createRequire(path.join(MAIN, 'package.json'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences } = require(FILTER_JS);
if (![filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences].every((f) => typeof f === 'function')) { console.log('REFUSED: the filter module lacks a filter'); process.exit(2); }

const order = [];
IDS.forEach((id, i) => { for (const rep of REPS) MODELS.forEach((m, mi) => { const arms = (i + rep + mi) % 2 === 0 ? ['T04', 'TDEF'] : ['TDEF', 'T04']; arms.forEach((arm, k) => order.push({ id, rep, arm, pos: k + 1, ...m })); }); });
console.log(`TEMPERATURE PROBE  ${IDS.length} items x ${REPS.length} reps x ${MODELS.length} models x 2 arms = ${order.length} calls; filter sha ${sha(fs.readFileSync(FILTER_JS))}`);
console.log(`T04 first in ${order.filter((c) => c.arm === 'T04' && c.pos === 1).length} pairs, TDEF first in ${order.filter((c) => c.arm === 'TDEF' && c.pos === 1).length}`);
if (DRY) { order.forEach((c, n) => console.log(`DRY #${String(n + 1).padStart(3)} ${c.id.padEnd(7)} r${c.rep} ${c.leg.padEnd(4)} ${c.arm.padEnd(4)} temp ${ARMS[c.arm] ?? 'unset'}  system ${prompts[c.id].system.length}  user ${prompts[c.id].user.length}`)); console.log('DRY RUN: no key read, no call made'); process.exit(0); }

const KEY = fs.readFileSync(path.join(MAIN, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.log('REFUSED: no GEMINI_API_KEY in MAIN/.env'); process.exit(2); }

// Looping: the documented risk of a low temperature. Flags an 8-word sequence that occurs 3+ times in the raw reply.
function loopFlag(raw) {
    const w = raw.toLowerCase().match(/\S+/g) || [];
    const seen = new Map();
    for (let i = 0; i + 8 <= w.length; i++) { const k = w.slice(i, i + 8).join(' '); seen.set(k, (seen.get(k) ?? 0) + 1); }
    let max = 0; for (const v of seen.values()) max = Math.max(max, v);
    return max;
}

async function answer(model, thinking, temperature, system, user) {
    const generationConfig = { maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: thinking }, ...(temperature === null ? {} : { temperature }) };
    const body = { contents: [{ role: 'user', parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`;
    const t0 = Date.now();
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null, thoughts = null, outTok = null;
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const cand = j.candidates?.[0];
            const piece = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
            if (piece) { if (ttft === null) ttft = Date.now() - t0; raw += piece; }
            if (cand?.finishReason) finish = cand.finishReason;
            if (j.usageMetadata) { thoughts = j.usageMetadata.thoughtsTokenCount ?? 0; outTok = j.usageMetadata.candidatesTokenCount ?? null; }
        }
    }
    const total = Date.now() - t0;
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts, outTok, loop8: loopFlag(raw) };
}

fs.mkdirSync(OUT, { recursive: true });
const fileFor = (leg, arm, rep) => path.join(OUT, `answers.${leg}.${arm}.r${rep}.json`);
const stores = {};
const storeOf = (c) => { const k = `${c.leg}.${c.arm}.${c.rep}`; if (!stores[k]) { const f = fileFor(c.leg, c.arm, c.rep); stores[k] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; } return stores[k]; };

for (const [n, c] of order.entries()) {
    const tag = `#${String(n + 1).padStart(3)} ${c.id.padEnd(7)} r${c.rep} ${c.leg.padEnd(4)} ${c.arm.padEnd(4)}`;
    const store = storeOf(c);
    if (store[c.id] && !store[c.id].transientError) { console.log(`${tag}: kept (${store[c.id].at})`); continue; }
    const o = prompts[c.id];
    let r = null, lastErr, dropRetried = false;
    const at = new Date().toISOString();
    for (let a = 0; a < ATTEMPTS; a++) {
        try {
            r = await answer(c.model, c.thinking, ARMS[c.arm], o.system, o.user);
            if (!r.transient && r.finish === null && r.spoken && !dropRetried) { dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(5000); continue; }
            if (!r.transient) break;
            lastErr = r.transient; await sleep(8000 * (a + 1));
        } catch (e) { lastErr = e.message; r = null; await sleep(4000 * (a + 1)); }
    }
    const base = { id: c.id, arm: c.arm, temperature: ARMS[c.arm], rep: c.rep, position: c.pos, model: c.model, thinking: c.thinking, at };
    if (!r || r.transient) { store[c.id] = { ...base, transientError: lastErr ?? 'no response' }; console.log(`${tag}: TRANSIENT ${lastErr}`); }
    else { store[c.id] = { ...base, ...r }; console.log(`${tag}: ${String(r.words).padStart(3)}w ttft ${String(r.ttft).padStart(5)}ms total ${String(r.total).padStart(5)}ms thoughts ${r.thoughts} finish ${r.finish} loop8 ${r.loop8}`); }
    fs.writeFileSync(fileFor(c.leg, c.arm, c.rep), JSON.stringify(store, null, 1));
    await sleep(PAUSE_MS);
}
console.log('RUN DONE');
