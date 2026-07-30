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
 * the word budget and name any depth it dropped after a `__MORE__` sentinel:
 *
 *     ...spoken answer...
 *     __MORE__
 *     1| trade-offs of vnode count
 *     2| hot-key handling on the ring
 *
 * Tolerant by design: a missing block is the common case (correct whenever the
 * answer is already complete), and malformed lines are dropped rather than shown,
 * because leaking `1| ...` into the answer bubble is worse than losing one chip.
 */
export function extractSuggestions(text: string): { answer: string; suggestions: Suggestion[] } {
    const i = text.indexOf(SENTINEL);
    if (i === -1) return { answer: text, suggestions: [] };

    const answer = text.slice(0, i).replace(/\s+$/, '');
    const suggestions: Suggestion[] = [];
    for (const raw of text.slice(i + SENTINEL.length).split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const m = line.match(/^(\d+)\s*\|\s*(.+)$/);
        if (!m) continue;                       // stray prose inside the block — drop it
        const label = m[2].trim().replace(/^["'`]|["'`]$/g, '');
        if (label) suggestions.push({ n: Number(m[1]), label });
    }
    return { answer, suggestions };
}

/**
 * Streaming guard for the sentinel: yields the spoken answer and suppresses
 * everything from `__MORE__` onward, so the block never flashes on screen while
 * tokens arrive. Captured offers are handed to `onSuggestions` at stream end.
 *
 * Holds back only a short tail (the sentinel can straddle a chunk boundary) —
 * enough to recognise a partial `__MOR`, not enough to stall the stream.
 */
export async function* stripSuggestionBlock(
    source: AsyncGenerator<string>,
    onSuggestions?: (s: Suggestion[]) => void,
): AsyncGenerator<string> {
    let pending = '';   // possible partial sentinel, not yet safe to emit
    let tail = '';      // everything after the sentinel
    let found = false;

    for await (const chunk of source) {
        if (found) { tail += chunk; continue; }
        pending += chunk;
        const at = pending.indexOf(SENTINEL);
        if (at !== -1) {
            found = true;
            const before = pending.slice(0, at);
            if (before) yield before;
            tail = pending.slice(at + SENTINEL.length);
            pending = '';
            continue;
        }
        // Emit everything that cannot be the start of the sentinel; keep the rest.
        const keep = longestSentinelPrefixSuffix(pending);
        const emit = pending.slice(0, pending.length - keep);
        if (emit) yield emit;
        pending = pending.slice(pending.length - keep);
    }

    if (!found && pending) yield pending;
    if (onSuggestions) {
        onSuggestions(found ? extractSuggestions(SENTINEL + tail).suggestions : []);
    }
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
