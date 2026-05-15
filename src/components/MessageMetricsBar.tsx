import React from 'react';
import type { StreamMetrics } from '../hooks/useStreamMetrics';

interface Props {
    metrics: StreamMetrics;
    className?: string;
}

const fmtMs = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(ms < 1000 ? 2 : 1)}s`);
const fmtTps = (n: number | null) => (n === null ? '—' : `${n.toFixed(0)} tok/s`);
const fmtTok = (n: number | null) => (n === null ? '—' : `${n} tok`);

export const MessageMetricsBar: React.FC<Props> = ({ metrics, className = '' }) => {
    const { ttftMs, totalMs, tokens, tokensPerSec, modelSource, streaming } = metrics;
    if (ttftMs === null && !modelSource && !streaming) return null;

    const parts: string[] = [];
    if (modelSource) parts.push(modelSource);
    if (ttftMs !== null) parts.push(`TTFT ${fmtMs(ttftMs)}`);
    if (streaming) {
        parts.push('streaming…');
    } else {
        if (tokensPerSec !== null) parts.push(fmtTps(tokensPerSec));
        if (tokens !== null) parts.push(fmtTok(tokens));
        if (totalMs !== null) parts.push(fmtMs(totalMs));
    }

    return (
        <div
            className={`text-[11px] leading-none text-text-tertiary select-none ${className}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
        >
            {parts.join(' · ')}
        </div>
    );
};
