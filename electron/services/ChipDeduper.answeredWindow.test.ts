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

    it('an answered question is forgotten after 60 s', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const first = d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'whisper' });
        d.markAnswered(first.id);
        vi.advanceTimersByTime(61_000);
        expect(d.admit({ question: 'When would you reach for a service mesh in an ML serving stack?', source: 'live' }).admitted).toBe(true);
    });
});
