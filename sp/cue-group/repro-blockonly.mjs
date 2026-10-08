// Root-cause evidence for the re-smoke's block-only answer (2026-09-30 16:12:08 local): the model produced 101 output
// tokens, the cue block was reported, and NOTHING reached the screen (budget words=0, no first token). The raw output
// is not logged, so this re-asks the model with the EXACT captured prompt of that answer and looks at the SHAPE of
// what comes back, and at which stage of the built filter chain the words disappear.
// Two arms on the same prompt: `cue` (as captured) and `nocue` (the cue rule removed byte for byte, the control).
// Prints structure only: line classes, word counts per stage, cue lines and offer labels. Never the prompt, never the
// spoken answer. Raw outputs stay in memory unless --keep is given (then a row file in this folder, never committed).
//   node repro-blockonly.mjs --run <run dir> --at <UTC ISO of the dispatch> [--reps 12] [--arms cue,nocue] [--keep] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const require = createRequire(`${WT}/package.json`);
const P = require(`${WT}/dist-electron/electron/llm/prompts.js`);
const F = require(`${WT}/dist-electron/electron/llm/verbalStreamFilter.js`);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const words = (s) => (String(s).match(/\S+/g) ?? []).length;

/** One label per line of the raw output: what KIND of line it is. Prose is shown as a word count only. */
export function shape(raw) {
    const out = [];
    let seenSentinel = false, inMore = false, inFence = false;
    for (const line of String(raw).split('\n')) {
        const t = line.trim();
        if (t.startsWith('```')) { inFence = !inFence; out.push(`FENCE(${t.slice(0, 12)})`); continue; }
        if (inFence) { out.push(`code(${words(t)}w)`); continue; }
        if (t === '') { out.push('blank'); continue; }
        if (!seenSentinel && t.startsWith('__CUES__')) { seenSentinel = true; out.push(t === '__CUES__' ? 'CUES' : `CUES+text(${words(t.slice(8))}w)`); continue; }
        if (t.startsWith('__MORE__')) { inMore = true; out.push(t === '__MORE__' ? 'MORE' : `MORE+text(${words(t.slice(8))}w)`); continue; }
        if (/^\d+\s*\|/.test(t)) { out.push(inMore ? `offer(${words(t.replace(/^\d+\s*\|/, ''))}w)` : `cue(${words(t.replace(/^\d+\s*\|/, ''))}w)`); continue; }
        out.push(`prose(${words(t)}w)`);
    }
    return out;
}

