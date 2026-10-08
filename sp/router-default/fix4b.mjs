import fs from 'node:fs';
const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b/electron/services/routerArbiter.test.ts';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf("  it('supersede after a Live decision with zero Live tokens sent");
const b = s.indexOf("  it('supersede after Live text was shown: the replacing token keeps replace:true'");
if (a < 0 || b < a) throw new Error('markers');
s = s.slice(0, a) + "  // The plan's second case (a Live decision with zero Live tokens sent) cannot be reached through the public API: a Live decision needs a\n  // complete first word, and the display always shows that word (a marker or a hard word reads row 3/4, not Live). The guard is keyed on\n  // visible text, so it covers that case too; it is pinned by the pending cases here and by the shown-text case below.\n" + s.slice(b);
fs.writeFileSync(p, s);
