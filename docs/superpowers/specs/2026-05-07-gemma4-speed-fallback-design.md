# Gemma 4 Speed & Fallback Design

**Date:** 2026-05-07
**Branch:** fix/gemma4-stt-network-improvements
**Status:** Approved

## Problem

Gemma 4 responses in the interview helper take too long — both time-to-first-token (TTFT) and overall streaming speed are unacceptable for a live interview setting. Two root causes:

1. **Thinking mode is uncapped.** Gemma 4 on Gemini API v1beta runs chain-of-thought reasoning before outputting any visible text. No `thinkingConfig` is set, so it thinks for as long as it wants (up to `MAX_OUTPUT_TOKENS = 65536`). This causes 10–15s TTFT.
2. **Token budget is too high.** `MAX_OUTPUT_TOKENS = 65536` applies globally, encouraging long outputs and extended thinking.
3. **Thinking tokens leak.** The stream loop in `streamWithGeminiModel` yields all chunks verbatim — reasoning preamble passes through to the chat UI.
4. **No fallback if Gemma is slow.** When Gemma 4 is the selected model, the direct call path (`streamChat` lines 2390–2393) has no timeout-based rerouting. The only safety net is a 60s HTTP abort. A 55s hang means a 55s wait.

## Goals

- First visible token within 2–3 seconds for a typical interview question.
- Thinking tokens never visible in the chat.
- Silent fallback to faster models if Gemma stalls.
- Model attribution shown under each answer so the user knows which model responded.

## Scope

Changes are confined to three files: `electron/LLMHelper.ts`, `electron/ipcHandlers.ts`, `src/components/GlobalChatOverlay.tsx`.

---

## Design

### 1. Disable Thinking + Cap Token Budget (LLMHelper.ts)

In `streamWithGeminiModel`, when the model being called starts with `"gemma-"`, inject two extra generation config fields:

```ts
thinkingConfig: { thinkingBudget: 0 }  // disables thinking phase entirely
maxOutputTokens: 2048                   // ~1500 words, sufficient for any interview answer
```

`thinkingBudget: 0` is the Gemini v1beta supported way to skip thinking. The API processes the request normally but outputs the first token immediately instead of after a reasoning pass. All other models (Gemini Flash, Pro, Groq, Claude) continue using the global `MAX_OUTPUT_TOKENS` unchanged.

### 2. Thinking Token Stream Filter (LLMHelper.ts)

Safety net in case the API still emits reasoning text despite `thinkingBudget: 0`. The stream loop in `streamWithGeminiModel` maintains a small carry-over buffer (max 20 chars) between chunks to catch tags that span chunk boundaries. Before yielding each chunk, strip:

- Complete blocks: `<think>...</think>` and `<thinking>...</thinking>`
- Opening tags without closing tags that appear at stream start

Buffer is cleared once a clean chunk is confirmed. Memory cost is negligible.

### 3. TTFT Watchdog → Three-Tier Fallback Chain (LLMHelper.ts)

Replace the direct Gemma call at `streamChat` lines 2390–2393 with a guarded wrapper:

```
Gemma 4 stream starts
        │
        ├─ First token arrives within 8s → continue Gemma normally
        │
        └─ 8s elapsed, no token → abort Gemma via AbortController
                │
                ├─ Try Gemini Flash (existing streamWithGeminiModel + GEMINI_FLASH_MODEL)
                │       │
                │       ├─ Success → stream Flash response
                │       └─ Failure → try Ollama
                │
                └─ Try Ollama llama3.1:8b (streamWithOllama, hardcoded model)
                        │
                        ├─ Success → stream locally, no internet required
                        └─ Failure → surface error to user
```

**Implementation:** A `streamWithTTFTWatchdog` private generator wraps any source generator with a race between the first chunk and a configurable timeout. The watchdog aborts cleanly via `AbortController` — no dangling requests.

**Ollama model:** Hardcoded to `"llama3.1:8b"` regardless of `this.ollamaModel` setting. This makes the safety net predictable. If Ollama is not running (ECONNREFUSED), it throws immediately and the error is surfaced.

**Flash fallback:** Uses the existing `streamWithGeminiModel` code path with `GEMINI_FLASH_MODEL` — no duplication.

### 3b. Ollama Safety Net Pre-warming (LLMHelper.ts)

`llama3.1:8b` is cold on first use — loading model weights can take 20–30s, defeating the purpose of a fast fallback. A dedicated `warmUpSafetyNet()` private method eliminates this:

1. Calls `checkOllamaAvailable()` to confirm Ollama is running
2. Fetches the model list and confirms `llama3.1:8b` is present
3. Sends a short silent prompt (`"hi"`) via `callOllama` targeted specifically at `llama3.1:8b` — this forces weights into memory
4. Runs fully fire-and-forget: no `await` at call site, no error surfaced to user (console log only on failure)

Called in two places:
- **App startup** (`constructor` / `setApiKey`) — if `currentModelId` is already a Gemma 4 model at init time
- **`setModel()`** — whenever the user switches to any `gemma-4+` model

By the time the first interview question is asked, `llama3.1:8b` is warm and ready to respond in ~1–2s if Gemma stalls.

### 4. Model Attribution (ipcHandlers.ts + GlobalChatOverlay.tsx)

**Backend:** The winning model name is known at the point tokens start flowing. Fire a new IPC event `gemini-stream-source` immediately before the first token, carrying a human-readable label:

| Model | Label |
|---|---|
| Gemma 4 (any variant) | `"Gemma 4"` |
| Gemini Flash | `"Gemini Flash"` |
| Ollama llama3.1:8b | `"Ollama llama3.1:8b"` |

**Frontend — data:** Add `model?: string` to the `Message` interface. The `onGeminiStreamSource` listener updates the current assistant message's `model` field when the event fires.

**Frontend — display:** `AssistantMessage` renders a small muted label beneath the response after streaming completes:

```
Here's how an LRU cache works...

── answered by Gemini Flash ──
```

Label is hidden during streaming (appears only on `isStreaming: false`) so it doesn't distract mid-answer.

---

## Files Changed

| File | What changes |
|---|---|
| `electron/LLMHelper.ts` | `thinkingBudget: 0` + `maxOutputTokens: 2048` for Gemma; thinking token filter in stream loop; `streamWithTTFTWatchdog`; three-tier fallback chain replacing direct Gemma call; `warmUpSafetyNet()` called on startup and model switch |
| `electron/ipcHandlers.ts` | Emit `gemini-stream-source` IPC event before first token |
| `src/components/GlobalChatOverlay.tsx` | `model?` on `Message`; listen for `gemini-stream-source`; render attribution label in `AssistantMessage` |

## Non-Goals

- No UI mode switching (fast/quality toggle) — out of scope
- No changes to Groq, Claude, OpenAI, or Natively paths
- No changes to STT, screenshot analysis, or knowledge mode
- No metrics collection or latency dashboards

## Risk

- Gemma 4 with `thinkingBudget: 0` is slightly less nuanced on multi-step reasoning (e.g. complex algorithm derivation). For standard interview Q&A this is acceptable — a fast, clear answer is more valuable than a slow, perfectly reasoned one.
- Ollama must be running locally for the final fallback to work. If it is not, the error is surfaced to the user clearly.
- `warmUpSafetyNet()` only warms the model if Ollama is already running — it does not start Ollama. If Ollama is not running at startup, the warm-up silently no-ops and the fallback surfaces an error only if actually triggered.
