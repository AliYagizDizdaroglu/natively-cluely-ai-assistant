// electron/knowledge/HybridSearchEngine.ts
// Text-based (keyword + cosine) node retrieval. No premium embedding requirement.

import { ContextNode, ScoredNode, DocType, CompanyDossier } from './types';

const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
    experience: ['experience', 'work', 'job', 'role', 'career', 'employment', 'worked', 'position'],
    project: ['project', 'built', 'developed', 'created', 'side project', 'portfolio'],
    skills: ['skill', 'technology', 'tech stack', 'proficient', 'know', 'familiar', 'expertise', 'tools'],
    education: ['education', 'degree', 'university', 'college', 'school', 'studied', 'graduated', 'gpa'],
    achievement: ['achievement', 'award', 'recognition', 'accomplishment', 'won', 'prize'],
    certification: ['certification', 'certified', 'certificate', 'credential', 'license'],
    leadership: ['leadership', 'lead', 'managed', 'organized', 'president', 'volunteer', 'mentor'],
    identity: ['introduce', 'background', 'yourself', 'who are you', 'about you', 'name', 'contact'],
    requirement: ['require', 'need', 'looking for', 'must have', 'qualification'],
};

/**
 * Detect category hints from the question text to boost relevant node types.
 */
export function detectCategoryHints(question: string): string[] {
    const lower = question.toLowerCase();
    const hints: string[] = [];
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
        if (keywords.some(kw => lower.includes(kw))) {
            hints.push(category);
        }
    }
    return hints;
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag === 0 ? 0 : dot / mag;
}

/**
 * Text-based keyword score: fraction of query words found in node text.
 */
function keywordScore(query: string, node: ContextNode): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return 0;

    const nodeText = (node.title + ' ' + node.text_content + ' ' + node.tags.join(' ')).toLowerCase();
    const matched = queryWords.filter(w => nodeText.includes(w)).length;
    return matched / queryWords.length;
}

interface SearchOptions {
    sourceTypes?: DocType[];
    jdRequiredSkills?: string[];
    categoryHintKeywords?: string[];
    maxNodes?: number;
}

/**
 * Returns the top N most relevant nodes for a query, using hybrid text + embedding scoring.
 */
export async function getRelevantNodes(
    query: string,
    nodes: ContextNode[],
    embedFn: (text: string) => Promise<number[]>,
    options: SearchOptions = {}
): Promise<ScoredNode[]> {
    const { sourceTypes, jdRequiredSkills = [], categoryHintKeywords = [], maxNodes = 8 } = options;

    // Filter by source type if specified
    let candidates = sourceTypes
        ? nodes.filter(n => sourceTypes.includes(n.source_type))
        : nodes;

    if (candidates.length === 0) return [];

    // Get query embedding
    let queryEmbedding: number[] | null = null;
    try {
        queryEmbedding = await embedFn(query);
    } catch {
        // Fall back to text-only scoring
    }

    const scored: ScoredNode[] = candidates.map(node => {
        let score = 0;

        // 1. Keyword score (0-1)
        const kw = keywordScore(query, node);
        score += kw * 0.4;

        // 2. Embedding similarity (0-1) if available
        if (queryEmbedding && node.embedding) {
            const sim = cosineSimilarity(queryEmbedding, node.embedding);
            score += sim * 0.4;
        }

        // 3. Category hint boost (+0.15 per matching hint)
        if (categoryHintKeywords.length > 0) {
            const nodeCategory = node.category.toLowerCase();
            const nodeText = (node.title + ' ' + node.text_content).toLowerCase();
            for (const hint of categoryHintKeywords) {
                if (nodeCategory.includes(hint) || CATEGORY_KEYWORD_MAP[hint]?.some(kw => nodeText.includes(kw))) {
                    score += 0.15;
                    break;
                }
            }
        }

        // 4. JD skill boost: boost resume nodes that mention required JD skills
        if (jdRequiredSkills.length > 0 && node.source_type === DocType.RESUME) {
            const nodeText = (node.title + ' ' + node.text_content).toLowerCase();
            const matchCount = jdRequiredSkills.filter(skill =>
                nodeText.includes(skill.toLowerCase())
            ).length;
            score += Math.min(0.2, matchCount * 0.05);
        }

        return { node, score };
    });

    return scored
        .filter(s => s.score > 0.05) // discard nearly irrelevant
        .sort((a, b) => b.score - a.score)
        .slice(0, maxNodes);
}

/**
 * Format scored nodes into an XML context block for the LLM prompt.
 */
export function formatContextBlock(scoredNodes: ScoredNode[]): string {
    if (scoredNodes.length === 0) return '';

    // Group by category for structured output
    const groups: Record<string, ContextNode[]> = {};
    for (const { node } of scoredNodes) {
        const key = node.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(node);
    }

    const categoryToXmlTag: Record<string, string> = {
        experience: 'candidate_experience',
        project: 'candidate_projects',
        skills: 'candidate_skills',
        education: 'candidate_education',
        achievement: 'candidate_achievements',
        certification: 'candidate_certifications',
        leadership: 'candidate_leadership',
        identity: 'candidate_profile',
        jd_overview: 'job_description',
        requirement: 'job_requirements',
        jd_tech: 'job_technologies',
        generic: 'context',
    };

    const blocks = Object.entries(groups).map(([category, nodes]) => {
        const tag = categoryToXmlTag[category] || category;
        const content = nodes.map(n => {
            const header = n.title ? `[${n.title}]\n` : '';
            return header + n.text_content;
        }).join('\n\n');
        return `<${tag}>\n${content}\n</${tag}>`;
    });

    return blocks.join('\n\n');
}

/**
 * Format a company dossier into an XML context block.
 */
export function formatDossierBlock(dossier: CompanyDossier): string {
    const salaryStr = dossier.salary_estimates?.map(s =>
        `${s.title}: ${s.currency} ${s.min.toLocaleString()}–${s.max.toLocaleString()} (${s.confidence} confidence, source: ${s.source})`
    ).join('\n') || 'No salary data available';

    const competitorsStr = dossier.competitors?.join(', ') || 'N/A';

    const ratingsBlock = dossier.culture_ratings ? `
Work-life balance: ${dossier.culture_ratings.work_life_balance}/5
Career growth: ${dossier.culture_ratings.career_growth}/5
Compensation: ${dossier.culture_ratings.compensation}/5
Overall: ${dossier.culture_ratings.overall}/5` : '';

    return `<company_research>
Company: ${dossier.company}
Hiring Strategy: ${dossier.hiring_strategy}
Interview Focus: ${dossier.interview_focus}${dossier.interview_difficulty ? `\nInterview Difficulty: ${dossier.interview_difficulty}` : ''}${dossier.core_values ? `\nCore Values: ${dossier.core_values.join(', ')}` : ''}
Competitors: ${competitorsStr}
Recent News: ${dossier.recent_news}${ratingsBlock}

Salary Estimates:
${salaryStr}
</company_research>`;
}
