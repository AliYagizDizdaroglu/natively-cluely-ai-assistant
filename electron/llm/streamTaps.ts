/**
 * A whole chunk that is nothing but a __model_source:X__ sentinel. Emitted
 * unfiltered by WhatToAnswerLLM's fallback redirect (sits outside both filter
 * chains by design — see WhatToAnswerLLM.ts:39-41) as well as by LLMHelper's
 * own first-token sentinel, so a chunk boundary can hand tapFirstToken a chunk
 * that is ONLY the sentinel, with no real content in it at all.
 */
const SENTINEL_CHUNK = /^__model_source:[^_]*__$/;

/** Observe a token stream without altering it: first non-empty token time, and the first 120 characters. */
export async function* tapFirstToken(
    stream: AsyncGenerator<string>,
    onFirst: (ms: number) => void,
    onHead: (head: string) => void,
    t0: number = Date.now(),
): AsyncGenerator<string> {
    let first = true, head = '', headSent = false;
    for await (const chunk of stream) {
        const isSentinel = SENTINEL_CHUNK.test(chunk);
        if (first && chunk.length > 0 && !isSentinel) { first = false; onFirst(Date.now() - t0); }
        if (!headSent && !isSentinel) {
            head += chunk;
            if (head.length >= 120) { onHead(head.slice(0, 120)); headSent = true; }
        }
        yield chunk;
    }
    if (!headSent && head.length > 0) onHead(head);
}
