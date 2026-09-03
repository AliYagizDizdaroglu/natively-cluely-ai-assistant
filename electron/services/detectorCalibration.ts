/** Four (statement, question) pairs. H02/H08 lean on a scenario sentence spoken as
 *  a separate interviewer turn just before the question — the shapes the STT
 *  detector used to surface as a bare last clause (H02 → "How do you diagnose and
 *  fix it?"). H03/W01 are self-contained (empty statement — no earlier turn to
 *  feed, and no merge should occur). */
export interface DetectorCalibrationCase { id: string; statement: string; question: string; mustContain: string[] }
export const DETECTOR_CALIBRATION_CASES: DetectorCalibrationCase[] = [
    { id: 'H02', statement: 'A SageMaker endpoint serving ten thousand requests per second has p99 latency creeping up.', question: 'How do you diagnose and fix it?', mustContain: ['sagemaker', 'latency', 'diagnose'] },
    { id: 'H03', statement: '', question: 'How would you design a pipeline that retrains, validates, and deploys with no human in the loop, and what guardrails would you put in?', mustContain: ['pipeline', 'guardrails'] },
    { id: 'H08', statement: 'The same image behaves differently on your laptop and in the cluster.', question: 'How do you track that down?', mustContain: ['image', 'laptop', 'track'] },
    { id: 'W01', statement: '', question: 'What is the difference between a Docker image and a container?', mustContain: ['image', 'container'] },
];
/** PASS when the detector said detected and the returned question carries every required word. */
export function judgeDetection(result: { detected: boolean; question: string } | null, mustContain: string[]): { ok: boolean; missing: string[] } {
    const q = (result?.question ?? '').toLowerCase();
    const missing = mustContain.filter((w) => !q.includes(w));
    return { ok: !!result?.detected && missing.length === 0, missing };
}
