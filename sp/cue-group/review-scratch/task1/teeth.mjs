// Runs the EXACT new describe block (the + lines of the test hunk in the review diff, type-stripped) against each
// variant copy made by enum.mjs, through a minimal vitest shim. Answers: which cases fail on the old code (RED) and
// which mutants the new cases catch.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const diff = fs.readFileSync(path.join(WT, '.superpowers', 'sdd', '2026-09-30-cue-early-close', 'review-task1-e49886c..worktree.diff'), 'utf8').replace(/\r\n/g, '\n');
const part = diff.split(/^diff --git /m).find((p) => p.startsWith('a/electron/llm/verbalStreamFilter.test.ts'));
const block = part.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1)).join('\n');
const js = stripTypeScriptTypes(block);

function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a).filter((k) => a[k] !== undefined), kb = Object.keys(b).filter((k) => b[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
}
function makeExpect() {
    return (x) => ({
        toBe: (y) => { if (!Object.is(x, y)) throw new Error(`expected ${JSON.stringify(x)} to be ${JSON.stringify(y)}`); },
        toEqual: (y) => { if (!deepEqual(x, y)) throw new Error(`expected ${JSON.stringify(x)} to equal ${JSON.stringify(y)}`); },
        toBeGreaterThan: (y) => { if (!(x > y)) throw new Error(`expected ${x} > ${y}`); },
    });
}
const fmt = (tpl, row) => { const args = Array.isArray(row) ? [...row] : [row]; return tpl.replace(/%[sid]/g, () => String(args.shift())); };

async function runVariant(file) {
    const mod = await import(pathToFileURL(file).href);
    const tests = [];
    const it = (name, fn) => tests.push({ name, fn });
    it.each = (table) => (tpl, fn) => { for (const row of table) tests.push({ name: fmt(tpl, row), fn: () => (Array.isArray(row) ? fn(...row) : fn(row)) }); };
    const describe = (_name, fn) => fn();
    new Function('describe', 'it', 'expect', 'stripCueBlock', 'extractCues', js)(describe, it, makeExpect(), mod.stripCueBlock, mod.extractCues);
    const failed = [];
    for (const t of tests) { try { await t.fn(); } catch (e) { failed.push(`${t.name.slice(0, 110)}  <- ${e.message.slice(0, 120)}`); } }
    return { total: tests.length, failed };
}

const copies = path.join(HERE, 'copies');
for (const f of fs.readdirSync(copies).filter((f) => f.endsWith('.mts')).sort()) {
    const r = await runVariant(path.join(copies, f));
    console.log(`${f.padEnd(24)} ${r.total} cases, ${r.failed.length} failed`);
    for (const x of r.failed) console.log('    ' + x);
}
