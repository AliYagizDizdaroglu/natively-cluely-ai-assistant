// Re-review 2 probe (throwaway, read-only): is i1-retry-trace.mjs's runOld the LITERAL pre-Task-4 loop,
// and is its runNew the runner's loop "copied verbatim"? Token-level diff after stripping // comments,
// between (a) the harness's function bodies and (b) the loops sliced out of the real files.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const rd = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const between = (t, a, b, label) => { const i = t.indexOf(a); const j = t.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`cannot cut ${label}`); return t.slice(i, j + b.length); };
const strip = (s) => s.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
const toks = (s) => strip(s).match(/`[^`]*`|'[^']*'|[A-Za-z_$][\w$]*|\d+|\S/g);

const H = rd(`${SP}/i1-retry-trace.mjs`);
const RUNNER = rd(`${SP}/gemma-answers.mjs`);
const OLDF = rd(`${HERE}/gen/gemma-answers.mjs`);
const pairs = [
    ['harness runOld  vs literal pre-Task-4 loop',
        between(H, 'let r, lastErr, dropRetried = false;\n    for', "{ transientError: lastErr } : { spoken: r.spoken, finish: r.finish, cutRetried: dropRetried };", 'runOld'),
        between(OLDF, 'let r, lastErr, dropRetried = false;', "store[item.id] = { ...item, model: ARM, transientError: lastErr };", 'old loop')],
    ['harness runNew  vs current runner loop',
        between(H, 'let r, lastErr, dropRetried = false, attempts = 0;', "{ spoken: r.spoken, finish: r.finish, cutRetried: dropRetried };", 'runNew'),
        between(RUNNER, 'let r, lastErr, dropRetried = false, attempts = 0;', "store[item.id] = { ...item, model: ARM, transientError: lastErr, cutRetried: dropRetried };", 'new loop')],
];
function diff(a, b) {   // LCS token diff, fine for ~300 tokens
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0, cur = null;
    const push = (k, t) => { if (!cur || cur.k !== k) { cur = { k, t: [] }; out.push(cur); } cur.t.push(t); };
    while (i < n && j < m) { if (a[i] === b[j]) { push('=', a[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('-', a[i++]); else push('+', b[j++]); }
    while (i < n) push('-', a[i++]); while (j < m) push('+', b[j++]);
    return out;
}
for (const [label, h, lit] of pairs) {
    const d = diff(toks(h), toks(lit));
    const changed = d.filter((x) => x.k !== '=');
    console.log(`\n=== ${label}: ${toks(h).length} vs ${toks(lit).length} tokens; ${changed.length} differing runs ===`);
    d.forEach((x, idx) => {
        if (x.k === '=') return;
        const ctx = (d[idx - 1]?.k === '=' ? d[idx - 1].t.slice(-4).join(' ') : '');
        console.log(`  ${x.k === '-' ? 'harness only ' : 'literal only '}| after "${ctx}": ${x.t.join(' ').slice(0, 160)}`);
    });
}
