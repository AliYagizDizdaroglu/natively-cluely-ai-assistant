// electron/knowledge/MockInterviewGenerator.ts
// Stub — mock question generation is a premium feature.

import { KnowledgeDocument, MockQuestion } from './types';

export async function generateMockQuestions(
    _resumeDoc: KnowledgeDocument,
    _jdDoc: KnowledgeDocument,
    _generateContentFn: (contents: any[]) => Promise<string>
): Promise<MockQuestion[]> {
    return [];
}
