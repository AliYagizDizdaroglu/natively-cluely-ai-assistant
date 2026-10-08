// THROWAWAY: what does lowering WORDS_PER_SEC cost?
//
// A wider window joins MORE transcript text, and the join can only score HIGHER
// against a bigger blob — so a wider window makes FALSE corroboration easier. That
// is the risk the MATCH threshold guards, and the after8 07:36:26 invented question
// is the case that sits closest to it (joined 0.25 exactly at the shipped rate).
//
// CALIBRATION FIRST: this replica of the shipped reconciler is only believable if it
// reproduces outcomes already known from the shipped code. It is checked against
// after8's invented question before any sweep result is printed.
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const MATCH = 0.5, PARAPHRASE = 0.25, LAG_MS = 8000, MIN_W = 15000, MAX_W = 60000;

const wordSet = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
function overlap(a, b) {
    const A = wordSet(a), B = wordSet(b);
    if (!A.size) return 0;
    let hit = 0; for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}
const windowMs = (t, wps) => Math.min(MAX_W, Math.max(MIN_W, Math.round(((t.match(/[A-Za-z0-9']+/g) ?? []).length / wps) * 1000 + LAG_MS)));

/** The shipped decision, minus the fragment/replace tail (not affected by the window size). */
function decide(liveText, recent) {
    const spoken = recent.filter((r) => r.text.trim());
    if (!spoken.length) return { verdict: 'unverifiable', best: 0, join: 0 };
    let bestScore = -1;
    for (const r of spoken) bestScore = Math.max(bestScore, overlap(liveText, r.text));
    const join = overlap(liveText, spoken.map((r) => r.text).join(' '));
    const verdict = bestScore >= MATCH ? 'match' : join >= MATCH ? 'match-by-join'
        : bestScore >= PARAPHRASE ? 'paraphrase' : 'below';
    return { verdict, best: bestScore, join };
}

function loadRun(dir) {
    const log = fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n');
    const speech = [], dispatch = [];
    for (const l of log) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
        if (m) { let t; try { t = JSON.parse('"' + m[3] + '"'); } catch { t = m[3]; } if (t.trim()) speech.push({ text: t, at: Date.parse(m[1]), final: m[2] === 'true' }); continue; }
        const d = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=live .*? question=("(?:[^"\\]|\\.)*")$/);
        if (d) dispatch.push({ at: Date.parse(d[1]), action: d[2], q: JSON.parse(d[3]) });
    }
    return { speech, dispatch };
}

const RUN_DIRS = fs.readdirSync(RUNS).filter((d) => /after[789]$/.test(d));
const runs = RUN_DIRS.map((d) => ({ d, ...loadRun(d) }));
console.log('runs: ' + runs.map((r) => `${r.d} (${r.dispatch.length} live dispatches)`).join('\n      ') + '\n');

// ── CALIBRATION ────────────────────────────────────────────────────────────
// The known case: after8 07:36:26, Live claimed a question nobody asked; it shares
// only "multiple" and "cluster" with the real one and joins to EXACTLY 0.25 at the
// shipped 2.24 w/s. If the replica does not reproduce that, nothing below is evidence.
const a8 = runs.find((r) => r.d.endsWith('after8'));
let calibrated = false;
if (a8) {
    for (const d of a8.dispatch) {
        const w = windowMs(d.q, 2.24);
        const r = decide(d.q, a8.speech.filter((s) => s.at <= d.at && s.at >= d.at - w));
        // best 0.125 and join 0.250: below BOTH floors, which is why the invented
        // question was not corroborated. At a PARAPHRASE-floored join it would have been.
        if (Math.abs(r.join - 0.25) < 0.001 && Math.abs(r.best - 0.125) < 0.001 && r.verdict === 'below') {
            console.log(`CALIBRATION  after8 invented question reproduces: best=${r.best.toFixed(3)} join=${r.join.toFixed(3)} verdict=${r.verdict}`);
            console.log(`             ${JSON.stringify(d.q.slice(0, 70))}\n`);
            calibrated = true;
        }
    }
}
if (!calibrated) { console.log('CALIBRATION FAILED — the replica does not reproduce the known after8 case. Nothing below is evidence.'); process.exit(1); }

// ── SWEEP ──────────────────────────────────────────────────────────────────
console.log('wps    below→match-by-join (the NEW corroborations)   paraphrase→match-by-join   max join among still-below');
for (const wps of [1.6, 0.8, 0.4, 0.15]) {
    const base = [], now = [];
    for (const run of runs) for (const d of run.dispatch) {
        const at2 = decide(d.q, run.speech.filter((s) => s.at <= d.at && s.at >= d.at - windowMs(d.q, 2.24)));
        const atX = decide(d.q, run.speech.filter((s) => s.at <= d.at && s.at >= d.at - windowMs(d.q, wps)));
        base.push({ ...at2, q: d.q, run: run.d }); now.push({ ...atX, q: d.q, run: run.d });
    }
    const newJoin = now.filter((n, i) => n.verdict === 'match-by-join' && base[i].verdict === 'below');
    const promoted = now.filter((n, i) => n.verdict === 'match-by-join' && base[i].verdict === 'paraphrase');
    const stillBelow = now.filter((n) => n.verdict !== 'match' && n.verdict !== 'match-by-join');
    const closest = stillBelow.sort((a, b) => b.join - a.join)[0];
    console.log(`${String(wps).padEnd(6)} ${String(newJoin.length).padStart(3)}                                    ${String(promoted.length).padStart(3)}                        ${closest ? closest.join.toFixed(3) : '-'}`);
    for (const n of [...newJoin, ...promoted]) console.log(`         ${n.run.slice(-6)}  join ${n.join.toFixed(3)}  ${JSON.stringify(n.q.slice(0, 66))}`);
    // A wider window also adds candidate lines for the SINGLE-line score, so count every
    // verdict transition, not only the join promotions.
    const moved = now.map((n, i) => [base[i].verdict, n.verdict]).filter(([a, b]) => a !== b);
    const tally = new Map();
    for (const [a, b] of moved) tally.set(a + ' -> ' + b, (tally.get(a + ' -> ' + b) ?? 0) + 1);
    console.log(`         all verdict changes vs 2.24: ${moved.length}/${now.length}${moved.length ? '  ' + [...tally].map(([k, v]) => `${v}x ${k}`).join(', ') : ''}`);
}
