import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChipDeduper } from './ChipDeduper';

afterEach(() => {
    vi.useRealTimers();
});

// Live 3.1 re-fires a question it already had answered 20-26 s later (after7: M04 at
// 20.0 s, M27 at 26 s) — past the 20 s window, so the deduper had forgotten it and
// the hour got two answers. An ANSWERED question stays authoritative for 60 s.
describe('ChipDeduper — answered questions suppress re-fires for 60 s', () => {
    it('a re-fire of an answered question at +25 s is suppressed as a duplicate', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const first = d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'whisper' });
        d.markAnswered(first.id);
        vi.advanceTimersByTime(25_000);
        const again = d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'live' });
        expect(again.admitted).toBe(false);
        expect(again.alreadyAnswered).toBe(true);
        expect(again.duplicateAgeMs).toBeGreaterThanOrEqual(25_000);
    });

    it('an UNANSWERED chip still expires after the 20 s window', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'whisper' });
        vi.advanceTimersByTime(25_000);
        expect(d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'live' }).admitted).toBe(true);
    });

    it('an answered entry with fewer than four content words never suppresses by containment past 20 s', () => {
        // after5 W02→W03 at +48 s: the answered "I'm going to go." (one content word) would
        // have suppressed "I'm going to go. When would you use S3 standard versus..." by containment.
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const garbage = d.admit({ question: "I'm going to go.", source: 'whisper' });
        d.markAnswered(garbage.id);
        vi.advanceTimersByTime(48_000);
        expect(d.admit({ question: "I'm going to go. When would you use S3 standard versus infrequent access?", source: 'whisper' }).admitted).toBe(true);
    });

    it('after extend(), the fuller sentence re-fired is a plain duplicate of the answered entry', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const head = d.admit({ question: 'What is a DAG?', source: 'whisper' });
        d.markAnswered(head.id);
        vi.advanceTimersByTime(2_300);
        const fuller = d.admit({ question: 'What is a DAG, and why does Airflow use that structure?', source: 'live' });
        expect(fuller.admitted).toBe(false);
        expect(fuller.duplicateOfQuestion).toBe('What is a DAG?');
        d.extend(fuller.id, 'What is a DAG, and why does Airflow use that structure?');
        vi.advanceTimersByTime(20_000);
        const again = d.admit({ question: 'What is a DAG, and why does Airflow use that structure?', source: 'live' });
        expect(again.admitted).toBe(false);
        expect(again.duplicateOfQuestion).toBe('What is a DAG, and why does Airflow use that structure?');
        expect(again.alreadyAnswered).toBe(true);
    });

    it('a different question sharing the "what is the difference between" frame is admitted at +49 s (after8 W08)', () => {
        // after8 2026-09-07: W07 answered at 07:18:39, W08 at 07:19:28 — the anchor rule matched
        // the two anchors on frame words alone (overlap 0.75) and W08 was never answered.
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const w07 = d.admit({ question: 'What is the difference between a pod and a deployment?', source: 'whisper', anchor: 'What is the difference between a pod and a deployment?' });
        d.markAnswered(w07.id);
        vi.advanceTimersByTime(49_000);
        expect(d.admit({ question: 'What is the difference between data drift and concept drift?', source: 'whisper', anchor: 'What is the difference between data drift and concept drift?' }).admitted).toBe(true);
    });

    it('the fuller sentence is a duplicate of the answered head across the ears\' "p 99." / "P99," differences (after8 H02)', () => {
        // after8 2026-09-07 07:58: Deepgram's scenario-merged head "has p 99 latency creeping up. How…"
        // was answered; Live's full sentence 1.1 s later said "P99 … up, how" and became a second answer.
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const head = d.admit({ question: 'has p 99 latency creeping up. How do you diagnose and fix it?', source: 'whisper', anchor: 'has p 99 latency creeping up. How do you diagnose and fix it?' });
        d.markAnswered(head.id);
        vi.advanceTimersByTime(1_100);
        const full = d.admit({
            question: 'A SageMaker endpoint serving ten thousand requests per second has P99 latency creeping up, how do you diagnose and fix it?',
            source: 'live',
            // the interviewer STT final Live's claim reconciled to — cut where the merge took the rest
            anchor: 'A SageMaker endpoint serving 10,000 requests per second has p',
        });
        expect(full.admitted).toBe(false);
        expect(full.alreadyAnswered).toBe(true);
    });

    it('an answered question is forgotten after 60 s', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const first = d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'whisper' });
        d.markAnswered(first.id);
        vi.advanceTimersByTime(61_000);
        expect(d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'live' }).admitted).toBe(true);
    });
});
