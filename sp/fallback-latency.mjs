// What does raising the fallback's level COST in first-token time? The stall path has already
// spent 10 s by the time it runs, so this is the latency-critical leg of the whole app.
// Streaming, on the app's own captured bytes from s50j, ttft measured to the first text chunk.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.5-flash-lite';
const prompts = JSON.parse(fs.readFileSync(`${PROJ}/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.prompts.json`, 'utf8'));

// A spread of real captured turns, mains only, so the bytes match what a stall would carry.
const IDS = ['S1Q02', 'S1Q06', 'S1Q07', 'S2Q02', 'S2Q05', 'S2Q07', 'S2Q09', 'S2Q10'];

async function ttft(id, level) {
    const cap = prompts[id];
    const body = {
        contents: [{ role: 'user', parts: [{ text: cap.user }] }],
        systemInstruction: { parts: [{ text: cap.system }] },
        generationConfig: {
            maxOutputTokens: 2048, temperature: 0.4,
            ...(level ? { thinkingConfig: { thinkingLevel: level } } : {}),
        },
    };
    const t0 = Date.now();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body),
    });
    if (!res.ok) return { ttft: null, err: res.status };
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let first = null, thoughts = 0, buf = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        for (const line of buf.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
                const j = JSON.parse(line.slice(6));
                const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
                if (txt && first == null) first = Date.now() - t0;
                if (j.usageMetadata?.thoughtsTokenCount) thoughts = j.usageMetadata.thoughtsTokenCount;
            } catch { }
        }
        buf = buf.slice(buf.lastIndexOf('\n') + 1);
        if (first != null && thoughts) break;
    }
    try { await reader.cancel(); } catch { }
    return { ttft: first, thoughts };
}

const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
console.log(`${MODEL} on ${IDS.length} captured app turns — first-token time by level\n`);
for (const level of ['LOW', 'MEDIUM', 'HIGH']) {
    const ts = [], th = [];
    for (const id of IDS) {
        const r = await ttft(id, level);
        if (r.ttft != null) { ts.push(r.ttft); th.push(r.thoughts); }
    }
    console.log(`${level.padEnd(7)} ttft p50 ${(p(ts, .5) / 1000).toFixed(1)}s  p90 ${(p(ts, .9) / 1000).toFixed(1)}s  max ${(Math.max(...ts) / 1000).toFixed(1)}s   thoughts p50 ${p(th, .5)}  zero ${th.filter((x) => !x).length}/${th.length}`);
}
