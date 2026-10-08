// r2 THROWAWAY (read-only; Minor 11 / the revive side's provenance): on the eight DS fixtures, every mark (a chip's
// text or a Live claim's text) scored against the interviewer finals that had arrived for its item so far — the
// distribution a reviving positive is drawn from. Counts unscorable (< 4 content words) and under-the-bar marks, by
// source, and lists the under-the-bar ones. Question text only.
import fs from 'node:fs';
import { FX } from './fx.mjs';
import { quoteScoreLike } from './quote-helper.mjs';
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const tally = { whisper: { n: 0, unscorable: 0, under: 0, first: 0, firstUnder: 0 }, live: { n: 0, unscorable: 0, under: 0, first: 0, firstUnder: 0 } };
const under = [];
for (const [name, fx] of FX) {
  if (name === 's50c-peritem') continue;
  const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
  f.items.forEach((it, k) => {
    const from = it.playedAt - 2000, to = (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90000) - 2000;
    const marks = f.actual.filter((a) => a.action === 'mark' && a.at >= from && a.at < to);
    marks.forEach((m, i) => {
      const finals = f.finals.filter((x) => x.at >= from && x.at < m.at).map((x) => x.text).join(' ');
      if (!finals) return;
      const text = m.question || m.anchor;
      const { scorable, score } = quoteScoreLike(text, finals);
      const t = tally[m.source]; t.n++; if (i === 0) t.first++;
      if (!scorable) t.unscorable++;
      else if (score < 0.5) { t.under++; if (i === 0) t.firstUnder++; under.push(`${name} ${it.id} ${iso(m.at)} ${m.source}/${m.verdict} score ${score.toFixed(2)}${i === 0 ? ' FIRST' : ''} q=${JSON.stringify(text.slice(0, 60))}`); }
    });
  });
}
console.log(`marks on a turn with finals: whisper n=${tally.whisper.n} unscorable ${tally.whisper.unscorable} under 0.5 ${tally.whisper.under} (first marks ${tally.whisper.first}, of which under ${tally.whisper.firstUnder}); live n=${tally.live.n} unscorable ${tally.live.unscorable} under 0.5 ${tally.live.under} (first marks ${tally.live.first}, of which under ${tally.live.firstUnder})`);
console.log(`under the bar (scorable, < 0.5):\n  ${under.join('\n  ')}`);
