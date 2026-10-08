// s50l steps 2-4: the model proof, the notation proof, the word-guard check.
// Adapted from s50j-level.mjs, s50k-notation-leak.mjs and s50j-endings.mjs, repointed at
// the s50l run dir. Each section prints PASS/FAIL on its own so one failure does not hide
// another, and each says what it would take to fail (rule 8) rather than only its verdict.
import { readFileSync, existsSync } from 'node:fs';

const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l';
const fail = [];

// ---------- 2. MODEL PROOF ----------
// The usage line is printed per STREAM CHUNK. Collapse a run of consecutive lines with the
// same model+in-tokens into ONE request and take that request's LAST thoughts value.
const dbg = readFileSync(`${R}/natively_debug.log`, 'utf8');
const lines = [...dbg.matchAll(/\[LLMHelper\] (\S+) usage: thinking=(\w+) thoughts=(\d+) out=(\d+) in=(\d+)/g)]
    .map((m) => ({ model: m[1], level: m[2], thoughts: +m[3], out: +m[4], in: +m[5] }));
const reqs = [];
for (const l of lines) {
    const p = reqs[reqs.length - 1];
    if (p && p.model === l.model && p.in === l.in && l.out >= p.out) { p.thoughts = l.thoughts; p.out = l.out; p.chunks++; }
    else reqs.push({ ...l, chunks: 1 });
}
// Warm-ups are tiny; a real spoken answer carries the whole context block (~5,000 in).
const answers = reqs.filter((r) => r.in > 500);
console.log('=== 2. MODEL PROOF ===');
console.log(`collapsed ${lines.length} chunk lines -> ${reqs.length} requests, ${answers.length} of them real answers (in>500)`);
const byKey = new Map();
for (const r of answers) {
    const k = `${r.model} @ ${r.level}`;
    const v = byKey.get(k) ?? { n: 0, zeroThoughts: 0, minT: Infinity, maxT: 0 };
    v.n++; if (r.thoughts === 0) v.zeroThoughts++;
    v.minT = Math.min(v.minT, r.thoughts); v.maxT = Math.max(v.maxT, r.thoughts);
    byKey.set(k, v);
}
for (const [k, v] of byKey) console.log(`  ${k.padEnd(34)} ${String(v.n).padStart(3)} requests  thoughts ${v.minT}..${v.maxT}  zero-thought: ${v.zeroThoughts}`);
const primary = answers.filter((r) => r.model === 'gemini-3.5-flash-lite');
const fallback = answers.filter((r) => r.model === 'gemini-3.1-flash-lite');
const other = answers.filter((r) => r.model !== 'gemini-3.5-flash-lite' && r.model !== 'gemini-3.1-flash-lite');
if (!answers.length) fail.push('MODEL: no answer requests found at all');
if (primary.length <= fallback.length) fail.push(`MODEL: 3.5-lite answered ${primary.length} vs 3.1-lite ${fallback.length} — the override did not take, the hour is VOID for the model question`);
for (const r of primary) {
    if (r.level !== 'HIGH') fail.push(`MODEL: a 3.5-lite request ran at ${r.level}, expected HIGH`);
    else if (r.thoughts === 0) fail.push('MODEL: a 3.5-lite request at HIGH spent ZERO thought tokens');
}
for (const r of fallback) {
    if (r.level !== 'LOW') fail.push(`MODEL: a 3.1-lite fallback ran at ${r.level}, expected LOW (symmetric pairing)`);
    else if (r.thoughts === 0) fail.push('MODEL: a 3.1-lite fallback at LOW spent ZERO thought tokens');
}
for (const r of other) fail.push(`MODEL: an answer ran on ${r.model}, neither primary nor fallback`);
console.log(`  primary 3.5-lite: ${primary.length}   fallback 3.1-lite: ${fallback.length}   other: ${other.length}`);

