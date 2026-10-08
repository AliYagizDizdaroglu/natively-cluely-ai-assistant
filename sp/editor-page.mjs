// THROWAWAY: a realistic shared coding editor — the thing the user will actually
// screenshot in the interview. The golden suite renders problems as clean SVG cards,
// which is NOT what a CoderPad/HackerRank screen looks like: dark chrome, line numbers,
// a split pane, small text on a big display, syntax colour, half-typed code.

const PROBLEM = {
    title: '56. Merge Intervals',
    body: [
        'Given an array of intervals where intervals[i] = [start_i, end_i],',
        'merge all overlapping intervals, and return an array of the',
        'non-overlapping intervals that cover all the intervals in the input.',
        '',
        'Example 1:',
        '  Input:  intervals = [[1,3],[2,6],[8,10],[15,18]]',
        '  Output: [[1,6],[8,10],[15,18]]',
        '  Explanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].',
        '',
        'Example 2:',
        '  Input:  intervals = [[1,4],[4,5]]',
        '  Output: [[1,5]]',
        '  Explanation: Intervals [1,4] and [4,5] are considered overlapping.',
        '',
        'Constraints:',
        '  1 <= intervals.length <= 10^4',
        '  intervals[i].length == 2',
        '  0 <= start_i <= end_i <= 10^4',
    ],
};

// The negative control renders a DIFFERENT problem *and* different code. The first
// version swapped only the prose, so "intervals" still appeared in the editor pane and
// no keyword check could separate the arms — the calibration caught that and refused.
const DECOY = {
    title: '20. Valid Parentheses',
    body: [
        "Given a string s containing just the characters '(', ')', '{', '}',",
        "'[' and ']', determine if the input string is valid.",
        '',
        'An input string is valid if:',
        '  1. Open brackets are closed by the same type of brackets.',
        '  2. Open brackets are closed in the correct order.',
        '  3. Every close bracket has a corresponding open bracket.',
        '',
        'Example 1:',
        '  Input:  s = "()[]{}"',
        '  Output: true',
    ],
};

const CODE = [
    'class Solution:',
    '    def merge(self, intervals: List[List[int]]) -> List[List[int]]:',
    '        # sort by start, then sweep',
    '        intervals.sort(key=lambda x: x[0])',
    '        out = []',
    '        for iv in intervals:',
    '            if out and iv[0] <= out[-1][1]:',
    '                out[-1][1] = max(out[-1][1], iv[1])',
    '            else:',
    '                out.append(iv)',
    '        ',
];

const DECOY_CODE = [
    'class Solution:',
    '    def isValid(self, s: str) -> bool:',
    '        # match closers against a stack',
    '        pairs = {")": "(", "]": "[", "}": "{"}',
    '        stack = []',
    '        for ch in s:',
    '            if ch in pairs:',
    '                if not stack or stack.pop() != pairs[ch]:',
    '                    return False',
    '            else:',
    '                stack.append(ch)',
    '        ',
];

const EMPTY_CODE = ['class Solution:', '    def merge(self, intervals):', '        '];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ONE alternation, ONE pass. String.replace with a callback never rescans what it emits,
// so a keyword inside a span it just wrote cannot be wrapped again.
const TOKEN = /\b(class|def|for|if|else|return|lambda|in|and|or|not|max|self)\b|\b(\d+)\b/g;

/**
 * Crude Python colouring. The comment is split off BEFORE colouring, and the spans are
 * emitted via sentinels rather than by regex-over-markup: the first version ran the
 * keyword pass across already-emitted HTML, so `class` inside `<span class="cm">` was
 * wrapped a second time and the page rendered the literal text `class="cm">`. The vision
 * model duly reported a syntax error on line 3 — it was reading the screen correctly and
 * the RENDER was the defect.
 */
function colour(line) {
    const cut = line.indexOf('#');
    const code = cut >= 0 ? line.slice(0, cut) : line;
    const comment = cut >= 0 ? line.slice(cut) : '';
    const html = esc(code).replace(TOKEN, (_m, kw, num) =>
        kw ? `<span class="kw">${kw}</span>` : `<span class="nu">${num}</span>`);
    return html + (comment ? `<span class="cm">${esc(comment)}</span>` : '');
}

/**
 * @param {object} o
 * @param {'dark'|'light'} o.theme
 * @param {number} o.fontPx     editor font size — small text on a big display is the real case
 * @param {boolean} o.scrolled  problem pane scrolled so the title is off-screen
 * @param {boolean} o.decoy     the OTHER problem, with its own code (negative control)
 * @param {boolean} o.empty     editor barely started — the realistic "just opened it" case
 * @param {boolean} o.testPane  HackerRank-style testcase strip along the bottom
 */
