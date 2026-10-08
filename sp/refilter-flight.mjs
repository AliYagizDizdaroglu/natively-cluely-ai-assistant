// Throwaway: feed the answers the app actually delivered in flight s50b (already through the
// OLD filter) through the NEW filter chain from the worktree's dist-electron, and show what
// changes on the six delivery-0 items. Read-only on the flight folder.
//   node refilter-flight.mjs <worktree-root> <flight-judge.json>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [WT, JUDGE] = process.argv.slice(2);
const require = createRequire(path.join(WT, 'package.json'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } =
    require(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));

const items = JSON.parse(fs.readFileSync(JUDGE, 'utf8')).items;
const IDS = ['S1Q04', 'S1Q05', 'S1Q06', 'S2Q04', 'S2Q05', 'S2Q06'];
const marker = /(^|\n)\s*(\d{1,2}[.)]|[-*•])\s/;
const words = (s) => (s.trim().match(/\S+/g) || []).length;

for (const id of IDS) {
    const before = items[id].answer;
    async function* gen() { for (let i = 0; i < before.length; i += 7) yield before.slice(i, i + 7); }
    let after = '';
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen()), () => {}))) after += p;
    after = after.replace(/\n{3,}/g, '\n\n').trim();
    console.log(`\n=== ${id}  (${items[id].correctness}/${items[id].on_topic}/${items[id].delivery} ${items[id].verdict})  before ${words(before)}w  after ${words(after)}w  markers before=${marker.test(before)} after=${marker.test(after)}  dollar before=${/\$/.test(before)} after=${/\$/.test(after)}`);
    console.log(after);
}
