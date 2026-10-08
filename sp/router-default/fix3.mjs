import fs from 'node:fs';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b/electron/services/';
function edit(file, pairs) {
  let s = fs.readFileSync(D + file, 'utf8');
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error('not unique: ' + a); s = s.replace(a, () => b); }
  fs.writeFileSync(D + file, s);
}
const phase = process.argv[2];
if (phase === 'tests') {
  edit('routerArbiter.test.ts', [
    // I-2: the old stream's source is not forwarded when the replacing stream sent none
    ["      'src:gemini@1',   // fix2: the held source is forwarded at the supersede\n", ''],
    // pending-mode test: the replacing stream's source (sent right before its replace token) is the one kept
    ["    h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(tok(1, 'one')); h.a.forward(fin(1, 'New one', { replace: true }));\n    h.go(Q + 600);",
     "    h.a.forward(src(1, 'gemini-new')); h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(tok(1, 'one')); h.a.forward(fin(1, 'New one', { replace: true }));\n    h.go(Q + 600);"],
    ["expect(sigs(h)).toEqual(['src:gemini@1', 'tok:New |pipeline|replace@1', 'tok:one|pipeline@1', 'fin:New one|pipeline|replace@1']);",
     "expect(sigs(h)).toEqual(['src:gemini-new@1', 'tok:New |pipeline|replace@1', 'tok:one|pipeline@1', 'fin:New one|pipeline|replace@1']);"],
  ]);
  fs.appendFileSync(D + 'routerArbiter.test.ts', `
describe('RouterArbiter: fix3 (review I-1, I-2, pipeFirstAt)', () => {
  const sup = (h: H) => h.diag.filter((l) => l.startsWith('[Router] superseded '));
  const liveDone = (h: H) => { dispatch(h); h.go(Q + 500); h.a.routerTurn(rt(1, words(30), Q + 500, done(Q + 1000))); };

  it('I-1 streaming: diag line phase=streaming line_written=no, both captures true', () => {
    const h = boot(); dispatch(h);
    h.go(Q + 500); h.a.routerTurn(rt(1, \`\${words(10)} \`, Q + 500));
    h.go(Q + 1500); h.a.forward(tok(1, 'New ', { replace: true }));
    expect(sup(h)).toEqual(['[Router] superseded turn=1 phase=streaming line_written=no']);
    expect(caps(h).map((c) => c.superseded)).toEqual([true]);
  });

  it('I-1 after Live finished, old pipeline not yet ended: diag phase=done line_written=no; shadow reads true', () => {
    const h = boot(); liveDone(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Old '));
    h.go(Q + 2000); h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(fin(1, 'New', { replace: true })); h.a.forward(end(1));
    expect(sup(h)).toEqual(['[Router] superseded turn=1 phase=done line_written=no']);
    expect(caps(h).map((c) => [c.kind, c.superseded])).toEqual([['live', false], ['shadow', true]]);   // the live capture predates the supersede: the diag line is the record
    expect(lines(h)).toHaveLength(1);
    expect(lines(h)[0].endsWith(' superseded=yes')).toBe(true);
  });

  it('I-1 after Live finished and the old pipeline ended (line already written): diag phase=done line_written=yes', () => {
    const h = boot(); liveDone(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Old ')); h.a.forward(fin(1, 'Old')); h.a.forward(end(1));
    expect(lines(h)).toHaveLength(1);
    h.go(Q + 3000); h.a.forward(tok(1, 'New ', { replace: true }));
    expect(sup(h)).toEqual(['[Router] superseded turn=1 phase=done line_written=yes']);
  });

  it('I-1 pending-mode supersede (no Live shown): no diag line, superseded=no', () => {
    const h = boot(); dispatch(h);
    h.a.forward(tok(1, 'Old ')); h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(fin(1, 'New', { replace: true }));
    h.go(Q + 600); h.a.routerTurn(rt(1, 'hard', Q + 600, done(Q + 600))); h.a.forward(end(1));
    expect(sup(h)).toEqual([]);
    expect(lines(h)[0].endsWith(' superseded=no')).toBe(true);
  });

  it('I-2 live mode: a source that is not the last held item is not forwarded; the one right before the replace is', () => {
    const h = boot(); liveDone(h);
    h.a.forward(src(1, 'old')); h.a.forward(tok(1, 'Old '));
    h.a.forward(tok(1, 'New ', { replace: true }));
    expect(sigs(h).filter((s) => s.startsWith('src:'))).toEqual([\`src:\${LIVE_LABEL}@1\`]);
    const h2 = boot(); liveDone(h2);
    h2.a.forward(src(1, 'old')); h2.a.forward(tok(1, 'Old ')); h2.a.forward(src(1, 'new'));
    h2.a.forward(tok(1, 'New ', { replace: true }));
    expect(sigs(h2).filter((s) => s.startsWith('src:'))).toEqual([\`src:\${LIVE_LABEL}@1\`, 'src:new@1']);
  });

  it('pipeFirstAt resets at a supersede: shadow= and the shadow capture firstMs come from the replacing stream', () => {
    const h = boot(); dispatch(h);
    h.go(Q + 400); h.a.forward(tok(1, 'Old '));
    h.go(Q + 900); h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(fin(1, 'New', { replace: true })); h.a.forward(end(1));
    h.go(Q + 1000); h.a.routerTurn(rt(1, 'hard', Q + 1000, done(Q + 1000)));
    expect(one(h).shadow).toBe('900');
  });
});
`);
} else {
  edit('routerArbiter.ts', [
    ["      const src = [...t.held].reverse().find((o) => o.ch === 'source');\n      t.held = src ? [src] : [];               // the old stream's tokens and final go; the latest source stays\n",
     "      const last = t.held[t.held.length - 1];   // fix3 (review I-2): the replacing stream's announce directly precedes its replace token; an earlier source is the old stream's\n      t.held = last && last.ch === 'source' ? [last] : [];\n"],
    ["    t.pipeEnded = false; t.pipeEndAt = null; t.pipeEndKind = null;\n    if (t.mode === 'pending') {",
     "    t.pipeEnded = false; t.pipeEndAt = null; t.pipeEndKind = null; t.pipeFirstAt = null;   // fix3: shadow= and the capture's firstMs describe the replacing stream\n    if (t.decision?.shown === 'live') {         // fix3 (review I-1): the authoritative record, whatever the Live phase; set before any capture is written\n      t.superseded = true;\n      this.deps.diag(`[Router] superseded turn=${t.id} phase=${t.live.phase === 'streaming' ? 'streaming' : 'done'} line_written=${t.lineWritten ? 'yes' : 'no'}`);\n    }\n    if (t.mode === 'pending') {"],
    ["      const src = [...t.held].reverse().find((o) => o.ch === 'source');   // fix2 (Task 8 I2): the replacing stream's source was held in live mode; keep the latest, as pending mode does\n      t.superseded = true; t.held = []; t.mode = 'pipeline';\n      if (src) this.sendPipeline(t, src);\n",
     "      const last = t.held[t.held.length - 1];   // fix2 (Task 8 I2) + fix3: forward the held source only if it is the last held item\n      t.held = []; t.mode = 'pipeline';\n      if (last && last.ch === 'source') this.sendPipeline(t, last);\n"],
  ]);
}
