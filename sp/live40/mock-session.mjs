// live40 dry mode: a fake Live session on a VIRTUAL clock (no network, no key). run.mjs --dry streams the real clips into it.
// The fake "hears" the end of a question as ZERO_RUN consecutive all-zero audio chunks after non-zero ones (like a VAD endpoint), then answers on a
// fixed script, so the metrics run.mjs derives have known values: audio at +AUDIO_MS, first text at +TEXT_MS, one piece of PIECE_WORDS words every
// PIECE_MS, generationComplete +GEN_MS after the last piece, turnComplete +TURN_MS after that. Every SHORT_EVERY-th answer is one 3-word piece
// (exercises the 30 s quiet path). opts.failAfterChunks (attempt 1 of one chain) closes the socket with code 1011 mid-clip (exercises the retry).
// ZERO_RUN 14 chunks (840 ms) exceeds the longest all-zero run inside any live40 clip (12 chunks; the SAPI clips carry ~0.6 s of digital silence at their END, RH18 has a 12-chunk pause inside)
export const MOCK = { ZERO_RUN: 14, AUDIO_MS: 500, TEXT_MS: 700, PIECE_MS: 400, PIECE_WORDS: 8, PIECES: 5, GEN_MS: 200, TURN_MS: 300, SHORT_EVERY: 7, SHORT_WORDS: 3 };
export const vclock = { t: 0 };
const queue = []; let seq = 0, answerNo = 0;
const schedule = (at, fn) => queue.push({ at, fn, seq: seq++ });
function runDue(target) {
    for (;;) {
        queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
        const nx = queue[0];
        if (!nx || nx.at > target) break;
        queue.shift(); vclock.t = Math.max(vclock.t, nx.at); nx.fn();
    }
    vclock.t = target;
}
export async function vsleep(ms) { runDue(vclock.t + ms); await Promise.resolve(); }

export function mockConnect(cb, opts = {}) {
    let speech = false, zeroRun = 0, chunks = 0, dead = false;
    const emit = (fn) => { if (!dead) fn(); };
    schedule(vclock.t, () => emit(() => cb.onopen()));
    schedule(vclock.t + 50, () => emit(() => cb.onmessage({ setupComplete: {} })));
    function respond() {
        answerNo++;
        const short = answerNo % MOCK.SHORT_EVERY === 0, now = vclock.t;
        const pieces = short ? 1 : MOCK.PIECES, words = short ? MOCK.SHORT_WORDS : MOCK.PIECE_WORDS;
        schedule(now + MOCK.AUDIO_MS, () => emit(() => cb.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAAA' } }] } } })));
        let last = 0;
        for (let i = 0; i < pieces; i++) {
            last = now + MOCK.TEXT_MS + i * MOCK.PIECE_MS;
            schedule(last, () => emit(() => cb.onmessage({ serverContent: { outputTranscription: { text: Array(words).fill('mock').join(' ') + ' ' } } })));
        }
        schedule(last + MOCK.GEN_MS, () => emit(() => cb.onmessage({ serverContent: { generationComplete: true } })));
        schedule(last + MOCK.GEN_MS + MOCK.TURN_MS, () => emit(() => cb.onmessage({ serverContent: { turnComplete: true } })));
    }
    return {
        sendRealtimeInput({ audio }) {
            if (dead) return;
            chunks++;
            const b = Buffer.from(audio.data, 'base64');
            let nz = false; for (let i = 0; i < b.length; i++) if (b[i] !== 0) { nz = true; break; }
            if (nz) { speech = true; zeroRun = 0; }
            else if (speech && ++zeroRun >= MOCK.ZERO_RUN) { speech = false; zeroRun = 0; respond(); }
            if (opts.failAfterChunks && chunks === opts.failAfterChunks) { dead = true; queue.length = 0; schedule(vclock.t, () => cb.onclose({ code: 1011, reason: 'mock abnormal close' })); }
        },
        close() { if (!dead) { dead = true; schedule(vclock.t, () => cb.onclose({ code: 1000, reason: '' })); } },
    };
}
