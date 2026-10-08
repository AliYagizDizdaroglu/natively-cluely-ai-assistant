// Throwaway: the h40a hour's details for the report — app stop proof, answer latency, fallbacks,
// the two failing gate rows. Reads the run folder's copies of the app's logs; writes nothing.
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RD = `${MAIN}/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a`;
const read = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/);
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

// 1. App start/stop in the flight log, from h40a's start marker on.
const fl = read(`${MAIN}/electron/test/golden/interview60.run.flight.log`);
const start = fl.findLastIndex((l) => /FLIGHT h40a start/.test(l) && !/DRY RUN/.test(l));
console.log(`flight log: h40a start marker at line ${start + 1} of ${fl.length}`);
fl.slice(start).forEach((l, i) => { if (/APP (START|STOP)|AUTO|auto (start|done|exit)|hour (start|end)|play(ing|ed)? .*wav/i.test(l)) console.log(`   ${String(start + i + 1).padStart(7)}  ${l.slice(0, 150)}`); });

// 2. The app's own log for the hour.
const dbg = read(`${RD}/natively_debug.log`);
const firstAttempts = {}; let afterError = 0, prevFail = false;
for (const l of dbg) {
    if (/failed before first token/.test(l)) { prevFail = true; continue; }
    const m = l.match(/verbal stall race: trying (\S+)/);
    if (m) { if (prevFail) afterError++; else firstAttempts[m[1]] = (firstAttempts[m[1]] ?? 0) + 1; prevFail = false; }
}
const stalls = dbg.filter((l) => /stalled after/.test(l));
const preTok = dbg.filter((l) => /failed before first token/.test(l));
console.log(`\nfirst attempt per answer: ${JSON.stringify(firstAttempts)}   3.5 after a pre-token error: ${afterError}`);
console.log(`stalls: ${stalls.length} at ${stalls.map((l) => l.slice(11, 19)).join(', ')}`);
console.log(`pre-token failures: ${preTok.length} (503: ${preTok.filter((l) => /503/.test(l)).length}) at ${preTok.map((l) => l.slice(11, 19)).join(', ')}`);
dbg.forEach((l, i) => { if (/__negotiationCoaching/.test(l)) { console.log(`\ncoaching blob at line ${i + 1}:`); dbg.slice(Math.max(0, i - 3), i + 1).forEach((x) => console.log(`   ${x.slice(0, 200)}`)); } });

// 3. The diag log's first-token times for the hour.
const diag = read(`${RD}/verbal-diag.log`).filter((l) => /^\[2026-09-24T0(7:1[2-9]|7:[2-5]\d|8:[01]\d|8:20)/.test(l));
const ft = diag.map((l) => l.match(/first token (\d+)ms/)).filter(Boolean).map((m) => +m[1]);
const fb = diag.filter((l) => /__model_source:gemini-3\.5-flash-lite \(fallback\)/.test(l)).length;
console.log(`\ndiag, the hour: generateStream invoked ${diag.filter((l) => /generateStream invoked/.test(l)).length}, route lines ${diag.filter((l) => /route:/.test(l)).length}, first token ${ft.length}, 3.5 fallback sentinels ${fb}`);
console.log(`first word (s): median ${(pct(ft, 0.5) / 1000).toFixed(1)}  p90 ${(pct(ft, 0.9) / 1000).toFixed(1)}  max ${(Math.max(...ft) / 1000).toFixed(1)}  over 10 s: ${ft.filter((x) => x > 10000).length}  over 7 s: ${ft.filter((x) => x > 7000).length}`);
console.log(`in order: ${ft.map((x) => (x / 1000).toFixed(1)).join(' ')}`);

// 4. MAIN's live diag log: nothing should have been written after the hour.
const st = fs.statSync(`${MAIN}/verbal-diag.log`);
console.log(`\nMAIN verbal-diag.log: ${st.size} bytes, last written ${st.mtime.toISOString()}`);
