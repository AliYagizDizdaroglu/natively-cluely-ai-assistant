// idle-app-traffic.mjs — what did the app do while it sat open after the s50m flight?
// Reads MAIN's natively_debug.log (session started 2026-09-22 07:12 UTC) and counts, for the
// lines AFTER the flight's snapshot (08:22:50 UTC), which components logged and how often.
// Prints tag names, counts and hours only — never a line's text, which can hold the user's
// own speech (the mic kept capturing).
import fs from 'node:fs';

const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const AFTER = process.argv[2] ?? '2026-09-22T08:22:50';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);

const tags = new Map();
const hourly = new Map();   // hour -> { warm31, warm35, warmOther, heartbeatStart, answers, llmCalls }
let first = null, last = null, n = 0;
const bump = (m, k, d = 1) => m.set(k, (m.get(k) ?? 0) + d);
const PATTERNS = {
    warm31: /Warming up gemini-3\.1-flash-lite\b/,
    warm35: /Warming up gemini-3\.5-flash-lite\b/,
    warmOther: /Warming up (?!gemini-3\.[15]-flash-lite\b)/,
    heartbeatStart: /Warmth heartbeat started/,
    heartbeatStop: /Warmth heartbeat stopped/,
    meetingStart: /\[Main\] Starting Meeting/,
    meetingEnd: /\[Main\] Ending Meeting/,
    answerFull: /\[Answer\] full:/,
    whatToAnswer: /\[WhatToAnswerLLM\]/,
    streamFailed: /Stream failed/,
    http429: /\b429\b|RESOURCE_EXHAUSTED/,
};
const totals = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));

for (const line of lines) {
    const ts = line.slice(0, 24);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(ts)) continue;
    if (ts < AFTER) continue;
    n++;
    first ??= ts;
    last = ts;
    const m = /^\S+ \[(?:LOG|WARN|ERROR|INFO|DEBUG)\] (\[[^\]]{1,60}\])/.exec(line);
    bump(tags, m ? m[1] : '(untagged)');
    const hour = ts.slice(0, 13);
    const h = hourly.get(hour) ?? {};
    for (const [k, re] of Object.entries(PATTERNS)) {
        if (re.test(line)) { totals[k]++; h[k] = (h[k] ?? 0) + 1; }
    }
    hourly.set(hour, h);
}

console.log(`lines after ${AFTER}: ${n}   first ${first}   last ${last}`);
console.log('\ntotals:', JSON.stringify(totals));
console.log('\nper hour (UTC):');
for (const [hour, h] of hourly) console.log(`  ${hour}  ${JSON.stringify(h)}`);
console.log('\ncomponents (tag: lines):');
for (const [t, c] of [...tags].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${String(c).padStart(7)}  ${t}`);
