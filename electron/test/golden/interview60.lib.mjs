/**
 * Shared helpers for the interview60 harness. Pure where possible so they can
 * be unit-tested; the run script, the metrics module and the report import them.
 */
import fs from 'node:fs';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nowIso = () => new Date().toISOString();

export function logSize(file) {
    try { return fs.statSync(file).size; } catch { return 0; }
}

/** Bytes [from, to) of a file as utf8; '' when the range is empty or the file is missing. */
export function logSince(file, from, to) {
    if (!fs.existsSync(file)) return '';
    const size = fs.statSync(file).size;
    const end = Math.min(to ?? size, size);
    if (end <= from) return '';
    const fd = fs.openSync(file, 'r');
    try {
        const buf = Buffer.alloc(end - from);
        fs.readSync(fd, buf, 0, buf.length, from);
        return buf.toString('utf8');
    } finally { fs.closeSync(fd); }
}

const norm = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));

/** Fraction of a's content words (len > 3) present in b. 0 when a has none. */
export function overlap(a, b) {
    const A = norm(a), B = norm(b);
    if (!A.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

/**
 * Poll a log file until every pattern has matched in the bytes appended after
 * fromOffset. Never throws: returns { ok, missing } so callers can report.
 */
export async function waitForLogLines(file, fromOffset, patterns, { timeoutMs = 90_000, pollMs = 500 } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const text = logSince(file, fromOffset);
        const missing = patterns.filter((p) => !p.test(text));
        if (!missing.length) return { ok: true, missing: [] };
        if (Date.now() >= deadline) return { ok: false, missing };
        await sleep(pollMs);
    }
}

/** Copy the named files into destDir (created), skipping ones that do not exist. Returns the copied names. */
export function snapshotRun(destDir, files) {
    fs.mkdirSync(destDir, { recursive: true });
    const copied = [];
    for (const f of files) {
        if (!fs.existsSync(f)) continue;
        fs.copyFileSync(f, path.join(destDir, path.basename(f)));
        copied.push(path.basename(f));
    }
    return copied;
}
