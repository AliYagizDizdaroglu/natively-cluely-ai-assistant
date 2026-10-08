// Does gemini-3.5-flash-lite actually spend thought tokens at the level the fix now sends?
// Calibration: the SAME request at LOW must come back with ~0 thoughts, or the probe is not
// measuring the level at all. Key is read in-process and never printed.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.5-flash-lite';

// A question that needs reasoning, so thinking has something to spend tokens on.
const Q = 'A churn model flags 5,000 of 100,000 subscribers. 2,850 of the flagged actually churned, '
    + 'and 4,750 subscribers churned in total. State precision and recall, and reconcile them.';

async function ask(level) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: Q }] }],
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.4,
            ...(level ? { thinkingConfig: { thinkingLevel: level } } : {}),
        },
    };
    const t0 = Date.now();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) return { level: level ?? 'none', error: `${res.status} ${JSON.stringify(j).slice(0, 160)}` };
    return {
        level: level ?? 'none',
        thoughts: j.usageMetadata?.thoughtsTokenCount ?? 0,
        out: j.usageMetadata?.candidatesTokenCount ?? 0,
        ms: Date.now() - t0,
    };
}

console.log(`model ${MODEL} — two reps per level, same prompt\n`);
for (const level of ['LOW', 'HIGH', 'MEDIUM', 'MINIMAL']) {
    for (let rep = 1; rep <= 2; rep++) {
        const r = await ask(level);
        console.log(r.error
            ? `${String(r.level).padEnd(8)} rep${rep}  ERROR ${r.error}`
            : `${String(r.level).padEnd(8)} rep${rep}  thoughts ${String(r.thoughts).padStart(5)}  out ${String(r.out).padStart(4)}  ${(r.ms / 1000).toFixed(1)}s`);
    }
}
