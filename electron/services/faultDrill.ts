/**
 * Fault drill (bundle-1 SPEC 7): a harness-only way to break the Live router on a schedule, so the smoke can watch the
 * recovery paths work live. NATIVELY_FAULT_DRILL="router-drop@<sec>,ear-mute@<sec>", seconds after meeting start.
 *
 * Honoured only when ALL hold, checked in this order, and the first failure is the logged reason:
 *   packaged      the build is packaged
 *   not-harness   NATIVELY_AUTOSTART_MEETING is not '1' (the harness-only start). Dev builds load .env, so a drill
 *                 variable left there cannot fire in a meeting the user started by hand.
 *   router-off    NATIVELY_LIVE_ROUTER is not '1'
 * A malformed spec or unknown token is refused with reason=parse and the token only; nothing is armed.
 */
export type DrillKind = 'router-drop' | 'ear-mute';
export interface DrillFault { kind: DrillKind; atSec: number }
/** ok: `faults` is set. Refused: `reason` is set, and `token` too for 'parse'. (A flat shape: the electron tsconfig is not strict, so a discriminated union would not narrow.) */
export interface DrillParse {
    ok: boolean;
    faults?: DrillFault[];
    reason?: 'packaged' | 'not-harness' | 'router-off' | 'parse';
    token?: string;
}

const KINDS: readonly string[] = ['router-drop', 'ear-mute'];

export function parseDrill(spec: string, env: { packaged: boolean; harness: boolean; routerOn: boolean }): DrillParse {
    if (env.packaged) return { ok: false, reason: 'packaged' };
    if (!env.harness) return { ok: false, reason: 'not-harness' };
    if (!env.routerOn) return { ok: false, reason: 'router-off' };
    const faults: DrillFault[] = [];
    for (const token of spec.split(',')) {
        const m = /^([a-z-]+)@(\d+(?:\.\d+)?)$/.exec(token);
        if (!m || !KINDS.includes(m[1]) || faults.some((f) => f.kind === m[1])) return { ok: false, reason: 'parse', token };
        faults.push({ kind: m[1] as DrillKind, atSec: Number(m[2]) });
    }
    return { ok: true, faults };
}

/** ear-mute: the same-length chunk of zero PCM, so the ear's session stays fed like the real silent episodes (a starved session's own close would void the drill). */
export const muteChunk = (chunk: Buffer, muted: boolean): Buffer => (muted ? Buffer.alloc(chunk.length) : chunk);
