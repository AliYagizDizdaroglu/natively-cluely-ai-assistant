/**
 * THROWAWAY: paired read between two s50i arms, on the question ids they share.
 *
 *   node s50i-pairs.mjs <tagA> <tagB>
 *
 * Tags name the scratchpad verdict files (s50i-verdicts-<tag>.json) written by the graders.
 * Verdict rule is the flight's own (interview60.judge.mjs verdictOf): acceptable = correctness 2
 * and on_topic 2 and delivery >= 1. Prints acceptable A/B, net, which questions moved and on
 * which axis, split mains vs follow-ups, plus each arm's ttft and words from its answers file.
 */
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { verdictOf } = await import(`file:///${path.join(PROJ, 'electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);

// tag -> the answers file its latency and words come from ('' = the in-app hour, which has none here)
const ANSWERS = {
    inapp: null,
    'captured-minimal': 'interview60.answers.gemini-3.1-flash-lite_captured-minimal.json',
    'captured-low': 'interview60.answers.gemini-3.1-flash-lite_captured-low.json',
    low: 'interview60.answers.gemini-3.1-flash-lite_low.json',
    'captured-high': 'interview60.answers.gemini-3.5-flash-lite_captured-high.json',
    high: 'interview60.answers.gemini-3.5-flash-lite_high.json',
    bare31: 'interview60.answers.json',
    bare35: 'interview60.answers.gemini-3.5-flash-lite.json',
};

const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error('usage: node s50i-pairs.mjs <tagA> <tagB>'); process.exit(2); }
const load = (tag) => {
    const f = path.join(HERE, `s50i-verdicts-${tag}.json`);
    if (!fs.existsSync(f)) { console.error(`missing verdicts for ${tag}: ${f}`); process.exit(2); }
    return JSON.parse(fs.readFileSync(f, 'utf8'));
};
const va = load(A), vb = load(B);
const acc = (v) => v && verdictOf(v) === 'acceptable';
const ids = Object.keys(va).filter((k) => k in vb).sort();
const isMain = (id) => !id.endsWith('F');

let a = 0, b = 0, up = 0, down = 0, ma = 0, mb = 0, mains = 0;
const moves = [];
for (const id of ids) {
    const x = acc(va[id]), y = acc(vb[id]);
    if (x) a++; if (y) b++;
    if (isMain(id)) { mains++; if (x) ma++; if (y) mb++; }
    if (!x && y) { up++; moves.push(`${id}↑`); }
    if (x && !y) {
        const ax = vb[id].correctness < va[id].correctness ? 'c' : vb[id].on_topic < va[id].on_topic ? 't' : 'd';
        down++; moves.push(`${id}↓${ax}`);
    }
}
console.log(`${A} (A)  vs  ${B} (B)   — same questions, one grader per arm\n`);
console.log(`n ${ids.length}   A acceptable ${a}   B acceptable ${b}   net ${b - a >= 0 ? '+' : ''}${b - a}   up ${up}  down ${down}`);
console.log(`  mains      n=${mains}  A ${ma}  B ${mb}  net ${mb - ma >= 0 ? '+' : ''}${mb - ma}`);
console.log(`  follow-ups n=${ids.length - mains}  A ${a - ma}  B ${b - mb}  net ${(b - mb) - (a - ma) >= 0 ? '+' : ''}${(b - mb) - (a - ma)}`);
if (moves.length) console.log(`  moved: ${moves.join(' ')}`);

const pct = (arr, q) => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
console.log('\narm              answers   ttft p50/p90/max ms   words p50/max');
for (const tag of [A, B]) {
    const f = ANSWERS[tag];
    if (!f) { console.log(`${tag.padEnd(16)} (in-app hour — latency is in the run metrics, not an answers file)`); continue; }
    const rows = Object.values(JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'))).filter((v) => v && v.spoken);
    const ts = rows.map((r) => r.ttft).filter((t) => t != null), ws = rows.map((r) => r.words);
    console.log(`${tag.padEnd(16)} ${String(rows.length).padStart(5)}    ${String(pct(ts, .5)).padStart(5)}/${String(pct(ts, .9)).padStart(5)}/${String(Math.max(...ts)).padStart(6)}   ${String(pct(ws, .5)).padStart(5)}/${String(Math.max(...ws)).padStart(4)}`);
}
