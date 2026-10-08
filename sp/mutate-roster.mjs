// THROWAWAY calibration: roster.test.ts was written after roster.mjs, so it proves
// nothing until each mutation it is supposed to catch actually makes it fail.
// Applies one mutation, runs the suite, reverts — always reverts, even on a throw.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const F = PROJ + '/electron/test/golden/roster.mjs';
const original = fs.readFileSync(F, 'utf8');

const MUTATIONS = [
    ['scenario50 shares interview60 audio dirs (the silent stale-clip bug)',
        "scenario50: { items: SCENARIO50, ttsLocal: 'scenario50-tts-local', ttsGemini: 'scenario50-tts', wav: 'scenario50.wav' },",
        "scenario50: { items: SCENARIO50, ttsLocal: 'interview60-tts-local', ttsGemini: 'interview60-tts', wav: 'interview60.wav' },"],
    ['an unknown roster silently falls back instead of throwing',
        'const chosen = ROSTERS[ROSTER_NAME];', 'const chosen = ROSTERS[ROSTER_NAME] ?? ROSTERS.interview60;'],
    ['an unknown scenario is ignored instead of throwing',
        'if (missing.length) {', 'if (false && missing.length) {'],
    ['the default roster changes to scenario50',
        "process.env.NATIVELY_ROSTER?.trim() || 'interview60'", "process.env.NATIVELY_ROSTER?.trim() || 'scenario50'"],
    ['rosterLabel drops the scenario subset',
        '`${ROSTER_NAME}${WANTED_SCENARIOS.length ? ` [${WANTED_SCENARIOS.join(\', \')}]` : \'\'}  ${INTERVIEW.length} items`',
        '`${ROSTER_NAME}  ${INTERVIEW.length} items`'],
];

try {
    for (const [name, from, to] of MUTATIONS) {
        if (!original.includes(from)) { console.log(`SKIP  ${name}  (anchor not found — mutation is stale)`); continue; }
        fs.writeFileSync(F, original.replace(from, to));
        let out = '';
        try {
            // Node 22 refuses to spawn a .cmd without a shell (EINVAL), and the first
            // version of this probe swallowed that as "0 failed, 0 passed" for every
            // mutation — a probe that answers the same whatever the code does.
            out = execFileSync(process.execPath, [PROJ + '/node_modules/vitest/vitest.mjs', 'run', 'electron/test/golden/roster.test.ts', '--reporter=dot'],
                { cwd: PROJ, stdio: 'pipe', encoding: 'utf8' });
        } catch (e) { out = (e.stdout ?? '') + (e.stderr ?? ''); }
        const plain = out.replace(/\[[0-9;]*m/g, '');
        const m = plain.match(/Tests\s+(?:(\d+) failed)?\s*\|?\s*(?:(\d+) passed)?/);
        const failed = Number(m?.[1] ?? 0), passed = Number(m?.[2] ?? 0);
        // The whole point is discrimination, so a run that produced NO result is a
        // broken probe, not a missed mutation. Say so instead of scoring it.
        if (failed + passed === 0) throw new Error(`probe produced no test results for "${name}" — it is not measuring anything:\n${plain.slice(-500)}`);
        console.log(`${failed ? 'CAUGHT' : '>>> MISSED'}  ${name}   (${failed} failed, ${passed} passed)`);
    }
} finally {
    fs.writeFileSync(F, original);
    fs.rmSync(PROJ + '/.mutate.json', { force: true });
    console.log('\nroster.mjs restored');
}
