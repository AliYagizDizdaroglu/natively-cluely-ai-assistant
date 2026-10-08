// Throwaway, read-only: what the merged harness scripts get from MAIN's CURRENT (pre-cue) dist.
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const F = require(MAIN + '/dist-electron/electron/llm/verbalStreamFilter.js');
const P = require(MAIN + '/dist-electron/electron/llm/prompts.js');
console.log('typeof stripCueBlock in MAIN dist:', typeof F.stripCueBlock);
console.log('typeof P.CUE_RULE in MAIN dist:', typeof P.CUE_RULE);
try { F.stripCueBlock((async function* () {})(), () => {}); console.log('call: ok'); } catch (e) { console.log('call throws:', e.constructor.name, '-', e.message); }
console.log("'x'.includes(P.CUE_RULE) ->", 'x'.includes(P.CUE_RULE), " ; 'has undefined'.includes(P.CUE_RULE) ->", 'has undefined'.includes(P.CUE_RULE));
