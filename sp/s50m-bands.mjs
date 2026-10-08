// s50m: both bands on the SHARED ids, plus the paired reads. Frozen verdictOf.
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';

const load = (tag) => {
    const f = `${S}/s50m-verdicts-${tag}.json`;
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};
const TAGS = readdirSync(S).filter((f) => /^s50m-verdicts-.*\.json$/.test(f)).map((f) => f.slice('s50m-verdicts-'.length, -'.json'.length));
const V = Object.fromEntries(TAGS.map((t) => [t, load(t)]));

// the ids every captured arm + the live hour share
const captured = ['captured-low', 'captured-low-r2', 'captured-low-r3', 'captured-high', 'captured-high-r2', 'captured-high-r3', 'captured-minimal'].filter((t) => V[t]);
let shared = null;
for (const t of [...captured, 'inapp']) {
    if (!V[t]) continue;
    const ks = new Set(Object.keys(V[t]));
    shared = shared === null ? ks : new Set([...shared].filter((k) => ks.has(k)));
}
const SH = [...shared].sort();

const score = (tag, keys) => {
    const v = V[tag]; if (!v) return null;
    let a = 0, w = 0, x = 0;
    for (const k of keys) { const d = v[k]; if (!d) continue; const r = verdictOf(d); if (r === 'acceptable') a++; else if (r === 'weak') w++; else x++; }
    return { a, w, x, n: a + w + x };
};

console.log(`shared ids: ${SH.length}\n`);
console.log('ARM                     acceptable / weak / wrong   (shared ids)');
for (const t of ['inapp', ...captured]) {
    const s = score(t, SH); if (!s) continue;
    console.log(`  ${t.padEnd(20)} ${String(s.a).padStart(3)} / ${String(s.w).padStart(2)} / ${String(s.x).padStart(2)}   of ${s.n}`);
}

const band = (tags) => {
    const xs = tags.map((t) => score(t, SH)).filter(Boolean).map((s) => s.a);
    if (!xs.length) return null;
    const mean = xs.reduce((n, x) => n + x, 0) / xs.length;
    return { reps: xs, min: Math.min(...xs), max: Math.max(...xs), mean: Math.round(mean * 10) / 10, spread: Math.max(...xs) - Math.min(...xs) };
};
const b31 = band(['captured-low', 'captured-low-r2', 'captured-low-r3']);
const b35 = band(['captured-high', 'captured-high-r2', 'captured-high-r3']);
const live = score('inapp', SH);

console.log('\nBANDS on the shared ids');
if (b31) console.log(`  3.1-lite LOW   reps ${b31.reps.join('/')}   min ${b31.min} max ${b31.max} mean ${b31.mean} spread ${b31.spread}`);
if (b35) console.log(`  3.5-lite HIGH  reps ${b35.reps.join('/')}   min ${b35.min} max ${b35.max} mean ${b35.mean} spread ${b35.spread}`);
if (live) console.log(`  LIVE hour      ${live.a}   -> ${b31 ? (live.a > b31.max ? 'ABOVE the 3.1 band' : live.a < b31.min ? 'BELOW the 3.1 band' : 'INSIDE the 3.1 band') : ''}`);

if (b31 && b35) {
    console.log('\nMODEL DECISION RULE');
    const noOverlap = b35.min > b31.max;
    const meanGain = Math.round((b35.mean - b31.mean) * 10) / 10;
    // paired up/down across the three rep-pairs, per id
    let up = 0, down = 0;
    for (const k of SH) {
        const a = ['captured-low', 'captured-low-r2', 'captured-low-r3'].map((t) => V[t] && V[t][k]).filter(Boolean).map(verdictOf);
        const b = ['captured-high', 'captured-high-r2', 'captured-high-r3'].map((t) => V[t] && V[t][k]).filter(Boolean).map(verdictOf);
        const ok = (r) => r.filter((x) => x === 'acceptable').length;
        if (ok(b) > ok(a)) up++; else if (ok(b) < ok(a)) down++;
    }
    console.log(`  3.5 band min ${b35.min} vs 3.1 band max ${b31.max}  -> no overlap? ${noOverlap ? 'YES' : 'NO'}`);
    console.log(`  mean gain ${meanGain >= 0 ? '+' : ''}${meanGain}   per-id up ${up} / down ${down}`);
    const earns = noOverlap || (meanGain >= 4 && up >= 2 * down && down > 0) || (meanGain >= 4 && down === 0);
    console.log(`  => 3.5 HIGH ${earns ? 'EARNS the primary slot' : 'does NOT earn the primary slot — tie, latency and length decide'}`);
}

// mains-only view, for comparison with the historical mains/20 numbers
const mains = SH.filter((k) => !/F$/.test(k));
const fups = SH.filter((k) => /F$/.test(k));
console.log(`\nmains ${mains.length} / follow-ups ${fups.length} among the shared ids`);
console.log('ARM                     mains a/w/x     follow-ups a/w/x');
for (const t of ['inapp', ...captured]) {
    const m = score(t, mains), f = score(t, fups); if (!m) continue;
    console.log(`  ${t.padEnd(20)} ${m.a}/${m.w}/${m.x}`.padEnd(38) + `${f.a}/${f.w}/${f.x}`);
}

// the 20-item bare arms score on their own keys
console.log('\nBARE / OTHER ARMS on their own items');
for (const t of TAGS.filter((t) => !captured.includes(t) && t !== 'inapp')) {
    const s = score(t, Object.keys(V[t])); if (!s) continue;
    console.log(`  ${t.padEnd(20)} ${s.a}/${s.w}/${s.x} of ${s.n}`);
}
