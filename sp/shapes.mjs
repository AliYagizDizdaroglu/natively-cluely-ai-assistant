// THROWAWAY: ONE question, many SHAPES.
//
// The interview's actual questions are unknown, so tuning the roster to them is
// worthless. What generalises is whether the pipeline survives the SHAPES a question
// can take. Every variant below carries the SAME facts — the same numbers, the same
// acronyms, the same ask — so any difference in what the detector reports is caused by
// the shape and nothing else.
//
// ENTITIES are the second axis. Live was measured turning "95.4 percent" into "90.5"
// and dropping a number entirely (scenario50 S2Q02). These questions are seeded with
// numbers and acronyms that must survive verbatim, because an answer computed from
// altered numbers is wrong no matter how good the model is.

/** Facts every shape must carry. Checked verbatim against what the detector reports. */
export const ENTITIES = {
    'p99': /\bp\s?99\b/i,
    '800 ms': /\b800\b/,
    '500 ms SLA': /\b500\b/,
    '4,000 rps': /\b4[,.]?000\b/,
    'SLA': /\bSLA\b/i,
};

const ASK = 'How would you bring it back under the SLA';

export const SHAPES = [
    {
        id: 'plain', why: 'baseline: one sentence, the ask and the facts together',
        text: "Our inference service has a p99 latency of 800 milliseconds against an SLA of 500, at about 4,000 requests per second. How would you bring it back under the SLA?",
    },
    {
        id: 'titleFirst', why: 'a COMPLETE imperative ask, full stop, then the facts — the shape that broke scenario50',
        text: "Optimize our inference latency. Our service has a p99 of 800 milliseconds against an SLA of 500, at about 4,000 requests per second. How would you bring it back under the SLA?",
    },
    {
        id: 'merged', why: 'same words as titleFirst, joined with a colon so nothing stands alone',
        text: "Optimize our inference latency: our service has a p99 of 800 milliseconds against an SLA of 500, at about 4,000 requests per second. How would you bring it back under the SLA?",
    },
    {
        id: 'askLast', why: 'the ask arrives only at the very end, after 40 words of setup',
        text: "So we run an inference service behind a load balancer, it serves a recommendation model, traffic is about 4,000 requests per second on a normal day, the p99 latency is sitting at 800 milliseconds and our SLA says 500. How would you bring it back under the SLA?",
    },
    {
        id: 'askFirst', why: 'the ask arrives first and the facts follow — the detector may fire before hearing them',
        text: "How would you bring our inference latency back under the SLA? The p99 is 800 milliseconds, the SLA is 500, and we serve about 4,000 requests per second.",
    },
    {
        id: 'twoPart', why: 'two asks in one turn — a single chip cannot represent both',
        text: "Our p99 is 800 milliseconds against an SLA of 500 at 4,000 requests per second. How would you bring it back under the SLA? And separately, how would you know the fix actually held?",
    },
    {
        id: 'selfCorrect', why: 'the interviewer restarts mid-question; the first half is not the question',
        text: "How would you scale the... actually, let me put that differently. Our p99 is 800 milliseconds against an SLA of 500 at 4,000 requests per second. How would you bring it back under the SLA?",
    },
    {
        id: 'filler', why: 'hedged, conversational opening before the real ask',
        text: "So, um, I guess what I'm really asking is this. We've got a p99 of 800 milliseconds, the SLA is 500, and we're at about 4,000 requests per second. How would you bring it back under the SLA?",
    },
    {
        id: 'trailing', why: 'chatter AFTER the ask — the detector may anchor on the tail',
        text: "Our p99 is 800 milliseconds against an SLA of 500 at 4,000 requests per second. How would you bring it back under the SLA? Take your time, there's no single right answer here.",
    },
    {
        id: 'longRamble', why: '70+ words with the facts buried in the middle',
        text: "Let me give you some background before I ask this. We have a recommendation service that a few product teams depend on, it has grown organically over about two years, nobody has really owned the performance work, and lately the numbers have got worse. The p99 latency is 800 milliseconds now, our SLA with those teams is 500, and we are serving roughly 4,000 requests per second at peak. How would you bring it back under the SLA?",
    },
];

export const INTENDED = ASK;
