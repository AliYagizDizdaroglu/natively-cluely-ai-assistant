// Does the join-match anchor create a FALSE duplicate suppression in ChipDeduper?
// ChipDeduper.findSimilar: if (anchor && entry.anchor && now-entry.at < 20_000 && sameAnchor(...)) -> suppress
const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileLiveQuestion, reconcileWindowMs, sameAnchor, overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);
const TRE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const events = [];
for (const ln of lines) { const m = ln.match(TRE); if (m && m[3].trim()) events.push({ at: Date.parse(m[1]), text: m[3] }); }
const DRE = /^(\S+Z) \[LOG\] \[Main\] dispatch: (\w+) source=(live|whisper) anchor=(".*?"|null) verdict=(\w+) (.*)$/;
const disp = [];
for (const ln of lines) {
  const m = ln.match(DRE); if (!m) continue;
  const qm = m[6].match(/question=(".*")$/); if (!qm) continue;
  let q; try { q = JSON.parse(qm[1]); } catch { continue; }
  let a = null; try { a = m[4] === 'null' ? null : JSON.parse(m[4]); } catch {}
  disp.push({ at: Date.parse(m[1]), source: m[3], verdict: m[5], q, loggedAnchor: a });
}
const WIN = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Recompute each LIVE dispatch's anchor under the NEW code.
const rows = [];
for (const d of disp) {
  if (d.source !== 'live') { rows.push({ ...d, newAnchor: d.loggedAnchor, kind: 'whisper' }); continue; }
  const W = reconcileWindowMs(d.q);
  const r = reconcileLiveQuestion(d.q, WIN(d.at, W));
  rows.push({ ...d, newAnchor: r.anchor, newVerdict: r.verdict, kind: 'live' });
}
rows.sort((a, b) => a.at - b.at);

console.log('=== anchor changes introduced by the commit (live dispatches) ===');
let anchorChanged = 0;
for (const r of rows) {
  if (r.kind !== 'live') continue;
  if (r.loggedAnchor !== r.newAnchor) {
    anchorChanged++;
    if (anchorChanged <= 8) console.log(`  was ${JSON.stringify(String(r.loggedAnchor).slice(0,58))}\n  now ${JSON.stringify(String(r.newAnchor).slice(0,58))}\n     q: ${JSON.stringify(r.q.slice(0,58))}`);
  }
}
console.log(`  live dispatches whose anchor changed: ${anchorChanged}`);

console.log('\n=== FALSE suppression check: sameAnchor across DIFFERENT questions within the deduper 20s window ===');
let collisions = 0, checked = 0;
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (b.at - a.at >= 20000) break;              // deduper's base windowMs
    if (!a.newAnchor || !b.newAnchor) continue;
    if (norm(a.q) === norm(b.q)) continue;        // same question -> suppression is CORRECT
    if (overlap(a.q, b.q) >= 0.5 || overlap(b.q, a.q) >= 0.5) continue; // near-same question
    checked++;
    if (sameAnchor(a.newAnchor, b.newAnchor)) {
      collisions++;
      console.log(`  COLLISION (+${b.at - a.at}ms)  ${a.kind}/${b.kind}`);
      console.log(`    A q=${JSON.stringify(a.q.slice(0,62))}\n      anchor=${JSON.stringify(String(a.newAnchor).slice(0,62))}`);
      console.log(`    B q=${JSON.stringify(b.q.slice(0,62))}\n      anchor=${JSON.stringify(String(b.newAnchor).slice(0,62))}`);
    }
  }
}
console.log(`  different-question pairs inside 20s: ${checked};  sameAnchor collisions: ${collisions}`);

console.log('\n=== same check with the OLD anchors (as actually logged in the flight) ===');
let oldColl = 0, oldChecked = 0;
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (b.at - a.at >= 20000) break;
    if (!a.loggedAnchor || !b.loggedAnchor) continue;
    if (norm(a.q) === norm(b.q)) continue;
    if (overlap(a.q, b.q) >= 0.5 || overlap(b.q, a.q) >= 0.5) continue;
    oldChecked++;
    if (sameAnchor(a.loggedAnchor, b.loggedAnchor)) oldColl++;
  }
}
console.log(`  pairs: ${oldChecked};  collisions with the OLD anchors: ${oldColl}`);

console.log('\n=== MISSED dedup check: same question, two detectors, anchors no longer agree ===');
let missed = 0, same = 0;
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (b.at - a.at >= 20000) break;
    if (a.kind === b.kind) continue;
    const sameQ = norm(a.q) === norm(b.q) || overlap(a.q, b.q) >= 0.5 || overlap(b.q, a.q) >= 0.5;
    if (!sameQ) continue;
    same++;
    const nowOk = a.newAnchor && b.newAnchor && sameAnchor(a.newAnchor, b.newAnchor);
    const wasOk = a.loggedAnchor && b.loggedAnchor && sameAnchor(a.loggedAnchor, b.loggedAnchor);
    if (wasOk && !nowOk) { missed++; console.log(`  DEDUP LOST: ${JSON.stringify(a.q.slice(0,55))}\n    old anchors agreed, new anchors do not: ${JSON.stringify(String(a.newAnchor).slice(0,50))} vs ${JSON.stringify(String(b.newAnchor).slice(0,50))}`); }
  }
}
console.log(`  cross-detector same-question pairs inside 20s: ${same};  anchor dedup lost by the change: ${missed}`);
