### Task 6: Harness — cue checks, prompt variants, the `--cues`/`--no-cues` arms, the metrics row

**Files:**
- Modify: `electron/test/golden/problems.verbal.mjs` (four checks + `CUES_CALIBRATION`)
- Create: `electron/test/golden/cueArm.mjs`
- Modify: `electron/test/golden/interview60.answers.mjs` (imports ~26–34; key read ~32–34; flags after the `--captured` block ~89; both filter chains at 167 and 239; the captured validation ~272–279; the per-item call ~288; the checks ~303–305; the summary loop ~329)
- Modify: `electron/test/golden/interview60.metrics.mjs` (after the budget parse ~112; the return ~392; `GATE` after the `length` row ~479)
- Test: `electron/test/golden/problems.verbal.cues.test.ts` (new), `electron/test/golden/cueArm.test.ts` (new), `electron/test/golden/interview60.metrics.test.ts`

**Interfaces:**
- Consumes: `P.CUE_RULE`, `P.CUES_SENTINEL`, `P.CUE_MAX_LINES`, `P.CUE_MAX_WORDS`, `P.SPOKEN_LENGTH_AND_DEPTH` from the built `dist-electron/electron/llm/prompts.js`; `stripCueBlock` from the built `verbalStreamFilter.js` (Tasks 1–2, built by `npm run build:electron`).
- Produces: `VERBAL_CHECKS.cues_present/cues_wellformed/cues_grounded/cues_clean(ctx)` with `ctx = { spoken, cues, cuesSentinel, cueMaxLines, cueMaxWords, ... }`; `cueArm.mjs`: `carriesCueRule(system, rule)`, `withCueRule(system, rule, anchor) → string | null`, `withoutCueRule(system, rule)`; `answers.mjs` flags `--cues` and `--no-cues` (each needs `--captured` and `--tag`), record field `cues: string[]`; metrics field `cueBlocks: { n, present, wellformed }` and GATE row key `cueBlocks`.

- [ ] **Step 1: Write the failing tests**

Create `electron/test/golden/problems.verbal.cues.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// @ts-ignore — untyped ESM harness module
import { VERBAL_CHECKS, CUES_CALIBRATION } from './problems.verbal.mjs';

/** Cue mode (spec 2026-09-20 §8): mechanical shape checks on the cue block, calibrated on known cases. */
const ctx = (over: Record<string, unknown>) => ({
    spoken: 'Ten million vectors take about 30 gigabytes; int8 cuts it to 7.5.',
    cues: ['30 GB in float32', 'int8 to 7.5 GB'],
    cuesSentinel: '__CUES__', cueMaxLines: 5, cueMaxWords: 8,
    ...over,
});

describe('cue checks', () => {
    it('present: a block with at least one line; absent, null or empty fails', () => {
        expect(VERBAL_CHECKS.cues_present(ctx({})).ok).toBe(true);
        expect(VERBAL_CHECKS.cues_present(ctx({ cues: [] })).ok).toBe(false);
        expect(VERBAL_CHECKS.cues_present(ctx({ cues: null })).ok).toBe(false);
    });
    it('wellformed: 1 to 5 lines, at most 8 words, no question, never "you"', () => {
        for (const cues of CUES_CALIBRATION.wellformed.mustFlag) expect(VERBAL_CHECKS.cues_wellformed(ctx({ cues })).ok, JSON.stringify(cues)).toBe(false);
        for (const cues of CUES_CALIBRATION.wellformed.mustPass) expect(VERBAL_CHECKS.cues_wellformed(ctx({ cues })).ok, JSON.stringify(cues)).toBe(true);
    });
    it('grounded: every number in a cue also appears in the prose', () => {
        for (const c of CUES_CALIBRATION.grounded.mustFlag) expect(VERBAL_CHECKS.cues_grounded(ctx(c)).ok, JSON.stringify(c)).toBe(false);
        for (const c of CUES_CALIBRATION.grounded.mustPass) expect(VERBAL_CHECKS.cues_grounded(ctx(c)).ok, JSON.stringify(c)).toBe(true);
    });
    it('clean: the sentinel never reaches the prose, not even split', () => {
        expect(VERBAL_CHECKS.cues_clean(ctx({})).ok).toBe(true);
        expect(VERBAL_CHECKS.cues_clean(ctx({ spoken: '__CUES__ leaked into the answer' })).ok).toBe(false);
        expect(VERBAL_CHECKS.cues_clean(ctx({ spoken: 'leaked __CUES' })).ok).toBe(false);
    });
});
```

