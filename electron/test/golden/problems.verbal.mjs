/**
 * GOLDEN VERBAL SET — spoken-answer questions for the verbal-technical and
 * behavioral routes.
 *
 * These answers are READ ALOUD, so every check here is about speakability, not
 * prose quality. All of them are objective; none needs an LLM judge (judged
 * scores on this project swung ±0.70 and reversed ordering at n=10, so they
 * cannot separate models at this sample size and are deliberately absent).
 *
 * Routing under test (WhatToAnswerLLM.generateStream):
 *   verbal-technical -> the user's selected model, VERBAL_WHAT_TO_ANSWER_PROMPT
 *   behavioral       -> gemini-3.1-flash-lite (forced for speed), same prompt
 */

export const VERBAL_TECHNICAL = [
  'Can you walk me through how a database index actually speeds up a query?',
  'What happens when two threads try to write to the same hash map at once?',
  'How would you decide between a message queue and a direct HTTP call between two services?',
  'Explain what a database transaction isolation level actually controls.',
  'Why might adding more shards to a cluster not improve throughput?',
  'What is the difference between a process and a thread, and when does it matter?',
];

export const BEHAVIORAL = [
  'Tell me about a time you disagreed with your manager.',
  'Describe a project that failed and what you took from it.',
  'How do you handle competing deadlines from two different stakeholders?',
  'Tell me about a time you had to give difficult feedback to a teammate.',
];

/**
 * Checks applied to every spoken answer, after the REAL shipped stream filter.
 * Each returns { ok, detail }.
 */
export const VERBAL_CHECKS = {
  /** The path produced something at all. */
  nonempty: ({ spoken }) => ({ ok: spoken.trim().length > 0, detail: `${spoken.trim().length} chars` }),

  /**
   * The __MORE__ sentinel must never reach the listener. The runner feeds the
   * response through the filter in adversarial chunks — including a boundary
   * placed mid-sentinel — because that is the only place a streaming guard leaks.
   */
  sentinel_clean: ({ spoken, sentinel }) => ({
    ok: !spoken.includes(sentinel) && !/_{2}MORE/.test(spoken),
    detail: 'no __MORE__ in spoken text',
  }),

  /** Within the spoken word budget the prompt commits to. */
  budget: ({ wordCount, budget }) => ({
    ok: wordCount <= budget,
    detail: `${wordCount}/${budget} words`,
  }),

  /**
   * Depth offers are LABELS, not questions, and never address the listener.
   * At most 3, per the prompt.
   */
  offers_wellformed: ({ offers }) => {
    const list = offers || [];
    const bad = list.filter((o) => {
      const t = (o?.label ?? o?.text ?? String(o)).trim();
      return !t || t.includes('?') || /\byou\b/i.test(t);
    });
    return { ok: list.length <= 3 && bad.length === 0, detail: `${list.length} offers, ${bad.length} malformed` };
  },

  /**
   * No notation that a TTS layer would read out literally.
   * MEASURED 2026-08-24: one answer contained "$O(\\log n)$", which is spoken as
   * "dollar sign O of backslash log n". The stream filter has line-drop and
   * opener-rewrite rules but no math/markdown stripping, so this is a real gap
   * and belongs in the golden set as a guard.
   */
  no_notation: ({ spoken }) => {
    const hits = [];
    if (/\$/.test(spoken)) hits.push('LaTeX $');
    if (/\\[a-z]+/.test(spoken)) hits.push('backslash-command');
    if (/[*_]{2}/.test(spoken)) hits.push('markdown bold');
    if (/`/.test(spoken)) hits.push('backtick');
    // Flight s50b 2026-09-11: 5 of 20 in-app answers were "1. … 2. … 3. …" lists.
    if (/(^|\n)\s*(\d{1,2}[.)]|[-*•])\s/.test(spoken)) hits.push('list marker');
    return { ok: hits.length === 0, detail: hits.length ? hits.join(', ') : 'clean' };
  },

  /** A spoken answer should end on a finished sentence, not mid-clause. */
  ends_cleanly: ({ spoken }) => ({
    ok: /[.!?]["')]?$/.test(spoken.trim()),
    detail: JSON.stringify(spoken.trim().slice(-24)),
  }),
};

/**
 * Calibration for the notation check: it must flag these and pass the clean one.
 * Run by calibrate.mjs — a check that cannot fail proves nothing.
 */
export const NOTATION_CALIBRATION = {
  mustFlag: [
    'This runs in $O(\\log n)$ time.',
    'Use the **fastest** path here.',
    'Call `map.get(key)` first.',
    'I validate k first.\n\n1. I sort by score.\n2. I slice the top k.',
    '- first point\n- second point',
    'the reciprocal rank as $1 / (c + rank) for each list.',
  ],
  mustPass: [
    'This runs in logarithmic time, so it stays fast as the table grows.',
    '2.5 words per question word is the budget, and 30 days of history is enough.',
  ],
};
