# Unified RAG + Conversation Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge JIT voice-transcript RAG and conversation history into a single LLM call so the interview copilot always has both sources of context — neither overwrites the other.

**Architecture:** A new `retrieveContextString()` method on `RAGManager` does retrieval-only (no LLM). The `gemini-chat-stream` IPC handler calls it before `streamChat` and prepends any retrieved chunks as a `MEETING CONTEXT` block to the `context` parameter. `NativelyInterface` is simplified — it no longer orchestrates a separate RAG path; it always calls `streamGeminiChat` unconditionally.

**Tech Stack:** TypeScript, Electron IPC, `better-sqlite3` + `sqlite-vec` vector search, React

---

## File Map

| File | Change type | What changes |
|---|---|---|
| `electron/rag/RAGManager.ts` | Modify | Add `retrieveContextString(query)` method |
| `electron/ipcHandlers.ts` | Modify | RAG enrichment pre-step in `gemini-chat-stream` handler |
| `src/components/NativelyInterface.tsx` | Modify | Remove RAG pre-flight + three RAG stream listeners |
| `electron/LLMHelper.ts` | Modify | Fix `userContent` double-label guard |

---

## Task 1: Add `retrieveContextString` to RAGManager

**Files:**
- Modify: `electron/rag/RAGManager.ts` (after line 190, following `queryMeeting`)

This method does pure vector retrieval — no LLM call. Returns the formatted chunk string if relevant chunks exist, `null` otherwise. Caller never needs to handle errors; all expected failure modes (`NO_MEETING_EMBEDDINGS`, `NO_RELEVANT_CONTEXT_FOUND`) return `null`.

- [ ] **Step 1: Add the method to RAGManager**

Open `electron/rag/RAGManager.ts`. After the closing `}` of `queryMeeting` (line 190), insert:

```typescript
    /**
     * Retrieve relevant context string for the current live meeting.
     * Pure retrieval — no LLM call. Returns formatted chunk text or null.
     *
     * Returns null when:
     *  - embedding pipeline not ready
     *  - live indexer has no chunks yet (first 30s of meeting)
     *  - no chunks are relevant to the query
     */
    async retrieveContextString(query: string): Promise<string | null> {
        if (!this.embeddingPipeline.isReady()) return null;
        if (!this.liveIndexer.hasIndexedChunks()) return null;

        try {
            const result = await this.retriever.retrieve(query, {
                meetingId: 'live-meeting-current',
            });
            if (result.chunks.length === 0) return null;
            return result.formattedContext;
        } catch (err: any) {
            const msg = err?.message ?? '';
            if (msg.includes('NO_MEETING_EMBEDDINGS') || msg.includes('NO_RELEVANT_CONTEXT')) {
                return null;
            }
            // Unexpected error — log and return null so caller is not disrupted
            console.warn('[RAGManager] retrieveContextString failed:', msg);
            return null;
        }
    }
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/focused-vaughan-064f37
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `RAGManager`.

- [ ] **Step 3: Commit**

```bash
git add electron/rag/RAGManager.ts
git commit -m "feat(rag): add retrieveContextString — pure retrieval, no LLM"
```

---

## Task 2: RAG enrichment pre-step in `gemini-chat-stream` IPC handler

**Files:**
- Modify: `electron/ipcHandlers.ts` (inside `gemini-chat-stream` handler, ~line 488)

The IPC handler already has `appState.getRAGManager()` available (used in `rag:query-live` below). We insert a retrieval block between the auto-context injection (line 487) and the `streamChat` call (line 491). Images attached → skip enrichment entirely. No images → retrieve and merge.

- [ ] **Step 1: Add the RAG enrichment block**

In `electron/ipcHandlers.ts`, locate the `gemini-chat-stream` handler. Find this exact block (around line 489):

```typescript
      try {
        // USE streamChat which handles routing
        const stream = llmHelper.streamChat(message, imagePaths, context, options?.skipSystemPrompt ? "" : undefined, options?.ignoreKnowledgeMode);
```

Replace it with:

```typescript
      // RAG enrichment: for text-only turns, retrieve live meeting context and
      // prepend it so the model has both what the interviewer said AND the
      // conversation thread. Images skip this — model focuses on the visual.
      if (!imagePaths?.length) {
        try {
          const ragMgr = appState.getRAGManager();
          if (ragMgr) {
            const ragChunks = await ragMgr.retrieveContextString(message);
            if (ragChunks) {
              const meetingBlock = `MEETING CONTEXT (interviewer):\n${ragChunks}`;
              context = context?.trim()
                ? `${meetingBlock}\n\nCONVERSATION HISTORY:\n${context}`
                : meetingBlock;
              console.log(`[IPC] RAG enrichment: ${ragChunks.length} chars of meeting context injected`);
            }
          }
        } catch (ragErr: any) {
          // Non-fatal — proceed without meeting context
          console.warn('[IPC] RAG enrichment failed (non-fatal):', ragErr?.message);
        }
      }

      try {
        // USE streamChat which handles routing
        const stream = llmHelper.streamChat(message, imagePaths, context, options?.skipSystemPrompt ? "" : undefined, options?.ignoreKnowledgeMode);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add electron/ipcHandlers.ts
git commit -m "feat(ipc): inject live RAG meeting context into gemini-chat-stream before LLM call"
```

---

## Task 3: Fix `userContent` double-label in `streamChat`

**Files:**
- Modify: `electron/LLMHelper.ts` (~line 2345)

When the IPC handler injects a `MEETING CONTEXT` block, `streamChat` currently wraps it with an additional `CONTEXT:` prefix, producing `CONTEXT:\nMEETING CONTEXT:\n...`. This guard detects the structured prefix and skips the wrapper.

- [ ] **Step 1: Update `userContent` construction**

In `electron/LLMHelper.ts`, find this exact block (line 2344–2347):

```typescript
    // Helper to build combined user message
    const userContent = context
      ? `CONTEXT:\n${context}\n\nUSER QUESTION:\n${message}`
      : message;
```

Replace with:

```typescript
    // Helper to build combined user message.
    // When context was pre-structured by the IPC RAG enrichment (starts with
    // "MEETING CONTEXT"), preserve its labels as-is. Otherwise wrap with CONTEXT:.
    const userContent = context
      ? context.trimStart().startsWith('MEETING CONTEXT')
        ? `${context}\n\nUSER QUESTION:\n${message}`
        : `CONTEXT:\n${context}\n\nUSER QUESTION:\n${message}`
      : message;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add electron/LLMHelper.ts
git commit -m "fix(llm): skip CONTEXT: wrapper when IPC has already structured context"
```

---

## Task 4: Simplify NativelyInterface — remove dual-path RAG orchestration

**Files:**
- Modify: `src/components/NativelyInterface.tsx`

Two removals:
1. The three RAG stream listeners in the streaming `useEffect` (lines 1457–1558)
2. The `ragQueryLive` pre-flight in `handleManualSubmit` (lines 1745–1757)

After this, `handleManualSubmit` always calls `streamGeminiChat` unconditionally. All tokens arrive via `gemini-stream-token` — no separate `rag:stream-chunk` path.

- [ ] **Step 1: Remove the three RAG stream listeners**

In `src/components/NativelyInterface.tsx`, find and delete the entire block from line 1457 to line 1558 (inclusive). This is the section that begins with:

```typescript
        // JIT RAG Stream listeners (for live meeting RAG responses)
        if (window.electronAPI.onRAGStreamChunk) {
```

and ends with the closing of `onRAGStreamError`:

```typescript
        if (window.electronAPI.onRAGStreamError) {
            cleanups.push(window.electronAPI.onRAGStreamError((data: { error: string }) => {
                setIsProcessing(false);
                requestStartTimeRef.current = null;
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming) {
                        const updated = [...prev];
                        updated[prev.length - 1] = {
                            ...lastMsg,
                            isStreaming: false,
                            text: lastMsg.text + `\n\n[Error: ${data.error}]`
                        };
                        return updated;
                    }
                    return prev;
                });
            }));
        }
