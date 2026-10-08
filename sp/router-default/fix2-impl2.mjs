import fs from 'node:fs';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b/electron/services/';
function edit(file, pairs) {
  let s = fs.readFileSync(D + file, 'utf8');
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error('not unique: ' + a); s = s.replace(a, () => b); }
  fs.writeFileSync(D + file, s);
}
edit('routerArbiter.ts', [[
  "      t.superseded = true; t.held = []; t.mode = 'pipeline';\n",
  "      const src = [...t.held].reverse().find((o) => o.ch === 'source');   // fix2 (Task 8 I2): the replacing stream's source was held in live mode; keep the latest, as pending mode does\n      t.superseded = true; t.held = []; t.mode = 'pipeline';\n      if (src) this.sendPipeline(t, src);\n"]]);
edit('routerArbiter.test.ts', [
  ["      `src:${LIVE_LABEL}@1`, `tok:${words(10)} |live@1`,\n      'tok:New |pipeline|replace@1',",
   "      `src:${LIVE_LABEL}@1`, `tok:${words(10)} |live@1`,\n      'src:gemini@1',   // fix2: the held source is forwarded at the supersede\n      'tok:New |pipeline|replace@1',"]]);
fs.appendFileSync(D + 'routerArbiter.test.ts', `
describe('RouterArbiter: fix2 held source at a supersede (Task 8 I2)', () => {
  it('after a finished Live answer, a replacing stream with a source and a final-only replace sends that source; a later source is forwarded too', () => {
    const h = boot();
    dispatch(h);
    h.go(Q + 500); h.a.routerTurn(rt(1, words(30), Q + 500, done(Q + 1000)));   // Live answer finished
    h.a.forward(src(1, 'gemini-new'));                                         // held: the turn is still in live mode
    expect(sigs(h)).not.toContain('src:gemini-new@1');
    h.a.forward(fin(1, 'New', { replace: true }));
    expect(sigs(h)).toContain('src:gemini-new@1');
    h.a.forward(src(1, 'gemini-later'));
    expect(sigs(h)).toContain('src:gemini-later@1');
  });
});
`);
