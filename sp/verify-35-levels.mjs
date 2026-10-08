// Throwaway calibration: the bench rep files record no thoughtsTokenCount, so the think35-*
// arms do not themselves prove the level rode on the request. This replays ONE captured item
// through bench-replay's exact ask() body shape, with the arm's config and with none, and
// prints usage. If config-on thinks and config-off does not, the arms carried the level.
// Key read in-process from main's .env, never printed.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-14T08-22-28-s50e');
const P = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.prompts.json'), 'utf8'));
const id = process.argv[2] || 'S1Q02';
const p = P[id];
if (!p) { console.error(`no captured prompt for ${id}`); process.exit(2); }

const cells = [
    ['3.5 no config (what the arm would be if the level were dropped)', 'gemini-3.5-flash-lite', {}],
    ['3.5 thinkingLevel MEDIUM (think35-medium)', 'gemini-3.5-flash-lite', { thinkingConfig: { thinkingLevel: 'MEDIUM' } }],
    ['3.5 thinkingLevel HIGH (think35-high)', 'gemini-3.5-flash-lite', { thinkingConfig: { thinkingLevel: 'HIGH' } }],
    ['3.1 thinkingLevel LOW (think-low, the shipped config)', 'gemini-3.1-flash-lite', { thinkingConfig: { thinkingLevel: 'LOW' } }],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [label, model, config] of cells) {
    // Byte-identical to bench-replay.mjs ask().
    const body = {
        contents: [{ role: 'user', parts: [{ text: p.user }] }],
        systemInstruction: { parts: [{ text: p.system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, ...config },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`;
    let res = null, t0 = 0;
    for (let a = 0; a < 3; a++) {
        if (a) await sleep(5000 * a);
        t0 = Date.now();
        res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
        if (res.status === 429 || res.status >= 500) { console.log(`${label}: HTTP ${res.status}, retrying`); await res.text(); res = null; continue; }
        break;
    }
    if (!res) { console.log(`${label}: gave up`); continue; }
    if (!res.ok) { console.log(`${label}: HTTP ${res.status}`); await res.text(); continue; }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, thoughts = null;
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
            const piece = (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join('');
            if (piece) { if (ttft === null) ttft = Date.now() - t0; raw += piece; }
            if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
        }
    }
    console.log(`${label}\n    ttft ${ttft} ms  total ${Date.now() - t0} ms  thoughts ${thoughts}  words ${(raw.trim().match(/\S+/g) || []).length}`);
    await sleep(2000);
}