```

Delete all of this. The `cleanups` array and the surrounding `useEffect` structure stay intact — only these three `if` blocks are removed.

- [ ] **Step 2: Remove the `ragQueryLive` pre-flight from `handleManualSubmit`**

In `handleManualSubmit` (around line 1745), find and delete this block:

```typescript
            // JIT RAG pre-flight: only attempt when there's no active conversation.
            // If conversationContext is non-empty the user is following up on a prior
            // AI response (e.g. "solve it without OrderedDict") — RAG would search
            // meeting transcripts and lose the coding thread. Send to LLM directly
            // so conversationContext carries the prior code solution as context.
            if (currentAttachments.length === 0 && !conversationContext.trim()) {
                const ragResult = await window.electronAPI.ragQueryLive?.(userText || '');
                if (ragResult?.success) {
                    // JIT RAG handled it — response streamed via rag:stream-chunk events
                    return;
                }
            }
```

After deletion, the `try` block in `handleManualSubmit` goes straight to:

```typescript
            const effectiveQuestion = userText || (currentAttachments.length > 0 ? 'Solve the coding problem shown.' : '');
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/NativelyInterface.tsx
git commit -m "refactor(ui): remove dual-path RAG orchestration — enrichment now transparent in IPC handler"
```

---

## Verification

Run through these manually after the build:

- [ ] **V1 — First text turn, interviewer has been speaking for >30s:**
  Start a session, let the interviewer speak for 30+ seconds (so JIT indexer has at least one batch), then type a text question with no screenshot. Check the console for `[IPC] RAG enrichment: N chars of meeting context injected`. The model's response should reflect what the interviewer said.

- [ ] **V2 — Screenshot turn, RAG not injected:**
  Attach a screenshot and submit. Console should NOT show the `[IPC] RAG enrichment` log line. Model focuses on the image.

- [ ] **V3 — Follow-up after screenshot:**
  After a screenshot + solution exchange, type "solve without ordered dict" (no image). Console should show RAG enrichment log. Model response uses both the prior solution (from conversationContext) and any relevant interviewer voice chunks.

- [ ] **V4 — First 30 seconds (no JIT chunks yet):**
  Start a fresh session and immediately send a text question. `hasIndexedChunks()` returns false → `retrieveContextString` returns null → no enrichment. Model answers using conversationContext only (empty on first turn → plain question). No error, no hang.

- [ ] **V5 — MeetingChatOverlay RAG unaffected:**
  Open a completed meeting, ask a question in the chat overlay. Response still comes via `rag:stream-chunk` / `rag:stream-complete`. The IPC enrichment only runs in `gemini-chat-stream`, not in `rag:query-meeting` — these are separate handlers.

- [ ] **V6 — Type-check clean:**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no output (zero errors).
