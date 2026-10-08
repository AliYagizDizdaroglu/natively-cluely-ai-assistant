### Task 7: Flight — the `captured-no-cues` twins, gated on the hour's bytes

**Files:**
- Modify: `electron/test/golden/interview60.flight.mjs` (PAIRED_ARMS ~128–141; the paired-arms builder ~289–293)
- Test: `electron/test/golden/interview60.flight.test.ts`

**Interfaces:**
- Produces: `CUE_RULE_MARK = '[CUES FIRST]'`, `hasCueRule(captured): boolean`; three `PAIRED_ARMS` entries tagged `captured-no-cues`, `captured-no-cues-r2`, `captured-no-cues-r3` with `when: hasCueRule`; arms with a `when` predicate are skipped with one log line when the hour's captured prompts carry no rule.

- [ ] **Step 1: Write the failing tests**

In `electron/test/golden/interview60.flight.test.ts`: add `CUE_RULE_MARK, hasCueRule,` to the import from `./interview60.flight.mjs`, add `import { CUE_RULE } from '../../llm/prompts';`, and append inside `describe('PAIRED_ARMS', ...)`:

```ts
    it('runs the same-bytes no-cue twin three times on the app answer model, only on an hour that flew with cues', () => {
        // Cue mode (spec 2026-09-20 §8): a cue hour's control is its own captured bytes with the
        // exact rule stripped, band against band within one hour. On a pre-cue hour the arm would
        // silently duplicate the control, so it is gated on the bytes and skipped with a log line.
        const twins = PAIRED_ARMS.filter((a) => a.tag.startsWith('captured-no-cues'));
        expect(twins.map((a) => a.tag)).toEqual(['captured-no-cues', 'captured-no-cues-r2', 'captured-no-cues-r3']);
        for (const t of twins) {
            expect(t).toMatchObject({ model: ANSWER_MODELS[0], captured: true, args: ['--thinking', 'LOW', '--no-cues'] });
            expect(t.when).toBe(hasCueRule);
        }
        expect(PAIRED_ARMS.filter((a) => !a.tag.startsWith('captured-no-cues')).every((a) => a.when === undefined)).toBe(true);
    });

    it('hasCueRule reads the shipped rule\'s header out of the captured system prompts', () => {
        expect(CUE_RULE).toContain(CUE_RULE_MARK);
        expect(hasCueRule({ S1Q01: { system: `prompt ${CUE_RULE_MARK} more`, user: 'u' } })).toBe(true);
        expect(hasCueRule({ S1Q01: { system: 'prompt without it', user: 'u' } })).toBe(false);
        expect(hasCueRule({})).toBe(false);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts`
Expected: FAIL — `CUE_RULE_MARK`/`hasCueRule` undefined, no `captured-no-cues` arms.

- [ ] **Step 3: Implement**

In `electron/test/golden/interview60.flight.mjs`, before `export const PAIRED_ARMS`:

```js
/**
 * Cue mode (spec 2026-09-20): the header line of the shipped CUE_RULE, read out of the hour's
 * captured system prompts to tell a cue hour from a pre-cue one. A string rather than an
 * import of the built prompts, so the flight plans without a dist; the flight test pins it
 * against the real constant.
 */
export const CUE_RULE_MARK = '[CUES FIRST]';
export const hasCueRule = (captured) => Object.values(captured ?? {}).some((c) => typeof c?.system === 'string' && c.system.includes(CUE_RULE_MARK));
```

Add to `PAIRED_ARMS` after the `high` entry:

```js
    // Cue mode (spec 2026-09-20 §8): a cue hour's own same-bytes no-cue band — the captured
    // prompts with the exact CUE_RULE stripped, three reps like the other twins. Gated on the
    // bytes: on a pre-cue hour the captured twins already are the no-cue band, and answers.mjs
    // would refuse the variant anyway; the flight skips the arms with one log line instead.
    { model: ANSWER_MODELS[0], tag: 'captured-no-cues', captured: true, args: ['--thinking', 'LOW', '--no-cues'], when: hasCueRule },
    { model: ANSWER_MODELS[0], tag: 'captured-no-cues-r2', captured: true, args: ['--thinking', 'LOW', '--no-cues'], when: hasCueRule },
    { model: ANSWER_MODELS[0], tag: 'captured-no-cues-r3', captured: true, args: ['--thinking', 'LOW', '--no-cues'], when: hasCueRule },
```

In the flight body, replace the two lines from `const capturedIds = ...` through the `paired` builder (~289–293) with:

```js
    const capturedJson = focusedCaptured && !dry ? JSON.parse(fs.readFileSync(promptsFile, 'utf8')) : null;
    const capturedIds = capturedJson ? capturedOnly(capturedJson) : [];
    if (focusedCaptured && !dry) log(`paired captured arm: ${capturedIds.length} spoken items have a replayable prompt this hour`);
    const replayable = (a) => !a.captured || (focusedCaptured && (dry || capturedIds.length));
    const wanted = (a) => !a.when || dry || a.when(capturedJson);
    for (const a of PAIRED_ARMS) {
        if (!replayable(a)) log(`WARN  paired arm ${a.tag} skipped — it replays the hour's captured prompts and there are none`);
        else if (!wanted(a)) log(`paired arm ${a.tag} skipped — the hour's captured prompts carry no cue rule, so the captured twins already are the no-cue band`);
    }
    const paired = PAIRED_ARMS.filter((a) => replayable(a) && wanted(a))
        .map((a) => ({ model: a.model, tag: a.tag, args: ['--tag', a.tag, ...a.args, ...(a.captured ? ['--captured', promptsFile, ...(dry ? [] : ['--only', capturedIds.join(',')])] : [])] }));
```

- [ ] **Step 4: Run the tests and the dry run**

Run: `node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts` → Expected: PASS.

Then the flight's own dry run through the scratchpad helper that lends it an empty `.env` for the duration (`dry-runs.mjs` in the scratchpad already does this for two rosters): `node "C:/Users/sotka/AppData/Local/Temp/claude/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/scratchpad/dry-runs.mjs"` → Expected: both runs exit 0 and the `dryfocus` plan lists three `--tag captured-no-cues* ... --no-cues` arms (dry mode plans every arm), no `Error`.

- [ ] **Step 5: Commit**

```bash
git add electron/test/golden/interview60.flight.mjs electron/test/golden/interview60.flight.test.ts
git commit -m "feat(flight): a same-bytes no-cue twin, three reps, only on a cue hour

The captured prompts with the exact CUE_RULE stripped give a cue hour its own
no-cue band within the hour; on a pre-cue hour the arms are skipped with one
log line rather than duplicating the control or failing in answers.mjs.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

