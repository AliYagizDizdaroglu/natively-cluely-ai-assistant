// 3.1-lite LOW vs 3.5-lite HIGH on every axis s50m measured, three reps a side.
// Everything here comes from the same hour, the same captured bytes, the same window.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';

const A = { name: '3.1-lite LOW', tags: ['captured-low', 'captured-low-r2', 'captured-low-r3'], files: ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3'], bare: 'low', bareFile: 'gemini-3.1-flash-lite_low' };
const B = { name: '3.5-lite HIGH', tags: ['captured-high', 'captured-high-r2', 'captured-high-r3'], files: ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3'], bare: 'high', bareFile: 'gemini-3.5-flash-lite_high' };

const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const pc = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const V = (t) => JSON.parse(readFileSync(`${S}/s50m-verdicts-${t}.json`, 'utf8'));
const ANS = (f) => existsSync(`${R}/interview60.answers.${f}.json`) ? JSON.parse(readFileSync(`${R}/interview60.answers.${f}.json`, 'utf8')) : {};
const sec = (x) => x == null ? '—' : (x / 1000).toFixed(1);

const shared = [...new Set(Object.keys(V(A.tags[0])))].filter((k) => Object.keys(V(B.tags[0])).includes(k)).sort();
const row = [];

function side(side_) {
    const vs = side_.tags.map(V);
    const as = side_.files.map(ANS);
    const acc = vs.map((v) => shared.filter((k) => v[k] && verdictOf(v[k]) === 'acceptable').length);
    const wrong = vs.map((v) => shared.filter((k) => v[k] && verdictOf(v[k]) === 'wrong').length);
    let d0 = 0, d1 = 0, d2 = 0, c1 = 0, o1 = 0;
    for (const v of vs) for (const k of shared) {
        const d = v[k]; if (!d) continue;
        d.delivery === 0 ? d0++ : d.delivery === 1 ? d1++ : d2++;
        if (d.correctness === 1) c1++;
        if (d.on_topic === 1) o1++;
    }
    const tt = [], wd = [], th = [];
    const perRepTtft = [], perRepWords = [];
    for (const a of as) {
        const t = [], w = [];
        for (const r of Object.values(a)) {
            if (typeof r?.ttft === 'number') { tt.push(r.ttft); t.push(r.ttft); }
            if (typeof r?.words === 'number') { wd.push(r.words); w.push(r.words); }
            if (typeof r?.thoughts === 'number') th.push(r.thoughts);
        }
        perRepTtft.push({ p50: pc(t, .5), p90: pc(t, .9), max: t.length ? Math.max(...t) : null });
        perRepWords.push({ p50: pc(w, .5), max: w.length ? Math.max(...w) : null });
    }
    const bareV = V(side_.bare), bareKeys = Object.keys(bareV);
    const bareAcc = bareKeys.filter((k) => verdictOf(bareV[k]) === 'acceptable').length;
    const bareA = ANS(side_.bareFile);
    const bareTt = [], bareWd = [];
    for (const r of Object.values(bareA)) { if (typeof r?.ttft === 'number') bareTt.push(r.ttft); if (typeof r?.words === 'number') bareWd.push(r.words); }
    return { acc, wrong, d0, d1, d2, c1, o1, tt, wd, th, perRepTtft, perRepWords, bareAcc, bareN: bareKeys.length, bareTt, bareWd };
}
const a = side(A), b = side(B);
const mean = (xs) => Math.round((xs.reduce((n, x) => n + x, 0) / xs.length) * 10) / 10;

const L = (label, x, y) => console.log(`  ${label.padEnd(38)} ${String(x).padEnd(24)} ${y}`);
console.log(`s50m head to head on ${shared.length} shared questions, three reps a side\n`);
console.log(`  ${''.padEnd(38)} ${A.name.padEnd(24)} ${B.name}`);
console.log('  ' + '-'.repeat(86));
console.log('  QUALITY');
L('acceptable, per rep', a.acc.join(' / '), b.acc.join(' / '));
L('band min - max', `${Math.min(...a.acc)} - ${Math.max(...a.acc)}`, `${Math.min(...b.acc)} - ${Math.max(...b.acc)}`);
L('mean', mean(a.acc), mean(b.acc));
L('spread', Math.max(...a.acc) - Math.min(...a.acc), Math.max(...b.acc) - Math.min(...b.acc));
L('wrong answers, all reps', a.wrong.reduce((n, x) => n + x, 0), b.wrong.reduce((n, x) => n + x, 0));
L('bare bytes, 20 mains', `${a.bareAcc} of ${a.bareN}`, `${b.bareAcc} of ${b.bareN}`);

console.log('\n  WHY ANSWERS MISSED   (counts over 3 reps x ' + shared.length + ')');
L('correctness 1, an omitted sub-part', a.c1, b.c1);
L('on-topic 1, partial coverage', a.o1, b.o1);
L('delivery 0, unspeakable text', a.d0, b.d0);
L('delivery 1, length or register', a.d1, b.d1);
L('delivery 2, clean', a.d2, b.d2);

console.log('\n  LATENCY, time to first token, seconds');
for (let i = 0; i < 3; i++) L(`rep ${i + 1}  p50 / p90 / max`, `${sec(a.perRepTtft[i].p50)} / ${sec(a.perRepTtft[i].p90)} / ${sec(a.perRepTtft[i].max)}`, `${sec(b.perRepTtft[i].p50)} / ${sec(b.perRepTtft[i].p90)} / ${sec(b.perRepTtft[i].max)}`);
L('pooled p50 / p90 / max', `${sec(pc(a.tt, .5))} / ${sec(pc(a.tt, .9))} / ${sec(Math.max(...a.tt))}`, `${sec(pc(b.tt, .5))} / ${sec(pc(b.tt, .9))} / ${sec(Math.max(...b.tt))}`);
L('answers over the 10 s stall budget', a.tt.filter((x) => x > 10000).length, b.tt.filter((x) => x > 10000).length);
L('bare bytes p50 / p90', `${sec(pc(a.bareTt, .5))} / ${sec(pc(a.bareTt, .9))}`, `${sec(pc(b.bareTt, .5))} / ${sec(pc(b.bareTt, .9))}`);

console.log('\n  LENGTH, spoken words');
L('pooled p50 / p90 / max', `${pc(a.wd, .5)} / ${pc(a.wd, .9)} / ${Math.max(...a.wd)}`, `${pc(b.wd, .5)} / ${pc(b.wd, .9)} / ${Math.max(...b.wd)}`);
L('over 85 words', `${a.wd.filter((x) => x > 85).length} of ${a.wd.length}`, `${b.wd.filter((x) => x > 85).length} of ${b.wd.length}`);
L('over 150 words, the delivery-0 zone', `${a.wd.filter((x) => x > 150).length} of ${a.wd.length}`, `${b.wd.filter((x) => x > 150).length} of ${b.wd.length}`);
L('bare bytes p50', pc(a.bareWd, .5), pc(b.bareWd, .5));

console.log('\n  THINKING SPEND, tokens per answer');
L('p50 / max', `${pc(a.th, .5)} / ${Math.max(...a.th)}`, `${pc(b.th, .5)} / ${Math.max(...b.th)}`);
L('answers with zero thoughts', a.th.filter((x) => x === 0).length, b.th.filter((x) => x === 0).length);

// per-question: how many of 3 reps each model got acceptable
const va = A.tags.map(V), vb = B.tags.map(V);
const okCount = (vs, k) => vs.filter((v) => v[k] && verdictOf(v[k]) === 'acceptable').length;
const onlyA = [], onlyB = [], bothFail = [], bothOk = [];
for (const k of shared) {
    const x = okCount(va, k), y = okCount(vb, k);
    if (x === 3 && y === 3) bothOk.push(k);
    else if (x === 0 && y === 0) bothFail.push(k);
    else if (y > x) onlyB.push(`${k}(${x}->${y})`);
    else if (x > y) onlyA.push(`${k}(${y}->${x})`);
}
console.log('\n  WHERE THEY DIFFER, reps acceptable out of 3');
console.log(`    solid for both, 3/3:        ${bothOk.length}  ${bothOk.join(' ')}`);
console.log(`    failed by both, 0/3:        ${bothFail.length}  ${bothFail.join(' ')}`);
console.log(`    3.5 HIGH better on:         ${onlyB.length}  ${onlyB.join(' ')}`);
console.log(`    3.1 LOW better on:          ${onlyA.length}  ${onlyA.join(' ')}`);
