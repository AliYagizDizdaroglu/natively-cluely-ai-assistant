export type LiveMode = 'off' | 'suggest' | 'auto';

/** Stored values come from disk; only the three literal modes are trusted. */
export function normalizeLiveMode(value: unknown): LiveMode {
    return value === 'suggest' || value === 'auto' ? value : 'off';
}
