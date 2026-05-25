// electron/knowledge/TechnicalDepthScorer.ts
// Stub — analyzes interviewer utterances to determine technical depth level.
// In the open-source build this always returns 'balanced'.

import { ToneDirective } from './types';

export class TechnicalDepthScorer {
    private utterances: string[] = [];

    addUtterance(text: string): void {
        this.utterances.push(text);
        // Stub: no actual analysis
    }

    getToneDirective(): ToneDirective {
        return 'balanced';
    }

    getToneXML(): string {
        // Return empty string — no tone override in open-source build
        return '';
    }
}
