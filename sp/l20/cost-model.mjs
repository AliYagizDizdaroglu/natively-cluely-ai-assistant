// Throwaway: per-interview cost model for (1) gemini-3.8-live alone and (2) today's pipeline answering with
// gemini-3.8-flash. Every constant is a measurement from this session or a price read from the vendor page
// 2026-09-28 (ai.google.dev/gemini-api/docs/pricing, deepgram.com/pricing, Groq via third-party listings).
const M = 1e6;
// Prices, USD per 1M tokens (paid tier, standard).
const LIVE = { inText: 0.75, inAudio: 3.0, outAudio: 12.0, outText: 4.5 };          // Gemini 3.8 Live (thinking = output text)
const FLASH38 = { in: 0.75, out: 3.75 }, FLASH38_2027 = { in: 1.5, out: 7.5 };        // Gemini 3.8 Flash, promo through 2026-12-31
const LITE31 = { in: 0.25, out: 1.5 };                                                 // Gemini 3.1 Flash-Lite (today's answerer)
const DG_MIN = 0.0048, DG_MIN_REGULAR = 0.0077, DG_KEYTERM_MIN = 0.0013;             // Deepgram Nova-3 streaming, per minute
const GROQ_HOUR = 0.02;                                                               // gpt-oss-20b detection, ~150K in + ~30K out
// Measured (this session): 3.8 Live system instruction 5135 text tokens; audio input ~33 tokens per second of
// interviewer speech (879 tokens for the 26.2 s S1Q02 clip); answer audio 615 tokens; thinking 345 tokens (L20
// mean of 36); the answer's audio stays in the session context. Silence between turns is not added.
const SYS = 5135, AUDIO_PER_S = 879 / 26.2, ANSWER_AUDIO = 615, THINK = 345;
// App answer requests: captured prompts 4973 tokens (countTokens, 39 prompts); answer ~200 tokens; thinking 3.8 Flash
// 638 (16 recorded answers), 3.1 Flash-Lite 704 (195 recorded answers). ~1.25 requests per question (re-answers).
const APP_IN = 4973, APP_OUT = 200, THINK38F = 638, THINK31L = 704, REQ_PER_Q = 1.25;
const EAR_SYS = 350; // the Live ear's instructions + tool declaration (~1.1K chars)

function liveSession({ questions, speechSecPerQ, turnsPerQ, sys, answerAudio, think, prices }) {
    // Turns are spread evenly; every turn re-bills everything in the session so far (Google Cloud's documented rule).
    const N = questions * turnsPerQ, perTurnAudio = (speechSecPerQ * AUDIO_PER_S + answerAudio) / turnsPerQ;
    let inText = 0, inAudio = 0;
    for (let k = 0; k < N; k++) { inText += sys; inAudio += perTurnAudio * k + (speechSecPerQ * AUDIO_PER_S) / turnsPerQ; }
    const out = (questions * answerAudio * prices.outAudio + questions * think * prices.outText) / M;
    const rebilled = (inText * prices.inText + inAudio * prices.inAudio) / M + out;
    const once = (sys * prices.inText + questions * speechSecPerQ * AUDIO_PER_S * prices.inAudio) / M + out;
    return { rebilled, once };
}
const fmt = (x) => `$${x.toFixed(2)}`;
for (const questions of [40, 20]) {
    const speech = 14.5; // s per question: the scenario50 S1+S2 hour (40 items, 582 s of interviewer speech)
    console.log(`\n=== ${questions} questions in the hour, ${(questions * speech / 60).toFixed(1)} min of interviewer speech ===`);
    for (const turnsPerQ of [1, 2]) {
        const a = liveSession({ questions, speechSecPerQ: speech, turnsPerQ, sys: SYS, answerAudio: ANSWER_AUDIO, think: THINK, prices: LIVE });
        const ear = liveSession({ questions, speechSecPerQ: speech, turnsPerQ, sys: EAR_SYS, answerAudio: 0, think: 0, prices: LIVE });
        const req = questions * REQ_PER_Q;
        const ans38 = req * (APP_IN * FLASH38.in + (APP_OUT + THINK38F) * FLASH38.out) / M;
        const ans38b = req * (APP_IN * FLASH38_2027.in + (APP_OUT + THINK38F) * FLASH38_2027.out) / M;
        const ans31 = req * (APP_IN * LITE31.in + (APP_OUT + THINK31L) * LITE31.out) / M;
        const dg = 60 * DG_MIN;
        const rest = dg + GROQ_HOUR + ear.rebilled;
        console.log(`turns per question ${turnsPerQ}:`);
        console.log(`  (1) 3.8 Live alone: ${fmt(a.rebilled)} re-billed per turn (${fmt(a.once)} if each token were billed once)`);
        console.log(`  (2) pipeline + 3.8 Flash: answers ${fmt(ans38)} (${fmt(ans38b)} from 2027) + Deepgram ${fmt(dg)} (regular ${fmt(60 * DG_MIN_REGULAR)}, keyterms +${fmt(60 * DG_KEYTERM_MIN)}) + Groq ${fmt(GROQ_HOUR)} + Live ear ${fmt(ear.rebilled)} (${fmt(ear.once)} once) = ${fmt(ans38 + rest)}`);
        console.log(`      today's 3.1 Flash-Lite answers instead: ${fmt(ans31)} -> total ${fmt(ans31 + rest)}`);
    }
}