Create `electron/test/golden/cueArm.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// @ts-ignore — untyped ESM harness module
import { carriesCueRule, withCueRule, withoutCueRule } from './cueArm.mjs';
import { CUE_RULE, SPOKEN_LENGTH_AND_DEPTH, VERBAL_WHAT_TO_ANSWER_PROMPT } from '../../llm/prompts';

/**
 * The bench replays captured bytes with the cue rule inserted exactly where the app puts it
 * (a pre-cue hour's treatment) or removed byte for byte (a cue hour's control). The request
 * appends a notes block and a language line AFTER the prompt, so "append at the end" would
 * bench a different position from the shipped one.
 */
const TAIL = '\n\n<user_context>notes</user_context>\nAnswer in English.';
const PRE = `${VERBAL_WHAT_TO_ANSWER_PROMPT.split(CUE_RULE).join('')}${TAIL}`;   // an s50m-era capture
const POST = `${VERBAL_WHAT_TO_ANSWER_PROMPT}${TAIL}`;                            // a cue-era capture

describe('cue-rule variants of a captured system prompt', () => {
    it('inserts the rule directly after the structured rule, once, and leaves the tail alone', () => {
        const withRule = withCueRule(PRE, CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)!;
        expect(withRule.indexOf(CUE_RULE)).toBe(PRE.indexOf(SPOKEN_LENGTH_AND_DEPTH) + SPOKEN_LENGTH_AND_DEPTH.length);
        expect(withRule.endsWith(TAIL)).toBe(true);
        expect(withRule.split(CUE_RULE).length - 1).toBe(1);
        expect(withRule).toBe(POST);
    });
    it('strip then insert round-trips a cue-era capture byte for byte', () => {
        expect(carriesCueRule(POST, CUE_RULE)).toBe(true);
        expect(carriesCueRule(PRE, CUE_RULE)).toBe(false);
        expect(withoutCueRule(POST, CUE_RULE)).toBe(PRE);
        expect(withCueRule(withoutCueRule(POST, CUE_RULE), CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)).toBe(POST);
    });
    it('refuses to insert when the anchor is missing, and never doubles the rule', () => {
        expect(withCueRule('some other system prompt', CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)).toBeNull();
        expect(withCueRule(POST, CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)).toBe(POST);
    });
});
```

In `electron/test/golden/interview60.metrics.test.ts`: (1) in the synthetic `dbgLines` array, directly after the three `[Answer] budget:` lines (~277–279), add

```ts
            // Cue mode (spec 2026-09-20): one cues line per verbal answer — a well-formed block and
            // an answer the model opened without one (the row must surface the miss).
            `${iso(T0 + 1100950)} [LOG] [Answer] cues: ["thirty gigabytes in float32","int8, then shard"]`,
            `${iso(T0 + 1110950)} [LOG] [Answer] cues: []`,
```

(2) change the "three newest rows" case (~602) to

```ts
    it('the four newest rows are the last four, so index-based rendering stays aligned', () => {
        expect(GATE.slice(-4).map((g) => g.key)).toEqual(['pinned', 'budget', 'length', 'cueBlocks']);
    });
```

(3) append inside the same `describe` that holds the budget row tests:

