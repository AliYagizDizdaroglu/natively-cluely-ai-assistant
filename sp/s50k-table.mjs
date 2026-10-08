// s50k: one table — verdicts + ttft + total latency + words + thoughts, per arm.
// In-app latency/words come from the harness's own computeRun, not from a hand-copied number.
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const R = `${G}/interview60.runs/2026-09-20T11-22-43-s50k`;

const { computeRun } = await import(pathToFileURL(`${G}/interview60.metrics.mjs`).href);
const m = computeRun(R);

const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const sec = (x) => x == null ? '—' : (x / 1000).toFixed(1);

const ARMS = [
    ['in-app (live)', 'inapp', null, 'app', '3.1-lite LOW'],
    ['twin rep 1', 'captured-low', 'gemini-3.1-flash-lite_captured-low', 'app', '3.1-lite LOW'],
    ['twin rep 2', 'captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r2', 'app', '3.1-lite LOW'],
    ['twin rep 3', 'captured-low-r3', 'gemini-3.1-flash-lite_captured-low-r3', 'app', '3.1-lite LOW'],
    ['no-thinking twin', 'captured-minimal', 'gemini-3.1-flash-lite_captured-minimal', 'app', '3.1-lite default'],
    ['3.5 HIGH twin r1', 'captured-high', 'gemini-3.5-flash-lite_captured-high', 'app', '3.5-lite HIGH'],
    ['3.5 HIGH twin r2', 'captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r2', 'app', '3.5-lite HIGH'],
    ['3.5 HIGH twin r3', 'captured-high-r3', 'gemini-3.5-flash-lite_captured-high-r3', 'app', '3.5-lite HIGH'],
    ['bare 3.1 LOW', 'low', 'gemini-3.1-flash-lite_low', 'bare', '3.1-lite LOW'],
    ['bare 3.1 default', 'bare31', 'PLAIN', 'bare', '3.1-lite default'],
    ['bare 3.5 HIGH', 'high', 'gemini-3.5-flash-lite_high', 'bare', '3.5-lite HIGH'],
    ['bare 3.5 default', 'bare35', 'gemini-3.5-flash-lite', 'bare', '3.5-lite default'],
    ['qwen3.8-27b', 'qwen', 'qwen_qwen3.8-27b', 'bare', 'default'],
    ['gpt-oss-120b', 'gptoss', 'openai_gpt-oss-120b', 'bare', 'default'],
    ['gemini-3.8-flash', 'flash38', 'gemini-3.8-flash', 'app/focus', 'default'],
    ['gemini-3.7-flash', 'flash37', 'gemini-3.7-flash', 'app/focus', 'default'],
    ['gemini-3.6-flash', 'flash36', 'gemini-3.6-flash', 'app/focus', 'default'],
    ['gemini-3.5-flash', 'flash35', 'gemini-3.5-flash', 'app/focus', 'default'],
];

const head = ['arm', 'bytes', 'model / level', 'n', 'ok', 'weak', 'wrong', 'ttft p50', 'p90', 'max', 'words p50', 'w max', 'thoughts p50'];
const rows = [];
for (const [name, vf, af, bytes, ml] of ARMS) {
    const vp = `${S}/s50k-verdicts-${vf}.json`;
    if (!existsSync(vp)) continue;
    const V = JSON.parse(readFileSync(vp, 'utf8'));
    const c = { acceptable: 0, weak: 0, wrong: 0 };
    for (const v of Object.values(V)) c[verdictOf(v)]++;
    const n = c.acceptable + c.weak + c.wrong;

    if (!af) {
        rows.push([name, bytes, ml, n, c.acceptable, c.weak, c.wrong,
            sec(m.ttft?.p50), sec(m.ttft?.p90), sec(m.ttft?.max ?? null),
            m.length?.p50 ?? m.budget?.p50 ?? '—', m.budget?.max ?? '—', '—']);
        continue;
    }
    const pp = af === 'PLAIN' ? `${R}/interview60.answers.json` : `${R}/interview60.answers.${af}.json`;
    const tt = [], wd = [], th = [];
    if (existsSync(pp)) {
        const j = JSON.parse(readFileSync(pp, 'utf8'));
        for (const r of Object.values(j)) {
            if (typeof r?.ttft === 'number') tt.push(r.ttft);
            if (typeof r?.words === 'number') wd.push(r.words);
            if (typeof r?.thoughts === 'number') th.push(r.thoughts);
        }
    }
    rows.push([name, bytes, ml, n, c.acceptable, c.weak, c.wrong,
        sec(p(tt, .5)), sec(p(tt, .9)), sec(tt.length ? Math.max(...tt) : null),
        p(wd, .5) ?? '—', wd.length ? Math.max(...wd) : '—', th.length ? p(th, .5) : '—']);
}
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
const line = (r) => r.map((x, i) => String(x).padEnd(w[i])).join(' | ');
console.log(line(head));
console.log(w.map((x) => '-'.repeat(x)).join('-|-'));
for (const r of rows) console.log(line(r));

console.log(`\nin-app gate numbers: ttft p50 ${sec(m.ttft?.p50)} p90 ${sec(m.ttft?.p90)}   length row: p90 ${m.length?.p90} over85 ${m.length?.over85}/${m.length?.n} over150 ${m.length?.over150}/${m.length?.n}`);
