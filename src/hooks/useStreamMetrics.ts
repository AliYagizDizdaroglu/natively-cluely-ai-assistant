import { useCallback, useRef, useState } from 'react';

export interface StreamMetrics {
    ttftMs: number | null;
    totalMs: number | null;
    tokens: number | null;
    tokensPerSec: number | null;
    modelSource: string | null;
    streaming: boolean;
}

const EMPTY: StreamMetrics = {
    ttftMs: null,
    totalMs: null,
    tokens: null,
    tokensPerSec: null,
    modelSource: null,
    streaming: false,
};

/**
 * Captures perceived (renderer-side) streaming metrics: TTFT, total time,
 * approximate token count and tokens/sec. Token count uses chars/4 — fine for
 * a UI indicator, no tokenizer shipped.
 *
 * Usage:
 *   const sm = useStreamMetrics();
 *   sm.start();                       // when sending
 *   sm.markFirstToken(content);       // first appendToken flush
 *   sm.setSource(label);              // on gemini-stream-source
 *   sm.markDone(content);             // on gemini-stream-done
 *   <MessageMetricsBar metrics={sm.metrics} />
 */
export function useStreamMetrics() {
    const [metrics, setMetrics] = useState<StreamMetrics>(EMPTY);
    const sendTsRef = useRef<number | null>(null);
    const firstTokenTsRef = useRef<number | null>(null);
    const sourceRef = useRef<string | null>(null);

    const start = useCallback(() => {
        sendTsRef.current = performance.now();
        firstTokenTsRef.current = null;
        sourceRef.current = null;
        setMetrics({ ...EMPTY, streaming: true });
    }, []);

    const markFirstToken = useCallback((_content: string) => {
        if (firstTokenTsRef.current !== null || sendTsRef.current === null) return;
        const now = performance.now();
        firstTokenTsRef.current = now;
        const ttft = now - sendTsRef.current;
        setMetrics(prev => ({ ...prev, ttftMs: ttft, streaming: true }));
    }, []);

    const setSource = useCallback((label: string) => {
        sourceRef.current = label;
        setMetrics(prev => ({ ...prev, modelSource: label }));
    }, []);

    const markDone = useCallback((content: string) => {
        if (sendTsRef.current === null) return;
        const now = performance.now();
        const totalMs = now - sendTsRef.current;
        const tokens = Math.max(1, Math.round(content.length / 4));
        const genWindowMs = firstTokenTsRef.current !== null ? now - firstTokenTsRef.current : null;
        const tokensPerSec = genWindowMs && genWindowMs > 0 ? (tokens / (genWindowMs / 1000)) : null;
        setMetrics(prev => ({
            ...prev,
            totalMs,
            tokens,
            tokensPerSec,
            streaming: false,
        }));
    }, []);

    const reset = useCallback(() => {
        sendTsRef.current = null;
        firstTokenTsRef.current = null;
        sourceRef.current = null;
        setMetrics(EMPTY);
    }, []);

    return { metrics, start, markFirstToken, setSource, markDone, reset };
}
