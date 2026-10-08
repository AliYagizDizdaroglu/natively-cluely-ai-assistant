// Throwaway: is the arm runner's 180 s cap cutting slow-but-valid answers, or real runaways?
// Re-asks one question that hit the cap, with the arm's exact request, a 600 s ceiling, and a
// progress line every 30 s (thought parts / answer chars so far, seconds since the last byte).
//   node gemma-runaway-probe.mjs <model> <LEVEL> <id>
// The key is read in-process from MAIN/.env and never printed.
import fs from 'node:fs';

const [model, level, id] = process.argv.slice(2);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
const C = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`, 'utf8'))[id];
const body = {
    contents: [{ role: 'user', parts: [{ text: C.user }] }], systemInstruction: { parts: [{ text: C.system }] },
    generationConfig: { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: level } },
};
const t0 = Date.now();
let thoughtParts = 0, thoughtChars = 0, answer = '', last = t0, finish = null, usage = null, maxGap = 0;
const tick = setInterval(() => console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)}s  thought parts ${thoughtParts} (${thoughtChars} chars)  answer ${answer.length} chars  last byte ${((Date.now() - last) / 1000).toFixed(0)}s ago`), 30_000);
try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(600_000),
    });
    if (!res.ok) { console.log(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`); process.exit(0); }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const now = Date.now(); maxGap = Math.max(maxGap, now - last); last = now;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const cand = j.candidates?.[0];
            for (const p of cand?.content?.parts || []) { if (p.thought) { thoughtParts++; thoughtChars += (p.text || '').length; } else answer += p.text || ''; }
            if (cand?.finishReason) finish = cand.finishReason;
            if (j.usageMetadata) usage = j.usageMetadata;
        }
    }
    console.log(`END ${finish ?? 'NO-FINISH'} after ${((Date.now() - t0) / 1000).toFixed(1)}s  thoughts ${usage?.thoughtsTokenCount ?? '?'} tokens / ${thoughtParts} parts  answer ${(answer.trim().match(/\S+/g) || []).length} words  max gap ${(maxGap / 1000).toFixed(1)}s`);
    console.log(`ANSWER ${answer.trim().slice(0, 600)}`);
} catch (e) {
    console.log(`ABORT ${e.name}: ${e.message} after ${((Date.now() - t0) / 1000).toFixed(1)}s  thought parts ${thoughtParts}  answer ${answer.length} chars  last byte ${((Date.now() - last) / 1000).toFixed(0)}s before`);
}
clearInterval(tick);
