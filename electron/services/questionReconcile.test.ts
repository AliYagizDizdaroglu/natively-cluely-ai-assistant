import { describe, it, expect } from 'vitest';
import { overlap, sameAnchor, reconcileLiveQuestion, reconcileWindowMs, type RecentSpeech } from './questionReconcile';

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
    it('M04: Live invented a question; the interim transcript carried the real one → unverifiable while the interim is mid-sentence, replaced by the final', () => {
        const live = 'Tell me about a time you handled a resource constraint problem in a deployment.';
        // The interim at that instant ended mid-clause ("…configuring things by"): a head, not
        // evidence of the whole question (head-fragment rule, spec 2026-09-05 §3). Live's wording
        // is kept for the Live hold, which re-reconciles on the next interviewer final.
        const interim = reconcileLiveQuestion(live, [sp('Why would you use CloudFormation instead of configuring things by', -5000, false)]);
        expect(interim.verdict).toBe('unverifiable');
        expect(interim.text).toBe(live);
        expect(interim.anchor).toBeNull();
        // The final is a whole sentence: it replaces the invented question, as the 2026-09-02 log needed.
        const said = 'Why would you use CloudFormation instead of configuring things by hand in the console?';
        const final = reconcileLiveQuestion(live, [sp(said, -3000, true)]);
        expect(final.verdict).toBe('replaced');
        expect(final.text).toBe(said);
        expect(final.anchor).toBe(said);
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

describe('reconcileWindowMs — how far back the transcript must be read to cover a claim', () => {
    // after9 measured 79 spoken clips: 2.66 words/sec median, 2.24 at p10, 1.71 min. The six
    // long questions ran 24.6-28.5s and Live reported them 3.3-5.3s after the clip ended.
    // A fixed 15s window therefore covered only the tail of a long question, and L03 was
    // answered as "that people do not start ignoring it." — the transcript line the
    // reconciler fell back to once Live's whole question scored below the floor.
    it('keeps the 15s floor for a short claim, so nothing changes for ordinary questions', () => {
        expect(reconcileWindowMs('What is a DAG?')).toBe(15_000);
        expect(reconcileWindowMs('How would you detect data drift in a model that is already in production?')).toBe(15_000);
    });
    it('covers L03: 69 words spoken in 25.9s, reported 5.3s after the clip ended', () => {
        const L03 = 'Let\'s talk about monitoring. Say you have twenty models in production, owned by four different teams, '
            + 'and today each team watches its own dashboards by hand. Design me a monitoring setup that catches data '
            + 'drift, prediction drift, and plain infrastructure problems, tells you which team owns the alert, and '
            + 'keeps the false alarm rate low enough that people do not start ignoring it.';
        expect(reconcileWindowMs(L03)).toBeGreaterThan(25_900 + 5_300);
    });
    it('covers L04, the longest in the roster: 84 words in 28.5s, reported 4.5s later', () => {
        const claim = new Array(84).fill('feature').join(' ');
        expect(reconcileWindowMs(claim)).toBeGreaterThan(28_500 + 4_500);
    });
    it('caps a runaway claim so the window cannot swallow the previous question', () => {
        expect(reconcileWindowMs(new Array(500).fill('word').join(' '))).toBeLessThanOrEqual(60_000);
    });
});

describe('reconcileLiveQuestion — a question longer than any single transcript line', () => {
    // after9 L03, verbatim: the Deepgram finals of the hour, offsets from the moment Live
    // reported the question. The question took 25.9s to ask and Live reported it 5.3s later,
    // so it is spread over seven lines and covers at most 0.19 of any one of them — below the
    // floor, and the hour answered the last line instead: "that people do not start ignoring it."
    const L03_WINDOW: RecentSpeech[] = [
        sp("Let's talk about monitoring.", -27562),
        sp('Say you have 20 models in production owned by four different teams,', -22383),
        sp('and today each team watches its own dashboards by hand.', -19005),
        sp('Design me a monitoring setup that catches data drift,', -13794),
        sp('prediction drift, and plain infrastructure failures across all of them,', -10522),
        sp('and explain who gets paged for what, and how you would keep the false alarms low enough', -6199),
        sp('that people do not start ignoring it.', -4005),
    ];
    const L03_CLAIM = 'Say you have twenty models in production, owned by four different teams, and today each team '
        + 'watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction '
        + 'drift, and plain infrastructure problems, tells you which team owns the alert, and keeps the false '
        + 'alarm rate low enough that people do not start ignoring it.';

    it('is corroborated by the window as a whole, not by any one line of it', () => {
        const r = reconcileLiveQuestion(L03_CLAIM, L03_WINDOW);
        expect(r.verdict).toBe('match');
        expect(r.text).toBe(L03_CLAIM);
        // The anchor stays a SINGLE line — the best-scoring one — so the deduper keeps
        // comparing one utterance against one utterance. Without this the anchor could drift
        // to the latest line and nothing would fail.
        expect(r.anchor).toBe('Say you have 20 models in production owned by four different teams,');
    });

    it('promotes an unverifiable claim, which is the promotion that changes behaviour', () => {
        // Deepgram's last interim before Live reports often ends mid-clause. That made the
        // latest line fragmentary, so the claim came out UNVERIFIABLE (score 0.19, anchor null)
        // and main.ts diverted it to liveHold instead of dispatching it. The three long
        // questions this happened to in after9 scored 0.95-0.97 on the joined window.
        const withMidClauseTail = [...L03_WINDOW, sp('and how you would keep', -1200, false)];
        const r = reconcileLiveQuestion(L03_CLAIM, withMidClauseTail);
        expect(r.verdict).toBe('match');
        expect(r.text).toBe(L03_CLAIM);
    });

    // after8 07:36:26, verbatim: Live claimed a question nobody asked. It shares exactly two
    // content words with the real one ("multiple", "cluster"), which puts the JOINED window at
    // 0.25 — the paraphrase floor. Corroborating on the join at that floor would keep the
    // invented question, the failure this whole reconciler exists to prevent (2026-09-02 M04),
    // so the join is held to MATCH instead. The genuine long questions clear it at 0.95-1.00.
    it('does not let a union of unrelated speech corroborate an invented question', () => {
        const r = reconcileLiveQuestion('How would you approach deploying multiple versions of the same model in one cluster?', [
            sp('How do you manage GPU resources across multiple teams', -8090),
            sp('sharing one cluster?', -6695),
        ]);
        expect(r.verdict).toBe('unverifiable');
    });
});
