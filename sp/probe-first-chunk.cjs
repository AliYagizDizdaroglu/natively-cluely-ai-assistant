// Throwaway: what does the raw Gemini stream's FIRST chunk look like when the answer
// starts with "I’d …" / "So, …"?  Prints chunk texts as JSON (first 4 chunks) and the
// parts of the first chunk — never the key.  usage: node probe-first-chunk.cjs <repo-root> [model] [n]
const path = require('node:path');
const root = process.argv[2];
const model = process.argv[3] ?? 'gemini-3.1-flash-lite';
const n = Number(process.argv[4] ?? 3);
require(path.join(root, 'node_modules', 'dotenv')).config({ path: path.join(root, '.env'), quiet: true });
const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
if (!key) { console.error('no Gemini key name matched in .env'); process.exit(2); }
const { GoogleGenAI } = require(path.join(root, 'node_modules', '@google', 'genai'));
const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: "v1alpha" } });

const prompts = [
    'You are a candidate in a live interview. In one first-person paragraph of about 50 words, starting with the exact words "I’d start by", say how you would debug a p99 latency spike on a SageMaker endpoint.',
    'You are a candidate in a live interview. In one first-person paragraph of about 50 words, starting with the exact words "So, my initial thought", say how you would structure a retraining pipeline.',
    'You are a candidate in a live interview. In one first-person paragraph of about 50 words, starting with the exact words "To manage", say how you keep dev, staging and prod from drifting.',
];
(async () => {
    for (let i = 0; i < n; i++) {
        const p = prompts[i % prompts.length];
        const stream = await ai.models.generateContentStream({ model, contents: [{ role: 'user', parts: [{ text: p }] }], config: { maxOutputTokens: 200, temperature: 0.4 } });
        let k = 0; let full = '';
        for await (const chunk of stream) {
            const t = chunk.text;
            full += t ?? '';
            if (k < 4) {
                const parts = chunk.candidates?.[0]?.content?.parts ?? [];
                console.log(`run ${i + 1} chunk ${k}: text=${JSON.stringify(t)} parts=${JSON.stringify(parts.map((q) => ({ keys: Object.keys(q), text: q.text, thought: q.thought })))} finish=${chunk.candidates?.[0]?.finishReason ?? ''}`);
            }
            k++;
        }
        console.log(`run ${i + 1}: ${k} chunks, full head=${JSON.stringify(full.slice(0, 60))}\n`);
    }
})().catch((e) => { console.error('probe failed:', e?.message ?? e); process.exit(1); });