// ---------- 3. NOTATION + FENCE PROOF ----------
console.log('\n=== 3. NOTATION / FENCE PROOF ===');
const inapp = JSON.parse(readFileSync(`${R}/interview60.judge.pairs.json`, 'utf8'));
const inappItems = inapp.items ?? [];
let dollar = 0, backslash = 0, fence = 0;
const offenders = [];
for (const it of inappItems) {
    const a = String(it.answer ?? '');
    const d = a.includes('$'), b = a.includes('\\'), f = a.includes('```');
    if (d) dollar++; if (b) backslash++; if (f) fence++;
    if (d || b || f) offenders.push(`${it.key}${d ? ' $' : ''}${b ? ' \\' : ''}${f ? ' fence' : ''}`);
}
console.log(`in-app answers: ${inappItems.length}   with $: ${dollar}   with backslash: ${backslash}   with fence: ${fence}`);
if (offenders.length) console.log('  offenders: ' + offenders.join(', '));
if (dollar || backslash) fail.push(`NOTATION: ${dollar} in-app answers carry a dollar sign and ${backslash} carry a backslash`);
if (fence) fail.push(`FENCE: ${fence} in-app answers carry a code fence`);

const ARMS = [
    ['3.1 LOW r1', 'gemini-3.1-flash-lite_captured-low'], ['3.1 LOW r2', 'gemini-3.1-flash-lite_captured-low-r2'],
    ['3.1 LOW r3', 'gemini-3.1-flash-lite_captured-low-r3'], ['3.5 HIGH r1', 'gemini-3.5-flash-lite_captured-high'],
    ['3.5 HIGH r2', 'gemini-3.5-flash-lite_captured-high-r2'], ['3.5 HIGH r3', 'gemini-3.5-flash-lite_captured-high-r3'],
];
console.log('\narm            n   raw-LaTeX raw-fence | spoken $  spoken \\  spoken fence');
for (const [tag, f] of ARMS) {
    const p = `${R}/interview60.answers.${f}.json`;
    if (!existsSync(p)) { console.log(`  ${tag}  MISSING`); fail.push(`ARM MISSING: ${f}`); continue; }
    const j = JSON.parse(readFileSync(p, 'utf8'));
    let n = 0, rl = 0, rf = 0, sd = 0, sb = 0, sf = 0;
    for (const r of Object.values(j)) {
        if (!r || typeof r.spoken !== 'string') continue;
        n++;
        const raw = typeof r.raw === 'string' ? r.raw : '';
        if (/\\frac|\\text|\\times|\$\d|\$\\/.test(raw)) rl++;
        if (raw.includes('```')) rf++;
        if (r.spoken.includes('$')) sd++;
        if (r.spoken.includes('\\')) sb++;
        if (r.spoken.includes('```')) sf++;
    }
    console.log(`  ${tag.padEnd(12)} ${String(n).padStart(3)}   ${String(rl).padStart(7)} ${String(rf).padStart(9)} | ${String(sd).padStart(8)} ${String(sb).padStart(9)} ${String(sf).padStart(12)}`);
    if (sf) fail.push(`FENCE: arm ${tag} leaked ${sf} code fences into spoken text — filterCodeFences is not in the arm chain`);
}

// ---------- 4. WORD GUARD ----------
console.log('\n=== 4. WORD GUARD ===');
let bad = 0, at200 = 0, maxW = 0;
const tails = [];
for (const it of inappItems) {
    const a = String(it.answer ?? '').trim();
    if (!a) continue;
    const w = a.split(/\s+/).length;
    maxW = Math.max(maxW, w);
    if (w === 200) at200++;
    if (!/[.!?]["')\]]?$/.test(a)) { bad++; tails.push(`${it.key}: …${a.slice(-40)}`); }
}
console.log(`in-app answers ${inappItems.length}   not ending on . ! ?: ${bad}   exactly 200 words: ${at200}   max words: ${maxW}`);
if (tails.length) console.log('  ' + tails.join('\n  '));
if (bad) fail.push(`GUARD: ${bad} in-app answers do not end on a sentence boundary`);
if (at200) fail.push(`GUARD: ${at200} in-app answers sit at exactly 200 words (hard cut)`);

console.log('\n================ SUMMARY ================');
if (fail.length) { console.log('FAILURES:'); for (const f of fail) console.log('  - ' + f); process.exit(1); }
console.log('ALL THREE PROOFS PASS: model override honoured, no notation or fence leak, word guard clean.');
