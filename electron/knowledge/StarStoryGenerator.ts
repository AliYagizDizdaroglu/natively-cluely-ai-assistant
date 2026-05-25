// electron/knowledge/StarStoryGenerator.ts
// Stub — STAR story generation is a premium feature.

import { StructuredResume, StarStory, ContextNode } from './types';

export async function generateStarStories(
    _resume: StructuredResume,
    _generateContentFn: (contents: any[]) => Promise<string>
): Promise<StarStory[]> {
    return [];
}

export async function generateStarStoryNodes(
    _resume: StructuredResume,
    _generateContentFn: (contents: any[]) => Promise<string>,
    _embedFn: (text: string) => Promise<number[]>
): Promise<ContextNode[]> {
    return [];
}
