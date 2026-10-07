import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { probeSettled, waitProbeSettled, parseProbeOffset, PROBE_QUIET_MS } from './probeWait.mjs';
import { buildCaptureFiles, routerPreflight } from './routerCapture.mjs';
import { selectArms, flightPlan, PAIRED_ARMS, ANSWER_MODELS, FOCUSED_MODELS, answersFileFor, CUE_RULE_MARK } from './interview60.flight.mjs';
import { logSince } from './interview60.lib.mjs';
import today from './fixtures/flightPlan.today.json';

const dispatch = (n: number) => `2026-10-07T08:00:0${n}.000Z [LOG] [Router] dispatch turn=${n} at=${1000 * n} q_at=${1000 * n - 500} q_src=vad router=up ear=3.1`;
const decision = (n: number, shown = 'live') => `2026-10-07T08:00:0${n}.900Z [LOG] [Router] turn=${n} route=easy-answer reason=ok live_first_ms=900 live_words=20 shown=${shown} shadow=40 ear=3.1 router=up q_src=vad q_at=${1000 * n - 500} sent=4`;
const dup = (n: number) => `[Router] turn=${n} route=easy-answer reason=dup live_first_ms=- live_words=12 shown=- shadow=- ear=3.1 router=up q_src=vad q_at=${1000 * n - 500} sent=0`;
const ansEnd = (n: number) => `[IntelligenceEngine] answer end turn=${n} kind=completed`;
const mainAns = '[Main] dispatch: answer source=live anchor="x" verdict=question question="why"';
const close = '[Main] turn: close reason=silence';
const open = '[Main] turn: gate=hold finals=1 live=1 finished=false';

describe('probeSettled (flag on, I8: the decision line, not the answer end)', () => {
    it('is settled when every dispatch has its decision line and the turn is closed', () => {
        const r = probeSettled([dispatch(1), decision(1), close].join('\n'), { flagOn: true });
        expect(r).toMatchObject({ settled: true, open: 0 });
    });
    it('is not settled while a dispatch has no decision line', () => {
        const r = probeSettled([dispatch(1), dispatch(2), decision(1), close].join('\n'), { flagOn: true });
        expect(r.settled).toBe(false);
        expect(r.open).toBe(1);
        expect(r.why).toMatch(/turn=2/);
    });
    it('an answer end without its [Router] turn=N line is NOT settled', () => {
        const r = probeSettled([dispatch(1), ansEnd(1), close].join('\n'), { flagOn: true });
        expect(r).toMatchObject({ settled: false, open: 1 });
    });
    it('a dup line (shown=-) for the turn is not its decision line', () => {
        const r = probeSettled([dispatch(1), dup(1), close].join('\n'), { flagOn: true });
        expect(r).toMatchObject({ settled: false, open: 1 });
    });
    it('turn=1 does not satisfy turn=11', () => {
        const r = probeSettled([dispatch(11), decision(1), close].join('\n'), { flagOn: true });
        expect(r).toMatchObject({ settled: false, open: 1 });
    });
    it('a turn still open (the last [Main] turn: line is not close) is not settled', () => {
        const r = probeSettled([dispatch(1), decision(1), close, open].join('\n'), { flagOn: true });
        expect(r.settled).toBe(false);
        expect(r.why).toMatch(/turn/);
    });
});

describe('probeSettled (flag off)', () => {
    it('is settled when every dispatch: answer has an answer end after it', () => {
        expect(probeSettled([mainAns, ansEnd(1), close].join('\n'), { flagOn: false })).toMatchObject({ settled: true, open: 0 });
    });
    it('is not settled with a dispatch and no end', () => {
        expect(probeSettled([mainAns, close].join('\n'), { flagOn: false })).toMatchObject({ settled: false, open: 1 });
    });
    it('an end logged BEFORE the dispatch does not count for it', () => {
        expect(probeSettled([ansEnd(0), mainAns, close].join('\n'), { flagOn: false })).toMatchObject({ settled: false, open: 1 });
    });
    it('a supersede is a dispatch: the replacing stream keeps the wait open until its own end (M2)', () => {
        const sup = '[Main] dispatch: supersede source=live anchor="x" verdict=question replaces=["a"] question="why"';
        const aborted = '[IntelligenceEngine] answer end turn=1 kind=aborted';
        expect(probeSettled([mainAns, sup, aborted, close].join('\n'), { flagOn: false })).toMatchObject({ settled: false, open: 1 });
        expect(probeSettled([mainAns, sup, aborted, ansEnd(1), close].join('\n'), { flagOn: false })).toMatchObject({ settled: true, open: 0 });
    });
    it('a Router decision line does not settle a flag-off wait', () => {
        expect(probeSettled([mainAns, decision(1), close].join('\n'), { flagOn: false }).settled).toBe(false);
    });
});

