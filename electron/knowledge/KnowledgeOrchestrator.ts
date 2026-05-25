import { KnowledgeDatabaseManager } from './KnowledgeDatabaseManager';
import { DocType, KnowledgeDocument, ContextNode, KnowledgeStatus, StructuredResume, StructuredJD, IntentType, CompanyDossier } from './types';
import { extractDocumentText } from './DocumentReader';
import { extractStructuredData } from './StructuredExtractor';
import { chunkAndEmbedDocument } from './DocumentChunker';
import { processResume } from './PostProcessor';
import { getRelevantNodes, formatDossierBlock, detectCategoryHints } from './HybridSearchEngine';
import { assemblePromptContext, PromptAssemblyResult } from './ContextAssembler';
import { classifyIntent, needsCompanyResearch } from './IntentClassifier';
import { CompanyResearchEngine, jdContextFromStructured } from './CompanyResearchEngine';
import { TechnicalDepthScorer } from './TechnicalDepthScorer';
import { AOTPipeline } from './AOTPipeline';
import { generateStarStories, generateStarStoryNodes } from './StarStoryGenerator';
import { generateMockQuestions } from './MockInterviewGenerator';
import { findRelevantValueAlignments, formatValueAlignmentBlock, CultureMappingResult } from './CultureValuesMapper';
import { SalaryIntelligenceEngine } from './SalaryIntelligenceEngine';
import { NegotiationConversationTracker } from './NegotiationConversationTracker';
import { generateLiveCoachingResponse } from './LiveNegotiationAdvisor';

export class KnowledgeOrchestrator {
    private db: KnowledgeDatabaseManager;
    private knowledgeModeActive: boolean = false;
    private depthScorer: TechnicalDepthScorer;
    private aotPipeline: AOTPipeline;
    private salaryEngine: SalaryIntelligenceEngine;
    private negotiationTracker: NegotiationConversationTracker;

    // Cached state for fast retrieval
    private activeResume: KnowledgeDocument | null = null;
    private activeJD: KnowledgeDocument | null = null;
    private cachedNodes: ContextNode[] = [];

    // Injected dependencies
    private generateContentFn: ((contents: any[]) => Promise<string>) | null = null;
    private embedFn: ((text: string) => Promise<number[]>) | null = null;

    // Company research engine
    private companyResearch: CompanyResearchEngine;

    constructor(db: KnowledgeDatabaseManager) {
        this.db = db;
        this.db.initializeSchema();
        this.companyResearch = new CompanyResearchEngine(db);
        this.depthScorer = new TechnicalDepthScorer();
        this.aotPipeline = new AOTPipeline(db, this.companyResearch);
        this.salaryEngine = new SalaryIntelligenceEngine();
        this.negotiationTracker = new NegotiationConversationTracker();
        this.refreshCache();
    }

    // ============================================
    // Configuration
    // ============================================

    setGenerateContentFn(fn: (contents: any[]) => Promise<string>): void {
        this.generateContentFn = fn;
        this.companyResearch.setGenerateContentFn(fn);
        this.aotPipeline.setGenerateContentFn(fn);
    }

    setEmbedFn(fn: (text: string) => Promise<number[]>): void {
        this.embedFn = fn;
    }

