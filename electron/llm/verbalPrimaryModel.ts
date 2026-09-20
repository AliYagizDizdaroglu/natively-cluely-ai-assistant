/**
 * Which model answers the spoken question, and how a flight may override it.
 *
 * The app's answer model is the user's selection (CredentialsManager's defaultModel,
 * gemini-3.1-flash-lite for everyone who has not changed it). This override lets a flight
 * point the VERBAL path at a different model for one hour without changing what the app
 * ships to anybody, which is the same route the thinking level took: environment variable,
 * bench, proof flight, and only then the code default. The LOW default is trusted today
 * precisely because it was measured behind a flag before it became the default.
 *
 * Why it is needed now. Flight s50k (2026-09-20) ran three reps of each model on the same
 * captured bytes in the same window:
 *
 *      gemini-3.1-flash-lite at LOW    26 / 28 / 31 acceptable of 39
 *      gemini-3.5-flash-lite at HIGH   34 / 29 / 34 acceptable of 39
 *
 * 3.5 met the pre-registered decision rule at EXACTLY both thresholds — mean ahead by 4.0,
 * per-question wins 12 to 6 — with the bands still overlapping. That is the weakest possible
 * pass, so it earns a proof flight as primary, not a shipped default.
 *
 * Scope is deliberately the verbal answer only. Vision, the coding path, typed chat and the
 * warm-ups keep the selected model, so an hour measuring the answer model changes nothing else.
 */
export const VERBAL_PRIMARY_MODEL_ENV = 'NATIVELY_VERBAL_PRIMARY_MODEL';

/**
 * Resolve the model the verbal answer should use.
 *
 * `allowed` is passed in rather than imported so this module stays free of a cycle with
 * LLMHelper, which owns the model constants.
 *
 * An unrecognised value REFUSES rather than falling back to `selected`. A silent fallback is
 * the worse failure by far: a typo in a launcher would spend a whole hour answering on the
 * model we were trying to replace and then report the result as though it were the new one.
 * The variable is unset for every normal run, so this path only exists for a flight.
 */
export function verbalPrimaryModel(selected: string, allowed: readonly string[]): string {
    // A .cmd launcher clears a variable with `set NAME=`, which leaves it defined and empty
    // rather than absent — the s50k launcher does exactly that for the thinking level.
    const raw = (process.env[VERBAL_PRIMARY_MODEL_ENV] ?? '').trim();
    if (!raw) return selected;
    if (!allowed.includes(raw)) {
        throw new Error(
            `${VERBAL_PRIMARY_MODEL_ENV}="${raw}" is not a model this build will answer with. `
            + `Allowed: ${allowed.join(', ')}. Unset the variable to use the selected model.`
        );
    }
    return raw;
}
