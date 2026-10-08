// Throwaway (scratchpad only): give the pass-record test's s50a block a folder to find without running from MAIN. The block
// resolves the s50a run folder from process.cwd(); this copies MAIN's folder (read-only on MAIN) under a scratch cwd in the
// temp directory, so a run with that cwd executes the four tests that a bare temp cwd skips. readdirSync + copyFileSync
// because fs.cpSync fails silently on this non-ASCII MAIN path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const rel = 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const src = path.join(MAIN, rel);
const dst = path.join(os.tmpdir(), 'hedge-gate-cwd-s50a', rel);
if (!fs.existsSync(src)) throw new Error(`no s50a run folder at ${src}`);
let n = 0, bytes = 0;
const walk = (s, d) => {
    fs.mkdirSync(d, { recursive: true });
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
        const sp = path.join(s, e.name), dp = path.join(d, e.name);
        if (e.isDirectory()) walk(sp, dp);
        else if (e.isFile()) { fs.copyFileSync(sp, dp); n++; bytes += fs.statSync(dp).size; }
    }
};
walk(src, dst);
console.log(`copied ${n} files, ${bytes} bytes, to ${dst}`);
