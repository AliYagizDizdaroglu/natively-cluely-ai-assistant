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
