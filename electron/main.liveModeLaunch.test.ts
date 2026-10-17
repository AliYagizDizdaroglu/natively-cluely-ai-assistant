import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * User ruling 2026-10-18: the Live chip starts as Auto at EVERY launch, whatever was saved last. main.ts has no unit
 * harness, so the wiring is pinned on the source text (like main.bundle1Wiring.test.ts). The renderer's useLiveMode
 * reads the initial mode from main (live-mode:get), so main's starting value is what the chip shows.
 */
const src = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');

describe('main.ts: Live mode at launch', () => {
    it('starts as auto', () => {
        expect(src).toMatch(/private liveMode: 'off' \| 'suggest' \| 'auto' = 'auto';/);
    });
    it('does not restore the stored mode when a meeting starts', () => {
        expect(src).not.toContain('Live Mode restored');
        expect(src).not.toMatch(/CredentialsManager\.getInstance\(\)\.getLiveMode\(\)/);
    });
    it('setLiveMode during the session still applies and persists the choice', () => {
        expect(src).toContain('this.liveMode = next;');
        expect(src).toContain('CredentialsManager.getInstance().setLiveMode(next);');
    });
});
