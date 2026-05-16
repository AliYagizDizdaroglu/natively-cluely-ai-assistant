# Design: Unified RAG + Conversation Context for Interview Copilot

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** `NativelyInterface.tsx` interview path only — MeetingChatOverlay, GlobalChatOverlay, and all post-meeting RAG paths are untouched.

---

## Problem

The interview copilot has two valuable context sources that currently overwrite each other:

- **RAG (JIT voice context):** semantic search over the live interviewer transcript, indexed every 30 seconds via `LiveRAGIndexer`. Knows what the interviewer said; knows nothing about the conversation thread.
- **Conversation history (`conversationContext`):** the last 20 messages from the chat UI. Knows what was already solved; knows nothing about what the interviewer said.

Current routing is either/or:
- First message with no conversation history → RAG pre-flight fires, handles the request entirely with its own separate LLM call via `rag:stream-chunk`
- Follow-up message (conversationContext non-empty) → RAG is skipped, LLM uses only the conversation thread

Neither path has both. An interviewee following up on a coding problem loses the interviewer's voice context; a first-turn question has no conversation thread but also misses the fact that a screenshot may have already been shown.

---

## Goals

1. RAG retrieval and conversation history are always combined into a single LLM call — never competing paths.
2. When a screenshot is provided, the image is the primary focus; RAG voice context is not injected alongside it (avoids task confusion).
3. When no screenshot is provided, both RAG chunks (if available) and conversation history (if any) are active together.
4. No image re-attachment on text follow-ups (A2 decision): the prior solution text in `conversationContext` carries enough signal; re-sending images adds TTFT cost on every follow-up.
5. The renderer (`NativelyInterface.tsx`) gets simpler — no more dual-path orchestration.
6. All other components and the JIT indexing pipeline are untouched.

---

## Architecture

### Turn routing table

| Turn type | Image attached | RAG enrichment | Conversation history |
|---|---|---|---|
| Screenshot turn | ✅ | ❌ image is primary | ✅ |
| First text turn | ❌ | ✅ if chunks available | ❌ empty |
| Follow-up text turn | ❌ | ✅ if chunks available | ✅ |

When a screenshot is attached: the model focuses on the image. Injecting voice chunks creates a risk of the model conflating what the interviewer said with what is visually shown. Conversation history is still included for follow-up awareness.

When no screenshot is attached: both sources are always injected when available. There is no priority — the model sees both labeled blocks and can weigh them.

### Merged context block (no-screenshot case)

```
System: INTERVIEW_COPILOT_PROMPT  (unchanged, via systemInstruction)

User content:
  MEETING CONTEXT (interviewer):
  [Chunk: "Can you implement an LRU cache that runs in O(1) time?"]
  [Chunk: "And now, can you do it without any built-in ordered structures?"]

  CONVERSATION HISTORY:
  Assistant: Here's the solution using OrderedDict...
  User: solve it without ordered dict

  USER QUESTION: solve it without ordered dict
```

Order: meeting context first (what the interviewer asked), then conversation history (what was already said), then the current question. This matches the natural reading order for the model.

### Data flow (after this change)

```
[NativelyInterface] handleManualSubmit
    → always calls streamGeminiChat(question, imagePaths?, conversationContext)
    → no RAG pre-flight, no dual-stream coordination

[IPC: gemini-chat-stream handler]
    if imagePaths present:
        → call streamChat directly (no RAG)
    else:
        → ragManager.retrieveContextString(query)   ← NEW: retrieval only, no LLM
        → if chunks returned: prepend MEETING CONTEXT block to context param
        → call streamChat(question, undefined, enrichedContext)

[streamChat] (unchanged internals)
    → builds userContent from enrichedContext
    → routes to Gemma / Flash fallback chain as normal
    → streams via gemini-stream-token

[NativelyInterface] receives tokens via onGeminiStreamToken (unchanged)
```

The `rag:stream-chunk` / `rag:stream-complete` / `rag:stream-error` events are no longer emitted for the interview path. The `rag:query-live` IPC handler remains available for other components.

---

## Changes

### 1. `electron/rag/RAGManager.ts` — new `retrieveContextString` method

```typescript
async retrieveContextString(query: string): Promise<string | null>
```

- Calls `this.retriever.retrieve(query, { meetingId: 'live-meeting-current' })`
- Returns `context.formattedContext` if `context.chunks.length > 0`, otherwise `null`
- Does **not** call any LLM
- Does **not** throw on `NO_MEETING_EMBEDDINGS` or `NO_RELEVANT_CONTEXT` — returns `null` instead (these are expected when JIT indexer has no chunks yet)
- Guard: only runs if `this.liveIndexer.hasIndexedChunks()` — avoids vector search when indexer is empty
- Uses `this.embeddingPipeline.isReady()` (not the full `isReady()` which also requires `llmHelper`) since no LLM call is made

