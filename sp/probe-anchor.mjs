// THROWAWAY: what the anchor is on a join-match, and whether a trailing fragmentary interim
// makes the OLD behaviour 'unverifiable' (so the new test pins the real promotion).
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { reconcileLiveQuestion } = require(path.join(process.argv[2], 'questionReconcile.js'));

const t0 = 1_000_000;
const sp = (text, dt, final = true) => ({ text, at: t0 + dt, final });

const L03 = [
    sp("Let's talk about monitoring.", -27562),
    sp('Say you have 20 models in production owned by four different teams,', -22383),
    sp('and today each team watches its own dashboards by hand.', -19005),
    sp('Design me a monitoring setup that catches data drift,', -13794),
    sp('prediction drift, and plain infrastructure failures across all of them,', -10522),
    sp('and explain who gets paged for what, and how you would keep the false alarms low enough', -6199),
    sp('that people do not start ignoring it.', -4005),
];
const CLAIM = 'Say you have twenty models in production, owned by four different teams, and today each team '
    + 'watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction '
    + 'drift, and plain infrastructure problems, tells you which team owns the alert, and keeps the false '
    + 'alarm rate low enough that people do not start ignoring it.';

console.log('join-match anchor:', JSON.stringify(reconcileLiveQuestion(CLAIM, L03).anchor));

// A trailing fragmentary interim, as Deepgram emits mid-clause. latest looksFragmentary, so
// without the join this is 'unverifiable' (held), not 'replaced'.
const withTail = [...L03, sp('and how you would keep', -1200, false)];
console.log('with fragmentary tail:', JSON.stringify(reconcileLiveQuestion(CLAIM, withTail)));
