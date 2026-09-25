// hedge-live.probe.mjs — one window of the LIVE hedge probe (passes/PREREGISTER-hedge-probe.md).
// The policy the app runs today against the hedge, each run for real on s50m's 39 captured prompts
// (the 09-23 latency probe's set), alternating which goes first per prompt, 8 s apart so the two
// never overlap. What the 09-23 probe could not measure: what happens to one model's request when
// the other model is started beside it.
//   node --env-file=.env electron/test/golden/hedge-live.probe.mjs <H1|H2|H3> [--dry]
// --dry: the same loop over a fake ask with fixed timings, 3 prompts; no request, no file.
// Close the app first (its warm-ups send each model a request). The key reaches this process only
// through --env-file; nothing here prints or stores it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runToday, runHedge } from './hedge-live.policy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS = path.join(HERE, 'interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json');
const OUT_DIR = path.join(HERE, 'interview60.runs/latency-probe');
const window = process.argv[2];
const dry = process.argv.includes('--dry');
if (!/^H[1-3]$/.test(window ?? '')) { console.error('usage: hedge-live.probe.mjs <H1|H2|H3> [--dry]'); process.exit(2); }
const KEY = process.env.GEMINI_API_KEY?.trim();
if (!dry && !KEY) { console.error('GEMINI_API_KEY: not in the environment — run with --env-file'); process.exit(2); }
const OUT = path.join(OUT_DIR, `${new Date().toISOString().slice(0, 10)}-hedge-${window}.json`);
if (!dry && fs.existsSync(OUT)) { console.error(`${OUT} exists — a window that ran is never run again`); process.exit(2); }

// The levels the app flies each model at (guard-h40a.mjs check 4); the call shape is the harness's.
const THINKING = { 'gemini-3.1-flash-lite': 'LOW', 'gemini-3.5-flash-lite': 'HIGH' };
const HARD_CAP_MS = 45000;  // never hang a leg on a dead request
const GAP_MS = 8000;        // between the two policies of a prompt, and between prompts

// Resolves at the FIRST TOKEN, then keeps reading to 400 chars and drops the stream. The policy's
// abort resolves it as aborted; the cap as an error. Never resolves twice.
function ask(model, captured, signal) {
    return new Promise((resolve) => {
        let resolved = false;
        const done = (r) => { if (!resolved) { resolved = true; resolve(r); } };
        const ac = new AbortController();
        const onAbort = () => ac.abort();
        signal.addEventListener('abort', onAbort);
        const cap = setTimeout(() => ac.abort(), HARD_CAP_MS);
        const t0 = Date.now();
        (async () => {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`, {
                    method: 'POST', signal: ac.signal,
                    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: captured.user }] }],
                        systemInstruction: { parts: [{ text: captured.system }] },
                        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: THINKING[model] } },
                    }),
                });
                if (!res.ok) return done({ ttft: null, error: `HTTP ${res.status}`, total: Date.now() - t0 });
                const reader = res.body.getReader();
                const dec = new TextDecoder();
                let buf = '', ttft = null, chars = 0;
                for (;;) {
                    const { value, done: end } = await reader.read();
                    if (end) break;
                    buf += dec.decode(value, { stream: true });
                    let i;
                    while ((i = buf.indexOf('\n')) >= 0) {
                        const line = buf.slice(0, i).trim();
                        buf = buf.slice(i + 1);
                        if (!line.startsWith('data:')) continue;
                        let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
                        const piece = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
                        if (piece) { if (ttft === null) { ttft = Date.now() - t0; done({ ttft }); } chars += piece.length; }
                    }
                    if (ttft !== null && chars > 400) { ac.abort(); break; }
                }
                if (ttft === null) done({ ttft: null, error: 'stream ended with no token', total: Date.now() - t0 });
            } catch (e) {
                if (signal.aborted) done({ ttft: null, aborted: true, total: Date.now() - t0 });
                else done({ ttft: null, error: e?.name === 'AbortError' ? 'aborted at cap' : String(e?.message || e), total: Date.now() - t0 });
            } finally { clearTimeout(cap); signal.removeEventListener('abort', onAbort); }
        })();
    });
}
// --dry: fixed timings, so the wiring runs end to end without a request.
const fakeAsk = (model, signal) => new Promise((resolve) => {
    const ms = model === 'gemini-3.5-flash-lite' ? 150 : 300;
    const t = setTimeout(() => resolve({ ttft: ms }), ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve({ ttft: null, aborted: true }); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (m) => m.replace('gemini-', '').replace('-flash-lite', '-lite');

const prompts = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
const ids = Object.keys(prompts).sort().slice(0, dry ? 3 : undefined);
console.log(`window ${window}${dry ? ' DRY' : ''}: ${ids.length} prompts x 2 policies, alternating order, ${GAP_MS / 1000} s apart — ${new Date().toISOString()}`);
const rows = [];
for (const [n, id] of ids.entries()) {
    const askP = dry ? fakeAsk : (model, signal) => ask(model, prompts[id], signal);
    const order = n % 2 === 0 ? ['today', 'hedge'] : ['hedge', 'today'];   // balance any first-in-pair advantage
    for (const policy of order) {
        const r = policy === 'today' ? await runToday({ ask: askP }) : await runHedge({ ask: askP });
        rows.push({ id, policy, at: new Date().toISOString(), ...r });
        const legs = r.legs.map((l) => `${short(l.model)}@${l.startedAt}: ${l.aborted ? 'aborted' : l.error ? l.error : l.ttft + 'ms'}`).join(', ');
        console.log(`${String(n + 1).padStart(2)}/${ids.length} ${id.padEnd(8)} ${policy.padEnd(5)} ${r.wait == null ? 'NO ANSWER' : `${r.wait} ms by ${short(r.by)}`}${r.extra ? ' (+1 request)' : ''}   [${legs}]`);
        if (!dry) await sleep(GAP_MS);
    }
}
if (dry) { console.log('dry run complete; nothing written'); process.exit(0); }
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.log(`\nwrote ${OUT}\ndecide after the last window: node electron/test/golden/hedge-live.decide.mjs ${path.join(OUT_DIR, '<date>-hedge-H1.json')} ...`);
