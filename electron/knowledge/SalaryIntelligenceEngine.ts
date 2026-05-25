// electron/knowledge/SalaryIntelligenceEngine.ts
// Stub — advanced salary intelligence is a premium feature.
// Returns null for estimates; buildSalaryContextBlock outputs nothing.

import { StructuredResume, ResumeSalaryEstimate } from './types';

export class SalaryIntelligenceEngine {
    private cachedEstimate: ResumeSalaryEstimate | null = null;

    async estimateFromResume(
        _resume: StructuredResume,
        _totalExperienceYears: number,
        _generateContentFn: (contents: any[]) => Promise<string>
    ): Promise<ResumeSalaryEstimate | null> {
        return null;
    }

    getCachedEstimate(): ResumeSalaryEstimate | null {
        return this.cachedEstimate;
    }

    clearCache(): void {
        this.cachedEstimate = null;
    }

    static buildSalaryContextBlock(
        _resumeEstimate: ResumeSalaryEstimate | null,
        _negotiationScript: any | null,
        _hasJD: boolean
    ): string {
        return '';
    }
}
