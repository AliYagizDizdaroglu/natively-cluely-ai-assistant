// Spec-review v4 scratch (read-only over MAIN): the plan's starting sizes/sha prefixes, its line anchors,
// the Task 5 WAV-dir assumption, and the extractor parity claim with BOTH the old inline parse and the v4 parse.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 8);
const claims = [
    ['electron/audio/deepgramBoundaryRepair.ts', 5940, '4653b898'],
    ['electron/audio/deepgramBoundaryRepair.test.ts', 7691, 'c57ef099'],
    ['electron/audio/DeepgramStreamingSTT.ts', 14831, '9584012e'],
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 5096, '4a2b34ec'],
    ['electron/audio/deepgramKeyterms.ts', 5404, null],
    ['electron/audio/deepgramKeyterms.test.ts', 2846, null],
    ['electron/test/golden/interview60.turns-fixture.mjs', 5485, null],
    ['electron/audio/deepgramBoundaryRepair.fixtures.json', null, 'e65c6e74'],
];
console.log('== starting sizes / sha256 prefixes ==');
for (const [rel, size, pre] of claims) {
    const b = fs.readFileSync(path.join(MAIN, rel));
    const cr = b.filter((x) => x === 13).length;
    const ok = (size === null || b.length === size) && (pre === null || sha(b) === pre);
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${rel}: ${b.length} bytes (plan ${size ?? '-'}), sha ${sha(b)} (plan ${pre ?? '-'}), CR bytes ${cr}, mtime ${fs.statSync(path.join(MAIN, rel)).mtime.toISOString()}`);
}
console.log('\n== line anchors ==');
const lineOf = (rel, n) => fs.readFileSync(path.join(MAIN, rel), 'utf8').split('\n')[n - 1];
for (const [rel, n] of [['electron/audio/DeepgramStreamingSTT.ts', 13], ['electron/audio/DeepgramStreamingSTT.ts', 200], ['electron/audio/DeepgramStreamingSTT.ts', 202], ['electron/audio/DeepgramStreamingSTT.ts', 219], ['electron/audio/DeepgramStreamingSTT.ts', 241], ['electron/audio/DeepgramStreamingSTT.ts', 247], ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 48], ['electron/audio/deepgramKeyterms.ts', 80], ['electron/audio/deepgramKeyterms.ts', 89], ['electron/audio/deepgramKeyterms.test.ts', 2], ['electron/test/golden/interview60.turns-fixture.mjs', 14], ['electron/test/golden/interview60.turns-fixture.mjs', 53], ['electron/test/golden/interview60.turns-fixture.mjs', 54]]) {
    console.log(`${rel}:${n}: ${JSON.stringify(lineOf(rel, n))}`);
}
console.log('\n== HEAD ==');
console.log(fs.readFileSync(path.join(MAIN, '.git/HEAD'), 'utf8').trim());

console.log('\n== Task 5: the WAV dir and parity ==');
const GOLDEN = path.join(MAIN, 'electron/test/golden');
const FINAL = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
const REPAIR = /^\S+ \[LOG\] \[DeepgramStreaming\] boundary repair: restored "((?:[^"\\]|\\.)*)" before "/;
const unq = (s) => JSON.parse(`"${s}"`);
function v4Parse(dbg, sinceMs) {
    const lines = dbg.split('\n'); const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(FINAL); if (!m) continue;
        const rep = lines[i + 1]?.match(REPAIR);
        const text = (rep ? `${unq(rep[1])} ${unq(m[2])}` : unq(m[2])).trim();
        const at = Date.parse(m[1]);
        if (text && at >= sinceMs) out.push({ at, text });
    }
    return out;
}
const oldParse = (dbg, since) => [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: Date.parse(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= since);
for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
    const run = path.join(GOLDEN, 'interview60.runs', name);
    const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
    const dbg = fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8');
    const fx = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'fixtures', `${name}-turns.json`), 'utf8'));
    const a = v4Parse(dbg, tl.startedMs - 2000), b = oldParse(dbg, tl.startedMs - 2000);
    const crlf = (dbg.match(/\r\n/g) ?? []).length;
    console.log(`${name}: v4 ${a.length} / old ${b.length} / fixture ${fx.finals.length}; v4==fixture ${JSON.stringify(a) === JSON.stringify(fx.finals)}; old==fixture ${JSON.stringify(b) === JSON.stringify(fx.finals)}; offsetMs ${fx.offsetMs}; roster ${fx.roster}; CRLF ${crlf}; repair lines ${(dbg.match(/boundary repair: restored/g) ?? []).length}`);
    for (const dir of ['scenario50-tts-local', 'scenario50-tts']) {
        const d = path.join(GOLDEN, dir);
        if (!fs.existsSync(d)) { console.log(`   ${dir}: MISSING`); continue; }
        const missing = fx.items.map((i) => i.id).filter((id) => !fs.existsSync(path.join(d, `${id}.wav`)));
        console.log(`   ${dir}: ${fx.items.length} items, missing WAVs ${missing.length}${missing.length ? ` (${missing.slice(0, 8).join(', ')})` : ''}`);
    }
}
