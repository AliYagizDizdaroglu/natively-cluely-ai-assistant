// THROWAWAY: prove the roster switch does what the comment says — including that
// the DEFAULT is byte-identical to the old behaviour, which is the thing that would
// silently end after7/8/9 comparability if it were wrong.
import { execFileSync } from 'node:child_process';

const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';

// A tiny program run in a child process, so each case gets its own env.
const PROBE = `
import { INTERVIEW, SPOKEN, TTS_LOCAL_DIR, WAV_NAME, ROSTER_NAME, rosterLabel } from ${JSON.stringify('file:///' + G + 'roster.mjs')};
console.log(JSON.stringify({ name: ROSTER_NAME, n: INTERVIEW.length, spoken: SPOKEN.length, tts: TTS_LOCAL_DIR, wav: WAV_NAME,
  label: rosterLabel(), first: INTERVIEW[0].id, last: INTERVIEW.at(-1).id, longs: INTERVIEW.filter((x) => x.long).length }));
`;

let bad = 0;
const fail = (m) => { console.log('  FAIL ' + m); bad++; };

function probe(env) {
    try {
        const out = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], {
            cwd: PROJ, env: { ...process.env, NATIVELY_ROSTER: '', NATIVELY_SCENARIOS: '', ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { ok: true, ...JSON.parse(out) };
    } catch (e) { return { ok: false, err: (e.stderr || e.message).split('\n').find((l) => l.includes('Error')) ?? 'threw' }; }
}

console.log('1. default (no env) must be interview60, untouched');
const d = probe({});
if (!d.ok) fail('default threw: ' + d.err);
else {
    console.log(`   ${d.label}   tts=${d.tts}  wav=${d.wav}  ${d.first}..${d.last}`);
    if (d.name !== 'interview60') fail('default roster is ' + d.name);
    if (d.n !== 79) fail(`default has ${d.n} items, interview60 has 79`);
    if (d.tts !== 'interview60-tts-local' || d.wav !== 'interview60.wav') fail('default audio paths moved');
    if (d.first !== 'W01' || d.last !== 'L06F2') fail(`default order changed: ${d.first}..${d.last}`);
}

console.log('2. scenario50 must be the new set, in its own directories');
const s = probe({ NATIVELY_ROSTER: 'scenario50' });
if (!s.ok) fail('scenario50 threw: ' + s.err);
else {
    console.log(`   ${s.label}   tts=${s.tts}  wav=${s.wav}  ${s.first}..${s.last}  long=${s.longs}`);
    if (s.n !== 100) fail(`scenario50 has ${s.n} items, expected 100`);
    if (s.tts === d.tts || s.wav === d.wav) fail('scenario50 SHARES audio paths with interview60 — stale clips would be spoken');
    if (s.longs !== 26) fail(`scenario50 reports ${s.longs} long questions, measured 26`);
}

console.log('3. a scenario subset must be exactly those scenarios');
const two = probe({ NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2' });
if (!two.ok) fail('subset threw: ' + two.err);
else {
    console.log(`   ${two.label}   ${two.first}..${two.last}`);
    if (two.n !== 40) fail(`S1,S2 gave ${two.n} items, expected 40`);
    if (two.first !== 'S1Q01' || two.last !== 'S2Q10F') fail(`subset range wrong: ${two.first}..${two.last}`);
}

console.log('4. a typo must THROW, not quietly run a shorter hour');
const badRoster = probe({ NATIVELY_ROSTER: 'scenario_50' });
if (badRoster.ok) fail('an unknown roster name was accepted'); else console.log('   roster typo: ' + badRoster.err);
const badScen = probe({ NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S9' });
if (badScen.ok) fail(`an unknown scenario was accepted and ran ${badScen.n} items`); else console.log('   scenario typo: ' + badScen.err);
const scenOnI60 = probe({ NATIVELY_SCENARIOS: 'S1' });
if (scenOnI60.ok) fail('a scenario filter on interview60 was accepted'); else console.log('   scenario on interview60: ' + scenOnI60.err);

console.log(bad ? `\n${bad} PROBLEM(S)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
