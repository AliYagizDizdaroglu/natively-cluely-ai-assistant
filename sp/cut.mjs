const SENTINEL_CHUNK = /^__model_source:[^_]*__$/;

/** A sentence end: terminator, optional closing quotes/brackets, then whitespace. */
const SENTENCE_END = /[.!?]["'”’)\]]*(?=\s)/;
/** A terminator run at the very end of a buffer — undecidable until the next chunk shows what follows. */
const TRAILING_TERMINATOR = /[.!?]["'”’)\]]*$/;
const countWords = (s) => (s.match(/\S+/g) ?? []).length;

/**
 * Cut a spoken answer at a sentence end inside `limit` words (spec 2026-09-04
 * §4). In-app answers ran 97 words median, 41 of 52 over 80, on 2026-09-04;
 * a sentence cut at 80 measured 67 median, 0 over 80, 2 under 40 — hence the
 * floor.
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
export async function* cutAtWordBudget(source, opts) {
    const { limit, floor } = opts;
    let emitted = 0;
    let inWord = false;
    // Counts words in text being yielded, carrying the in-word state across
    // chunk boundaries so a word split over two chunks counts once.
    const track = (s) => {
        let n = 0;
        for (const ch of s) {
            const space = /\s/.test(ch);
            if (!space && !inWord) n++;
            inWord = !space;
        }
        return n;
    };
    let mode = 'stream';
    let carry = '';
    let cut = false;
    const finish = () => { opts.onDone?.({ words: emitted, cut, allowance: emitted > limit }); };

    // Hard ceiling for stream mode: an answer with no [.!?] anywhere never
    // leaves stream mode, so before this it streamed whole (200 words →
    // words=200 cut=no). A 160-word sentence is not one a candidate says
    // aloud; the measured max on the after4 corpus after the sentence cut is
    // 92 words — this never fires on real answers, it bounds the pathological
    // one. Checked after each yield, so one chunk cannot push past it unbounded.
    const ceiling = 2 * limit;
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
                        emitted += track(piece);
                        yield piece;
                        if (emitted >= ceiling) { cut = true; finish(); return; }
                    }
                    carry = text.slice(keep);
                    text = '';
                } else {
                    const end = m.index + m[0].length;
                    const piece = text.slice(0, end);
                    emitted += track(piece);
                    yield piece;
                    if (emitted >= ceiling) { cut = true; finish(); return; }
                    text = text.slice(end);
                    if (emitted >= floor) mode = 'buffer';
                }
            } else {
                if (!m) { carry = text; text = ''; break; }
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
        if (mode === 'stream' || emitted + countWords(carry) <= limit) {
            emitted += track(carry);
            yield carry;
        } else if (carry.trim()) {
            cut = true;
        }
    }
    finish();
}
