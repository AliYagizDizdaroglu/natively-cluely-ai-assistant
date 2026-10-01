import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CueBlock } from './CueBlock';

describe('CueBlock — layout B, the cues above the answer', () => {
    it('renders one numbered line per cue, in order', () => {
        render(<CueBlock cues={['thirty gigabytes in float32', 'int8, then shard']} />);
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(items[0].querySelector('span')!.textContent).toBe('1');
        expect(items[0].textContent).toContain('thirty gigabytes in float32');
        expect(items[1].querySelector('span')!.textContent).toBe('2');
        expect(items[1].textContent).toContain('int8, then shard');
    });

    it('renders nothing for an empty list', () => {
        const { container } = render(<CueBlock cues={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
