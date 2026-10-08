import fs from 'node:fs';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b/electron/services/';
function edit(file, pairs) {
  let s = fs.readFileSync(D + file, 'utf8');
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error('not unique: ' + a); s = s.replace(a, () => b); }
  fs.writeFileSync(D + file, s);
}
if (process.argv[2] === 'tests') {
  edit('routerArbiter.test.ts', [
    ["expect(sigs(h)).toEqual(['src:gemini-new@1', 'tok:New |pipeline|replace@1', 'tok:one|pipeline@1', 'fin:New one|pipeline|replace@1']);",
     "expect(sigs(h)).toEqual(['src:gemini-new@1', 'tok:New |pipeline@1', 'tok:one|pipeline@1', 'fin:New one|pipeline|replace@1']);   // fix4: nothing of this turn was shown, so the first token must not replace"],
  ]);
  fs.appendFileSync(D + 'routerArbiter.test.ts', `
describe('RouterArbiter: fix4 (R2) replace only when this turn has visible text', () => {
  it('supersede while pending: the first released token and a final-only replace carry replace:false', () => {
    const h = boot(); dispatch(h);
    h.a.forward(tok(1, 'Old ')); h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(tok(1, 'one'));
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard', Q + 600, done(Q + 600)));
    expect(sigs(h)).toEqual(['tok:New |pipeline@1', 'tok:one|pipeline@1']);
    const h2 = boot(); dispatch(h2);
    h2.a.forward(tok(1, 'Old ')); h2.a.forward(fin(1, 'New', { replace: true }));
    h2.go(Q + 600); h2.a.routerTurn(rt(1, 'hard', Q + 600, done(Q + 600)));
    expect(sigs(h2)).toEqual(['fin:New|pipeline@1']);
  });

  it('supersede after a Live decision with zero Live tokens sent: the replacing token carries replace:false', () => {
    const h = boot(); dispatch(h);
    h.go(Q + 500); h.a.routerTurn(rt(1, 'Hea', Q + 500));    // decided live? no: an incomplete first word shows nothing
    h.a.routerTurn(rt(1, 'Hello ', Q + 500));
    h.a.forward(tok(1, 'New ', { replace: true }));
    const toks = h.sent.filter((o) => o.ch === 'token').map((o) => (o as { p: { replace: boolean; origin?: string } }).p);
    const pipe = toks.filter((p) => p.origin === 'pipeline');
    expect(pipe).toHaveLength(1);
    expect(pipe[0].replace).toBe(false);
  });

  it('supersede after Live text was shown: the replacing token keeps replace:true', () => {
    const h = boot(); dispatch(h);
    h.go(Q + 500); h.a.routerTurn(rt(1, \`\${words(10)} \`, Q + 500));
    h.go(Q + 1500); h.a.forward(tok(1, 'New ', { replace: true }));
    expect(sigs(h)).toContain('tok:New |pipeline|replace@1');
  });
});
`);
} else {
  edit('routerArbiter.ts', [
    ["  private emit(t: Turn, o: Outbound): void { t.sent++; this.deps.send(o); }",
     "  private emit(t: Turn, o: Outbound): void {\n    if ((o.ch === 'token' && o.p.token !== '') || (o.ch === 'final' && o.p.answer !== '')) t.visible = true;\n    t.sent++; this.deps.send(o);\n  }"],
    ["    const app = t.mode === 'appended' ? ({ append: true, replace: false } as const) : {};   // an append never replaces the Live bubble\n",
     "    const app = t.mode === 'appended' ? ({ append: true, replace: false } as const) : {};   // an append never replaces the Live bubble\n    // fix4 (R2): replace:true overwrites the previous bubble, so it is kept only when this turn already has visible text\n    if (!t.visible && (o.ch === 'token' || o.ch === 'final') && o.p.replace) o = { ...o, p: { ...o.p, replace: false } } as Outbound;\n"],
    ["  sent: number;\n}", "  sent: number;\n  visible: boolean;                 // fix4: this turn has already sent visible text (a token or a final)\n}"],
    ["appendLabelPending: true, sent: 0,", "appendLabelPending: true, sent: 0, visible: false,"],
  ]);
}
