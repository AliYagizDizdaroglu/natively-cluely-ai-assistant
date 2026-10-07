import fs from "fs";
import path from "path";

/**
 * Records the EXACT pair the verbal path sends to the answer model — the final system
 * instruction and the final user turn — so an offline arm can replay another model against
 * the same call instead of an approximation of it.
 *
 * Why capture rather than reconstruct: the user turn is assembled from the résumé/knowledge
 * context block, the previous-responses block, up to twelve transcript turns with the
 * settled question pinned last, the Live listener's text and the response trailer. Flight
 * s50d measured the app at 16 of 20 and the bare arm — which sends only
 * `The interviewer just asked: "<scripted text>"` — at 17 of 20, so the two calls are not
 * the same experiment, and a model swap measured on the bare shape does not predict what
 * the app would do. Only the bytes the app actually sent can answer that.
 *
 * Off unless NATIVELY_CAPTURE_PROMPTS=1: the capture carries the candidate's résumé context
 * and the interviewer transcript, which a normal session has no reason to write to disk.
 * The flight harness sets it for the measured hour.
 *
 * One JSON object per line, appended, never rotated by us — the file matches the repo's
 * `*.log` ignore rule and the flight copies it into the run folder beside the debug log.
 * Failure to write is swallowed: a capture must never break an answer mid-interview.
 */
export interface CapturedPrompt {
    /** ISO instant the request was issued — how the flight pairs a capture to a question. */
    at: string;
    model: string;
    /** The systemInstruction as sent, including the identity header and any style suffix. */
    system: string;
    /** The user turn as sent: context block, transcript with the pinned question, trailer. */
    user: string;
}

export const CAPTURE_FILE = "verbal-prompts.log";

export function capturePromptsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.NATIVELY_CAPTURE_PROMPTS === "1";
}

export function capturePrompt(
    entry: Omit<CapturedPrompt, "at">,
    opts: { dir?: string; now?: () => Date; env?: NodeJS.ProcessEnv } = {},
): void {
    if (!capturePromptsEnabled(opts.env ?? process.env)) return;
    const line: CapturedPrompt = { at: (opts.now?.() ?? new Date()).toISOString(), ...entry };
    try {
        fs.appendFileSync(path.join(opts.dir ?? process.cwd(), CAPTURE_FILE), `${JSON.stringify(line)}\n`);
    } catch {
        /* swallow — never break the stream on log failure */
    }
}

/**
 * Pairs captures to question ids: a capture belongs to the dispatch it FOLLOWS, within
 * `windowMs`, and only if its pinned question is the dispatched one (captureAsksQuestion).
 * The app logs the dispatch first and issues the request a few milliseconds later, so a
 * capture that precedes every dispatch (a warm-up, a typed chat before the hour) belongs
 * to none of them and is dropped rather than guessed at.
 * A dispatch with no eligible capture gets no entry: in router-default-r1 five dispatches
 * (the behavioural verbal route never captures) took the NEXT turn's capture, 23 s later,
 * and the shift chained until 17 of 42 ids held another question's prompt. The text match is
 * what stops that shift; there is no next-dispatch bound, because an answer's capture can
 * land after its own supersede was dispatched. Limit: the same question text dispatched
 * twice within the window, the first uncaptured, still hands the first the second's capture.
 */
export function pairCapturesToDispatches(
    captures: CapturedPrompt[],
    dispatches: { id: string; dispatchedAt: string; question: string }[],
    windowMs = 30_000,
): Record<string, CapturedPrompt> {
    const byTime = [...captures].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const out: Record<string, CapturedPrompt> = {};
    const used = new Set<CapturedPrompt>();
    // In time order, so an id's LAST dispatch decides its entry: a later dispatch with no
    // capture (a supersede on the behavioural route) drops the replaced answer's capture.
    const inOrder = [...dispatches].sort((a, b) => Date.parse(a.dispatchedAt) - Date.parse(b.dispatchedAt));
    for (const d of inOrder) {
        const at = Date.parse(d.dispatchedAt);
        if (Number.isNaN(at)) continue;
        const hit = byTime.find((c) => {
            if (used.has(c)) return false;
            const delta = Date.parse(c.at) - at;
            return delta >= -1_000 && delta <= windowMs && captureAsksQuestion(c, d.question);
        });
        if (hit) {
            used.add(hit);
            out[d.id] = hit;
        } else {
            delete out[d.id];
        }
    }
    return out;
}

/** Text of the last `[INTERVIEWER]:` line of a captured user turn (the pinned question), or null. */
export function lastInterviewerLine(user: string): string | null {
    const lines = [...user.matchAll(/^\[INTERVIEWER\]:\s*(.*)$/gm)];
    return lines.length ? lines[lines.length - 1][1] : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * True iff the capture's pinned question is the dispatched question. Measured 2026-10-07
 * over 18 runs: each capture's last interviewer line equals its own dispatch's question,
 * answer+supersede pairs included (there the answer's capture can land after the supersede
 * is dispatched, so a capture is matched by text, not by order).
 */
export function captureAsksQuestion(capture: CapturedPrompt, question: string): boolean {
    const line = lastInterviewerLine(capture.user);
    if (line === null) return false;
    const l = norm(line);
    const q = norm(question);
    return l !== "" && l === q;
}
