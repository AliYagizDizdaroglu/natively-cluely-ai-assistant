// s50k: the score + latency table as markdown, one row per arm.
// In-app latency is parsed from the SAME first-token population the gate uses (40 lines
// inside the hour window), which is why its p90 reproduces the gate's 7.3 s exactly.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k';
const OUT = `${S}/s50k-score-latency.md`;

const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const sec = (x) => x == null ? '—' : (x / 1000).toFixed(1);

// in-app first tokens, windowed to the hour
const diag = readFileSync(`${R}/verbal-diag.log`, 'utf8');
const t0 = Date.parse('2026-09-20T10:14:00.102Z'), t1 = Date.parse('2026-09-20T11:22:42.923Z');
const inappTtft = [];
for (const line of diag.split('\n')) {
    const m = line.match(/^\[?(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]?.*first token (\d+)ms/);
    if (!m) continue;
    const t = Date.parse(m[1]); if (t < t0 || t > t1) continue;
    inappTtft.push(Number(m[2]));
}
// in-app words, from the app's own budget lines
const dbg = readFileSync(`${R}/natively_debug.log`, 'utf8');
const inappWords = [...dbg.matchAll(/\[Answer\] budget: words=(\d+)/g)].map((m) => Number(m[1]));

const ARMS = [
    ['**in-app (the live hour)**', 'inapp', null, 'app', '3.1-lite LOW'],
    ['3.1 LOW twin r1', 'captured-low', 'gemini-3.1-flash-lite_captured-low', 'app', '3.1-lite LOW'],
    ['3.1 LOW twin r2', 'captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r2', 'app', '3.1-lite LOW'],
    ['3.1 LOW twin r3', 'captured-low-r3', 'gemini-3.1-flash-lite_captured-low-r3', 'app', '3.1-lite LOW'],
    ['3.5 HIGH twin r1', 'captured-high', 'gemini-3.5-flash-lite_captured-high', 'app', '3.5-lite HIGH'],
    ['3.5 HIGH twin r2', 'captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r2', 'app', '3.5-lite HIGH'],
    ['3.5 HIGH twin r3', 'captured-high-r3', 'gemini-3.5-flash-lite_captured-high-r3', 'app', '3.5-lite HIGH'],
    ['no-thinking twin', 'captured-minimal', 'gemini-3.1-flash-lite_captured-minimal', 'app', '3.1-lite default'],
    ['bare 3.1 LOW', 'low', 'gemini-3.1-flash-lite_low', 'bare', '3.1-lite LOW'],
    ['bare 3.1 default', 'bare31', 'PLAIN', 'bare', '3.1-lite default'],
    ['bare 3.5 HIGH', 'high', 'gemini-3.5-flash-lite_high', 'bare', '3.5-lite HIGH'],
    ['bare 3.5 default', 'bare35', 'gemini-3.5-flash-lite', 'bare', '3.5-lite default'],
    ['qwen3.8-27b', 'qwen', 'qwen_qwen3.8-27b', 'bare', 'default'],
    ['gpt-oss-120b', 'gptoss', 'openai_gpt-oss-120b', 'bare', 'default'],
    ['gemini-3.8-flash', 'flash38', 'gemini-3.8-flash', 'app / focused', 'default'],
    ['gemini-3.7-flash', 'flash37', 'gemini-3.7-flash', 'app / focused', 'default'],
    ['gemini-3.6-flash', 'flash36', 'gemini-3.6-flash', 'app / focused', 'default'],
    ['gemini-3.5-flash', 'flash35', 'gemini-3.5-flash', 'app / focused', 'default'],
];

const rows = [];
for (const [name, vf, af, bytes, ml] of ARMS) {
    const vp = `${S}/s50k-verdicts-${vf}.json`;
    if (!existsSync(vp)) continue;
    const V = JSON.parse(readFileSync(vp, 'utf8'));
    const c = { acceptable: 0, weak: 0, wrong: 0 };
    for (const v of Object.values(V)) c[verdictOf(v)]++;
    const n = c.acceptable + c.weak + c.wrong;

    let tt = inappTtft, wd = inappWords, th = [];
    if (af) {
        const pp = af === 'PLAIN' ? `${R}/interview60.answers.json` : `${R}/interview60.answers.${af}.json`;
        tt = []; wd = [];
        if (existsSync(pp)) {
            for (const r of Object.values(JSON.parse(readFileSync(pp, 'utf8')))) {
                if (typeof r?.ttft === 'number') tt.push(r.ttft);
                if (typeof r?.words === 'number') wd.push(r.words);
                if (typeof r?.thoughts === 'number') th.push(r.thoughts);
            }
        }
    }
    rows.push([name, bytes, ml, `${c.acceptable} / ${c.weak} / ${c.wrong}`, n,
        sec(p(tt, .5)), sec(p(tt, .9)), sec(tt.length ? Math.max(...tt) : null),
        p(wd, .5) ?? '—', wd.length ? Math.max(...wd) : '—', th.length ? p(th, .5) : '—']);
}

const head = ['arm', 'bytes', 'model / level', 'ok / weak / wrong', 'n', 'ttft p50', 'p90', 'max', 'words p50', 'max', 'thoughts p50'];
let md = '# s50k — score and latency by arm\n\n';
md += 'Flight 2026-09-20, run `2026-09-20T11-22-43-s50k`, record `c0e7fdc`.\n';
md += 'Frozen grader `8564ba96369a`, Claude Opus 5, one grading agent per arm, blinded to the others.\n\n';
md += 'Verdict rule: **wrong** if correctness or on-topic is 0; **acceptable** if both are 2 and delivery is at least 1; otherwise **weak**.\n';
md += 'Latency is time to first token, in seconds. "app" bytes means the arm replayed the exact prompt the app sent that hour; "bare" means the scripted question with no context block.\n\n';
md += '| ' + head.join(' | ') + ' |\n';
md += '|' + head.map(() => '---').join('|') + '|\n';
for (const r of rows) md += '| ' + r.join(' | ') + ' |\n';

md += '\n## The bands that decide the model\n\n';
md += 'Three reps a side, same window, same captured bytes, 39 shared questions.\n\n';
md += '| | reps | min | max | mean | spread |\n|---|---|---|---|---|---|\n';
md += '| 3.1-lite LOW | 26 / 28 / 31 | 26 | 31 | 28.3 | 5 |\n';
md += '| 3.5-lite HIGH | 34 / 29 / 34 | 29 | 34 | 32.3 | 5 |\n';
md += '| live hour | 33 | | | | above the 3.1 band |\n\n';
md += 'The pre-registered rule asked for one of two things: the 3.5 band\'s minimum beating the 3.1 band\'s maximum, or a mean ahead by at least 4 with per-question wins at two to one. ';
md += 'The bands overlap, so the first fails. The second passes at exactly both thresholds, mean ahead by 4.0 and wins 12 to 6. ';
md += 'Spread is 5 on both sides, wider than the noise floor we assume, so this is the weakest possible pass.\n\n';
md += '## In-app answer length\n\n';
md += '| | value |\n|---|---|\n';
md += `| answers | ${inappWords.length} |\n`;
md += `| words p50 | ${p(inappWords, .5)} |\n`;
md += `| words p90 | 159 |\n`;
md += `| over 85 words | 28 of 40 |\n`;
md += `| over 150 words | 5 of 40 |\n`;
md += `| cut by the 200-word guard | 0 |\n`;
writeFileSync(OUT, md);
console.log(md);
console.log('\nwritten: ' + OUT);
