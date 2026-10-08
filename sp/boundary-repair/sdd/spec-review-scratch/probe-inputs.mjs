// Spec-review scratch: feed hand-built (I, F1, F2) sequences to the reference and print what it emits.
import { createRepair } from '../../rule-v3.mjs';
const run = (label, I, F1, F2, gap = 2000) => {
    const r = createRepair();
    r.onTranscript(I, false, 0); r.onTranscript(F1, true, 100);
    const out = r.onTranscript(F2, true, 100 + gap);
    console.log(`${label.padEnd(34)} -> ${out.restored ? `RESTORED ${JSON.stringify(out.restored)}: ` : 'unchanged: '}${JSON.stringify(out.text)}`);
};
// calibration: the real neg#28 sequence (gap 5164 in the log) and the R22 symptom
run('neg#28 as logged (gap 5164)', 'accuracy reaching ninety two percent', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 5164);
run('neg#28 inside the window', 'accuracy reaching ninety two percent', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,', 3000);
run('R22 symptom', 'How do you cut hallucinations in a rag answer without just making', 'How do you cut', 'in a rag answer without just making it refuse?', 1547);
// number merge at F1's last token, interim one or two words further
run('92% + interim ran 2 words on', 'accuracy reaching ninety two percent for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,');
run('25 + interim ran 2 words on', 'we cut latency by twenty five last quarter', 'We cut latency by 25', 'last quarter. What changed?');
run('15% + interim ran on', 'your model accuracy dropped fifteen percent overnight but', 'Your model accuracy dropped 15%', 'overnight, but the input schema is unchanged.');
run('compound merge alright', 'thanks all right so tell me about', 'Thanks. Alright.', 'So tell me about your last project.');
// the same shapes with the interim already in digits (no merge): must be untouched
run('control: interim already digits', 'accuracy reaching 92% for each', 'accuracy reaching 92%.', 'For each of those metrics, define the unit of evaluation,');
// filler / stutter shapes (human speech): only meaningful if interims carry what finals drop
run('stutter the the', "what's the the latency budget", "What's the", 'latency budget for this endpoint?');
run('interim filler um (if interims keep it)', 'so how would you um scale the service', 'So how would you', 'scale the service?');
