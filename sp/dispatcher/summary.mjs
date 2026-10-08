// Read-only: one row per `turn: close reason=not-a-question`, over many run folders.
// Columns: run, item, why the classify said no (model false / null->degraded / other), what the detector's own
// NEXT call on the same speech said, and what the item got afterwards (answers attributed by play window:
// [playedAt-2s, next item's playedAt-2s)), with delays measured from the clip's end.
// Never prints [Answer] lines; question text only.
import fs from 'node:fs';
import path from 'node:path';
const dirs = process.argv.slice(2);
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script, text) => { const a = content(script), b = content(text); let h = 0; for (const w of a) if (b.has(w)) h++; return a.size ? h / a.size : 1; };
const rows = [];
for (const dir of dirs) {
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const items = tl.items.map((i, k) => ({ id: i.id, q: i.q, from: tl.startedMs + OFF + i.startSec * 1000, end: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
  items.forEach((it, k) => { it.winFrom = it.from - 2000; it.winTo = (items[k + 1]?.from ?? it.end + 90000) - 2000; });
  const itemAt = (t) => items.find((it) => t >= it.winFrom && t < it.winTo) ?? null;
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  for (let i = 0; i < L.length; i++) {
    if (!/close reason=not-a-question/.test(L[i])) continue;
    const at = T(L[i]);
    const it = itemAt(at);
    // the classify line and the verdict just before the close
    let ci = i; while (ci >= 0 && !/turn: classify/.test(L[ci])) ci--;
    const cls = L[ci] ?? '';
    const finalsN = (cls.match(/finals=(\d+)/) ?? [])[1];
    let why = 'unknown';
    for (let j = i - 1; j > ci; j--) {
      if (/degraded: no chip/.test(L[j])) { why = 'null->degraded(no)'; break; }
      const m = L[j].match(/detect returned \+(\d+)ms result=(.*)$/);
      if (m) { why = m[2].startsWith('null') ? 'null' : `model ${m[2].replace(/ q\.len=\d+/, '')}`; break; }
    }
    // the detector's own next call after the close (same item window)
    let next = '-';
    for (let j = i + 1; j < L.length && T(L[j]) < at + 6000; j++) {
      const m = L[j].match(/detect returned \+(\d+)ms result=(.*)$/);
      if (m) { next = `${iso(T(L[j]))} ${m[2].startsWith('null') ? 'null' : m[2].replace(/ difficulty=\w+/, '')}`; break; }
    }
    // answers attributed to this item
    const answers = [];
    if (it) for (let j = 0; j < L.length; j++) {
      const t = T(L[j]); if (!(t >= it.winFrom && t < it.winTo)) continue;
      const m = L[j].match(/\[Main\] dispatch: (answer|supersede) source=(\w+) .*? question="((?:[^"\\]|\\.)*)"/);
      if (m) {
        let gate = ''; for (let k = j - 1; k >= 0 && k > j - 4; k--) { const g = L[k].match(/turn: gate=(\d+) finals=(\d+) live=(\d+)/); if (g) { gate = `f${g[2]}l${g[3]}`; break; } }
        let q = m[3]; try { q = JSON.parse(`"${m[3]}"`); } catch {}
        answers.push(`${m[1]}/${m[2]}${gate ? '/' + gate : ''} +${((t - it.end) / 1000).toFixed(1)}s cov=${coverage(it.q, q).toFixed(2)}`);
      }
    }
    rows.push({ run: path.basename(dir).replace(/^2026-09-/, ''), item: it?.id ?? '(probe)', clipEnd: it ? iso(it.end) : '-', classifyAt: iso(T(cls)), finals: finalsN, closeVsEnd: it ? `+${((at - it.end) / 1000).toFixed(1)}s` : '-', why, next, answers: answers.join(' | ') || 'NONE' });
  }
}
for (const r of rows) console.log(`${r.run.padEnd(24)} ${r.item.padEnd(8)} end=${r.clipEnd} classify=${r.classifyAt} f=${r.finals} close${r.closeVsEnd}\n    classify-said: ${r.why}\n    detector-next: ${r.next}\n    answers: ${r.answers}`);
console.log(`\n${rows.length} not-a-question closes`);