    setKnowledgeMode(enabled: boolean): void {
        if (enabled && !this.activeResume) {
            console.warn('[KnowledgeOrchestrator] Cannot enable knowledge mode: no resume loaded');
            return;
        }
        this.knowledgeModeActive = enabled;
        console.log(`[KnowledgeOrchestrator] Knowledge mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    isKnowledgeMode(): boolean {
        return this.knowledgeModeActive && this.activeResume !== null;
    }

    /**
     * Custom notes are handled by LLMHelper directly; this method is a no-op
     * kept for API compatibility with main.ts.
     */
    setCustomNotes(_notes: string): void {
        // No-op: custom notes injection is handled by LLMHelper for all providers
    }

    /**
     * Get the company research engine for external use (e.g., IPC handlers).
     */
    getCompanyResearchEngine(): CompanyResearchEngine {
        return this.companyResearch;
    }

    /**
     * Get the AOT pipeline for status and results.
     */
    getAOTPipeline(): AOTPipeline {
        return this.aotPipeline;
    }

    /**
     * Get cached gap analysis from AOT pipeline or DB.
     */
    getGapAnalysis(): any | null {
        const cached = this.aotPipeline.getCachedGapAnalysis();
        if (cached) return cached;
        if (this.activeJD?.id) {
            return this.db.getGapAnalysis(this.activeJD.id);
        }
        return null;
    }

    /**
     * Get cached negotiation script from AOT pipeline or DB.
     */
    getNegotiationScript(): any | null {
        const cached = this.aotPipeline.getCachedNegotiationScript();
        if (cached) return cached;
        if (this.activeJD?.id) {
            return this.db.getNegotiationScript(this.activeJD.id);
        }
        return null;
    }

    /**
     * Generate a negotiation script on-demand (used when AOT has not run yet).
     * Persists the result to DB so subsequent calls return it instantly.
     */
    async generateNegotiationScriptOnDemand(): Promise<any | null> {
        if (!this.activeResume || !this.activeJD || !this.generateContentFn) return null;
        const { generateNegotiationScript } = await import('./NegotiationEngine');
        const dossier = this.companyResearch.getCachedDossier(
            (this.activeJD.structured_data as StructuredJD).company || ''
        );
        const script = await generateNegotiationScript(
            this.activeResume, this.activeJD, dossier, this.generateContentFn
        );
        if (script && this.activeJD.id) {
            this.db.saveNegotiationScript(this.activeJD.id, script);
            if (script.salary_range?.max) {
                this.negotiationTracker.setUserTarget(script.salary_range.max);
            }
        }
        return script;
    }

    /**
     * Get cached mock questions from DB.
     */
    getMockQuestions(): any | null {
        if (this.activeJD?.id) {
            return this.db.getMockQuestions(this.activeJD.id);
        }
        return null;
    }

    /**
     * Get cached culture value mappings from AOT pipeline or DB.
     */
    getCultureMappings(): CultureMappingResult | null {
        const cached = this.aotPipeline.getCachedCultureMapping();
        if (cached) return cached;
        if (this.activeJD?.id) {
            return this.db.getCultureMappings(this.activeJD.id) as CultureMappingResult | null;
        }
        return null;
    }

    // ============================================
    // Status & UI
    // ============================================

    getStatus(): KnowledgeStatus {
        const hasResume = this.activeResume !== null;
        const hasJD = this.activeJD !== null;

        let resumeSummary;
        if (hasResume) {
            try {
                const structured = this.activeResume!.structured_data as StructuredResume;
                const { totalExperienceYears } = processResume(structured);
                resumeSummary = {
                    name: structured.identity.name,
                    role: structured.experience?.[0]?.role || 'Professional',
                    totalExperienceYears
                };
            } catch { /* ignore */ }
        }

        let jdSummary;
        if (hasJD) {
            try {
                const structured = this.activeJD!.structured_data as StructuredJD;
                jdSummary = {
                    title: structured.title || (structured as any).role || 'Unknown Title',
                    company: structured.company || 'Unknown Company'
                };
            } catch { /* ignore */ }
        }

        return {
            hasResume,
            hasActiveJD: hasJD,
            activeMode: this.knowledgeModeActive,
            resumeSummary,
            jdSummary
        };
    }

    // ============================================
    // Ingestion
    // ============================================

    async ingestDocument(filePath: string, type: DocType = DocType.RESUME): Promise<{ success: boolean; error?: string }> {
        if (!this.generateContentFn || !this.embedFn) {
            return { success: false, error: 'LLM and embedding functions not configured.' };
        }

        try {
            console.log(`[KnowledgeOrchestrator] Starting ingestion for ${type} from: ${filePath}`);

            // 1. Extract Text
            const rawText = await extractDocumentText(filePath);

            // 2. Extract Structured JSON
            let structuredData = await extractStructuredData<any>(rawText, type, this.generateContentFn);

            // 3. Post-Process (if resume)
            if (type === DocType.RESUME) {
                const processed = processResume(structuredData as StructuredResume);
                structuredData = processed.structured;
            }

            // 4. Delete old documents of this type
            this.db.deleteDocumentsByType(type);

            // 5. Save Document Metadata
            const docId = this.db.saveDocument({
                type,
                source_uri: filePath,
                structured_data: structuredData
            });

            try {
                // 6. Chunk and Embed
                const nodesWithEmbeddings = await chunkAndEmbedDocument(structuredData, type, this.embedFn);

                // 7. Save Nodes
                this.db.saveNodes(nodesWithEmbeddings, docId);

                // 8. Generate STAR Stories (Resume Only)
                if (type === DocType.RESUME) {
                    try {
                        const starNodes = await generateStarStoryNodes(structuredData as StructuredResume, this.generateContentFn, this.embedFn);
                        if (starNodes.length > 0) this.db.saveNodes(starNodes, docId);
                    } catch (err: any) {
                        console.error('[KnowledgeOrchestrator] STAR stories skipped:', err.message);
                    }
                }
            } catch (embedError: any) {
                console.error(`[KnowledgeOrchestrator] Embedding/storage failed, rolling back:`, embedError.message);
                this.db.deleteDocumentsByType(type);
                this.refreshCache();
                return { success: false, error: `Embedding failed: ${embedError.message}. Document rolled back.` };
            }

            this.refreshCache();
            console.log(`[KnowledgeOrchestrator] ✅ Ingestion complete for ${type}`);

            // 9. Fire AOT Pipeline (JD Only)
            if (type === DocType.JD) {
                this.aotPipeline.reset();
                this.aotPipeline.runForJD(
                    this.db.getDocumentByType(DocType.JD)!,
                    this.db.getDocumentByType(DocType.RESUME)
                ).then(() => {
                    const script = this.getNegotiationScript();
                    if (script?.salary_range?.max) {
                        this.negotiationTracker.setUserTarget(script.salary_range.max);
                    }
                }).catch((err: Error) => console.error('[KnowledgeOrchestrator] AOT Pipeline failed:', err));
            }

            // 10. Pre-compute salary estimate (Resume Only, non-blocking)
            if (type === DocType.RESUME && this.generateContentFn) {
                const resumeData = structuredData as StructuredResume;
                const { totalExperienceYears } = processResume(resumeData);
                this.salaryEngine.estimateFromResume(
                    resumeData, totalExperienceYears, this.generateContentFn
                ).catch((err: Error) => console.error('[KnowledgeOrchestrator] Salary pre-compute failed:', err));
            }

            return { success: true };

        } catch (error: any) {
            console.error('[KnowledgeOrchestrator] Ingestion failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // Chat Integration
    // ============================================

    async processQuestion(question: string): Promise<PromptAssemblyResult | null> {
        if (!this.isKnowledgeMode() || !this.activeResume) {
            return null;
        }

        this.negotiationTracker.addUserUtterance(question);

        const intent = classifyIntent(question);
        console.log(`[KnowledgeOrchestrator] Intent classified: ${intent}`);

        const categoryHints = detectCategoryHints(question);
        if (categoryHints.length > 0) {
            console.log(`[KnowledgeOrchestrator] Category hints: ${categoryHints.join(', ')}`);
        }

        const maxNodes = intent === IntentType.PROFILE_DETAIL ? 12 : undefined;

        let jdRequiredSkills: string[] = [];
        if (this.activeJD) {
            const jd = this.activeJD.structured_data as StructuredJD;
            jdRequiredSkills = [...(jd.requirements || []), ...(jd.technologies || [])];
        }

        let relevantNodes: ContextNode[] = [];
        if (this.embedFn && this.cachedNodes.length > 0) {
            try {
                const scoredNodes = await getRelevantNodes(question, this.cachedNodes, this.embedFn, {
                    sourceTypes: [DocType.RESUME, DocType.JD],
                    jdRequiredSkills,
                    categoryHintKeywords: categoryHints.length > 0 ? categoryHints : undefined,
                    maxNodes
                });
                relevantNodes = scoredNodes.map(sn => sn.node);
            } catch (error: any) {
                console.warn('[KnowledgeOrchestrator] Relevance scoring failed:', error.message);
            }
        }

        // Company research
        let dossierContext = '';
        if (needsCompanyResearch(question) && this.activeJD) {
            const jd = this.activeJD.structured_data as StructuredJD;
            if (jd.company) {
                try {
                    let dossier = this.aotPipeline.getCachedDossier();
                    if (!dossier) dossier = this.companyResearch.getCachedDossier(jd.company);
                    if (!dossier) {
                        dossier = await this.companyResearch.researchCompany(
                            jd.company, jdContextFromStructured(jd)
                        );
                    }
                    dossierContext = formatDossierBlock(dossier);
                } catch (error: any) {
                    console.warn('[KnowledgeOrchestrator] Company research failed:', error.message);
                }
            }
        }

        // Live negotiation path
        if (intent === IntentType.NEGOTIATION) {
            if (this.negotiationTracker.isActive() && this.generateContentFn && this.activeResume) {
                const dossier = this.activeJD
                    ? this.companyResearch.getCachedDossier(
                        (this.activeJD.structured_data as StructuredJD).company || ''
                      )
                    : null;
                const script = this.getNegotiationScript();
                const coachingResponse = await generateLiveCoachingResponse(
                    this.negotiationTracker,
                    question,
                    this.activeResume,
                    this.activeJD,
                    dossier,
                    script,
                    this.generateContentFn
                );
                return {
                    systemPromptInjection: '',
                    contextBlock: '',
                    isIntroQuestion: false,
                    liveNegotiationResponse: coachingResponse,
                };
            }
        }

        // Salary intelligence
        let salaryContext = '';
        if (intent === IntentType.NEGOTIATION && this.activeResume && this.generateContentFn) {
            try {
                const resume = this.activeResume.structured_data as StructuredResume;
                const { totalExperienceYears } = processResume(resume);
                if (this.activeJD) {
                    const negotiationScript = this.getNegotiationScript();
                    const resumeEstimate = this.salaryEngine.getCachedEstimate();
                    salaryContext = SalaryIntelligenceEngine.buildSalaryContextBlock(resumeEstimate, negotiationScript, true);
                } else {
                    const resumeEstimate = await this.salaryEngine.estimateFromResume(resume, totalExperienceYears, this.generateContentFn);
                    salaryContext = SalaryIntelligenceEngine.buildSalaryContextBlock(resumeEstimate, null, false);
                }
            } catch (error: any) {
                console.warn('[KnowledgeOrchestrator] Salary intelligence failed:', error.message);
            }
        }

        // Gap analysis pivot injection
        let gapContext = '';
        if (this.activeJD) {
            const gapAnalysis = this.getGapAnalysis() as import('./types').GapAnalysisResult | null;
            if (gapAnalysis?.gaps?.length > 0) {
                const questionLower = question.toLowerCase();
                const matchingGaps = gapAnalysis.gaps.filter(gap =>
                    questionLower.includes(gap.skill.toLowerCase())
                );
                if (matchingGaps.length > 0) {
                    const pivotLines = matchingGaps.map(gap =>
                        `[Gap: ${gap.skill} (${gap.gap_type})] Pivot: ${gap.pivot_script}${gap.transferable_skills.length > 0 ? ` Transferable skills: ${gap.transferable_skills.join(', ')}` : ''}`
                    );
                    gapContext = `<gap_pivot_scripts>\n${pivotLines.join('\n')}\n</gap_pivot_scripts>`;
                }
            }
        }

        const toneXML = this.depthScorer.getToneXML();

        const result = await assemblePromptContext(
            question,
            this.activeResume,
            this.activeJD,
            relevantNodes.map(n => ({ node: n, score: 1 })),
            this.generateContentFn,
            toneXML
        );

        if (dossierContext && result) {
            result.contextBlock = result.contextBlock ? `${result.contextBlock}\n\n${dossierContext}` : dossierContext;
        }
        if (salaryContext && result) {
            result.contextBlock = result.contextBlock ? `${result.contextBlock}\n\n${salaryContext}` : salaryContext;
        }
        if (gapContext && result) {
            result.contextBlock = result.contextBlock ? `${result.contextBlock}\n\n${gapContext}` : gapContext;
        }

        // Mock question matching
        if (this.activeJD && result) {
            const mockQuestions = this.getMockQuestions() as import('./types').MockQuestion[] | null;
            if (mockQuestions?.length > 0) {
                const questionLower = question.toLowerCase();
                const questionWords = new Set(questionLower.split(/\s+/).filter(w => w.length > 3));
                const scoredMocks = mockQuestions.map(mq => {
                    const mqWords = mq.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                    const overlap = mqWords.filter(w => questionWords.has(w)).length;
                    return { mock: mq, similarity: mqWords.length > 0 ? overlap / mqWords.length : 0 };
                }).filter(s => s.similarity >= 0.4).sort((a, b) => b.similarity - a.similarity);

                if (scoredMocks.length > 0) {
                    const best = scoredMocks[0];
                    const hintLines = [
                        `Predicted Question: "${best.mock.question}"`,
                        `Category: ${best.mock.category} | Difficulty: ${best.mock.difficulty}`,
                        `Key Points to Hit: ${best.mock.suggested_answer_key}`,
                        `Why This Is Asked: ${best.mock.rationale}`
                    ];
                    const mockBlock = `<mock_question_hint>\n${hintLines.join('\n')}\n</mock_question_hint>`;
                    result.contextBlock = result.contextBlock ? `${result.contextBlock}\n\n${mockBlock}` : mockBlock;
                }
            }
        }

        // Culture values alignment
        const cultureMappings = this.getCultureMappings();
        if (cultureMappings?.mappings.length > 0 && this.activeJD && result) {
            const jd = this.activeJD.structured_data as StructuredJD;
            const alignments = findRelevantValueAlignments(question, cultureMappings.mappings, cultureMappings.core_values, 2);
            if (alignments.length > 0) {
                const cultureBlock = formatValueAlignmentBlock(alignments, jd.company);
                if (cultureBlock) {
                    result.contextBlock = result.contextBlock ? `${result.contextBlock}\n\n${cultureBlock}` : cultureBlock;
                }
            }
        }

        return result;
    }

    // ============================================
    // Management
    // ============================================

    deleteDocumentsByType(type: DocType): void {
        this.db.deleteDocumentsByType(type);
        if (type === DocType.RESUME) {
            this.knowledgeModeActive = false;
            this.salaryEngine.clearCache();
            this.negotiationTracker.reset();
        } else if (type === DocType.JD) {
            this.negotiationTracker.reset();
        }
        this.refreshCache();
    }

    private refreshCache(): void {
        this.activeResume = this.db.getDocumentByType(DocType.RESUME);
        this.activeJD = this.db.getDocumentByType(DocType.JD);
        this.cachedNodes = this.db.getAllNodes();
        console.log(`[KnowledgeOrchestrator] Cache refreshed: ${this.cachedNodes.length} total nodes`);
    }

    // ============================================
    // Compact JD Header
    // ============================================

    async generateCompactJDHeader(): Promise<string | null> {
        if (!this.activeJD || !this.generateContentFn) return null;
        const jd = this.activeJD.structured_data as StructuredJD;
        const prompt = `Create a compact summary (~150 tokens) of this job for persona tuning. Include: role title, level, company, top 3 technical themes, and key focus areas. Output a single paragraph, no markdown.\n\nJob: ${jd.title} at ${jd.company}\nLevel: ${jd.level || 'mid'}\nLocation: ${jd.location}\nKey Requirements: ${jd.requirements?.slice(0, 5).join(', ')}\nTechnologies: ${jd.technologies?.join(', ')}\nKeywords: ${jd.keywords?.join(', ')}`;
        try {
            return (await this.generateContentFn([{ text: prompt }])).trim();
        } catch {
            return `${jd.level || 'Mid-level'} ${jd.title} at ${jd.company}.`;
        }
    }

    getCompactJDHeader(): string | null {
        if (!this.activeJD) return null;
        const jd = this.activeJD.structured_data as StructuredJD;
        const levelStr = jd.level ? jd.level.charAt(0).toUpperCase() + jd.level.slice(1) : 'Mid-level';
        const techFocus = jd.technologies?.slice(0, 4).join(', ') || '';
        const keyThemes = jd.keywords?.slice(0, 3).join(', ') || '';
        return `${levelStr} ${jd.title} at ${jd.company}${jd.location ? ` (${jd.location})` : ''}. Tech: ${techFocus}. Themes: ${keyThemes}.`;
    }

    getProfileData(): any {
        if (!this.activeResume) return null;
        try {
            const structured = this.activeResume.structured_data as StructuredResume;
            let jdData = null;
            if (this.activeJD) {
                const jd = this.activeJD.structured_data as StructuredJD;
                jdData = {
                    title: jd.title || (jd as any).role || 'Unknown Title',
                    company: jd.company || 'Unknown Company',
                    location: jd.location || 'Unknown Location',
                    level: jd.level,
                    requirements: jd.requirements,
                    technologies: jd.technologies,
                    keywords: jd.keywords,
                    compensation_hint: jd.compensation_hint,
                    min_years_experience: jd.min_years_experience
                };
            }
            const gapAnalysis = this.getGapAnalysis();
            const negotiationScript = this.getNegotiationScript();
            const mockQuestions = this.getMockQuestions();
            const cultureMappings = this.getCultureMappings();
            const aotStatus = this.aotPipeline.getStatus();

            return {
                identity: structured.identity,
                skills: structured.skills,
                experienceCount: structured.experience?.length || 0,
                projectCount: structured.projects?.length || 0,
                educationCount: structured.education?.length || 0,
                nodeCount: this.db.getNodeCount(DocType.RESUME),
                experience: structured.experience || [],
                projects: structured.projects || [],
                education: structured.education || [],
                activeJD: jdData,
                hasActiveJD: this.activeJD !== null,
                gapAnalysis,
                negotiationScript,
                mockQuestions,
                cultureMappings,
                aotStatus,
                compactPersona: this.getCompactJDHeader() || 'Resume-Aware Mode Active',
                toneDirective: this.depthScorer.getToneDirective()
            };
        } catch {
            return null;
        }
    }

    feedInterviewerUtterance(text: string): void {
        this.depthScorer.addUtterance(text);
        this.negotiationTracker.addRecruiterUtterance(text);
    }

    feedForDepthScoring(text: string): void {
        this.depthScorer.addUtterance(text);
    }

    getNegotiationTracker(): NegotiationConversationTracker {
        return this.negotiationTracker;
    }

    resetNegotiationSession(): void {
        this.negotiationTracker.reset();
    }

    getVocabularyHints(): string[] {
        const hints = new Set<string>();
        if (this.activeJD) {
            const jd = this.activeJD.structured_data as StructuredJD;
            if (jd.company) hints.add(jd.company);
            if (jd.title) hints.add(jd.title);
            jd.technologies?.forEach(t => hints.add(t));
            jd.keywords?.forEach(k => hints.add(k));
            for (const req of (jd.requirements || [])) {
                if (req.trim().split(/\s+/).length <= 3) hints.add(req.trim());
            }
        }
        return Array.from(hints);
    }
}
