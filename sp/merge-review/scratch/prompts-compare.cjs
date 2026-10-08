// Throwaway, read-only: compares MAIN's built prompts (0ef42a0 build) with the cue build's
// (whole-turn dist, d83fdfe = 8a13abb code). No network, no writes. Prints names, lengths, hashes.
const path = require('path');
const crypto = require('crypto');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const oldP = require(path.join(MAIN, 'dist-electron/electron/llm/prompts.js'));
const newP = require(path.join(WT, 'dist-electron/electron/llm/prompts.js'));
const h = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

const report = [];
report.push(`typed (new) === verbal (old):  ${newP.VERBAL_TYPED_PROMPT === oldP.VERBAL_WHAT_TO_ANSWER_PROMPT}`);
report.push(`verbal (new) === typed + CUE_RULE: ${newP.VERBAL_WHAT_TO_ANSWER_PROMPT === newP.VERBAL_TYPED_PROMPT + newP.CUE_RULE}`);
report.push(`CUE_RULE sha256/12 ${h(newP.CUE_RULE)}  length ${newP.CUE_RULE.length}`);
report.push(`CUE limits ${newP.CUE_MAX_LINES} x ${newP.CUE_MAX_WORDS}, sentinel ${newP.CUES_SENTINEL}`);
report.push(`verbal (new) contains SPOKEN_LENGTH_AND_DEPTH: ${newP.VERBAL_WHAT_TO_ANSWER_PROMPT.includes(newP.SPOKEN_LENGTH_AND_DEPTH)}`);
report.push(`UNIVERSAL_WHAT_TO_ANSWER_PROMPT contains __CUES__: ${newP.UNIVERSAL_WHAT_TO_ANSWER_PROMPT.includes('__CUES__')}`);

// Every export: which differ between the two builds, which are new, which vanished.
const keys = new Set([...Object.keys(oldP), ...Object.keys(newP)]);
const changed = [], added = [], removed = [];
for (const k of [...keys].sort()) {
    const a = oldP[k], b = newP[k];
    if (!(k in oldP)) { added.push(k); continue; }
    if (!(k in newP)) { removed.push(k); continue; }
    if (typeof a === 'function' || typeof b === 'function') { if (String(a) !== String(b)) changed.push(`${k} (function source)`); continue; }
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(`${k} ${typeof a === 'string' ? `len ${a.length} -> ${b.length}` : ''}`);
}
report.push(`exports added:   ${added.join(', ') || 'none'}`);
report.push(`exports removed: ${removed.join(', ') || 'none'}`);
report.push(`exports changed: ${changed.join('; ') || 'none'}`);
// Which string exports carry the cue sentinel at all (who could send the rule).
report.push(`string exports containing __CUES__: ${Object.keys(newP).filter((k) => typeof newP[k] === 'string' && newP[k].includes('__CUES__')).join(', ')}`);
// Other prompts that embed the verbal prompt by value (would inherit the rule).
report.push(`string exports containing the whole verbal prompt: ${Object.keys(newP).filter((k) => typeof newP[k] === 'string' && k !== 'VERBAL_WHAT_TO_ANSWER_PROMPT' && newP[k].includes(newP.VERBAL_WHAT_TO_ANSWER_PROMPT)).join(', ') || 'none'}`);
console.log(report.join('\n'));
