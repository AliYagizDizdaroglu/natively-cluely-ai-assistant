// Adds the 2026-10-02 deep-dive findings to the follow-up memory and its index line.
import fs from 'node:fs';
const D = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';
const f = D + 'project_followup_earlier_questions.md';
const anchor = '\nRelated: [[project-h40b-flight]]';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes(anchor) || t.includes('DEEP DIVE 2026-10-02')) { console.log('REFUSED memory'); process.exit(2); }
t = t.replace(anchor, `
- **DEEP DIVE 2026-10-02 (user: "a basic part of the app"; SP \`followup-deepdive/FINDINGS.md\`):** root cause = TIME-based
  retention (120 s SessionTracker window evicts the parent QUESTION; only ≤3 answer previews of 200 chars survive to 180 s,
  framed "avoid repetition"). 228 rows / 13 hours: parent absent 110/227 ⇔ gap ≥ 120 s; acceptable 86 % present vs 63 %
  absent; 19/20 off-topic answers parentless. Evicted self-contained follow-ups survive; evicted referential ones fail.
  The 01 Oct +3 = +6 (S1Q04F, S1Q06F) −2 S2Q09F (SELECTION BUG: parent still in window, selector inserted the older
  S2Q08F question) −1 S2Q05F (re-answered the coding parent). The 6c50ec3 wrong (S2Q07F) is on an item the 01 Oct gate
  does not fire on; answer-preview pull NOT supported as its cause (acceptable rows reuse the preview as much).
  Direction: TURN-based retention of questions only, gate on parent actually missing, most-recent selection, "do not
  re-answer" framing; answer-dependent follow-ups separate. Sat re-run stays as registered; the turn-based design
  gets its own Fable spec + Opus review + pre-registered non-holdout replay.
${anchor}`);
fs.writeFileSync(f, t);
const M = D + 'MEMORY.md';
let m = fs.readFileSync(M, 'utf8');
const k = m.split('\n').findIndex((l) => l.startsWith('- [Follow-up earlier questions]'));
if (k < 0) { console.log('REFUSED index'); process.exit(2); }
const ls = m.split('\n');
ls[k] = ls[k] + '; DEEP DIVE 2026-10-02: root cause = time-based retention (120 s evicts the parent question), S2Q09F selection bug, next = turn-based questions-only design after Sat';
fs.writeFileSync(M, ls.join('\n'));
console.log('ok');
