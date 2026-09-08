/**
 * Does the interviewer point at something on screen? Hands-free, the app then
 * captures the screen before answering (main.ts answerDetection) instead of
 * answering "take a look at this problem on screen" from the transcript — after8
 * (2026-09-07) answered all three screenshot cues that way, one of them with the
 * previous question's answer.
 */
const SCREEN = /\b(on|at|to) (the |my |your |this )?screen\b|\bshared? (my |the |your )?screen\b|\bscreen ?shar(e|ing)\b/i;

export function mentionsScreen(question: string): boolean {
    return SCREEN.test(question);
}

/**
 * The extendOf an extend answer should build on, given whether THIS answer captured the
 * screen. extensionShape tells the model it has already answered the first part, to add only
 * the delta in under 30 words, and not to reintroduce that answer. That premise holds only
 * while this answer knows nothing the earlier one did not — and a capture is exactly such
 * knowledge: after9 C03's head ("Walk me through it and mention the time") carried no screen
 * reference, so it was answered blind, about drift and retraining, for a circular-queue
 * problem on screen. Building on it would anchor the first sighted answer to a wrong one and
 * cap it at 30 words.
 *
 * Dropping extendOf costs length when the earlier answer DID see the screen (after8 measured
 * 104-114 words without the extension shape against 27 with it). That is the right trade:
 * across three graded flights no weak verdict was ever caused by length alone, and a blind
 * answer to a question about the screen is wrong outright.
 */
export function extendOfAfterCapture(extendOf: string | undefined, captured: boolean): string | undefined {
    return captured ? undefined : extendOf;
}
