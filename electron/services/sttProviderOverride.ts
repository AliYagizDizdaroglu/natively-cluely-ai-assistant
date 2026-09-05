/**
 * Harness-only STT provider override. The saved provider lives in the
 * encrypted credential store, which a flight test must not edit; like
 * NATIVELY_LIVE_MODE, a dev-only environment variable selects the provider
 * for one launch instead. An unknown value refuses loudly rather than falling
 * back, and a packaged build ignores the variable entirely (spec 2026-09-05 §5).
 */
export const STT_PROVIDERS = ['none', 'google', 'groq', 'openai', 'deepgram', 'elevenlabs', 'azure', 'ibmwatson', 'soniox', 'natively'] as const;
export type SttProviderName = typeof STT_PROVIDERS[number];

export function resolveSttProvider(saved: SttProviderName, envValue: string | undefined, isPackaged: boolean): { provider: SttProviderName; overridden: boolean } {
    if (isPackaged || !envValue) return { provider: saved, overridden: false };
    if (!(STT_PROVIDERS as readonly string[]).includes(envValue)) {
        throw new Error(`NATIVELY_STT_PROVIDER=${JSON.stringify(envValue)} is not one of ${STT_PROVIDERS.join(', ')}`);
    }
    return { provider: envValue as SttProviderName, overridden: envValue !== saved };
}
