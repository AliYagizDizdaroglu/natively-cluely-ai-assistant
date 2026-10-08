// Pre-registered runner for the earlier-question context replay (followup-context/PREREGISTER-followup-questions.md
// §4). A copy of interview60.answers.mjs's answerStreamedGemini — the same request shape, the same shipped filter
// chain fed character by character, the same record fields — over the FROZEN s50m-gated.json (hashes checked by
// common.mjs), with the arms interleaved: for item index i and rep r, A then B when (i + r) is even, B then A when
// odd, and the same fixed pause after every call, so each paired difference is measured seconds apart.
// Writes interview60.answers.<model>_fquestions-<arm>-r<rep>.json into OUT_DIR, one record per call, after every call.
//
//   node followup-questions-run.mjs --dry-run    call order and byte counts; reads no key, makes no call
//   node followup-questions-run.mjs              the 96 calls; resumable (a record without transientError is kept)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MAIN, OUT_DIR, MODEL, THINKING, IDS, REPS, ARMS, fileFor, sha, loadGated } from './common.mjs';

const GENERATION_CONFIG = { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: THINKING } };
const PAUSE_MS = 1500;   // interview60.answers.mjs's pause between Gemini calls; here after EVERY call, both arms
const ATTEMPTS = 5;      // §4: "a 429/5xx is retried up to 4 times"
const DRY = process.argv.includes('--dry-run');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

let G;
try { ({ G } = await loadGated()); } catch (e) { console.log(`REFUSED: ${e.message}`); process.exit(2); }

// The shipped filter chain from MAIN's build. §6: the replay runs BEFORE cue mode is merged into MAIN;
// the module's sha is logged so the evidence names the bytes that filtered the answers.
// The pooled re-run filters with Thursday's bytes: the PRE-cue dist snapshot (MAIN's dist now carries cue mode).
const FILTER_JS = path.join(path.dirname(OUT_DIR), 'dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js');
const require = createRequire(path.join(MAIN, 'package.json'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences } = require(FILTER_JS);
if (![filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences].every((f) => typeof f === 'function')) { console.log(`REFUSED: ${FILTER_JS} lacks one of the four filters`); process.exit(2); }

const order = [];
IDS.forEach((id, i) => { for (const rep of REPS) { const arms = (i + rep) % 2 === 0 ? ['A', 'B'] : ['B', 'A']; arms.forEach((arm, k) => order.push({ id, rep, arm, pos: k + 1 })); } });

console.log(`FOLLOW-UP QUESTIONS REPLAY  model=${MODEL} thinking=${THINKING}  ${IDS.length} items x ${REPS.length} reps x 2 arms = ${order.length} calls`);
console.log(`material s50l-gated.json (recorded hash) + earlierQuestions.ref.mjs (pre-registered hash) OK; filter ${FILTER_JS} sha256 ${sha(fs.readFileSync(FILTER_JS)).slice(0, 12)} (must be d8fee6ca0170)`);
if (sha(fs.readFileSync(FILTER_JS)).slice(0, 12) !== 'd8fee6ca0170') { console.log('REFUSED: the filter is not Thursday\'s pre-cue chain'); process.exit(2); }
console.log(`A first in ${order.filter((c) => c.arm === 'A' && c.pos === 1).length} pairs, B first in ${order.filter((c) => c.arm === 'B' && c.pos === 1).length}`);
if (DRY) {
    order.forEach((c, n) => { const o = G[c.id]; console.log(`DRY #${String(n + 1).padStart(2)} ${c.id.padEnd(6)} ${o.kind.padEnd(8)} r${c.rep} ${c.arm} (${c.pos === 1 ? 'first' : 'second'})  system ${o.system.length}  user ${(c.arm === 'A' ? o.userA : o.userB).length}`); });
    console.log('DRY RUN: no key read, no call made');
    process.exit(0);
}

// The key, in-process from MAIN's .env by the answers pass's regex; never printed.
const KEY = fs.readFileSync(path.join(MAIN, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.log('REFUSED: no GEMINI_API_KEY in MAIN/.env'); process.exit(2); }

async function answerStreamedGemini(system, user) {
    const body = { contents: [{ role: 'user', parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig: GENERATION_CONFIG };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:streamGenerateContent?alt=sse`;
    const t0 = Date.now();
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null, thoughts = null;
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
            if (piece) { if (ttft === null) ttft = Date.now() - t0; raw += piece; }
            if (cand?.finishReason) finish = cand.finishReason;
            if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
        }
    }
    const total = Date.now() - t0;
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const stores = {};
for (const arm of ARMS) for (const rep of REPS) { const f = fileFor(arm, rep); stores[`${arm}${rep}`] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; }

for (const [n, c] of order.entries()) {
    const tag = `#${String(n + 1).padStart(2)} ${c.id.padEnd(6)} r${c.rep} ${c.arm}`;
    const store = stores[`${c.arm}${c.rep}`];
    if (store[c.id] && !store[c.id].transientError) { console.log(`${tag}: kept from an earlier session (${store[c.id].at})`); continue; }
    const o = G[c.id];
    const user = c.arm === 'A' ? o.userA : o.userB;
    let r = null, lastErr, dropRetried = false;
    const at = new Date().toISOString();
    for (let a = 0; a < ATTEMPTS; a++) {
        try {
            r = await answerStreamedGemini(o.system, user);
            // A stream that ends with no finish reason was cut mid-answer: one more try, as the answers pass does.
            if (!r.transient && r.finish === null && r.spoken && !dropRetried) { dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(5000); continue; }
            if (!r.transient) break;
            lastErr = r.transient; await sleep(8000 * (a + 1));
        } catch (e) { lastErr = e.message; r = null; await sleep(4000 * (a + 1)); }
    }
    const base = { id: c.id, kind: o.kind, q: o.current, arm: c.arm, rep: c.rep, position: c.pos, model: `${MODEL}_fquestions-${c.arm}`, thinking: THINKING, at };
    if (!r || r.transient) {
        store[c.id] = { ...base, transientError: lastErr ?? 'no response' };
        console.log(`${tag}: TRANSIENT ${lastErr}`);
    } else {
        store[c.id] = { ...base, ...r };
        console.log(`${tag}: ${String(r.words).padStart(3)}w  ttft ${String(r.ttft).padStart(5)}ms  total ${String(r.total).padStart(5)}ms  thoughts ${r.thoughts}  finish ${r.finish}`);
    }
    fs.writeFileSync(fileFor(c.arm, c.rep), JSON.stringify(store, null, 1));
    await sleep(PAUSE_MS);
}

// Informational only; the decision is followup-questions-decide.mjs's.
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
for (const arm of ARMS) {
    const recs = REPS.flatMap((rep) => Object.values(stores[`${arm}${rep}`]));
    const done = recs.filter((x) => !x.transientError);
    console.log(`arm ${arm}: answered ${done.length}/${IDS.length * REPS.length}  transient ${recs.length - done.length}  ttft p50 ${pct(done.map((x) => x.ttft ?? Infinity), 0.5)}ms p90 ${pct(done.map((x) => x.ttft ?? Infinity), 0.9)}ms  words p50 ${pct(done.map((x) => x.words), 0.5)}  empty spoken ${done.filter((x) => !x.spoken).length}`);
}
