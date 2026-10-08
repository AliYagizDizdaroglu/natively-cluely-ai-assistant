const { stripSpokenNotation } = require('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/dist-electron/electron/llm/verbalStreamFilter.js');
(async () => {
  for (const t of ['improved by $9.5%$ after.', 'improved by $9.5\\%$ after.', 'a $50% cut.', '$5% better.', 'it cost $9.5 per user.']) {
    const outs = new Set();
    for (let size = 1; size <= 13; size++) {
      const src = (async function* () { for (let i = 0; i < t.length; i += size) yield t.slice(i, i + size); })();
      let o = ''; for await (const c of stripSpokenNotation(src)) o += c;
      outs.add(o);
    }
    console.log(JSON.stringify(t), '->', JSON.stringify([...outs]), 'invariant=' + (outs.size === 1));
  }
})();