export function editorHtml({ theme = 'dark', fontPx = 14, scrolled = false, decoy = false, empty = false, testPane = false } = {}) {
    const p = decoy ? DECOY : PROBLEM;
    const src = empty ? EMPTY_CODE : decoy ? DECOY_CODE : CODE;
    const body = scrolled ? p.body.slice(6) : p.body;
    const title = scrolled ? '' : `<h1>${esc(p.title)}</h1>`;
    const dark = theme === 'dark';
    return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font:${fontPx}px/1.55 -apple-system,Segoe UI,sans-serif;
       background:${dark ? '#1e1e1e' : '#ffffff'};color:${dark ? '#d4d4d4' : '#24292f'};height:100vh;display:flex;flex-direction:column}
  .top{height:40px;flex:0 0 40px;background:${dark ? '#252526' : '#f6f8fa'};border-bottom:1px solid ${dark ? '#3c3c3c' : '#d0d7de'};
       display:flex;align-items:center;gap:14px;padding:0 14px;font-size:${fontPx - 1}px}
  .dot{width:9px;height:9px;border-radius:50%;background:#3fb950}
  .pill{background:${dark ? '#37373d' : '#eaeef2'};border-radius:4px;padding:2px 9px}
  .who{margin-left:auto;display:flex;gap:6px;align-items:center}
  .av{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:10px;color:#fff}
  .main{flex:1;display:flex;min-height:0}
  .left{width:42%;padding:18px 22px;overflow:hidden;border-right:1px solid ${dark ? '#3c3c3c' : '#d0d7de'}}
  .left h1{font-size:${fontPx + 4}px;margin-bottom:12px;font-weight:600}
  .left pre{font:${fontPx}px/1.6 Consolas,monospace;white-space:pre-wrap;color:${dark ? '#cccccc' : '#24292f'}}
  .right{flex:1;display:flex;flex-direction:column;min-width:0}
  .tabs{height:32px;flex:0 0 32px;background:${dark ? '#252526' : '#f6f8fa'};display:flex;align-items:stretch;font-size:${fontPx - 1}px}
  .tab{padding:0 14px;display:flex;align-items:center;background:${dark ? '#1e1e1e' : '#fff'};border-right:1px solid ${dark ? '#3c3c3c' : '#d0d7de'}}
  .ed{flex:1;display:flex;overflow:hidden;font:${fontPx}px/1.65 Consolas,monospace}
  .ln{padding:10px 10px 0 16px;text-align:right;color:${dark ? '#6e7681' : '#8c959f'};user-select:none}
  .code{padding:10px 0 0 14px;white-space:pre;flex:1}
  .kw{color:${dark ? '#569cd6' : '#cf222e'}} .cm{color:${dark ? '#6a9955' : '#6e7781'}} .nu{color:${dark ? '#b5cea8' : '#0550ae'}}
  .cur{display:inline-block;width:1px;height:${fontPx + 2}px;background:${dark ? '#d4d4d4' : '#24292f'};vertical-align:-3px}
  .tp{flex:0 0 110px;border-top:1px solid ${dark ? '#3c3c3c' : '#d0d7de'};background:${dark ? '#252526' : '#f6f8fa'};padding:10px 16px;font:${fontPx - 1}px/1.6 Consolas,monospace}
</style></head><body>
  <div class="top"><span class="dot"></span><b>pairpad</b>
    <span class="pill">Python 3</span><span class="pill">Run</span>
    <div class="who"><div class="av" style="background:#8957e5">SA</div><div class="av" style="background:#1f6feb">MK</div></div></div>
  <div class="main">
    <div class="left">${title}<pre>${body.map(esc).join('\n')}</pre></div>
    <div class="right">
      <div class="tabs"><div class="tab">solution.py</div></div>
      <div class="ed">
        <div class="ln">${src.map((_, i) => i + 1).join('<br>')}</div>
        <div class="code">${src.map(colour).join('\n')}<span class="cur"></span></div>
      </div>
      ${testPane ? `<div class="tp">TESTCASE 1&nbsp;&nbsp;intervals = [[1,3],[2,6],[8,10],[15,18]]<br>EXPECTED&nbsp;&nbsp;&nbsp;&nbsp;[[1,6],[8,10],[15,18]]<br><span style="color:#6a9955">not run yet</span></div>` : ''}
    </div>
  </div></body></html>`;
}

// Keyed on the problem NAME, not generic words: "interval" appears in the decoy's editor
// pane too, so a generic-word check cannot separate the arms.
export const EXPECT = { name: /merge\s*intervals/i, notName: /valid\s*parenthes/i };
export const DECOY_EXPECT = { name: /valid\s*parenthes/i, notName: /merge\s*intervals/i };
