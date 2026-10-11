/** Overlay auto-scroll toggle: a compact button in the input chrome row, same key + 'storage' event as Settings. */
import React from 'react';
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NativelyInterface from './NativelyInterface';

type Cb = (...args: any[]) => void;
let cbs: Record<string, Cb[]>;
let scrollSpy: ReturnType<typeof vi.fn>;
const KEY = 'natively_auto_scroll';

beforeEach(() => {
    cbs = {};
    localStorage.clear();
    const api = new Proxy({ getKeybinds: vi.fn().mockResolvedValue([]) } as Record<string, unknown>, {
        get(target, prop: string) {
            if (prop in target) return target[prop];
            if (/^on[A-Z]/.test(prop)) {
                return (cb: Cb) => { (cbs[prop] ??= []).push(cb); return () => { cbs[prop] = (cbs[prop] ?? []).filter((c) => c !== cb); }; };
            }
            return vi.fn().mockResolvedValue(undefined);
        },
        has: () => true,
    });
    (window as any).electronAPI = api;
    (window as any).matchMedia ??= (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false });
    (globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
    scrollSpy = vi.fn();
    (Element.prototype as any).scrollIntoView = scrollSpy;
});

afterEach(() => {
    cleanup();
    delete (window as any).electronAPI;
});

const fire = (name: string, ...args: any[]) => act(() => { for (const cb of cbs[name] ?? []) cb(...args); });
const btn = () => screen.getByRole('button', { name: 'Auto-scroll' });

describe('overlay auto-scroll toggle', () => {
    it('renders with aria-pressed matching the stored value', () => {
        localStorage.setItem(KEY, 'true');
        const { unmount } = render(<NativelyInterface />);
        expect(btn().getAttribute('aria-pressed')).toBe('true');
        expect(btn().getAttribute('title')).toBe('Auto-scroll on');
        unmount();
        localStorage.setItem(KEY, 'false');
        render(<NativelyInterface />);
        expect(btn().getAttribute('aria-pressed')).toBe('false');
        expect(btn().getAttribute('title')).toBe('Auto-scroll off');
    });

    it('clicking flips aria-pressed, persists the key and fires the storage event Settings listens to', () => {
        localStorage.setItem(KEY, 'false');
        render(<NativelyInterface />);
        const seen = vi.fn();
        window.addEventListener('storage', seen);
        fireEvent.click(btn());
        expect(btn().getAttribute('aria-pressed')).toBe('true');
        expect(localStorage.getItem(KEY)).toBe('true');
        expect(seen).toHaveBeenCalledTimes(1);
        fireEvent.click(btn());
        expect(btn().getAttribute('aria-pressed')).toBe('false');
        expect(localStorage.getItem(KEY)).toBe('false');
        window.removeEventListener('storage', seen);
    });

    it('off: a new message does not scroll; toggling on jumps to the newest once', () => {
        localStorage.setItem(KEY, 'false');
        render(<NativelyInterface />);
        fire('onLiveQuestion', { question: 'a question', intent: 'verbal' });
        expect(scrollSpy).not.toHaveBeenCalled();
        fireEvent.click(btn());
        expect(scrollSpy).toHaveBeenCalledTimes(1);
        fireEvent.click(btn());
        expect(scrollSpy).toHaveBeenCalledTimes(1);
    });
});
