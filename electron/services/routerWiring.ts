/**
 * Task 10 (plan rev 2, I3): every piece of main.ts's router glue that is not a bare call site. main.ts constructs this
 * once, right after the arbiter, and calls it from the turn feed, the three engine listeners and the router session.
 * With the flag off the arbiter is built `enabled: false`, so each call below either does nothing or hands today's
 * payload straight to the renderer.
 */
import type { RouterArbiter, RouterTurnIn } from './routerArbiter';

export interface WiringDeps {
  arbiter: Pick<RouterArbiter, 'turnOpened' | 'turnClosed' | 'turnDispatched' | 'forward' | 'setRouterUp' | 'routerTurn' | 'dispatchCount' | 'setEar'>;
  now(): number;
  speechEnd(): { at: number; src: 'vad' | 'final' } | null;
  /** The turn machine's current turn id: speechEnd() describes that turn only. */
  currentTurnId(): number | null;
  diag(line: string): void;
}

export function createRouterWiring(deps: WiringDeps) {
  const { arbiter } = deps;
  // The turn machine's ids only grow (interviewerTurn nextTurnId is never reset), so this set is per-process safe.
  const dispatched = new Set<number>();
  const pipelineTag = (turnId: number | undefined) => (turnId != null ? { turnId, origin: 'pipeline' as const } : {});

  return {
    /** syncTurnIdentity, close, resetTurn and stale replacement all call this with the machine's current id (or null). */
    turnIdentity(prevId: number | null, nextId: number | null): void {
      if (prevId === nextId) return;
      const at = deps.now();
      if (prevId !== null) arbiter.turnClosed(prevId, at);
      if (nextId !== null) arbiter.turnOpened(nextId, at);
    },

    /** dispatchDetection's answer branch. No turnId (typed, manual, chip) is no dispatch. */
    answered(turnId: number | undefined): void {
      if (turnId == null || dispatched.has(turnId)) return;
      dispatched.add(turnId);
      const at = deps.now();
      const se = deps.currentTurnId() === turnId ? deps.speechEnd() : null;   // m-1: another turn's speech end is not this turn's Q
      arbiter.turnDispatched(turnId, at, se?.at ?? at, se?.src ?? 'final');
    },

    // The three payloads are today's (main.ts suggested_answer_token / suggested_answer / _source), plus turnId/origin
    // only when the engine gave a turnId.
    onToken(token: string, question: string, confidence: number, replace?: boolean, cues?: string[], turnId?: number): void {
      arbiter.forward({ ch: 'token', p: { token, question, confidence, replace: replace === true, ...(cues ? { cues } : {}), ...pipelineTag(turnId) } });
    },
    onFinal(answer: string, question: string, confidence: number, replace?: boolean, turnId?: number): void {
      arbiter.forward({ ch: 'final', p: { answer, question, confidence, replace: replace === true, ...pipelineTag(turnId) } });
    },
    onSource(label: string, turnId?: number): void {
      arbiter.forward({ ch: 'source', label, turnId });
    },
    onEnd(turnId: number | null, kind: 'completed' | 'aborted' | 'failed'): void {
      if (turnId != null) arbiter.forward({ ch: 'end', turnId, kind });
    },

    onRouterState(up: boolean, at: number): void { arbiter.setRouterUp(up, at); },
    onRouterTurn(ev: RouterTurnIn): void { arbiter.routerTurn(ev); },
    /** The format the hour reader parses (SPEC 5): VOID when dispatches_before < 10. */
    onRouterFailed(reason: string): void {
      deps.diag(`[Router] session failed reason=${reason} dispatches_before=${arbiter.dispatchCount()}`);
    },

    /** M5: the ear's model id for the log and the arbiter. Task 13's preflight reads the `ear model=` line. */
    onEarModel(model: string): void {
      const ear = model.includes('2.5') ? '2.5' : model.includes('3.1') ? '3.1' : null;
      if (ear) arbiter.setEar(ear);
      deps.diag(`[Router] ear model=${model}`);
      if (!ear) deps.diag('[Router] ear model id not recognised (neither 3.1 nor 2.5): the arbiter keeps its previous ear');
    },
  };
}
