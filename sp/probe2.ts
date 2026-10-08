import { createLiveHold } from './liveHold.ts';

// Mirror of main.ts dispatchDetection's hold branch + reconcileAndDispatchLive,
// with reconcileLiveQuestion always returning 'unverifiable' (empty STT window
// — the exact condition R37's hold exists for).
let dispatchLines = 0;
let resolves = 0;
const hold = createLiveHold<{ q: string }>({
  holdMs: 20,
  onResolve: (held) => { resolves++; dispatchDetection(held); },
});
function dispatchDetection(d: { q: string }) {
  const verdict = 'match';            // fresh reconcile, STT still silent
  if (verdict === 'unverifiable') {          // liveMode !== 'off' && source === 'live'
    const previous = hold.offer(d);
    if (previous) dispatchLines++;           // the "drop ... duplicateOf=live" log
    return;
  }
  dispatchLines++;                           // would-be [Main] dispatch: line
}
dispatchDetection({ q: 'held question' });
setTimeout(() => {
  console.log(`after 250ms with holdMs=20: resolves=${resolves} dispatchLines=${dispatchLines}`);
  hold.cancel();
}, 250);
