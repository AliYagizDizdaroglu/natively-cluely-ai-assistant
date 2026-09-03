import { describe, it, expect } from 'vitest';
import {
    SUMMARY_CONTEXT_CHAR_CAP,
    TITLE_CONTEXT_CHAR_CAP,
    clampSummaryContext,
} from './summaryContextLimits';

// Regression guard for a measured defect: MeetingPersistence truncated the
// summary input with context.substring(0, 10000). Measured against a transcript
// built at 150 wpm, that is ~the first 10.2 minutes of speech REGARDLESS of
// session length — a 90-minute interview was summarized from 11.4% of itself.
//
// Sizing reference (measured with the countTokens API, 150 wpm, two speakers):
//   30 min ->  29,400 chars
//   60 min ->  58,708 chars
//   90 min ->  88,012 chars
//  120 min -> 117,313 chars
const CHARS_PER_MIN = 29400 / 30; // 980 chars per minute of interview speech
const transcriptChars = (minutes: number) => 'x'.repeat(Math.round(CHARS_PER_MIN * minutes));

describe('summary context limits', () => {
    it('does not truncate a 90-minute interview (the case that regressed)', () => {
        const t = transcriptChars(90);
        expect(clampSummaryContext(t, SUMMARY_CONTEXT_CHAR_CAP)).toHaveLength(t.length);
    });

    it('does not truncate a 2-hour interview', () => {
        const t = transcriptChars(120);
        expect(clampSummaryContext(t, SUMMARY_CONTEXT_CHAR_CAP)).toHaveLength(t.length);
    });

    it('the old 10k cap would have truncated 90 minutes — proving this test can fail', () => {
        // Calibration: if this assertion ever stops holding, the fixture is wrong
        // and the tests above would pass for the wrong reason.
        const t = transcriptChars(90);
        expect(clampSummaryContext(t, 10_000)).toHaveLength(10_000);
        expect(t.length).toBeGreaterThan(10_000);
    });

    it('still bounds absurd input rather than sending it all', () => {
        const huge = 'x'.repeat(SUMMARY_CONTEXT_CHAR_CAP * 3);
        expect(clampSummaryContext(huge, SUMMARY_CONTEXT_CHAR_CAP))
            .toHaveLength(SUMMARY_CONTEXT_CHAR_CAP);
    });

    it('stays under the Groq routing threshold that generateMeetingSummary uses', () => {
        // LLMHelper.generateMeetingSummary sends to Groq only when
        // estimateTokens(context) < 100000, where estimateTokens = ceil(len/4).
        // Keeping the cap at or below that threshold means the summary chain's
        // preferred provider stays reachable instead of always falling to Gemini.
        expect(Math.ceil(SUMMARY_CONTEXT_CHAR_CAP / 4)).toBeLessThanOrEqual(100_000);
    });

    it('title cap covers a long session but stays smaller than the summary cap', () => {
        // A title is 3-6 words; paying for the whole transcript to produce it is
        // waste, but 5k chars (~5 min) was too little to name a 90-min meeting.
        expect(TITLE_CONTEXT_CHAR_CAP).toBeGreaterThan(5_000);
        expect(TITLE_CONTEXT_CHAR_CAP).toBeLessThan(SUMMARY_CONTEXT_CHAR_CAP);
    });

    it('handles empty and short input unchanged', () => {
        expect(clampSummaryContext('', SUMMARY_CONTEXT_CHAR_CAP)).toBe('');
        expect(clampSummaryContext('short', SUMMARY_CONTEXT_CHAR_CAP)).toBe('short');
    });
});
