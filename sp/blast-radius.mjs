// THROWAWAY: the honest blast radius of BOTH changes together — original reconciler at a
// fixed 15s window vs the current one — over every Live dispatch in the after9 hour.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = path.join(ROOT, 'electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9');
const require = createRequire(import.meta.url);
const OLD = require(path.join(process.argv[2], 'questionReconcile.js'));
const NEW = require(path.join(process.argv[3], 'questionReconcile.js'));

const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
const speech = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
    if (!m) continue;
    let t; try { t = JSON.parse('"' + m[3] + '"'); } catch { t = m[3]; }
    if (t.trim()) speech.push({ text: t, at: Date.parse(m[1]), final: m[2] === 'true' });
}
const dispatch = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=live .*? question=("(?:[^"\\]|\\.)*")$/);
    if (m) dispatch.push({ at: Date.parse(m[1]), action: m[2], q: JSON.parse(m[3]) });
}
// OLD kept 40 entries; NEW keeps everything inside RECONCILE_MAX_WINDOW_MS.
const oldBuf = (t) => { const s = []; for (const x of speech) { if (x.at > t) break; s.push(x); if (s.length > 40) s.shift(); } return s; };
const newBuf = (t) => speech.filter((x) => x.at <= t && x.at >= t - NEW.RECONCILE_MAX_WINDOW_MS);

const tally = new Map();
let textChanged = 0;
for (const d of dispatch) {
    const a = OLD.reconcileLiveQuestion(d.q, oldBuf(d.at).filter((x) => x.at >= d.at - 15_000));
    const b = NEW.reconcileLiveQuestion(d.q, newBuf(d.at).filter((x) => x.at >= d.at - NEW.reconcileWindowMs(d.q)));
    const k = a.verdict + ' -> ' + b.verdict;
    tally.set(k, (tally.get(k) ?? 0) + 1);
    if (a.text !== b.text) { textChanged++; console.log('TEXT CHANGED: ' + JSON.stringify(a.text.slice(0, 60)) + '  =>  ' + JSON.stringify(b.text.slice(0, 60))); }
}
console.log('\nLive dispatches: ' + dispatch.length);
for (const [k, v] of [...tally].sort((x, y) => y[1] - x[1])) console.log('  ' + String(v).padStart(3) + '  ' + k);
console.log('\nDispatches whose ANSWERED TEXT changes: ' + textChanged);
