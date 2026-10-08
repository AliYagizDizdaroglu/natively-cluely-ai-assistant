import fs from 'node:fs';
const f = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/stage/smoke-fix-pad/electron/audio/LiveRouterSession.ts';
let c = fs.readFileSync(f, 'utf8');
function rep(o, n) { if (!c.includes(o)) throw new Error('missing: ' + o); c = c.replace(o, () => n); }

rep("const QUOTA_BACKOFF_BASE_MS = 5_000, QUOTA_BACKOFF_MAX_MS = 60_000;\n", `const QUOTA_BACKOFF_BASE_MS = 5_000, QUOTA_BACKOFF_MAX_MS = 60_000;

// Real-time input (smoke fix, checkpoint 3). The native capture thins its stream in silence (one ~60 ms frame per 100 ms),
// and Gemini Live's end-of-turn detection counts silence in AUDIO time, so it reached its threshold seconds late in wall
// time. The session therefore pads zeros so that audio sent == wall-clock time elapsed. Provenance: the standalone probe
// sent real-time silence and the router's first word came 0.6-1.3 s after the question; the thinned stream gave 3.0-3.8 s.
const PAD_CAP_MS = 1000;      // one pad at most: a long pause or a resumed session must not dump a burst
const PAD_FLOOR_MS = 20;      // a smaller deficit is timing jitter, not thinning; it stays owed and is paid when it grows
const PAD_TICK_MS = 100;      // the idle timer's cadence
const PAD_IDLE_MS = 150;      // no write for this long: capture sent nothing, the timer tops up
const SAMPLES_PER_MS = 16;    // 16 kHz mono int16
`);

rep("  private audioChunksOut = 0;\n", `  private audioChunksOut = 0;
  private sentEndAt = 0;    // wall-clock instant the audio sent so far reaches
  private lastWriteAt = 0;  // wall-clock time of the last write() (not of a timer pad)
  private padTimer: NodeJS.Timeout | null = null;
`);

rep("    this.stopping = true; this.generation++;\n    if (this.reconnectTimer)", "    this.stopping = true; this.generation++;\n    this.stopPadTimer();\n    if (this.reconnectTimer)");

rep(`      const pcm = resampleTo16kMono(chunk, sampleRate, numChannels);
      if (pcm.length) this.session.sendRealtimeInput({ audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
    } catch (err: any) { this.log(\`[Router] write failed: \${err?.message ?? err}\`); }
  }
`, `      const pcm = resampleTo16kMono(chunk, sampleRate, numChannels);
      if (!pcm.length) return;
      const now = this.now(); this.lastWriteAt = now;
      const chunkMs = pcm.length / 2 / SAMPLES_PER_MS;
      const deficit = now - chunkMs - this.sentEndAt; // silence owed BEFORE this chunk, so it ends at \`now\`
      let out = pcm;
      if (deficit >= PAD_FLOOR_MS) {
        out = Buffer.concat([Buffer.alloc(Math.floor(Math.min(deficit, PAD_CAP_MS) * SAMPLES_PER_MS) * 2), pcm]);
        this.sentEndAt = now - chunkMs; // a capped remainder is forgiven, not carried
      }
      this.sentEndAt = Math.min(this.sentEndAt + chunkMs, now); // audio cannot be ahead of the clock
      this.sendPcm(out);
    } catch (err: any) { this.log(\`[Router] write failed: \${err?.message ?? err}\`); }
  }

  private sendPcm(pcm: Buffer): void {
    this.session?.sendRealtimeInput({ audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
  }

  /** While up, tops silence up when capture has sent nothing for PAD_IDLE_MS. Bound to one generation. */
  private startPadTimer(): void {
    this.stopPadTimer();
    const gen = this.generation;
    const now = this.now(); this.sentEndAt = now; this.lastWriteAt = now;
    this.padTimer = setInterval(() => {
      if (gen !== this.generation || !this.up || !this.session) { this.stopPadTimer(); return; }
      const t = this.now();
      if (t - this.lastWriteAt <= PAD_IDLE_MS) return;
      const deficit = t - this.sentEndAt;
      if (deficit < PAD_FLOOR_MS) return;
      this.sentEndAt = t; // a capped remainder is forgiven
      try { this.sendPcm(Buffer.alloc(Math.floor(Math.min(deficit, PAD_CAP_MS) * SAMPLES_PER_MS) * 2)); }
      catch (err: any) { this.log(\`[Router] write failed: \${err?.message ?? err}\`); }
    }, PAD_TICK_MS);
    this.padTimer.unref?.();
  }

  private stopPadTimer(): void { if (this.padTimer) { clearInterval(this.padTimer); this.padTimer = null; } }
`);

rep("    this.up = up; this.emit('state', { up, at: this.now() });", "    this.up = up;\n    if (up) this.startPadTimer(); else this.stopPadTimer();\n    this.emit('state', { up, at: this.now() });");
fs.writeFileSync(f, c);
console.log('patched');
