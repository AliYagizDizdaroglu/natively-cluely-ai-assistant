// r2 THROWAWAY: the r2 spec's §7 rows R3-R16, read off proto-r2 in the spec's modes on every fixture.
// usage: node rows-r2.mjs [--jitter MS]
import fs from 'node:fs';
import { FX, run, iso } from './fx.mjs';
const rest = process.argv.slice(2);
const argv = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const jitter = argv('--jitter', '0');
const extra = ['--jitter', jitter];
const R6 = { s50b: ['S2Q06'], s50c: ['S2Q05'], 's50c-peritem': ['S2Q05'], s50f: ['S2Q05'], s50j: ['S1Q07F', 'S1Q08F'], s50d: ['S1Q04', 'S1Q06', 'S1Q08', 'S1Q09', 'S2Q04', 'S2Q05', 'S2Q05F', 'S2Q06', 'S2Q08'] };
const R7 = { s50i: ['S2Q09'], s50j: ['S1Q10F'] };
const R16 = { cuesmoke2: ['S1Q07F', 'S1Q08F'] }; // the 05:00 re-smoke's two real declines: once, from the finals, whole
const NAMED = { br1: ['S1Q08', 'S2Q01'], cuesmoke: ['S1Q08'], s50i: ['S2Q09', 'S2Q07F'], s50d: ['S2Q09'] };
for (const M of [R6, R7, R16]) for (const [k, v] of Object.entries(M)) NAMED[k] = [...(NAMED[k] ?? []), ...v];
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const frac = (a, b) => { const A = content(a), B = content(b); let h = 0; for (const w of A) if (B.has(w)) h++; return A.size ? h / A.size : 0; };
const out = { fail: [], incon: [], notes: [], report: [] };
const readings = {};
const fail = (mode, rowId, name, s) => out.fail.push(`[${mode}] ${rowId} ${name} ${s}`);
for (const mode of ['fix', 'fixunk']) {
  readings[mode] = {};
  for (const [name, fx, log] of FX) {
    const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
    const cal = run(fx, log, 'calib', extra), r = run(fx, log, mode, extra);
    const row = (id) => r.rows.find((x) => x.id === id);
    const crow = (id) => cal.rows.find((x) => x.id === id);
    const cls = (id) => { const w = row(id); return r.recorded.filter((x) => x.verdict === 'not-a-question' && x.askedAt >= w.from && x.askedAt < w.to).map((x) => x.finals)[0] ?? 0; };
    const note = (s) => out.notes.push(`[${mode}] ${name} ${s}`);
    const rd = (key, val) => { readings[mode][`${name}:${key}`] = val; };
    if (name === 'br1') { const x = row('S1Q08'); const ok = x.n === 1 && x.fromLive === false && x.finals === 5 && x.lat <= x.budget && !x.closes.includes('nothing-heard'); rd('R3', ok); if (!ok) fail(mode, 'R3', name, JSON.stringify({ n: x.n, fromLive: x.fromLive, finals: x.finals, lat: x.lat, budget: x.budget, closes: x.closes })); else out.report.push(`[${mode}] R3 br1 S1Q08: once, finals=${x.finals}, lat ${x.lat} ms (budget ${x.budget}, today ${crow('S1Q08').lat}), path ${x.path}, closes [${x.closes}]`); }
    if (name === 'cuesmoke') { const x = row('S1Q08'); const ab = r.absorbed.filter((a) => a.at >= x.from && a.at < x.to && a.score >= 0.5); rd('R4', x.n === 1 && ab.length === 1); if (!(x.n === 1 && ab.length === 1)) fail(mode, 'R4', name, `n=${x.n} absorbs=${ab.length}`); else out.report.push(`[${mode}] R4 cuesmoke S1Q08: once (today ${crow('S1Q08').n}); absorb score ${ab[0].score.toFixed(2)} residual ${ab[0].hits}/${ab[0].residual} age ${(ab[0].ageMs / 1000).toFixed(1)} s`); }
    for (const id of R6[name] ?? []) {
      const x = row(id), y = crow(id); const c = cls(id);
      const ok = x.n === 1 && x.fromLive === false && x.finals >= c && x.lat <= x.budget && (y.lat === null || x.lat < y.lat);
      rd(`R6:${id}`, ok ? 'pass' : `n=${x.n} fromLive=${x.fromLive} finals=${x.finals}/${c} lat=${x.lat} budget=${x.budget}`);
      if (!ok) fail(mode, 'R6', name, `${id}: n=${x.n} fromLive=${x.fromLive} finals=${x.finals} (classify ${c}) lat=${x.lat} budget=${x.budget} (old budget ${x.budgetOld}, finished=${x.finished}) today=${y.lat} closes=[${x.closes}]`);
      else out.report.push(`[${mode}] R6 ${name} ${id}: lat ${x.lat} ms (budget ${x.budget}${x.finished ? '' : ', unfinished hold'}) today ${y.lat} ms finals=${x.finals}/${c} path=${x.path}${x.restsOnSub ? ' RESTS-ON-SUBSTITUTION' : ''}`);
    }
    for (const id of R7[name] ?? []) { const x = row(id); rd(`R7:${id}`, x.cov >= 0.8 && x.n === 1); if (!(x.cov >= 0.8 && x.n === 1)) fail(mode, 'R7', name, `${id}: cov=${x.cov.toFixed(2)} n=${x.n}`); else out.report.push(`[${mode}] R7 ${name} ${id}: cov ${x.cov.toFixed(2)} (today ${crow(id).cov.toFixed(2)}) n=${x.n} finals=${x.finals} supersedes=${x.supersedes} lat ${x.lat} (today ${crow(id).lat})${x.restsOnSub ? ' RESTS-ON-SUBSTITUTION' : ''}`); }
    for (const id of R16[name] ?? []) { const x = row(id), y = crow(id); const ok = x.n === 1 && x.fromLive === false && x.finals === 2 && x.cov >= 0.8 && x.lat <= x.budget; rd(`R16:${id}`, ok ? 'pass' : `n=${x.n} fromLive=${x.fromLive} finals=${x.finals} cov=${x.cov.toFixed(2)} lat=${x.lat} budget=${x.budget}`); if (!ok) fail(mode, 'R16', name, `${id}: n=${x.n} fromLive=${x.fromLive} finals=${x.finals} cov=${x.cov.toFixed(2)} lat=${x.lat} budget=${x.budget} closes=[${x.closes}]`); else out.report.push(`[${mode}] R16 ${name} ${id}: once, finals=${x.finals} (today ${y.finals}, fromLive ${y.fromLive}), cov ${x.cov.toFixed(2)} (today ${y.cov.toFixed(2)}), lat ${x.lat} ms (today ${y.lat}; log ${y.logFirst ? ((y.logFirst - y.voiceOff)) : '-'}), path ${x.path}, text "${(x.text ?? '').slice(0, 60)}"${x.restsOnSub ? ' RESTS-ON-SUBSTITUTION' : ''}`); }
    if (name === 's50d') { const x = row('S2Q09'); rd('R8', x.n === 0 && x.closes.includes('no-verdict')); if (!(x.n === 0 && x.closes.includes('no-verdict'))) fail(mode, 'R8', name, `S2Q09 n=${x.n} closes=[${x.closes}]`); }
    // R9: unchanged elsewhere vs calibration
    for (const x of r.rows.filter((q) => q.kind === 'spoken' && !(NAMED[name] ?? []).includes(q.id))) {
      const y = crow(x.id); const diffs = [];
      if (x.n !== y.n) diffs.push(`n ${y.n}->${x.n}`);
      if (x.fromLive !== y.fromLive) diffs.push(`fromLive ${y.fromLive}->${x.fromLive}`);
      if (Math.abs(x.cov - y.cov) > 1e-9) diffs.push(`cov ${y.cov.toFixed(2)}->${x.cov.toFixed(2)}`);
      if (x.first !== null && y.first !== null && Math.abs(x.first - y.first) > 100) diffs.push(`t ${x.first - y.first > 0 ? '+' : ''}${x.first - y.first}ms`);
      if (diffs.length) fail(mode, 'R9', name, `${x.id}: ${diffs.join(', ')}`);
    }
    for (const x of r.rows.filter((q) => q.n > 1)) fail(mode, 'R10', name, `${x.id}: ${x.n} dispatches`);
    // R11 (I6): an absorbed claim is attributed by TIME first (on-time: <= 10 s after the clip that ended last => that
    // clip's item; late: by text, livelag's rule); its item must already hold an admitted dispatch
    const items = f.items.map((i) => ({ id: i.id, q: i.q, from: i.playedAt, end: i.playedAt + i.clipSecs * 1000 }));
    const attribute = (t, text) => { let best = null, bs = 0; for (const it of items) { if (it.from - 2000 > t) continue; if (t - it.end > 180000) continue; const s = frac(text, it.q); if (s > bs || (s === bs && best && it.from > best.from)) { bs = s; best = it; } } return bs >= 0.5 ? best.id : null; };
    for (const a of r.absorbed) {
      const onTime = a.lagFromLastClipEnd !== null && a.lagFromLastClipEnd <= 10000;
      const lastItem = items.filter((it) => it.end <= a.at + 500).sort((x, y) => y.end - x.end)[0];
      const item = onTime ? lastItem.id : attribute(a.at, a.text);
      const w = item ? row(item) : null;
      const answeredBefore = w ? w.first !== null && w.first < a.at : false;
      const tag = `${iso(a.at)} ${a.source} ${onTime ? 'ON-TIME +' + (a.lagFromLastClipEnd / 1000).toFixed(1) + 's' : 'late +' + (a.lagFromLastClipEnd / 1000).toFixed(1) + 's'} item=${item} echoOf=${attribute(a.at - a.ageMs, a.of)} rem ${a.score.toFixed(2)} open ${a.openScore.toFixed(2)} residual ${a.hits}/${a.residual} q=${JSON.stringify(a.text.slice(0, 50))}`;
      if (!item) note(`R11 unattributable absorb ${tag}`);
      else if (!answeredBefore) fail(mode, 'R11', name, `absorbed claim whose item was not yet answered: ${tag}`);
      else if (onTime) note(`R11 on-time absorb (a same-item re-fire after its answer): ${tag}`);
    }
    for (const [rn, id] of [['br1', 'S2Q01'], ['s50i', 'S2Q07F']]) if (name === rn) { const x = row(id); rd(`R12:${id}`, x.live.length === 0 && x.n === 1 && !x.r21); if (x.live.length || x.n !== 1 || x.r21) fail(mode, 'R12', name, `${id} live=${JSON.stringify(x.live.map((t) => t.slice(0, 40)))} n=${x.n} r21=${x.r21}`); else note(`R12 ${id}: live=[] finals=${x.finals} n=${x.n} r21=${x.r21} (today: live=${crow(id).live.length}, r21=${crow(id).r21})`); }
    // reports
    const wEcho = r.absorbed.filter((a) => a.source === 'whisper');
    const revives = r.outcomes.filter((o) => o.o.kind === 'revived');
    const delays = revives.map((o) => { const d = r.outcomes.filter((v) => v.src === 'verdict' && v.at < o.at && v.o.kind === 'declined').sort((a, b) => b.at - a.at)[0]; return d ? o.at - d.at : null; }).filter((x) => x !== null);
    const rep = r.outcomes.filter((o) => o.o.kind === 'replaced-declined');
    const ign = r.outcomes.filter((o) => o.src !== 'verdict' && o.o.kind === 'ignored');
    const sup = r.rows.reduce((s, x) => s + x.supersedes, 0), csup = cal.rows.reduce((s, x) => s + x.supersedes, 0);
    note(`subs ${r.subs.length} (re-armed ${r.subs.filter((s) => s.rearmed).length})${r.subs.length ? ' [' + r.subs.map((s) => `${iso(s.at)} f=${s.finals} ${s.v} (${s.how})`).join('; ') + ']' : ''}; rows resting on a substitution: [${r.rows.filter((x) => x.restsOnSub).map((x) => x.id).join(' ')}]; absorbed ${r.absorbed.length} (whisper ${wEcho.length}); revives ${revives.length} (by verdict ${revives.filter((o) => o.src === 'verdict').length}, reverse rule ${revives.filter((o) => o.o.rule === 'reverse').length}); revive delay after the decline max ${delays.length ? Math.max(...delays) : '-'} ms; replaced-declined ${rep.length}; evidence ignored on a declined turn ${ign.length}; supersedes ${sup} (today ${csup}); drops ${r.drops} (today ${cal.drops}); reorders ${r.reorders.length}`);
    for (const o of revives.filter((o) => o.src !== 'verdict')) out.report.push(`[${mode}] revive ${name} ${iso(o.at)} by ${o.src} rule ${o.o.rule} score ${o.o.score.toFixed(2)} residual ${o.o.hits}/${o.o.residual} finals ${o.o.finals} q=${JSON.stringify((o.text ?? '').slice(0, 50))}`);
    for (const o of wEcho) out.report.push(`[${mode}] whisper echo ${name} ${iso(o.at)} score ${o.score.toFixed(2)} open ${o.openScore.toFixed(2)} q=${JSON.stringify(o.text.slice(0, 50))}`);
    for (const o of rep) out.report.push(`[${mode}] replaced-declined ${name} ${iso(o.at)} ${JSON.stringify(o.o)} q=${JSON.stringify((o.text ?? '').slice(0, 50))}`);
    for (const o of ign) out.report.push(`[${mode}] ignored-on-declined ${name} ${iso(o.at)} ${JSON.stringify(o.o)} q=${JSON.stringify((o.text ?? '').slice(0, 50))}`);
    const vo = {}; for (const o of r.outcomes.filter((x) => x.src === 'verdict')) { const k = o.o.kind === 'ignored' ? `ignored:${o.o.why}` : o.o.kind; vo[k] = (vo[k] ?? 0) + 1; }
    out.report.push(`[${mode}] verdict outcomes ${name}: ${JSON.stringify(vo)}`);
  }
}
// R14: policy independence, every row
for (const k of Object.keys(readings.fix)) if (JSON.stringify(readings.fix[k]) !== JSON.stringify(readings.fixunk[k])) out.incon.push(`R14 ${k}: fix=${JSON.stringify(readings.fix[k])} fixunk=${JSON.stringify(readings.fixunk[k])}`);
// R5: the controls
const br1 = FX.find(([n]) => n === 'br1'), cue = FX.find(([n]) => n === 'cuesmoke');
if (br1) {
  const c1 = run(br1[1], br1[2], 'control', extra); const x = c1.rows.find((r) => r.id === 'S1Q08');
  (x.n === 2 ? out.notes : out.incon).push(`R5 control (revive on, echo off) br1 S1Q08: ${x.n} dispatches (expected 2)`);
  const c2 = run(br1[1], br1[2], 'control2', extra); const y = c2.rows.find((r) => r.id === 'S1Q08');
  (y.fromLive === true && y.lat > y.budget ? out.notes : out.incon).push(`R5b control2 (revive off, echo on) br1 S1Q08: n=${y.n} fromLive=${y.fromLive} lat=${y.lat} (expected late, from Live: the revive is what fixes it)`);
}
if (cue) {
  const c1 = run(cue[1], cue[2], 'control', extra); const x = c1.rows.find((r) => r.id === 'S1Q08');
  (x.n === 2 ? out.notes : out.incon).push(`R5c control (echo off) cue S1Q08: ${x.n} dispatches (expected 2: the echo rule is what removes the double)`);
}
console.log(`FAIL rows (${out.fail.length}):\n  ${out.fail.join('\n  ')}\nINCONCLUSIVE (${out.incon.length}):\n  ${out.incon.join('\n  ')}\nnotes:\n  ${out.notes.join('\n  ')}\nreport:\n  ${out.report.join('\n  ')}`);
