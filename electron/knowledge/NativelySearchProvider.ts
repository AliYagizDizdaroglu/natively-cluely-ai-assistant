// electron/knowledge/NativelySearchProvider.ts
// Stub search provider for the Natively API (not available in open-source build).

interface SearchResult {
    title: string;
    content: string;
    url?: string;
}

export class NativelySearchProvider {
    public quotaExhausted: boolean = false;
    private _apiKey: string;
    private _trialToken: string | undefined;

    constructor(apiKey: string, trialToken?: string) {
        this._apiKey = apiKey;
        this._trialToken = trialToken;
    }

    async search(_query: string): Promise<SearchResult[]> {
        // Stub — Natively search API not available in open-source build
        return [];
    }
}
