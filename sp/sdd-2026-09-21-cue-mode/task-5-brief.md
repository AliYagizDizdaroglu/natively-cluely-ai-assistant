### Task 5: Renderer — cues on the bubble and the `CueBlock` above the answer

**Files:**
- Modify: `src/lib/answerMessages.ts` (`AnswerMessage`, `applyAnswerToken`)
- Create: `src/components/CueBlock.tsx`
- Modify: `src/components/NativelyInterface.tsx` (`interface Message` line 53; import near line 50; token handler line 858; the bubble at line 2616)
- Test: `src/lib/answerMessages.test.ts`, `src/components/CueBlock.test.tsx` (new)

**Interfaces:**
- Consumes: IPC data `cues?: string[]` (Task 4).
- Produces: `AnswerMessage.cues?: string[]`; `applyAnswerToken(prev, token, replace, newId, cues?: string[])`; `<CueBlock cues={string[]} className? />`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/answerMessages.test.ts`:

```ts
describe('cues on the answer bubble (cue mode, spec 2026-09-20 §6.8)', () => {
    it('the first token of a new answer carries the cues onto the bubble it creates', () => {
        const result = applyAnswerToken([], 'Ten ', false, makeNewId(), ['thirty gigabytes', 'int8, then shard']);
        expect(result[0]).toMatchObject({ text: 'Ten ', intent: 'what_to_answer', isStreaming: true, cues: ['thirty gigabytes', 'int8, then shard'] });
    });

    it('a following token without cues keeps the cues already on the bubble', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Ten ', intent: 'what_to_answer', isStreaming: true, cues: ['thirty gigabytes'] };
        const result = applyAnswerToken([streaming], 'million', false, makeNewId());
        expect(result[0]).toEqual({ ...streaming, text: 'Ten million' });
    });

    it('a supersede restart takes the new stream\'s cues, or drops the old ones when it has none', () => {
        const old: AnswerMessage = { id: 'a1', role: 'system', text: 'Old.', intent: 'what_to_answer', isStreaming: false, cues: ['old cue'] };
        expect(applyAnswerToken([old], 'New', true, makeNewId(), ['new cue'])[0]).toEqual({ id: 'a1', role: 'system', intent: 'what_to_answer', text: 'New', isStreaming: true, cues: ['new cue'] });
        expect(applyAnswerToken([old], 'New', true, makeNewId())[0]).toEqual({ id: 'a1', role: 'system', intent: 'what_to_answer', text: 'New', isStreaming: true });
    });

    it('applyFinalAnswer keeps the cues when finalize spreads the streaming message', () => {
        const streaming: AnswerMessage = { id: 'a1', role: 'system', text: 'Ten million.', intent: 'what_to_answer', isStreaming: true, cues: ['thirty gigabytes'] };
        const result = applyFinalAnswer([streaming], false, (s) => ({ ...(s as AnswerMessage), isStreaming: false }));
        expect(result[0].cues).toEqual(['thirty gigabytes']);
    });
});
```

Create `src/components/CueBlock.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CueBlock } from './CueBlock';

