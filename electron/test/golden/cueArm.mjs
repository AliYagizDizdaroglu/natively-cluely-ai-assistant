/**
 * Cue-rule variants of a captured system prompt, for the offline arms (cue mode, spec
 * 2026-09-20 §8). Pure string functions, so interview60.answers.mjs stays a runner and these
 * stay tested without a key or a build.
 */

/** Whether the captured system prompt already carries the shipped rule, byte for byte. */
export const carriesCueRule = (system, rule) => system.includes(rule);

/**
 * The rule inserted where the app puts it: directly after the structured rule (the tail of
 * SPOKEN_LENGTH_AND_DEPTH), before the notes block and the language line the request appends
 * after the prompt. Returns null when the anchor is missing — the caller refuses rather than
 * appending somewhere else, which would bench a different position from the shipped one. A
 * prompt that already carries the rule is returned unchanged, never doubled.
 */
export function withCueRule(system, rule, anchor) {
    if (carriesCueRule(system, rule)) return system;
    const at = system.indexOf(anchor);
    if (at === -1) return null;
    const end = at + anchor.length;
    return system.slice(0, end) + rule + system.slice(end);
}

/** The rule removed, byte for byte — the pre-cue bytes of a cue hour. */
export const withoutCueRule = (system, rule) => system.split(rule).join('');
