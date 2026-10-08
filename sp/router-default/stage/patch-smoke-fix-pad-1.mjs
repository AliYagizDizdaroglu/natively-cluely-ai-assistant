import fs from 'node:fs';
const B = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/stage/smoke-fix-pad/electron/audio/';
let c = fs.readFileSync(B + 'LiveRouterSession.ts', 'utf8');
function rep(o, n) { if (!c.includes(o)) throw new Error('missing: ' + o); c = c.replace(o, () => n); }

rep('(one ~60 ms frame per 100 ms)', '(one zero-filled 20 ms keepalive frame per 100 ms)');
rep("time. The session therefore pads zeros so that audio sent == wall-clock time elapsed.", "time. The session therefore pads zeros so that audio sent == wall-clock time elapsed, but ONLY in silence (the\n// suppressor's keepalives are all-zero): a main-thread stall during speech delays real frames and must not insert silence.");
rep("  private lastWriteAt = 0;", "  private lastChunkZero = true; // the last received chunk was all-zero (a suppressor keepalive); true at up\n  private lastWriteAt = 0;");
rep("      let out = pcm;\n      if (deficit >= PAD_FLOOR_MS) {", "      const zero = isAllZero(pcm); this.lastChunkZero = zero;\n      let out = pcm;\n      if (!zero) this.sentEndAt = now - chunkMs; // real audio fills its own time; a stall's debt is not paid in zeros\n      else if (deficit >= PAD_FLOOR_MS) {");
rep("const now = this.now(); this.sentEndAt = now; this.lastWriteAt = now;", "const now = this.now(); this.sentEndAt = now; this.lastWriteAt = now; this.lastChunkZero = true;");
rep("      if (t - this.lastWriteAt <= PAD_IDLE_MS) return;", "      if (!this.lastChunkZero || t - this.lastWriteAt <= PAD_IDLE_MS) return;");
rep("export class LiveRouterSession", "const isAllZero = (b: Buffer): boolean => { for (let i = 0; i < b.length; i++) if (b[i] !== 0) return false; return true; };\n\nexport class LiveRouterSession");
fs.writeFileSync(B + 'LiveRouterSession.ts', c);

let t = fs.readFileSync(B + 'LiveRouterSession.test.ts', 'utf8');
function rept(o, n) { if (!t.includes(o)) throw new Error('missing: ' + o); t = t.replace(o, () => n); }
rept("(one 60 ms frame per 100 ms), and Gemini", "(one zero-filled 20 ms keepalive frame per 100 ms), and Gemini");
rept("(speech, then one 60 ms frame per 100 ms for 2 s)", "(speech, then one zero 20 ms frame per 100 ms for 2 s)");
rept("write(chunk(60), 16000)", "write(chunk(20), 16000)");
// P3: the last chunk before the stall is a silence keepalive
rept("    await step(h, 100, () => h.s.write(loud(100), 16000));\n    const before", "    await step(h, 100, () => h.s.write(chunk(100), 16000)); // silence: the timer only fills silence\n    const before");
// P4: the resumed chunk is silence
rept("    h.clock.t += 10_000; // no timer tick: a stalled event loop, or the first write of a resumed session\n    h.s.write(loud(100), 16000);", "    h.clock.t += 10_000; // no timer tick: a stalled event loop, or the first write of a resumed session\n    h.s.write(chunk(100), 16000);");
rept("describe('LiveRouterSession real-time padding', () => {\n", "describe('LiveRouterSession real-time padding', () => {\n");
t = t.replace(/\n\}\);\n$/, `

  it('I1. a stall during speech inserts no silence, with or without timer ticks', async () => {
    const allLoud = (sent: any[]) => sent.every((i) => Buffer.from(i.audio.data, 'base64').every((b) => b !== 0));
    // no timer ticks: the clock jumps, then the queued speech arrives late
    const a = harness();
    await a.s.start(); a.up(0);
    await step(a, 500, () => a.s.write(loud(100), 16000));
    a.clock.t += 600;
    for (let i = 0; i < 6; i++) a.s.write(loud(100), 16000);
    expect(allLoud(a.conns[0].sent)).toBe(true);
    expect(a.conns[0].sent.length).toBe(11);
    // timer ticking through the stall, last chunk loud
    const b = harness();
    await b.s.start(); b.up(0);
    await step(b, 500, () => b.s.write(loud(100), 16000));
    const n = b.conns[0].sent.length;
    await step(b, 600);
    expect(b.conns[0].sent.length).toBe(n);
    for (let i = 0; i < 6; i++) b.s.write(loud(100), 16000);
    expect(allLoud(b.conns[0].sent)).toBe(true);
    // control: the same stall after a SILENCE chunk is padded
    const c = harness();
    await c.s.start(); c.up(0);
    await step(c, 500, () => c.s.write(loud(100), 16000));
    c.s.write(chunk(20), 16000);
    await step(c, 600);
    expect(c.conns[0].sent.length).toBeGreaterThan(6);
  });
});
`);
fs.writeFileSync(B + 'LiveRouterSession.test.ts', t);
console.log('ok');
