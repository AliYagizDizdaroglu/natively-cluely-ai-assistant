import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionChip } from './QuestionChip';

describe('QuestionChip source badge', () => {
    it('shows a "Live" badge when source is live', () => {
        render(<QuestionChip id="1" question="Implement an LRU cache" intent="coding" source="live" onClick={vi.fn()} />);
        expect(screen.getByText('Live')).toBeTruthy();
        // aria-label flags it too, for screen readers
        expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/\(Live\)/);
    });

    it('shows no Live badge for whisper-detected chips (default)', () => {
        render(<QuestionChip id="2" question="Tell me about yourself" intent="behavioral" onClick={vi.fn()} />);
        expect(screen.queryByText('Live')).toBeNull();
    });
});
