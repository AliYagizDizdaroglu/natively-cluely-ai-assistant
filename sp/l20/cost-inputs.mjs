// Throwaway: the measured inputs for the per-interview cost estimate.
//  A. scenario50 S1+S2 hour: items, total interviewer speech seconds (clip WAV durations).
//  B. gemini-3.8-live per answered turn in L20: first-turn prompt (system size), audio response tokens, thoughts.
//  C. the app's captured answer prompts (s50k, 39): countTokens for system + user.
//  D. usageMetadata of real answers: gemini-3.8-flash at LOW (5 prompts) and default thinking (3), and the shipped
//     gemini-3.1-flash-lite at LOW (5). 13 generate calls, spaced 7 s. Key read in-process, never printed.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
const ai = new GoogleGenAI({ apiKey });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

// A
const dir = `${MAIN}/electron/test/golden/scenario50-tts-local`;
const ids = fs.readdirSync(dir).map((f) => f.replace(/\.wav$/, '')).filter((id) => /^S[12]Q\d\dF?$/.test(id)).sort();
let secs = 0;
for (const id of ids) {
    const w = fs.readFileSync(`${dir}/${id}.wav`);
    const rate = w.readUInt32LE(24), ch = w.readUInt16LE(22), bits = w.readUInt16LE(34);
    let off = 12, len = 0;
    while (off < w.length - 8) { const c = w.toString('ascii', off, off + 4); const l = w.readUInt32LE(off + 4); if (c === 'data') { len = Math.min(l, w.length - off - 8); break; } off += 8 + l; }
    secs += len / (rate * ch * bits / 8);
}
console.log(`A. S1+S2 items ${ids.length}; interviewer speech ${secs.toFixed(0)} s (${(secs / 60).toFixed(1)} min), mean ${(secs / ids.length).toFixed(1)} s per item`);

// B
const resp = [], thoughts = [], first = [];
for (const rep of [1, 2, 3]) {
    const R = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${rep}.json`, 'utf8'));
    let turnInSession = 0;
    for (const e of R.events) {
        if (e.kind === 'open') turnInSession = 0;
        if (e.kind === 'usage' && e.response > 100) { resp.push(e.response); thoughts.push(e.thoughts ?? 0); if (turnInSession++ === 0) first.push(e.prompt); }
    }
}
console.log(`B. 3.8 Live answered turns ${resp.length}: audio response tokens mean ${mean(resp).toFixed(0)} (median ${med(resp)}); thoughts mean ${mean(thoughts).toFixed(0)} (median ${med(thoughts)}); first-turn prompt median ${med(first)}`);

// C
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const pids = Object.keys(P).filter((k) => /^S[12]Q\d\dF?$/.test(k)).sort();
const counts = [];
for (const id of pids) {
    const r = await ai.models.countTokens({ model: 'gemini-3.8-flash', contents: [{ role: 'user', parts: [{ text: `${P[id].system}\n\n${P[id].user}` }] }] });
    counts.push(r.totalTokens);
}
console.log(`C. captured answer prompts ${counts.length}: input tokens mean ${mean(counts).toFixed(0)}, median ${med(counts)}, min ${Math.min(...counts)}, max ${Math.max(...counts)}`);

// D
const runs = [
    ...['S1Q02', 'S1Q06', 'S2Q01', 'S2Q08', 'S1Q03F'].map((id) => ({ model: 'gemini-3.8-flash', level: 'LOW', id })),
    ...['S1Q02', 'S2Q01', 'S2Q08'].map((id) => ({ model: 'gemini-3.8-flash', level: null, id })),
    ...['S1Q02', 'S1Q06', 'S2Q01', 'S2Q08', 'S1Q03F'].map((id) => ({ model: 'gemini-3.1-flash-lite', level: 'LOW', id })),
];
const out = [];
for (const r of runs) {
    try {
        const res = await ai.models.generateContent({
            model: r.model,
            contents: [{ role: 'user', parts: [{ text: P[r.id].user }] }],
            config: { systemInstruction: P[r.id].system, ...(r.level ? { thinkingConfig: { thinkingLevel: r.level } } : {}) },
        });
        const u = res.usageMetadata ?? {};
        out.push({ ...r, prompt: u.promptTokenCount, cand: u.candidatesTokenCount, thoughts: u.thoughtsTokenCount ?? 0 });
        console.log(`D. ${r.model} ${r.level ?? 'default'} ${r.id}: in ${u.promptTokenCount}, out ${u.candidatesTokenCount}, thoughts ${u.thoughtsTokenCount ?? 0}`);
    } catch (e) {
        console.log(`D. ${r.model} ${r.level ?? 'default'} ${r.id}: ERROR ${String(e?.message ?? e).slice(0, 160)}`);
    }
    await sleep(7000);
}
for (const [model, level] of [['gemini-3.8-flash', 'LOW'], ['gemini-3.8-flash', null], ['gemini-3.1-flash-lite', 'LOW']]) {
    const rs = out.filter((o) => o.model === model && o.level === level);
    if (rs.length) console.log(`D. ${model} ${level ?? 'default'} (n=${rs.length}): in mean ${mean(rs.map((o) => o.prompt)).toFixed(0)}, out mean ${mean(rs.map((o) => o.cand)).toFixed(0)}, thoughts mean ${mean(rs.map((o) => o.thoughts)).toFixed(0)}`);
}
fs.writeFileSync(`${HERE}/health/cost-inputs.json`, JSON.stringify({ items: ids.length, speechSecs: secs, live: { resp, thoughts, first }, promptCounts: counts, gen: out }, null, 1));
