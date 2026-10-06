import type { StreamMetrics } from '../hooks/useStreamMetrics';
import type { BubbleMeta } from './answerMessages';

/** One metrics record per answer bubble: `${turnId}|${origin}|${append ? 1 : 0}` (spec §4.5 rule 4). */
export function bubbleKey(meta: BubbleMeta): string {
    return `${meta.turnId}|${meta.origin}|${meta.append ? 1 : 0}`;
}

const turnOf = (key: string): string => key.slice(0, key.indexOf('|'));

/**
 * Per-bubble stream metrics for the keyed path. TTFT/total are measured from the TURN's start: the first
 * event of any kind carrying that turnId (M1), recorded once under the key's turnId prefix and shared by
 * every bubble of the turn. `first` is idempotent per bubble; `done` returns that bubble's snapshot (token
 * count chars/4, like useStreamMetrics) and forgets the bubble.
 */
export function createBubbleMetrics(nowFn: () => number) {
    const turnStart = new Map<string, number>();
    const firstTs = new Map<string, number>();
    return {
        start(key: string, at?: number): void {
            const turn = turnOf(key);
            if (!turnStart.has(turn)) turnStart.set(turn, at ?? nowFn());
        },
        first(key: string): void {
            if (!firstTs.has(key)) firstTs.set(key, nowFn());
        },
        done(key: string, content: string, source: string | null): StreamMetrics {
            const now = nowFn();
            const start = turnStart.get(turnOf(key));
            const first = firstTs.get(key);
            firstTs.delete(key);
            const tokens = Math.max(1, Math.round(content.length / 4));
            const genWindowMs = first !== undefined ? now - first : null;
            return {
                ttftMs: first !== undefined && start !== undefined ? first - start : null,
                totalMs: start !== undefined ? now - start : null,
                tokens,
                tokensPerSec: genWindowMs && genWindowMs > 0 ? tokens / (genWindowMs / 1000) : null,
                modelSource: source,
                streaming: false,
            };
        },
    };
}
