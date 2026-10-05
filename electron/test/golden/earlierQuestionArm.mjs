/**
 * EARLIER QUESTION variants of a captured user turn, for the flight's same-bytes control
 * (PREREGISTER-flight-eq §7 b4): the block the app inserted (spec 2026-10-03 §3.4: the last
 * context part, `${LABEL}\n- <one line>`, joined with "\n\n" before INTERVIEWER JUST SAID),
 * removed byte for byte. Pure string functions, so interview60.answers.mjs stays a runner and
 * these stay tested without a key or a build.
 */
const MARKER = 'INTERVIEWER JUST SAID:\n';

/**
 * Splits a captured user turn into { user, block }: `block` is the one EARLIER QUESTION block
 * placed immediately before the marker, `user` the turn with `${block}\n\n` removed — the
 * flag-off bytes of the same call. Returns null when the turn carries no label, more than one,
 * a label that is not the start of a block, a block of more than one parent line, or a block
 * not immediately before the marker: the caller refuses rather than sending bytes it did not
 * strip, which would bench a different control from the registered one.
 */
export function splitEarlierQuestion(user, label) {
    const head = `${label}\n- `;
    const first = user.indexOf(label);
    if (first < 0 || !user.startsWith(head, first) || user.indexOf(label, first + 1) >= 0) return null;
    const mi = user.indexOf(MARKER, first);
    if (mi < 0) return null;
    const removed = user.slice(first, mi);                       // `${label}\n- <line>\n\n`
    if (!removed.endsWith('\n\n')) return null;
    const block = removed.slice(0, -2);
    if (block.slice(head.length).includes('\n')) return null;    // exactly one parent line, nothing between it and the marker
    return { user: user.slice(0, first) + user.slice(mi), block };
}

/** The replay's insertBlock: `${block}\n\n` immediately before the marker; '' is identity. */
export function withEarlierQuestion(user, block) {
    if (!block) return user;
    const i = user.indexOf(MARKER);
    if (i < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    return `${user.slice(0, i)}${block}\n\n${user.slice(i)}`;
}
