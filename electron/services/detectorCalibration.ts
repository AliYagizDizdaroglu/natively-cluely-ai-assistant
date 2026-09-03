/** Four transcripts whose questions lean on a scenario sentence — the shapes the STT
 *  detector used to surface as a bare last clause (H02 → "How do you diagnose and fix it?"). */
export interface DetectorCalibrationCase { id: string; transcript: string; mustContain: string[] }
export const DETECTOR_CALIBRATION_CASES: DetectorCalibrationCase[] = [
    { id: 'H02', transcript: 'INTERVIEWER: A SageMaker endpoint serving ten thousand requests per second has p99 latency creeping up.\nINTERVIEWER: How do you diagnose and fix it?', mustContain: ['sagemaker', 'latency', 'diagnose'] },
    { id: 'H03', transcript: 'INTERVIEWER: How would you design a pipeline that retrains, validates, and deploys with no human in the loop, and what guardrails would you put in?', mustContain: ['pipeline', 'guardrails'] },
    { id: 'H08', transcript: 'INTERVIEWER: The same image behaves differently on your laptop and in the cluster.\nINTERVIEWER: How do you track that down?', mustContain: ['image', 'laptop', 'track'] },
    { id: 'W01', transcript: 'INTERVIEWER: What is the difference between a Docker image and a container?', mustContain: ['image', 'container'] },
];
/** PASS when the detector said detected and the returned question carries every required word. */
export function judgeDetection(result: { detected: boolean; question: string } | null, mustContain: string[]): { ok: boolean; missing: string[] } {
    const q = (result?.question ?? '').toLowerCase();
    const missing = mustContain.filter((w) => !q.includes(w));
    return { ok: !!result?.detected && missing.length === 0, missing };
}
