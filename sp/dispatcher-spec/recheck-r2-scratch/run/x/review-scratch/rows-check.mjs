// REVIEW THROWAWAY: the spec's §7 rows R3-R12 and R14, read off the prototype (proto.ts) in the spec's modes, on the
// eight DS fixtures. My reading of the spec; question text only. usage: node rows-check.mjs [--anchor] [--rearm] [--echoAfterR15]
import fs from 'node:fs';
import { FX, run } from './calib-check.mjs';
const extra = process.argv.slice(2);
const iso = (t) => new Date(t).toISOString().slice(11, 23);
const R6 = { s50b: ['S2Q06'], s50c: ['S2Q05'], s50f: ['S2Q05'], s50j: ['S1Q07F', 'S1Q08F'], s50d: ['S1Q04', 'S1Q06', 'S1Q08', 'S1Q09', 'S2Q04', 'S2Q05', 'S2Q05F', 'S2Q06', 'S2Q08'] };
const R7 = { s50i: ['S2Q09'], s50j: ['S1Q10F'] };
const NAMED = { br1: ['S1Q08', 'S2Q01'], cuesmoke: ['S1Q08'], s50i: ['S2Q09', 'S2Q07F'], s50d: ['S2Q09'] };
for (const [k, v] of Object.entries(R6)) NAMED[k] = [...(NAMED[k] ?? []), ...v];
for (const [k, v] of Object.entries(R7)) NAMED[k] = [...(NAMED[k] ?? []), ...v];
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const frac = (a, b) => { const A = content(a), B = content(b); let h = 0; for (const w of A) if (B.has(w)) h++; return A.size ? h / A.size : 0; };
const cw = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = cw(a), B = cw(b); if (A.size < 4) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const out = { fail: [], incon: [], notes: [] };
const readings = {};
for (const mode of ['fixdet', 'fixunk']) {
  readings[mode] = {};
  for (const [name, fx, log] of FX) {
    const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
    const cal = run(fx, log, 'calib', extra), r = run(fx, log, mode, extra);
    const row = (id) => r.rows.find((x) => x.id === id);
    const cls = (id) => { const w = row(id); return r.recorded.filter((x) => x.verdict === 'not-a-question' && x.askedAt >= w.from && x.askedAt < w.to).map((x) => x.finals)[0] ?? 0; };
    const note = (s) => out.notes.push(`[${mode}] ${name} ${s}`);
    const fail = (rowId, s) => out.fail.push(`[${mode}] ${rowId} ${name} ${s}`);
    const rd = (key, val) => { readings[mode][`${name}:${key}`] = val; };
    if (name === 'br1') { const x = row('S1Q08'); const ok = x.n === 1 && x.fromLive === false && x.finals === 5 && x.lat <= x.budget && !x.closes.includes('nothing-heard'); rd('R3', ok); if (!ok) fail('R3', JSON.stringify({ n: x.n, fromLive: x.fromLive, finals: x.finals, lat: x.lat, budget: x.budget, closes: x.closes })); }
    if (name === 'cuesmoke') { const x = row('S1Q08'); const ab = r.absorbed.filter((a) => a.at >= x.from && a.at < x.to && a.score >= 0.5); if (!(x.n === 1 && ab.length === 1)) fail('R4', `n=${x.n} absorbs=${ab.length}`); }
    for (const id of R6[name] ?? []) { const x = row(id); const c = cls(id); const ok = x.n === 1 && x.fromLive === false && x.finals >= c && x.lat <= x.budget; rd(`R6:${id}`, ok ? 'pass' : `n=${x.n} fromLive=${x.fromLive} finals=${x.finals}/${c} lat=${x.lat} budget=${x.budget}`); if (!ok) fail('R6', `${id}: n=${x.n} fromLive=${x.fromLive} finals=${x.finals} (classify ${c}) lat=${x.lat} budget=${x.budget} closes=[${x.closes}]`); }
    for (const id of R7[name] ?? []) { const x = row(id); rd(`R7:${id}`, x.cov >= 0.8); if (x.cov < 0.8) fail('R7', `${id}: cov=${x.cov.toFixed(2)} n=${x.n}`); }
    if (name === 's50d') { const x = row('S2Q09'); if (!(x.n === 0 && x.closes.includes('no-verdict'))) fail('R8', `S2Q09 n=${x.n} closes=[${x.closes}]`); }
    // R9: unchanged elsewhere vs calibration
    for (const x of r.rows.filter((q) => q.kind === 'spoken' && !(NAMED[name] ?? []).includes(q.id))) {
      const y = cal.rows.find((q) => q.id === x.id);
      const diffs = [];
      if (x.n !== y.n) diffs.push(`n ${y.n}->${x.n}`);
      if (x.fromLive !== y.fromLive) diffs.push(`fromLive ${y.fromLive}->${x.fromLive}`);
      if (Math.abs(x.cov - y.cov) > 1e-9) diffs.push(`cov ${y.cov.toFixed(2)}->${x.cov.toFixed(2)}`);
      if (x.first !== null && y.first !== null && Math.abs(x.first - y.first) > 100) diffs.push(`t ${x.first - y.first > 0 ? '+' : ''}${x.first - y.first}ms`);
      if (diffs.length) fail('R9', `${x.id}: ${diffs.join(', ')}`);
    }
    // R10
    for (const x of r.rows.filter((q) => q.n > 1)) fail('R10', `${x.id}: ${x.n} dispatches`);
    // R11: absorbed claim attributed (livelag rule) to the remembered turn's item
    const items = f.items.map((i) => ({ id: i.id, q: i.q, from: i.playedAt, end: i.playedAt + i.clipSecs * 1000 }));
    const attribute = (t, text) => { let best = null, bs = 0; for (const it of items) { if (it.from - 2000 > t) continue; if (t - it.end > 180000) continue; const s = frac(text, it.q); if (s > bs || (s === bs && best && it.from > best.from)) { bs = s; best = it; } } return bs >= 0.5 ? best.id : null; };
    for (const a of r.absorbed) {
      const claimItem = attribute(a.at, a.text); const remItem = attribute(a.at - a.ageMs, a.of);
      if (!claimItem || !remItem) note(`R11 unattributable absorb ${iso(a.at)} claim=${claimItem} remembered=${remItem} q=${JSON.stringify(a.text.slice(0, 70))}`);
      else if (claimItem !== remItem) fail('R11', `absorb ${iso(a.at)} claim item ${claimItem} but echo of ${remItem} (score ${a.score.toFixed(2)}, open ${a.openScore.toFixed(2)}) q=${JSON.stringify(a.text.slice(0, 70))}`);
    }
    // R12
    for (const [rn, id] of [['br1', 'S2Q01'], ['s50i', 'S2Q07F']]) if (name === rn) { const x = row(id); const bad = x.live.filter((t) => { const fin = ''; return false; }); const first = r.rows.find((q) => q.id === id); note(`R12 ${id}: live=${JSON.stringify(first.live.map((t) => t.slice(0, 50)))} finals=${first.finals}`); }
    if (r.throwsAt.length) fail('E5-throw', `${r.throwsAt.length} throws`);
    if (Object.keys(r.unspec).length) note(`unspecified path taken: ${JSON.stringify(r.unspec)}`);
    note(`subs ${r.subs.length}${r.subs.length ? ' [' + r.subs.map((s) => `${iso(s.at)} f=${s.finals} ${s.v} (${s.how})`).join('; ') + ']' : ''}; absorbed ${r.absorbed.length}; drops ${r.drops}`);
  }
}
// R14: R3, R6, R7 policy independence
for (const k of Object.keys(readings.fixdet)) if (JSON.stringify(readings.fixdet[k]) !== JSON.stringify(readings.fixunk[k])) out.incon.push(`R14 ${k}: fixdet=${JSON.stringify(readings.fixdet[k])} fixunk=${JSON.stringify(readings.fixunk[k])}`);
console.log(`FAIL rows (${out.fail.length}):\n  ${out.fail.join('\n  ')}\nINCONCLUSIVE (${out.incon.length}):\n  ${out.incon.join('\n  ')}\nnotes:\n  ${out.notes.join('\n  ')}`);
