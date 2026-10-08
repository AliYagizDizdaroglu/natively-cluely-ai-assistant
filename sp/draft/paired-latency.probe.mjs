// paired-latency.probe.mjs — one window of the pre-registered latency test for the spoken-answer
// model (passes/PREREGISTER-latency-probe.md). The instrument is the 2026-09-22 probe unchanged in
// every way that measures: s50m's 39 captured prompts, BOTH models on each one back to back,
// strictly sequential so they never contend, the order alternating by prompt, each model's OWN
// first token with no fallback, the harness's exact call shape. Only the output path and the
// window tag are new.
//
//   node --env-file=.env electron/test/golden/paired-latency.probe.mjs <W1|W2|W3>
//
// Close the app first: its warm-ups send each model a request a minute. The key reaches this
// process only through --env-file; nothing here prints or stores one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS = path.join(HERE, 'interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json');
const OUT_DIR = path.join(HERE, 'interview60.runs/latency-probe');   // gitignored, like every run

const window = process.argv[2];
if (!/^W[1-3]$/.test(window ?? '')) { console.error('usage: paired-latency.probe.mjs <W1|W2|W3>'); process.exit(2); }
const KEY = process.env.GEMINI_API_KEY?.trim();
if (!KEY) { console.error('GEMINI_API_KEY: not in the environment — run with --env-file'); process.exit(2); }
const OUT = path.join(OUT_DIR, `${new Date().toISOString().slice(0, 10)}-${window}.json`);
if (fs.existsSync(OUT)) { console.error(`${OUT} exists — a window that ran is never run again`); process.exit(2); }

const ARMS = [
    { name: '3.1-lite LOW', model: 'gemini-3.1-flash-lite', thinking: 'LOW' },
    { name: '3.5-lite HIGH', model: 'gemini-3.5-flash-lite', thinking: 'HIGH' },
];
const HARD_CAP_MS = 45000; // never hang the probe on a dead request

async function ask({ model, thinking }, captured) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: captured.user }] }],
        systemInstruction: { parts: [{ text: captured.system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: thinking } },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`;
    const ac = new AbortController();
    const cap = setTimeout(() => ac.abort(), HARD_CAP_MS);
    const t0 = Date.now();
    try {
        const res = await fetch(url, {
            method: 'POST', signal: ac.signal,
            headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
            body: JSON.stringify(body),
        });
        if (!res.ok) return { error: `HTTP ${res.status}`, ttft: null, total: Date.now() - t0 };
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '', ttft = null, thoughts = null, chars = 0;
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
                const piece = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
                if (piece) { if (ttft === null) ttft = Date.now() - t0; chars += piece.length; }
                if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
            }
            if (ttft !== null && chars > 400) { ac.abort(); break; } // the first token is the measurement
        }
        return { ttft, total: Date.now() - t0, thoughts, chars };
    } catch (e) {
        return { error: String(e?.name === 'AbortError' && 'aborted at cap' || e?.message || e), ttft: null, total: Date.now() - t0 };
    } finally { clearTimeout(cap); }
}

const prompts = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
const ids = Object.keys(prompts).sort();
console.log(`window ${window}: ${ids.length} prompts x 2 models, strictly sequential, order alternating — ${new Date().toISOString()}`);
const rows = [];
for (const [n, id] of ids.entries()) {
    const order = n % 2 === 0 ? [0, 1] : [1, 0];   // balance any first-in-pair advantage
    const line = [];
    for (const a of order) {
        const arm = ARMS[a];
        const r = await ask(arm, prompts[id]);
        rows.push({ id, arm: arm.name, first: order[0] === a, at: new Date().toISOString(), ...r });
        line.push(`${arm.name} ${r.error ? r.error : (r.ttft === null ? 'no token' : r.ttft + 'ms')}`);
    }
    console.log(`${String(n + 1).padStart(2)}/${ids.length} ${id.padEnd(8)} ${line.join('   |   ')}`);
}
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.log(`\nwrote ${OUT}\ndecide after the last window: node electron/test/golden/paired-latency.decide.mjs ${path.join(OUT_DIR, '<date>-W1.json')} ...`);
