export type AnswerEndKind = 'completed' | 'aborted' | 'failed';

/**
 * An ended answer is a failure when it errored, or when it was aborted before any stream existed (no key, cooldown:
 * generation null). An abort WITH a generation id was replaced by a newer generation (a supersede): not a failure.
 */
export function isAnswerFailure(kind: AnswerEndKind, generation: number | null | undefined): boolean {
  return kind === 'failed' || (kind === 'aborted' && generation == null);
}

/**
 * S2: which ended answers hand their question back to the deduper (main.ts un-marks the returned id).
 * The deduper marks a question answered at dispatch; a failed answer must not leave it marked. Guards, all required:
 *  - the turn's LAST outstanding answer failed (a failed head with a live replacement keeps the mark);
 *  - nothing was delivered for the turn (an earlier completed answer, a superseded one included, keeps the mark);
 *  - no Live answer was shown for the turn (the candidate saw one);
 *  - once per dedup entry (retry-storm cap: an outage re-dispatches on every re-emission and would fail each time;
 *    the entry ages out at the base window, so a real re-ask after it gets a fresh entry and a fresh un-mark).
 * Turn state is dropped once the turn has no outstanding answer left, so it does not grow; turn ids only grow.
 */
export class AnswerOutcomeTracker {
  private turns = new Map<number, { dedupId: number | undefined; pending: number; delivered: boolean }>();
  private unmarked = new Set<number>();

  /** An answer was dispatched for the turn (the head or a supersede's replacement). */
  dispatched(turnId: number, dedupId: number | undefined): void {
    const t = this.turns.get(turnId);
    if (t) { t.pending++; t.dedupId = dedupId ?? t.dedupId; } else this.turns.set(turnId, { dedupId, pending: 1, delivered: false });
  }

  /** The dedup id to un-mark for this end, or undefined to keep the mark. */
  ended(turnId: number | null, kind: AnswerEndKind, generation: number | null | undefined, liveShown: boolean): number | undefined {
    if (turnId == null) return undefined;
    const t = this.turns.get(turnId);
    if (!t) return undefined;
    t.pending = Math.max(0, t.pending - 1);
    if (kind === 'completed') t.delivered = true;
    if (t.pending > 0) return undefined;
    this.turns.delete(turnId);
    if (t.delivered || liveShown || !isAnswerFailure(kind, generation) || t.dedupId === undefined) return undefined;
    if (this.unmarked.has(t.dedupId)) return undefined;
    this.unmarked.add(t.dedupId);
    return t.dedupId;
  }
}
