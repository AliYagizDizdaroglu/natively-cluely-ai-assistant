import type { TranscriptTurn } from './transcriptCleaner';
import type { AssistantResponse } from './TemporalContextBuilder';

export const FOLLOWUP_PARENT_ENV = 'NATIVELY_FOLLOWUP_PARENT';
/** How old the previous exchange may be and still come back: the longest roster gap to a follow-up (180 s) plus the answer and the clip, with room. */
export const PARENT_MAX_AGE_MS = 300_000;

export function followUpParentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[FOLLOWUP_PARENT_ENV]?.trim();
    if (!raw || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${FOLLOWUP_PARENT_ENV}="${raw}" is not 1, 0 or unset`);
}

/**
 * Put the previous answered exchange back into a transcript window that lost it.
 *
 * SessionTracker evicts context items older than 120 s on every add, while holdout40 and
 * scenario50 ask a follow-up 150-160 s after its parent, so the follow-up's prompt carried only
 * the follow-up sentence as interviewer speech (h40a and h40b: R02F R04F R09F R11F R13F; on h40b
 * R09F and R11F were wrong, 1 of 8 and 0 of 8 arms acceptable on the same prompt). The parent
 * survives in assistantResponseHistory as { questionContext, text }: when the window holds no
 * copy of that answer, the exchange is prepended, older than everything in the window.
 * Off unless NATIVELY_FOLLOWUP_PARENT=1 — the shipped prompt is unchanged until a flight on a
 * non-holdout roster validates it.
 */
export function withParentExchange(
    turns: TranscriptTurn[],
    history: readonly AssistantResponse[],
    now: number = Date.now(),
    env: NodeJS.ProcessEnv = process.env,
): TranscriptTurn[] {
    if (!followUpParentEnabled(env)) return turns;
    const last = history[history.length - 1];
    if (!last || !last.text || !last.questionContext || last.questionContext === 'unknown') return turns;
    if (now - last.timestamp > PARENT_MAX_AGE_MS) return turns;
    if (turns.some((t) => t.role === 'assistant' && t.text === last.text)) return turns;
    return [
        { role: 'interviewer', text: last.questionContext, timestamp: last.timestamp - 1 },
        { role: 'assistant', text: last.text, timestamp: last.timestamp },
        ...turns,
    ];
}
