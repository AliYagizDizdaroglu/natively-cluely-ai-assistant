// r2 THROWAWAY (R2 of the rule): the committed legacy fixtures (s50a, after9), fed exactly as the committed test feeds
// them (every detection, text = its anchor, no verdicts, no anchor to the deduper), through proto-r2.ts with memory off
// and with memory on. Scored with the committed test's own rows. Built on the reviewer's legacy-r2.mjs; the calls use
// r2's evidence() entry point. Question text only.
import fs from 'node:fs';
import path from 'node:path';
import { createTurn, C } from './proto-r2.ts';
import { ChipDeduper } from '../../dispatcher/src/ChipDeduper.ts';
const FIX = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/fixtures';
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'your', 'you', 'we', 'our', 'my', 'i', 'would', 'how', 'what', 'which', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'should']);
const words = (s) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const content = (s) => new Set(words(s).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script, text) => { const a = content(script), b = content(text); let hit = 0; for (const w of a) if (b.has(w)) hit++; return a.size ? hit / a.size : 1; };
for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
  const f = JSON.parse(fs.readFileSync(path.join(FIX, `${name}-turns.json`), 'utf8'));
  for (const memory of [{ revive: false, echo: false }, { revive: true, echo: true }]) {
    const turn = createTurn(memory);
    const events = [];
    for (const it of f.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
    for (const x of f.finals) events.push({ at: x.at, order: 1, type: 'final', text: x.text });
    for (const x of f.detections) events.push({ at: x.at, order: 2, type: 'detected', source: x.source, text: x.text });
    events.sort((a, b) => a.at - b.at || a.order - b.order);
    const out = []; let clock = events[0].at; const dedup = new ChipDeduper({ now: () => clock }); let answeredId, drops = 0, absorbed = 0, classifies = 0;
    const settle = () => { for (let g = 0; g < 8; g++) { const d = turn.tick(clock); if (d.kind === 'idle' || d.kind === 'hold') break; if (d.kind === 'classify') { classifies++; out.push({ at: clock, d }); continue; } if (d.kind === 'dispatch') { const r = dedup.admit({ question: d.text, source: d.fromLive ? 'live' : 'whisper' }); if (r.admitted) { dedup.markAnswered(r.id); answeredId = r.id; out.push({ at: clock, d }); } else { answeredId = undefined; drops++; } continue; } if (d.kind === 'supersede') { dedup.extend(answeredId, d.text); out.push({ at: clock, d }); continue; } out.push({ at: clock, d }); } };
    const runTimers = (until) => { for (let g = 0; g < 200; g++) { const t = turn.nextTimerAt(clock); if (t === null || t > until) return; clock = t; settle(); } };
    for (const e of events) {
      runTimers(e.at); clock = e.at;
      if (e.type === 'speech') turn.speech(e.on, e.at);
      else if (e.type === 'final') turn.final(e.text, e.at);
      else { const o = turn.evidence(e.source, e.text, e.at); if (o.kind === 'absorbed') absorbed++; }
      settle();
    }
    runTimers(clock + 60000);
    const spoken = f.items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
    const rows = spoken.map((it) => { const k = f.items.indexOf(it); const from = it.playedAt - 2000, to = (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90000) - 2000; const mine = out.filter((o) => o.at >= from && o.at < to); const disp = mine.filter((o) => o.d.kind === 'dispatch'); const voiceOff = it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000; const fd = f.detections.filter((x) => x.at >= from && x.at < to).map((x) => x.at).sort((a, b) => a - b)[0] ?? null; const last = [...mine].reverse().find((o) => o.d.kind === 'dispatch' || o.d.kind === 'supersede'); return { id: it.id, long: !!it.long || it.level === 'long', n: disp.length, sup: mine.filter((o) => o.d.kind === 'supersede').length, early: disp.some((o) => o.at < voiceOff), lat: disp.length ? disp[0].at - voiceOff : null, budget: Math.max(voiceOff + C.gateMs + C.settleMs, fd ?? 0) + 100 - voiceOff, cov: coverage(it.q, last && 'text' in last.d ? last.d.text : '') }; });
    const lat = rows.map((r) => r.lat).filter((x) => x !== null).sort((a, b) => a - b);
    console.log(`${name} memory=${JSON.stringify(memory)}: once ${rows.filter((r) => r.n === 1).length}/${rows.length} [not once: ${rows.filter((r) => r.n !== 1).map((r) => `${r.id}:${r.n}`).join(' ')}], supersedes ${rows.reduce((s, r) => s + r.sup, 0)}, early ${rows.filter((r) => r.early).length}, long-whole ${rows.filter((r) => r.long && r.cov >= 0.8).length}/${rows.filter((r) => r.long).length}, over budget [${rows.filter((r) => r.lat !== null && r.lat > r.budget).map((r) => `${r.id}:${r.lat}>${r.budget}`).join(' ')}], median ${lat[Math.floor(lat.length / 2)]}, drops ${drops}, absorbed ${absorbed}, classifies (never answered: the committed feed has no verdicts) ${classifies}`);
  }
}
