// Read-only: every `[Main] Live question` in a run, attributed to the roster item whose script covers the claim best
// (fraction of the CLAIM's content words found in the item's script, >= 0.5) among items that started before it and
// ended at most 180 s before it (a late claim belongs to an earlier item). The claim's full text comes from the
// `dispatch: mark|drop source=live ... question=` line (the `Live question` line is truncated at 80 chars).
// Reports its lag from that item's clip end and what the dispatcher did next. Flags claims >= 20 s late, and whether
// that item had been answered before the claim (=> a Live-only dispatch then is a double).
// usage: node livelag.mjs <runDir>... [--all]
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const all = args.includes('--all');
const dirs = args.filter((a) => !a.startsWith('--'));
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const frac = (a, b) => { const A = content(a), B = content(b); let h = 0; for (const w of A) if (B.has(w)) h++; return A.size ? h / A.size : 0; };
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const totals = { dedupLate: 0, claims: 0, attributed: 0, late20: 0, lateLiveOnly: 0, lateDouble: 0, lateFirst: 0 };
const lags = [];
for (const dir of dirs) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const items = tl.items.map((i) => ({ id: i.id, q: i.q, from: tl.startedMs + OFF + i.startSec * 1000, end: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const attribute = (t, text) => {
    let best = null, bs = 0;
    for (const it of items) { if (it.from - 2000 > t) continue; if (t - it.end > 180000) continue; const s = frac(text, it.q); if (s > bs || (s === bs && best && it.from > best.from)) { bs = s; best = it; } }
    return bs >= 0.5 ? { it: best, s: bs } : null;
  };
  const answers = [];
  L.forEach((l) => { if (!/\[Main\] dispatch: answer source=/.test(l)) return; const q = l.match(QRE); if (!q) return; const a = attribute(T(l), unq(q[1])); answers.push({ at: T(l), id: a?.it.id ?? null }); });
  L.forEach((l, i) => {
    const m = l.match(/\[Main\] Live question \((\w+), mode=\w+\): "(.*)"$/);
    if (!m) return;
    totals.claims++;
    const at = T(l);
    let full = m[2];
    for (let j = i + 1; j < L.length && T(L[j]) - at < 50; j++) { if (/dispatch: (mark|drop) source=live/.test(L[j])) { const q = L[j].match(QRE); if (q) full = unq(q[1]); break; } }
    const a = attribute(at, full);
    if (a) totals.attributed++;
    const lag = a ? (at - a.it.end) / 1000 : null;
    if (lag !== null) lags.push(lag);
    let verdict = '?', liveOnly = false, dispatched = false, dedupDrop = false;
    for (let j = i + 1; j < L.length && T(L[j]) - at < 6000; j++) {
      const v = L[j].match(/dispatch: (mark|drop) source=live .*? verdict=(\w+)/); if (v && verdict === '?') verdict = `${v[1]}:${v[2]}`;
      const g = L[j].match(/turn: gate=\d+ finals=(\d+) live=(\d+)/); if (g && g[1] === '0') liveOnly = true;
      if (/dispatch: answer source=/.test(L[j])) { dispatched = true; break; }
      if (liveOnly && /dispatch: drop source=live .*duplicateOf=/.test(L[j])) { dedupDrop = true; break; }
      if (/Live question/.test(L[j])) break;
    }
    const before = a ? answers.filter((x) => x.id === a.it.id && x.at < at - 500) : [];
    const late = lag !== null && lag >= 20;
    if (late && dedupDrop) totals.dedupLate++;
    if (late) { totals.late20++; if (dispatched && liveOnly) { totals.lateLiveOnly++; if (before.length) totals.lateDouble++; else totals.lateFirst++; } }
    if (late || all) console.log(`${run.padEnd(22)} ${iso(at)} item=${(a?.it.id ?? '?').padEnd(7)} lag=${lag === null ? '   ?  ' : lag.toFixed(1).padStart(6)}s ${verdict.padEnd(22)} ${dispatched ? (liveOnly ? 'LIVE-ONLY DISPATCH' : 'dispatch(joined)') : (dedupDrop ? 'live-only turn, DEDUP DROP' : '-')}${before.length ? `  [item answered ${before.length}x before]` : '  [item NOT answered before]'}`);
  });
}
lags.sort((x, y) => x - y);
const q = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))];
console.log(`\nclaims ${totals.claims}, attributed ${totals.attributed}; lag p50 ${q(0.5)?.toFixed(1)} s, p90 ${q(0.9)?.toFixed(1)} s, max ${lags[lags.length - 1]?.toFixed(1)} s`);
console.log(`late Live-only turns the deduper dropped: ${totals.dedupLate}`);
 console.log(`>= 20 s late: ${totals.late20}; of those dispatched as a Live-only turn: ${totals.lateLiveOnly} (item already answered => double: ${totals.lateDouble}; first answer: ${totals.lateFirst})`);
