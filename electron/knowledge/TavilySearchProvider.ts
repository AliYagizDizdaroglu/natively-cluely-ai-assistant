// electron/knowledge/TavilySearchProvider.ts
// Web search provider using the Tavily API (@tavily/core).

interface SearchResult {
    title: string;
    content: string;
    url?: string;
}

export class TavilySearchProvider {
    public quotaExhausted: boolean = false;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async search(query: string): Promise<SearchResult[]> {
        if (this.quotaExhausted) return [];

        try {
            const { tavily } = require('@tavily/core');
            const client = tavily({ apiKey: this.apiKey });
            const response = await client.search(query, {
                maxResults: 5,
                searchDepth: 'basic',
            });

            return (response.results || []).map((r: any) => ({
                title: r.title || '',
                content: r.content || r.snippet || '',
                url: r.url,
            }));
        } catch (err: any) {
            const msg = err.message?.toLowerCase() || '';
            if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) {
                this.quotaExhausted = true;
            }
            console.warn('[TavilySearchProvider] Search error:', err.message);
            return [];
        }
    }
}
