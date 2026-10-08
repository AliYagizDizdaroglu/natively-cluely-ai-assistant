// r2 THROWAWAY: every claim the r2 machine absorbs on the fixtures (fix mode), with the numbers the echo test used
// (rem score, open score, residual size, residual hits) and what two alternative residual tests would say, so the
// test's form can be chosen on the whole positive class at once. Also the on-time claims the residual test treats as
// echoes (from quote-metrics). usage: node absorbed-table.mjs [--jitter MS]
import fs from 'node:fs';
import { FX, run, iso } from './fx.mjs';
const rest = process.argv.slice(2);
const argv = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const extra = ['--jitter', argv('--jitter', '50')];
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const frac = (a, b) => { const A = content(a), B = content(b); let h = 0; for (const w of A) if (B.has(w)) h++; return A.size ? h / A.size : 0; };
const lines = [];
for (const [name, fx, log] of FX) {
  if (name === 's50c-peritem') continue;
  const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
  const r = run(fx, log, 'fix', extra);
  const items = f.items.map((i) => ({ id: i.id, q: i.q, from: i.playedAt, end: i.playedAt + i.clipSecs * 1000 }));
  const attribute = (t, text) => { let best = null, bs = 0; for (const it of items) { if (it.from - 2000 > t) continue; if (t - it.end > 180000) continue; const s = frac(text, it.q); if (s > bs || (s === bs && best && it.from > best.from)) { bs = s; best = it; } } return bs >= 0.5 ? best.id : null; };
  for (const a of r.absorbed) {
    const onTime = a.lagFromLastClipEnd !== null && a.lagFromLastClipEnd <= 10000;
    const lastItem = items.filter((it) => it.end <= a.at + 500).sort((x, y) => y.end - x.end)[0];
    const item = onTime ? lastItem.id : attribute(a.at, a.text);
    const ratio = a.residual ? a.hits / a.residual : 0;
    lines.push(`${name.padEnd(9)} ${iso(a.at)} ${a.source.padEnd(7)} ${onTime ? 'ON-TIME' : 'late   '} +${(a.lagFromLastClipEnd / 1000).toFixed(1).padStart(6)}s item=${String(item).padEnd(7)} echoOf=${String(attribute(a.at - a.ageMs, a.of)).padEnd(7)} rem ${a.score.toFixed(2)} open ${a.openScore.toFixed(2)} residual ${String(a.hits).padStart(2)}/${String(a.residual).padEnd(2)} ratio ${ratio.toFixed(2)} | hits>=2: ${a.hits >= 2 ? 'JOIN' : 'echo'}  ratio>=0.25&hits>=2: ${a.hits >= 2 && ratio >= 0.25 ? 'JOIN' : 'echo'}  q=${JSON.stringify(a.text.slice(0, 45))}`);
  }
}
console.log(`absorbed claims on the fixtures (fix mode): ${lines.length}\n${lines.join('\n')}`);