describe('the probe offset (I8: probe() can retry and replay the wav)', () => {
    it('reads only the log from the LAST attempt: an open dispatch of attempt 1 does not count', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'probeoff-'));
        const f = path.join(dir, 'natively_debug.log');
        const attempt1 = [dispatch(1), '[Main] turn: gate=hold'].join('\n') + '\n';
        fs.writeFileSync(f, attempt1);
        const out2 = `PROBE_LOG_OFFSET ${Buffer.byteLength(attempt1)}\n  playing…`;
        fs.appendFileSync(f, [dispatch(2), decision(2), close].join('\n') + '\n');
        const whole = probeSettled(logSince(f, 0), { flagOn: true });
        expect(whole.settled).toBe(false);
        const off = parseProbeOffset(out2);
        expect(off).toBe(Buffer.byteLength(attempt1));
        expect(probeSettled(logSince(f, off), { flagOn: true }).settled).toBe(true);
    });
    it('parseProbeOffset takes the LAST marker and returns null when there is none', () => {
        expect(parseProbeOffset('PROBE_LOG_OFFSET 10\nx\nPROBE_LOG_OFFSET 99')).toBe(99);
        expect(parseProbeOffset('nothing here')).toBeNull();
    });
});

describe('waitProbeSettled', () => {
    it('returns true once the log has settled AND stayed quiet for PROBE_QUIET_MS', async () => {
        let reads = 0, slept = 0;
        const logs = [dispatch(1), [dispatch(1), decision(1), close].join('\n')];
        const ok = await waitProbeSettled({ readLog: () => logs[Math.min(reads++, 1)], sleep: async (ms: number) => { slept += ms; }, flagOn: true });
        expect(ok).toBe(true);
        expect(slept).toBeGreaterThanOrEqual(PROBE_QUIET_MS);
    });
    it('an empty log is not settled (review I1: no dispatch yet)', async () => {
        expect(probeSettled('', { flagOn: true }).settled).toBe(false);
        expect(probeSettled('', { flagOn: false }).settled).toBe(false);
        expect(probeSettled(close, { flagOn: true }).why).toMatch(/no dispatch/);
        let slept = 0;
        expect(await waitProbeSettled({ readLog: () => '', sleep: async (ms: number) => { slept += ms; }, flagOn: true })).toBe(false);
        expect(slept).toBeGreaterThanOrEqual(120000);
    });
    it('question 1 done with question 2\'s gate still to come is not accepted until the quiet period passes', async () => {
        const q1 = [dispatch(1), decision(1), close].join('\n');
        expect(probeSettled(q1, { flagOn: true }).settled).toBe(true);            // reads settled once ...
        const q2gate = [q1, '[Main] turn: gate=hold finals=1 live=1 finished=true', dispatch(2)].join('\n');
        let polls = 0, slept = 0;
        const readLog = () => (slept < 4000 ? q1 : q2gate + (polls++, ''));     // q2's gate and dispatch land 4 s in: before the 6 s quiet period ends
        const ok = await waitProbeSettled({ readLog, sleep: async (ms: number) => { slept += ms; }, flagOn: true, capMs: 20000 });
        expect(ok).toBe(false);                                                    // q2 never gets its decision line: unsettled, quiet reset
        // and with the decision arriving, it is accepted only PROBE_QUIET_MS after the last new line
        slept = 0;
        const q2done = [q2gate, decision(2), close].join('\n');
        let landed = -1;
        const read2 = () => { if (slept >= 4000) { if (landed < 0) landed = slept; return q2done; } return q1; };
        const ok2 = await waitProbeSettled({ readLog: read2, sleep: async (ms: number) => { slept += ms; }, flagOn: true });
        expect(ok2).toBe(true);
        expect(slept - landed).toBeGreaterThanOrEqual(PROBE_QUIET_MS);
    });
    it('gives up after the 120 s cap with a fake clock (auto would exit 1)', async () => {
        let slept = 0;
        const ok = await waitProbeSettled({ readLog: () => dispatch(1), sleep: async (ms: number) => { slept += ms; }, flagOn: true });
        expect(ok).toBe(false);
        expect(slept).toBeGreaterThanOrEqual(120000);
        expect(slept).toBeLessThan(130000);
    });
    it('a smaller capMs is honoured', async () => {
        let slept = 0;
        const ok = await waitProbeSettled({ readLog: () => dispatch(1), sleep: async (ms: number) => { slept += ms; }, capMs: 5000, pollMs: 1000, flagOn: true });
        expect(ok).toBe(false);
        expect(slept).toBe(5000);
    });
});

