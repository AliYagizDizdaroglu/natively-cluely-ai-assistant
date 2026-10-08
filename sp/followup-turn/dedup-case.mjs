// Invented sentences only (no roster, no holdout, no profile). Simulates the spec's ledger rules
// (push at dispatch, sameAnchor-within-60s dedup = replace, depth 3) + §3.3 selection + §3.2 gate.
import { pathToFileURL } from 'node:url';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-context/';
const ref = await import(pathToFileURL(SP + 'earlierQuestions.ref.mjs').href);
const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
function run(label, events, windowLines) {
  let ledger = [];
  let out = null;
  for (const e of events) {
    const newest = ledger[ledger.length - 1];
    if (e.supersedeOf !== undefined) { ledger = ledger.map((x) => x.turnId === e.supersedeOf ? { ...x, text: e.text, at: e.at } : x); }
    else if (newest && ref.sameAnchor(newest.text, e.text) && e.at - newest.at < 60_000) ledger[ledger.length - 1] = { text: e.text, turnId: e.turnId, at: e.at };
    else ledger.push({ text: e.text, turnId: e.turnId, at: e.at });
    ledger = ledger.slice(-3);
    if (e.ask) {
      const isCur = (t) => { const a = norm(t), b = norm(e.text); return a.length >= 3 && b.length >= 3 && (a === b || a.includes(b) || b.includes(a)); };
      const parent = [...ledger].reverse().find((x) => !isCur(x.text));
      const g = ref.gate(e.text);
      const present = parent && (windowLines.some((l) => ref.sameAnchor(l, parent.text)) || norm(e.text).includes(norm(parent.text)));
      out = { cue: g.cue, parentTurn: parent?.turnId ?? null, block: g.fires && parent && !present ? 'BLOCK' : "''" };
    }
  }
  console.log(`${label}: ledger turns=[${ledger.map((x) => x.turnId).join(',')}] ->`, JSON.stringify(out));
}
const GP = 'Walk me through how you would migrate a monolith database to per-service schemas.';
const P = 'Design a rate limiter for an API gateway that handles bursts and per tenant quotas.';
const F = 'Why that algorithm?';
// grandparent at t=0 (evicted by the time F is asked), parent at t=200 s, follow-up 30 s later.
// The window still holds P's STT line (asked 30 s ago) -> P is present.
run('A quick distinct follow-up, 30 s after its parent', [
  { text: GP, turnId: 1, at: 0 }, { text: P, turnId: 2, at: 200_000 }, { text: F, turnId: 3, at: 230_000, ask: true },
], [P]);
run('A same, 90 s after (no dedup)', [
  { text: GP, turnId: 1, at: 0 }, { text: P, turnId: 2, at: 200_000 }, { text: F, turnId: 3, at: 290_000, ask: true },
], [P]);
// supersede merge: P dispatched, the interviewer adds the follow-up within 8 s -> one turn, text P + F2
const F2 = 'And how would that limiter behave across regions?';
run('B follow-up merged into the parent turn (supersede)', [
  { text: GP, turnId: 1, at: 0 }, { text: P, turnId: 2, at: 200_000 }, { text: `${P} ${F2}`, supersedeOf: 2, turnId: 2, at: 206_000, ask: true },
], [P, F2]);
