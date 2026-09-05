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

describe('reconcileLiveQuestion — fragment guard (Live-only hour, 2026-09-03)', () => {
    it('W04: the latest thing said is a fragment ("?") → unverifiable, Live wording kept, no anchor', () => {
        // The caption segmenter had cut the question into tiny finals; only "?" was
        // left in the 15 s window when Live fired. "?" replaced the question and was
        // then dropped as a fragment — a real question lost. A fragment is no evidence.
        const r = reconcileLiveQuestion('What is a SageMaker endpoint and what does it actually host?', [sp('?', -14900)]);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe('What is a SageMaker endpoint and what does it actually host?');
        expect(r.anchor).toBeNull();
    });
    it('a fragment interim among real sentences never wins: the best real sentence still decides', () => {
        const r = reconcileLiveQuestion('What is a SageMaker endpoint and what does it actually host?', [
            sp('What is a SageMaker endpoint, and what does it actually host?', -3000),
            sp('Um.', -500, false),
        ]);
        expect(r.verdict).toBe('match');
        expect(r.anchor).toBe('What is a SageMaker endpoint, and what does it actually host?');
    });
});

describe('reconcileLiveQuestion — phantom guard (2026-09-04 after5 hour, Groq REST on a noisy channel)', () => {
    it('M19: a four-word Whisper hallucination is the latest thing said → unverifiable, Live wording kept', () => {
        const live = 'What is your approach to health checks for a model serving container?';
        const r = reconcileLiveQuestion(live, [sp("I'm going to go.", 0)]);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe(live);
        expect(r.anchor).toBeNull();
    });
    it('the guard is looksFragmentary, not isFragment: four words with no question shape do not replace', () => {
        // Four words pass isFragment (< 4); only looksFragmentary refuses this one.
        const live = 'Why do Docker layers matter for build times?';
        const r = reconcileLiveQuestion(live, [sp('Latency is creeping up.', 0)]);
        expect(r.verdict).toBe('unverifiable');
        expect(r.text).toBe(live);
    });
    it('W05: a whole short question the interviewer actually said still replaces an unmatched Live claim', () => {
        // "What is a DAG?" — 4 words, ends in "?", question opener: not fragmentary, so the
        // replacement path is intact for real speech.
        const r = reconcileLiveQuestion('Tell me about a time you handled a resource constraint problem.', [sp('What is a DAG?', 0)]);
        expect(r.verdict).toBe('replaced');
        expect(r.text).toBe('What is a DAG?');
        expect(r.anchor).toBe('What is a DAG?');
    });
});
