// electron/knowledge/PostProcessor.ts
// Normalizes and enriches structured resume data after LLM extraction.

import { StructuredResume, ProcessedResumeData, ExperienceEntry, SkillExperienceMap } from './types';

/**
 * Calculates duration in months between two date strings (YYYY-MM).
 */
function calcMonths(start: string, end: string | null): number {
    const now = new Date();
    const parseDate = (d: string) => {
        const [y, m] = d.split('-').map(Number);
        return new Date(y, (m || 1) - 1);
    };

    const startDate = parseDate(start);
    const endDate = end ? parseDate(end) : now;
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
    return Math.max(0, months);
}

/**
 * Calculates total experience years from all experience entries.
 */
function calcTotalExperienceYears(experience: ExperienceEntry[]): number {
    if (!experience || experience.length === 0) return 0;

    // Sum all non-overlapping months (simplified: no overlap detection)
    let totalMonths = 0;
    for (const entry of experience) {
        if (!entry.start_date) continue;
        totalMonths += calcMonths(entry.start_date, entry.end_date);
    }

    return Math.round((totalMonths / 12) * 10) / 10; // round to 1 decimal
}

/**
 * Builds a skill → months map from experience entries.
 * Heuristic: skills mentioned in an experience entry get its full duration.
 */
function buildSkillExperienceMap(
    experience: ExperienceEntry[],
    skills: string[]
): SkillExperienceMap {
    const map: SkillExperienceMap = {};
    const skillsLower = skills.map(s => s.toLowerCase());

    for (const entry of experience) {
        if (!entry.start_date) continue;
        const months = calcMonths(entry.start_date, entry.end_date);
        const bulletsText = (entry.bullets || []).join(' ').toLowerCase();

        skillsLower.forEach((skillLower, i) => {
            if (bulletsText.includes(skillLower)) {
                map[skills[i]] = (map[skills[i]] || 0) + months;
            }
        });
    }

    return map;
}

/**
 * Normalizes a resume from the LLM and computes derived fields.
 */
export function processResume(structured: StructuredResume): ProcessedResumeData {
    // Ensure arrays exist (LLM may omit them)
    const safe: StructuredResume = {
        identity: structured.identity || { name: 'Unknown' },
        skills: structured.skills || [],
        experience: structured.experience || [],
        projects: structured.projects || [],
        education: structured.education || [],
        achievements: structured.achievements || [],
        certifications: structured.certifications || [],
        leadership: structured.leadership || [],
    };

    const totalExperienceYears = calcTotalExperienceYears(safe.experience);
    const skillExperienceMap = buildSkillExperienceMap(safe.experience, safe.skills);

    return {
        structured: safe,
        totalExperienceYears,
        skillExperienceMap,
    };
}
