/**
 * Small talk is not a question to answer (2026-10-12 st25-smoke: ST02 "Can you hear me okay?",
 * ST03 "How are you doing today?", ST04 "Did you have a good weekend?" each got a Groq
 * detected=true conf 0.99 and a hands-free answer). The detector is a model, so this is a
 * deterministic pre-filter on the dispatch path: a small pinned set of whole-sentence patterns
 * (greetings, well-being, connection/audio checks, weekend/weather/travel pleasantries).
 *
 * The text is small talk only when EVERY sentence of it is one: "Hi, thanks for joining. Tell me
 * about yourself." carries a real question and is never dropped. Patterns are anchored at both
 * ends, so "How are you doing with the migration?" or "How are you handling retries?" do not match.
 * Ceiling: English only, a fixed phrase list; add a pattern when a new pleasantry shows up in a run.
 */

const TIME = '(?:today|this morning|this afternoon|this evening|these days|lately)';
const OK = '(?:ok|okay|alright|all right|fine|well|clearly|properly)';

const PATTERNS: RegExp[] = [
    // greetings and thanks for joining
    new RegExp(`^(?:hi|hello|hey|hiya)(?: there| everyone)?(?: ${TIME})?$`),
    /^good (?:morning|afternoon|evening)(?: to you)?$/,
    /^(?:nice|good|great|pleasure) to (?:meet|see) you(?: too)?$/,
    /^thanks?(?: so much)?(?: for (?:joining|coming|making the time|being here|taking the time))?(?: today)?$/,
    /^thank you(?: so much)?(?: for (?:joining|coming|making the time|being here|taking the time))?(?: today)?$/,
    /^welcome(?: to the call)?$/,
    // well-being
    new RegExp(`^how are you(?: doing)?(?: ${TIME})?$`),
    new RegExp(`^how(?:'s| is) it going(?: ${TIME})?$`),
    new RegExp(`^how(?:'s| is) (?:your|the) (?:day|morning|afternoon|week) (?:going|been)(?: so far)?$`),
    /^how have you been(?: lately)?$/,
    /^i hope you(?:'re| are) (?:doing )?well$/,
    // connection and audio checks
    new RegExp(`^can you (?:hear|see) me(?: ${OK})?$`),
    new RegExp(`^can you (?:hear|see) me and (?:hear|see) (?:me|us)(?: ${OK})?$`),
    new RegExp(`^can you (?:hear|see) (?:us|my screen|the screen|my video)(?: ${OK})?$`),
    new RegExp(`^(?:is )?(?:my )?(?:audio|sound|video|mic|microphone) (?:ok|okay|alright|fine|clear|working)$`),
    new RegExp(`^(?:am i|are we) (?:audible|coming through)(?: ${OK})?$`),
    new RegExp(`^(?:you )?can you hear me(?: ${OK})?(?: now)?$`),
    // weekend / weather / travel pleasantries
    /^did you have (?:a|an) (?:good|nice|great|lovely|relaxing|restful) (?:weekend|holiday|break|day|evening)$/,
    /^how was your (?:weekend|holiday|break|commute|trip|flight|journey|travel|day|morning)$/,
    /^how(?:'s| is) the weather(?: (?:over )?(?:there|where you are|today|in [a-z ]+))?$/,
    /^(?:any|do you have any) plans for the (?:weekend|holidays?|week)$/,
    /^did you find (?:us|the (?:place|office|link)) (?:ok|okay|alright|easily)$/,
];

function sentences(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .split(/[.!?？,;]+/)
        .map((s) => s.replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

/** True when the whole text is greetings / well-being / connection checks / weekend-weather-travel pleasantries. */
export function isSmallTalk(text: string): boolean {
    const parts = sentences(text);
    if (parts.length === 0) return false;
    return parts.every((p) => PATTERNS.some((re) => re.test(p)));
}
