import { describe, it, expect } from 'vitest';
import { overlap, sameAnchor, reconcileLiveQuestion, type RecentSpeech } from './questionReconcile';

const t0 = 1_000_000;
const sp = (text: string, dt: number, final = true): RecentSpeech => ({ text, at: t0 + dt, final });

describe('overlap / sameAnchor', () => {
    it('overlap = fraction of the first text’s content words (len > 3) found in the second', () => {
        expect(overlap('How would you handle a dataset that must be deleted on request for compliance?',
            'How do you design a system where customer data must be deleted on request for co')).toBeCloseTo(3 / 8, 5);
    });
    it('sameAnchor holds when either side covers the other by half, or one contains the other', () => {
        expect(sameAnchor('Why do Docker layers matter for build times?', 'why do docker layer\'s matter for build')).toBe(true);
        expect(sameAnchor('architecture.', 'Can you explain Transformers? architecture.')).toBe(true);
        expect(sameAnchor('What is a SageMaker endpoint?', 'How do you keep base images patched?')).toBe(false);
    });
});

describe('reconcileLiveQuestion — fixtures from the 2026-09-02 log', () => {
    it('M04: Live invented a question; the interim transcript carried the real one → replaced', () => {
        const r = reconcileLiveQuestion(
            'Tell me about a time you handled a resource constraint problem in a deployment.',
            [sp('Why would you use CloudFormation instead of configuring things by', -5000, false)],
        );
        expect(r.verdict).toBe('replaced');
        expect(r.text).toBe('Why would you use CloudFormation instead of configuring things by');
        expect(r.anchor).toBe('Why would you use CloudFormation instead of configuring things by');
    });
    it('M25: Live rewrote the question → paraphrase, anchored to the transcript sentence', () => {
        const r = reconcileLiveQuestion(
            'How do you design a system where customer data must be deleted on request for co',
            [sp('How would you handle a dataset that must be deleted on request for compliance?', -4000)],
        );
        expect(r.verdict).toBe('paraphrase');
        expect(r.text).toBe('How do you design a system where customer data must be deleted on request for co');
        expect(r.anchor).toBe('How would you handle a dataset that must be deleted on request for compliance?');
    });
    it('W02: Live matched the transcript closely → match, Live wording kept', () => {
        const r = reconcileLiveQuestion('Why do Docker layers matter for build times?',
            [sp('why do docker layer\'s matter for build times?', -3000)]);
        expect(r.verdict).toBe('match');
        expect(r.text).toBe('Why do Docker layers matter for build times?');
    });
    it('no interviewer speech in the window → unverifiable, Live accepted as the only ear', () => {
        const r = reconcileLiveQuestion('What is a Pod?', []);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe('What is a Pod?');
        expect(r.anchor).toBeNull();
    });
    it('picks the best-matching sentence when several are in the window', () => {
        const r = reconcileLiveQuestion('How do you keep base images patched across many model services?', [
            sp('How would you handle a dataset that must be deleted on request for compliance?', -60000),
            sp('How do you keep base images patched across many model services?', -3000),
        ]);
        expect(r.verdict).toBe('match');
        expect(r.anchor).toBe('How do you keep base images patched across many model services?');
    });
});
