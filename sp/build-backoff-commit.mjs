// Throwaway: reconstruct "HEAD + quota-backoff hunks" for GeminiLiveRouter.ts and
// its test, so the fix can be committed without the working tree's other changes.
// Reads HEAD versions from stdin-free git show output files written by the caller.
import fs from 'node:fs';

const [headRouter, headTest, workTest, outRouter, outTest] = process.argv.slice(2);
let r = fs.readFileSync(headRouter, 'utf8').replace(/\r\n/g, '\n');
const once = (s, a, b, label) => { if (s.split(a).length !== 2) throw new Error(`anchor "${label}" matched ${s.split(a).length - 1} times`); return s.replace(a, () => b); };

r = once(r, 'const SLOW_RETRY_INTERVAL_MS = 15_000;',
`const SLOW_RETRY_INTERVAL_MS = 15_000;
/**
 * Quota closes (code 1011 "You exceeded your current quota") back off instead of
 * quick-retrying. 2026-09-03 13:45–13:54 UTC on gemini-2.5-flash-native-audio-latest:
 * a goAway reconnect was quota-closed, the 300 ms retry resumed the ~10K-token
 * session and was closed again, and — each attempt briefly reaching connected —
 * the loop never escalated: 311 closes in nine minutes (65–78/min at the peak),
 * four questions lost. 5 s doubling to 60 s, and the reconnect starts a fresh
 * session so the old context is not re-billed on every attempt.
 */
const QUOTA_BACKOFF_BASE_MS = 5_000;
const QUOTA_BACKOFF_MAX_MS = 60_000;`, 'constants');

r = once(r, '  private reconnectTimer: NodeJS.Timeout | null = null;',
`  private reconnectTimer: NodeJS.Timeout | null = null;
  /** Consecutive quota closes; reset once a session carries real traffic. */
  private quotaCloses = 0;`, 'field');

r = once(r, '  private handleMessage(msg: any): void {\n',
`  private handleMessage(msg: any): void {
    // Real traffic proves the quota is back: the next quota close starts the backoff over.
    if (this.quotaCloses && (msg?.serverContent || msg?.toolCall)) this.quotaCloses = 0;
`, 'handleMessage reset');

r = once(r, "    const reason = e?.reason ? String(e.reason) : 'connection closed';\n",
`    const reason = e?.reason ? String(e.reason) : 'connection closed';
    if (/quota|resource_exhausted/i.test(reason)) {
      this.quotaCloses++;
      this.resumptionHandle = null;
      const delay = Math.min(QUOTA_BACKOFF_MAX_MS, QUOTA_BACKOFF_BASE_MS * 2 ** (this.quotaCloses - 1));
      console.warn(\`[LiveRouter] quota close #\${this.quotaCloses} — backing off \${delay}ms, reconnecting fresh\`);
      if (!this.inSlowRetry) this.setState('reconnecting', 'quota backoff');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (!this.stopping) void this.connect();
      }, delay);
      this.reconnectTimer.unref?.();
      return;
    }
`, 'handleClose branch');

// Test: HEAD test + the "quota backoff" describe block from the working tree, verbatim.
const work = fs.readFileSync(workTest, 'utf8').replace(/\r\n/g, '\n');
const start = work.indexOf("describe('GeminiLiveRouter quota backoff'");
if (start < 0) throw new Error('quota backoff describe block not found in the working test');
const block = work.slice(start).replace(/\n*$/, '\n');
let t = fs.readFileSync(headTest, 'utf8').replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
t = t + '\n' + block;

fs.writeFileSync(outRouter, r);
fs.writeFileSync(outTest, t);
console.log(`built ${outRouter} (${r.split('\n').length} lines) and ${outTest} (${t.split('\n').length} lines)`);
