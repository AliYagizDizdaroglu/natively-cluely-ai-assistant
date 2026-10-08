const qr = require('./qr.cjs');
const { reconcileWindowMs, reconcileLiveQuestion, overlap, sameAnchor } = qr;

const t0 = 1000000;
const sp = (text, dt, final = true) => ({ text, at: t0 + dt, final });

function hr(s) { console.log('\n===== ' + s + ' ====='); }

// ---------- 1. window boundaries ----------
hr('1. reconcileWindowMs boundaries');
for (let n = 1; n <= 200; n++) {
  const claim = new Array(n).fill('word').join(' ');
  const w = reconcileWindowMs(claim);
  if (n === 1 || w !== reconcileWindowMs(new Array(n - 1).fill('word').join(' '))) {
    console.log(`  n=${n} words -> ${w} ms`);
  }
}
console.log('  first n leaving the 15s floor / first n at the 60s cap shown above');

// ---------- 2. L03 fixture ----------
hr('2. L03 claim from the test');
const L03_CLAIM = 'Say you have twenty models in production, owned by four different teams, and today each team '
  + 'watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction '
  + 'drift, and plain infrastructure problems, tells you which team owns the alert, and keeps the false '
  + 'alarm rate low enough that people do not start ignoring it.';
const L03_DOC = 'Let\'s talk about monitoring. Say you have twenty models in production, owned by four different teams, '
  + 'and today each team watches its own dashboards by hand. Design me a monitoring setup that catches data '
  + 'drift, prediction drift, and plain infrastructure problems, tells you which team owns the alert, and '
  + 'keeps the false alarm rate low enough that people do not start ignoring it.';
console.log('  L03 claim tokens =', (L03_CLAIM.match(/[A-Za-z0-9']+/g) || []).length, ' window =', reconcileWindowMs(L03_CLAIM));
console.log('  L03 doc-version tokens =', (L03_DOC.match(/[A-Za-z0-9']+/g) || []).length, ' window =', reconcileWindowMs(L03_DOC));

const L03_WINDOW = [
  sp("Let's talk about monitoring.", -27562),
  sp('Say you have 20 models in production owned by four different teams,', -22383),
  sp('and today each team watches its own dashboards by hand.', -19005),
  sp('Design me a monitoring setup that catches data drift,', -13794),
  sp('prediction drift, and plain infrastructure failures across all of them,', -10522),
  sp('and explain who gets paged for what, and how you would keep the false alarms low enough', -6199),
  sp('that people do not start ignoring it.', -4005),
];
const r = reconcileLiveQuestion(L03_CLAIM, L03_WINDOW);
console.log('  verdict =', r.verdict, ' score =', r.score.toFixed(4));
console.log('  ANCHOR CHOSEN =', JSON.stringify(r.anchor));
console.log('  per-line overlap(claim, line):');
for (const l of L03_WINDOW) console.log('    ', overlap(L03_CLAIM, l.text).toFixed(4), JSON.stringify(l.text.slice(0, 60)));
console.log('  join score =', overlap(L03_CLAIM, L03_WINDOW.map(x => x.text).join(' ')).toFixed(4));

// ---------- 3. the join-guard fixture's own window ----------
hr('3. join-guard fixture (after8 07:36:26) — what window does its claim get?');
const INVENTED = 'How would you approach deploying multiple versions of the same model in one cluster?';
console.log('  claim tokens =', (INVENTED.match(/[A-Za-z0-9']+/g) || []).length, ' window =', reconcileWindowMs(INVENTED), '<-- the 15s FLOOR');
const g = reconcileLiveQuestion(INVENTED, [
  sp('How do you manage GPU resources across multiple teams', -8090),
  sp('sharing one cluster?', -6695),
]);
console.log('  verdict =', g.verdict, ' score =', g.score.toFixed(4));
console.log('  join score =', overlap(INVENTED, 'How do you manage GPU resources across multiple teams sharing one cluster?').toFixed(4));

// ---------- 4. THE NEW RISK: a LONG invented claim against a WIDE real window ----------
hr('4. long invented claim vs the REAL L03 transcript window (wide window path)');
// Same domain, same interview, but a question the interviewer never asked.
const LONG_INVENTED = 'You have twenty models running in production across four teams and each team keeps its own '
  + 'dashboards. Walk me through how you would design the feature store for those models, how you would keep '
  + 'training and serving features consistent, and how you would handle backfills when a feature definition '
  + 'changes so that people do not have to rebuild everything by hand.';
console.log('  invented tokens =', (LONG_INVENTED.match(/[A-Za-z0-9']+/g) || []).length, ' window =', reconcileWindowMs(LONG_INVENTED));
const bad = reconcileLiveQuestion(LONG_INVENTED, L03_WINDOW);
console.log('  verdict =', bad.verdict, ' score =', bad.score.toFixed(4));
console.log('  ANCHOR =', JSON.stringify(bad.anchor));
console.log('  join score =', overlap(LONG_INVENTED, L03_WINDOW.map(x => x.text).join(' ')).toFixed(4));
console.log('  best single-line score =', Math.max(...L03_WINDOW.map(l => overlap(LONG_INVENTED, l.text))).toFixed(4));

// ---------- 5. wide window spanning TWO questions ----------
hr('5. wide window that reaches back into the PREVIOUS question');
// A 45s window (long claim) now includes the tail of the previous Q&A.
const PREV = [
  sp('So before we move on, how do you decide when a model needs retraining?', -44000),
  sp('Right, that makes sense.', -40000),
  sp('Okay.', -34000),
];
const wide = PREV.concat(L03_WINDOW);
const r5 = reconcileLiveQuestion(L03_CLAIM, wide);
console.log('  verdict =', r5.verdict, ' score =', r5.score.toFixed(4));
console.log('  ANCHOR =', JSON.stringify(r5.anchor));

// ---------- 6. anchor soundness for sameAnchor ----------
hr('6. sameAnchor consequences of the join anchor');
const anchor = r.anchor;
console.log('  join-match anchor =', JSON.stringify(anchor));
console.log('  sameAnchor(anchor, "Let\'s talk about monitoring.") =', sameAnchor(anchor, "Let's talk about monitoring."));
console.log('  sameAnchor(anchor, "that people do not start ignoring it.") =', sameAnchor(anchor, 'that people do not start ignoring it.'));
// A whisper detection anchored to a DIFFERENT line of the SAME question:
for (const l of L03_WINDOW) {
  console.log('   sameAnchor(joinAnchor, ' + JSON.stringify(l.text.slice(0, 45)) + ') =', sameAnchor(anchor, l.text));
}

// ---------- 7. empty / single-line / whitespace ----------
hr('7. degenerate inputs');
console.log('  reconcileWindowMs("") =', reconcileWindowMs(''));
console.log('  reconcileWindowMs("   ") =', reconcileWindowMs('   '));
console.log('  reconcileLiveQuestion(long, []) =', JSON.stringify(reconcileLiveQuestion(L03_CLAIM, [])));
const oneLine = reconcileLiveQuestion(L03_CLAIM, [sp('that people do not start ignoring it.', -4000)]);
console.log('  single-line window (the after9 failure shape) verdict =', oneLine.verdict, 'text =', JSON.stringify(oneLine.text.slice(0, 50)));
