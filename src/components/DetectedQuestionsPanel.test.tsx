import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

describe('DetectedQuestionsPanel expand/collapse', () => {
    // Requested 2026-09-02 while watching the hour-long run: the panel dropped
    // open whenever the mouse crossed it. Hover must never expand; the header
    // is the toggle; new chips still open it.
    const chipText = 'Implement an LRU cache in Python?';

    it('does not expand a collapsed panel on hover', () => {
        render(<DetectedQuestionsPanel />);
        fireEvent.click(screen.getByRole('button', { name: /Detected Questions/ }));
        expect(screen.queryByText(chipText)).toBeNull();
        const root = screen.getByText(/Detected Questions/).parentElement!.parentElement!;
        fireEvent.mouseEnter(root);
        fireEvent.mouseMove(root);
        expect(screen.queryByText(chipText)).toBeNull();
    });

    it('toggles on header click', () => {
        render(<DetectedQuestionsPanel />);
        const header = screen.getByRole('button', { name: /Detected Questions/ });
        expect(screen.getByText(chipText)).toBeTruthy();
        fireEvent.click(header);
        expect(screen.queryByText(chipText)).toBeNull();
        fireEvent.click(header);
        expect(screen.getByText(chipText)).toBeTruthy();
    });
});
