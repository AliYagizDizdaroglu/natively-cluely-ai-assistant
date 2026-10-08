// The five hardest questions (FOCUSED_ONLY), every arm that answered them, s50j.
// n=5 is far under any noise floor — this is a signal, not a measurement.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j';
const FIVE = ['S1Q02', 'S1Q06', 'S2Q07', 'S2Q09', 'S2Q10'];

const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const mark = (v) => !v ? ' · ' : verdictOf(v) === 'acceptable' ? ' ok' : verdictOf(v) === 'weak' ? ' wk' : 'WRG';

// name, verdicts file, answers file (for words/ttft), byte shape
const ARMS = [
    ['in-app (live)            3.1 LOW', 'inapp', null, 'app'],
    ['twin rep 1               3.1 LOW', 'captured-low', 'gemini-3.1-flash-lite_captured-low', 'app'],
    ['twin rep 2               3.1 LOW', 'captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r2', 'app'],
    ['twin rep 3               3.1 LOW', 'captured-low-r3', 'gemini-3.1-flash-lite_captured-low-r3', 'app'],
    ['no-thinking twin  3.1 default', 'captured-minimal', 'gemini-3.1-flash-lite_captured-minimal', 'app'],
    ['3.5-LITE HIGH  (the candidate)', 'captured-high', 'gemini-3.5-flash-lite_captured-high', 'app'],
    ['gemini-3.8-flash   (big)', 'flash38', 'gemini-3.8-flash', 'app'],
    ['gemini-3.7-flash   (big)', 'flash37', 'gemini-3.7-flash', 'app'],
    ['gemini-3.6-flash   (big)', 'flash36', 'gemini-3.6-flash', 'app'],
    ['gemini-3.5-flash   (big)', 'flash35', 'gemini-3.5-flash', 'app'],
    ['bare 3.1 LOW', 'low', 'gemini-3.1-flash-lite_low', 'bare'],
    ['bare 3.5-LITE HIGH', 'high', 'gemini-3.5-flash-lite_high', 'bare'],
    ['bare qwen3.8-27b', 'qwen', 'qwen_qwen3.8-27b', 'bare'],
    ['bare gpt-oss-120b', 'gptoss', 'openai_gpt-oss-120b', 'bare'],
];

console.log('The five hardest questions (n=5 — signal, not measurement)\n');
console.log('arm'.padEnd(32), 'bytes', FIVE.map((f) => f.padStart(6)).join(''), '   ok/5   words p50');
console.log('-'.repeat(32) + ' ----- ' + '-'.repeat(36) + ' ------  ---------');
for (const [name, vf, af, bytes] of ARMS) {
    const p = `${S}/s50j-verdicts-${vf}.json`;
    if (!existsSync(p)) continue;
    const V = JSON.parse(readFileSync(p, 'utf8'));
    const cells = FIVE.map((id) => mark(V[id]));
    const ok = FIVE.filter((id) => V[id] && verdictOf(V[id]) === 'acceptable').length;
    let w = '—';
    if (af) {
        const ap = `${R}/interview60.answers.${af}.json`;
        if (existsSync(ap)) {
            const j = JSON.parse(readFileSync(ap, 'utf8'));
            const rows = (Array.isArray(j) ? j : Object.values(j.answers ?? j)).filter((r) => FIVE.includes(r.id));
            const ws = rows.map((r) => r.words).filter((x) => typeof x === 'number').sort((a, b) => a - b);
            if (ws.length) w = String(ws[Math.floor(ws.length / 2)]);
        }
    }
    console.log(name.padEnd(32), bytes.padEnd(5), cells.map((c) => c.padStart(6)).join(''), String(ok).padStart(5) + '/5', String(w).padStart(10));
}

// which questions are hard for everyone vs hard only for lite?
console.log('\nper question, across the app-bytes arms:');
const APP = ARMS.filter((a) => a[3] === 'app');
for (const id of FIVE) {
    const res = APP.map(([n, vf]) => {
        const p = `${S}/s50j-verdicts-${vf}.json`;
        if (!existsSync(p)) return null;
        const V = JSON.parse(readFileSync(p, 'utf8'));
        return V[id] ? { n, v: verdictOf(V[id]) } : null;
    }).filter(Boolean);
    const ok = res.filter((r) => r.v === 'acceptable').length;
    const lite = res.filter((r) => /3\.1 LOW|3\.1 default|LITE/.test(r.n));
    const big = res.filter((r) => /\(big\)/.test(r.n));
    console.log(`  ${id}  ${ok}/${res.length} arms ok   |   lite arms ${lite.filter((r) => r.v === 'acceptable').length}/${lite.length}   big Flash ${big.filter((r) => r.v === 'acceptable').length}/${big.length}`);
}
