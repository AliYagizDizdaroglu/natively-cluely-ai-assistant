// Shared R09-fix predicate. Used by guard-h40b.mjs (against both the build and the source it
// must have come from) and by guard-r09-cal.mjs (the calibration script that exercises this
// same function against four known texts before it is trusted inside the guard).
//
// Returns null when text carries the R09 fix, otherwise a short reason string naming which
// premise failed. Bare-salary is tested first, phrase second - the same order as the guard's
// original check 5.
export function r09Missing(text) {
    if (/["']salary["']\s*,/.test(text)) return 'still lists bare "salary" as a negotiation term';
    if (!text.includes('salary expectations')) return 'lacks the R09 phrase terms';
    return null;
}
