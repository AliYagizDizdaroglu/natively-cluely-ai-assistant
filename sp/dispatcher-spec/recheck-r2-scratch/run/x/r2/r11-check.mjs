// RECHECK THROWAWAY: R11's attribution on the 22 absorbed claims (fix mode), r2's rule against the rule this
// re-check proposes: attribute each absorbed claim to BOTH the item whose clip ended last before it (time, any lag)
// and the item its text names (livelag's rule); FAIL when either was not answered before the claim.
// Calibration (rule 8): the proposed rule must pass all 22 recorded absorptions; X1 (recheck-crafted.mjs) is the
// known-bad shape it must fail on (a follow-up's late inlining claim absorbed while the follow-up is unanswered).
import fs from 'node:fs';
import { FX, run, iso } from './fx.mjs';
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const frac = (a, b) => { const A = content(a), B = content(b); let h = 0; for (const w of A) if (B.has(w)) h++; return A.size ? h / A.size : 0; };
let r2fail = 0, newfail = 0, n = 0;
for (const [name, fx, log] of FX) {
  if (name === 's50c-peritem') continue;
  const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
  const r = run(fx, log, 'fix', ['--jitter', '50']);
  const items = f.items.map((i) => ({ id: i.id, q: i.q, from: i.playedAt, end: i.playedAt + i.clipSecs * 1000 }));
  const textItem = (t, text) => { let best = null, bs = 0; for (const it of items) { if (it.from - 2000 > t) continue; if (t - it.end > 180000) continue; const s = frac(text, it.q); if (s > bs || (s === bs && best && it.from > best.from)) { bs = s; best = it; } } return bs >= 0.5 ? best.id : null; };
  const answeredBefore = (id, t) => { const w = r.rows.find((x) => x.id === id); return !!w && w.first !== null && w.first < t; };
  for (const a of r.absorbed) {
    n++;
    const timeItem = items.filter((it) => it.end <= a.at + 500).sort((x, y) => y.end - x.end)[0]?.id ?? null;
    const lag = a.lagFromLastClipEnd;
    const r2item = lag !== null && lag <= 10000 ? timeItem : textItem(a.at, a.text);
    const tItem = textItem(a.at, a.text);
    const r2ok = r2item !== null && answeredBefore(r2item, a.at);
    const newok = [timeItem, tItem].filter(Boolean).every((id) => answeredBefore(id, a.at));
    if (!r2ok) r2fail++; if (!newok) newfail++;
    console.log(`${name.padEnd(9)} ${iso(a.at)} +${(lag / 1000).toFixed(1)}s  r2 item=${String(r2item).padEnd(7)} ${r2ok ? 'pass' : 'FAIL'} | time item=${String(timeItem).padEnd(7)} answered=${answeredBefore(timeItem, a.at)} text item=${String(tItem).padEnd(7)} answered=${tItem ? answeredBefore(tItem, a.at) : '-'} -> proposed ${newok ? 'pass' : 'FAIL'}`);
  }
}
console.log(`\n${n} absorbed claims: r2's R11 fails ${r2fail}; the proposed rule fails ${newfail}`);
