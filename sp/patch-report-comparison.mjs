// Report page: a "Model comparison" section fed by the judge files of the run
// being reported (the after dir when given, else the before dir): the hour's own
// answers plus the three answer-only arms. usage: node patch-report-comparison.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
const P = path.join(process.argv[2], 'electron/test/golden/interview60.report-html.mjs');
let s = fs.readFileSync(P, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const once = (a, b, label) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${label}: matched ${n}`); s = s.replace(a, () => b); console.log('ok ' + label); };

// 1. Loader, right after `after` is computed.
once("const after = afterDirArg ? computeRun(path.resolve(afterDirArg)) : null;",
[
"const after = afterDirArg ? computeRun(path.resolve(afterDirArg)) : null;",
"",
"// ── Model comparison: the judge files of the run being reported ──────────",
"// interview60.judge.json is the hour's own answers (in the app, with transcript",
"// context); interview60.judge.<model>.json are the answer-only arms that",
"// interview60.flight.mjs runs after the hour — same 52 questions, same prompt,",
"// same grader. Rendered only when the files exist.",
"const ARMS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemma-4-31b-it'];",
"const cmpDir = afterDirArg ? path.resolve(afterDirArg) : beforeDirArg ? path.resolve(beforeDirArg) : null;",
"const pctl = (a, p) => { const x = a.slice().sort((u, v) => u - v); return x.length ? x[Math.min(x.length - 1, Math.floor(x.length * p))] : null; };",
"const readJudge = (file, label) => {",
"    if (!cmpDir || !exists(path.join(cmpDir, file))) return null;",
"    const j = JSON.parse(fs.readFileSync(path.join(cmpDir, file), 'utf8'));",
"    const v = Object.values(j.items ?? {}).filter((x) => x.kind === 'spoken');",
"    const count = (verdict) => v.filter((x) => x.verdict === verdict).length;",
"    const mean = (k) => v.length ? (v.reduce((t, x) => t + (x[k] ?? 0), 0) / v.length) : null;",
"    return { label, n: v.length, acceptable: count('acceptable'), weak: count('weak'), wrong: count('wrong'), errors: count('error'),",
"        meanCorrectness: mean('correctness'), words: pctl(v.map((x) => String(x.answer ?? '').split(/\\s+/).filter(Boolean).length), .5),",
"        wrongReasons: v.filter((x) => x.verdict === 'wrong').map((x) => x.reason) };",
"};",
"const armLatency = (model) => {",
"    const f = path.join(cmpDir ?? '', model === ARMS[0] ? 'interview60.answers.json' : `interview60.answers.${model}.json`);",
"    if (!cmpDir || !exists(f)) return null;",
"    const a = Object.values(JSON.parse(fs.readFileSync(f, 'utf8'))).filter((x) => x.spoken);",
"    return { ttft50: pctl(a.map((x) => x.ttft), .5), ttft90: pctl(a.map((x) => x.ttft), .9), total50: pctl(a.map((x) => x.total), .5) };",
"};",
"const comparison = [",
"    readJudge('interview60.judge.json', 'In the app this hour — 3.1 Flash Lite, transcript context'),",
"    ...ARMS.map((m) => { const j = readJudge(`interview60.judge.${m}.json`, `${m} — answer-only pass`); return j && { ...j, ...(armLatency(m) ?? {}) }; }),",
"].filter(Boolean);",
].join(NL), 'loader');

// 2. Section, before the chain questions.
once("<h2>Chain questions — does the thread carry forward?</h2>",
[
"${comparison.length ? `<h3>Model comparison — same 52 questions, same prompt, same grader</h3>",
"<p class=\"measure muted\">Every row was graded by the same Opus judge with the rubric in the run folder: correctness, on-topic-ness and spoken delivery, 0–2 each; <em>acceptable</em> is 2/2 with usable delivery, <em>wrong</em> is a 0 on correctness or topic. The app row is what the candidate actually saw during the hour; the arms answered the scripted questions directly, without transcript context.</p>",
"<div class=\"tablewrap\"><table><thead><tr><th>Answers</th><th class=\"num\">Acceptable</th><th class=\"num\">Weak</th><th class=\"num\">Wrong</th><th class=\"num\">Mean correctness</th><th class=\"num\">Words p50</th><th class=\"num\">TTFT p50 / p90</th><th>Wrong ones, the judge's words</th></tr></thead><tbody>",
"${comparison.map((c) => `<tr><td>${esc(c.label)}</td><td class=\"num\">${c.acceptable}/${c.n}</td><td class=\"num\">${c.weak}</td><td class=\"num\">${c.wrong}</td><td class=\"num\">${c.meanCorrectness == null ? '—' : c.meanCorrectness.toFixed(2)}</td><td class=\"num\">${fmt(c.words)}</td><td class=\"num\">${c.ttft50 == null ? '—' : `${fmt(c.ttft50)} / ${fmt(c.ttft90)} ms`}</td><td>${c.wrongReasons.length ? esc(c.wrongReasons.join(' · ')) : '<span class=\"muted\">none</span>'}</td></tr>`).join('\\n')}",
"</tbody></table></div>` : ''}",
"",
"<h2>Chain questions — does the thread carry forward?</h2>",
].join(NL), 'section');

fs.writeFileSync(P, s);