describe('buildCaptureFiles', () => {
    const T0 = 1_000_000;
    const timeline = { startedMs: T0, items: [{ id: 'A1', startSec: 0 }, { id: 'B2', startSec: 20 }, { id: 'C3', startSec: 40 }] };
    // windows with offset 1150: A1 [1001150, 1021150), B2 [1021150, 1041150), C3 [1041150, ...)
    const ra = (o: object) => `2026-10-07T08:00:00.000Z [LOG] [RouterAnswer] ${JSON.stringify(o)}`;
    const dec = (turn: number, qAt: number, shown: string) => `[Router] turn=${turn} route=easy-answer reason=ok live_first_ms=900 live_words=20 shown=${shown} shadow=40 ear=3.1 router=up q_src=vad q_at=${qAt} sent=4`;
    const shadowText = Array(57).fill('word').join(' ');
    const log = [
        '[Answer] budget: words=57 cut=no allowance=no',
        ra({ turn: 1, kind: 'live', text: 'live one', words: 2, firstMs: 900, endMs: 1500, q_src: 'vad' }),
        ra({ turn: 1, kind: 'shadow', text: shadowText, words: 57, firstMs: 1800, endMs: 6000, q_src: 'vad' }),
        dec(1, T0 + 1150 + 5000, 'live'),
        ra({ turn: 2, kind: 'live', text: 'live two', words: 2, firstMs: 950, endMs: 1400, q_src: 'final' }),
        ra({ turn: 2, kind: 'appended', text: 'full two answer', words: 3, firstMs: 2000, endMs: 5000, q_src: 'final' }),
        dec(2, T0 + 1150 + 25000, 'live'),
        dec(3, T0 + 1150 + 45000, 'pipeline'),
        ra({ turn: 9, kind: 'live', text: 'probe turn', words: 2, firstMs: 900, endMs: 1500, q_src: 'vad' }),
        dec(9, T0 - 60000, 'live'),
        '[Router] turn=- route=hard reason=unpaired live_first_ms=- live_words=4 shown=- shadow=- ear=3.1 router=up q_src=- q_at=-',
    ].join('\n');

    it('puts each live and shadow entry under the item whose play window holds the decision line q_at', () => {
        const r = buildCaptureFiles(log, timeline);
        expect(r.live.map((e: any) => [e.id, e.turn, e.text])).toEqual([['A1', 1, 'live one'], ['B2', 2, 'live two']]);
        expect(r.shadow.map((e: any) => [e.id, e.turn])).toEqual([['A1', 1], ['B2', 2]]);
        expect(r.live[0]).toMatchObject({ words: 2, firstMs: 900, endMs: 1500, q_src: 'vad' });
        expect(r.live[1].q_src).toBe('final');
    });
    it('flags the appended turn and only that one', () => {
        const r = buildCaptureFiles(log, timeline);
        expect(r.shadow.find((e: any) => e.turn === 2)).toMatchObject({ appended: true, text: 'full two answer' });
        expect(r.shadow.find((e: any) => e.turn === 1).appended).toBe(false);   // SPEC §5: true|false
        expect(r.live.some((e: any) => e.appended)).toBe(false);
    });
    it('a hidden shadow reaches the file whole: its words equal the turn\'s [Answer] budget line', () => {
        const budget = Number(/\[Answer\] budget: words=(\d+)/.exec(log)![1]);
        const shadow = buildCaptureFiles(log, timeline).shadow.find((e: any) => e.turn === 1);
        expect(shadow.words).toBe(budget);
        expect(shadow.text).toBe(shadowText);
    });
    it('copies superseded into live and shadow entries, and leaves it out when the line lacks it; a decision line ending in superseded=yes still maps', () => {
        const edge = [
            ra({ turn: 1, kind: 'live', text: 'x', words: 1, firstMs: 1, endMs: 2, q_src: 'vad', superseded: true }),
            ra({ turn: 1, kind: 'shadow', text: 'y', words: 1, firstMs: 1, endMs: 2, q_src: 'vad', superseded: false }),
            ra({ turn: 2, kind: 'live', text: 'z', words: 1, firstMs: 1, endMs: 2, q_src: 'vad' }),
            dec(1, T0 + 1150 + 5000, 'live') + ' sent=3 superseded=yes',
            dec(2, T0 + 1150 + 25000, 'live') + ' sent=3 superseded=no',
        ].join('\n');
        const r = buildCaptureFiles(edge, timeline);
        expect(r.live.find((e: any) => e.turn === 1)).toMatchObject({ id: 'A1', superseded: true });
        expect(r.shadow[0]).toMatchObject({ id: 'A1', superseded: false });
        expect('superseded' in r.live.find((e: any) => e.turn === 2)).toBe(false);
        expect(r.live.find((e: any) => e.turn === 2).id).toBe('B2');
    });
    it('probeSettled accepts a decision line ending in superseded=yes', () => {
        const d = decision(1) + ' superseded=yes';
        expect(probeSettled([dispatch(1), d, close].join('\n'), { flagOn: true }).settled).toBe(true);
    });
    it('a turn before the first window is reported as unmapped, not attributed', () => {
        const r = buildCaptureFiles(log, timeline);
        expect(r.live.some((e: any) => e.turn === 9)).toBe(false);
        expect(r.unmapped.map((e: any) => e.turn)).toEqual([9]);
    });
    it('a capture line with no decision line is unmapped; a malformed one is a problem, not a crash', () => {
        const r = buildCaptureFiles([ra({ turn: 5, kind: 'live', text: 't', words: 1, firstMs: 1, endMs: 2, q_src: 'vad' }), '[RouterAnswer] {not json'].join('\n'), timeline);
        expect(r.live).toEqual([]);
        expect(r.unmapped.map((e: any) => e.turn)).toEqual([5]);
        expect(r.problems.length).toBe(1);
    });
    it('uses the given offset: the same q_at falls in the previous window with offsetMs 0', () => {
        const edge = [ra({ turn: 1, kind: 'live', text: 'x', words: 1, firstMs: 1, endMs: 2, q_src: 'vad' }), dec(1, T0 + 20500, 'live')].join('\n');
        expect(buildCaptureFiles(edge, timeline, 0).live[0].id).toBe('B2');
        expect(buildCaptureFiles(edge, timeline).live[0].id).toBe('A1'); // 20500 < 20000 + 1150
    });
});