```ts
    it('cueBlocks — counts the blocks, and the row fails when one answer opened without one', () => {
        expect(m.cueBlocks).toEqual({ n: 2, present: 1, wellformed: 1 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Cue block above every spoken answer');
        expect(row.pass).toBe(false);
        expect(row.value).toBe('1/2 present, 1 well-formed');
    });

    it('cueBlocks gate row pass rule: logged for the delivered answers, every block present and well-formed', () => {
        const row = GATE.find((g) => g.key === 'cueBlocks')!;
        const base = { cueBlocks: { n: 10, present: 10, wellformed: 10 }, delivered: 10 } as any;
        expect(row.pass(base)).toBe(true);
        expect(row.pass({ ...base, cueBlocks: { n: 10, present: 9, wellformed: 9 } })).toBe(false);
        expect(row.pass({ ...base, cueBlocks: { n: 10, present: 10, wellformed: 9 } })).toBe(false);
        // coding routes emit no cues line, hence the same 0.9 tolerance as the budget row
        expect(row.pass({ ...base, cueBlocks: { n: 9, present: 9, wellformed: 9 } })).toBe(true);
        expect(row.pass({ ...base, cueBlocks: { n: 8, present: 8, wellformed: 8 } })).toBe(false);
        expect(row.pass({ ...base, cueBlocks: { n: 0, present: 0, wellformed: 0 } })).toBe(false);
        expect(row.show({ cueBlocks: { n: 0, present: 0, wellformed: 0 } })).toBe('not logged');
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run electron/test/golden/problems.verbal.cues.test.ts electron/test/golden/cueArm.test.ts electron/test/golden/interview60.metrics.test.ts`
Expected: FAIL — the checks and `cueArm.mjs` do not exist; `m.cueBlocks` is undefined; the last-rows case sees three rows.

- [ ] **Step 3: Implement the checks and calibration**

In `electron/test/golden/problems.verbal.mjs`, add inside `VERBAL_CHECKS` after `ends_cleanly`:

```js
  /** Cue mode (spec 2026-09-20): the answer opened with a cue block — one line per part. */
  cues_present: ({ cues }) => ({ ok: Array.isArray(cues) && cues.length > 0, detail: `${Array.isArray(cues) ? cues.length : 0} cues` }),

  /** 1 to cueMaxLines lines, each at most cueMaxWords words, labels not questions, never addressing the listener. */
  cues_wellformed: ({ cues, cueMaxLines, cueMaxWords }) => {
    const list = Array.isArray(cues) ? cues : [];
    const bad = list.filter((c) => {
      const t = String(c).trim();
      return !t || t.includes('?') || /\byou\b/i.test(t) || (t.match(/\S+/g) || []).length > cueMaxWords;
    });
    return { ok: list.length >= 1 && list.length <= cueMaxLines && bad.length === 0, detail: `${list.length} cues, ${bad.length} malformed` };
  },

  /** Every number in a cue also appears in the prose — a cue must not promise a figure the answer never says. */
  cues_grounded: ({ cues, spoken }) => {
    const nums = (s) => (String(s).match(/\d+(?:[.,]\d+)*/g) || []);
    const said = new Set(nums(spoken));
    const missing = (Array.isArray(cues) ? cues : []).flatMap(nums).filter((n) => !said.has(n));
    return { ok: missing.length === 0, detail: missing.length ? `numbers not in the prose: ${missing.join(', ')}` : 'grounded' };
  },

  /** The cue sentinel must never reach the listener — same guard as sentinel_clean for __MORE__. */
  cues_clean: ({ spoken, cuesSentinel }) => ({
    ok: !spoken.includes(cuesSentinel) && !/_{2}CUES/.test(spoken),
    detail: 'no __CUES__ in spoken text',
  }),
```

and after `NOTATION_CALIBRATION`:

