import * as fs from "fs";
import * as path from "path";
const DIAG_LOG = path.join(process.cwd(), "verbal-diag.log");
function diagLog(msg) {
  try {
    fs.appendFileSync(DIAG_LOG, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
  } catch {
  }
}
const HARD_DROP = [
  "Time:",
  "Space:",
  "Why:",
  "Time complexity",
  "Space complexity",
  // Clarifying-back openers — never appropriate in interview responses
  "Are you looking for",
  "Are you asking about",
  "Are you more interested in",
  "Would you like me",
  "Would you prefer",
  "Would you rather",
  "Do you want me to",
  "Do you want a",
  "Do you want me",
  "Should I focus on",
  "Should I go",
  "Should I start",
  "Which would you",
  "Which one would"
];
const REWRITE_PATTERNS = [
  /^(I'll|I will|I am|I'm|Let me|Let's|I am going to|I'm going to)\s+(explain|show|demonstrate|describe|cover|outline|implement|illustrate|present|discuss|walk\s+(?:you\s+)?through|break\s+down|talk\s+about|go\s+through|go\s+over|run\s+through)\s+/i,
  /^(I'm|I am)\s+(explaining|showing|demonstrating|describing|covering|outlining|implementing|illustrating|presenting|discussing|walking\s+(?:you\s+)?through|breaking\s+down|going\s+through|using\s+a|using\s+the)\s+/i
];
const DANGLER_RE = /^(as|by|with|how|why|what|that|to|in|on|for|about|using|through|where|when|while|so)\b/i;
const shouldHardDrop = (line) => {
  const trimmed = line.trimStart();
  return HARD_DROP.some((p) => trimmed.startsWith(p));
};
const rewritePreamble = (line) => {
  const trimmed = line.trimStart();
  const leading = line.slice(0, line.length - trimmed.length);
  for (const pattern of REWRITE_PATTERNS) {
    if (pattern.test(trimmed)) {
      const stripped = trimmed.replace(pattern, "");
      if (stripped.trim().length < 8) return "";
      if (DANGLER_RE.test(stripped)) {
        diagLog(`rewrite: SKIP (dangler) \u2014 keeping original: ${JSON.stringify(trimmed.slice(0, 60))}`);
        return line;
      }
      const capitalized = stripped[0].toUpperCase() + stripped.slice(1);
      diagLog(`rewrite: ${JSON.stringify(trimmed.slice(0, 60))} \u2192 ${JSON.stringify(capitalized.slice(0, 60))}`);
      return leading + capitalized;
    }
  }
  return null;
};
const MAX_DECISION_CHARS = 48;
const REWRITE_STARTERS = ["i'll ", "i will ", "i am ", "i'm ", "let me ", "let's "];
function decideFullLine(line) {
  if (shouldHardDrop(line)) {
    diagLog(`HARD_DROP: ${JSON.stringify(line.slice(0, 80))}`);
    return null;
  }
  const rewritten = rewritePreamble(line);
  if (rewritten !== null) return rewritten === "" ? null : rewritten;
  return line;
}
function decidePartialLine(buf) {
  const trimmed = buf.trimStart();
  const leading = buf.slice(0, buf.length - trimmed.length);
  if (trimmed.length === 0) return { t: "wait" };
  if (HARD_DROP.some((p) => trimmed.startsWith(p))) return { t: "drop" };
  for (const pattern of REWRITE_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) {
      const stripped = trimmed.slice(m[0].length);
      const firstWordComplete = /\S\s/.test(stripped);
      if (stripped.trim().length >= 8 && (firstWordComplete || stripped.length >= 20)) {
        if (DANGLER_RE.test(stripped)) {
          diagLog(`rewrite: SKIP (dangler) \u2014 keeping original: ${JSON.stringify(trimmed.slice(0, 60))}`);
          return { t: "emit", text: buf };
        }
        const capitalized = stripped[0].toUpperCase() + stripped.slice(1);
        diagLog(`rewrite (streaming): ${JSON.stringify(trimmed.slice(0, 60))} \u2192 ${JSON.stringify(capitalized.slice(0, 60))}`);
        return { t: "emit", text: leading + capitalized };
      }
      return { t: "wait" };
    }
  }
  const dropStillPossible = HARD_DROP.some((p) => p.length > trimmed.length && p.startsWith(trimmed));
  const lower = trimmed.toLowerCase();
  const rewriteStillPossible = REWRITE_STARTERS.some(
    (s) => lower.length < s.length ? s.startsWith(lower) : lower.startsWith(s)
  );
  if (!dropStillPossible && !rewriteStillPossible) return { t: "emit", text: buf };
  if (trimmed.length >= MAX_DECISION_CHARS) return { t: "emit", text: buf };
  return { t: "wait" };
}
const SENTINEL = "__MORE__";
function extractSuggestions(text) {
  const i = text.indexOf(SENTINEL);
  if (i === -1) return { answer: text, suggestions: [] };
  const answer = text.slice(0, i).replace(/\s+$/, "");
  const suggestions = [];
  for (const raw of text.slice(i + SENTINEL.length).split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\s*\|\s*(.+)$/);
    if (!m) continue;
    const label = m[2].trim().replace(/^["'`]|["'`]$/g, "");
    if (label) suggestions.push({ n: Number(m[1]), label });
  }
  return { answer, suggestions };
}
async function* stripSuggestionBlock(source, onSuggestions) {
  let pending = "";
  let tail = "";
  let found = false;
  for await (const chunk of source) {
    if (found) {
      tail += chunk;
      continue;
    }
    pending += chunk;
    const at = pending.indexOf(SENTINEL);
    if (at !== -1) {
      found = true;
      const before = pending.slice(0, at);
      if (before) yield before;
      tail = pending.slice(at + SENTINEL.length);
      pending = "";
      continue;
    }
    const keep = longestSentinelPrefixSuffix(pending);
    const emit = pending.slice(0, pending.length - keep);
    if (emit) yield emit;
    pending = pending.slice(pending.length - keep);
  }
  if (!found && pending) yield pending;
  if (onSuggestions) {
    onSuggestions(found ? extractSuggestions(SENTINEL + tail).suggestions : []);
  }
}
function longestSentinelPrefixSuffix(s) {
  const max = Math.min(SENTINEL.length - 1, s.length);
  for (let n = max; n > 0; n--) {
    if (s.endsWith(SENTINEL.slice(0, n))) return n;
  }
  return 0;
}
async function* filterVerbalLines(source) {
  diagLog(`>>> filterVerbalLines started (streaming)`);
  let mode = "deciding";
  let lineBuf = "";
  for await (const chunk of source) {
    let rest = chunk;
    while (rest.length > 0) {
      const nl = rest.indexOf("\n");
      const piece = nl === -1 ? rest : rest.slice(0, nl);
      rest = nl === -1 ? "" : rest.slice(nl + 1);
      const lineEnded = nl !== -1;
      if (mode === "passing") {
        if (piece) yield piece;
      } else if (mode === "deciding") {
        lineBuf += piece;
        if (!lineEnded) {
          const d = decidePartialLine(lineBuf);
          if (d.t === "drop") {
            diagLog(`HARD_DROP (streaming): ${JSON.stringify(lineBuf.slice(0, 80))}`);
            mode = "dropping";
            lineBuf = "";
          } else if (d.t === "emit") {
            mode = "passing";
            if (d.text) yield d.text;
            lineBuf = "";
          }
        }
      }
      if (lineEnded) {
        if (mode === "deciding") {
          const full = decideFullLine(lineBuf);
          if (full !== null) yield full + "\n";
        } else if (mode === "passing") {
          yield "\n";
        }
        mode = "deciding";
        lineBuf = "";
      }
    }
  }
  if (mode === "deciding" && lineBuf) {
    const full = decideFullLine(lineBuf);
    if (full !== null) {
      diagLog(`<<< flush yielded: ${JSON.stringify(full.slice(0, 80))}`);
      yield full;
    }
  }
}
function cleanNotation(s) {
  return s.replace(/`+/g, "").replace(/\*\*/g, "").replace(/\$(?=[^\d\s])|(?<=\S)\$/g, "").replace(/\\(?=[A-Za-z(){}[\]])/g, "");
}
async function* stripSpokenNotation(source) {
  let carry = "";
  let decided = false;
  let passthrough = false;
  for await (const chunk of source) {
    if (!decided) {
      const probe = (carry + chunk).trimStart();
      if (!probe) {
        carry += chunk;
        continue;
      }
      decided = true;
      passthrough = probe.startsWith("{");
      if (passthrough) {
        yield carry + chunk;
        carry = "";
        continue;
      }
    }
    if (passthrough) {
      yield chunk;
      continue;
    }
    let s = carry + chunk;
    carry = "";
    const held = s.match(/(\*\*|[*$\\])$/);
    if (held) {
      carry = held[0];
      s = s.slice(0, -carry.length);
    }
    if (s) {
      const out = cleanNotation(s);
      if (out) yield out;
    }
  }
  if (carry) {
    const out = passthrough ? carry : cleanNotation(carry);
    if (out) yield out;
  }
}
const SENTENCE_END = /[.!?]["'”’)\]]*(?=\s)/;
const TRAILING_TERMINATOR = /[.!?]["'”’)\]]*$/;
const countWords = (s) => (s.match(/\S+/g) ?? []).length;
async function* cutAtWordBudget(source, opts) {
  const { limit, floor } = opts;
  let emitted = 0;
  let inWord = false;
  const track = (s) => {
    let n = 0;
    for (const ch of s) {
      const space = /\s/.test(ch);
      if (!space && !inWord) n++;
      inWord = !space;
    }
    return n;
  };
  let mode = "stream";
  let carry = "";
  let cut = false;
  const finish = () => {
    opts.onDone?.({ words: emitted, cut, allowance: emitted > limit });
  };
  for await (const chunk of source) {
    let text = carry + chunk;
    carry = "";
    while (text.length > 0) {
      const m = SENTENCE_END.exec(text);
      if (mode === "stream") {
        if (!m) {
          const hold = TRAILING_TERMINATOR.exec(text);
          const keep = hold ? hold.index : text.length;
          if (keep > 0) {
            const piece = text.slice(0, keep);
            emitted += track(piece);
            yield piece;
          }
          carry = text.slice(keep);
          text = "";
        } else {
          const end = m.index + m[0].length;
          const piece = text.slice(0, end);
          emitted += track(piece);
          yield piece;
          text = text.slice(end);
          if (emitted >= floor) mode = "buffer";
        }
      } else {
        if (!m) {
          carry = text;
          text = "";
          break;
        }
        const end = m.index + m[0].length;
        const sentence = text.slice(0, end);
        if (emitted + countWords(sentence) >= limit) {
          cut = true;
          finish();
          return;
        }
        emitted += track(sentence);
        yield sentence;
        text = text.slice(end);
      }
    }
  }
  if (carry) {
    if (mode === "stream" || emitted + countWords(carry) <= limit) {
      emitted += track(carry);
      yield carry;
    } else if (carry.trim()) {
      cut = true;
    }
  }
  finish();
}
export {
  cutAtWordBudget,
  extractSuggestions,
  filterVerbalLines,
  stripSpokenNotation,
  stripSuggestionBlock
};
