import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore — untyped ESM harness module
import { splitEarlierQuestion, withEarlierQuestion } from './earlierQuestionArm.mjs';
import { LABEL, formatBlock } from '../../llm/earlierQuestion';

/**
 * The flight's same-bytes control (PREREGISTER-flight-eq §7 b4): answers.mjs --no-block replays a captured user
 * turn with the EARLIER QUESTION block removed byte for byte and refuses a turn that carries none. The byte rule
 * in reverse: withEarlierQuestion(split(user).user, split(user).block) === user.
 */
const PARENT = 'Describe how you would shard the telemetry store by tenant.';
const TRANSCRIPT = '[INTERVIEWER]: first question?\n[INTERVIEWER]: How would you rebalance those shards after a tenant doubles in size?';
const TRAILER = '\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):';
const INTENT = '<intent_and_shape>\nDETECTED INTENT: general\nANSWER SHAPE: spoken\n</intent_and_shape>';
const OFF_BARE = `INTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`;
const OFF_CTX = `${INTENT}\n\nPREVIOUS RESPONSES (Avoid Repetition):\n1. "I would rank per department."\n\nINTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`;
const BLOCK = formatBlock(PARENT);

describe('--no-block: the EARLIER QUESTION block of a captured user turn, removed byte for byte', () => {
    it('strip then insert round-trips both shapes (the block the only context part, and the last of several)', () => {
        for (const off of [OFF_BARE, OFF_CTX]) {
            const on = withEarlierQuestion(off, BLOCK);
            expect(on).not.toBe(off);
            const s = splitEarlierQuestion(on, LABEL)!;
            expect(s).not.toBeNull();
            expect(s.block).toBe(BLOCK);
            expect(s.user).toBe(off);
            expect(withEarlierQuestion(s.user, s.block)).toBe(on);
        }
    });
    it('refuses a turn without a block, a block that is not the last context part, two labels, and a two-line block', () => {
        expect(splitEarlierQuestion(OFF_CTX, LABEL)).toBeNull();
        expect(splitEarlierQuestion(`${BLOCK}\n\n${OFF_CTX}`, LABEL)).toBeNull();                                      // PREVIOUS RESPONSES sits between the block and the marker
        expect(splitEarlierQuestion(withEarlierQuestion(`${LABEL}\n- x\n\n${OFF_BARE}`, BLOCK), LABEL)).toBeNull();     // two labels
        expect(splitEarlierQuestion(withEarlierQuestion(OFF_BARE, `${BLOCK}\n- a second line`), LABEL)).toBeNull();   // two parent lines
        // a second label the one-parent-line rule cannot see: after the marker, or inside the single parent line
        expect(splitEarlierQuestion(`${withEarlierQuestion(OFF_BARE, BLOCK)}\n${LABEL}`, LABEL)).toBeNull();
        expect(splitEarlierQuestion(withEarlierQuestion(OFF_BARE, `${LABEL}\n- quotes ${LABEL} inline`), LABEL)).toBeNull();
    });
    it('the stripped turn ends with the untouched transcript and trailer; an empty block is identity', () => {
        expect(splitEarlierQuestion(withEarlierQuestion(OFF_CTX, BLOCK), LABEL)!.user.endsWith(`INTERVIEWER JUST SAID:\n${TRANSCRIPT}${TRAILER}`)).toBe(true);
        expect(withEarlierQuestion(OFF_CTX, '')).toBe(OFF_CTX);
    });
});

// The replay's captured turns (userA = the flag-off bytes, userB = userA with the block inserted; checked on all
// 21 entries 2026-10-04): local only, read from NATIVELY_EQ_PARITY_DIR's `<hour>-gated-turn.json`, never
// committed, never printed; skipped when absent. Keys and lengths only on a failure.
const DIR = process.env.NATIVELY_EQ_PARITY_DIR;
const GATED = DIR && fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^s50[klm]-gated-turn\.json$/.test(f)).sort() : [];
describe.skipIf(GATED.length === 0)('--no-block on the replay\'s captured turns (local fixtures)', () => {
    for (const f of GATED) {
        it(`${f}: every gated entry's userB strips to its userA and re-inserts to userB; userA is refused`, () => {
            const fx = JSON.parse(fs.readFileSync(path.join(DIR!, f), 'utf8')) as Record<string, { userA: string; userB: string; block: string }>;
            const bad: string[] = [];
            for (const [key, e] of Object.entries(fx)) {
                const s = splitEarlierQuestion(e.userB, LABEL);
                if (!s) { bad.push(`${key}: userB refused`); continue; }
                if (s.block !== e.block) bad.push(`${key}: block ${s.block.length}/${e.block.length} chars`);
                if (s.user !== e.userA) bad.push(`${key}: stripped ${s.user.length}/${e.userA.length} chars`);
                if (withEarlierQuestion(s.user, s.block) !== e.userB) bad.push(`${key}: round trip ${withEarlierQuestion(s.user, s.block).length}/${e.userB.length} chars`);
                if (splitEarlierQuestion(e.userA, LABEL) !== null) bad.push(`${key}: userA not refused`);
            }
            expect(bad).toEqual([]);
            expect(Object.keys(fx)).toHaveLength(7);
        });
    }
});
