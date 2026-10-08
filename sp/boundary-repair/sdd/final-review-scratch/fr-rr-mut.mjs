// Scoped re-review (throwaway): MAIN's CURRENT test files against the real code and the single-edit mutants, in mirrors only.
import { makeMirror, rdMain } from './fr-mirror.mjs';
const A = 'electron/audio/', G = 'electron/test/golden/';
const sub = (s, a, b) => { if (s.split(a).length !== 2) throw new Error(`expected exactly one occurrence of: ${a}`); return s.replace(a, b); };
const show = (label, r) => {
    const failed = r.results.filter((x) => x.status === 'failed').map((x) => x.title.slice(0, 80));
    console.log(`${label.padEnd(44)} exit ${r.status}  [${r.results.map((x) => x.status[0].toUpperCase()).join('')}]  ${failed.length ? 'FAILED: ' + failed.join(' | ') : 'no failure'}`);
    if (!r.results.length) console.log('   raw: ' + r.raw);
};
{
    const TEST = A + 'DeepgramStreamingSTT.boundaryRepair.test.ts', ADP = A + 'DeepgramStreamingSTT.ts';
    const adp = rdMain(ADP).toString('utf8');
    const CALL = 'boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true)';
    const m = makeMirror('fr-m-rr4');
    try {
        for (const rel of [TEST, A + 'deepgramBoundaryRepair.ts', A + 'deepgramKeyterms.ts', A + 'deepgramBoundaryRepair.fixtures.json', 'electron/config/languages.ts']) m.put(rel, rdMain(rel));
        for (const [name, text] of [['adapter real', adp], ['adapter clock stuck at 0', sub(adp, CALL, CALL.replace('Date.now()', '0'))]]) { m.put(ADP, text); show(name, m.runJson(TEST)); }
    } finally { console.log(m.dispose()); }
}
{
    const TEST = G + 'interview60.turns-finals.test.ts', MOD = G + 'interview60.turns-finals.mjs';
    const mod = rdMain(MOD).toString('utf8');
    const m = makeMirror('fr-m-rr5');
    try {
        m.put(TEST, rdMain(TEST));
        for (const [name, text] of [
            ['M0 extractor real', mod],
            ['M1 refuse only repair-under-repair', sub(mod, "!FINAL.test(lines[i - 1] ?? '')", "REPAIR.test(lines[i - 1] ?? '')")],
            ['M2 orphan throw removed', sub(mod, "if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw", 'if (false) throw')],
            ['M3 wrong-final throw removed', sub(mod, 'if (rep && !lines[i + 1].includes(', 'if (false && !lines[i + 1].includes(')],
            ['M4 > instead of >=', sub(mod, 'at >= sinceMs', 'at > sinceMs')],
        ]) { m.put(MOD, text); show(name, m.runJson(TEST)); }
    } finally { console.log(m.dispose()); }
}
