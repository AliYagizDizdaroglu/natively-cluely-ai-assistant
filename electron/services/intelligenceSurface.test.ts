import { describe, it, expect } from 'vitest';
import { pickIntelligenceSurface } from './intelligenceSurface';

const win = (destroyed = false) => ({ isDestroyed: () => destroyed });

describe('pickIntelligenceSurface', () => {
    it('a meeting routes to the overlay even while the mode names the launcher', () => {
        const overlay = win(), launcher = win();
        expect(pickIntelligenceSurface(true, overlay, launcher)).toBe(overlay);
    });
    it('no meeting → whatever the window mode names', () => {
        const overlay = win(), launcher = win();
        expect(pickIntelligenceSurface(false, overlay, launcher)).toBe(launcher);
    });
    it('a meeting without a live overlay window falls back to the mode window', () => {
        const launcher = win();
        expect(pickIntelligenceSurface(true, null, launcher)).toBe(launcher);
        expect(pickIntelligenceSurface(true, win(true), launcher)).toBe(launcher);
    });
    it('nothing to send to → null', () => {
        expect(pickIntelligenceSurface(false, null, null)).toBeNull();
    });
});
