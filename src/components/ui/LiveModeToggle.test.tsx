import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Hook is mocked per-test via this mutable holder
const hookState: {
    enabled: boolean;
    status: { state: string; reason?: string };
    toggle: () => Promise<void>;
} = { enabled: false, status: { state: 'idle' }, toggle: vi.fn(async () => {}) };

vi.mock('../../hooks/useLiveMode', () => ({
    useLiveMode: () => hookState,
}));

import { LiveModeToggle } from './LiveModeToggle';

const appearance = { chipStyle: {}, pillStyle: {}, iconStyle: {} } as any;

describe('LiveModeToggle', () => {
    it('shows OFF when disabled', () => {
        hookState.enabled = false;
        hookState.status = { state: 'idle' };
        render(<LiveModeToggle appearance={appearance} />);
        expect(screen.getByText('Live: OFF')).toBeTruthy();
    });

    it('shows ON while connected', () => {
        hookState.enabled = true;
        hookState.status = { state: 'connected' };
        render(<LiveModeToggle appearance={appearance} />);
        expect(screen.getByText('Live: ON')).toBeTruthy();
    });

    it('hard-fail is VISIBLE: FAILED label + reason and auto-retry note in the tooltip', () => {
        hookState.enabled = true;
        hookState.status = { state: 'failed', reason: 'quota exceeded' };
        render(<LiveModeToggle appearance={appearance} />);
        expect(screen.getByText('Live: FAILED')).toBeTruthy();
        const btn = screen.getByRole('button');
        expect(btn.getAttribute('title')).toContain('quota exceeded');
        expect(btn.getAttribute('title')).toContain('auto-retrying');
    });
});