```js
/** Calibration for the cue checks: each must flag these and pass those. */
export const CUES_CALIBRATION = {
  wellformed: {
    mustFlag: [
      [],                                                       // no line at all
      ['a', 'b', 'c', 'd', 'e', 'f'],                           // six lines
      ['one two three four five six seven eight nine'],          // nine words
      ['would you shard by tenant?'],                            // a question
      ['tell you about the registry'],                           // addresses the listener
      [''],                                                      // an empty line
    ],
    mustPass: [
      ['30 GB in float32'],
      ['ingest: streaming and batch', 'store: Delta offline, Redis online', 'serve: point lookups under 10 ms', 'consistency: same transforms, point-in-time joins'],
      ['Redis: rich types, persistence, replication'],
    ],
  },
  grounded: {
    mustFlag: [{ cues: ['30 GB', 'int8 to 7.5 GB'], spoken: 'About thirty gigabytes, and int eight halves it.' }],
    mustPass: [
      { cues: ['30 GB', 'int8 to 7.5 GB'], spoken: 'Roughly 30 gigabytes; int8 takes it to 7.5.' },
      { cues: ['same transforms both sides'], spoken: 'Reuse the same transforms in training and serving.' },
    ],
  },
};
```

- [ ] **Step 4: Create `electron/test/golden/cueArm.mjs`**

```js
/**
 * Cue-rule variants of a captured system prompt, for the offline arms (cue mode, spec
 * 2026-09-20 §8). Pure string functions, so interview60.answers.mjs stays a runner and these
 * stay tested without a key or a build.
 */

/** Whether the captured system prompt already carries the shipped rule, byte for byte. */
export const carriesCueRule = (system, rule) => system.includes(rule);

/**
 * The rule inserted where the app puts it: directly after the structured rule (the tail of
 * SPOKEN_LENGTH_AND_DEPTH), before the notes block and the language line the request appends
 * after the prompt. Returns null when the anchor is missing — the caller refuses rather than
 * appending somewhere else, which would bench a different position from the shipped one. A
 * prompt that already carries the rule is returned unchanged, never doubled.
 */
export function withCueRule(system, rule, anchor) {
    if (carriesCueRule(system, rule)) return system;
    const at = system.indexOf(anchor);
    if (at === -1) return null;
    const end = at + anchor.length;
    return system.slice(0, end) + rule + system.slice(end);
}

/** The rule removed, byte for byte — the pre-cue bytes of a cue hour. */
export const withoutCueRule = (system, rule) => system.split(rule).join('');
```

- [ ] **Step 5: Wire `interview60.answers.mjs`**

(a) Imports: add `stripCueBlock` to the destructuring from `verbalStreamFilter.js` (line 30–31), and add `import { carriesCueRule, withCueRule, withoutCueRule } from './cueArm.mjs';` after the `VERBAL_CHECKS` import.

(b) Replace the two key lines (32–34) with:

```js
// Keys come from the environment first — a launcher can run `node --env-file=<path>` for a
// checkout that has no .env, which is how the cue bench runs from the worktree against MAIN's
// key — then from .env beside package.json. Never printed.
const envFile = () => { try { return fs.readFileSync(path.join(PROJ, '.env'), 'utf8'); } catch { return ''; } };
const KEY = process.env.GEMINI_API_KEY?.trim() || (envFile().match(/^GEMINI_API_KEY=(.+)$/m) ?? [])[1]?.trim();
if (!KEY) { console.error('GEMINI_API_KEY: not in the environment and no .env beside package.json'); process.exit(2); }
// Read only when a Groq arm runs, so a Gemini arm never needs the key. Never printed.
const groqKey = () => process.env.GROQ_API_KEY?.trim() || (envFile().match(/^GROQ_API_KEY=(.+)$/m) ?? [])[1]?.trim();
```

(c) After the `--captured` exclusivity block (ends line ~89) add:

