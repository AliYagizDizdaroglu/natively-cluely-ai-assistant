// Read-only: pull the answered question text and the late Live claim text for S1Q08 from the two logs (dispatch
// lines' question= field, which is question text, not answer text) and score them with re-implementations of
// ChipDeduper's rules (containment on normalizeForContainment, Jaccard >= 0.7, contentWordSimilar, reconcile overlap).
import fs from 'node:fs';
const [br1, cue] = process.argv.slice(2);
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => JSON.parse('"' + s + '"');
const lineAt = (file, n) => fs.readFileSync(file, 'utf8').split(/\r?\n/)[n - 1];
const q = (file, n) => unq(lineAt(file, n).match(QRE)[1]);
const tokenize = (t) => new Set(t.toLowerCase().split(/\W+/).filter((x) => x.length > 0));
const jaccard = (a, b) => { const A = tokenize(a), B = tokenize(b); let i = 0; for (const t of A) if (B.has(t)) i++; const u = A.size + B.size - i; return u ? i / u : 0; };
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').replace(/\b([a-z]{1,3}) (\d+)\b/g, '$1$2').trim();
const cw = (t) => new Set((t.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const cws = (a, b) => { const A = cw(a), B = cw(b); const [S, L] = A.size <= B.size ? [A, B] : [B, A]; if (S.size < 4) return 0; let h = 0; for (const w of S) if (L.has(w)) h++; return h / S.size; };
const overlap = (a, b) => { const A = cw(a), B = cw(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const report = (label, answered, claim) => {
  const na = norm(answered), nc = norm(claim);
  console.log(`${label}\n  answered: ${JSON.stringify(answered.slice(0, 120))}\n  claim:    ${JSON.stringify(claim.slice(0, 120))}`);
  console.log(`  containment=${na.includes(nc) || nc.includes(na)}  jaccard=${jaccard(answered, claim).toFixed(2)} (dedup needs >= 0.70)  contentWordSimilar=${cws(claim, answered).toFixed(2)} (>= 0.60, cross-detector <= 5 s only)  overlap(claim->answered)=${overlap(claim, answered).toFixed(2)} (reconcile MATCH >= 0.50)`);
};
// br1: the S1Q08 STT finals as the classify saw them (turn text) = the question a revived turn would dispatch; the late Live claim at 11:02:46
const br1Turn = 'Now add delayed outcomes and experimentation, Extend that design so churn outcomes arrive thirty days later, and retention offers affect the labels you observe. Design the prediction logging, the experiment assignment, the outcome joins, and how you select data for retraining.';
report('br1 S1Q08 (hypothetical: revived turn answered at ~11:01:47.4; late Live claim 11:02:46.018 = +58.6 s)', br1Turn, q(br1, 3848));
report('cuesmoke S1Q08 (answered 13:37:15.989; late Live claim dispatched 13:38:32.443 = +76.5 s)', q(cue, 3660), q(cue, 3754));
