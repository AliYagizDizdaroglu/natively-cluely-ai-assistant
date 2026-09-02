/**
 * GOLDEN SET CALIBRATION — run this before believing any result from run.mjs.
 *
 * Everything here answers one question: WOULD THIS CHECK NOTICE IF THE EFFECT
 * WERE ABSENT? On this project, hand-written checks have been wrong more often
 * than the models they were grading — a regex that used [^.] could not cross the
 * dot in "collections.OrderedDict"; a harness that dropped systemInstruction for
 * Gemma ran a whole suite with no system prompt and scored the result 0/3.
 * Both looked like model failures. Neither was.
 *
 *   1. reference solutions must PASS their own assertions
 *   2. negative controls must FAIL them
 *   3. the stdlib-offer detector must match real offers and reject mere tool use
 *   4. the notation detector must flag notation and pass clean prose
 *   5. rendered screenshots must be legible to the vision model
 *
 * Exit code 0 = the golden set can be trusted. Non-zero = fix the harness first.
 */
import { CODING } from './problems.coding.mjs';
import { VERBAL_CHECKS, NOTATION_CALIBRATION } from './problems.verbal.mjs';
import { OFFER_RE, detectsOffer, buildShots, CONTROL } from './run.mjs';
import { runPython, callTurn, userTurn, sleep } from './harness.mjs';

let ok = true;
const fail = (m) => { ok = false; console.log(`   FAIL  ${m}`); };
const pass = (m) => console.log(`   ok    ${m}`);

console.log('='.repeat(76));
console.log('GOLDEN SET CALIBRATION');
console.log('='.repeat(76));

// ── 1 + 2. probes ──────────────────────────────────────────────────────────
console.log('\n1/2. Reference must pass, negative must fail');
for (const p of CODING) {
  const ref = runPython(p.reference, p.tests, `${p.id}_ref`);
  const neg = runPython(p.negative, p.tests, `${p.id}_neg`);
  console.log(`  ${p.id} ${p.name} (LC${p.leetcode}, ${p.shots.length} shots)`);
  ref.pass ? pass('reference passes') : fail(`reference FAILS: ${ref.err}`);
  !neg.pass ? pass(`negative fails: ${(neg.err || '').slice(0, 56)}`)
            : fail('negative PASSES — probe cannot detect a shot-1-only answer');
}

// ── 3. stdlib-offer detector ───────────────────────────────────────────────
console.log('\n3. Offer detector separates "offers the option" from "uses the tool"');
const OFFER_POS = [
  'Python has collections.OrderedDict for this, but let me implement the mechanism directly.',
  'Python has heapq for this, but I will implement the mechanism directly.',
  'python has a deque for this, but let me build it out.',
];
const OFFER_NEG = [
  'I will use a hash map plus a doubly linked list to get O(1) operations.',
  '```python\nimport heapq\nclass KthLargest:\n    pass\n```',
  'The heap keeps the k largest values so add stays O(log k).',
  'Python is a good choice here because it is expressive.',
];
for (const s of OFFER_POS) {
  detectsOffer(s) ? pass(`matches: "${s.slice(0, 46)}..."`) : fail(`MISSES: "${s.slice(0, 46)}..."`);
}
for (const s of OFFER_NEG) {
  !detectsOffer(s) ? pass(`rejects: "${s.replace(/\n/g, ' ').slice(0, 46)}..."`)
                   : fail(`FALSE POSITIVE: "${s.replace(/\n/g, ' ').slice(0, 46)}..."`);
}

// ── 4. notation detector ───────────────────────────────────────────────────
console.log('\n4. Notation detector flags unspeakable text, passes clean prose');
for (const s of NOTATION_CALIBRATION.mustFlag) {
  const r = VERBAL_CHECKS.no_notation({ spoken: s });
  !r.ok ? pass(`flags (${r.detail}): "${s.slice(0, 40)}"`) : fail(`MISSES notation in: "${s}"`);
}
for (const s of NOTATION_CALIBRATION.mustPass) {
  const r = VERBAL_CHECKS.no_notation({ spoken: s });
  r.ok ? pass(`passes clean prose`) : fail(`FALSE POSITIVE on clean prose: ${r.detail}`);
}

// ── 5. screenshot legibility (needs the API) ───────────────────────────────
if (process.env.GEMINI_API_KEY && !process.env.GOLDEN_SKIP_VISION) {
  console.log('\n5. Rendered screenshots are legible to the vision model');
  try {
    const img = await CONTROL.build();
    const r = await callTurn({
      model: 'gemma-4-31b-it',
      contents: [userTurn([img], 'Read the two codes printed in this image. Reply with just the two codes.')],
      temperature: 0, maxOutputTokens: 200, thinkingLevel: 'MINIMAL',
    });
    const found = CONTROL.expect.filter((t) => r.text.includes(t));
    found.length === CONTROL.expect.length
      ? pass(`vision model read ${found.length}/${CONTROL.expect.length} control tokens`)
      : fail(`ILLEGIBLE — read ${found.length}/${CONTROL.expect.length}; every "model missed a shot" verdict would be a false negative`);
  } catch (e) {
    console.log(`   skip  vision control unavailable (${e.transient ? 'transient' : e.message.slice(0, 50)})`);
  }
  await sleep(1000);
} else {
  console.log('\n5. Screenshot legibility — SKIPPED (no GEMINI_API_KEY, or GOLDEN_SKIP_VISION set)');
}

console.log(`\n${'='.repeat(76)}`);
console.log(ok ? 'CALIBRATION PASSED — golden set results can be trusted.'
              : 'CALIBRATION FAILED — fix the harness before scoring any model.');
console.log('='.repeat(76));
process.exit(ok ? 0 : 1);