const collect = async (gen) => { let s = ''; for await (const c of gen) s += c; return s; };
const chunks = (text, size) => (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })();
/** The app's chain (WhatToAnswerLLM.ts:387-393), stage by stage, on the raw output in ~90-character chunks. */
export async function stages(raw) {
    let cues = null, offers = null;
    const s1 = await collect(F.stripCueBlock(chunks(raw, 90), (c) => { cues = c; }));
    const s2 = await collect(F.filterCodeFences(chunks(s1, 90)));
    const s3 = await collect(F.filterVerbalLines(chunks(s2, 90)));
    const s4 = await collect(F.stripSuggestionBlock(chunks(s3, 90), (s) => { offers = s; }));
    const s5 = await collect(F.stripSpokenNotation(chunks(s4, 90)));
    return { cues, offers: (offers ?? []).map((o) => o.label), w: [words(raw), words(s1), words(s2), words(s3), words(s4), words(s5)] };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'repro-blockonly.mjs') {
    const RUN = arg('--run'), AT = arg('--at'), REPS = Number(arg('--reps', '12'));
    const ARMS = arg('--arms', 'cue,nocue').split(',');
    if (!RUN || !AT) { console.log('usage: node repro-blockonly.mjs --run <run dir> --at <UTC ISO of the dispatch> [--reps 12] [--arms cue,nocue] [--keep] [--dry]'); process.exit(2); }
    const target = Date.parse(AT);
    const caps = fs.readFileSync(path.join(RUN, 'verbal-prompts.log'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    // the capture that follows the dispatch most closely (within 10 s), for the front-leg model
    const near = caps.map((c) => ({ c, d: Date.parse(c.at) - target })).filter((x) => x.d >= -500 && x.d <= 10000).sort((a, b) => a.d - b.d);
    console.log(`captures in the run: ${caps.length}; within [-0.5 s, +10 s] of ${AT}: ${near.map((x) => `${x.c.model}@+${x.d}ms`).join(', ') || 'none'}`);
    const cap = near.find((x) => /3\.5-flash-lite/.test(x.c.model ?? ''))?.c ?? near[0]?.c;
    if (!cap?.system || !cap?.user) { console.log('REFUSED: no captured prompt with a system and a user turn near that time'); process.exit(3); }
    console.log(`using the capture at ${cap.at}, model ${cap.model}; system ${cap.system.length} chars, user ${cap.user.length} chars; carries the dist's CUE_RULE: ${cap.system.includes(P.CUE_RULE)}`);
    if (!cap.system.includes(P.CUE_RULE)) { console.log('REFUSED: the captured system prompt does not carry the dist\'s CUE_RULE, so the two arms cannot be built'); process.exit(3); }
    const systems = { cue: cap.system, nocue: cap.system.split(P.CUE_RULE).join('') };
    console.log(`nocue arm: ${systems.nocue.length} chars (the rule's ${P.CUE_RULE.length} removed: ${cap.system.length - systems.nocue.length === P.CUE_RULE.length})`);
    if (process.argv.includes('--dry')) process.exit(0);
    const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
    if (!KEY) { console.log('REFUSED: GEMINI_API_KEY is not set in MAIN .env'); process.exit(3); }
    const MODEL = 'gemini-3.5-flash-lite';
    async function ask(system, user) {   // the app's settings for this model: temperature 0.4, thinking HIGH (LLMHelper.ts:3267-3269)
        const body = { contents: [{ role: 'user', parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig: { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: 'HIGH' } } };
        for (let attempt = 0; attempt < 3; attempt++) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
            if (res.ok) { const j = await res.json(); return { text: (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join(''), out: j.usageMetadata?.candidatesTokenCount ?? null, finish: j.candidates?.[0]?.finishReason ?? null }; }
            if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 6000 * (attempt + 1))); continue; }
            throw new Error(`HTTP ${res.status}`);
        }
        return null;
    }
    const rows = [];
    for (const arm of ARMS) {
        let empty = 0, n = 0;
        for (let rep = 1; rep <= REPS; rep++) {
            const r = await ask(systems[arm], cap.user);
            if (!r) { console.log(`${arm} rep${rep}: no answer (3 attempts)`); continue; }
            n++;
            const st = await stages(r.text);
            const sh = shape(r.text);
            if (st.w[5] === 0) empty++;
            rows.push({ arm, rep, raw: r.text, out: r.out, finish: r.finish, shape: sh, ...st });
            console.log(`${arm.padEnd(5)} rep${String(rep).padStart(2)}: out ${String(r.out).padStart(4)} tok, finish ${r.finish}; words raw ${st.w[0]} -> cue-strip ${st.w[1]} -> fences ${st.w[2]} -> line filter ${st.w[3]} -> offers ${st.w[4]} -> notation ${st.w[5]}${st.w[5] === 0 ? '  <<< NOTHING SHOWN' : ''}`);
            console.log(`            shape: ${sh.join(' ')}`);
            console.log(`            cues ${JSON.stringify(st.cues)}${st.offers.length ? `  offers ${JSON.stringify(st.offers)}` : ''}`);
        }
        console.log(`== ${arm}: ${empty} of ${n} answers show NOTHING after the app's filters`);
    }
    if (process.argv.includes('--keep')) { const f = path.join(HERE, `repro-blockonly-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(rows, null, 1)); console.log(`rows written: ${f}`); }
}
