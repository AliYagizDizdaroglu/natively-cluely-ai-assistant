// ../../../../../natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/llm/earlierQuestionGate.ts
var INTERJECTION = /^(?:(?:yes|no|ok|okay|alright|right|sure|great|good|fine|well|hmm|mm|yeah|so)\b[,.!]?\s*)+/i;
function firstSegment(q) {
  const m = q.match(/^[^.:;?!,—]*/);
  return (m ? m[0] : q).trim();
}
var CALLBACK = /\b(going back to|go back to|back to (the|your|that|what)|coming back to|to come back to|returning to|you (mentioned|said|described|talked about|proposed|suggested|outlined|brought up|discussed)|as (you|we) (said|discussed|mentioned)|we (discussed|talked about|covered)|earlier (you|question|answer|design|approach|solution)|(mentioned|said|discussed|described|asked|talked about) earlier|previously|a (moment|minute|few minutes|while) ago|from earlier|earlier on)\b/i;
var REFERENCE = /\b(your|that|the previous|the earlier|the last|the first|the original) (answer|approach|design|solution|function|query|queries|code|implementation|pipeline|service|limiter|cache|schema|architecture|system|plan|example|gateway|endpoint|adapter|batcher|runner|manifest|manifests|response|strategy|recommendation|estimate|configuration|policy|migration|rollout|contract|budget|index|table|tables|job|test|tests|version|number|numbers|figure|figures|calculation|logic|setup|design task)\b/i;
var LEADING = /^(and|but|so|then|also|what about|how about|what if|and if|but if|if instead|now without|now with|now that|without the|without a|without using|instead of the|instead of that|same question|in that case|otherwise|one more|follow[- ]?up|what breaks|what fails|what goes wrong|what would break|what could go wrong|what would change|what changes|what else|what more|anything else|what would you (add|change|do differently|remove|drop|keep))\b/i;
var CONSTRAINT = /\b(while|still|and still|but still|yet still|without (losing|breaking|violating))\s+(preserv|keep|maintain|retain|respect|honou?r|satisfy|meet)\w*\s+(the|that|those|its|their|our|my)\b[^.?!]{0,60}?\b(rule|rules|constraint|constraints|requirement|requirements|guarantee|guarantees|invariant|invariants|property|properties|semantics|ordering|order|behaviou?r|contract|budget|limit|limits|tie|ties|target|targets|sla|slo|slos|deadline|latency)\b/i;
var THAT_NOT = /\b(so|such|given|now|provided|assuming|except|in|the fact|means|ensure|ensures|assume|note|say|says|know|think|require|requires|argue) that\b/gi;
var THAT_PRE = /\b(is|was|are|were|does|did|do|would|could|should|will|can|might|may|has|have|had|if|when|while|where|because|unless|until|once|whether|about|with|for|to|of|on|from|at|than|and|or|but|then|extend|make|handle|change|run|test|scale|deploy|shard|secure|monitor|cache|retry|resume|restart|version|index|store|serve|call|use|keep|move|split|merge|swap|replace|rewrite|debug|fix|break|build|write|implement|design|prove|verify|validate|check|reduce|improve|optimize|tune|simplify|generalize|adapt|port|migrate|convert|apply|reuse|repeat|redo|explain|describe|justify|defend|like|beyond|after|before|without|against) that\b/i;
var THIS_NOT = /\bthis (case|scenario|situation|question|problem|example|interview|role|company|context|setup|task|exercise|round)\b/i;
var SHORT_WORDS = 3;
var CONSTRAINT_MAX_WORDS = 25;
var wordsOf = (q) => (q.match(/[A-Za-z0-9']+/g) ?? []).length;
function gate(question) {
  const raw = (question ?? "").trim();
  if (!raw) return { fires: false, cue: "none" };
  const q = raw.replace(INTERJECTION, "").trim() || raw;
  if (CALLBACK.test(q)) return { fires: true, cue: "callback" };
  if (REFERENCE.test(q)) return { fires: true, cue: "reference" };
  if (LEADING.test(q)) return { fires: true, cue: "leading" };
  if (wordsOf(q) <= CONSTRAINT_MAX_WORDS && CONSTRAINT.test(q)) return { fires: true, cue: "constraint" };
  const seg = firstSegment(q);
  const segl = ` ${seg.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ")} `;
  for (const p of ["it", "they", "them", "those", "these"]) if (segl.includes(` ${p} `)) return { fires: true, cue: "pronoun" };
  if (segl.includes(" this ") && !THIS_NOT.test(seg)) return { fires: true, cue: "pronoun" };
  const segThat = seg.replace(THAT_NOT, " ");
  if (THAT_PRE.test(segThat) || /^that\b/i.test(segThat)) return { fires: true, cue: "pronoun" };
  if (/\b(the same|such a|such an)\b/i.test(seg)) return { fires: true, cue: "pronoun" };
  if (wordsOf(q) <= SHORT_WORDS) return { fires: true, cue: "short" };
  return { fires: false, cue: "none" };
}
export {
  firstSegment,
  gate,
  wordsOf
};
