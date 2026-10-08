// h40a BASELINE: bands on the shared captured ids (no pass rule — a baseline sets bands), the
// mains/follow-ups split, the bare arms, R13/R31, and a PROPOSED focused five (s50m-bands.mjs +
// repick-focused.mjs, repointed at h40a-verdicts-*). Frozen verdictOf.
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';

const TAGS = readdirSync(S).filter((f) => /^h40a-verdicts-.*\.json$/.test(f)).map((f) => f.slice('h40a-verdicts-'.length, -'.json'.length));
const V = Object.fromEntries(TAGS.map((t) => [t, JSON.parse(readFileSync(`${S}/h40a-verdicts-${t}.json`, 'utf8'))]));
console.log(`verdict files: ${TAGS.length} (${TAGS.sort().join(', ')})`);

const L31 = ['captured-low', 'captured-low-r2', 'captured-low-r3'], H35 = ['captured-high', 'captured-high-r2', 'captured-high-r3'];
const captured = [...L31, ...H35, 'captured-minimal'].filter((t) => V[t]);
let shared = null;
for (const t of [...captured, 'inapp']) { if (!V[t]) continue; const ks = new Set(Object.keys(V[t])); shared = shared === null ? ks : new Set([...shared].filter((k) => ks.has(k))); }
const SH = [...shared].sort();
const score = (tag, keys) => {
    const v = V[tag]; if (!v) return null;
    let a = 0, w = 0, x = 0;
    for (const k of keys) { const d = v[k]; if (!d) continue; const r = verdictOf(d); if (r === 'acceptable') a++; else if (r === 'weak') w++; else x++; }
    return { a, w, x, n: a + w + x };
};

console.log(`\nshared ids: ${SH.length}   (in-app has ${Object.keys(V.inapp ?? {}).length}; not shared: ${Object.keys(V.inapp ?? {}).filter((k) => !shared.has(k)).join(',') || '-'})`);
console.log('ARM                     acceptable / weak / wrong   (shared ids)');
for (const t of ['inapp', ...captured]) { const s = score(t, SH); if (s) console.log(`  ${t.padEnd(20)} ${String(s.a).padStart(3)} / ${String(s.w).padStart(2)} / ${String(s.x).padStart(2)}   of ${s.n}`); }

const band = (tags) => { const xs = tags.map((t) => score(t, SH)).filter(Boolean).map((s) => s.a); if (!xs.length) return null; const mean = xs.reduce((n, x) => n + x, 0) / xs.length; return { reps: xs, min: Math.min(...xs), max: Math.max(...xs), mean: Math.round(mean * 10) / 10, spread: Math.max(...xs) - Math.min(...xs) }; };
const b31 = band(L31), b35 = band(H35), live = score('inapp', SH);
console.log('\nBANDS on the shared ids (baseline: no pass rule)');
if (b31) console.log(`  3.1-lite LOW   reps ${b31.reps.join('/')}   min ${b31.min} max ${b31.max} mean ${b31.mean} spread ${b31.spread}`);
if (b35) console.log(`  3.5-lite HIGH  reps ${b35.reps.join('/')}   min ${b35.min} max ${b35.max} mean ${b35.mean} spread ${b35.spread}`);
if (live && b31) console.log(`  LIVE hour      ${live.a}   -> ${live.a > b31.max ? 'ABOVE' : live.a < b31.min ? 'BELOW' : 'INSIDE'} the 3.1 band`);
if (b31 && b35) {
    let up = 0, down = 0;
    for (const k of SH) {
        const ok = (tags) => tags.map((t) => V[t]?.[k]).filter(Boolean).map(verdictOf).filter((x) => x === 'acceptable').length;
        if (ok(H35) > ok(L31)) up++; else if (ok(H35) < ok(L31)) down++;
    }
    console.log(`  3.5 vs 3.1: mean ${b35.mean - b31.mean >= 0 ? '+' : ''}${Math.round((b35.mean - b31.mean) * 10) / 10}, per-id up ${up} / down ${down}, bands ${b35.min > b31.max || b31.min > b35.max ? 'do NOT overlap' : 'overlap'}`);
}

