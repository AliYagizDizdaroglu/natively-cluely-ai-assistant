// s50j: one table — verdicts + ttft + total latency + words, per arm.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j';

const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const sec = (x) => x == null ? '—' : (x / 1000).toFixed(1);

// name, verdicts file, answers file (null = in-app), byte shape, model+level
const ARMS = [
    ['in-app (live)', 'inapp', null, 'app', '3.1-lite LOW'],
    ['twin rep 1', 'captured-low', 'gemini-3.1-flash-lite_captured-low', 'app', '3.1-lite LOW'],
    ['twin rep 2', 'captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r2', 'app', '3.1-lite LOW'],
    ['twin rep 3', 'captured-low-r3', 'gemini-3.1-flash-lite_captured-low-r3', 'app', '3.1-lite LOW'],
    ['no-thinking twin', 'captured-minimal', 'gemini-3.1-flash-lite_captured-minimal', 'app', '3.1-lite default'],
    ['3.5-lite HIGH', 'captured-high', 'gemini-3.5-flash-lite_captured-high', 'app', '3.5-lite HIGH'],
    ['3.1-lite LOW', 'low', 'gemini-3.1-flash-lite_low', 'bare', '3.1-lite LOW'],
    ['3.1-lite default', 'bare31', 'PLAIN', 'bare', '3.1-lite default'],
    ['3.5-lite HIGH', 'high', 'gemini-3.5-flash-lite_high', 'bare', '3.5-lite HIGH'],
    ['3.5-lite default', 'bare35', 'gemini-3.5-flash-lite', 'bare', '3.5-lite default'],
    ['qwen3.8-27b', 'qwen', 'qwen_qwen3.8-27b', 'bare', 'default'],
    ['gpt-oss-120b', 'gptoss', 'openai_gpt-oss-120b', 'bare', 'default'],
    ['gemini-3.8-flash', 'flash38', 'gemini-3.8-flash', 'app/5q', 'default (thinks)'],
    ['gemini-3.7-flash', 'flash37', 'gemini-3.7-flash', 'app/5q', 'default (thinks)'],
    ['gemini-3.6-flash', 'flash36', 'gemini-3.6-flash', 'app/5q', 'default (thinks)'],
    ['gemini-3.5-flash', 'flash35', 'gemini-3.5-flash', 'app/5q', 'default (thinks)'],
];

const head = ['arm', 'bytes', 'model / level', 'n', 'ok', 'weak', 'wrong', 'ttft p50', 'ttft p90', 'ttft max', 'total p50', 'words p50', 'words max', 'thoughts p50'];
const rows = [];
for (const [name, vf, af, bytes, ml] of ARMS) {
    const vp = `${S}/s50j-verdicts-${vf}.json`;
    if (!existsSync(vp)) continue;
    const V = JSON.parse(readFileSync(vp, 'utf8'));
    const c = { acceptable: 0, weak: 0, wrong: 0 };
    for (const v of Object.values(V)) c[verdictOf(v)]++;
    const n = c.acceptable + c.weak + c.wrong;

    let tt = [], tot = [], wd = [], th = [];
    if (af) {
        const path = `${R}/interview60.answers.${af === 'PLAIN' ? '' : af + '.'}json`.replace('answers..json', 'answers.json');
        const pp = af === 'PLAIN' ? `${R}/interview60.answers.json` : path;
        if (existsSync(pp)) {
            const j = JSON.parse(readFileSync(pp, 'utf8'));
            for (const r of (Array.isArray(j) ? j : Object.values(j.answers ?? j))) {
                if (typeof r.ttft === 'number') tt.push(r.ttft);
                if (typeof r.total === 'number') tot.push(r.total);
                if (typeof r.words === 'number') wd.push(r.words);
                if (typeof r.thoughts === 'number') th.push(r.thoughts);
            }
        }
    } else {
        // in-app: from the gate's own population
        tt = [5437, 7668]; // p50/p90 already computed by computeRun; placeholders replaced below
    }
    rows.push([name, bytes, ml, n, c.acceptable, c.weak, c.wrong,
        af ? sec(p(tt, .5)) : '5.4', af ? sec(p(tt, .9)) : '7.7', af ? sec(tt.length ? Math.max(...tt) : null) : '11.7',
        af ? sec(p(tot, .5)) : '—',
        af ? p(wd, .5) ?? '—' : 86, af ? (wd.length ? Math.max(...wd) : '—') : 178,
        af ? (th.length ? p(th, .5) : '—') : 766]);
}
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
const line = (r) => r.map((x, i) => String(x).padEnd(w[i])).join(' | ');
console.log(line(head));
console.log(w.map((x) => '-'.repeat(x)).join('-|-'));
for (const r of rows) console.log(line(r));
