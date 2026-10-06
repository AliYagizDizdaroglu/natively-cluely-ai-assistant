/**
 * Router-default Task 8 (fix1): the REAL NativelyInterface handlers, driven through a stub window.electronAPI that
 * captures the on* callbacks. Covers what the pure-function tests cannot: the sm-vs-bubbleMetrics routing, the
 * pending-source bookkeeping, the Live-turn mirror and the "(full answer)" header render.
 */
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NativelyInterface from './NativelyInterface';

type Cb = (...args: any[]) => void;
let cbs: Record<string, Cb[]>;

beforeEach(() => {
    cbs = {};
    const api = new Proxy({} as Record<string, unknown>, {
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
    (Element.prototype as any).scrollIntoView ??= () => {};
});

afterEach(() => {
    cleanup();
    delete (window as any).electronAPI;
});

const fire = (name: string, ...args: any[]) => act(() => { for (const cb of cbs[name] ?? []) cb(...args); });
const liveQ = () => fire('onLiveQuestion', { question: 'a question', intent: 'verbal' });
const tok = (d: Record<string, unknown>) => fire('onIntelligenceSuggestedAnswerToken', { question: 'q', confidence: 1, replace: false, ...d });
const fin = (d: Record<string, unknown>) => fire('onIntelligenceSuggestedAnswer', { question: 'q', confidence: 1, replace: false, ...d });
const src = (label: string, turnId?: number) => fire('onIntelligenceSuggestedAnswerSource', label, turnId);

const text = () => document.body.textContent ?? '';
const count = (needle: string) => (text().split(needle).length - 1);
/** The metrics bars: the small "model · TTFT …" lines. */
const bars = () => Array.from(document.querySelectorAll('div')).filter((d) => d.children.length === 0 && /TTFT|tok$| tok /.test(d.textContent ?? '')).map((d) => d.textContent ?? '');

describe('NativelyInterface answer handlers', () => {
    it('mounts and registers the three answer callbacks', () => {
        render(<NativelyInterface />);
        expect(cbs.onIntelligenceSuggestedAnswerToken?.length).toBeGreaterThan(0);
        expect(cbs.onIntelligenceSuggestedAnswer?.length).toBeGreaterThan(0);
        expect(cbs.onIntelligenceSuggestedAnswerSource?.length).toBeGreaterThan(0);
    });

    it('flag-off: pipeline events with a turnId (head, supersede, final, next turn) show one answer per turn, with sm metrics', () => {
        render(<NativelyInterface />);
        liveQ();
        src('Gemini Flash 3.1', 4);
        for (const t of ['Head ', 'one ', 'more']) tok({ token: t, turnId: 4, origin: 'pipeline' });
        tok({ token: 'Superseded ', replace: true, turnId: 4, origin: 'pipeline' });
        tok({ token: 'text', turnId: 4, origin: 'pipeline' });
        fin({ answer: 'Superseded text', replace: true, turnId: 4, origin: 'pipeline' });
        liveQ();
        src('Gemini Flash 3.1', 5);
        tok({ token: 'Two ', turnId: 5, origin: 'pipeline' });
        tok({ token: 'parts', turnId: 5, origin: 'pipeline' });
        fin({ answer: 'Two parts', turnId: 5, origin: 'pipeline' });
        expect(count('Head one more')).toBe(0);
        expect(count('Superseded text')).toBe(1);
        expect(count('Two parts')).toBe(1);
        const b = bars();
        expect(b).toHaveLength(2);
        expect(b.every((x) => x.includes('Gemini Flash 3.1'))).toBe(true);
    });

    it('case C: Live answer, then a "(full answer)" bubble with its header above its cues and its own source', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 7);
        tok({ token: 'Live ', turnId: 7, origin: 'live' });
        tok({ token: 'answer.', turnId: 7, origin: 'live' });
        fin({ answer: 'Live answer.', turnId: 7, origin: 'live' });
        src('Gemini Flash 3.1', 7);
        tok({ token: 'Full ', turnId: 7, origin: 'pipeline', append: true, label: '(full answer)', cues: ['cue one'] });
        tok({ token: 'text', turnId: 7, origin: 'pipeline', append: true });
        fin({ answer: 'Full text', turnId: 7, origin: 'pipeline', append: true });
        expect(count('Live answer.')).toBe(1);
        expect(count('Full text')).toBe(1);
        expect(count('(full answer)')).toBe(1);
        const header = Array.from(document.querySelectorAll('div')).find((d) => d.textContent === '(full answer)')!;
        const cue = Array.from(document.querySelectorAll('li')).find((l) => l.textContent?.includes('cue one'))!;
        expect(header.compareDocumentPosition(cue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const b = bars();
        expect(b).toHaveLength(2);
        expect(b[0]).toContain('gemini-3.8-live');
        expect(b[1]).toContain('Gemini Flash 3.1');
    });

    it('case E, final-only: a replace final after a finished Live answer leaves one bubble, no header, and a bar that is not Live', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 9);
        tok({ token: 'Live answer.', turnId: 9, origin: 'live' });
        fin({ answer: 'Live answer.', turnId: 9, origin: 'live' });
        // no pipeline source event reaches the renderer here (the arbiter used to drop it on a supersede)
        tok({ token: 'Full', turnId: 9, origin: 'pipeline', append: true, label: '(full answer)' });
        fin({ answer: 'Full answer.', turnId: 9, origin: 'pipeline', append: true });
        fin({ answer: 'Replacement.', replace: true, turnId: 9, origin: 'pipeline' });
        expect(count('Replacement.')).toBe(1);
        expect(count('Live answer.')).toBe(0);
        expect(count('Full answer.')).toBe(0);
        expect(count('(full answer)')).toBe(0);
        const b = bars();
        expect(b).toHaveLength(1);
        expect(b[0]).not.toContain('gemini-3.8-live');
    });

    it('N1: a token-stream supersede shows the forwarded replacing source on the bar', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 5);
        tok({ token: 'Live answer.', turnId: 5, origin: 'live' });
        fin({ answer: 'Live answer.', turnId: 5, origin: 'live' });
        src('Replacer Model X', 5);                      // the arbiter forwards the replacing stream's source first
        tok({ token: 'NEW ', replace: true, turnId: 5, origin: 'pipeline' });
        tok({ token: 'text', turnId: 5, origin: 'pipeline' });
        fin({ answer: 'NEW text', replace: true, turnId: 5, origin: 'pipeline' });
        expect(count('NEW text')).toBe(1);
        const b = bars();
        expect(b).toHaveLength(1);
        expect(b[0]).toContain('Replacer Model X');
        expect(b[0]).toContain('TTFT');
    });

    it('N1: with no source for the replacing stream the bar shows the neutral placeholder, not Live', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 5);
        tok({ token: 'Live answer.', turnId: 5, origin: 'live' });
        fin({ answer: 'Live answer.', turnId: 5, origin: 'live' });
        tok({ token: 'NEW ', replace: true, turnId: 5, origin: 'pipeline' });
        fin({ answer: 'NEW.', replace: true, turnId: 5, origin: 'pipeline' });
        const b = bars();
        expect(b).toHaveLength(1);
        expect(b[0]).toContain('…');
        expect(b[0]).not.toContain('gemini-3.8-live');
    });

    it('N2: case C then a final-only replace with no source does not wear the append stream\'s label', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 6);
        tok({ token: 'Live answer.', turnId: 6, origin: 'live' });
        fin({ answer: 'Live answer.', turnId: 6, origin: 'live' });
        src('Gemini Flash 3.1', 6);
        tok({ token: 'Full', turnId: 6, origin: 'pipeline', append: true, label: '(full answer)' });
        fin({ answer: 'Full answer.', turnId: 6, origin: 'pipeline', append: true });
        fin({ answer: 'Replacement.', replace: true, turnId: 6, origin: 'pipeline' });
        const b = bars();
        expect(b).toHaveLength(1);
        expect(b[0]).toContain('…');
        expect(b[0]).not.toContain('Gemini Flash 3.1');
    });

    it('M2: a Live final with no Live token still registers its turn, so the pipeline source reaches the append bubble', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 3);
        fin({ answer: 'Live only.', turnId: 3, origin: 'live' });
        src('Gemini Flash 3.1', 3);
        tok({ token: 'Full', turnId: 3, origin: 'pipeline', append: true, label: '(full answer)' });
        fin({ answer: 'Full.', turnId: 3, origin: 'pipeline', append: true });
        const b = bars();
        expect(b).toHaveLength(2);
        expect(b[1]).toContain('Gemini Flash 3.1');
    });

    it('I1 interleave: turn k+1\'s pipeline tokens never land in turn k\'s orphaned "(full answer)" bubble', () => {
        render(<NativelyInterface />);
        liveQ();
        src('gemini-3.8-live', 1);
        tok({ token: 'Live k.', turnId: 1, origin: 'live' });
        fin({ answer: 'Live k.', turnId: 1, origin: 'live' });
        liveQ();                                       // turn k+1 dispatches
        tok({ token: 'P1 ', turnId: 2, origin: 'pipeline' });
        tok({ token: 'FULL k ', turnId: 1, origin: 'pipeline', append: true, label: '(full answer)' });   // k's Live failed late
        tok({ token: 'P2', turnId: 2, origin: 'pipeline' });
        fin({ answer: 'P1 P2.', turnId: 2, origin: 'pipeline' });
        expect(count('P1 P2.')).toBe(1);
        expect(count('FULL k')).toBe(1);
        expect(text()).not.toMatch(/FULL k\s*P/);
        expect(text()).not.toContain('FULL k P1');
    });
});
