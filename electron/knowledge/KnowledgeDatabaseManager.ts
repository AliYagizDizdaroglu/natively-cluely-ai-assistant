// electron/knowledge/KnowledgeDatabaseManager.ts
// SQLite-backed storage for the open-source Knowledge Engine.
// Creates its own database file at userData/knowledge.db.

import * as path from 'path';
import { app } from 'electron';
import { DocType, KnowledgeDocument, ContextNode, GapAnalysisResult, MockQuestion, CompanyDossier } from './types';
import { CultureMappingResult } from './CultureValuesMapper';

export class KnowledgeDatabaseManager {
    private db: any; // better-sqlite3 instance

    constructor() {
        const Database = require('better-sqlite3');
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'knowledge.db');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
    }

    // ============================================
    // Schema
    // ============================================

    initializeSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                source_uri TEXT NOT NULL,
                structured_data TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS knowledge_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
                source_type TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                text_content TEXT NOT NULL,
                organization TEXT,
                start_date TEXT,
                end_date TEXT,
                duration_months INTEGER,
                tags TEXT NOT NULL DEFAULT '[]',
                embedding TEXT
            );

            CREATE TABLE IF NOT EXISTS knowledge_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
    }

    // ============================================
    // Documents
    // ============================================

    saveDocument(doc: KnowledgeDocument): number {
        const stmt = this.db.prepare(`
            INSERT INTO knowledge_documents (type, source_uri, structured_data)
            VALUES (?, ?, ?)
        `);
        const result = stmt.run(
            doc.type,
            doc.source_uri,
            JSON.stringify(doc.structured_data)
        );
        return result.lastInsertRowid as number;
    }

    getDocumentByType(type: DocType): KnowledgeDocument | null {
        const row = this.db.prepare(`
            SELECT * FROM knowledge_documents WHERE type = ? ORDER BY id DESC LIMIT 1
        `).get(type);

        if (!row) return null;
        return {
            id: row.id,
            type: row.type as DocType,
            source_uri: row.source_uri,
            structured_data: JSON.parse(row.structured_data),
            created_at: row.created_at,
        };
    }

    deleteDocumentsByType(type: DocType): void {
        this.db.prepare(`DELETE FROM knowledge_documents WHERE type = ?`).run(type);
    }

    // ============================================
    // Nodes
    // ============================================

    saveNodes(nodes: ContextNode[], documentId: number): void {
        const insert = this.db.prepare(`
            INSERT INTO knowledge_nodes
            (document_id, source_type, category, title, text_content, organization, start_date, end_date, duration_months, tags, embedding)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((rows: ContextNode[]) => {
            for (const node of rows) {
                insert.run(
                    documentId,
                    node.source_type,
                    node.category,
                    node.title,
                    node.text_content,
                    node.organization ?? null,
                    node.start_date ?? null,
                    node.end_date ?? null,
                    node.duration_months ?? null,
                    JSON.stringify(node.tags || []),
                    node.embedding ? JSON.stringify(node.embedding) : null
                );
            }
        });

        insertMany(nodes);
    }

    getAllNodes(): ContextNode[] {
        const rows = this.db.prepare(`SELECT * FROM knowledge_nodes`).all();
        return rows.map(this.rowToNode);
    }

    getNodeCount(type: DocType): number {
        const row = this.db.prepare(`
            SELECT COUNT(*) as count FROM knowledge_nodes
            WHERE source_type = ?
        `).get(type);
        return row?.count ?? 0;
    }

    private rowToNode(row: any): ContextNode {
        return {
            id: row.id,
            document_id: row.document_id,
            source_type: row.source_type as DocType,
            category: row.category,
            title: row.title,
            text_content: row.text_content,
            organization: row.organization ?? undefined,
            start_date: row.start_date ?? null,
            end_date: row.end_date ?? null,
            duration_months: row.duration_months ?? undefined,
            tags: JSON.parse(row.tags || '[]'),
            embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
        };
    }

    // ============================================
    // Metadata (gap analysis, negotiation script, mock questions, culture, dossiers)
    // ============================================

    private metaKey(prefix: string, id: number | string): string {
        return `${prefix}:${id}`;
    }

    private setMeta(key: string, value: any): void {
        this.db.prepare(`
            INSERT INTO knowledge_meta (key, value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).run(key, JSON.stringify(value));
    }

    private getMeta<T>(key: string): T | null {
        const row = this.db.prepare(`SELECT value FROM knowledge_meta WHERE key = ?`).get(key);
        if (!row) return null;
        try {
            return JSON.parse(row.value) as T;
        } catch {
            return null;
        }
    }

    // Gap Analysis
    saveGapAnalysis(jdId: number, data: GapAnalysisResult): void {
        this.setMeta(this.metaKey('gap_analysis', jdId), data);
    }

    getGapAnalysis(jdId: number): GapAnalysisResult | null {
        return this.getMeta<GapAnalysisResult>(this.metaKey('gap_analysis', jdId));
    }

    // Negotiation Script
    saveNegotiationScript(jdId: number, script: any): void {
        this.setMeta(this.metaKey('neg_script', jdId), script);
    }

    getNegotiationScript(jdId: number): any | null {
        return this.getMeta<any>(this.metaKey('neg_script', jdId));
    }

    // Mock Questions
    saveMockQuestions(jdId: number, questions: MockQuestion[]): void {
        this.setMeta(this.metaKey('mock_questions', jdId), questions);
    }

    getMockQuestions(jdId: number): MockQuestion[] | null {
        return this.getMeta<MockQuestion[]>(this.metaKey('mock_questions', jdId));
    }

    // Culture Mappings
    saveCultureMappings(jdId: number, data: CultureMappingResult): void {
        this.setMeta(this.metaKey('culture_mappings', jdId), data);
    }

    getCultureMappings(jdId: number): CultureMappingResult | null {
        return this.getMeta<CultureMappingResult>(this.metaKey('culture_mappings', jdId));
    }

    // Company Dossier (keyed by company name)
    saveDossier(company: string, dossier: CompanyDossier): void {
        this.setMeta(this.metaKey('dossier', company.toLowerCase()), dossier);
    }

    getDossier(company: string): CompanyDossier | null {
        return this.getMeta<CompanyDossier>(this.metaKey('dossier', company.toLowerCase()));
    }
}
