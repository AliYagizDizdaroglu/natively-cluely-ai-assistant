import { describe, it, expect } from 'vitest';
import { DETECTOR_CALIBRATION_CASES, judgeDetection } from './detectorCalibration';

describe('judgeDetection', () => {
    it('passes when detected=true and the question carries every required word', () => {
        const result = { detected: true, question: 'A SageMaker endpoint has p99 latency creeping up — how do you diagnose and fix it?' };
        const j = judgeDetection(result, ['sagemaker', 'latency', 'diagnose']);
        expect(j).toEqual({ ok: true, missing: [] });
    });

    it('fails when the question drops the scenario sentence (bare last clause)', () => {
        const h02 = DETECTOR_CALIBRATION_CASES.find((c) => c.id === 'H02')!;
        const result = { detected: true, question: 'How do you diagnose and fix it?' };
        const j = judgeDetection(result, h02.mustContain);
        expect(j).toEqual({ ok: false, missing: ['sagemaker', 'latency'] });
    });

    it('fails with every word missing when the detector returns null', () => {
        const j = judgeDetection(null, ['sagemaker', 'latency', 'diagnose']);
        expect(j).toEqual({ ok: false, missing: ['sagemaker', 'latency', 'diagnose'] });
    });

    it('fails when detected=false even though the question contains every required word', () => {
        const result = { detected: false, question: 'A SageMaker endpoint has p99 latency creeping up — how do you diagnose and fix it?' };
        const j = judgeDetection(result, ['sagemaker', 'latency', 'diagnose']);
        expect(j).toEqual({ ok: false, missing: [] });
    });
});

describe('DETECTOR_CALIBRATION_CASES', () => {
    it('has exactly 4 cases', () => {
        expect(DETECTOR_CALIBRATION_CASES.length).toBe(4);
    });
});