```js
// --cues / --no-cues (cue mode, spec 2026-09-20 §8): the captured bytes with the shipped
// CUE_RULE inserted where the app puts it (the bench treatment on a pre-cue hour) or removed
// byte for byte (a cue hour's same-bytes control). Each needs --captured and --tag: the plain
// arm sends the shipped prompt, rule included, so --cues on it would double the rule.
const CUES_ADD = process.argv.includes('--cues');
const CUES_STRIP = process.argv.includes('--no-cues');
if (CUES_ADD && CUES_STRIP) { console.error('--cues and --no-cues are exclusive'); process.exit(2); }
if ((CUES_ADD || CUES_STRIP) && !CAPTURED) { console.error(`${CUES_ADD ? '--cues' : '--no-cues'} needs --captured: the plain arm sends the shipped prompt, which already carries the cue rule`); process.exit(2); }
if ((CUES_ADD || CUES_STRIP) && !TAG) { console.error(`${CUES_ADD ? '--cues' : '--no-cues'} needs --tag <name>`); process.exit(2); }
if ((CUES_ADD || CUES_STRIP) && IS_GROQ) { console.error('--cues/--no-cues replay captured Gemini bytes; the Groq arms have no captured prompt'); process.exit(2); }
const cueVariant = (captured) => !captured ? captured
    : CUES_ADD ? { ...captured, system: withCueRule(captured.system, P.CUE_RULE, P.SPOKEN_LENGTH_AND_DEPTH) }
    : CUES_STRIP ? { ...captured, system: withoutCueRule(captured.system, P.CUE_RULE) }
    : captured;
```

(d) Both filter chains (lines 167 and 239): replace

```js
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
```

with

```js
    let spoken = '', offers = null, cues = [];
    // stripCueBlock innermost, exactly as WhatToAnswerLLM composes it (cue mode).
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(stripCueBlock(gen(), (c) => { cues = c; }))), (o) => { offers = o; }))) spoken += p;
```

and add `cues,` to both `return { spoken, offers, ... }` objects (after `offers`).

(e) In the `if (CAPTURED) { ... }` validation block, after the `uncaptured` check (line ~278) add:

```js
    if (CUES_ADD || CUES_STRIP) {
        for (const id of ids) {
            const has = carriesCueRule(CAPTURED[id].system, P.CUE_RULE);
            if (CUES_ADD && has) { console.error(`--cues: the captured prompt for ${id} already carries the cue rule — this hour flew with cues; its control is --no-cues`); process.exit(2); }
            if (CUES_STRIP && !has) { console.error(`--no-cues: the captured prompt for ${id} carries no cue rule — this hour flew without cues; the plain captured arm already is the control`); process.exit(2); }
            if (CUES_ADD && withCueRule(CAPTURED[id].system, P.CUE_RULE, P.SPOKEN_LENGTH_AND_DEPTH) === null) { console.error(`--cues: the captured prompt for ${id} has no structured rule to anchor the cue rule to`); process.exit(2); }
        }
    }
```

(f) The startup line (~281): append before the final `${todo.length} spoken questions` the segment `${CUES_ADD ? '  cues=inserted into the captured prompt' : CUES_STRIP ? '  cues=stripped from the captured prompt' : ''}`.

(g) The per-item call (~288): `r = await answerStreamed(item.q, cueVariant(CAPTURED?.[item.id] ?? null));`

(h) The checks (~303–304) become:

```js
        // Cue checks apply only where the prompt that was sent carries the rule: the shipped
        // prompt does (every plain arm since cue mode), a captured prompt does if the hour flew
        // with cues or --cues inserted it, and --no-cues removes it on purpose.
        const sentSystem = CAPTURED ? cueVariant(CAPTURED[item.id]).system : SYSTEM_PROMPT;
        const expectCues = carriesCueRule(sentSystem, P.CUE_RULE);
        const ctx = { spoken: r.spoken, offers: r.offers, cues: r.cues, sentinel: P.SUGGESTIONS_SENTINEL, cuesSentinel: P.CUES_SENTINEL, cueMaxLines: P.CUE_MAX_LINES, cueMaxWords: P.CUE_MAX_WORDS, budget: P.SPOKEN_WORD_BUDGET, wordCount: r.words };
        const checks = Object.fromEntries(Object.entries(VERBAL_CHECKS).filter(([n]) => expectCues || !n.startsWith('cues_')).map(([n, f]) => [n, f(ctx).ok]));
```

(i) The summary loop (~329): `for (const n of Object.keys(done[0]?.checks ?? {})) {`.

- [ ] **Step 6: The metrics field and row**

In `electron/test/golden/interview60.metrics.mjs`, after the `budgetWords` line (~112) add:

