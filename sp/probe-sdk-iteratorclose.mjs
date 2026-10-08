// Throwaway probe (ruling R9, rule 8): when cutAtWordBudget returns out of its
// for-await, IteratorClose propagates down the generator chain to the Gemini
// SDK's stream. Does that actually stop the in-flight request, or does the
// response keep streaming into a closed iterator until the model finishes?
// Two runs on the production model with a prompt long enough to take seconds:
//   control — drain the whole stream; note total wall time and chunk count
//   cut     — break after the third chunk; note wall time until the script's
//             event loop drains (if the request stays open, node stays alive
//             until the response ends and the elapsed time matches control)
// Key read in-process from .env; never printed. usage: node probe-sdk-iteratorclose.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.argv[2];
const require = createRequire(path.join(root, 'package.json'));
const { GoogleGenAI } = require('@google/genai');
const KEY = fs.readFileSync(path.join(root, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const ai = new GoogleGenAI({ apiKey: KEY });
const MODEL = 'gemini-3.1-flash-lite';
const PROMPT = 'In about 700 words, spoken prose with no headings or lists, explain how a Kafka consumer group rebalances partitions and what can go wrong.';

async function run(mode) {
    const t0 = Date.now();
    const stream = await ai.models.generateContentStream({ model: MODEL, contents: PROMPT });
    let chunks = 0, chars = 0, tBreak = null;
    for await (const chunk of stream) {
        chunks++;
        chars += (chunk.text ?? '').length;
        if (mode === 'cut' && chunks === 3) { tBreak = Date.now() - t0; break; }
    }
    const tLoopEnd = Date.now() - t0;
    // Let the event loop settle: any still-open socket keeps the process alive past this.
    await new Promise((r) => setImmediate(r));
    return { mode, chunks, chars, tBreak, tLoopEnd };
}

const control = await run('control');
console.log('control:', JSON.stringify(control));
const t1 = Date.now();
const cut = await run('cut');
console.log('cut:    ', JSON.stringify(cut));
process.on('exit', () => {
    const alive = Date.now() - t1;
    console.log(`cut run: loop ended at ${cut.tLoopEnd} ms, process exited ${alive} ms after the cut run started (control took ${control.tLoopEnd} ms to stream fully)`);
    console.log(alive < control.tLoopEnd * 0.6 ? 'VERDICT: request released promptly after the break (IteratorClose stops the stream)' : 'VERDICT: process stayed alive about as long as a full generation — the request was NOT aborted by the break');
});
