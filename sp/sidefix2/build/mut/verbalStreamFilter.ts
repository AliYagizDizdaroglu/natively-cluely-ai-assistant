// verbalStreamFilter.ts
// Line-level filter for the verbal answer path, extracted from WhatToAnswerLLM
// so it can be unit-tested and stream-optimized independently.
//
// Two-mode filter:
//   HARD_DROP — pure coding artifacts with no substantive content (Time:/Space:/Why:
//               complexity bullets, clarifying-back questions).
//   REWRITE   — meta-preamble openers that DO carry substance after the verb phrase
//               (e.g. "I will explain the Transformer as X" → "The Transformer as X").
//               Strip the preamble, keep the substance, capitalize result.

import * as fs from "fs";
import * as path from "path";

const DIAG_LOG = path.join(process.cwd(), "verbal-diag.log");
function diagLog(msg: string) {
    // Only from the app: same rule as the diagLog in WhatToAnswerLLM.ts.
    if (process.type !== "browser") return;
    try {
        fs.appendFileSync(DIAG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { /* swallow — never break the stream on log failure */ }
}

const HARD_DROP = [
    'Time:', 'Space:', 'Why:', 'Time complexity', 'Space complexity',
    // Clarifying-back openers — never appropriate in interview responses
    "Are you looking for", "Are you asking about", "Are you more interested in",
    "Would you like me", "Would you prefer", "Would you rather",
    "Do you want me to", "Do you want a", "Do you want me",
    "Should I focus on", "Should I go", "Should I start",
    "Which would you", "Which one would",
];

// Strip the verb phrase ONLY. Preserve articles (the/a/an) and connectors so
// the remaining text stays grammatical. If stripping leaves a dangling
// syntactic word (as/by/with/to/how/etc.), abort the rewrite — those break
// grammar without their preceding verb.
const REWRITE_PATTERNS: RegExp[] = [
    /^(I'll|I will|I am|I'm|Let me|Let's|I am going to|I'm going to)\s+(explain|show|demonstrate|describe|cover|outline|implement|illustrate|present|discuss|walk\s+(?:you\s+)?through|break\s+down|talk\s+about|go\s+through|go\s+over|run\s+through)\s+/i,
    /^(I'm|I am)\s+(explaining|showing|demonstrating|describing|covering|outlining|implementing|illustrating|presenting|discussing|walking\s+(?:you\s+)?through|breaking\s+down|going\s+through|using\s+a|using\s+the)\s+/i,
];

// Syntactic danglers — if a rewritten line starts with these, the original
// sentence structure was "verb X [dangler] Y" and stripping the verb leaves
// a fragment. Let the original through unchanged instead of producing junk.
const DANGLER_RE = /^(as|by|with|how|why|what|that|to|in|on|for|about|using|through|where|when|while|so)\b/i;

const shouldHardDrop = (line: string) => {
    const trimmed = line.trimStart();
    return HARD_DROP.some(p => trimmed.startsWith(p));
};

// A list marker at the start of a line — "1. ", "2) ", "- ", "* ", "• " — is read aloud
// as "one dot"; the sentence after it is ordinary speech. Flight s50b (2026-09-11): 5 of 20
// answers reached the candidate as numbered lists and lost their delivery grade on that
// alone. A number needs the dot AND the space ("2.5 words" is prose) and at most two digits.
// This filter runs BEFORE stripSuggestionBlock, so it also sees the __MORE__ offer lines;
// their "1| label" shape is not a marker and must stay one (extractSuggestions parses it).
const LIST_MARKER = /^(?:\d{1,2}[.)]|[-*•])\s+/;
// A line prefix that may still grow into a marker once more characters arrive.
const LIST_MARKER_PREFIX = /^(?:\d{1,2}[.)]?|[-*•])$/;

/** The line without its leading list marker, or null when it has none. */
const stripListMarker = (line: string): string | null => {
    const trimmed = line.trimStart();
    const m = trimmed.match(LIST_MARKER);
    if (!m) return null;
    return line.slice(0, line.length - trimmed.length) + trimmed.slice(m[0].length);
};

// Returns rewritten line, OR the original (if rewriting would break grammar),
// OR null if no preamble matched at all.
const rewritePreamble = (line: string): string | null => {
    const trimmed = line.trimStart();
    const leading = line.slice(0, line.length - trimmed.length);
    for (const pattern of REWRITE_PATTERNS) {
        if (pattern.test(trimmed)) {
            const stripped = trimmed.replace(pattern, '');
            if (stripped.trim().length < 8) return ''; // substance too small — drop
            // Grammar safety: if stripped starts with a dangler (as/by/with/etc.),
            // the original sentence depended on the verb. Better to keep the
            // preamble than emit a fragment.
            if (DANGLER_RE.test(stripped)) {
                diagLog(`rewrite: SKIP (dangler) — keeping original: ${JSON.stringify(trimmed.slice(0, 60))}`);
                return line; // return original unchanged
            }
            const capitalized = stripped[0].toUpperCase() + stripped.slice(1);
            diagLog(`rewrite: ${JSON.stringify(trimmed.slice(0, 60))} → ${JSON.stringify(capitalized.slice(0, 60))}`);
            return leading + capitalized;
        }
    }
    return null;
};

// All HARD_DROP prefixes and rewrite openers resolve within this many chars of
// the (trimmed) line start — longest is "I am going to walk you through " (31).
// Once a line's prefix exceeds this with no match, nothing can match later and
// the rest of the line streams through untouched.
const MAX_DECISION_CHARS = 48;

// First-capture-group alternatives of REWRITE_PATTERNS, lowercase, for the
// cheap "could a rewrite still match?" prefix check while buffering.
const REWRITE_STARTERS = ["i'll ", 'i will ', 'i am ', "i'm ", 'let me ', "let's "];

/** Full-line decision — the original non-streaming semantics, used at '\n' / EOF. */
function decideFullLine(line: string): string | null {
    const unmarked = stripListMarker(line);
    if (unmarked !== null) {
        diagLog(`LIST_MARKER: ${JSON.stringify(line.slice(0, 40))}`);
        return decideFullLine(unmarked);
    }
    if (shouldHardDrop(line)) {
        diagLog(`HARD_DROP: ${JSON.stringify(line.slice(0, 80))}`);
        return null;
    }
    const rewritten = rewritePreamble(line);
    if (rewritten !== null) return rewritten === '' ? null : rewritten;
    return line;
}

type PartialDecision = { t: 'wait' } | { t: 'drop' } | { t: 'emit'; text: string };

/**
 * Partial-line decision while tokens stream in. Returns:
 *   wait — cannot classify the line yet, keep buffering
 *   drop — a HARD_DROP prefix matched; suppress the rest of the line
 *   emit — classification final; emit `text` and pass the rest of the line through
 */
function decidePartialLine(buf: string): PartialDecision {
    const trimmed = buf.trimStart();
    const leading = buf.slice(0, buf.length - trimmed.length);
    if (trimmed.length === 0) return { t: 'wait' };

    // "1", "1.", "-": a marker may still be forming — the next character decides.
    if (LIST_MARKER_PREFIX.test(trimmed)) return { t: 'wait' };
    const unmarked = stripListMarker(buf);
    if (unmarked !== null) return decidePartialLine(unmarked);

    if (HARD_DROP.some(p => trimmed.startsWith(p))) return { t: 'drop' };

    for (const pattern of REWRITE_PATTERNS) {
        const m = trimmed.match(pattern);
        if (m) {
            const stripped = trimmed.slice(m[0].length);
            // Substance (≥8 chars) can only grow, and the dangler test needs the
            // first word after the strip to be complete (or provably not a dangler:
            // all dangler words are ≤7 letters, so a 20+ char unbroken first word
            // cannot be one).
            const firstWordComplete = /\S\s/.test(stripped);
            if (stripped.trim().length >= 8 && (firstWordComplete || stripped.length >= 20)) {
                if (DANGLER_RE.test(stripped)) {
                    diagLog(`rewrite: SKIP (dangler) — keeping original: ${JSON.stringify(trimmed.slice(0, 60))}`);
                    return { t: 'emit', text: buf };
                }
                const capitalized = stripped[0].toUpperCase() + stripped.slice(1);
                diagLog(`rewrite (streaming): ${JSON.stringify(trimmed.slice(0, 60))} → ${JSON.stringify(capitalized.slice(0, 60))}`);
                return { t: 'emit', text: leading + capitalized };
            }
            return { t: 'wait' }; // pattern matched — awaiting enough substance to decide
        }
    }

    const dropStillPossible = HARD_DROP.some(p => p.length > trimmed.length && p.startsWith(trimmed));
    const lower = trimmed.toLowerCase();
    const rewriteStillPossible = REWRITE_STARTERS.some(s =>
        lower.length < s.length ? s.startsWith(lower) : lower.startsWith(s)
    );

    if (!dropStillPossible && !rewriteStillPossible) return { t: 'emit', text: buf };
    if (trimmed.length >= MAX_DECISION_CHARS) return { t: 'emit', text: buf };
    return { t: 'wait' };
}

/**
 * Suppress fenced code blocks on the spoken path, and any stray backtick with them.
 *
 * Lived as a private method on WhatToAnswerLLM until 2026-09-20. It moved here because the
 * offline flight arms replay the shipped chain to score a model and could not reach it: in
 * flight s50k the SQL answer scored delivery 0 as a "raw code block" on two 3.1 reps and the
 * coding answer on two 3.5 reps, while the same questions answered in-app scored 2/2/1. The
 * arms were measuring a filter the app has. One implementation now serves both.
 */
export async function* filterCodeFences(
    source: AsyncIterable<string>
): AsyncGenerator<string> {
    const CARRY_LEN = 3; // ``` is 3 chars — minimum fence marker
    let carry = '';
    let suppressing = false;

    for await (const chunk of source) {
        const combined = carry + chunk;
        let output = '';
        let i = 0;

        while (i < combined.length - CARRY_LEN) {
            if (!suppressing && combined.startsWith('```', i)) {
                suppressing = true;
                i += 3;
                // Skip optional language tag on the same line
                while (i < combined.length && combined[i] !== '\n') i++;
                continue;
            }
            if (suppressing && combined.startsWith('```', i)) {
                suppressing = false;
                i += 3;
                console.warn('[verbalStreamFilter] filterCodeFences: code fence suppressed on verbal path — check intent classifier');
                continue;
            }
            // Strip any stray backticks even when not suppressing — verbal answers
            // never legitimately contain backticks, and the 3-char carry buffer
            // can leak 1-2 backticks across chunk boundaries after a fence transition.
            if (!suppressing && combined[i] !== '`') output += combined[i];
            i++;
        }

        // A chunk shorter than the carry is carried whole. Slicing from a
        // negative index dropped the first character of a two-character opening
        // chunk — Gemini opens with "I’", "So", "To" routinely, so 14 of 57
        // delivered after6 answers began "’d start by…" (spec 2026-09-05 §4).
        carry = combined.slice(Math.max(0, combined.length - CARRY_LEN));
        if (output) yield output;
    }

    // Flush carry buffer — strip any backticks (fence detection artifact)
    if (carry && !suppressing) {
        const cleaned = carry.replace(/`/g, '');
        if (cleaned) yield cleaned;
    }
}

const SENTINEL = '__MORE__';

/** One offered expansion: a short noun-phrase label the UI can render as a chip. */
export interface Suggestion {
    /** 1-based index as emitted by the model. */
    n: number;
    /** 3-8 word noun phrase naming depth the answer left out. */
    label: string;
}

/**
 * Splits a completed verbal answer into the spoken part and its expansion offers.
 *
 * The model is asked (see SPOKEN_LENGTH_AND_DEPTH) to keep the spoken answer under
 * the word budget and name any depth it dropped AFTER the answer, behind a `__MORE__` sentinel:
 *
 *     ...spoken answer...
 *     __MORE__
 *     1| trade-offs of vnode count
 *     2| hot-key handling on the ring
 *
 * Tolerant by design: a missing block is the common case (correct whenever the
 * answer is already complete), and malformed lines inside a trailing block are dropped rather
 * than shown, because leaking `1| ...` into the answer bubble is worse than losing one chip.
 *
 * The block can also LEAD (spec 2026-09-30 offers-before-answer). About one reply in forty that
 * opens with a cue block puts its offers right after the cues and before the spoken answer (9 of
 * 366 saved 3.5-lite replies lead with the block, 8 of them with an answer after it; 1 of 247 on
 * 3.1-lite), and the old rule threw that answer away. When nothing but
 * whitespace precedes the sentinel, the block is only the run of offer lines and blank lines that
 * follows it; the first other line begins the spoken answer, which is split again by this same
 * rule (so a later sentinel ends it and adds its offers). Offers with no answer at all is still
 * an empty answer. An offer-shaped line AFTER the answer began, with no second sentinel, is
 * answer text: seen in 0 of 624 saved replies, accepted rather than buffered for.
 */
export function extractSuggestions(text: string): { answer: string; suggestions: Suggestion[] } {
    const i = text.indexOf(SENTINEL);
    if (i === -1) return { answer: text, suggestions: [] };
    if (text.slice(0, i).trim() !== '') {
        // spoken text came first: the answer ends at the sentinel and everything after it is the block
        return { answer: text.slice(0, i).replace(/\s+$/, ''), suggestions: offersIn(text.slice(i + SENTINEL.length).split('\n')) };
    }
    // the block leads: the run of offer lines and blank lines after the sentinel; the first other line
    // begins the spoken answer, which may carry its own block later (the same rule again on the rest)
    const lines = text.slice(i + SENTINEL.length).split('\n');
    const suggestions: Suggestion[] = [];
    let k = 0;
    for (; k < lines.length; k++) {
        const t = lines[k].trim();
        if (t === '') continue;
        const m = t.match(CUE_LINE);
        if (!m) break;
        const s = suggestionOf(m);
        if (s) suggestions.push(s);
    }
    if (k === lines.length) return { answer: '', suggestions };
    const rest = extractSuggestions(lines.slice(k).join('\n'));
    return { answer: rest.answer, suggestions: suggestions.concat(rest.suggestions) };
}

/**
 * Streaming guard for the sentinel: yields the spoken answer and suppresses the offers block, so
 * the block never flashes on screen while tokens arrive. Captured offers are handed to
 * `onSuggestions` exactly once, at stream end, in every state.
 *
 * A block that FOLLOWS spoken text ends the answer: everything from `__MORE__` on is the block,
 * and stray lines in it are dropped (offersIn). A block that LEADS — nothing but whitespace
 * yielded before the sentinel — is only the run of offer lines and blank lines after it (spec
 * 2026-09-30 offers-before-answer): the spoken answer is released at its first character that
 * cannot start an offer line (CUE_LINE_PREFIX, the early close's question on the same grammar —
 * a one-paragraph answer has no newline before the stream ends, so a line-complete rule would
 * hold it whole), and the normal path resumes there, so a later sentinel ends the answer as
 * before. Until this rule every sentinel ended the answer, and a leading block threw the whole
 * spoken answer away: the candidate saw "Could you repeat that?" and no cues (the 16:12 re-smoke
 * of 2026-09-30). One fixed console.warn line per stream names a leading block, so a run can
 * show the branch fired.
 *
 * Holds back only a short tail (the sentinel can straddle a chunk boundary) — enough to
 * recognise a partial `__MOR`, not enough to stall the stream — and, inside a leading block, a
 * partial line only while it can still become an offer line.
 */
export async function* stripSuggestionBlock(
    source: AsyncGenerator<string>,
    onSuggestions?: (s: Suggestion[]) => void,
): AsyncGenerator<string> {
    let phase: 'answer' | 'lead' | 'tail' = 'answer';
    let pending = '';   // answer: a possible partial sentinel, not yet safe to emit; lead: the partial line
    let tail = '';      // everything after a sentinel that followed spoken text
    let spoke = false;  // a non-blank piece has been yielded: the next sentinel ends the answer
    let named = false;  // the leading-block line is written once per stream
    const leading: Suggestion[] = [];   // the offers of a block that preceded the spoken answer

    for await (const chunk of source) {
        if (phase === 'tail') { tail += chunk; continue; }
        pending += chunk;
        // One chunk can carry the end of a leading block AND the start of the answer (and a further
        // sentinel), so the phases run on the same `pending` until nothing more can be decided.
        for (;;) {
            if (phase === 'answer') {
                const at = pending.indexOf(SENTINEL);
                if (at === -1) {
                    // Emit everything that cannot be the start of the sentinel; keep the rest.
                    const keep = longestSentinelPrefixSuffix(pending);
                    const emit = pending.slice(0, pending.length - keep);
                    if (emit) { if (emit.trim()) spoke = true; yield emit; }
                    pending = pending.slice(pending.length - keep);
                    break;
                }
                const before = pending.slice(0, at);
                if (before) { if (before.trim()) spoke = true; yield before; }
                pending = pending.slice(at + SENTINEL.length);
                if (spoke) { phase = 'tail'; tail = pending; pending = ''; break; }
                phase = 'lead';
                if (!named) { named = true; console.warn('[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)'); }
            }
            // phase === 'lead': consume complete offer lines and blank lines; the first other text is the answer
            let nl: number;
            let closed = false;
            while ((nl = pending.indexOf('\n')) !== -1) {
                const t = pending.slice(0, nl).trim();
                if (t === '') { pending = pending.slice(nl + 1); continue; }
                const m = t.match(CUE_LINE);
                if (!m) { closed = true; break; }
                const s = suggestionOf(m);
                if (s) leading.push(s);
                pending = pending.slice(nl + 1);
            }
            if (!closed) {
                const head = pending.trim();
                if (head !== '' && !CUE_LINE_PREFIX.test(head)) closed = true;
            }
            if (!closed) break;
            phase = 'answer';   // `pending` starts the spoken answer: the answer phase takes it from here
        }
    }

    if (phase === 'answer' && pending) yield pending;
    if (phase === 'lead') {
        // the stream ended inside a leading block: a partial last line is an offer if it parses, else answer text
        const m = pending.trim().match(CUE_LINE);
        if (m) { const s = suggestionOf(m); if (s) leading.push(s); }
        else if (pending.trim()) yield pending;
    }
    onSuggestions?.(leading.concat(phase === 'tail' ? offersIn(tail.split('\n')) : []));
}

/** Length of the longest suffix of `s` that is a proper prefix of the sentinel. */
function longestSentinelPrefixSuffix(s: string): number {
    const max = Math.min(SENTINEL.length - 1, s.length);
    for (let n = max; n > 0; n--) {
        if (s.endsWith(SENTINEL.slice(0, n))) return n;
    }
    return 0;
}

/**
 * Sentinel that opens the cue block (cue mode, spec 2026-09-20). Kept module-local like
 * SENTINEL above; prompts.ts CUES_SENTINEL is the same string and the test proves it.
 */
const CUES_SENTINEL = '__CUES__';
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
/**
 * A partial block line that can still complete into a CUE_LINE once more characters arrive: digits, then
 * optional whitespace, then optionally the bar, whitespace and anything after it. The `\s*` after the bar
 * matters: CUE_LINE takes whitespace there, and `\s` matches CR, U+2028 and U+2029 where `.` does not, so
 * "1|<CR>abc" is a cue line and must be held (a first draft's `(\|.*)?` released it as prose; with this one,
 * 0 of 200,000 fuzz cases differ from extractCues). Anchored like CUE_LINE, so a prefix that fails it cannot
 * be completed into a match by any suffix — the ground of stripCueBlock's early close, and of
 * stripSuggestionBlock's leading-block close (the cue block borrowed the offer block's grammar).
 */
const CUE_LINE_PREFIX = /^\d+\s*(\|\s*.*)?$/;
const cuePhrase = (m: RegExpMatchArray): string => m[2].trim().replace(/^["'`]|["'`]$/g, '');
/** An offer from a matched `N| label` line (the grammar the cue block borrowed), or null when the label is empty (a bare `1| "`). */
const suggestionOf = (m: RegExpMatchArray): Suggestion | null => {
    const label = cuePhrase(m);
    return label ? { n: Number(m[1]), label } : null;
};
/** The offers in a TRAILING block's lines: every `N| label` line; blank and stray lines are dropped, never shown. */
const offersIn = (lines: string[]): Suggestion[] => {
    const offers: Suggestion[] = [];
    for (const raw of lines) {
        const m = raw.trim().match(CUE_LINE);
        if (!m) continue;
        const s = suggestionOf(m);
        if (s) offers.push(s);
    }
    return offers;
};

/**
 * Splits a completed verbal answer into its cue block and the spoken prose.
 *
 * The model is asked (CUE_RULE) to OPEN with the sentinel and a few `N| key phrase` lines —
 * one line for a one-part question, grouped themes for a many-part one (CUE_SHAPE_RULE) —
 * then the prose:
 *
 *     __CUES__
 *     1| thirty gigabytes in float32
 *     2| int8, then shard
 *     Ten million vectors take ...
 *
 * The block ends at the first non-empty line that is not a cue line; that line and everything
 * after it are prose, untouched. No sentinel at the start means no cues and the text is
 * returned unchanged. Lines are trimmed and wrapping quotes removed, never truncated HERE:
 * the display cap is trimCues, applied by the engine at the display boundary and logged, so
 * the harness and the bench keep the raw block (cues_wellformed measures the model).
 */
export function extractCues(text: string): { cues: string[]; prose: string } {
    const lines = text.split('\n');
    let i = 0;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i === lines.length) return { cues: [], prose: text };
    const first = lines[i].trimStart();
    if (!first.startsWith(CUES_SENTINEL)) return { cues: [], prose: text };
    lines[i] = first.slice(CUES_SENTINEL.length);   // anything after the sentinel on its line is block text
    const cues: string[] = [];
    for (; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t === '') continue;
        const m = t.match(CUE_LINE);
        if (!m) break;
        const phrase = cuePhrase(m);
        if (phrase) cues.push(phrase);
    }
    return { cues, prose: lines.slice(i).join('\n') };
}

/**
 * Streaming guard for the cue block: yields the prose only and hands the cues to `onCues`
 * exactly once — at block close, at stream end if the stream ends inside the block, or as
 * soon as the stream is known not to start with the sentinel. Leading whitespace before the
 * sentinel is tolerated. A sentinel anywhere but the start is prose and stays in the text.
 *
 * Holds back only what it must: before the decision, at most a partial sentinel (so an
 * answer with no block is delayed by the length of "__CUES__" at most); inside the block, a
 * partial line only while it can still become a cue line (CUE_LINE_PREFIX; a line terminator
 * after the bar is whitespace to CUE_LINE and is held). The first character that rules that
 * out closes the block, reports the cues and releases the text, so a one-paragraph answer
 * streams from its first word instead of waiting for a newline that never comes (final review
 * I2, 2026-09-30: 14 of 22 answers at the 05:00 smoke arrived whole). A partial cue line
 * ("1| Spa") is held to its newline, which is when the loop reads it. The result on a whole
 * string, joined, equals extractCues; the pieces are the source's.
 */
export async function* stripCueBlock(
    source: AsyncGenerator<string>,
    onCues?: (cues: string[]) => void,
): AsyncGenerator<string> {
    let phase: 'prefix' | 'block' | 'prose' = 'prefix';
    let pending = '';   // prefix: text not yet known to be prose; block: the partial line
    const cues: string[] = [];
    let reported = false;
    const report = () => { if (reported) return; reported = true; onCues?.(cues.slice()); };

    for await (const chunk of source) {
        if (phase === 'prose') { yield chunk; continue; }
        pending += chunk;
        if (phase === 'prefix') {
            const lead = pending.replace(/^\s+/, '');
            if (lead.startsWith(CUES_SENTINEL)) {
                phase = 'block';
                pending = lead.slice(CUES_SENTINEL.length);
            } else if (CUES_SENTINEL.startsWith(lead)) {
                continue;   // still could be the sentinel (or only whitespace so far)
            } else {
                phase = 'prose';
                report();
                yield pending;
                pending = '';
                continue;
            }
        }
        // phase === 'block': consume complete lines; the first non-cue line closes the block
        let nl: number;
        while ((nl = pending.indexOf('\n')) !== -1) {
            const t = pending.slice(0, nl).trim();
            if (t === '') { pending = pending.slice(nl + 1); continue; }
            const m = t.match(CUE_LINE);
            if (m) {
                const phrase = cuePhrase(m);
                if (phrase) cues.push(phrase);
                pending = pending.slice(nl + 1);
                continue;
            }
            phase = 'prose';
            report();
            yield pending;   // this line and everything after it, intact
            pending = '';
            break;
        }
        // Early close (spec 2026-09-30 cue-early-close): the loop above reads COMPLETE lines only, and a
        // spoken answer is usually one paragraph with no newline, so the cues and the whole first
        // paragraph waited for the stream to end (14 of 22 answers at the 05:00 smoke; final review I2).
        // A partial line that can no longer become a cue line is prose: close the block now, hand the
        // cues out and let it stream. trim(), not trimStart(): a CRLF stream can leave "1| Spa\r"
        // pending, and the loop trims the same way once the "\n" lands; a line terminator AFTER the bar
        // ("1|\rSpa") is whitespace to CUE_LINE and is held by CUE_LINE_PREFIX's own `\s*`. Anything that
        // could still be a cue line — nothing yet, "1", "1 ", "1|", "1| Spa" — is held to its newline, as before.
        if (phase === 'block') {
            const head = pending.trim();
            if (head !== '' && !CUE_LINE_PREFIX.test(head)) {
                phase = 'prose';
                report();
                yield pending;   // the partial line, intact; everything after it streams as prose
                pending = '';
            }
        }
    }

    if (phase === 'prefix') {
        // whitespace only, or a partial sentinel that never completed: prose, as it arrived
        report();
        if (pending) yield pending;
        return;
    }
    if (phase === 'block') {
        // the stream ended inside the block; a partial last line is a cue if it parses, else prose
        const m = pending.trim().match(CUE_LINE);
        if (m) { const phrase = cuePhrase(m); if (phrase) cues.push(phrase); pending = ''; }
        report();
        if (pending.trim()) yield pending;
    }
}

/**
 * Streaming verbal-line filter. Same filtering semantics as the original
 * line-buffered version, but tokens flow through as soon as a line's prefix
 * can no longer match any HARD_DROP/REWRITE pattern (≤48 chars) instead of
 * being held until the next newline. Verbal answers are typically a single
 * paragraph with no newline at all — the old version buffered the ENTIRE
 * answer and emitted it only at stream end.
 *
 * One deliberate fix over the original: a line's terminating '\n' is always
 * preserved (the old implementation dropped it when a chunk boundary landed
 * exactly on the newline).
 */
export async function* filterVerbalLines(
    source: AsyncGenerator<string>
): AsyncGenerator<string> {
    diagLog(`>>> filterVerbalLines started (streaming)`);

    let mode: 'deciding' | 'passing' | 'dropping' = 'deciding';
    let lineBuf = '';

    for await (const chunk of source) {
        let rest = chunk;
        while (rest.length > 0) {
            const nl = rest.indexOf('\n');
            const piece = nl === -1 ? rest : rest.slice(0, nl);
            rest = nl === -1 ? '' : rest.slice(nl + 1);
            const lineEnded = nl !== -1;

            if (mode === 'passing') {
                if (piece) yield piece;
            } else if (mode === 'deciding') {
                lineBuf += piece;
                if (!lineEnded) {
                    const d = decidePartialLine(lineBuf);
                    if (d.t === 'drop') {
                        diagLog(`HARD_DROP (streaming): ${JSON.stringify(lineBuf.slice(0, 80))}`);
                        mode = 'dropping';
                        lineBuf = '';
                    } else if (d.t === 'emit') {
                        mode = 'passing';
                        if (d.text) yield d.text;
                        lineBuf = '';
                    }
                    // wait → keep buffering
                }
            }
            // mode === 'dropping': discard piece

            if (lineEnded) {
                if (mode === 'deciding') {
                    const full = decideFullLine(lineBuf);
                    if (full !== null) yield full + '\n';
                } else if (mode === 'passing') {
                    yield '\n';
                }
                // dropping: swallow the line's newline too (line contributes nothing)
                mode = 'deciding';
                lineBuf = '';
            }
        }
    }

    // Flush: stream ended mid-line while still undecided
    if (mode === 'deciding' && lineBuf) {
        const full = decideFullLine(lineBuf);
        if (full !== null) {
            diagLog(`<<< flush yielded: ${JSON.stringify(full.slice(0, 80))}`);
            yield full;
        }
    }
}

// ── spoken notation cleanup ────────────────────────────────────────────────
// The verbal answer is READ ALOUD, so notation that renders fine on screen is
// spoken literally: "$O(\log n)$" becomes "dollar sign O of backslash log n",
// and "`ModelLatency`" becomes "backtick ModelLatency backtick". Measured three
// times, always on the most technical answers — the SageMaker p99 answer that
// correctly named ModelLatency vs OverheadLatency is exactly the one that
// sounded broken.
//
// Runs AFTER stripSuggestionBlock so it can never damage the __MORE__ sentinel;
// underscores are deliberately not in the notation set.

/** Remove screen-only notation from a fully-assembled span of spoken text. */
function cleanNotation(s: string): string {
    return s
        // "\text{rank}" -> "rank": the wrapper is typography, the word inside is speech
        .replace(/\\(?:text|mathrm|mathit|operatorname)\{([^}]*)\}/g, '$1')
        // A MATCHED pair of dollars around a bare number or a backslash command is LaTeX,
        // not money: "$100,000$" -> "100,000". Lookahead alone cannot tell the opening
        // delimiter from currency, because "$100,000" is exactly how money is written —
        // the closing delimiter is the signal, and money never has one. Flight s50k,
        // 2026-09-20: 3.5-flash-lite typeset every number this way and two of three reps
        // spoke "dollar one hundred thousand". The content must be a number or a command
        // with no spaces, so two currency amounts in one sentence ("$5 and $10 million")
        // cannot match and keep both their signs.
        .replace(/\$(\d[\d,]*(?:\.\d+)?|\\[A-Za-z]+(?:\{[^{}]*\})*)\$/g, '$1')
        // A fraction is read aloud, so say it: leaving "frac{3,000}{9,500}" behind only
        // trades a stray dollar sign for a nonsense word.
        .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1 over $2')
        // backticks: never spoken, never meaningful aloud
        .replace(/`+/g, '')
        // markdown emphasis markers
        .replace(/\*\*/g, '')
        // A SINGLE pair is emphasis too, and only the bold form was ever removed: flight
        // s50m, 2026-09-22, S1Q03F spoke "the *incremental* effect" and took the hour's
        // only delivery 0 for it. Judged the way the "$" rule is judged, by the character
        // on the inside: a star touching a non-space is a delimiter, a star with space on
        // both sides is multiplication or a stray bullet and stays. The trailing-"*" hold
        // in stripSpokenNotation already feeds this rule its next character, so a pair
        // split across chunks resolves the same as a whole one.
        .replace(/\*(?=\S)|(?<=\S)\*/g, '')
        // LaTeX delimiters: an OPENING '$' is followed by something non-numeric ("$O(")
        // or by a number that a power or a division sign follows ("$1 / (c" — the
        // rank-fusion formula flight s50b spoke as "dollar one"; "$2^n"); a CLOSING '$'
        // follows a non-space ("n)$"). Money is a number followed by a word, a unit, a
        // comma, a range dash, a rate or a sum, so "$5 million", "$1.5M", "$5-10 million",
        // "$50/hour", "$0.09/GB" and "$120 + equity" survive: a slash only reads as
        // division when a space or a bracket follows it. A number followed by a
        // LaTeX-ESCAPED percent sign is a percentage, not money: "$9.5\%$" — 3.5
        // Flash, flight s50c — is "9.5%". A bare "%" does not count, so "$5% better"
        // keeps its dollar: no measured answer has ever written that as a formula.
        .replace(/\$(?=[^\d\s])|\$(?=\d+(?:\.\d+)?\s*(?:\^|\/(?:\s|\()|\\%))|(?<=\S)\$/g, '')
        // backslash commands: "\log n" -> "log n", "\(" -> "(", "\%" -> "%"
        .replace(/\\(?=[A-Za-z(){}[\]%])/g, '');
}

/**
 * The cue block as DISPLAYED (spec 2026-09-30): each line through the spoken-notation cleanup
 * above — a cue came out as raw LaTeX, `$O(\log n)$`, in spike 4; the prose gets this cleanup in
 * stripSpokenNotation and the cues skipped it — then the block cut to `maxLines` lines and each
 * kept line to its first `maxWords` words. Cleanup runs BEFORE the cut because it changes the
 * word count (`\frac{a}{b}` becomes `a over b`) and a cut inside a `$…$` pair would leave a
 * delimiter no rule can match; the count the candidate sees is the count that is capped. The
 * cleanup rules were written for speech: on screen the single-star rule turns "3*4 shards" into
 * "34 shards" — no measured cue has carried one, and every cleaned line is reported raw.
 *
 * Both limits are the ceiling the prompt already asks for (CUE_SHAPE_RULE); this is the
 * enforcement, at the display boundary only — extractCues and stripCueBlock stay raw so the
 * harness and the bench keep measuring what the model produced. `dropped`, `cut` and `cleaned`
 * carry the raw text of every line the display changed, for the engine's log line. A displayed
 * line is also trimmed of surrounding whitespace, and a line that differs from its raw text only
 * by that whitespace is listed in `cleaned` (the display did change). A line that cleans to
 * nothing is neither hidden nor repaired: it displays empty, and the smoke check and the
 * metrics row flag it.
 */
export function trimCues(raw: string[], maxLines: number, maxWords: number): { cues: string[]; rawLines: number; dropped: string[]; cut: string[]; cleaned: string[] } {
    const cut: string[] = [];
    const cleaned: string[] = [];
    const cues = raw.slice(0, maxLines).map((line) => {
        const clean = cleanNotation(line).trim();
        if (clean !== line) cleaned.push(line);
        const words = clean.match(/\S+/g) ?? [];
        if (words.length <= maxWords) return clean;
        cut.push(line);
        return words.slice(0, maxWords).join(' ');
    });
    return { cues, rawLines: raw.length, dropped: raw.slice(maxLines), cut, cleaned };
}

/**
 * Streaming notation stripper. Holds back a single trailing '*', '$' or '\'
 * because each needs the following character before it can be judged — without
 * that, a chunk boundary landing inside "**" or before "$O(" would leak.
 */
export async function* stripSpokenNotation(
    source: AsyncIterable<string>
): AsyncGenerator<string, void, unknown> {
    let carry = '';
    // A structured payload must pass through untouched. streamChat's knowledge
    // short-circuit yields one JSON object ({"__negotiationCoaching":…}) in
    // place of speech; stripping the backslash from its "\n" escapes leaves
    // JSON that still parses but whose text has a stray "n" where each line
    // break was. Decided once, on the first non-blank character.
    let decided = false;
    let passthrough = false;
    // The last character already spoken: a span that opens with "$" or "*" right after a
    // non-space ("n)" | "$ for" | "incremental" | "*") is a CLOSING delimiter, which
    // cleanNotation alone cannot see once the character before it has left in an earlier
    // span. The star joined this in s50m: the hold releases the closing star at the head
    // of the next span, where the rule's lookbehind has nothing to look at.
    let lastOut = '';
    // Only a LONE star is a closing single-emphasis delimiter. A leading "**" is the bold
    // pair the hold kept whole, and slicing one star off it left an orphan that no rule
    // could then match — "…and **p99**" spoke a trailing star.
    const closingDelimiterFirst = (s: string) => (/^(?:\$|\*(?!\*))/.test(s) && /\S/.test(lastOut) ? s.slice(1) : s);
    for await (const chunk of source) {
        if (!decided) {
            const probe = (carry + chunk).trimStart();
            if (!probe) { carry += chunk; continue; }
            decided = true;
            passthrough = probe.startsWith('{');
            if (passthrough) { yield carry + chunk; carry = ''; continue; }
        }
        if (passthrough) { yield chunk; continue; }
        let s = carry + chunk;
        carry = '';
        // Defer judgement on a trailing lookahead-sensitive character. A trailing
        // "**" is held as a pair: holding only one star split the pair so that a
        // stream ENDING in bold ("…and **p99**") leaked "**" — the first star was
        // emitted as a lone survivor and the held one flushed after it. A "$" plus
        // a number (and the operator or backslash that may follow) is held until the
        // next character says money or formula; a backslash command with an open brace
        // is held until the brace closes (or 40 characters, so a stray brace cannot
        // hold the rest of the answer), so "\text{rank}" is judged whole. The hold
        // must accept at least what cleanNotation's rule can match, or the same text
        // splits differently across chunk sizes.
        // The "$" branches carry an optional CLOSING "$" so a typeset pair is judged in one
        // span: without it the hold released "$100,000" and kept the closing delimiter for
        // the next span, and the pair rule in cleanNotation never saw a pair (flight s50k).
        // Commas are inside the number for the same reason. The "$\command" branch exists
        // because "$\frac{…}" otherwise released a lone "$" the moment the backslash-command
        // branch claimed the tail.
        // A comma may only appear INSIDE the number ("$100,000"), never lead it: allowing
        // "$," let a closing delimiter pair with the comma that follows it, so the hold
        // released "$\frac{3,000}{9,500}" and kept "$," — splitting the very pair the
        // cleanNotation rule needs to see whole.
        // The comma was one case of a wider split: whenever the character after a pair broke
        // the pair's own branch (a space after "$\frac{…}$", a "." after any pair), the money
        // branch claimed the pair's CLOSING "$" as a new hold, and "$\frac{3000}{9500}$ of it"
        // spoke "$3000 over 9500" at 1-character chunks (2026-09-30). So a "$" that closes a
        // pair (the lookbehind is cleanNotation's pair rule, ending at this "$") opens no hold,
        // unless a second "$" follows: a "$$" run keeps its old hold, since closingDelimiterFirst
        // slices a single "$" and the next one would read as money. The lookbehind runs only
        // once a "$" is consumed; before it, it scanned back from every position. "\frac" is
        // held until its second group closes: the bare-command branch holds one open brace, so
        // it released "\frac{a}" where the fraction rule could not match it.
        const held = s.match(/(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$(?:(?<!\$(?:\d[\d,]*(?:\.\d+)?|\\[A-Za-z]+(?:\{[^{}]*\})*)\$))(?:\d[\d,]*)?(?:\.\d*)?\$?\s*[/^\\]?\s*|\\frac\{[^{}]{0,40}\}(?:\{[^{}]{0,40})?|\\[a-z]*(?:\{[^}]{0,40})?)$/);
        if (held) {
            carry = held[0];
            s = s.slice(0, -carry.length);
        }
        if (s) {
            const out = cleanNotation(closingDelimiterFirst(s));
            if (out) { lastOut = out.slice(-1); yield out; }
        }
    }
    // Stream ended while holding a character — surface it rather than swallow it.
    if (carry) {
        const out = passthrough ? carry : cleanNotation(closingDelimiterFirst(carry));
        if (out) yield out;
    }
}

// ── Spoken word budget ───────────────────────────────────────────────────────

export interface WordBudgetResult {
    /** Words emitted downstream (the spoken answer as the user heard it). */
    words: number;
    /** The stream was ended early — a sentence or the tail was dropped, or the hard ceiling hit. */
    cut: boolean;
    /**
     * The answer ended over `limit`. Only a sentence that STARTED under `floor`
     * (the allowance — it streams whole, however long) or the hard-ceiling case
     * can produce this; a sentence that starts at or past `floor` is buffered
     * and dropped rather than allowed to cross the limit.
     */
    allowance: boolean;
}
export interface WordBudgetOptions { limit: number; floor: number; ceiling?: number; onDone?: (r: WordBudgetResult) => void }

/**
 * A whole chunk that is nothing but a `__model_source:X__` sentinel — the same
 * shape `streamTaps.ts` skips. `withVerbalFallback` yields it INSIDE the chain
 * this stage wraps, so without this it would be counted as two words of the
 * spoken answer and would glue itself onto the first real word.
 */
const SENTINEL_CHUNK = /^__model_source:[^_]*__$/;

/** A sentence end: terminator, optional closing quotes/brackets, then whitespace. */
const SENTENCE_END = /[.!?]["'”’)\]]*(?=\s)/;
/** A terminator run at the very end of a buffer — undecidable until the next chunk shows what follows. */
const TRAILING_TERMINATOR = /[.!?]["'”’)\]]*$/;
const countWords = (s: string): number => (s.match(/\S+/g) ?? []).length;

/**
 * Cut a spoken answer at a sentence end inside `limit` words (spec 2026-09-04
 * §4). In-app answers ran 97 words median, 41 of 52 over 80, on 2026-09-04;
 * a sentence cut at 80 measured 67 median, 0 over 80, 2 under 40 — hence the
 * original 40-word floor, raised to equal the limit by spec 2026-09-05 §3.
 *
 * The decision is taken at the start of each sentence. A sentence that starts
 * with fewer than `floor` words emitted streams through token by token, whole,
 * even past `limit` — the allowance, which also means the first sentence is
 * never cut inside. A sentence that starts at or past `floor` is buffered and
 * emitted only if it fits; otherwise the stream is cut there. With `floor`
 * equal to `limit` (the app's setting since spec 2026-09-05 §3) this reads:
 * the sentence in progress at `limit` finishes and the answer ends at the
 * next sentence boundary. A cut returns out of the for-await, which closes
 * the source (IteratorClose); the SDK stream honours it by stopping the
 * request. A terminator at the end of a chunk waits for the next chunk, so
 * "3.5" or "e.g." split across chunks cannot end a sentence. onDone fires
 * once, on natural end or on a cut — never when the consumer stops early.
 */
export async function* cutAtWordBudget(
    source: AsyncGenerator<string>,
    opts: WordBudgetOptions,
): AsyncGenerator<string> {
    const { limit, floor } = opts;
    let emitted = 0;
    let inWord = false;
    // Counts words in text being yielded, carrying the in-word state across
    // chunk boundaries so a word split over two chunks counts once.
    const track = (s: string): number => {
        let n = 0;
        for (const ch of s) {
            const space = /\s/.test(ch);
            if (!space && !inWord) n++;
            inWord = !space;
        }
        return n;
    };
    /**
     * The longest prefix of `s` that keeps the running count at or under `ceiling`,
     * cut where the first word that would exceed it BEGINS — so the spoken answer
     * never ends on half a word. A word split across chunks was counted when its
     * first character was emitted (`inWord`), so its continuation costs nothing.
     * Returns the whole string when it fits, which is how the caller tells a
     * natural end (no cut) from a clamp.
     */
    const fitToCeiling = (s: string, room: number): string => {
        let n = 0;
        let wasIn = inWord;
        for (let i = 0; i < s.length; i++) {
            const space = /\s/.test(s[i]);
            if (!space && !wasIn) {
                if (n === room) return s.slice(0, i);
                n++;
            }
            wasIn = !space;
        }
        return s;
    };
    let mode: 'stream' | 'buffer' = 'stream';
    let carry = '';
    let cut = false;
    const finish = (): void => { opts.onDone?.({ words: emitted, cut, allowance: emitted > limit }); };

    // Hard ceiling for stream mode: an answer with no [.!?] anywhere never leaves
    // stream mode, so before this it streamed whole (200 words → words=200 cut=no).
    // The app passes 200 — limit, floor and ceiling alike — see SPOKEN_WORD_GUARD,
    // which makes this the ONLY stop on the verbal path: a 200-word spoken answer
    // is already a runaway (the bare arm's longest real answer is 170). The piece
    // is trimmed to the last whole word that fits, so `words` never exceeds the
    // ceiling however the provider chunks the stream, and an answer that ENDS at
    // exactly the ceiling is not reported as cut — nothing was dropped.
    const ceiling = opts.ceiling ?? 2 * limit;
    for await (const chunk of source) {
        if (SENTINEL_CHUNK.test(chunk)) { yield chunk; continue; } // not words — leaves carry/inWord alone
        let text = carry + chunk;
        carry = '';
        while (text.length > 0) {
            const m = SENTENCE_END.exec(text);
            if (mode === 'stream') {
                if (!m) {
                    const hold = TRAILING_TERMINATOR.exec(text);
                    const keep = hold ? hold.index : text.length;
                    if (keep > 0) {
                        const piece = text.slice(0, keep);
                        const fitted = fitToCeiling(piece, ceiling - emitted);
                        emitted += track(fitted);
                        if (fitted) yield fitted;
                        if (fitted.length < piece.length) { cut = true; finish(); return; }
                    }
                    carry = text.slice(keep);
                    text = '';
                } else {
                    const end = m.index + m[0].length;
                    const piece = text.slice(0, end);
                    const fitted = fitToCeiling(piece, ceiling - emitted);
                    emitted += track(fitted);
                    if (fitted) yield fitted;
                    if (fitted.length < piece.length) { cut = true; finish(); return; }
                    text = text.slice(end);
                    if (emitted >= floor) mode = 'buffer';
                }
            } else {
                if (!m) {
                    // Buffering waits for the sentence to end before deciding whether it fits, so
                    // it keeps reading. Stop once even the unterminated tail cannot fit under the
                    // ceiling: the sentence is already too long to keep, and reading the rest of
                    // it only pays the provider for text nobody will hear. Keeps the early
                    // IteratorClose the stream-mode ceiling used to give.
                    if (emitted + countWords(text) > ceiling) { cut = true; finish(); return; }
                    carry = text; text = ''; break;
                }
                const end = m.index + m[0].length;
                const sentence = text.slice(0, end);
                if (emitted + countWords(sentence) > limit) {
                    cut = true;
                    finish();
                    return; // closes `source` via the for-await's IteratorClose
                }
                emitted += track(sentence);
                yield sentence;
                text = text.slice(end);
            }
        }
    }
    if (carry) {
        if (mode === 'stream') {
            // Same trim as the loop: the held tail cannot push the answer past the ceiling.
            const fitted = fitToCeiling(carry, ceiling - emitted);
            emitted += track(fitted);
            if (fitted) yield fitted;
            if (fitted.length < carry.length) cut = true;
        } else if (emitted + countWords(carry) <= limit) {
            emitted += track(carry);
            yield carry;
        } else if (carry.trim()) {
            cut = true;
        }
    }
    finish();
}

/**
 * The runaway guard the verbal path streams under since flight s50c (2026-09-12).
 *
 * It replaces the question-scaled sentence cut of spec 2026-09-09 §3.5 —
 * clamp(80, 2.5 × question words, 150) — which fired on 13 of 42 in-app
 * answers that flight and removed the LAST asked part from 4 of the 8 in-app
 * failures (S2Q01, S2Q02, S2Q07, S2Q08). The same-hour bare arm — same model,
 * same prompt, no cut — scored 18/20 with a 117-word median and a 170-word
 * maximum; the app's cut applied offline to those 20 answers would have
 * truncated 7. The prompt still asks for 80–150 words; the model's own stop is
 * what earns 18/20, so the stream is only clamped at the 200 the gate row
 * already bounds (`max <= 200`).
 *
 * The floor sits at 120, well below the limit, so a runaway ENDS ON A FINISHED
 * SENTENCE. Under 120 words the stream is untouched, which covers the answers
 * the prompt actually asks for (flight s50i: words p50 105). The switch to
 * sentence buffering can only happen AT a sentence boundary, so the gap between
 * floor and limit is the budget the next whole sentence has to fit in: 80 words
 * here, against a longest observed sentence well under that. Buffered, a
 * sentence that would cross 200 is dropped whole instead of sliced.
 *
 * Flight s50i (2026-09-18) is why: S2Q07 was cut at exactly 200 words
 * mid-sentence, the same prompt answered offline ran to 218, and the grader
 * marked the in-app answer weak for the ending it never reached — the only
 * in-app loss that flight with an identifiable mechanical cause. A floor at the
 * limit cannot fix this, and neither can one merely close to it: a sentence
 * that STARTS below the floor is still streamed, and is sliced at the ceiling.
 *
 * Two cases still stop mid-sentence, both correctly: a single sentence longer
 * than the floor-to-limit budget, and an answer with no terminator anywhere —
 * neither has a boundary to keep. Either way the gate row reports the cut as a
 * finding: a 200-word spoken answer is a runaway however it ends.
 */
export const SPOKEN_WORD_GUARD: Readonly<Pick<WordBudgetOptions, 'limit' | 'floor' | 'ceiling'>> = { limit: 200, floor: 120, ceiling: 200 };
