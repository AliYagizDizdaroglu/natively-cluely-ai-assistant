// electron/knowledge/DocumentReader.ts
// Extracts raw text from PDF, DOCX, and plain text files.

import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads raw text from a PDF, DOCX, or TXT file.
 */
export async function extractDocumentText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
        return extractFromPdf(filePath);
    } else if (ext === '.docx') {
        return extractFromDocx(filePath);
    } else if (ext === '.txt' || ext === '.md') {
        return fs.readFileSync(filePath, 'utf-8');
    } else {
        throw new Error(`Unsupported file type: ${ext}. Supported: .pdf, .docx, .txt`);
    }
}

async function extractFromPdf(filePath: string): Promise<string> {
    let parser: any = null;
    try {
        const { PDFParse } = require('pdf-parse');
        const buffer = fs.readFileSync(filePath);
        // PDFParse expects a Uint8Array (it auto-converts Buffer too).
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.text;
    } catch (err: any) {
        throw new Error(`Failed to parse PDF: ${err.message}`);
    } finally {
        if (parser && typeof parser.destroy === 'function') {
            try { await parser.destroy(); } catch { /* ignore */ }
        }
    }
}

async function extractFromDocx(filePath: string): Promise<string> {
    try {
        const mammoth = require('mammoth');
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (err: any) {
        throw new Error(`Failed to parse DOCX: ${err.message}`);
    }
}
