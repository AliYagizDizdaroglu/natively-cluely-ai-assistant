/**
 * After a rate-limit failure a provider is skipped for a while instead of
 * being retried first every time. On 2026-09-02 every structured call tried
 * Gemini Pro first, got three 429s (~3.2 s) and only then fell back to Flash.
 */
export function isRateLimit(reason: string): boolean {
    return /\b429\b|rate limit|quota|resource.?exhausted|model busy|too many requests/i.test(reason);
}

export class ProviderCooldown {
    private until = new Map<string, number>();
    constructor(private readonly cooldownMs: number = 10 * 60 * 1000) {}

    noteFailure(name: string, reason: string, now: number = Date.now()): void {
        if (isRateLimit(reason)) this.until.set(name, now + this.cooldownMs);
    }

    shouldSkip(name: string, now: number = Date.now()): boolean {
        const t = this.until.get(name);
        return t !== undefined && now < t;
    }
}
