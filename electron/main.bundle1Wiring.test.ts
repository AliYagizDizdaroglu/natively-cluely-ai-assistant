import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * bundle-1 SPEC 5.2 and 7: main.ts registers everything against the Electron runtime and has no unit harness, so the
 * wiring of the silent-ear watch and the fault drill is pinned on the source text (like ipcHandlers.typedPrompt.test.ts).
 * The pure parts (earSilence, faultDrill, shouldFailOver, LiveRouterSession.drillDrop) have their own behavioural tests.
 */
const src = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
const lines = src.split('\n').map((l) => l.trim());
const count = (re: RegExp) => lines.filter((l) => re.test(l)).length;

describe('main.ts wiring: fault drill', () => {
    it('all three ear write sites go through earPcm (the mute substitution), and none writes the raw chunk', () => {
        expect(count(/this\.liveRouter\?\.write\(this\.earPcm\(chunk\),/)).toBe(3);
        expect(count(/this\.liveRouter\?\.write\(chunk,/)).toBe(0);
    });
    it('the drill is armed once per meeting start, right after the router session starts, and cleared at endMeeting', () => {
        const i = lines.findIndex((l) => l === 'this.startRouterSession();');
        expect(lines[i + 1]).toBe('this.armFaultDrill();');
        expect(count(/^this\.armFaultDrill\(\);$/)).toBe(1);
        expect(count(/^this\.clearFaultDrill\(\);$/)).toBeGreaterThanOrEqual(1);
    });
    it('the gate reads packaged, the harness start variable and the router flag', () => {
        expect(src).toMatch(/parseDrill\(spec, \{ packaged: app\.isPackaged, harness: process\.env\.NATIVELY_AUTOSTART_MEETING === '1', routerOn: this\.routerEnabled \}\)/);
        expect(src).toContain('`[Drill] refused reason=');
        expect(src).toContain('`[Drill] armed ${spec}`');
    });
});

describe('main.ts wiring: silent-listener failover', () => {
    it('the watch exists only with the router flag, is armed on the ear\'s first connected status, and is fed captions', () => {
        expect(src).toContain('const silence = this.routerEnabled ? createEarSilenceWatch() : null;');
        expect(src).toContain("if (s.state === 'connected') silence?.arm();");
        expect(src).toContain('silence?.caption(Date.now());');
    });
    it('interviewer utterance events feed it, and a tick is scheduled at end + grace', () => {
        expect(src).toContain('this.earSilence?.utteranceStart(Date.now());');
        expect(src).toContain('this.earSilence.utteranceEnd(Date.now());');
        expect(src).toContain('setTimeout(() => this.checkEarSilence(), EAR_SILENCE_GRACE_MS + 250)');
    });
    it('silent goes through shouldFailOver with reason silent-listener, shares failOverEar with the status path, and logs once when there is nowhere left to go', () => {
        expect(src).toContain("state: 'failed', reason: 'silent-listener',");
        expect(src).toContain("this.failOverEar(router, 'silent-listener');");
        expect(src).toContain('this.failOverEar(router, s.reason);');
        expect(src).toContain('[Router] ear silent model=${router.getModel() === EAR_FAILOVER_MODEL ? \'2.5\' : \'3.1\'} no-failover-left');
        // the failover line itself is written in ONE place
        expect(count(/\[Router\] ear failover from=3\.1 to=2\.5 reason=/)).toBe(1);
    });
});
