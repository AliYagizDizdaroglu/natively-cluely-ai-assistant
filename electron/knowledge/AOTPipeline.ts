// electron/knowledge/AOTPipeline.ts
// Stub — Ahead-Of-Time pipeline is a premium feature.
// All methods are no-ops; status always returns 'pending'.

import { KnowledgeDocument, AOTStatus } from './types';
import { KnowledgeDatabaseManager } from './KnowledgeDatabaseManager';
import { CompanyResearchEngine } from './CompanyResearchEngine';
import { CultureMappingResult } from './CultureValuesMapper';

export class AOTPipeline {
    private _db: KnowledgeDatabaseManager;
    private _companyResearch: CompanyResearchEngine;

    constructor(db: KnowledgeDatabaseManager, companyResearch: CompanyResearchEngine) {
        this._db = db;
        this._companyResearch = companyResearch;
    }

    setGenerateContentFn(_fn: (contents: any[]) => Promise<string>): void {
        // Stub
    }

    reset(): void {
        // Stub
    }

    async runForJD(
        _jdDoc: KnowledgeDocument,
        _resumeDoc: KnowledgeDocument | null
    ): Promise<void> {
        // Stub — no ahead-of-time processing in open-source build
    }

    getStatus(): AOTStatus {
        return {
            companyResearch: 'pending',
            negotiationScript: 'pending',
            gapAnalysis: 'pending',
            starMapping: 'pending',
        };
    }

    getCachedGapAnalysis(): null {
        return null;
    }

    getCachedNegotiationScript(): null {
        return null;
    }

    getCachedDossier(): null {
        return null;
    }

    getCachedCultureMapping(): CultureMappingResult | null {
        return null;
    }
}
