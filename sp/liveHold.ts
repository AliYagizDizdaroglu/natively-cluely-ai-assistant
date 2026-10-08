/**
 * Holds an unverifiable Live detection instead of dispatching it blind.
 *
 * Gemini Live sometimes claims a question was asked while the interviewer STT
 * has produced nothing in the last 15s to cross-check it against — with a
 * final-only STT (Groq REST), that Live-first detection has no anchor and
 * dedup falls back to text rules alone (Ruling R28/R37). Holding it briefly
 * gives the STT a chance to catch up so reconcileLiveQuestion can compare Live's
 * claim against what was actually said, instead of trusting it unverified.
 *
 * Pure state machine (the only side effect is the timer): one pending
 * detection at a time — offering a new one supersedes whatever was pending.
 */

export interface LiveHoldOptions<T> {
    /** How long to wait for an interviewer final before resolving on the held detection alone. */
    holdMs: number;
    /** Called at most once per offer(): on the holdMs timeout, or on an earlier onInterviewerFinal(). */
    onResolve: (detection: T) => void;
}

export interface LiveHold<T> {
    /**
     * Hold a new detection. Returns whatever was previously pending — so the
     * caller can log its supersession — or null if nothing was. Cancels and
     * restarts the holdMs timer.
     */
    offer(detection: T): T | null;
    /** An interviewer STT final arrived — resolve the pending hold now, if any. */
    onInterviewerFinal(): void;
    /** Drop any pending hold without resolving it (meeting stop, mode → off, dedup reset). */
    cancel(): void;
}

export function createLiveHold<T>(opts: LiveHoldOptions<T>): LiveHold<T> {
    let pending: T | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = (): void => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    const resolveNow = (): void => {
        const detection = pending;
        pending = null;
        clearTimer();
        if (detection) opts.onResolve(detection);
    };

    return {
        offer(detection: T): T | null {
            const previous = pending;
            clearTimer();
            pending = detection;
            timer = setTimeout(resolveNow, opts.holdMs);
            return previous;
        },
        onInterviewerFinal(): void {
            if (pending) resolveNow();
        },
        cancel(): void {
            pending = null;
            clearTimer();
        },
    };
}
