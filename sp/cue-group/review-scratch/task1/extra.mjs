// Two more mutants for teeth.mjs, and a calibration of the row the review suggests for the digits-whitespace-bar state.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const copies = path.join(HERE, 'copies');
const src = fs.readFileSync(path.join(copies, 'new.mts'), 'utf8');
const mk = (name, from, to) => { if (!src.includes(from)) throw new Error('anchor missing ' + from); fs.writeFileSync(path.join(copies, name), src.replace(from, to)); };
mk('m_f_no_empty_guard.mts', "if (head !== '' && !CUE_LINE_PREFIX.test(head)) {", 'if (!CUE_LINE_PREFIX.test(head)) {');
mk('m_g_trimEnd.mts', 'const head = pending.trim();', 'const head = pending.trimEnd();');

async function runCuesTimed(mod, chunks) {
    let seen = 0, reportedAfter = -1, cues = null, calls = 0;
    async function* source() { for (const c of chunks) { seen++; yield c; } }
    const out = [];
    for await (const p of mod.stripCueBlock(source(), (x) => { cues = x; calls++; reportedAfter = seen; })) out.push(p);
    return { out, cues, calls, reportedAfter };
}
const HEAD = '__CUES__\n1| a\n';
const ROW = ['digits, whitespace and the bar: held', '2 |', ' b\nZ', 3, ['a', 'b'], 'Z'];
for (const f of ['new.mts', 'm_c_no_s_before_bar.mts', 'old.mts']) {
    const mod = await import(pathToFileURL(path.join(copies, f)).href);
    const r = await runCuesTimed(mod, [HEAD, ROW[1], ROW[2]]);
    const ok = r.reportedAfter === ROW[3] && JSON.stringify(r.cues) === JSON.stringify(ROW[4]) && r.out.join('') === ROW[5] && r.calls === 1;
    const ref = mod.extractCues(HEAD + ROW[1] + ROW[2]);
    console.log(`${f.padEnd(26)} suggested row ${ok ? 'PASSES' : 'FAILS '}  got ${JSON.stringify(r)}  extractCues ${JSON.stringify(ref)}`);
}