describe('routerPreflight', () => {
    const connect = (o: Partial<Record<string, string>> = {}) => `[Router] session connect model=gemini-3.8-live block_sha12=${o.block ?? 'e11c240063ea'} instruction_sha12=${o.instr ?? 'e29bf3810128'} context_sha12=${o.ctx ?? 'abc123abc123'} context_chars=${o.chars ?? '812'}`;
    const good = [
        connect(),
        '[Router] session up setup_ms=412',
        '[Main] Live Mode status: connected',
        '[Router] ear model=gemini-3.1-flash-live-preview',
    ];
    const env = { NATIVELY_ROUTER_CONTEXT_SHA12: 'abc123abc123' };
    const fails = (lines: string[]) => lines.filter((l) => l.startsWith('FAIL'));

    it('passes a complete healthy log', () => {
        const r = routerPreflight(good.join('\n'), env);
        expect(r.ok).toBe(true);
        expect(fails(r.lines)).toEqual([]);
        expect(r.lines.length).toBeGreaterThanOrEqual(6);
    });
    it('fails a wrong block sha', () => {
        const r = routerPreflight([connect({ block: 'deadbeef0000' }), ...good.slice(1)].join('\n'), env);
        expect(r.ok).toBe(false);
        expect(fails(r.lines).join('|')).toMatch(/sha/i);
    });
    it('fails a wrong instruction sha', () => {
        expect(routerPreflight([connect({ instr: 'deadbeef0000' }), ...good.slice(1)].join('\n'), env).ok).toBe(false);
    });
    it('fails a context sha that differs from NATIVELY_ROUTER_CONTEXT_SHA12', () => {
        expect(routerPreflight([connect({ ctx: 'ffffffffffff' }), ...good.slice(1)].join('\n'), env).ok).toBe(false);
    });
    it('fails context_chars=0', () => {
        expect(routerPreflight([connect({ chars: '0' }), ...good.slice(1)].join('\n'), env).ok).toBe(false);
    });
    it('uses the LAST connect line', () => {
        const log = [connect({ block: 'deadbeef0000' }), connect(), ...good.slice(1)].join('\n');
        expect(routerPreflight(log, env).ok).toBe(true);
        const bad = [connect(), connect({ block: 'deadbeef0000' }), ...good.slice(1)].join('\n');
        expect(routerPreflight(bad, env).ok).toBe(false);
    });
    it('with NATIVELY_ROUTER_CONTEXT_SHA12 unset it prints the sha and does not gate it', () => {
        const r = routerPreflight([connect({ ctx: 'ffffffffffff' }), ...good.slice(1)].join('\n'), {});
        expect(r.ok).toBe(true);
        expect(r.lines.join('\n')).toContain('ffffffffffff');
    });
    it('fails with no session up', () => {
        expect(routerPreflight([good[0], good[2], good[3]].join('\n'), env).ok).toBe(false);
    });
    it('fails a session close after the last session up, but not one before it', () => {
        const closed = [...good, '[Router] session close gen=1 code=1011 reason=x stale=no quota=no'];
        expect(routerPreflight(closed.join('\n'), env).ok).toBe(false);
        const reopened = [good[0], '[Router] session up setup_ms=1', '[Router] session close gen=1 code=1011 reason=x stale=no quota=no', '[Router] session up setup_ms=2', good[2], good[3]];
        expect(routerPreflight(reopened.join('\n'), env).ok).toBe(true);
    });
    it('a goAway close (stale=no) then up, then the old socket\'s late stale=yes close, still passes (M3)', () => {
        const log = [good[0], '[Router] session up setup_ms=1', '[Router] session close gen=1 code=- reason=goAway stale=no quota=no',
            '[Router] session up setup_ms=2', '[Router] session close gen=1 code=1000 reason=x stale=yes quota=no', good[2], good[3]];
        expect(routerPreflight(log.join('\n'), env).ok).toBe(true);
        const real = [...log.slice(0, 4), '[Router] session close gen=2 code=1011 reason=x stale=no quota=no', good[2], good[3]];
        expect(routerPreflight(real.join('\n'), env).ok).toBe(false);
    });
    it('fails any ear failover line', () => {
        const r = routerPreflight([...good, '[Router] ear failover from=3.1 to=2.5 reason=- dispatches_before=0'].join('\n'), env);
        expect(r.ok).toBe(false);
    });
    it('m-5: an "ear failover disabled" line (NATIVELY_LIVE_MODEL set) is not a failover', () => {
        const r = routerPreflight([...good, '[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=gemini-3.1-flash-live-preview'].join('\n'), env);
        expect(r.lines.find((l) => l.includes('no ear failover'))?.startsWith('PASS')).toBe(true);
        expect(r.ok).toBe(true);
    });
    it('fails when the last Live Mode status is not connected', () => {
        const r = routerPreflight([...good, '[Main] Live Mode status: reconnecting'].join('\n'), env);
        expect(r.ok).toBe(false);
    });
    it('fails an ear on 2.5, and a log with no ear model line', () => {
        expect(routerPreflight([...good.slice(0, 3), '[Router] ear model=gemini-2.5-flash-native-audio-latest'].join('\n'), env).ok).toBe(false);
        expect(routerPreflight(good.slice(0, 3).join('\n'), env).ok).toBe(false);
    });
});