describe('CueBlock — layout B, the cues above the answer', () => {
    it('renders one numbered line per cue, in order', () => {
        render(<CueBlock cues={['thirty gigabytes in float32', 'int8, then shard']} />);
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(items[0].querySelector('span')!.textContent).toBe('1');
        expect(items[0].textContent).toContain('thirty gigabytes in float32');
        expect(items[1].querySelector('span')!.textContent).toBe('2');
        expect(items[1].textContent).toContain('int8, then shard');
    });

    it('renders nothing for an empty list', () => {
        const { container } = render(<CueBlock cues={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx`
Expected: FAIL — `cues` never lands on the message; `./CueBlock` cannot be resolved.

- [ ] **Step 3: Implement**

(a) `src/lib/answerMessages.ts` — add to `AnswerMessage` after `isStreaming?: boolean;`:

```ts
    /** Cue mode: the key phrases the answer opened with, rendered above the text. */
    cues?: string[];
```

and change `applyAnswerToken` to:

```ts
export function applyAnswerToken(
    prev: AnswerMessage[],
    token: string,
    replace: boolean,
    newId: () => string,
    cues?: string[]
): AnswerMessage[] {
    // `cues` rides the first prose token of a stream that opened with a cue block (cue mode);
    // a restart takes the new stream's cues and never inherits the old ones.
    const withCues = cues && cues.length ? { cues } : {};
    if (replace) {
        const i = lastIndexWhere(prev, (m) => m.intent === 'what_to_answer');
        if (i !== -1) {
            const updated = [...prev];
            // A restart is a NEW answer under the same id (R23) — build it fresh
            // rather than spreading the old message, so a finished coaching
            // answer's card fields and metrics never survive onto the restart.
            updated[i] = { id: prev[i].id, role: prev[i].role, intent: 'what_to_answer', text: token, isStreaming: true, ...withCues };
            return updated;
        }
    }

    const lastMsg = prev[prev.length - 1];

    // Already streaming and not a restart: this token belongs to that bubble.
    if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, text: lastMsg.text + token, ...withCues };
        return updated;
    }

    return [...prev, { id: newId(), role: 'system', text: token, intent: 'what_to_answer', isStreaming: true, ...withCues }];
}
```

(b) Create `src/components/CueBlock.tsx`:

```tsx
import React from 'react';

interface Props {
    cues: string[];
    className?: string;
}

/**
 * Cue mode (spec 2026-09-20, layout B): the key phrases above the spoken answer, one per part
 * of the question, larger and bolder than the prose so the eye lands here first and only
 * glances at the text below. The parent passes the theme border; precedent for a small
 * component rendered inside the bubble is MessageMetricsBar.
 */
export const CueBlock: React.FC<Props> = ({ cues, className = '' }) => {
    if (!cues.length) return null;
    return (
        <ol className={`list-none m-0 p-0 pr-7 flex flex-col gap-1 ${className}`} aria-label="Cues">
            {cues.map((cue, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[15px] leading-snug font-medium overlay-text-primary">
                    <span className="w-4 shrink-0 text-[11px] font-semibold overlay-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span>{cue}</span>
                </li>
            ))}
        </ol>
    );
};
```

(c) `src/components/NativelyInterface.tsx`:
- next to `import { MessageMetricsBar } from './MessageMetricsBar';` (line 50) add `import { CueBlock } from './CueBlock';`
- in `interface Message` (line 53) add after `isStreaming?: boolean;`: `cues?: string[];`
- line 858 becomes:

```tsx
            setMessages(prev => applyAnswerToken(prev as AnswerMessage[], data.token, data.replace === true, () => Date.now().toString(), data.cues) as Message[]);
```

- directly before `{renderMessageText(msg)}` (line 2616) add:

```tsx
                                                {msg.role === 'system' && msg.cues && msg.cues.length > 0 && (
                                                    <CueBlock cues={msg.cues} className={`mb-2 pb-2 border-b ${isLightTheme ? 'border-black/10' : 'border-white/10'}`} />
                                                )}
```

The final handler (line 886) spreads `...streaming`, so the cues survive finalization; the missed-stream branch builds from scratch and has none, as the spec states.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type check and commit**

Run: `node node_modules/typescript/bin/tsc --noEmit 2>&1 | grep -c "error TS"` → Expected: the count you recorded before this task (not higher).

```bash
git add src/lib/answerMessages.ts src/lib/answerMessages.test.ts src/components/CueBlock.tsx src/components/CueBlock.test.tsx src/components/NativelyInterface.tsx
git commit -m "feat(cues): render the cue block above the answer

The first token's cues land on the bubble it creates or restarts, later
tokens keep them, finalization spreads them; CueBlock draws the numbered
lines larger and bolder than the prose, inside the existing bubble (layout B).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

