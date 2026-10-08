// paired-latency-probe.mjs — the measurement condition 4 should have made.
//
// Every recorded latency comparison between the two Flash Lites has been confounded:
// the arms run in a fixed block order, all of one model before all of the other, so
// batch position tracks model. This probe removes that entirely. It walks s50m's own
// captured prompts and, for each one, issues BOTH models back to back, alternating
// which goes first, strictly sequentially so the two never contend for the same socket.
//
// It measures the PRIMARY's own first token and never falls back — a stall here is
// recorded as the long number it really is, not capped at the budget.
//
//   node --env-file=<MAIN>/.env paired-latency-probe.mjs [maxIds]
//
// Keys reach this process only through --env-file; nothing here prints or stores one.
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const OUT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/paired-latency.json';
const PROMPTS = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`;

const KEY = process.env.GEMINI_API_KEY?.trim();
if (!KEY) { console.error('GEMINI_API_KEY: not in the environment — rerun with --env-file'); process.exit(2); }

const ARMS = [
    { name: '3.1-lite LOW', model: 'gemini-3.1-flash-lite', thinking: 'LOW' },
    { name: '3.5-lite HIGH', model: 'gemini-3.5-flash-lite', thinking: 'HIGH' },
];
const STALL_MS = 10000;   // the app's budget under a thinking level
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
            if (ttft !== null && chars > 400) { ac.abort(); break; } // first token is the measurement; stop early
        }
        return { ttft, total: Date.now() - t0, thoughts, chars };
    } catch (e) {
        return { error: String(e?.name === 'AbortError' && 'aborted at cap' || e?.message || e), ttft: null, total: Date.now() - t0 };
    } finally { clearTimeout(cap); }
}

const prompts = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
const ids = Object.keys(prompts).sort().slice(0, Number(process.argv[2] ?? 0) || undefined);
console.log(`paired probe: ${ids.length} ids x 2 models, strictly sequential, order alternating\n`);

const rows = [];
for (const [n, id] of ids.entries()) {
    const order = n % 2 === 0 ? [0, 1] : [1, 0];   // balance any first-in-pair advantage
    const line = [];
    for (const a of order) {
        const arm = ARMS[a];
        const r = await ask(arm, prompts[id]);
        rows.push({ id, arm: arm.name, first: order[0] === a, ...r });
        line.push(`${arm.name} ${r.error ? r.error : (r.ttft === null ? 'no token' : r.ttft + 'ms')}`);
    }
    console.log(`${String(n + 1).padStart(2)}/${ids.length} ${id.padEnd(8)} ${line.join('   |   ')}`);
}
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
console.log('\n=============== PAIRED RESULT ===============');
for (const arm of ARMS) {
    const mine = rows.filter((r) => r.arm === arm.name);
    const ok = mine.filter((r) => typeof r.ttft === 'number');
    const t = ok.map((r) => r.ttft);
    console.log(`${arm.name.padEnd(14)} n=${mine.length}  p50 ${pct(t, .5)}  p90 ${pct(t, .9)}  max ${Math.max(...t)}  |  over ${STALL_MS}ms: ${t.filter((x) => x > STALL_MS).length}  errors: ${mine.filter((r) => r.error).length}`);
}
// The paired statistic: same id, same window, one difference per pair.
const diffs = [];
for (const id of ids) {
    const a = rows.find((r) => r.id === id && r.arm === ARMS[0].name);
    const b = rows.find((r) => r.id === id && r.arm === ARMS[1].name);
    if (typeof a?.ttft === 'number' && typeof b?.ttft === 'number') diffs.push(b.ttft - a.ttft);
}
const faster35 = diffs.filter((d) => d < 0).length;
console.log(`\npaired differences (3.5 minus 3.1), n=${diffs.length}: median ${pct(diffs, .5)}ms`);
console.log(`3.5-lite faster on ${faster35} of ${diffs.length} pairs, slower on ${diffs.length - faster35}`);
console.log(`\nStalls are the question: a model that stalls more should show it as ">${STALL_MS}ms" counts above.`);
