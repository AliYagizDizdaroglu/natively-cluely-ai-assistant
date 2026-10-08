const { cutAtWordBudget, SPOKEN_WORD_GUARD: G } = require('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/dist-electron/electron/llm/verbalStreamFilter.js');
const words = (s) => (s.match(/\S+/g) ?? []).length;
async function runChunks(chunks, opts) {
  const src = (async function* () { for (const c of chunks) yield c; })();
  let done = null, out = '';
  for await (const c of cutAtWordBudget(src, { ...opts, onDone: (r) => { done = r; } })) out += c;
  return { out, done };
}
(async () => {
  const s = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
  let r = await runChunks([[1,2,3,4,5].map(i=>s(40,i)).join(' ') + ' '], G);
  console.log('200w + trailing space :', words(r.out), JSON.stringify(r.done), 'tail=' + JSON.stringify(r.out.slice(-8)));
  r = await runChunks([[1,2,3,4,5].map(i=>s(40,i)).join(' '), '\n'], G);
  console.log('200w + newline chunk  :', words(r.out), JSON.stringify(r.done), 'tail=' + JSON.stringify(r.out.slice(-8)));
  r = await runChunks([[1,2,3,4,5].map(i=>s(40,i)).join(' ') + ' extra.'], G);
  console.log('200w + " extra."      :', words(r.out), JSON.stringify(r.done));
  r = await runChunks([[1,2,3,4].map(i=>s(40,i)).join(' ') + ' ' + s(39,5) + ' aa bb.'], G);
  console.log('199w + "aa bb."       :', words(r.out), JSON.stringify(r.done), 'tail=' + JSON.stringify(r.out.slice(-14)));
  r = await runChunks(['   '], G); console.log('whitespace only       :', JSON.stringify(r.out), JSON.stringify(r.done));
  r = await runChunks([], G);      console.log('empty stream          :', JSON.stringify(r.out), JSON.stringify(r.done));
  let n = 0; const src = (async function* () { yield Array.from({length:300},(_,k)=>'z'+k).join(' '); })();
  for await (const _ of cutAtWordBudget(src, { ...G, onDone: () => { n++; } })) {}
  console.log('onDone calls on cut   :', n);
})();
