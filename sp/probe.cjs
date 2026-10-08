const M = require('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/dist-electron/electron/llm/verbalStreamFilter.js');
const { cutAtWordBudget, SPOKEN_WORD_GUARD, stripSpokenNotation } = M;

const words = (s) => (s.match(/\S+/g) ?? []).length;
const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';

async function run(text, opts, size = 9) {
  const src = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })();
  let done = null, out = '';
  for await (const c of cutAtWordBudget(src, { ...opts, onDone: (r) => { done = r; } })) out += c;
  return { out, done };
}
async function runChunks(chunks, opts) {
  const src = (async function* () { for (const c of chunks) yield c; })();
  let done = null, out = '';
  for await (const c of cutAtWordBudget(src, { ...opts, onDone: (r) => { done = r; } })) out += c;
  return { out, done };
}
const G = SPOKEN_WORD_GUARD;
const L = (...a) => console.log(...a);

(async () => {
  // --- CALIBRATION: a case whose answer is known independently ---
  {
    const t = 'one two three four five.';
    const { out, done } = await run(t, G, 3);
    L('[cal] short text identity:', out === t, JSON.stringify(done));
    // and a case that MUST be cut: 210 words, ceiling 100
    const t2 = Array.from({ length: 210 }, (_, k) => `x${k}`).join(' ');
    const r2 = await run(t2, { limit: 100, floor: 100, ceiling: 100 }, 7);
    L('[cal] ceiling 100 forces cut:', words(r2.out), JSON.stringify(r2.done));
  }

  // (a) exactly 200 words ending in "."
  {
    const text = [1, 2, 3, 4, 5].map((i) => sentence(40, i)).join(' ');
    L('\n(a) input words =', words(text));
    for (const size of [1, 2, 3, 9, 40, 1000]) {
      const { out, done } = await run(text, G, size);
      L(`  size=${size} identical=${out === text} done=${JSON.stringify(done)}`);
    }
  }

  // (b) 201 words
  {
    const text = Array.from({ length: 201 }, (_, k) => `w${k}`).join(' ') + '.';
    L('\n(b) 201 words, input words =', words(text));
    for (const size of [1, 2, 3, 9, 40, 1000]) {
      const { out, done } = await run(text, G, size);
      L(`  size=${size} words=${words(out)} cut=${done && done.cut} prefix=${text.startsWith(out)} endsWS=${/\s$/.test(out)} nextIsNonWS=${/^\S/.test(text.slice(out.length))} tail=${JSON.stringify(out.slice(-12))}`);
    }
    // multi-sentence 201: sentence(46)x5 = 230, from the repo test
    const t230 = [1, 2, 3, 4, 5].map((i) => sentence(46, i)).join(' ');
    for (const size of [1, 2, 3, 9, 40, 1000]) {
      const { out, done } = await run(t230, G, size);
      L(`  [230w] size=${size} words=${words(out)} done=${JSON.stringify(done)} prefix=${t230.startsWith(out)} endsWS=${/\s$/.test(out)}`);
    }
  }

  // (c) single sentence of 250 words, NO terminator at all
  {
    const text = Array.from({ length: 250 }, (_, k) => `q${k}`).join(' ');
    L('\n(c) 250 words no terminator:');
    for (const size of [1, 9, 1000]) {
      const { out, done } = await run(text, G, size);
      L(`  size=${size} words=${words(out)} done=${JSON.stringify(done)} endsWS=${/\s$/.test(out)} lastTok=${JSON.stringify((out.match(/\S+/g)||[]).slice(-1)[0])}`);
    }
  }

  // (d) last chunk held as carry (trailing terminator) at emitted 199 and 200
  {
    L('\n(d) carry flush at the ceiling:');
    // 199 words then a final chunk "3.5" (trailing terminator? "3.5" has no trailing [.!?]).
    // Use a genuine trailing-terminator tail: "e.g." at end of stream.
    const head199 = Array.from({ length: 199 }, (_, k) => `h${k}`).join(' ');
    for (const tail of [' e.g.', ' 3.5', ' one two three.']) {
      const r = await runChunks([head199, tail], G);
      L(`  head=199 tail=${JSON.stringify(tail)} words=${words(r.out)} done=${JSON.stringify(r.done)} out.tail=${JSON.stringify(r.out.slice(-16))}`);
    }
    const head200 = Array.from({ length: 200 }, (_, k) => `h${k}`).join(' ');
    for (const tail of [' e.g.', ' 3.5', ' extra words here.']) {
      const r = await runChunks([head200, tail], G);
      L(`  head=200 tail=${JSON.stringify(tail)} words=${words(r.out)} done=${JSON.stringify(r.done)} out.tail=${JSON.stringify(r.out.slice(-16))}`);
    }
    // carry that itself straddles the ceiling: 198 words emitted + carry of 4 words w/ trailing terminator
    const head198 = Array.from({ length: 198 }, (_, k) => `h${k}`).join(' ');
    const r = await runChunks([head198, ' aa bb cc dd e.g.'], G);
    L(`  head=198 carry 5 tokens: words=${words(r.out)} done=${JSON.stringify(r.done)} out.tail=${JSON.stringify(r.out.slice(-24))} endsWS=${/\s$/.test(r.out)}`);
  }

  // (f) word straddling the boundary exactly at the ceiling
  {
    L('\n(f) word straddling the chunk boundary at the ceiling:');
    const head = Array.from({ length: 199 }, (_, k) => `h${k}`).join(' ');
    // word 200 = "STRAD" split across two chunks; word 201 follows
    const r = await runChunks([head + ' STR', 'ADDLE tail201 tail202'], G);
    L(`  words=${words(r.out)} done=${JSON.stringify(r.done)} tail=${JSON.stringify(r.out.slice(-24))} endsWS=${/\s$/.test(r.out)}`);
    // word 201 straddles: 200 whole words then "SPL"+"IT"
    const head200 = Array.from({ length: 200 }, (_, k) => `h${k}`).join(' ');
    const r2 = await runChunks([head200 + ' SPL', 'IT more.'], G);
    L(`  201st straddles: words=${words(r2.out)} done=${JSON.stringify(r2.done)} tail=${JSON.stringify(r2.out.slice(-16))} endsWS=${/\s$/.test(r2.out)}`);
    // exact: 200th word's LAST char is the chunk end
    const r3 = await runChunks([head + ' STRADDLE', ' tail201.'], G);
    L(`  200th ends at boundary: words=${words(r3.out)} done=${JSON.stringify(r3.done)} tail=${JSON.stringify(r3.out.slice(-18))}`);
  }

  // (g) SENTINEL
  {
    L('\n(g) sentinel:');
    const r = await runChunks(['hello world. ', '__model_source:groq__', ' more text here.'], G);
    L(`  out=${JSON.stringify(r.out)} done=${JSON.stringify(r.done)}`);
    // sentinel arriving when the ceiling is exhausted
    const head200 = Array.from({ length: 200 }, (_, k) => `h${k}`).join(' ');
    const r2 = await runChunks([head200 + ' ', '__model_source:groq__', ' over the top words.'], G);
    L(`  at ceiling: words=${words(r2.out)} hasSentinel=${r2.out.includes('__model_source:groq__')} done=${JSON.stringify(r2.done)}`);
    // sentinel inside a small-ceiling stream
    const r3 = await runChunks(['a b c ', '__model_source:x__', ' d e f'], { limit: 4, floor: 4, ceiling: 4 });
    L(`  small ceiling: out=${JSON.stringify(r3.out)} done=${JSON.stringify(r3.done)}`);
  }

  // (e) legacy config: limit 80, floor 40, default ceiling 160
  {
    L('\n(e) legacy limit 80 / floor 40 / default ceiling:');
    const s = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
    // allowance: first sentence of 100 words streams whole past the limit
    const r1 = await run(s(100, 1) + ' ' + s(10, 2), { limit: 80, floor: 40 }, 9);
    L(`  allowance(100w first sentence): words=${words(r1.out)} done=${JSON.stringify(r1.done)}`);
    // buffer mode: 50 + 50
    const r2 = await run(s(50, 1) + ' ' + s(50, 2), { limit: 80, floor: 40 }, 9);
    L(`  buffer(50+50): words=${words(r2.out)} done=${JSON.stringify(r2.done)}`);
    // no-terminator 200 words under default ceiling 160
    const r3 = await run(Array.from({ length: 200 }, (_, k) => `w${k}`).join(' '), { limit: 80, floor: 40 }, 9);
    L(`  no-terminator 200w: words=${words(r3.out)} done=${JSON.stringify(r3.done)} endsWS=${/\s$/.test(r3.out)}`);
  }

  // (h) notation
  {
    L('\n(h) notation:');
    const cases = ['the p99 improved by $9.5\\%$ after the change.', 'the p99 improved by $9.5\\% after the change.', 'margins are $5% better.', 'a fee of $5 \\% of revenue.', 'it cost $9.5 per user.'];
    for (const t of cases) {
      const outs = new Set();
      for (let size = 1; size <= 13; size++) {
        const src = (async function* () { for (let i = 0; i < t.length; i += size) yield t.slice(i, i + size); })();
        let o = '';
        for await (const c of stripSpokenNotation(src)) o += c;
        outs.add(o);
      }
      L(`  ${JSON.stringify(t)} -> ${JSON.stringify([...outs])} chunkInvariant=${outs.size === 1}`);
    }
  }
})();
