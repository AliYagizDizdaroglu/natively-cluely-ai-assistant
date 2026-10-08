// Read-only probe: for consecutive bank items whose gap leaves item N's
// attribution window open past item N+1's start, does N+1's wording share
// >= 15% content words with N (the metrics module's claim test)?
import { INTERVIEW } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs';
const norm = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = norm(a), B = norm(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const spoken = INTERVIEW.filter((i) => (i.kind ?? 'spoken') === 'spoken');
let exposed = 0, crossClaim = 0;
for (let k = 0; k + 1 < spoken.length; k++) {
  const a = spoken[k], b = spoken[k + 1];
  const spill = 60 - a.gapMs / 1000; // seconds of a's window past b's playedAt
  if (spill <= 0) continue;
  exposed++;
  const ov = Math.max(overlap(b.q, a.q), overlap(a.q, b.q));
  const claims = ov >= 0.15;
  if (claims) crossClaim++;
  console.log(`${a.id}->${b.id} gap=${a.gapMs / 1000}s spill=${spill}s ov=${ov.toFixed(2)} ${claims ? 'CROSS-CLAIM' : ''}`);
}
console.log(`exposed pairs (gap<60s): ${exposed}; vocabulary-eligible for cross-claim: ${crossClaim}`);
