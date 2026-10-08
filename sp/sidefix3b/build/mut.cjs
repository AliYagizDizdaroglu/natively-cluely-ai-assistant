var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var verbalStreamFilter_exports = {};
__export(verbalStreamFilter_exports, {
  SPOKEN_WORD_GUARD: () => SPOKEN_WORD_GUARD,
  cutAtWordBudget: () => cutAtWordBudget,
  extractCues: () => extractCues,
  extractSuggestions: () => extractSuggestions,
  filterCodeFences: () => filterCodeFences,
  filterVerbalLines: () => filterVerbalLines,
  stripCueBlock: () => stripCueBlock,
  stripSpokenNotation: () => stripSpokenNotation,
  stripSuggestionBlock: () => stripSuggestionBlock,
  trimCues: () => trimCues
});
module.exports = __toCommonJS(verbalStreamFilter_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const DIAG_LOG = path.join(process.cwd(), "verbal-diag.log");
function diagLog(msg) {
  if (process.type !== "browser") return;
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
const LIST_MARKER = /^(?:\d{1,2}[.)]|[-*•])\s+/;
const LIST_MARKER_PREFIX = /^(?:\d{1,2}[.)]?|[-*•])$/;
const stripListMarker = (line) => {
  const trimmed = line.trimStart();
  const m = trimmed.match(LIST_MARKER);
  if (!m) return null;
  return line.slice(0, line.length - trimmed.length) + trimmed.slice(m[0].length);
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
  const unmarked = stripListMarker(line);
  if (unmarked !== null) {
    diagLog(`LIST_MARKER: ${JSON.stringify(line.slice(0, 40))}`);
    return decideFullLine(unmarked);
  }
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
  if (LIST_MARKER_PREFIX.test(trimmed)) return { t: "wait" };
  const unmarked = stripListMarker(buf);
  if (unmarked !== null) return decidePartialLine(unmarked);
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
async function* filterCodeFences(source) {
  const CARRY_LEN = 3;
  let carry = "";
  let suppressing = false;
  for await (const chunk of source) {
    const combined = carry + chunk;
    let output = "";
    let i = 0;
    while (i < combined.length - CARRY_LEN) {
      if (!suppressing && combined.startsWith("```", i)) {
        suppressing = true;
        i += 3;
        while (i < combined.length && combined[i] !== "\n") i++;
        continue;
      }
      if (suppressing && combined.startsWith("```", i)) {
        suppressing = false;
        i += 3;
        console.warn("[verbalStreamFilter] filterCodeFences: code fence suppressed on verbal path \u2014 check intent classifier");
        continue;
      }
      if (!suppressing && combined[i] !== "`") output += combined[i];
      i++;
    }
    carry = combined.slice(Math.max(0, combined.length - CARRY_LEN));
    if (output) yield output;
  }
  if (carry && !suppressing) {
    const cleaned = carry.replace(/`/g, "");
    if (cleaned) yield cleaned;
  }
}
const SENTINEL = "__MORE__";
function extractSuggestions(text) {
  const i = text.indexOf(SENTINEL);
  if (i === -1) return { answer: text, suggestions: [] };
  if (text.slice(0, i).trim() !== "") {
    return { answer: text.slice(0, i).replace(/\s+$/, ""), suggestions: offersIn(text.slice(i + SENTINEL.length).split("\n")) };
  }
  const lines = text.slice(i + SENTINEL.length).split("\n");
  const suggestions = [];
  let k = 0;
  for (; k < lines.length; k++) {
    const t = lines[k].trim();
    if (t === "") continue;
    const m = t.match(CUE_LINE);
    if (!m) break;
    const s = suggestionOf(m);
    if (s) suggestions.push(s);
  }
  if (k === lines.length) return { answer: "", suggestions };
  const rest = extractSuggestions(lines.slice(k).join("\n"));
  return { answer: rest.answer, suggestions: suggestions.concat(rest.suggestions) };
}
async function* stripSuggestionBlock(source, onSuggestions) {
  let phase = "answer";
  let pending = "";
  let tail = "";
  let spoke = false;
  let named = false;
  const leading = [];
  for await (const chunk of source) {
    if (phase === "tail") {
      tail += chunk;
      continue;
    }
    pending += chunk;
    for (; ; ) {
      if (phase === "answer") {
        const at = pending.indexOf(SENTINEL);
        if (at === -1) {
          const keep = longestSentinelPrefixSuffix(pending);
          const emit = pending.slice(0, pending.length - keep);
          if (emit) {
            if (emit.trim()) spoke = true;
            yield emit;
          }
          pending = pending.slice(pending.length - keep);
          break;
        }
        const before = pending.slice(0, at);
        if (before) {
          if (before.trim()) spoke = true;
          yield before;
        }
        pending = pending.slice(at + SENTINEL.length);
        if (spoke) {
          phase = "tail";
          tail = pending;
          pending = "";
          break;
        }
        phase = "lead";
        if (!named) {
          named = true;
          console.warn("[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)");
        }
      }
      let nl;
      let closed = false;
      while ((nl = pending.indexOf("\n")) !== -1) {
        const t = pending.slice(0, nl).trim();
        if (t === "") {
          pending = pending.slice(nl + 1);
          continue;
        }
        const m = t.match(CUE_LINE);
        if (!m) {
          closed = true;
          break;
        }
        const s = suggestionOf(m);
        if (s) leading.push(s);
        pending = pending.slice(nl + 1);
      }
      if (!closed) {
        const head = pending.trim();
        if (head !== "" && !CUE_LINE_PREFIX.test(head)) closed = true;
      }
      if (!closed) break;
      phase = "answer";
    }
  }
  if (phase === "answer" && pending) yield pending;
  if (phase === "lead") {
    const m = pending.trim().match(CUE_LINE);
    if (m) {
      const s = suggestionOf(m);
      if (s) leading.push(s);
    } else if (pending.trim()) yield pending;
  }
  onSuggestions?.(leading.concat(phase === "tail" ? offersIn(tail.split("\n")) : []));
}
function longestSentinelPrefixSuffix(s) {
  const max = Math.min(SENTINEL.length - 1, s.length);
  for (let n = max; n > 0; n--) {
    if (s.endsWith(SENTINEL.slice(0, n))) return n;
  }
  return 0;
}
const CUES_SENTINEL = "__CUES__";
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const CUE_LINE_PREFIX = /^\d+\s*(\|\s*.*)?$/;
const cuePhrase = (m) => m[2].trim().replace(/^["'`]|["'`]$/g, "");
const suggestionOf = (m) => {
  const label = cuePhrase(m);
  return label ? { n: Number(m[1]), label } : null;
};
const offersIn = (lines) => {
  const offers = [];
  for (const raw of lines) {
    const m = raw.trim().match(CUE_LINE);
    if (!m) continue;
    const s = suggestionOf(m);
    if (s) offers.push(s);
  }
  return offers;
};
function extractCues(text) {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i === lines.length) return { cues: [], prose: text };
  const first = lines[i].trimStart();
  if (!first.startsWith(CUES_SENTINEL)) return { cues: [], prose: text };
  lines[i] = first.slice(CUES_SENTINEL.length);
  const cues = [];
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "") continue;
    const m = t.match(CUE_LINE);
    if (!m) break;
    const phrase = cuePhrase(m);
    if (phrase) cues.push(phrase);
  }
  return { cues, prose: lines.slice(i).join("\n") };
}
async function* stripCueBlock(source, onCues) {
  let phase = "prefix";
  let pending = "";
  const cues = [];
  let reported = false;
  const report = () => {
    if (reported) return;
    reported = true;
    onCues?.(cues.slice());
  };
  for await (const chunk of source) {
    if (phase === "prose") {
      yield chunk;
      continue;
    }
    pending += chunk;
    if (phase === "prefix") {
      const lead = pending.replace(/^\s+/, "");
      if (lead.startsWith(CUES_SENTINEL)) {
        phase = "block";
        pending = lead.slice(CUES_SENTINEL.length);
      } else if (CUES_SENTINEL.startsWith(lead)) {
        continue;
      } else {
        phase = "prose";
        report();
        yield pending;
        pending = "";
        continue;
      }
    }
    let nl;
    while ((nl = pending.indexOf("\n")) !== -1) {
      const t = pending.slice(0, nl).trim();
      if (t === "") {
        pending = pending.slice(nl + 1);
        continue;
      }
      const m = t.match(CUE_LINE);
      if (m) {
        const phrase = cuePhrase(m);
        if (phrase) cues.push(phrase);
        pending = pending.slice(nl + 1);
        continue;
      }
      phase = "prose";
      report();
      yield pending;
      pending = "";
      break;
    }
    if (phase === "block") {
      const head = pending.trim();
      if (head !== "" && !CUE_LINE_PREFIX.test(head)) {
        phase = "prose";
        report();
        yield pending;
        pending = "";
      }
    }
  }
  if (phase === "prefix") {
    report();
    if (pending) yield pending;
    return;
  }
  if (phase === "block") {
    const m = pending.trim().match(CUE_LINE);
    if (m) {
      const phrase = cuePhrase(m);
      if (phrase) cues.push(phrase);
      pending = "";
    }
    report();
    if (pending.trim()) yield pending;
  }
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
  return s.replace(/\\(?:text|mathrm|mathit|operatorname)\{([^}]*)\}/g, "$1").replace(/\$(\d[\d,]*(?:\.\d+)?|\\[A-Za-z]+(?:\{[^{}]*\})*)\$/g, "$1").replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1 over $2").replace(/`+/g, "").replace(/\*\*/g, "").replace(/\*(?=\S)|(?<=\S)\*/g, "").replace(/\$(?=[^\d\s])|\$(?=\d+(?:\.\d+)?\s*(?:\^|\/(?:\s|\()|\\%))|(?<=\S)\$/g, "").replace(/\\(?=[A-Za-z(){}[\]%])/g, "");
}
function trimCues(raw, maxLines, maxWords) {
  const cut = [];
  const cleaned = [];
  const cues = raw.slice(0, maxLines).map((line) => {
    const clean = cleanNotation(line).trim();
    if (clean !== line) cleaned.push(line);
    const words = clean.match(/\S+/g) ?? [];
    if (words.length <= maxWords) return clean;
    cut.push(line);
    return words.slice(0, maxWords).join(" ");
  });
  return { cues, rawLines: raw.length, dropped: raw.slice(maxLines), cut, cleaned };
}
async function* stripSpokenNotation(source) {
  let carry = "";
  let decided = false;
  let passthrough = false;
  let lastOut = "";
  const closingDelimiterFirst = (s) => /^(?:\$|\*(?!\*))/.test(s) && /\S/.test(lastOut) ? s.slice(1) : s;
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
    const held = s.match(/(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$(?:(?<!\$(?:\d[\d,]*(?:\.\d+)?|\\[A-Za-z]+(?:\{[^{}]*\})*)\$)|(?=\$))(?:\d[\d,]*)?(?:\.\d*)?\$?\s*[/^\\]?\s*|\\frac\{[^{}]{0,40}\}(?:\{[^{}]{0,40})?|\\[a-z]*(?:\{[^}]{0,40})?)$/);
    if (held) {
      carry = held[0];
      s = s.slice(0, -carry.length);
    }
    if (s) {
      const out = cleanNotation(closingDelimiterFirst(s));
      if (out) {
        lastOut = out.slice(-1);
        yield out;
      }
    }
  }
  if (carry) {
    const out = passthrough ? carry : cleanNotation(closingDelimiterFirst(carry));
    if (out) yield out;
  }
}
const SENTINEL_CHUNK = /^__model_source:[^_]*__$/;
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
  const fitToCeiling = (s, room) => {
    let n = 0;
    let wasIn = inWord;
    for (let i = 0; i < s.length; i++) {
      const space = /\s/.test(s[i]);
      if (!space && !wasIn) {
        if (n === room) return s.slice(0, i);
        n++;
      }
      wasIn = !space;
    }
    return s;
  };
  let mode = "stream";
  let carry = "";
  let cut = false;
  const finish = () => {
    opts.onDone?.({ words: emitted, cut, allowance: emitted > limit });
  };
  const ceiling = opts.ceiling ?? 2 * limit;
  let decided = false;
  let payload = false;
  let probe = "";
  for await (let chunk of source) {
    if (SENTINEL_CHUNK.test(chunk)) {
      yield chunk;
      continue;
    }
    if (!decided) {
      const head = (probe += chunk).trimStart();
      if (head === "" || head === "{") continue;
      decided = true;
      payload = head.startsWith('{"');
      chunk = probe;
    }
    if (payload) {
      yield chunk;
      continue;
    }
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
            const fitted = fitToCeiling(piece, ceiling - emitted);
            emitted += track(fitted);
            if (fitted) yield fitted;
            if (fitted.length < piece.length) {
              cut = true;
              finish();
              return;
            }
          }
          carry = text.slice(keep);
          text = "";
        } else {
          const end = m.index + m[0].length;
          const piece = text.slice(0, end);
          const fitted = fitToCeiling(piece, ceiling - emitted);
          emitted += track(fitted);
          if (fitted) yield fitted;
          if (fitted.length < piece.length) {
            cut = true;
            finish();
            return;
          }
          text = text.slice(end);
          if (emitted >= floor) mode = "buffer";
        }
      } else {
        if (!m) {
          if (emitted + countWords(text) > ceiling) {
            cut = true;
            finish();
            return;
          }
          carry = text;
          text = "";
          break;
        }
        const end = m.index + m[0].length;
        const sentence = text.slice(0, end);
        if (emitted + countWords(sentence) > limit) {
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

    emitted += track(probe);
    yield probe;
  }
  if (carry) {
    if (mode === "stream") {
      const fitted = fitToCeiling(carry, ceiling - emitted);
      emitted += track(fitted);
      if (fitted) yield fitted;
      if (fitted.length < carry.length) cut = true;
    } else if (emitted + countWords(carry) <= limit) {
      emitted += track(carry);
      yield carry;
    } else if (carry.trim()) {
      cut = true;
    }
  }
  finish();
}
const SPOKEN_WORD_GUARD = { limit: 200, floor: 120, ceiling: 200 };
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SPOKEN_WORD_GUARD,
  cutAtWordBudget,
  extractCues,
  extractSuggestions,
  filterCodeFences,
  filterVerbalLines,
  stripCueBlock,
  stripSpokenNotation,
  stripSuggestionBlock,
  trimCues
});