### 2. `electron/ipcHandlers.ts` — RAG enrichment pre-step in `gemini-chat-stream`

In the `gemini-chat-stream` handler, before the `streamChat` call:

```typescript
// RAG enrichment: text-only turns get interviewer voice context injected
if (!imagePaths?.length) {
  const ragManager = appState.getRAGManager();
  if (ragManager?.isReady()) {
    try {
      const ragChunks = await ragManager.retrieveContextString(message);
      if (ragChunks) {
        const meetingBlock = `MEETING CONTEXT (interviewer):\n${ragChunks}`;
        context = context
          ? `${meetingBlock}\n\nCONVERSATION HISTORY:\n${context}`
          : meetingBlock;
      }
    } catch (_) {
      // Non-fatal: enrichment best-effort, proceed without it
    }
  }
}
```

The existing call to `streamChat(message, imagePaths, context, ...)` remains unchanged after this block.

### 3. `NativelyInterface.tsx` — remove dual-path orchestration

- **Remove** the `ragQueryLive` pre-flight block (lines ~1745–1757). `handleManualSubmit` always calls `streamGeminiChat` unconditionally.
- **Remove** `onRAGStreamChunk`, `onRAGStreamComplete`, `onRAGStreamError` listener registrations from the streaming `useEffect`. These events will no longer fire for this component.
- **Keep** the `conversationContext` building effect, `streamGeminiChat` call, and all `onGeminiStreamToken` / `onGeminiStreamDone` handling — unchanged.

Net change to `NativelyInterface.tsx`: ~40 lines removed, 0 added.

### 4. `streamChat` — label the context blocks correctly

Minor: when `context` contains a `MEETING CONTEXT` prefix (injected by the IPC handler), the `userContent` builder in `streamChat` (line ~2345) must not add a second `CONTEXT:` wrapper that would produce `CONTEXT:\nMEETING CONTEXT:\n...` — redundant and slightly confusing for the model.

The Gemma/Flash interview path uses `userContent` directly (not `buildCombinedMessage`). Guard only needs to be applied to `userContent`:

```typescript
// streamChat, ~line 2345
const userContent = context
  ? context.startsWith('MEETING CONTEXT')
    ? `${context}\n\nUSER QUESTION:\n${message}`      // already structured
    : `CONTEXT:\n${context}\n\nUSER QUESTION:\n${message}`  // existing behaviour
  : message;
```

`buildCombinedMessage` (used by Groq/other non-interview paths) does not need this guard — those paths do not receive the enriched context from the IPC handler since the Gemma branch short-circuits before them.

---

## What is NOT changing

- `LiveRAGIndexer`, `VectorStore`, `EmbeddingPipeline`, `RAGRetriever` — untouched
- `rag:query-live`, `rag:query-meeting`, `rag:query-global` IPC handlers — untouched
- `MeetingChatOverlay`, `GlobalChatOverlay` — untouched
- Gemma watchdog / Flash fallback chain — untouched
- `INTERVIEW_COPILOT_PROMPT`, `thinkingConfig`, generation config — untouched
- Voice capture → STT → JIT indexing pipeline — untouched

---

## Failure modes

| Failure | Behavior |
|---|---|
| JIT indexer has no chunks yet (first 30s) | `retrieveContextString` returns `null` → no enrichment → LLM uses conversationContext only |
| RAG retrieval finds no relevant chunks | `retrieveContextString` returns `null` → same as above |
| RAG retrieval throws unexpectedly | Try/catch in IPC handler → logs warning, proceeds without enrichment |
| Screenshot turn: RAG skipped entirely | Model focuses on image as intended |
| `conversationContext` empty + no RAG chunks | Plain question, no context — same as current first-turn behavior |

---

## Verification

1. **First text turn, interviewer has been speaking:**  
   Send "what should I implement?" with no screenshot. RAG chunks from interviewer speech appear in the merged context. Model answers based on what the interviewer said, not generic LLM knowledge.

2. **Screenshot turn:**  
   Send a LeetCode screenshot. RAG enrichment does not fire. Model focuses on the image.

3. **Follow-up after screenshot:**  
   After a screenshot+solution exchange, send "solve without ordered dict" (text only, no image). Model sees prior solution in conversation history AND any new interviewer voice context from RAG. Does not respond with meeting-search content.

4. **No JIT chunks yet:**  
   Send a question within the first 30s of the session. RAG returns null. LLM answers with conversationContext only (or plain question if first turn). No error, no fallback chain.

5. **Regression: MeetingChatOverlay RAG unaffected:**  
   Open a completed meeting. Ask a question in the chat overlay. Response comes via `rag:stream-chunk` as before — the new IPC enrichment does not affect this path.