```js
    // cue blocks (cue mode, spec 2026-09-20): one line per verbal answer from IntelligenceEngine,
    // `[]` when the model opened without a block; coding routes emit none. The limits mirror
    // CUE_MAX_LINES / CUE_MAX_WORDS in electron/llm/prompts.ts — this module reads logs on a
    // clean checkout and imports no build.
    const cueLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$/gm)].map((m) => {
        let cues = [];
        try { cues = JSON.parse(m[2]); } catch { /* a malformed line is an answer with no cues */ }
        return { at: ts(m[1]), cues: Array.isArray(cues) ? cues : [] };
    });
    const wellformedCues = (c) => c.length >= 1 && c.length <= 5 && c.every((x) => typeof x === 'string' && (x.match(/\S+/g) || []).length <= 8 && !x.includes('?') && !/\byou\b/i.test(x));
    const cueBlocks = { n: cueLines.length, present: cueLines.filter((c) => c.cues.length > 0).length, wellformed: cueLines.filter((c) => wellformedCues(c.cues)).length };
```

In the return object (~392) add `cueBlocks,` after `length,`. In `GATE`, after the `length` row add:

```js
    // Cue mode (spec 2026-09-20): every verbal answer opens with a cue block the candidate
    // glances at. `n` covers the delivered answers like the budget row (coding routes emit no
    // cues line, hence 0.9); every block present and well-formed. Older runs read "not logged".
    { key: 'cueBlocks', label: 'Cue block above every spoken answer', before: 'not logged (before cue mode)', pass: (m) => m.cueBlocks.n > 0 && m.cueBlocks.n >= Math.floor(m.delivered * 0.9) && m.cueBlocks.present === m.cueBlocks.n && m.cueBlocks.wellformed === m.cueBlocks.n, show: (m) => m.cueBlocks.n === 0 ? 'not logged' : `${m.cueBlocks.present}/${m.cueBlocks.n} present, ${m.cueBlocks.wellformed} well-formed` },
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run electron/test/golden`
Expected: PASS for the whole folder (the pass-record test renders `GATE` generically; the roster and flight tests are untouched).

- [ ] **Step 8: Prove the runner's seams with the built dist**

Run: `npm run build:electron` → Expected: `dist-electron/electron/llm/prompts.js` and `verbalStreamFilter.js` rebuilt (the esbuild step; no type check).

Then the flag validation, which needs no key because it fails before any request:

```bash
node electron/test/golden/interview60.answers.mjs --cues --tag x
```

Expected: exit 2 with `--cues needs --captured: ...` — **if instead it prints `GEMINI_API_KEY: not in the environment and no .env beside package.json`**, that is the key check running first (this worktree has no `.env`); run the same command with `--env-file` pointing at MAIN's `.env` (`node --env-file="C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env" electron/test/golden/interview60.answers.mjs --cues --tag x`) and expect the `--cues needs --captured` message. Then:

```bash
node --env-file="C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env" electron/test/golden/interview60.answers.mjs --cues --no-cues --tag x
```

Expected: exit 2, `--cues and --no-cues are exclusive`. Nothing is written by either run.

- [ ] **Step 9: Commit**

```bash
git add electron/test/golden/problems.verbal.mjs electron/test/golden/problems.verbal.cues.test.ts electron/test/golden/cueArm.mjs electron/test/golden/cueArm.test.ts electron/test/golden/interview60.answers.mjs electron/test/golden/interview60.metrics.mjs electron/test/golden/interview60.metrics.test.ts
git commit -m "feat(golden): cue checks, --cues/--no-cues captured arms, and the cue row

Four mechanical checks on the block (present, well-formed, grounded, clean)
calibrated on known cases; cueArm.mjs inserts the shipped rule exactly where
the app puts it or strips it byte for byte, so a pre-cue hour has a treatment
and a cue hour has a same-bytes control; the runner refuses a variant that
would double or find no rule. Keys from the environment first, so the bench
runs from a worktree with --env-file. Metrics parse [Answer] cues: and gate
on every block present and well-formed, with the budget row's 0.9 tolerance.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

