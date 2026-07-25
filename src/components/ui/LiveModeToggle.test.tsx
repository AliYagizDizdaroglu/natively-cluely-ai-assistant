import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const hookState: {
    mode: 'off' | 'suggest' | 'auto';
    status: { state: string; reason?: string };
    setLiveMode: (m: any) => Promise<void>;
    cycle: () => void;
} = { mode: 'off', status: { state: 'idle' }, setLiveMode: vi.fn(async () => {}), cycle: vi.fn() };

vi.mock('../../hooks/useLiveMode', () => ({
    useLiveMode: () => hookState,
}));

import { LiveModeToggle } from './LiveModeToggle';

const appearance = { chipStyle: {}, pillStyle: {}, iconStyle: {} } as any;

describe('LiveModeToggle (three-state)', () => {
    it('shows OFF when off', () => {
        hookState.mode = 'off';
        hookState.status = { state: 'idle' };
        render(<LiveModeToggle appearance={appearance} />);
        expect(screen.getByText('Live: OFF')).toBeTruthy();
    });

    it('shows Suggest and explains chip-click behavior in the tooltip', () => {
        hookState.mode = 'suggest';
        hookState.status = { state: 'connected' };
        render(<LiveModeToggle appearance={appearance} />);
        expect(screen.getByText('Live: Suggest')).toBeTruthy();
        expect(screen.getByRole('button').getAttribute('title')).toMatch(/chip you click/i);
    });

    it('shows Auto and explains hands-free behavior', () => {
        hookState.mode = 'auto';
        hookState.status = { state: 'connected' };
        render(<LiveModeToggle appearance={appearance} />);
        expect(screen.getByText('Live: Auto')).toBeTruthy();
        expect(screen.getByRole('button').getAttribute('title')).toMatch(/hands-free/i);
    });

    it('hard-fail is VISIBLE: reason + auto-retry note in the tooltip when a mode is active', () => {
        hookState.mode = 'auto';
        hookState.status = { state: 'failed', reason: 'quota exceeded' };
        render(<LiveModeToggle appearance={appearance} />);
        const title = screen.getByRole('button').getAttribute('title') || '';
        expect(title).toContain('quota exceeded');
        expect(title).toContain('auto-retrying');
    });
});