describe('selectArms', () => {
    const paired = PAIRED_ARMS.map((a: any) => ({ model: a.model, tag: a.tag, args: [] as string[] }));
    it('returns exactly the named tags, in the order named', () => {
        expect(selectArms(paired, { NATIVELY_FLIGHT_ARMS: 'high,low,captured-high' }).map((a: any) => a.tag)).toEqual(['high', 'low', 'captured-high']);
    });
    it('throws on an unknown tag, naming it', () => {
        expect(() => selectArms(paired, { NATIVELY_FLIGHT_ARMS: 'high,bogus' })).toThrow(/bogus/);
    });
    it('unset or empty returns all', () => {
        expect(selectArms(paired, {})).toEqual(paired);
        expect(selectArms(paired, { NATIVELY_FLIGHT_ARMS: '' })).toEqual(paired);
    });
    it('throws on a duplicate or an empty entry', () => {
        expect(() => selectArms(paired, { NATIVELY_FLIGHT_ARMS: 'high,high' })).toThrow(/high/);
        expect(() => selectArms(paired, { NATIVELY_FLIGHT_ARMS: 'high,,low' })).toThrow();
    });
});

describe('flightPlan (I5: the selection reaches the file moves and the grading list)', () => {
    const PROMPTS = 'P:/prompts.json';
    const spoken: string[] = (today as any).spoken;
    const mk = (marked: boolean) => Object.fromEntries(spoken.map((id) => [id, { system: `sys ${marked ? CUE_RULE_MARK : ''}`, user: 'u' }]));
    const captured = mk(true);
    const SET = { NATIVELY_FLIGHT_ARMS: 'high,low,captured-high' };

    it('with the variable set: 3 arms in order, toGrade = in-app + 3, moveAside = only those arms files, no chains', () => {
        const p = flightPlan(SET, captured, false, { promptsFile: PROMPTS, roster: 'interview60' });
        expect(p.arms.map((a: any) => a.tag)).toEqual(['high', 'low', 'captured-high']);
        expect(p.arms.some((a: any) => a.tag === undefined)).toBe(false);          // no untagged ANSWER_MODELS arm, no focused arm
        expect(p.toGrade).toEqual([
            'interview60.judge.pairs.json',
            'interview60.judge.pairs.gemini-3.5-flash-lite_high.json',
            'interview60.judge.pairs.gemini-3.1-flash-lite_low.json',
            'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json',
        ]);
        expect(p.moveAside).toEqual([answersFileFor(ANSWER_MODELS[1], 'high'), answersFileFor(ANSWER_MODELS[0], 'low'), answersFileFor(ANSWER_MODELS[1], 'captured-high')]);
        expect(p.moveAside).not.toContain('interview60.chains.json');
        expect(p.paired.map((a: any) => a.tag)).toEqual(['high', 'low', 'captured-high']);
    });
    it('the same selection works on a dry run, even with no capture', () => {
        const p = flightPlan(SET, null, true, { promptsFile: PROMPTS, roster: 'interview60' });
        expect(p.arms.map((a: any) => a.tag)).toEqual(['high', 'low', 'captured-high']);
        expect(p.toGrade.length).toBe(4);
    });
    it('a selected captured arm with no capture is skipped (reported), never thrown; its file is still moved aside', () => {
        const p = flightPlan(SET, null, false, { promptsFile: PROMPTS, roster: 'interview60' });
        expect(p.arms.map((a: any) => a.tag)).toEqual(['high', 'low']);
        expect(p.skipped.map((s: any) => s.tag)).toEqual(['captured-high']);
        expect(p.moveAside).toContain(answersFileFor(ANSWER_MODELS[1], 'captured-high'));
        expect(p.toGrade.length).toBe(3);
    });
    it('an unknown tag throws', () => {
        expect(() => flightPlan({ NATIVELY_FLIGHT_ARMS: 'nope' }, captured, false, { promptsFile: PROMPTS, roster: 'interview60' })).toThrow(/nope/);
    });
    // bundle-1 R6: the no-cue twins replay only the ids whose captured system carries the cue rule.
    const onlyOf = (arm: any) => { const i = arm.args.indexOf('--only'); return i < 0 ? null : arm.args[i + 1]; };
    const twinTags = ['captured-no-cues-high', 'captured-no-cues-high-r2', 'captured-no-cues-high-r3'];
    it('a MIXED capture: the twins fly with --only the ids that carry the rule; the other captured arms keep every id', () => {
        const unmarked = new Set(spoken.slice(0, 1));
        const mixed = Object.fromEntries(spoken.map((id) => [id, { system: `sys ${unmarked.has(id) ? '' : CUE_RULE_MARK}`, user: 'u' }]));
        const p = flightPlan({}, mixed, false, { promptsFile: PROMPTS, roster: 'interview60' });
        const twins = p.arms.filter((a: any) => twinTags.includes(a.tag));
        expect(twins.map((a: any) => a.tag)).toEqual(twinTags);
        for (const t of twins) expect(onlyOf(t).split(',')).toEqual(spoken.filter((id) => !unmarked.has(id)));
        const high = p.arms.find((a: any) => a.tag === 'captured-high');
        expect(onlyOf(high).split(',')).toEqual(spoken);
        expect(p.skipped.map((s: any) => s.tag)).not.toEqual(expect.arrayContaining(twinTags));
    });
    it('NO id carries the rule: the twins are skipped with their log reason; ALL carry it: every id', () => {
        const none = flightPlan({}, mk(false), false, { promptsFile: PROMPTS, roster: 'interview60' });
        expect(none.arms.some((a: any) => twinTags.includes(a.tag))).toBe(false);
        expect(none.skipped.filter((s: any) => twinTags.includes(s.tag)).map((s: any) => s.why)).toEqual(['no-cue-rule', 'no-cue-rule', 'no-cue-rule']);
        const all = flightPlan({}, mk(true), false, { promptsFile: PROMPTS, roster: 'interview60' });
        for (const t of all.arms.filter((a: any) => twinTags.includes(a.tag))) expect(onlyOf(t).split(',')).toEqual(spoken);
    });
    it('a focused-arms env does not add focused arms when the variable is set', () => {
        const p = flightPlan(SET, captured, false, { promptsFile: PROMPTS, roster: 'scenario50' });
        expect(p.arms.some((a: any) => FOCUSED_MODELS.includes(a.model) && a.tag === undefined)).toBe(false);
        expect(p.arms.length).toBe(3);
    });

    // The snapshot in fixtures/flightPlan.today.json was produced by evaluating the PRE-CHANGE main() expressions
    // (flight.mjs 336-394 at 51e98d0) for these exact inputs.
    const inputs: Record<string, { env: Record<string, string>; roster: string; dry: boolean; captured: object | null }> = {
        'captured-with-cue-rule': { env: {}, roster: 'interview60', dry: false, captured: mk(true) },
        'captured-no-cue-rule': { env: {}, roster: 'interview60', dry: false, captured: mk(false) },
        'dry-run': { env: {}, roster: 'interview60', dry: true, captured: null },
        'no-capture': { env: {}, roster: 'interview60', dry: false, captured: null },
        'scenario50-focused': { env: {}, roster: 'scenario50', dry: false, captured: mk(true) },
        'scenario50-focused-off': { env: { NATIVELY_FLIGHT_FOCUSED: 'off' }, roster: 'scenario50', dry: false, captured: mk(true) },
    };
    for (const [name, c] of Object.entries(inputs)) {
        it(`unset stays byte-identical to the pre-change lists: ${name}`, () => {
            const snap = (today as any).cases[name];
            const p = flightPlan(c.env, c.captured, c.dry, { promptsFile: PROMPTS, roster: c.roster });
            expect(JSON.stringify(p.arms)).toBe(JSON.stringify(snap.arms));
            expect(JSON.stringify(p.moveAside)).toBe(JSON.stringify(snap.moveAside));
            expect(JSON.stringify(p.toGrade)).toBe(JSON.stringify(snap.toGrade));
            expect(JSON.stringify(p.paired.map((a: any) => a.tag))).toBe(JSON.stringify(snap.pairedTags));
        });
    }
});
