// Throwaway: (1) 3.5-lite HIGH vs 3.1-lite LOW first-token spread per rep on h40a, (2) an HTML page of
// every question any model missed in the blind 3-arm grading, with each model's answers and the
// grader's reason, plus the live hour's own misses. Reads only; writes h40a-misses.html here.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const BLIND = `${SP}/gemma-h40a/blind`;
const { ARM_FILES, IDS } = await import(pathToFileURL(`${SP}/gemma-h40a-blind-pairs.mjs`).href);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const verdictOf = ({ correctness, on_topic, delivery }) => correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';

// ── (1) latency per rep ──
const WIN = { 'captured-high': '12:27–12:33', 'captured-high-r2': '12:33–12:40', 'captured-high-r3': '12:40–12:49', high: '12:49–12:55', 'gemini-3.5-flash-lite': '11:24–11:29',
    'captured-low': '12:06–12:13', 'captured-low-r2': '12:13–12:21', 'captured-low-r3': '12:21–12:27' };
const lat = [];
for (const [label, file, tag] of [
    ['3.5 HIGH captured, run 1', 'interview60.answers.gemini-3.5-flash-lite_captured-high.json', 'captured-high'],
    ['3.5 HIGH captured, run 2', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r2.json', 'captured-high-r2'],
    ['3.5 HIGH captured, run 3', 'interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json', 'captured-high-r3'],
    ['3.5 HIGH bare', 'interview60.answers.gemini-3.5-flash-lite_high.json', 'high'],
    ['3.1 LOW captured, run 1', 'interview60.answers.gemini-3.1-flash-lite_captured-low.json', 'captured-low'],
    ['3.1 LOW captured, run 2', 'interview60.answers.gemini-3.1-flash-lite_captured-low-r2.json', 'captured-low-r2'],
    ['3.1 LOW captured, run 3', 'interview60.answers.gemini-3.1-flash-lite_captured-low-r3.json', 'captured-low-r3'],
]) {
    const t = Object.values(JSON.parse(fs.readFileSync(`${RD}/${file}`, 'utf8'))).map((x) => x.ttft).filter((x) => typeof x === 'number');
    const row = { label, win: WIN[tag], n: t.length, p50: pct(t, 0.5), p90: pct(t, 0.9), max: Math.max(...t), over10: t.filter((x) => x > 10000).length, over20: t.filter((x) => x > 20000).length };
    lat.push(row);
    console.log(`${label.padEnd(26)} ${row.win}  n=${row.n}  p50 ${(row.p50 / 1000).toFixed(1)}s  p90 ${(row.p90 / 1000).toFixed(1)}s  max ${(row.max / 1000).toFixed(1)}s  >10s ${row.over10}  >20s ${row.over20}`);
}
const all35 = ['', '-r2', '-r3'].flatMap((r) => Object.values(JSON.parse(fs.readFileSync(`${RD}/interview60.answers.gemini-3.5-flash-lite_captured-high${r}.json`, 'utf8'))).map((x) => x.ttft));
console.log(`3.5 HIGH captured, all 3 runs: n=${all35.length}  p90 ${(pct(all35, 0.9) / 1000).toFixed(1)}s  >10s ${all35.filter((x) => x > 10000).length}  >20s ${all35.filter((x) => x > 20000).length}`);

// ── (2) the misses page ──
const items = {}, verdict = {};
for (const f of fs.readdirSync(BLIND).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0];
    const key = JSON.parse(fs.readFileSync(`${BLIND}/${f}`, 'utf8'));
    const V = JSON.parse(fs.readFileSync(`${BLIND}/verdicts.blind-${n}.json`, 'utf8'));
    const P = JSON.parse(fs.readFileSync(`${BLIND}/pairs.blind-${n}.json`, 'utf8')).items;
    for (const it of P) {
        const { arm, rep, id } = key[it.key];
        items[id] ??= { question: it.question, topic: it.topic, answers: {} };
        (items[id].answers[arm] ??= [])[rep - 1] = { answer: it.answer, v: V[it.key], verdict: verdictOf(V[it.key]) };
    }
}
const ARMS = Object.keys(ARM_FILES);
const missed = IDS.filter((id) => ARMS.some((a) => items[id]?.answers[a]?.some((x) => x && x.verdict !== 'acceptable')));
const count = (arm, v) => IDS.reduce((s, id) => s + (items[id]?.answers[arm] ?? []).filter((x) => x?.verdict === v).length, 0);
console.log(`\nquestions with at least one miss: ${missed.length} of ${IDS.length}`);

