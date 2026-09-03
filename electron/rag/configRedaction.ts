// electron/rag/configRedaction.ts
// Log-safe rendering of the embedding provider config.
//
// WHY THIS EXISTS: EmbeddingPipeline.initialize() logged the config object
// directly, which wrote the user's full Gemini API key in plaintext into
// natively_debug.log on every app start. Keys must never reach a log sink —
// log their PRESENCE, never their value, and never a prefix of their value
// (a prefix is still enough to correlate a key across files).
//
// Deliberately dependency-free so it can be unit-tested without pulling in
// better-sqlite3 or the embedding providers.

/** Structural subset of AppAPIConfig — kept local to avoid a heavy import. */
export interface RedactableConfig {
    openaiKey?: string;
    geminiKey?: string;
    ollamaUrl?: string;
}

/**
 * Render a config for logging: secrets become `set`/`unset`, the Ollama URL is
 * printed as-is because it is a local endpoint, not a credential.
 */
export function describeConfig(config: RedactableConfig): string {
    const present = (v?: string) => (v && v.length > 0 ? 'set' : 'unset');
    return [
        `openaiKey=${present(config.openaiKey)}`,
        `geminiKey=${present(config.geminiKey)}`,
        `ollamaUrl=${config.ollamaUrl && config.ollamaUrl.length > 0 ? config.ollamaUrl : 'unset'}`,
    ].join(' ');
}
