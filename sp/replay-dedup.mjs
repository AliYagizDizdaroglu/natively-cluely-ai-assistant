// Throwaway replay: re-run the REAL ChipDeduper (esbuild bundle) over a run's dispatch
// sequence and compare its decisions with what the app logged.
//   node replay-dedup.mjs <bundleDir> <repo-root> <runName> [<runName> ...]
// bundleDir must hold ChipDeduper.js and extendOnClause.js built with
//   npx esbuild <ChipDeduper.ts> <extendOnClause.ts> --bundle --platform=node --format=cjs --outdir=<bundleDir>
// Calibration: on the unpatched bundle the replay must reproduce the log (mismatches 0)
// and therefore after8's W08 loss and H02 double.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [bundleDir, root, ...runs] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const { ChipDeduper } = require(path.join(bundleDir, 'ChipDeduper.js'));
const { shouldExtend, EXTEND_WINDOW_MS } = require(path.join(bundleDir, 'extendOnClause.js'));
const RUNS = path.join(root, 'electron/test/golden/interview60.runs');

const LINE = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold|extend) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: extends="((?:[^"\\]|\\.)*)")? question="((?:[^"\\]|\\.)*)"$/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const overlap = (a, b) => { const A = words(a), B = words(b); let n = 0; for (const w of A) if (B.has(w)) n++; return A.size ? n / A.size : 0; };

function candidates(dbg) {
  const lines = dbg.split('\n');
  const parsed = [];
  for (const l of lines) {
    const m = l.match(LINE);
    if (!m) continue;
    parsed.push({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: unq(m[4]), verdict: m[5], dupOf: m[6], answered: m[7], reason: m[8], extends: m[9] ? unq(m[9]) : undefined, question: unq(m[10]) });
  }
  const out = [];
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (p.action === 'hold') continue;                                     // held before admit
    if (p.action === 'drop' && p.verdict === 'fragment') continue;         // dropped on sight
    if (p.action === 'drop' && p.verdict === 'unverifiable' && p.dupOf === 'live' && p.answered === 'false') continue; // liveHold's previous
    const next = parsed[i + 1];
    if (p.action === 'drop' && next && next.action === 'hold' && next.at - p.at <= 5) continue; // fragmentHold's previous
    out.push(p);
  }
  return out;
}

function replay(cands) {
  const dd = new ChipDeduper();
  const realNow = Date.now;
  const decisions = [];
  for (const c of cands) {
    Date.now = () => c.at;
    const r = dd.admit({ question: c.question, source: c.source, anchor: c.anchor });
    let action;
    if (r.admitted) { action = 'answer'; dd.markAnswered(r.id); }
    else if (r.alreadyAnswered === true && r.duplicateOfQuestion !== undefined && r.duplicateAgeMs !== undefined && shouldExtend(r.duplicateOfQuestion, c.question, r.duplicateAgeMs)) { action = 'extend'; dd.extend(r.id, c.question); }
    else action = 'drop';
    decisions.push({ ...c, replay: action, dupQ: r.duplicateOfQuestion, age: r.duplicateAgeMs });
  }
  Date.now = realNow;
  return decisions;
}

for (const run of runs) {
  const dir = path.join(RUNS, run);
  const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const items = tl.items.filter((i) => i.kind === 'spoken').map((i) => ({ key: i.key || i.id, q: i.q, at: Number(i.playedAt) }));
  const startMs = Number(tl.startedMs ?? Date.parse(tl.startedAt));
  const cands = candidates(dbg).filter((c) => c.at >= startMs - 5000);
  const dec = replay(cands);
  const attr = (c) => { let best = null, bo = 0; for (const it of items) { const dt = c.at - it.at; if (dt < -2000 || dt > 90000) continue; const o = overlap(c.question, it.q); if (o > bo) { bo = o; best = it; } } return bo >= 0.3 ? best.key : 'none'; };
  const per = new Map();
  for (const d of dec) {
    const k = attr(d);
    const e = per.get(k) ?? { logAns: 0, repAns: 0, repExt: 0, logExt: 0, n: 0 };
    e.n++;
    if (d.action === 'answer' || d.action === 'chip') e.logAns++;
    if (d.action === 'extend') e.logExt++;
    if (d.replay === 'answer') e.repAns++;
    if (d.replay === 'extend') e.repExt++;
    per.set(k, e);
  }
  const mism = dec.filter((d) => (d.action === 'chip' ? 'answer' : d.action) !== d.replay);
  const keys = [...per.keys()].filter((k) => k !== 'none');
  const doubles = keys.filter((k) => per.get(k).repAns >= 2);
  const lost = keys.filter((k) => per.get(k).repAns === 0);
  const logDoubles = keys.filter((k) => per.get(k).logAns >= 2);
  const logLost = keys.filter((k) => per.get(k).logAns === 0);
  const ext = keys.reduce((a, k) => a + per.get(k).repExt, 0);
  const logExt = keys.reduce((a, k) => a + per.get(k).logExt, 0);
  console.log(`${run}: candidates ${dec.length}, items with a candidate ${keys.length}/${items.length}; LOG doubles ${logDoubles.length} [${logDoubles}] lost ${logLost.length} [${logLost}] extends ${logExt}; REPLAY doubles ${doubles.length} [${doubles}] lost ${lost.length} [${lost}] extends ${ext}; mismatches ${mism.length}`);
  const dbgKeys = (process.env.DEBUG_KEYS ?? '').split(',').filter(Boolean);
  for (const d of dec) if (dbgKeys.includes(attr(d))) console.log(`   DBG ${new Date(d.at).toISOString().slice(11, 23)} ${attr(d)} log=${d.action} replay=${d.replay} ${d.source} q=${JSON.stringify(d.question).slice(0, 90)} anchor=${JSON.stringify(d.anchor).slice(0, 60)}${d.dupQ ? ' ~ ' + JSON.stringify(d.dupQ).slice(0, 70) + ' @' + Math.round((d.age ?? 0) / 1000) + 's' : ''}`);
  for (const d of mism) console.log(`   ${new Date(d.at).toISOString().slice(11, 23)} ${attr(d).padEnd(5)} log=${d.action.padEnd(6)} replay=${d.replay.padEnd(6)} ${d.source.padEnd(7)} ${JSON.stringify(d.question).slice(0, 80)}${d.dupQ ? ' ~ ' + JSON.stringify(d.dupQ).slice(0, 60) + ' @' + Math.round((d.age ?? 0) / 1000) + 's' : ''}`);
}
