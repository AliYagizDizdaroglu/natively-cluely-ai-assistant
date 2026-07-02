import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockChips = [
    { id: '1', question: 'Implement an LRU cache in Python?', intent: 'coding' as const, confidence: 0.99 },
];

vi.mock('../hooks/useDetectedQuestions', () => ({
    useDetectedQuestions: () => ({ chips: mockChips, clickChip: vi.fn() }),
}));

import { DetectedQuestionsPanel } from './DetectedQuestionsPanel';

describe('DetectedQuestionsPanel layout', () => {
    it('root element has shrink-0 so it is never squeezed by the growing answer panel below it', () => {
        render(<DetectedQuestionsPanel />);
        const header = screen.getByText(/Detected Questions/);
        // Root is the header's grandparent (header row -> panel root)
        const root = header.parentElement?.parentElement;
        expect(root?.className).toContain('shrink-0');
    });
});
