// Throwaway (2026-09-29): calibrate br1-read.mjs's PASS path. Builds a synthetic run folder from s50a:
// after each final the reference repairs, inserts the app's repair log line (plan Task 2 format), and
// puts the restored word into the next answer dispatch's question the way the joined finals would carry
// it. br1-read must then exit 0 on it. With --break-dispatch it leaves the dispatches alone (exit 1).
import fs from 'node:fs';
import path from 'node:path';
import { createRepair } from './rule-v3.mjs';

const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const OUT = new URL('./cal/br1-synth/', import.meta.url);
const breakDispatch = process.argv.includes('--break-dispatch');
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(SRC, 'interview60.timeline.json'), new URL('interview60.timeline.json', OUT));
const unq = (s) => JSON.parse(`"${s}"`);
const ref = createRepair();
const out = [];
let pending = null, inserted = 0, patched = 0;
for (const l of fs.readFileSync(path.join(SRC, 'natively_debug.log'), 'utf8').split('\n')) {
    let line = l;
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
    if (m && unq(m[3])) {
        const r = ref.onTranscript(unq(m[3]), m[2] === 'true', Date.parse(m[1]));
        out.push(line);
        if (r.restored) {
            const w = r.restored.join(' ');
            out.push(`${m[1]} [LOG] [DeepgramStreaming] boundary repair: restored "${w}" before "${unq(m[3]).slice(0, 40)}"`);
            inserted++;
            pending = { w, f2: unq(m[3]) };
        }
        continue;
    }
    if (pending && !breakDispatch && /\[Main\] dispatch: answer /.test(l)) {
        const head = pending.f2.slice(0, 20);
        if (line.includes(head)) { line = line.split(head).join(`${pending.w} ${head}`); patched++; }
        pending = null;
    }
    out.push(line);
}
fs.writeFileSync(new URL('natively_debug.log', OUT), out.join('\n'));
console.log(`synthetic run: ${inserted} repair lines inserted, ${patched} dispatches patched${breakDispatch ? ' (dispatches left alone)' : ''} -> ${OUT.pathname}`);
