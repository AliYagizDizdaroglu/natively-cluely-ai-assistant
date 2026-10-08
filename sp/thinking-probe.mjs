// Throwaway probe: does gemini-3.1-flash-lite think by default on the app's call shape, and
// what does a thinking setting cost? Sends the app's captured S1Q02 call (the CV-numbers
// question the model fails on every flight) three ways and prints usageMetadata + timing +
// the spoken text head. Key read in-process from main's .env, never printed.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = process.env.PROBE_MODEL || 'gemini-3.1-flash-lite';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-15T08-22-29-s50f');
const P = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.prompts.json'), 'utf8'));
const id = process.argv[2] || 'S1Q02';
const p = P[id];

const variants = {
    'app-default': {},
    'thinkingLevel-minimal': { thinkingConfig: { thinkingLevel: 'MINIMAL' } },
    'thinkingLevel-low': { thinkingConfig: { thinkingLevel: 'LOW' } },
    'thinkingLevel-medium': { thinkingConfig: { thinkingLevel: 'MEDIUM' } },
    'thinkingLevel-high': { thinkingConfig: { thinkingLevel: 'HIGH' } },
    'thinkingBudget-1024': { thinkingConfig: { thinkingBudget: 1024 } },
    'thinkingBudget-0': { thinkingConfig: { thinkingBudget: 0 } },
};
const only = (process.argv[3] || '').split(',').filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [name, extra] of Object.entries(variants)) {
    if (only.length && !only.includes(name)) continue;
    const body = {
        contents: [{ role: 'user', parts: [{ text: p.user }] }],
        systemInstruction: { parts: [{ text: p.system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, ...extra },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:streamGenerateContent?alt=sse`;
    let res = null, t0 = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt) await sleep(5000 * attempt);
        t0 = Date.now();
        try { res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) }); }
        catch (e) { console.log(`${name}: fetch failed ${e.message}`); res = null; continue; }
        if (res.status === 503 || res.status === 429) { console.log(`${name}: HTTP ${res.status}, retrying`); await res.text(); res = null; continue; }
        break;
    }
    if (!res) { console.log(`${name}: gave up`); continue; }
    if (!res.ok) { console.log(`${name}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`); continue; }
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = '', text = '', ttft = null, usage = null, thoughtParts = 0;
    for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            for (const part of j.candidates?.[0]?.content?.parts || []) {
                if (part.thought) { thoughtParts++; continue; }
                if (part.text) { if (ttft === null) ttft = Date.now() - t0; text += part.text; }
            }
            if (j.usageMetadata) usage = j.usageMetadata;
        }
    }
    const total = Date.now() - t0;
    console.log(`\n=== ${name}  ttft ${ttft} ms  total ${total} ms  thoughtParts ${thoughtParts}`);
    console.log(`usage: prompt ${usage?.promptTokenCount} thoughts ${usage?.thoughtsTokenCount ?? 'n/a'} candidates ${usage?.candidatesTokenCount} total ${usage?.totalTokenCount}`);
    console.log(`text (${(text.match(/\S+/g) || []).length} words): ${text.replace(/\s+/g, ' ').slice(0, 700)}`);
}
