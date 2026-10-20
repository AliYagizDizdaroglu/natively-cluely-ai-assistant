import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// S2 source pin: main.ts feeds the tracker at both answer dispatch sites and un-marks from the end event.
describe('main.ts wires the answer outcome to the deduper', () => {
  const src = readFileSync(join(__dirname, 'main.ts'), 'utf8');
  it('the answer branch and the supersede branch both register their dispatch', () => {
    expect((src.match(/this\.answerOutcome\.dispatched\(/g) ?? []).length).toBe(2);
  });
  it('the suggested_answer_end handler asks the tracker and un-marks the deduper, with the arbiter\'s Live-shown answer', () => {
    const i = src.indexOf("on('suggested_answer_end'");
    expect(i).toBeGreaterThan(0);
    const body = src.slice(i, src.indexOf('\n    })', i));
    expect(body).toContain('this.answerOutcome.ended(');
    expect(body).toContain('this.routerArbiter.pipelineDecided(');
    expect(body).not.toContain('liveShown(');
    expect(body).toContain('this.chipDeduper.unmarkAnswered(');
  });
});
