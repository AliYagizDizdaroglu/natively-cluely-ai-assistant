// Throwaway (2026-09-26): in-app latency for h40a and h40b, read-only.
// TTFT exactly as interview60.metrics.mjs takes it: verbal-diag.log "[ts] first token Nms" lines,
// percentile = sorted[min(n-1, floor(n*p))]. CALIBRATION: p90 must print 7.8 s (h40a) and 13.6 s (h40b).
// Dispatch offset exactly as interview60.pass-record.mjs: dispatchedAt - (playedAt + clipSecs*1000).
// End to end = the first "first token" line logged after the dispatch (within 60 s) minus the clip end.
import fs from 'node:fs';
import { logSince } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.lib.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const HOURS = { h40a: '2026-09-24T08-20-12-h40a', h40b: '2026-09-26T11-39-51-h40b' };
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const s = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);
const stats = (arr) => { const a = [...arr].sort((x, y) => x - y); return `n ${a.length}, p50 ${s(pct(a, 0.5))}, p90 ${s(pct(a, 0.9))}, max ${s(a.at(-1))}`; };

for (const [h, dir] of Object.entries(HOURS)) {
    const R = `${RUNS}/${dir}`;
    const tl = JSON.parse(fs.readFileSync(`${R}/interview60.timeline.json`, 'utf8'));
    // The hour's own bytes only, as the harness reads them (interview60.lib.mjs logSince): the first
    // version read the whole file (1,400+ lines over several days) and missed the calibration.
    if (typeof tl.startDiag !== 'number') { console.log(`${h}: timeline has no startDiag`); process.exit(2); }
    const diag = logSince(`${R}/verbal-diag.log`, tl.startDiag, tl.endDiag);
    const firsts = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: Date.parse(m[1]), ms: Number(m[2]) }));
    const items = new Map((tl.items ?? []).map((it) => [it.id, it]));
    const pj = JSON.parse(fs.readFileSync(`${R}/interview60.judge.pairs.json`, 'utf8'));
    const pairs = (Array.isArray(pj) ? pj : pj.items).filter((p) => p.dispatchedAt && items.has(p.id));
    const offsets = [], e2e = [], matched = [];
    for (const p of pairs) {
        const it = items.get(p.id);
        const end = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000);
        const d = Date.parse(p.dispatchedAt);
        offsets.push(d - end);
        const f = firsts.find((x) => x.at >= d && x.at <= d + 60_000);
        if (f) { e2e.push(f.at - end); matched.push(f.ms); }
    }
    console.log(`== ${h}`);
    console.log(`TTFT, all "first token" lines   : ${stats(firsts.map((f) => f.ms))}   [harness p90: h40a 7.8 s, h40b 13.6 s]`);
    console.log(`dispatch after the question ends: ${stats(offsets)}  (${pairs.length} graded in-app answers)`);
    console.log(`first token after question ends: ${stats(e2e)}  (${matched.length} of ${pairs.length} matched to a first-token line)`);
    const slow = [...firsts].sort((a, b) => b.ms - a.ms).slice(0, 7).map((f) => `${new Date(f.at).toISOString().slice(11, 19)}Z ${s(f.ms)}`);
    console.log(`slowest first tokens: ${slow.join(' | ')}`);
    // Without the stall path: TTFT over the answers whose first token came within the 10 s stall limit.
    const fast = firsts.map((f) => f.ms).filter((ms) => ms < 10_000).sort((a, b) => a - b);
    console.log(`TTFT of answers under the 10 s stall limit: ${stats(fast)}`);
}
