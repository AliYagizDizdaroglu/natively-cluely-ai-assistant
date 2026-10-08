// dry.mjs: builds the 47 items and the system text WITHOUT any network call; --calibrate breaks the inputs on purpose and requires each break to be caught.
import { buildItems, checkItems, buildSystem, FILTER_SHA_PREFIX, MAIN, sha256 } from './common.mjs';
import fs from 'node:fs';
const { roster, timeline, items, bad } = await buildItems();
console.log(`items ${items.length}; mains ${roster.filter((r) => r.level === 'main').length}; follow-ups ${roster.filter((r) => r.level === 'followup').length}; problems ${bad.length}${bad.length ? ': ' + bad.join(' | ') : ''}`);
console.log(`chains: ${items.filter((i) => i.parent).map((i) => `${i.id}<-${i.parent}`).join(' ')}`);
console.log(`total clip audio ${items.reduce((s, i) => s + i.wav.samples.length / i.wav.rate, 0).toFixed(1)} s`);
const S = await buildSystem(); console.log(`system: ${JSON.stringify(S.shas)}`);
const fsha = sha256(fs.readFileSync(`${MAIN}/dist-electron/electron/llm/verbalStreamFilter.js`)).slice(0, 16);
console.log(`filter sha16 ${fsha} ${fsha === FILTER_SHA_PREFIX ? '= registered' : 'DIFFERS from registered ' + FILTER_SHA_PREFIX}`);
if (process.argv.includes('--calibrate')) {
    const mut = {
        'swap two items': (it) => { const c = it.slice(); [c[2], c[3]] = [c[3], c[2]]; return c; },
        'wrong parent': (it) => it.map((x) => (x.id === 'EF01' ? { ...x, parent: 'RE01' } : x)),
        'parent after child': (it) => { const c = it.slice(); const a = c.findIndex((x) => x.id === 'RE02'), b = c.findIndex((x) => x.id === 'EF01'); [c[a], c[b]] = [c[b], c[a]]; return c; },
        'dropped item': (it) => it.slice(0, 46),
        'one tampered sample': (it) => it.map((x, k) => (k === 5 ? { ...x, wav: { ...x.wav, samples: Int16Array.from(x.wav.samples, (v, i) => (i === 1000 ? v ^ 1 : v)) } } : x)),
        'truncated clip': (it) => it.map((x, k) => (k === 7 ? { ...x, wav: { ...x.wav, samples: x.wav.samples.subarray(0, x.wav.samples.length - 4800) } } : x)),
        'wrong startSec': (it) => it.map((x, k) => (k === 9 ? { ...x, startSec: x.startSec + 1 } : x)),
    };
    let ok = true;
    for (const [name, f] of Object.entries(mut)) { const b = checkItems(f(items), roster, timeline); const caught = b.length > 0; if (!caught) ok = false; console.log(`CAL ${name}: ${caught ? 'caught (' + b.length + ')' : 'NOT CAUGHT'}`); }
    console.log(`CAL clean case: ${checkItems(items, roster, timeline).length === 0 ? 'clean (0 problems)' : 'FALSE ALARM'}`);
    process.exit(ok ? 0 : 1);
}
