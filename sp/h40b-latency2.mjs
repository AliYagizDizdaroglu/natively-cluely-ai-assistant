// Throwaway (2026-09-26): exact "TTFT without the stall answers" for both hours, plus two claims
// from the fact-check: R13's word count and delivery score, and the lost utterance near 11:36:59Z.
// Read-only. The hour's bytes only, as the harness reads them (logSince + the timeline offsets).
import fs from 'node:fs';
import { logSince } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.lib.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const HOURS = { h40a: '2026-09-24T08-20-12-h40a', h40b: '2026-09-26T11-39-51-h40b' };
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const s = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);

for (const [h, dir] of Object.entries(HOURS)) {
    const R = `${RUNS}/${dir}`;
    const tl = JSON.parse(fs.readFileSync(`${R}/interview60.timeline.json`, 'utf8'));
    const diag = logSince(`${R}/verbal-diag.log`, tl.startDiag, tl.endDiag);
    const dbg = logSince(`${R}/natively_debug.log`, tl.startDebug, tl.endDebug);
    const firsts = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: Date.parse(m[1]), ms: Number(m[2]) }));
    const stalls = [...dbg.matchAll(/^(\S+) \[WARN\] \[LLMHelper\] \S+ stalled after \d+ms/gm)].map((m) => Date.parse(m[1]));
    const redirects = [...dbg.matchAll(/^(\S+) [^\n]*verbal primary FAILED pre-token/gm)].length;
    // A stall answer = the first "first token" line logged within 40 s after a stall line.
    const stallAnswers = new Set(stalls.map((t) => firsts.find((f) => f.at >= t && f.at <= t + 40_000)).filter(Boolean));
    const rest = firsts.filter((f) => !stallAnswers.has(f)).map((f) => f.ms).sort((a, b) => a - b);
    console.log(`== ${h}: ${stalls.length} stall lines in the hour's log bytes, ${stallAnswers.size} matched to a first token; ${redirects} pre-token failure lines in the debug log`);
    console.log(`stall answers' TTFT: ${[...stallAnswers].map((f) => s(f.ms)).join(', ')}`);
    console.log(`TTFT without the stall answers: n ${rest.length}, p50 ${s(pct(rest, 0.5))}, p90 ${s(pct(rest, 0.9))}, max ${s(rest.at(-1))}`);
}

// R13 on h40b: in-app words and scores.
const B = `${RUNS}/${HOURS.h40b}`;
const v = JSON.parse(fs.readFileSync(`${B}/interview60.judge.verdicts.json`, 'utf8'));
const pj = JSON.parse(fs.readFileSync(`${B}/interview60.judge.pairs.json`, 'utf8'));
const r13 = (Array.isArray(pj) ? pj : pj.items).find((p) => p.id === 'R13');
console.log(`R13 in-app: ${r13 ? (r13.answer ?? '').split(/\s+/).filter(Boolean).length : '?'} words; verdict ${JSON.stringify(v.R13)}`);
const over150 = (Array.isArray(pj) ? pj : pj.items).filter((p) => (p.answer ?? '').split(/\s+/).filter(Boolean).length > 150).map((p) => p.id);
console.log(`in-app answers over 150 words: ${over150.join(', ') || 'none'}`);

// The lost utterance: Deepgram lines between 11:36:50Z and 11:37:10Z.
const dbgAll = fs.readFileSync(`${B}/natively_debug.log`, 'utf8').split('\n');
for (const l of dbgAll) {
    const t = l.slice(0, 24);
    if (t >= '2026-09-26T11:36:50' && t <= '2026-09-26T11:37:10' && /Deepgram|lost|utterance/i.test(l)) console.log(l.slice(0, 200));
}
