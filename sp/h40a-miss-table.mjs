// Throwaway: for every h40a question any model missed, each run's verdict with that answer's own
// first-token time. Offline arms: blind verdicts + the answer file's per-item ttft (per successful
// call). Live hour: in-app verdict + the diag log's first token for the generateStream that answered
// it, matched by dispatch time (the match deltas are printed so a bad match shows). Reads only.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const B = `${SP}/gemma-h40a/blind`;
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const { ARM_FILES } = await import(pathToFileURL(`${SP}/gemma-h40a-blind-pairs.mjs`).href);
const vOf = ({ correctness: c, on_topic: t, delivery: d }) => c === 0 || t === 0 ? 'wrong' : c === 2 && t === 2 && d >= 1 ? 'ok' : 'weak';
const SYM = { ok: '✓', weak: '~', wrong: '✗' };
const s = (ms) => typeof ms === 'number' ? (ms / 1000).toFixed(1) : '?';
const med = (a) => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; };

// Offline: blind verdicts keyed by arm/rep/id, ttft from the arm's answer file.
const stores = Object.fromEntries(Object.entries(ARM_FILES).map(([arm, fs_]) => [arm, fs_.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))]));
const off = {}; // off[id][arm][rep-1] = { v, ttft }
for (const f of fs.readdirSync(B).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0], K = JSON.parse(fs.readFileSync(`${B}/${f}`, 'utf8')), V = JSON.parse(fs.readFileSync(`${B}/verdicts.blind-${n}.json`, 'utf8'));
    for (const [k, { arm, rep, id }] of Object.entries(K)) {
        const a = stores[arm][rep - 1][id];
        ((off[id] ??= {})[arm] ??= [])[rep - 1] = { v: vOf(V[k]), ttft: a?.ttft, words: a?.words };
    }
}

// Live hour: generateStream answers from the diag log (the ttft-split parse), matched to dispatches.
const lines = fs.readFileSync(`${RD}/verbal-diag.log`, 'utf8').split(/\r?\n/).filter((l) => /^\[2026-09-24T0[78]:/.test(l));
const ts = (l) => Date.parse(l.slice(1, 25));
const gens = [];
let cur = null;
for (const l of lines) {
    if (/=== generateStream invoked ===/.test(l)) { cur = { t0: ts(l), via: '3.1' }; continue; }
    if (!cur) continue;
    if (/verbal primary FAILED pre-token/.test(l)) cur.via = '3.5 (503)';
    else if (/__model_source:gemini-3\.5-flash-lite \(fallback\)/.test(l) && cur.via === '3.1') cur.via = '3.5 (stall)';
    const m = l.match(/first token (\d+)ms/);
    if (m) { cur.ttft = +m[1]; gens.push(cur); cur = null; }
}
const pairs = JSON.parse(fs.readFileSync(`${RD}/interview60.judge.pairs.json`, 'utf8')).items;
const inV = JSON.parse(fs.readFileSync(`${SP}/h40a-verdicts-inapp.json`, 'utf8'));
const live = {};
const deltas = [];
for (const p of pairs) {
    const d = Date.parse(p.dispatchedAt);
    const g = gens.filter((x) => x.t0 >= d - 1500 && x.t0 <= d + 5000).sort((x, y) => Math.abs(x.t0 - d) - Math.abs(y.t0 - d))[0];
    live[p.key] = { v: inV[p.key] ? vOf(inV[p.key]) : 'n/a', ttft: g?.ttft, via: g?.via ?? 'no stream' };
    deltas.push(g ? g.t0 - d : null);
}
const used = deltas.filter((x) => x !== null);
console.log(`live: ${pairs.length} dispatches, ${used.length} matched to a stream; dispatch->stream delta min ${Math.min(...used)} ms, max ${Math.max(...used)} ms; unmatched: ${pairs.filter((p, i) => deltas[i] === null).map((p) => p.key).join(',') || 'none'}`);
console.log(`live via: ${Object.entries(Object.values(live).reduce((a, x) => (a[x.via] = (a[x.via] ?? 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(', ')}`);

// Every id with a miss anywhere.
const ARMS = ['3.1-lite LOW', '3.5-lite HIGH', 'Gemma 26B MINIMAL'];
const missed = Object.keys({ ...off, ...live }).filter((id) => ARMS.some((a) => off[id]?.[a]?.some((r) => r.v !== 'ok')) || (live[id] && live[id].v !== 'ok')).sort();
console.log(`\n${missed.length} questions with any miss\n`);
console.log('| Q | 3.1 LOW r1 r2 r3 | 3.5 HIGH r1 r2 r3 | Gemma MIN r1 r2 r3 | live (who) |');
console.log('|---|---|---|---|---|');
for (const id of missed) {
    const cell = (arm) => (off[id]?.[arm] ?? []).map((r) => `${SYM[r.v]}${s(r.ttft)}`).join(' ') || '–';
    const L = live[id];
    console.log(`| ${id} | ${cell(ARMS[0])} | ${cell(ARMS[1])} | ${cell(ARMS[2])} | ${L ? `${SYM[L.v] ?? L.v}${s(L.ttft)} (${L.via})` : '–'} |`);
}

// Is a miss slower or faster than the same model's acceptable answers? (all 44 ids, 3 reps)
console.log('\nttft medians by verdict, all answers:');
for (const arm of ARMS) {
    const by = { ok: [], weak: [], wrong: [] };
    for (const id of Object.keys(off)) for (const r of off[id][arm] ?? []) if (typeof r.ttft === 'number') by[r.v].push(r.ttft);
    console.log(`  ${arm.padEnd(18)} ${Object.entries(by).map(([k, a]) => `${k} n=${a.length} p50 ${a.length ? s(med(a)) : '-'}`).join('   ')}`);
}
