// THROWAWAY: what the CURRENT reconciler returns for the two field fixtures, so the tests
// assert real current behaviour for the regression and a real failure for the fix.
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { reconcileLiveQuestion } = require(path.join(process.argv[2], 'questionReconcile.js'));

const t0 = 1_000_000;
const sp = (text, dt, final = true) => ({ text, at: t0 + dt, final });

const L03_WINDOW = [
    sp("Let's talk about monitoring.", -27562),
    sp('Say you have 20 models in production owned by four different teams,', -22383),
    sp('and today each team watches its own dashboards by hand.', -19005),
    sp('Design me a monitoring setup that catches data drift,', -13794),
    sp('prediction drift, and plain infrastructure failures across all of them,', -10522),
    sp('and explain who gets paged for what, and how you would keep the false alarms low enough', -6199),
    sp('that people do not start ignoring it.', -4005),
];
const L03_CLAIM = 'Say you have twenty models in production, owned by four different teams, and today each team '
    + 'watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction '
    + 'drift, and plain infrastructure problems, tells you which team owns the alert, and keeps the false '
    + 'alarm rate low enough that people do not start ignoring it.';

console.log('L03 (genuine, must become match):', JSON.stringify(reconcileLiveQuestion(L03_CLAIM, L03_WINDOW), null, 0));
console.log();
console.log('after8 invented (must stay uncorroborated):', JSON.stringify(reconcileLiveQuestion(
    'How would you approach deploying multiple versions of the same model in one cluster?',
    [sp('How do you manage GPU resources across multiple teams', -8090), sp('sharing one cluster?', -6695)],
), null, 0));
