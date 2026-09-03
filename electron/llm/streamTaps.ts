/** Observe a token stream without altering it: first non-empty token time, and the first 120 characters. */
export async function* tapFirstToken(
    stream: AsyncGenerator<string>,
    onFirst: (ms: number) => void,
    onHead: (head: string) => void,
    t0: number = Date.now(),
): AsyncGenerator<string> {
    let first = true, head = '', headSent = false;
    for await (const chunk of stream) {
        if (first && chunk.length > 0) { first = false; onFirst(Date.now() - t0); }
        if (!headSent) {
            head += chunk;
            if (head.length >= 120) { onHead(head.slice(0, 120)); headSent = true; }
        }
        yield chunk;
    }
    if (!headSent && head.length > 0) onHead(head);
}
