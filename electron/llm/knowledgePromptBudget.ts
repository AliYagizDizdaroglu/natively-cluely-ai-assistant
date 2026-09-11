import { SPOKEN_LENGTH_AND_DEPTH } from './prompts';

/**
 * A caller whose system prompt carries the spoken budget block is the hands-free verbal
 * path (VERBAL_WHAT_TO_ANSWER_PROMPT). That prompt is complete and measured: nothing in
 * streamChat replaces it or appends another persona to it — not the Context toggle's
 * knowledge rules, not the active mode's prompt. Typed chat and code hints never carried
 * the block and keep both injections as before.
 *
 * Why (flight s50b, 2026-09-11, 20 scenario50 questions, gemini-3.1-flash-lite, same hour):
 * the app answered 8 of 20 acceptably where the bare verbal prompt answered 18 of 20. Its
 * system prompt was the knowledge rules plus this budget block (the swap the previous
 * version of this file performed) followed by the General mode's prompt under
 * "## ACTIVE MODE" — which tells the model that a coding question gets a "full working
 * code block". Five of the twenty spoken answers came back as code with a numbered
 * walkthrough (the app logged five suppressed code fences, one per such answer) and lost
 * their delivery grade; the verbal prompt forbids exactly that. Rebuilt offline with the
 * same prompt as a system instruction, the swap alone scored 14 and produced no list; with
 * the mode prompt appended it reproduced the code answers. The 2026-09-06 measurement that
 * justified the swap (knowledge prompt + budget block, p50 57 words, 51 of 52 acceptable)
 * was on the short interview60 roster, where 57 words is a whole answer.
 */
export function carriesSpokenBudget(callerOverride: string | undefined): boolean {
    return !!callerOverride && callerOverride.includes(SPOKEN_LENGTH_AND_DEPTH);
}

/** The knowledge engine's replacement prompt, unless the caller is the verbal path. */
export function keepVerbalPrompt(callerOverride: string | undefined, injected: string): string {
    return carriesSpokenBudget(callerOverride) ? (callerOverride as string) : injected;
}
