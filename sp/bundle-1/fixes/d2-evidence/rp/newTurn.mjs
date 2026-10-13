// electron/services/interviewerTurn.ts
var DEFAULT_TURN_CONSTANTS = { gateMs: 1200, settleMs: 400, unfinishedHoldMs: 2500, continuationMs: 8e3, maxHoldMs: 8e3, wordlessGraceMs: 3e3 };
function turnConstantsFromEnv(env = process.env) {
  const num = (name, fallback) => {
    const v = Number(env[name]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    gateMs: num("NATIVELY_TURN_GATE_MS", DEFAULT_TURN_CONSTANTS.gateMs),
    settleMs: num("NATIVELY_TURN_SETTLE_MS", DEFAULT_TURN_CONSTANTS.settleMs),
    unfinishedHoldMs: num("NATIVELY_TURN_UNFINISHED_HOLD_MS", DEFAULT_TURN_CONSTANTS.unfinishedHoldMs),
    continuationMs: num("NATIVELY_TURN_CONTINUATION_MS", DEFAULT_TURN_CONSTANTS.continuationMs),
    maxHoldMs: num("NATIVELY_TURN_MAX_HOLD_MS", DEFAULT_TURN_CONSTANTS.maxHoldMs),
    wordlessGraceMs: num("NATIVELY_TURN_WORDLESS_GRACE_MS", DEFAULT_TURN_CONSTANTS.wordlessGraceMs)
  };
}
var TRAILING_CONNECTIVE = /\b(and|or|so|but|because|with|for|to|of|the|a|an|then|also|plus|versus|vs|including|like|such as|as)\s*$/i;
var TERMINATOR = /[.?!]["'”’)\]]*$/;
var words = (s) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
function readsFinished(text) {
  const t = text.trim();
  const w = words(t);
  if (w.length < 4) return false;
  if (!TERMINATOR.test(t)) return false;
  const body = t.replace(TERMINATOR, "");
  if (/,$/.test(body) || TRAILING_CONNECTIVE.test(body)) return false;
  const sentences = t.split(/(?<=[.?!])\s+/).filter(Boolean);
  if (sentences.length === 1 && /\.$/.test(t) && w.length <= 6) return false;
  return true;
}
function createInterviewerTurn(c = DEFAULT_TURN_CONSTANTS, finished = readsFinished) {
  let turn = null;
  let nextTurnId = 1;
  let lastClosed = null;
  const close = (t, closedAt) => {
    lastClosed = {
      id: t.id,
      closedAt,
      answeredAt: t.dispatched ? t.answeredAt : null,
      voiceAfterDispatch: t.voiceOnsAfterDispatch.some((v) => v <= closedAt)
    };
    turn = null;
  };
  const open = (at) => {
    if (!turn) {
      turn = {
        id: nextTurnId++,
        startedAt: at,
        finals: [],
        live: [],
        speaking: false,
        vadSeen: false,
        lastSpeechAt: -Infinity,
        lastFinalAt: -Infinity,
        detected: false,
        detectedAt: null,
        classifyAsked: false,
        notAQuestion: false,
        candidateAt: null,
        dispatched: null,
        pendingAfterDispatch: false,
        answeredAt: null,
        voiceOnsAfterDispatch: []
      };
    }
    return turn;
  };
  const effectiveStopAt = (t, now) => now - t.lastSpeechAt < c.wordlessGraceMs ? t.lastSpeechAt : -Infinity;
  const reopenIfStale = (at) => {
    if (turn && turn.dispatched) {
      const staleSince = Math.max(turn.dispatched.at, turn.lastFinalAt, effectiveStopAt(turn, at));
      if (at - staleSince >= c.continuationMs) close(turn, staleSince + c.continuationMs);
    }
  };
  const textOf = (t) => {
    if (t.finals.length > 0) return { text: t.finals.map((f) => f.text).join(" "), fromLive: false };
    if (t.live.length > 0) return { text: t.live.join(" "), fromLive: true };
    return { text: "", fromLive: false };
  };
  const silenceMs = (t, now) => now - t.lastSpeechAt;
  const settled = (t, now) => t.finals.length === 0 || now - t.lastFinalAt >= c.settleMs;
  const quiet = (t, now) => !t.speaking && silenceMs(t, now) >= c.gateMs && settled(t, now);
  const failSafeAt = (t) => t.detectedAt === null ? null : Math.max(t.detectedAt, t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs;
  const holdReason = (t, now) => {
    if (t.speaking) return "speaking";
    if (silenceMs(t, now) < c.gateMs) return "gate";
    if (!settled(t, now)) return "settle";
    return "unfinished";
  };
  return {
    speech(active, at) {
      if (!turn && !active) return;
      const t = open(at);
      t.vadSeen = true;
      t.speaking = active;
      if (!active) t.lastSpeechAt = at;
      else if (t.dispatched && at > t.dispatched.at) t.voiceOnsAfterDispatch.push(at);
    },
    final(text, at, prov) {
      reopenIfStale(at);
      const lc = lastClosed;
      if (lc && prov && prov.onsetAt !== void 0 && prov.textSinceAt !== void 0 && prov.onsetAt < lc.closedAt && lc.answeredAt !== null && !lc.voiceAfterDispatch && prov.textSinceAt < lc.closedAt) {
        return "absorbed";
      }
      const t = open(at);
      t.finals.push({ text: text.trim(), at });
      t.lastFinalAt = at;
      if (!t.vadSeen) t.lastSpeechAt = at;
      if (t.dispatched) t.pendingAfterDispatch = true;
      return "joined";
    },
    answered(turnId, at) {
      if (turn && turn.id === turnId) turn.answeredAt = at;
      else if (lastClosed && lastClosed.id === turnId) lastClosed.answeredAt = at;
    },
    voiceHeard(at) {
      if (turn && turn.dispatched && at > turn.dispatched.at) turn.voiceOnsAfterDispatch.push(at);
    },
    liveClaim(text, at) {
      reopenIfStale(at);
      const t = open(at);
      t.live.push(text.trim());
      if (!t.vadSeen) t.lastSpeechAt = at;
    },
    detected(_source, at, verdict, forTurn) {
      if (forTurn !== void 0 && (!turn || turn.id !== forTurn)) return;
      reopenIfStale(at);
      const t = open(at);
      t.detected = true;
      t.detectedAt = at;
      if (verdict === "not-a-question") t.notAQuestion = true;
    },
    candidateSpoke(at) {
      if (!turn) return;
      turn.candidateAt = at;
    },
    tick(now) {
      if (!turn) return { kind: "idle" };
      const t = turn;
      if (t.candidateAt !== null) {
        close(t, now);
        return { kind: "close", reason: "candidate" };
      }
      if (t.notAQuestion) {
        close(t, now);
        return { kind: "close", reason: "not-a-question" };
      }
      if (t.dispatched) {
        if (t.pendingAfterDispatch) {
          if (quiet(t, now) || now >= Math.max(t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs) {
            const { text: text2 } = textOf(t);
            const replaces = t.dispatched.text;
            t.dispatched = { at: now, text: text2 };
            t.pendingAfterDispatch = false;
            return { kind: "supersede", text: text2, live: [...t.live], replaces, finals: t.finals.length };
          }
          return { kind: "hold", reason: holdReason(t, now) };
        }
        if (!t.speaking && now - Math.max(effectiveStopAt(t, now), t.dispatched.at) >= c.continuationMs) {
          close(t, now);
          return { kind: "close", reason: "continuation-expired" };
        }
        return { kind: "idle" };
      }
      const hasText = t.finals.length > 0 || t.live.length > 0;
      if (!hasText) {
        const fs2 = failSafeAt(t);
        if (fs2 !== null && now >= fs2) {
          close(t, now);
          return { kind: "close", reason: "nothing-heard" };
        }
        return { kind: "hold", reason: t.speaking ? "speaking" : "undetected" };
      }
      if (!t.detected) {
        if (quiet(t, now) && !t.classifyAsked) {
          t.classifyAsked = true;
          const { text: text2 } = textOf(t);
          return { kind: "classify", text: text2, finals: t.finals.length, turn: t.id };
        }
        return { kind: "hold", reason: "undetected" };
      }
      const { text, fromLive } = textOf(t);
      const isFinished = finished(text);
      const atGate = t.finals.length > 0 && quiet(t, now) && isFinished;
      const unfinishedHoldElapsed = !t.speaking && silenceMs(t, now) >= c.gateMs + c.unfinishedHoldMs && settled(t, now);
      const fs = failSafeAt(t);
      const failSafe = fs !== null && now >= fs;
      if (atGate || unfinishedHoldElapsed || failSafe) {
        t.dispatched = { at: now, text };
        return { kind: "dispatch", text, live: [...t.live], finished: isFinished, gateMs: c.gateMs, finals: t.finals.length, fromLive };
      }
      return { kind: "hold", reason: holdReason(t, now) };
    },
    nextTimerAt(now) {
      if (!turn) return null;
      const t = turn;
      if (t.candidateAt !== null || t.notAQuestion) return now;
      const candidates = [];
      if (!t.speaking && (!t.dispatched || t.pendingAfterDispatch)) {
        candidates.push(t.lastSpeechAt + c.gateMs);
        candidates.push(t.lastSpeechAt + c.gateMs + c.unfinishedHoldMs);
      }
      if (t.finals.length > 0) candidates.push(t.lastFinalAt + c.settleMs);
      if (!t.dispatched) {
        const fs = failSafeAt(t);
        if (fs !== null) candidates.push(fs);
      }
      if (t.dispatched && t.pendingAfterDispatch) candidates.push(Math.max(t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs);
      if (t.dispatched && !t.pendingAfterDispatch) {
        candidates.push(t.dispatched.at + c.continuationMs);
        if (t.lastSpeechAt > t.dispatched.at) candidates.push(t.lastSpeechAt + c.wordlessGraceMs);
      }
      const future = candidates.filter((at) => at > now);
      return future.length > 0 ? Math.min(...future) : null;
    },
    reset() {
      turn = null;
      lastClosed = null;
    },
    speechEnd() {
      if (!turn || turn.lastSpeechAt === -Infinity) return null;
      return { at: turn.lastSpeechAt, src: turn.vadSeen ? "vad" : "final" };
    },
    snapshot() {
      if (!turn) return { open: false, finals: 0, live: 0, detected: false, dispatched: false, speaking: false, id: null };
      return {
        open: true,
        finals: turn.finals.length,
        live: turn.live.length,
        detected: turn.detected,
        dispatched: turn.dispatched !== null,
        speaking: turn.speaking,
        id: turn.id
      };
    }
  };
}
export {
  DEFAULT_TURN_CONSTANTS,
  createInterviewerTurn,
  readsFinished,
  turnConstantsFromEnv
};