const inapp = JSON.parse(fs.readFileSync(`${RD}/interview60.judge.pairs.json`, 'utf8')).items;
const inV = JSON.parse(fs.readFileSync(`${SP}/h40a-verdicts-inapp.json`, 'utf8'));
const inMiss = inapp.filter((p) => inV[p.key] && verdictOf(inV[p.key]) !== 'acceptable');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const chip = (v) => `<span class="chip ${v}">${v === 'acceptable' ? 'ok' : v}</span>`;
const scores = (v) => `<span class="sc">correctness ${v.correctness} · on topic ${v.on_topic} · delivery ${v.delivery}</span>`;
const short = { '3.1-lite LOW': '3.1-lite LOW', '3.5-lite HIGH': '3.5-lite HIGH', 'Gemma 26B MINIMAL': 'Gemma 26B MINIMAL' };

const card = (id) => {
    const q = items[id];
    const rows = ARMS.map((arm) => {
        const reps = q.answers[arm] ?? [];
        const chips = reps.map((x) => chip(x.verdict)).join('');
        const miss = reps.map((x, i) => x && x.verdict !== 'acceptable' ? `<div class="miss"><div class="mh">${chip(x.verdict)} <b>run ${i + 1}</b> ${scores(x.v)}</div><p class="why">${esc(x.v.reason)}</p><blockquote>${esc(x.answer)}</blockquote></div>` : '').join('');
        const ok = reps.map((x, i) => x && x.verdict === 'acceptable' ? `<details><summary>run ${i + 1}: acceptable — show answer</summary><blockquote>${esc(x.answer)}</blockquote></details>` : '').join('');
        return `<div class="arm"><div class="ah"><span class="an">${short[arm]}</span>${chips}</div>${miss}${ok}</div>`;
    }).join('');
    return `<section class="q" id="${id}"><h3><span class="qid">${id}</span> ${esc(q.topic ?? '')}</h3><p class="qt">${esc(q.question)}</p>${rows}</section>`;
};

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Holdout40 Misses</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1d2330;--muted:#5b6474;--line:#dde1e8;--ok:#1f7a4d;--okbg:#e3f3ea;--weak:#8a5a00;--weakbg:#fbf0d9;--wrong:#a3262a;--wrongbg:#fbe3e3;--quote:#f1f3f7;--accent:#2f5da8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#12151b;--card:#1a1f27;--ink:#e6e9ef;--muted:#9aa3b2;--line:#2c3340;--ok:#6fd3a0;--okbg:#18342a;--weak:#f0c26b;--weakbg:#3a2f16;--wrong:#ff8f8f;--wrongbg:#3d1c1e;--quote:#222834;--accent:#8fb1ff}}
:root[data-theme="dark"]{--bg:#12151b;--card:#1a1f27;--ink:#e6e9ef;--muted:#9aa3b2;--line:#2c3340;--ok:#6fd3a0;--okbg:#18342a;--weak:#f0c26b;--weakbg:#3a2f16;--wrong:#ff8f8f;--wrongbg:#3d1c1e;--quote:#222834;--accent:#8fb1ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 64px}h1{font-size:24px;margin:0 0 4px;text-wrap:balance}h2{font-size:18px;margin:32px 0 10px}h3{font-size:15px;margin:0 0 6px;color:var(--muted);font-weight:600}
.sub{color:var(--muted);margin:0 0 18px}.tbl{overflow-x:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600}
.q{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:12px 0}.qid{font-family:ui-monospace,Consolas,monospace;color:var(--accent);margin-right:6px}.qt{margin:0 0 10px;font-weight:600}
.arm{border-top:1px solid var(--line);padding:8px 0}.ah{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.an{min-width:150px;font-weight:600}
.chip{font-size:12px;padding:1px 8px;border-radius:999px;font-weight:600}.chip.acceptable{background:var(--okbg);color:var(--ok)}.chip.weak{background:var(--weakbg);color:var(--weak)}.chip.wrong{background:var(--wrongbg);color:var(--wrong)}
.miss{margin:8px 0 4px}.mh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sc{color:var(--muted);font-size:12px}.why{margin:4px 0;color:var(--ink)}
blockquote{margin:6px 0;padding:8px 12px;background:var(--quote);border-radius:6px;color:var(--ink);font-size:14px}details{margin:4px 0}summary{cursor:pointer;color:var(--muted);font-size:13px}summary:focus-visible{outline:2px solid var(--accent)}
.note{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px}.toc a{color:var(--accent);text-decoration:none;margin-right:10px;font-family:ui-monospace,Consolas,monospace}
</style></head><body><main>
<h1>Holdout40: where the models missed</h1>
<p class="sub">Flight h40a, 2026-09-24. Blind grading: every model's answers to a question were graded together by one grader (claude-opus-5-5, frozen prompt 8564ba96369a), without the grader knowing which model wrote which. All three models answered the app's own captured prompts, 3 runs each, 44 questions.</p>
<div class="tbl"><table><thead><tr><th>model</th><th>acceptable per run (of 44)</th><th>weak</th><th>wrong</th></tr></thead><tbody>
${ARMS.map((a) => `<tr><td>${short[a]}</td><td>${[0, 1, 2].map((r) => IDS.filter((id) => items[id]?.answers[a]?.[r]?.verdict === 'acceptable').length).join(' / ')}</td><td>${count(a, 'weak')}</td><td>${count(a, 'wrong')}</td></tr>`).join('')}
</tbody></table></div>
<h2>First-word time, 3.5-lite HIGH vs 3.1-lite LOW (offline runs, same prompts)</h2>
<div class="tbl"><table><thead><tr><th>run</th><th>when</th><th>p50</th><th>p90</th><th>max</th><th>&gt; 10 s</th><th>&gt; 20 s</th></tr></thead><tbody>
${lat.map((r) => `<tr><td>${r.label}</td><td>${r.win}</td><td>${(r.p50 / 1000).toFixed(1)} s</td><td>${(r.p90 / 1000).toFixed(1)} s</td><td>${(r.max / 1000).toFixed(1)} s</td><td>${r.over10} of ${r.n}</td><td>${r.over20}</td></tr>`).join('')}
</tbody></table></div>
<h2>${missed.length} of ${IDS.length} questions had at least one miss</h2>
<p class="toc">${missed.map((id) => `<a href="#${id}">${id}</a>`).join(' ')}</p>
${missed.map(card).join('\n')}
<h2>The live hour's own misses (what the app actually showed)</h2>
<p class="sub">Graded in the flight's own grading (one grader per answer set, claude-opus-5-5).</p>
${inMiss.map((p) => `<section class="q"><h3><span class="qid">${p.id}</span> ${esc(p.topic ?? '')}</h3><p class="qt">${esc(p.question)}</p><p class="sc">heard as: “${esc(p.heard)}” (${esc(p.source === 'whisper' ? 'speech-to-text detector' : 'Live')})</p><div class="miss"><div class="mh">${chip(verdictOf(inV[p.key]))} ${scores(inV[p.key])}</div><p class="why">${esc(inV[p.key].reason)}</p><blockquote>${esc(p.answer)}</blockquote></div></section>`).join('\n')}
</main></body></html>`;
fs.writeFileSync(`${SP}/h40a-misses.html`, html);
console.log(`wrote h40a-misses.html (${Math.round(html.length / 1024)} KB): ${missed.length} blind questions, ${inMiss.length} live-hour misses`);
