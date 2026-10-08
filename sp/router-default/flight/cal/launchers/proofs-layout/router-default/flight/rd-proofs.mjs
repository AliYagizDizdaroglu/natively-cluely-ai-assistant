// LAB\flight\rd-proofs.mjs: the launcher's dist proofs, one command, printed into the launcher log before the run and after it
// (SP\flight-eq\eq-proofs.mjs re-pointed to the router-default hour; plan Task 18 step 2: "the sha256 of LiveRouterSession.js,
// routerArbiter.js and routeReader.js before and after the run, which must be equal").
//   node rd-proofs.mjs --root <MAIN, absolute> [--same-as-log <launcher log>]
// Prints the cue build's dist-proof output, then `RD MARKER <dist file> <needle> True|False` for the router markers, then
// `RD PROOFS <dist file> sha256 <64 hex>` for each of the three router dist files, and a final `RD PROOFS: ALL PASSED` (exit 0) or
// `RD PROOFS: FAILED (<names>)` (exit 1). `--same-as-log` (the proofs AFTER the run): each sha must equal the one printed after the
// log's LAST `=== DIST BEFORE THE RUN ===` banner; a change, or a missing line, fails the proofs.
// Usage error: exit 2. Writes nothing; no model call; MAIN is only read.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const usage = (m) => { console.log(`RD PROOFS usage error: ${m}`); console.log('usage: node rd-proofs.mjs --root <MAIN, absolute> [--same-as-log <launcher log>]'); process.exit(2); };
const known = new Set(['--root', '--same-as-log']);
argv.forEach((a, i) => { if (a.startsWith('--') && !known.has(a)) usage(`unknown option ${a}`); if (!a.startsWith('--') && !known.has(argv[i - 1])) usage(`unexpected argument ${a}`); });
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const root = opt('--root');
if (!root || root.startsWith('--')) usage('--root is required');
if (!path.isAbsolute(root)) usage(`--root must be an absolute path (dist-proof.mjs fails on a relative root): ${root}`);
if (!fs.existsSync(path.join(root, 'dist-electron'))) usage(`no dist-electron under ${root}`);
const sameAs = opt('--same-as-log');
if (argv.includes('--same-as-log') && (!sameAs || sameAs.startsWith('--'))) usage('--same-as-log needs a file');

const failed = [];
const echo = (text) => { for (const l of text.split(/\r?\n/)) if (l.length) console.log(l); };

// 1. the cue build: dist-proof.mjs exactly as the guard runs it (the cues stay on the pipeline path)
const dp = spawnSync(process.execPath, [path.join(SP, 'dist-proof.mjs'), '--root', root, '--expect', 'combined', '--prefix-count', '3', '--offers-marker', 'offers block before the spoken answer'], { encoding: 'utf8', cwd: root, timeout: 120000 });
echo(dp.stdout ?? ''); echo(dp.stderr ?? '');
if (dp.error || dp.status !== 0 || !(dp.stdout ?? '').includes('DIST PROOF: THE COMBINED BUILD, every marker as expected')) failed.push('dist-proof');

// 2. the router markers in the built dist
const D = path.join(root, 'dist-electron', 'electron');
const MARKERS = [['main', '[Router] flag NATIVELY_LIVE_ROUTER='], ['audio/LiveRouterSession', 'ROUTER_SHAS_OK'], ['audio/LiveRouterSession', 'gemini-3.8-live']];
for (const [rel, needle] of MARKERS) {
    const f = path.join(D, `${rel}.js`);
    const found = fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(needle);
    console.log(`RD MARKER dist-electron/electron/${rel}.js ${needle} ${found ? 'True' : 'False'}`);
    if (!found) failed.push(`marker ${rel} ${needle}`);
}

// 3. the sha256 of the three router dist files
const FILES = ['audio/LiveRouterSession', 'services/routerArbiter', 'services/routeReader'];
const shas = {};
for (const rel of FILES) {
    const f = path.join(D, `${rel}.js`);
    if (!fs.existsSync(f)) { console.log(`RD PROOFS ${rel}.js MISSING`); failed.push(`${rel}.js missing`); continue; }
    shas[rel] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    console.log(`RD PROOFS ${rel}.js sha256 ${shas[rel]}`);
}

// 4. after the run: the dist that flew is the dist that was proven
if (sameAs) {
    let text = '';
    let i = -1;
    try { text = fs.readFileSync(sameAs, 'latin1'); i = text.lastIndexOf('=== DIST BEFORE THE RUN ==='); } catch { i = -1; }
    // fix1 M1: the launcher appends THIS run's own output to the same log (after its AFTER banner), so the before-search must stop at that banner,
    // else a before section that lacks a file's line would be compared with the after line itself and pass
    let section = i >= 0 ? text.slice(i) : '';
    const j = section.indexOf('=== DIST AFTER THE RUN ===');
    if (j >= 0) section = section.slice(0, j);
    for (const rel of FILES) {
        const before = i >= 0 ? new RegExp(`RD PROOFS ${rel}\\.js sha256 ([0-9a-f]{64})`).exec(section)?.[1] ?? null : null;
        if (!before) { console.log(`RD PROOFS ${rel}.js sha before the run: NOT FOUND in ${sameAs}`); failed.push(`sha-before-not-found ${rel}`); }
        else { const same = before === shas[rel]; console.log(`RD PROOFS ${rel}.js sha256 unchanged since the run started: ${same ? 'yes' : `NO (${before.slice(0, 12)} before, ${(shas[rel] ?? 'missing').slice(0, 12)} after)`}`); if (!same) failed.push(`sha-changed ${rel}`); }
    }
}
console.log(failed.length ? `RD PROOFS: FAILED (${failed.join(', ')})` : 'RD PROOFS: ALL PASSED');
process.exit(failed.length ? 1 : 0);
