// THROWAWAY: per-item view of the s50a hour from the same computeRun the gate uses.
// Read-only over the snapshot; prints whatever fields the items carry so the doubles,
// the fragment-answered long questions, the lost utterance and the slow answers can be named.
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = process.argv[2] ?? path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a');
const { computeRun } = await import(`file:///${PROJ}/electron/test/golden/interview60.metrics.mjs`);
const m = computeRun(RUN);

console.log('top-level keys:', Object.keys(m).join(' '));
console.log('stats keys:', Object.keys(m.stats ?? {}).join(' '));
console.log('stt keys:', Object.keys(m.stt ?? {}).join(' '));
console.log('item keys:', Object.keys(m.items[0] ?? {}).join(' '));
console.log(`\nsummary: heard ${m.heard} answered ${m.answered} delivered ${m.delivered} doubles ${m.surfacedMulti} extends ${m.extendsTotal} caught ${m.caught} longs ${m.longs} longWhole ${m.longWhole} ttftP90 ${m.ttftP90} (${m.ttftSource}) detectP50 ${m.detectP50} detectP90 ${m.detectP90}`);

const skip = new Set(['q', 'playedAt', 'spokeEnd', 'startSec', 'topic', 'kind']);
console.log('\nitems:');
for (const it of m.items) {
    const rest = Object.entries(it).filter(([k, v]) => !skip.has(k) && v !== undefined && v !== null && v !== false && v !== 0 && !(Array.isArray(v) && !v.length))
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 60)}`).join('  ');
    console.log(`  ${it.id.padEnd(7)} ${String(it.level).padEnd(12)} ${rest}`);
}

console.log('\nlost utterances:', JSON.stringify(m.stt?.lostUtterances ?? [], null, 0).slice(0, 600));
console.log('\nhardFails:', JSON.stringify(m.hardFails ?? [], null, 0).slice(0, 600));
if (m.stats) console.log('\nstats:', JSON.stringify(m.stats).slice(0, 800));
