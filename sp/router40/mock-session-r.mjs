// router40 dry mode: live40's fake Live session (mock-session.mjs, copied, anchored changes) on a VIRTUAL clock. No network, no key.
// Changes vs live40: (1) a per-id reply script: the mock asks opts.kindFor() what the current item gets: 'hard' (one word), 'words40' (5 pieces x 8 words,
// as live40's long answer), 'silent' (no output at all); (2) opts.failAfterChunks as before (attempt 1 of a chain closes 1011 mid-clip).
// ZERO_RUN 14 chunks (840 ms) exceeds the longest all-zero run inside any live40 clip (12 chunks; RH18's pause).
export const MOCK = { ZERO_RUN: 14, AUDIO_MS: 500, TEXT_MS: 700, PIECE_MS: 400, PIECE_WORDS: 8, PIECES: 5, GEN_MS: 200, TURN_MS: 300 };
/** The default reply kind per item (known script for dry-check-r): easy -> words40 except RE05 (silent); hard -> 'hard' except EF02 (words40: an answered AF). */
export const defaultKind = (item) => (item.id === 'RE05' ? 'silent' : item.id === 'EF02' ? 'words40' : item.class === 'E' ? 'words40' : 'hard');
const WORD8 = 'this is the mock answer for a test'; // 8 English words (function words included, so the reader classes a words40 reply as an answer)
export const vclock = { t: 0 };
const queue = []; let seq = 0;
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
        const kind = opts.kindFor ? opts.kindFor() : 'words40', now = vclock.t;
        if (kind === 'silent') return;
        const pieces = kind === 'hard' ? 1 : MOCK.PIECES;
        schedule(now + MOCK.AUDIO_MS, () => emit(() => cb.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAAA' } }] } } })));
        let last = 0;
        for (let i = 0; i < pieces; i++) {
            last = now + MOCK.TEXT_MS + i * MOCK.PIECE_MS;
            const text = kind === 'hard' ? 'Hard.' : `${WORD8} `;
            schedule(last, () => emit(() => cb.onmessage({ serverContent: { outputTranscription: { text } } })));
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
