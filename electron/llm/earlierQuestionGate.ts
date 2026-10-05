// The surface cue gate of the turn-based follow-up context (spec 2026-10-03 §3.2): design 2's
// calibrated cue set, unchanged. Ported byte for byte from the replay's hashed reference
// (scratchpad followup-context/earlierQuestions.ref.mjs, sha256 0459f578…): every regex below is
// that file's. Designed on scenario50 texts and general language, never on holdout40.
// Measured on the scenario50 roster: follow-ups needing a parent 11/12 fired, standalone
// follow-ups 1/38 false, dependent mains 4/4, standalone mains 0/46 (spec §3.2).

export type Cue = 'callback' | 'reference' | 'leading' | 'constraint' | 'pronoun' | 'short' | 'none';

/** Leading interjections and connectives are not part of the question ("Okay, and if it fails?"). */
const INTERJECTION = /^(?:(?:yes|no|ok|okay|alright|right|sure|great|good|fine|well|hmm|mm|yeah|so)\b[,.!]?\s*)+/i;

/** The first comma-free segment: text up to the first . : ; ? ! , or an em dash. */
export function firstSegment(q: string): string {
    const m = q.match(/^[^.:;?!,—]*/);
    return (m ? m[0] : q).trim();
}

// Explicit reference to something said earlier in the interview.
const CALLBACK = /\b(going back to|go back to|back to (the|your|that|what)|coming back to|to come back to|returning to|you (mentioned|said|described|talked about|proposed|suggested|outlined|brought up|discussed)|as (you|we) (said|discussed|mentioned)|we (discussed|talked about|covered)|earlier (you|question|answer|design|approach|solution)|(mentioned|said|discussed|described|asked|talked about) earlier|previously|a (moment|minute|few minutes|while) ago|from earlier|earlier on)\b/i;

// A determiner or possessive on a thing the candidate produced or was asked about. "this" is
// left out: "in this scenario" names the current setup.
const REFERENCE = /\b(your|that|the previous|the earlier|the last|the first|the original) (answer|approach|design|solution|function|query|queries|code|implementation|pipeline|service|limiter|cache|schema|architecture|system|plan|example|gateway|endpoint|adapter|batcher|runner|manifest|manifests|response|strategy|recommendation|estimate|configuration|policy|migration|rollout|contract|budget|index|table|tables|job|test|tests|version|number|numbers|figure|figures|calculation|logic|setup|design task)\b/i;

// Continuations and comparatives that only make sense against something before.
const LEADING = /^(and|but|so|then|also|what about|how about|what if|and if|but if|if instead|now without|now with|now that|without the|without a|without using|instead of the|instead of that|same question|in that case|otherwise|one more|follow[- ]?up|what breaks|what fails|what goes wrong|what would break|what could go wrong|what would change|what changes|what else|what more|anything else|what would you (add|change|do differently|remove|drop|keep))\b/i;

// Keep/preserve a constraint that was stated before ("while preserving the tie rule").
const CONSTRAINT = /\b(while|still|and still|but still|yet still|without (losing|breaking|violating))\s+(preserv|keep|maintain|retain|respect|honou?r|satisfy|meet)\w*\s+(the|that|those|its|their|our|my)\b[^.?!]{0,60}?\b(rule|rules|constraint|constraints|requirement|requirements|guarantee|guarantees|invariant|invariants|property|properties|semantics|ordering|order|behaviou?r|contract|budget|limit|limits|tie|ties|target|targets|sla|slo|slos|deadline|latency)\b/i;

// "that" is a pronoun after an auxiliary/preposition/verb, or before an auxiliary; never in
// these fixed phrases, where it is a conjunction or a relative.
const THAT_NOT = /\b(so|such|given|now|provided|assuming|except|in|the fact|means|ensure|ensures|assume|note|say|says|know|think|require|requires|argue) that\b/gi;
const THAT_PRE = /\b(is|was|are|were|does|did|do|would|could|should|will|can|might|may|has|have|had|if|when|while|where|because|unless|until|once|whether|about|with|for|to|of|on|from|at|than|and|or|but|then|extend|make|handle|change|run|test|scale|deploy|shard|secure|monitor|cache|retry|resume|restart|version|index|store|serve|call|use|keep|move|split|merge|swap|replace|rewrite|debug|fix|break|build|write|implement|design|prove|verify|validate|check|reduce|improve|optimize|tune|simplify|generalize|adapt|port|migrate|convert|apply|reuse|repeat|redo|explain|describe|justify|defend|like|beyond|after|before|without|against) that\b/i;
const THIS_NOT = /\bthis (case|scenario|situation|question|problem|example|interview|role|company|context|setup|task|exercise|round)\b/i;

const SHORT_WORDS = 3;
const CONSTRAINT_MAX_WORDS = 25; // a long question that keeps a constraint states it itself (S2Q06, S4Q07)
export const wordsOf = (q: string): number => (q.match(/[A-Za-z0-9']+/g) ?? []).length;

/** Returns { fires, cue }. cue: 'callback' | 'reference' | 'leading' | 'constraint' | 'pronoun' | 'short' | 'none'. */
export function gate(question: string | null | undefined): { fires: boolean; cue: Cue } {
    const raw = (question ?? '').trim();
    if (!raw) return { fires: false, cue: 'none' };
    const q = raw.replace(INTERJECTION, '').trim() || raw;
    if (CALLBACK.test(q)) return { fires: true, cue: 'callback' };
    if (REFERENCE.test(q)) return { fires: true, cue: 'reference' };
    if (LEADING.test(q)) return { fires: true, cue: 'leading' };
    if (wordsOf(q) <= CONSTRAINT_MAX_WORDS && CONSTRAINT.test(q)) return { fires: true, cue: 'constraint' };
    const seg = firstSegment(q);
    const segl = ` ${seg.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ')} `;
    for (const p of ['it', 'they', 'them', 'those', 'these']) if (segl.includes(` ${p} `)) return { fires: true, cue: 'pronoun' };
    if (segl.includes(' this ') && !THIS_NOT.test(seg)) return { fires: true, cue: 'pronoun' };
    const segThat = seg.replace(THAT_NOT, ' ');
    // "that" after a noun is a relative clause ("a batch that fails"): only after an auxiliary,
    // preposition or verb (THAT_PRE), or as the segment's first word, is it a pronoun.
    if (THAT_PRE.test(segThat) || /^that\b/i.test(segThat)) return { fires: true, cue: 'pronoun' };
    if (/\b(the same|such a|such an)\b/i.test(seg)) return { fires: true, cue: 'pronoun' };
    if (wordsOf(q) <= SHORT_WORDS) return { fires: true, cue: 'short' };
    return { fires: false, cue: 'none' };
}
