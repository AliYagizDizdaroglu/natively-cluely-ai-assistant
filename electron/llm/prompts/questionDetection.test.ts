import { describe, it, expect, vi } from 'vitest';
import { validateDetectionResponse, QUESTION_DETECTION_SYSTEM_PROMPT } from './questionDetection';

const base = { detected: true, question: 'How would you design the training pipeline?', intent: 'verbal', confidence: 0.9 };

describe('validateDetectionResponse — difficulty (2026-09-08)', () => {
    it('keeps a valid difficulty', () => {
        expect(validateDetectionResponse({ ...base, difficulty: 'hard' })?.difficulty).toBe('hard');
        expect(validateDetectionResponse({ ...base, difficulty: 'easy' })?.difficulty).toBe('easy');
    });
    it('leaves it undefined when the client did not send one (Ollama / Gemini detectors)', () => {
        const r = validateDetectionResponse(base);
        expect(r).not.toBeNull();
        expect(r?.difficulty).toBeUndefined();
        expect('difficulty' in (r as object)).toBe(false);
    });
    it('drops a value outside the enum loudly instead of passing it on', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const r = validateDetectionResponse({ ...base, difficulty: 'brutal' });
        expect(r?.detected).toBe(true);
        expect(r?.difficulty).toBeUndefined();
        expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain('difficulty');
        warn.mockRestore();
    });
    it('the prompt asks for it, with the three levels defined', () => {
        expect(QUESTION_DETECTION_SYSTEM_PROMPT).toMatch(/"difficulty": "easy" \| "medium" \| "hard"/);
        expect(QUESTION_DETECTION_SYSTEM_PROMPT).toMatch(/difficulty="hard"/);
    });
});
