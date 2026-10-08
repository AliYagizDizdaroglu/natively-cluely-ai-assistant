import { pathToFileURL } from 'node:url';
const G = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\';
const { pairAnswers } = await import(pathToFileURL(G + 'interview60.judge.mjs'));
const tl = { items: [{ id: 'A', kind: 'spoken', q: 'And if the worker that claimed it crashes halfway?', playedAt: Date.parse('2026-09-04T08:01:30.000Z'), clipSecs: 3 }] };
const L = (rest) => `2026-09-04T08:01:40.000Z [LOG] [Main] dispatch: answer source=live anchor="Say \\"hello\\" there friend" verdict=paraphrase${rest}`;
for (const rest of ['', ' question="What if the worker that \\"claimed\\" it crashes halfway?"', ' question="unterminated', ' hedge=on question="worker claimed crashes halfway"']) {
    const p = pairAnswers(L(rest), tl);
    console.log(JSON.stringify(rest).slice(0, 70), '->', JSON.stringify(p.map((x) => [x.id, x.heard])));
}
