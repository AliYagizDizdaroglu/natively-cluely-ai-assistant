// electron/knowledge/NegotiationEngine.ts
// Stub — negotiation script generation is a premium feature.
// Returns null so callers gracefully skip or fall back to live coaching.

import { KnowledgeDocument, CompanyDossier } from './types';

export interface NegotiationScript {
    opening_line: string;
    justification_points: string[];
    salary_range: {
        min: number;
        max: number;
        currency: string;
        confidence: 'low' | 'medium' | 'high';
    };
    pivot_scripts: string[];
}

export async function generateNegotiationScript(
    _resumeDoc: KnowledgeDocument,
    _jdDoc: KnowledgeDocument,
    _dossier: CompanyDossier | null,
    _generateContentFn: (contents: any[]) => Promise<string>
): Promise<NegotiationScript | null> {
    // Stub — premium feature not available in open-source build
    return null;
}
