// THROWAWAY: append the joined-window describe block (RED step).
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionReconcile.test.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const block = [
    '',
    'describe(\'reconcileLiveQuestion — a question longer than any single transcript line\', () => {',
    '    // after9 L03, verbatim: the Deepgram finals of the hour, offsets from the moment Live',
    '    // reported the question. The question took 25.9s to ask and Live reported it 5.3s later,',
    '    // so it is spread over seven lines and covers at most 0.19 of any one of them — below the',
    '    // floor, and the hour answered the last line instead: "that people do not start ignoring it."',
    '    const L03_WINDOW: RecentSpeech[] = [',
    '        sp("Let\'s talk about monitoring.", -27562),',
    '        sp(\'Say you have 20 models in production owned by four different teams,\', -22383),',
    '        sp(\'and today each team watches its own dashboards by hand.\', -19005),',
    '        sp(\'Design me a monitoring setup that catches data drift,\', -13794),',
    '        sp(\'prediction drift, and plain infrastructure failures across all of them,\', -10522),',
    '        sp(\'and explain who gets paged for what, and how you would keep the false alarms low enough\', -6199),',
    '        sp(\'that people do not start ignoring it.\', -4005),',
    '    ];',
    '    const L03_CLAIM = \'Say you have twenty models in production, owned by four different teams, and today each team \'',
    '        + \'watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction \'',
    '        + \'drift, and plain infrastructure problems, tells you which team owns the alert, and keeps the false \'',
    '        + \'alarm rate low enough that people do not start ignoring it.\';',
    '',
    '    it(\'is corroborated by the window as a whole, not by any one line of it\', () => {',
    '        const r = reconcileLiveQuestion(L03_CLAIM, L03_WINDOW);',
    '        expect(r.verdict).toBe(\'match\');',
    '        expect(r.text).toBe(L03_CLAIM);',
    '    });',
    '',
    '    // after8 07:36:26, verbatim: Live claimed a question nobody asked. It shares exactly two',
    '    // content words with the real one ("multiple", "cluster"), which puts the JOINED window at',
    '    // 0.25 — the paraphrase floor. Corroborating on the join at that floor would keep the',
    '    // invented question, the failure this whole reconciler exists to prevent (2026-09-02 M04),',
    '    // so the join is held to MATCH instead. The genuine long questions clear it at 0.95-1.00.',
    '    it(\'does not let a union of unrelated speech corroborate an invented question\', () => {',
    '        const r = reconcileLiveQuestion(\'How would you approach deploying multiple versions of the same model in one cluster?\', [',
    '            sp(\'How do you manage GPU resources across multiple teams\', -8090),',
    '            sp(\'sharing one cluster?\', -6695),',
    '        ]);',
    '        expect(r.verdict).toBe(\'unverifiable\');',
    '    });',
    '});',
    '',
].join(eol);

fs.writeFileSync(p, s.trimEnd() + eol + block);
console.log('join tests appended');
