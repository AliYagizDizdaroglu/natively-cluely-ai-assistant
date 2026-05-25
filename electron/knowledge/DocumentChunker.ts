// electron/knowledge/DocumentChunker.ts
// Converts structured document data into ContextNodes for storage and retrieval.

import { DocType, ContextNode, StructuredResume, StructuredJD } from './types';

/**
 * Chunks structured document data into ContextNodes and optionally embeds them.
 */
export async function chunkAndEmbedDocument(
    structuredData: any,
    docType: DocType,
    embedFn: (text: string) => Promise<number[]>
): Promise<ContextNode[]> {
    let nodes: ContextNode[];

    if (docType === DocType.RESUME) {
        nodes = chunkResume(structuredData as StructuredResume);
    } else if (docType === DocType.JD) {
        nodes = chunkJD(structuredData as StructuredJD);
    } else {
        nodes = chunkGeneric(structuredData);
    }

    // Embed all nodes
    const embedded = await Promise.all(
        nodes.map(async (node) => {
            try {
                node.embedding = await embedFn(node.title + ' ' + node.text_content);
            } catch {
                // Non-fatal: embedding failure leaves node without vector
            }
            return node;
        })
    );

    return embedded;
}

function chunkResume(resume: StructuredResume): ContextNode[] {
    const nodes: ContextNode[] = [];

    // Identity / summary node
    if (resume.identity) {
        const id = resume.identity;
        const parts = [
            id.name && `Name: ${id.name}`,
            id.email && `Email: ${id.email}`,
            id.location && `Location: ${id.location}`,
            id.summary && `Summary: ${id.summary}`,
        ].filter(Boolean).join('\n');

        if (parts) {
            nodes.push({
                source_type: DocType.RESUME,
                category: 'identity',
                title: `${id.name || 'Candidate'} — Profile`,
                text_content: parts,
                tags: ['identity', 'profile'],
            });
        }
    }

    // Skills node
    if (resume.skills?.length > 0) {
        nodes.push({
            source_type: DocType.RESUME,
            category: 'skills',
            title: 'Technical Skills',
            text_content: resume.skills.join(', '),
            tags: ['skills', 'technical'],
        });
    }

    // Experience — one node per role
    for (const exp of (resume.experience || [])) {
        const text = [
            `Role: ${exp.role}`,
            `Company: ${exp.company}`,
            `Period: ${exp.start_date} — ${exp.end_date || 'Present'}`,
            exp.bullets?.length > 0 && `Responsibilities:\n${exp.bullets.map(b => `• ${b}`).join('\n')}`,
        ].filter(Boolean).join('\n');

        nodes.push({
            source_type: DocType.RESUME,
            category: 'experience',
            title: `${exp.role} at ${exp.company}`,
            text_content: text,
            organization: exp.company,
            start_date: exp.start_date,
            end_date: exp.end_date,
            tags: ['experience', 'work'],
        });
    }

    // Projects — one node per project
    for (const proj of (resume.projects || [])) {
        const text = [
            `Project: ${proj.name}`,
            `Description: ${proj.description}`,
            proj.technologies?.length > 0 && `Technologies: ${proj.technologies.join(', ')}`,
            proj.url && `URL: ${proj.url}`,
        ].filter(Boolean).join('\n');

        nodes.push({
            source_type: DocType.RESUME,
            category: 'project',
            title: proj.name,
            text_content: text,
            tags: ['project', ...(proj.technologies || [])],
        });
    }

    // Education
    for (const edu of (resume.education || [])) {
        nodes.push({
            source_type: DocType.RESUME,
            category: 'education',
            title: `${edu.degree} in ${edu.field} — ${edu.institution}`,
            text_content: `Institution: ${edu.institution}\nDegree: ${edu.degree}\nField: ${edu.field}\nPeriod: ${edu.start_date} — ${edu.end_date || 'Present'}${edu.gpa ? `\nGPA: ${edu.gpa}` : ''}`,
            organization: edu.institution,
            start_date: edu.start_date,
            end_date: edu.end_date,
            tags: ['education'],
        });
    }

    // Achievements
    for (const ach of (resume.achievements || [])) {
        nodes.push({
            source_type: DocType.RESUME,
            category: 'achievement',
            title: ach.title,
            text_content: `${ach.title}: ${ach.description}${ach.date ? ` (${ach.date})` : ''}`,
            tags: ['achievement'],
        });
    }

    // Certifications
    for (const cert of (resume.certifications || [])) {
        nodes.push({
            source_type: DocType.RESUME,
            category: 'certification',
            title: cert.name,
            text_content: `${cert.name} — Issued by ${cert.issuer}${cert.date ? ` (${cert.date})` : ''}`,
            tags: ['certification'],
        });
    }

    // Leadership
    for (const lead of (resume.leadership || [])) {
        nodes.push({
            source_type: DocType.RESUME,
            category: 'leadership',
            title: `${lead.role} — ${lead.organization}`,
            text_content: `Role: ${lead.role}\nOrganization: ${lead.organization}\n${lead.description}`,
            organization: lead.organization,
            tags: ['leadership'],
        });
    }

    return nodes;
}

function chunkJD(jd: StructuredJD): ContextNode[] {
    const nodes: ContextNode[] = [];

    // Overview node
    nodes.push({
        source_type: DocType.JD,
        category: 'jd_overview',
        title: `${jd.title} at ${jd.company}`,
        text_content: [
            `Title: ${jd.title}`,
            `Company: ${jd.company}`,
            `Location: ${jd.location}`,
            `Level: ${jd.level}`,
            `Min experience: ${jd.min_years_experience} years`,
            jd.description_summary && `Summary: ${jd.description_summary}`,
        ].filter(Boolean).join('\n'),
        tags: ['jd', 'overview'],
    });

    // Requirements
    if (jd.requirements?.length > 0) {
        nodes.push({
            source_type: DocType.JD,
            category: 'requirement',
            title: 'Job Requirements',
            text_content: jd.requirements.map(r => `• ${r}`).join('\n'),
            tags: ['jd', 'requirements'],
        });
    }

    // Technologies
    if (jd.technologies?.length > 0) {
        nodes.push({
            source_type: DocType.JD,
            category: 'jd_tech',
            title: 'Required Technologies',
            text_content: jd.technologies.join(', '),
            tags: ['jd', 'technologies'],
        });
    }

    return nodes;
}

function chunkGeneric(data: any): ContextNode[] {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    return [{
        source_type: DocType.GENERIC,
        category: 'generic',
        title: 'Document',
        text_content: text.slice(0, 2000),
        tags: ['generic'],
    }];
}
