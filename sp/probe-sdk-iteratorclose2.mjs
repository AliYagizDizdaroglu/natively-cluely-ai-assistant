// Throwaway probe v2 (ruling R9). v1 showed the cut run's loop ended at 1.6 s
// but the node process then stayed alive far past the 6.5 s a full generation
// takes — the break did not release the request promptly. This run isolates
// one mode per process and records when the event loop actually drains
// (beforeExit), and adds an 'abort' mode that passes an AbortSignal to the SDK
// and aborts it at the break — the plumbing the app would need if IteratorClose
// alone is not enough. Key read in-process; never printed.
// usage: node probe-sdk-iteratorclose2.mjs <repo-root> control|cut|abort
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [root, mode] = process.argv.slice(2);
const require = createRequire(path.join(root, 'package.json'));
const { GoogleGenAI } = require('@google/genai');
const KEY = fs.readFileSync(path.join(root, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const ai = new GoogleGenAI({ apiKey: KEY });
const MODEL = 'gemini-3.1-flash-lite';
const PROMPT = 'In about 700 words, spoken prose with no headings or lists, explain how a Kafka consumer group rebalances partitions and what can go wrong.';

const t0 = Date.now();
const ac = new AbortController();
const stream = await ai.models.generateContentStream({ model: MODEL, contents: PROMPT, config: mode === 'abort' ? { abortSignal: ac.signal } : undefined });
let chunks = 0, chars = 0, tBreak = null;
try {
    for await (const chunk of stream) {
        chunks++;
        chars += (chunk.text ?? '').length;
        if (mode !== 'control' && chunks === 3) { tBreak = Date.now() - t0; if (mode === 'abort') ac.abort(); break; }
    }
} catch (e) {
    console.log(`${mode}: loop threw ${String(e?.name ?? e).slice(0, 60)} at ${Date.now() - t0} ms`);
}
console.log(`${mode}: loop ended at ${Date.now() - t0} ms, chunks ${chunks}, chars ${chars}${tBreak == null ? '' : `, break at ${tBreak} ms`}`);
process.on('beforeExit', () => console.log(`${mode}: event loop drained at ${Date.now() - t0} ms`));
