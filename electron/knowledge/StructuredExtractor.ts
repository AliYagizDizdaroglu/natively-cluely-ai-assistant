// electron/knowledge/StructuredExtractor.ts
// Uses the LLM to extract structured JSON from raw document text.

import { DocType, StructuredResume, StructuredJD } from './types';

const RESUME_PROMPT = `You are an expert resume parser. Extract structured data from the resume text below.

Output ONLY valid JSON matching this schema exactly (no markdown, no explanation):
{
  "identity": {
    "name": string,
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "github": string | null,
    "website": string | null,
    "summary": string | null
  },
  "skills": string[],
  "experience": [
    {
      "company": string,
      "role": string,
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM" | null,
      "bullets": string[]
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": string[],
      "url": string | null
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "field": string,
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM" | null,
      "gpa": string | null
    }
  ],
  "achievements": [{ "title": string, "description": string, "date": string | null }],
  "certifications": [{ "name": string, "issuer": string, "date": string | null }],
  "leadership": [{ "role": string, "organization": string, "description": string }]
}

Rules:
- Use "ongoing" end dates as null.
- Format all dates as YYYY-MM. If only year known, use YYYY-01.
- skills: flat array of individual skills (not grouped).
- bullets: each bullet is one achievement or responsibility as a string.
- If a field is missing from the resume, use null or [].

RESUME TEXT:
`;

const JD_PROMPT = `You are an expert job description parser. Extract structured data from the job posting below.

Output ONLY valid JSON matching this schema exactly (no markdown, no explanation):
{
  "title": string,
  "company": string,
  "location": string,
  "description_summary": string,
  "level": "intern" | "entry" | "mid" | "senior" | "staff" | "principal",
  "employment_type": "full_time" | "part_time" | "contract" | "internship",
  "min_years_experience": number,
  "compensation_hint": string,
  "requirements": string[],
  "nice_to_haves": string[],
  "responsibilities": string[],
  "technologies": string[],
  "keywords": string[]
}

Rules:
- level: infer from title/requirements ("senior" → senior, "principal/staff" → staff/principal, "junior/entry" → entry, etc.)
- min_years_experience: extract from "X+ years required" or infer from level (intern=0, entry=0-2, mid=2-5, senior=5+)
- compensation_hint: salary range if stated, else empty string
- technologies: specific tech/tools/languages mentioned (e.g. "React", "PostgreSQL", "Kubernetes")
- keywords: domain/role-specific terms important for this job
- requirements: MUST HAVE qualifications
- nice_to_haves: PREFERRED but not required qualifications

JOB DESCRIPTION:
`;

/**
 * Extracts structured data from raw text using the LLM.
 */
export async function extractStructuredData<T>(
    rawText: string,
    docType: DocType,
    generateContentFn: (contents: any[]) => Promise<string>
): Promise<T> {
    const prompt = docType === DocType.RESUME ? RESUME_PROMPT : JD_PROMPT;
    const fullPrompt = prompt + rawText.slice(0, 12000); // cap at ~12k chars to avoid token limits

    let raw: string;
    try {
        raw = await generateContentFn([{ text: fullPrompt }]);
    } catch (err: any) {
        throw new Error(`LLM extraction failed: ${err.message}`);
    }

    // Strip markdown code fences if present
    const clean = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(clean) as T;
    } catch (err: any) {
        throw new Error(`Failed to parse LLM JSON output: ${err.message}. Raw: ${clean.slice(0, 200)}`);
    }
}
