// s50j scoring: frozen verdictOf, per-arm counts, the three-twin-rep band, and paired reads.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j';

// frozen grader 8564ba96369a
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';

const ARMS = [
    ['inapp', 's50j-verdicts-inapp.json', 'interview60.judge.pairs.json'],
    ['captured-low', 's50j-verdicts-captured-low.json', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low.json'],
    ['captured-low-r2', 's50j-verdicts-captured-low-r2.json', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r2.json'],
    ['captured-low-r3', 's50j-verdicts-captured-low-r3.json', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r3.json'],
    ['captured-minimal', 's50j-verdicts-captured-minimal.json', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-minimal.json'],
    ['low(bare 3.1 LOW)', 's50j-verdicts-low.json', 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json'],
    ['captured-high(3.5 HIGH)', 's50j-verdicts-captured-high.json', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json'],
    ['high(bare 3.5 HIGH)', 's50j-verdicts-high.json', 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json'],
    ['bare 3.1 default', 's50j-verdicts-bare31.json', 'interview60.judge.pairs.gemini-3.1-flash-lite.json'],
    ['bare 3.5 default', 's50j-verdicts-bare35.json', 'interview60.judge.pairs.gemini-3.5-flash-lite.json'],
    ['qwen3.8-27b', 's50j-verdicts-qwen.json', 'interview60.judge.pairs.qwen_qwen3.8-27b.json'],
    ['gpt-oss-120b', 's50j-verdicts-gptoss.json', 'interview60.judge.pairs.openai_gpt-oss-120b.json'],
    ['flash 3.8', 's50j-verdicts-flash38.json', 'interview60.judge.pairs.gemini-3.8-flash.json'],
    ['flash 3.7', 's50j-verdicts-flash37.json', 'interview60.judge.pairs.gemini-3.7-flash.json'],
    ['flash 3.6', 's50j-verdicts-flash36.json', 'interview60.judge.pairs.gemini-3.6-flash.json'],
    ['flash 3.5', 's50j-verdicts-flash35.json', 'interview60.judge.pairs.gemini-3.5-flash.json'],
];

const V = {};
const missing = [];
for (const [name, vf] of ARMS) {
    const p = `${S}/${vf}`;
    if (!existsSync(p)) { missing.push(name); continue; }
    V[name] = JSON.parse(readFileSync(p, 'utf8'));
}
if (missing.length) console.log('NOT GRADED YET:', missing.join(', '), '\n');

const isMain = (k) => !/F$/.test(k.replace(/#.*$/, ''));
const counts = (verd, filter = () => true) => {
    const c = { acceptable: 0, weak: 0, wrong: 0 };
    for (const [k, v] of Object.entries(verd)) if (filter(k)) c[verdictOf(v)]++;
    return c;
};

console.log('=== per arm: acceptable / weak / wrong ===');
for (const [name] of ARMS) {
    if (!V[name]) continue;
    const all = counts(V[name]);
    const m = counts(V[name], isMain);
    const f = counts(V[name], (k) => !isMain(k));
    const n = all.acceptable + all.weak + all.wrong;
    console.log(`${name.padEnd(24)} n=${String(n).padStart(2)}  ${all.acceptable}/${all.weak}/${all.wrong}   mains ${m.acceptable}/${m.weak}/${m.wrong}   follow-ups ${f.acceptable}/${f.weak}/${f.wrong}`);
}

// --- the headline: the three twin reps and the live hour ---
const twins = ['captured-low', 'captured-low-r2', 'captured-low-r3'].filter((t) => V[t]);
if (twins.length && V.inapp) {
    // compare on the ids the twins actually cover
    const twinKeys = Object.keys(V[twins[0]]);
    const shared = twinKeys.filter((k) => V.inapp[k] !== undefined);
    console.log(`\n=== THE TWIN BAND (${shared.length} shared ids) ===`);
    const reps = twins.map((t) => ({ t, a: shared.filter((k) => verdictOf(V[t][k]) === 'acceptable').length }));
    for (const r of reps) console.log(`  ${r.t.padEnd(18)} ${r.a} of ${shared.length}`);
    const vals = reps.map((r) => r.a);
    const mean = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const live = shared.filter((k) => verdictOf(V.inapp[k]) === 'acceptable').length;
    console.log(`  twin band: min ${lo}  max ${hi}  mean ${mean}  spread ${hi - lo}`);
    console.log(`  LIVE HOUR: ${live} of ${shared.length}`);
    console.log(`  => live is ${live >= lo && live <= hi ? 'INSIDE' : live < lo ? `OUTSIDE (BELOW by ${lo - live})` : `OUTSIDE (ABOVE by ${live - hi})`} the twin band`);
    console.log(`  s50i for reference: live 28 vs single twin 33 of 39`);
}

// --- paired reads ---
const paired = (A, B) => {
    if (!V[A] || !V[B]) return;
    const shared = Object.keys(V[A]).filter((k) => V[B][k] !== undefined);
    let a = 0, b = 0, up = 0, down = 0;
    const moved = [];
    for (const k of shared) {
        const va = verdictOf(V[A][k]), vb = verdictOf(V[B][k]);
        if (va === 'acceptable') a++;
        if (vb === 'acceptable') b++;
        if (va === 'acceptable' && vb !== 'acceptable') { down++; moved.push(`-${k}`); }
        if (vb === 'acceptable' && va !== 'acceptable') { up++; moved.push(`+${k}`); }
    }
    console.log(`${A} (A) vs ${B} (B): n ${shared.length}  A ${a}  B ${b}  net ${b - a >= 0 ? '+' : ''}${b - a}  up ${up} down ${down}${moved.length ? '   moved: ' + moved.join(' ') : ''}`);
};
console.log('\n=== paired reads (B minus A) ===');
paired('captured-minimal', 'inapp');
paired('captured-minimal', 'captured-low');
paired('captured-low', 'inapp');
paired('low(bare 3.1 LOW)', 'inapp');
paired('bare 3.1 default', 'low(bare 3.1 LOW)');
paired('captured-low', 'captured-high(3.5 HIGH)');
paired('low(bare 3.1 LOW)', 'high(bare 3.5 HIGH)');

// --- latency + words per arm from the answers files ---
console.log('\n=== latency / words per offline arm ===');
const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const FILES = {
    'captured-low': 'interview60.answers.gemini-3.1-flash-lite_captured-low.json',
    'captured-low-r2': 'interview60.answers.gemini-3.1-flash-lite_captured-low-r2.json',
    'captured-low-r3': 'interview60.answers.gemini-3.1-flash-lite_captured-low-r3.json',
    'captured-minimal': 'interview60.answers.gemini-3.1-flash-lite_captured-minimal.json',
    'low(bare 3.1 LOW)': 'interview60.answers.gemini-3.1-flash-lite_low.json',
    'captured-high(3.5 HIGH)': 'interview60.answers.gemini-3.5-flash-lite_captured-high.json',
    'high(bare 3.5 HIGH)': 'interview60.answers.gemini-3.5-flash-lite_high.json',
};
for (const [name, f] of Object.entries(FILES)) {
    const path = `${R}/${f}`;
    if (!existsSync(path)) continue;
    const j = JSON.parse(readFileSync(path, 'utf8'));
    const rows = Array.isArray(j) ? j : Object.values(j.answers ?? j);
    const tt = [], wd = [], th = [];
    for (const r of rows) {
        if (typeof r.ttft === 'number') tt.push(r.ttft);
        if (typeof r.words === 'number') wd.push(r.words);
        if (typeof r.thoughts === 'number') th.push(r.thoughts);
    }
    console.log(`${name.padEnd(24)} ttft p50 ${tt.length ? (p(tt, .5) / 1000).toFixed(1) : '—'}s p90 ${tt.length ? (p(tt, .9) / 1000).toFixed(1) : '—'}s max ${tt.length ? (Math.max(...tt) / 1000).toFixed(1) : '—'}s   words p50 ${p(wd, .5)}   thoughts p50 ${th.length ? p(th, .5) : '—'} zero ${th.filter((x) => x === 0).length}/${th.length}`);
}
