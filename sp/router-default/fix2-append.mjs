import fs from 'node:fs';
const wt = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b/electron/services/';
const add = `
describe('RouterArbiter: fix2 superseded flag (capture and decision line)', () => {
  it('a supersede during Live: live and shadow captures read superseded:true, the line ends superseded=yes', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Old '));
    h.go(Q + 500); h.a.routerTurn(rt(1, \`\${words(10)} \`, Q + 500));
    h.go(Q + 1500);
    h.a.forward(tok(1, 'New ', { replace: true })); h.a.forward(tok(1, 'answer'));
    h.a.routerTurn(rt(1, words(30), Q + 500, done(Q + 2000)));
    h.a.forward(fin(1, 'New answer', { replace: true })); h.a.forward(hist(1, 'New answer')); h.a.forward(end(1));
    const c = caps(h);
    expect(c.map((x) => [x.kind, x.superseded])).toEqual([['live', true], ['shadow', true]]);
    expect(lines(h)).toHaveLength(1);
    expect(lines(h)[0].endsWith(' superseded=yes')).toBe(true);
  });

  it('a normal Live turn: captures read superseded:false, the line ends superseded=no', () => {
    const h = boot();
    dispatch(h);
    h.a.forward(src(1, 'gemini')); h.a.forward(tok(1, 'Ans ')); h.a.forward(fin(1, 'Ans')); h.a.forward(hist(1, 'Ans'));
    h.go(Q + 500); h.a.routerTurn(rt(1, words(30), Q + 500, done(Q + 1000)));
    h.go(Q + 3000); h.a.forward(end(1));
    expect(caps(h).map((x) => [x.kind, x.superseded])).toEqual([['live', false], ['shadow', false]]);
    expect(lines(h)).toHaveLength(1);
    expect(lines(h)[0].endsWith(' superseded=no')).toBe(true);
  });
});
`;
fs.appendFileSync(wt + 'routerArbiter.test.ts', add);
