// Final review (throwaway): is the ADAPTER's clock (Date.now() into onTranscript) pinned by any adapter test? Mirror of the adapter
// test's files; the real adapter and a mutant that passes a constant 0 as atMs (the 5 s window then never closes), against the
// current test file and the proposed one (+ one window test, + the parked :230 comment nit). MAIN is only read.
//   node fr-t4-cal.mjs
import { makeMirror, rdMain } from './fr-mirror.mjs';
const A = 'electron/audio/';
const TEST = A + 'DeepgramStreamingSTT.boundaryRepair.test.ts', ADP = A + 'DeepgramStreamingSTT.ts';
const test0 = rdMain(TEST).toString('utf8'), adp0 = rdMain(ADP).toString('utf8');
const sub = (s, a, b) => { if (s.split(a).length !== 2) throw new Error(`expected exactly one occurrence of: ${a}`); return s.replace(a, b); };

// Inserted AFTER the empty-INTERIM control (so its "the three above" stays true), right before the Indonesian comment.
const ANCHOR = "        // Indonesian is written in plain ASCII, so the module's own non-ASCII guard does not refuse it: the rule ALONE";
const NEW_TEST = [
    "        it('the 5 s window runs on the arrival clock: F2 5001 ms after F1 is emitted as received, no repair line', () => {",
    '            const { stt, seen } = start();',
    '            playSeam(() => vi.advanceTimersByTime(5001 - (F2.atMs - F1.atMs)));   // F1 -> F2 = 5001 ms, one past the window',
    '            stt.stop();',
    '            expect(seen).toEqual(unchanged);',
    '            expect(repairs()).toEqual([]);',
    '        });',
    '',
    '',
].join('\n');
const NIT_OLD = 'The restart test above covers stop() + start(); this covers the other way a socket is replaced:';
const NIT_NEW = 'The restart test above covers stop() + start(); this covers another way a socket is replaced:';
const testP = sub(sub(test0, ANCHOR, NEW_TEST + ANCHOR), NIT_OLD, NIT_NEW);

const CALL = 'boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true)';
const ADAPTERS = {
    A0_real: adp0,
    A1_clock_constant_0: sub(adp0, CALL, 'boundaryRepair?.onTranscript(transcript, isFinal, 0, data.speech_final === true)'),
};
const mirror = makeMirror('fr-m-t4');
try {
    for (const rel of [A + 'deepgramBoundaryRepair.ts', A + 'deepgramKeyterms.ts', A + 'deepgramBoundaryRepair.fixtures.json', 'electron/config/languages.ts']) mirror.put(rel, rdMain(rel));
    for (const [tname, ttext] of [['CURRENT', test0], ['PROPOSED', testP]]) {
        for (const [aname, atext] of Object.entries(ADAPTERS)) {
            mirror.put(TEST, ttext);
            mirror.put(ADP, atext);
            const r = mirror.runJson(TEST);
            const pass = r.results.filter((x) => x.status === 'passed').length;
            const failed = r.results.filter((x) => x.status !== 'passed').map((x) => `${x.title.slice(0, 70)} :: ${x.msg.slice(0, 110)}`);
            console.log(`${tname.padEnd(8)} ${aname.padEnd(20)} exit ${r.status}  ${pass}/${r.results.length} passed  ${failed.length ? 'NOT PASSED: ' + failed.join(' | ') : ''}`);
            if (!r.results.length) console.log('   raw: ' + r.raw);
        }
    }
} finally {
    console.log(mirror.dispose());
}
