import { describe, it, expect } from 'vitest';
import { KnowledgeOrchestrator } from './KnowledgeOrchestrator';

// Fixtures only: the real user knowledge DB is never read.
function makeOrch(opts: { resume?: any | null; jd?: any | null }) {
  const resumeDoc = opts.resume === undefined || opts.resume === null ? null : { id: 1, type: 'resume', source_uri: 'fixture', structured_data: opts.resume };
  const jdDoc = opts.jd === undefined || opts.jd === null ? null : { id: 2, type: 'job_description', source_uri: 'fixture', structured_data: opts.jd };
  const db: any = {
    initializeSchema() {},
    getDocumentByType(t: string) { return t === 'resume' ? resumeDoc : jdDoc; },
    getAllNodes(): any[] { return []; },
  };
  return new KnowledgeOrchestrator(db);
}

const skills20 = Array.from({ length: 20 }, (_, i) => `s${i + 1}`);
const fullResume = { identity: { name: 'Ada Lovelace' }, skills: skills20, experience: [{ role: 'ML Engineer' }] };
const jd = { title: 'Staff Engineer', company: 'Acme', level: 'senior', location: 'Remote', technologies: ['Rust', 'Go'], keywords: ['scale', 'latency'] };

describe('KnowledgeOrchestrator.getRouterProfileSummary', () => {
  it('Off: knowledge mode off gives an empty string', () => {
    const o = makeOrch({ resume: fullResume, jd });
    expect(o.getRouterProfileSummary()).toBe('');
  });

  it('No resume gives an empty string', () => {
    const o = makeOrch({ resume: null, jd });
    o.setKnowledgeMode(true);
    expect(o.getRouterProfileSummary()).toBe('');
  });

  it('Full: three lines, 15 skills, the compact JD header', () => {
    const o = makeOrch({ resume: fullResume, jd });
    o.setKnowledgeMode(true);
    const lines = o.getRouterProfileSummary().split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('Candidate: Ada Lovelace, ML Engineer.');
    expect(lines[1]).toBe(`Skills: ${skills20.slice(0, 15).join(', ')}.`);
    expect(lines[2]).toBe(`Target role: ${o.getCompactJDHeader()}`);
  });

  it('Name only: no role', () => {
    const o = makeOrch({ resume: { identity: { name: 'Ada Lovelace' }, skills: [], experience: [] } });
    o.setKnowledgeMode(true);
    expect(o.getRouterProfileSummary()).toBe('Candidate: Ada Lovelace.');
  });

  it('Missing data: no skills and no JD gives one line only', () => {
    const o = makeOrch({ resume: { identity: { name: 'Ada Lovelace' }, experience: [{ role: 'ML Engineer' }] } });
    o.setKnowledgeMode(true);
    expect(o.getRouterProfileSummary().split('\n')).toEqual(['Candidate: Ada Lovelace, ML Engineer.']);
  });

  it('is deterministic', () => {
    const o = makeOrch({ resume: fullResume, jd });
    o.setKnowledgeMode(true);
    expect(o.getRouterProfileSummary()).toBe(o.getRouterProfileSummary());
  });
});
