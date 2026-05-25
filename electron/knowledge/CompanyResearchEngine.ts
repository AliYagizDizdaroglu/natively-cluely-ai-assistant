// electron/knowledge/CompanyResearchEngine.ts
// LLM-based company research with optional web search augmentation.

import { CompanyDossier, StructuredJD } from './types';
import { KnowledgeDatabaseManager } from './KnowledgeDatabaseManager';

interface SearchResult {
    title: string;
    content: string;
    url?: string;
}

interface SearchProvider {
    search(query: string): Promise<SearchResult[]>;
    quotaExhausted?: boolean;
}

/**
 * Builds a JD context object from a StructuredJD for use in research.
 */
export function jdContextFromStructured(jd: StructuredJD): Record<string, any> {
    return {
        title: jd.title,
        location: jd.location,
        level: jd.level,
        technologies: jd.technologies,
        requirements: jd.requirements,
        keywords: jd.keywords,
        compensation_hint: jd.compensation_hint,
        min_years_experience: jd.min_years_experience,
    };
}

export class CompanyResearchEngine {
    private db: KnowledgeDatabaseManager;
    private generateContentFn: ((contents: any[]) => Promise<string>) | null = null;
    public searchProvider: SearchProvider | null = null;

    // In-memory dossier cache keyed by company name (lowercased)
    private dossierCache: Map<string, CompanyDossier> = new Map();

    constructor(db: KnowledgeDatabaseManager) {
        this.db = db;
    }

    setGenerateContentFn(fn: (contents: any[]) => Promise<string>): void {
        this.generateContentFn = fn;
    }

    setSearchProvider(provider: SearchProvider): void {
        this.searchProvider = provider;
    }

    /**
     * Returns a cached dossier for a company, checking memory then DB.
     */
    getCachedDossier(company: string): CompanyDossier | null {
        const key = company.toLowerCase();
        if (this.dossierCache.has(key)) {
            return this.dossierCache.get(key)!;
        }
        const fromDb = this.db.getDossier(company);
        if (fromDb) {
            this.dossierCache.set(key, fromDb);
        }
        return fromDb;
    }

    /**
     * Researches a company using LLM and optionally web search.
     */
    async researchCompany(
        company: string,
        jdContext: Record<string, any> = {},
        force: boolean = false
    ): Promise<CompanyDossier> {
        if (!force) {
            const cached = this.getCachedDossier(company);
            if (cached) return cached;
        }

        if (!this.generateContentFn) {
            throw new Error('LLM function not configured for company research');
        }

        // Optionally gather web search snippets
        let searchContext = '';
        if (this.searchProvider) {
            try {
                const queries = [
                    `${company} company culture interview process`,
                    `${company} salary ${jdContext.title || 'software engineer'} ${jdContext.location || ''}`,
                    `${company} employee reviews Glassdoor 2024`,
                ];
                const results = await Promise.all(queries.map(q => this.searchProvider!.search(q)));
                const snippets = results.flat().slice(0, 8)
                    .map(r => `[${r.title}]\n${r.content}`)
                    .join('\n\n');
                if (snippets) {
                    searchContext = `\n\nWEB SEARCH RESULTS (use these as your primary source for factual data):\n${snippets}`;
                }
            } catch (err: any) {
                console.warn('[CompanyResearchEngine] Search failed, using LLM-only:', err.message);
            }
        }

        const roleContext = jdContext.title
            ? `Role being applied for: ${jdContext.title} (${jdContext.level || 'mid'}-level)${jdContext.location ? `, Location: ${jdContext.location}` : ''}`
            : '';

        const prompt = `You are an expert company research analyst. Research ${company} and provide a comprehensive dossier.
${roleContext}${searchContext}

Output ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "company": "${company}",
  "hiring_strategy": "2-3 sentences about how they hire and what they look for",
  "interview_focus": "2-3 sentences about their interview process and what they test",
  "interview_difficulty": "easy" | "medium" | "hard" | "very_hard",
  "core_values": ["value1", "value2", "value3"],
  "salary_estimates": [
    {
      "title": "${jdContext.title || 'Software Engineer'}",
      "location": "${jdContext.location || 'US'}",
      "min": <number>,
      "max": <number>,
      "currency": "USD",
      "source": "LLM estimate" | "Glassdoor" | "Levels.fyi",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "benefits": ["benefit1", "benefit2"],
  "competitors": ["competitor1", "competitor2", "competitor3"],
  "recent_news": "1-2 sentences about recent company news relevant to a job seeker",
  "sources": ["source1", "source2"]
}

Be specific and factual. Use the search results above when available. For salary data, provide realistic current market ranges.`;

        let raw: string;
        try {
            raw = await this.generateContentFn([{ text: prompt }]);
        } catch (err: any) {
            throw new Error(`Company research LLM call failed: ${err.message}`);
        }

        const clean = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        let dossier: CompanyDossier;
        try {
            dossier = JSON.parse(clean);
        } catch (err: any) {
            throw new Error(`Failed to parse company research JSON: ${err.message}`);
        }

        dossier.fetched_at = new Date().toISOString();

        // Cache in memory and DB
        this.dossierCache.set(company.toLowerCase(), dossier);
        this.db.saveDossier(company, dossier);

        return dossier;
    }
}