const mains = SH.filter((k) => !/F\d*$/.test(k)), fups = SH.filter((k) => /F\d*$/.test(k));
console.log(`\nmains ${mains.length} / follow-ups ${fups.length} among the shared ids`);
console.log('ARM                     mains a/w/x     follow-ups a/w/x');
for (const t of ['inapp', ...captured]) { const m = score(t, mains), f = score(t, fups); if (m) console.log(`  ${t.padEnd(20)} ${m.a}/${m.w}/${m.x}`.padEnd(38) + `${f.a}/${f.w}/${f.x}`); }
const inAll = V.inapp ? Object.keys(V.inapp) : [];
if (inAll.length) { const m = score('inapp', inAll.filter((k) => !/F\d*$/.test(k))), f = score('inapp', inAll.filter((k) => /F\d*$/.test(k))); console.log(`  in-app, ALL ${inAll.length} items: mains ${m.a}/${m.w}/${m.x} of ${m.n}, follow-ups ${f.a}/${f.w}/${f.x} of ${f.n}`); }

console.log('\nBARE / OTHER ARMS on their own items');
for (const t of TAGS.filter((t) => !captured.includes(t) && t !== 'inapp').sort()) { const s = score(t, Object.keys(V[t])); if (s) console.log(`  ${t.padEnd(20)} ${s.a}/${s.w}/${s.x} of ${s.n}`); }

// Weak/wrong in-app items with the grader's reason, and R13/R31 across arms (the lossy hearings).
const pairs = JSON.parse(readFileSync(`${RD}/interview60.judge.pairs.json`, 'utf8'));
const heardOf = Object.fromEntries((Array.isArray(pairs) ? pairs : Object.values(pairs)).map((p) => [p.id, p]));
console.log('\nIN-APP items not acceptable:');
for (const [k, d] of Object.entries(V.inapp ?? {}).sort()) { const r = verdictOf(d); if (r !== 'acceptable') console.log(`  ${k.padEnd(6)} ${r.padEnd(5)} c${d.correctness} t${d.on_topic} d${d.delivery}  ${String(d.reason ?? d.notes ?? '').slice(0, 160)}`); }
for (const id of ['R13', 'R31']) {
    const cells = ['inapp', ...captured, 'low', 'high', 'bare31', 'bare35'].filter((t) => V[t]?.[id]).map((t) => `${t} ${verdictOf(V[t][id])[0]}`);
    console.log(`\n${id}: ${cells.join('  ')}`);
    const h = heardOf[id]; if (h) console.log(`   asked: ${h.question.slice(0, 200)}\n   heard: ${String(h.heard).slice(0, 200)}  (source ${h.source})`);
    if (V.inapp?.[id]) console.log(`   in-app grader: ${String(V.inapp[id].reason ?? V.inapp[id].notes ?? '').slice(0, 240)}`);
}

// PROPOSED focused five — rank the mains on APP bytes (what a focused arm replays); only ids the
// hour captured (a focused arm replays captured prompts and an uncaptured id kills the arm).
const APP = ['inapp', ...captured];
const capturedIds = new Set(Object.keys(V['captured-low'] ?? {}));
const rows = [];
for (const id of [...new Set(APP.flatMap((t) => Object.keys(V[t] ?? {})))].filter((k) => !/F\d*$/.test(k) && capturedIds.has(k)).sort()) {
    let n = 0, ok = 0; for (const t of APP) { const d = V[t]?.[id]; if (d) { n++; if (verdictOf(d) === 'acceptable') ok++; } }
    let bn = 0, bok = 0; for (const t of ['low', 'high', 'bare31', 'bare35', 'qwen', 'gptoss']) { const d = V[t]?.[id]; if (d) { bn++; if (verdictOf(d) === 'acceptable') bok++; } }
    rows.push({ id, ok, n, bok, bn, rate: n ? ok / n : 1 });
}
rows.sort((x, y) => x.rate - y.rate || (x.bn ? x.bok / x.bn : 1) - (y.bn ? y.bok / y.bn : 1) || x.id.localeCompare(y.id));
console.log('\nmains ranked on app bytes (hardest first):');
for (const r of rows.slice(0, 10)) console.log(`   ${r.id.padEnd(5)} app ${r.ok}/${r.n}   bare ${r.bok}/${r.bn}`);
const easy = rows.filter((r) => r.ok === r.n);
console.log(`   ... ${easy.length} mains pass on every app-bytes arm: ${easy.map((r) => r.id).join(',')}`);
