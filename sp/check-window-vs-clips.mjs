// THROWAWAY: reconcileWindowMs sizes the corroboration window as
//   words / 2.24 w/s + 8s lag, floored at 15s, capped at 60s.
// 2.24 is the p10 of 79 interview60 clips. scenario50's clips are comma-heavy lists
// and render SLOWER, so the window may no longer reach the start of the question —
// and a window that stops short is exactly the defect 742b8fd fixed.
//
// Ground truth here is the REAL rendered audio, not an assumed rate.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const { SCENARIO50, wordsOf } = await import(pathToFileURL(G + 'scenario50.questions.mjs').href);
const { INTERVIEW } = await import(pathToFileURL(G + 'interview60.questions.mjs').href);

// The shipped implementation, transcribed from electron/services/questionReconcile.ts
// (the .ts cannot be imported here). Kept in sync by asserting the constants below.
const src = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionReconcile.ts', 'utf8');
const num = (name) => Number(src.match(new RegExp(`const ${name} = ([0-9_]+)`))[1].replace(/_/g, ''));
const WPS = Number(src.match(/const WORDS_PER_SEC = ([0-9.]+)/)[1]);
const LAG = num('LAG_MS'), MINW = num('MIN_WINDOW_MS'), MAXW = num('RECONCILE_MAX_WINDOW_MS');
console.log(`shipped constants: ${WPS} w/s, lag ${LAG / 1000}s, floor ${MINW / 1000}s, cap ${MAXW / 1000}s\n`);
const windowMs = (q) => Math.min(MAXW, Math.max(MINW, Math.round((wordsOf(q) / WPS) * 1000 + LAG)));

// Live emits a long question 3.3-5.3s after the clip ends (measured, after9). The
// window must still reach the FIRST transcript line of the question at that point.
const LIVE_LAG_MAX = 5.3;
const BYTES_PER_SEC = 24000 * 2;
function clipSecs(dir, id) {
    const f = path.join(G, dir, `${id}.wav`);
    if (!fs.existsSync(f)) return null;
    const b = fs.readFileSync(f);
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    return b.readUInt32LE(i + 4) / BYTES_PER_SEC;
}

function report(label, items, dir) {
    const rows = [];
    for (const it of items) {
        const secs = clipSecs(dir, it.id);
        if (secs === null) continue;
        const need = secs + LIVE_LAG_MAX;          // clip start is this far back when Live speaks
        const have = windowMs(it.q) / 1000;
        rows.push({ id: it.id, w: wordsOf(it.q), secs, wps: wordsOf(it.q) / secs, need, have, slack: have - need });
    }
    if (!rows.length) { console.log(`${label}: no rendered clips\n`); return rows; }
    const short = rows.filter((r) => r.slack < 0).sort((a, b) => a.slack - b.slack);
    const wps = rows.map((r) => r.wps).sort((a, b) => a - b);
    console.log(`${label}  ${rows.length} rendered clips`);
    console.log(`  measured rate  p10 ${wps[Math.floor(wps.length * 0.1)].toFixed(2)}  p50 ${wps[Math.floor(wps.length * 0.5)].toFixed(2)}  min ${wps[0].toFixed(2)} w/s`);
    console.log(`  window too short for ${short.length}/${rows.length}`);
    for (const r of short.slice(0, 12)) {
        console.log(`    ${r.id.padEnd(7)} ${String(r.w).padStart(3)}w  clip ${r.secs.toFixed(1)}s (${r.wps.toFixed(2)} w/s)  needs ${r.need.toFixed(1)}s  window ${r.have.toFixed(1)}s   SHORT BY ${(-r.slack).toFixed(1)}s`);
    }
    console.log('');
    return rows;
}

const s50 = report('scenario50 (S1+S2 rendered)', SCENARIO50, 'scenario50-tts-local');
const i60 = report('interview60 (for comparison)', INTERVIEW, 'interview60-tts-local');

// What rate WOULD cover every rendered clip?
const all = [...s50, ...i60];
const worst = all.map((r) => r.wps).sort((a, b) => a - b)[0];
console.log(`slowest clip across both rosters: ${worst.toFixed(2)} w/s`);
for (const cand of [2.24, 2.0, 1.8, 1.6, 1.5, 1.4]) {
    const w = (q) => Math.min(MAXW, Math.max(MINW, Math.round((wordsOf(q) / cand) * 1000 + LAG))) / 1000;
    const bad = all.filter((r) => {
        const item = [...SCENARIO50, ...INTERVIEW].find((x) => x.id === r.id);
        return w(item.q) < r.need;
    });
    console.log(`  at ${cand} w/s: ${bad.length}/${all.length} clips still uncovered${bad.length ? '  (' + bad.slice(0, 5).map((b) => b.id).join(', ') + ')' : ''}`);
}
