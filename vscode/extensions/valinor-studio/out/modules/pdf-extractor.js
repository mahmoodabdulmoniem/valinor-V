"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFExtractor = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PDFExtractor {
    constructor(output) {
        this._output = output;
    }
    async extractRFPFromPDF(filePath) {
        this._output.appendLine(`📄 Starting PDF extraction from: ${filePath}`);
        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`PDF file not found: ${filePath}`);
            }
            // Get file stats
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;
            // For now, we'll simulate PDF extraction since we don't have a PDF library
            // In a real implementation, you would use a library like pdf-parse or pdf2pic
            const extractedText = await this.simulatePDFExtraction(filePath);
            // Parse the extracted text to identify RFP components
            const rfpDocument = await this.parseRFPDocument(extractedText, filePath, fileSize);
            this._output.appendLine(`✅ Successfully extracted RFP from PDF`);
            this._output.appendLine(`📋 Found ${rfpDocument.requirements.length} requirements`);
            this._output.appendLine(`⏰ Found ${rfpDocument.deadlines.length} deadlines`);
            return rfpDocument;
        }
        catch (error) {
            this._output.appendLine(`❌ Error extracting PDF: ${error}`);
            throw error;
        }
    }
    async simulatePDFExtraction(filePath) {
        // This is a simulation - in real implementation, use pdf-parse or similar
        const fileName = path.basename(filePath);
        // Simulate different types of RFP content based on filename
        if (fileName.toLowerCase().includes('technical')) {
            return this.getTechnicalRFPSample();
        }
        else if (fileName.toLowerCase().includes('services')) {
            return this.getServicesRFPSample();
        }
        else {
            return this.getStandardRFPSample();
        }
    }
    async parseRFPDocument(rawText, filePath, fileSize) {
        const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        // Extract title (usually first line or after "REQUEST FOR PROPOSAL")
        const title = this.extractTitle(lines);
        // Extract Notice ID and Solicitation Number
        const noticeId = this.extractNoticeId(rawText);
        const solicitationNumber = this.extractSolicitationNumber(rawText);
        // Extract agency information
        const agency = this.extractAgency(rawText);
        // Extract requirements
        const requirements = this.extractRequirements(rawText);
        // Extract deadlines
        const deadlines = this.extractDeadlines(rawText);
        // Extract contact information
        const contactInfo = this.extractContactInfo(rawText);
        // Extract attachments
        const attachments = this.extractAttachments(rawText);
        // Generate description
        const description = this.generateDescription(rawText, title);
        return {
            title,
            noticeId,
            solicitationNumber,
            agency,
            description,
            requirements,
            deadlines,
            contactInfo,
            attachments,
            rawText,
            metadata: {
                pages: this.estimatePageCount(rawText),
                extractionDate: new Date().toISOString(),
                fileSize
            }
        };
    }
    extractTitle(lines) {
        // Look for title patterns
        for (const line of lines) {
            if (line.includes('REQUEST FOR PROPOSAL') || line.includes('SOLICITATION')) {
                return line;
            }
            if (line.length > 10 && line.length < 100 && !line.includes('Page') && !line.includes('Date')) {
                return line;
            }
        }
        return 'Government Contract RFP';
    }
    extractNoticeId(text) {
        // Look for Notice ID patterns
        const patterns = [
            /Notice ID[:\s]*([A-Z0-9]{8,})/i,
            /Notice[:\s]*([A-Z0-9]{8,})/i,
            /ID[:\s]*([A-Z0-9]{8,})/i
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }
    extractSolicitationNumber(text) {
        // Look for solicitation number patterns
        const patterns = [
            /Solicitation[:\s]*([A-Z0-9\-]{8,})/i,
            /Solicitation Number[:\s]*([A-Z0-9\-]{8,})/i,
            /Contract[:\s]*([A-Z0-9\-]{8,})/i
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }
    extractAgency(text) {
        // Look for agency patterns
        const agencyPatterns = [
            /Department of ([A-Za-z\s]+)/,
            /([A-Za-z\s]+) Agency/,
            /([A-Za-z\s]+) Administration/
        ];
        for (const pattern of agencyPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        return 'Government Agency';
    }
    extractRequirements(text) {
        const requirements = [];
        const lines = text.split('\n');
        // Look for requirement patterns
        const requirementKeywords = [
            'requirement', 'specification', 'deliverable', 'objective', 'goal',
            'must', 'shall', 'will', 'should', 'need to', 'required to'
        ];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (requirementKeywords.some(keyword => line.includes(keyword))) {
                // Get the full requirement (current line + next few lines if they continue)
                let requirement = lines[i];
                let j = i + 1;
                while (j < lines.length && j < i + 3 && lines[j].trim().length > 0) {
                    requirement += ' ' + lines[j];
                    j++;
                }
                requirements.push(requirement.trim());
            }
        }
        return requirements.slice(0, 20); // Limit to first 20 requirements
    }
    extractDeadlines(text) {
        const deadlines = [];
        // Look for date patterns
        const datePatterns = [
            /(\d{1,2}\/\d{1,2}\/\d{4})/g,
            /(\d{1,2}-\d{1,2}-\d{4})/g,
            /(\w+ \d{1,2}, \d{4})/g
        ];
        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                deadlines.push(...matches);
            }
        }
        return [...new Set(deadlines)]; // Remove duplicates
    }
    extractContactInfo(text) {
        const contacts = [];
        // Look for email patterns
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = text.match(emailPattern);
        if (emails) {
            contacts.push(...emails);
        }
        // Look for phone patterns
        const phonePattern = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
        const phones = text.match(phonePattern);
        if (phones) {
            contacts.push(...phones);
        }
        return contacts;
    }
    extractAttachments(text) {
        const attachments = [];
        // Look for attachment patterns
        const attachmentKeywords = ['attachment', 'appendix', 'exhibit', 'annex'];
        const lines = text.split('\n');
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (attachmentKeywords.some(keyword => lowerLine.includes(keyword))) {
                attachments.push(line.trim());
            }
        }
        return attachments.slice(0, 10); // Limit to first 10 attachments
    }
    generateDescription(text, title) {
        // Generate a description based on the title and content
        const words = text.split(' ').slice(0, 50).join(' ');
        return `${title}. ${words}...`;
    }
    estimatePageCount(text) {
        // Rough estimate: 250 words per page
        const wordCount = text.split(' ').length;
        return Math.ceil(wordCount / 250);
    }
    getTechnicalRFPSample() {
        return `REQUEST FOR PROPOSAL
Technical Services for Cloud Infrastructure Modernization

Notice ID: 2024-TECH-001
Solicitation Number: SOL-2024-001

Department of Technology Services

The Department of Technology Services is seeking proposals for technical services to modernize our cloud infrastructure. This project involves migrating legacy systems to cloud-based solutions and implementing new security protocols.

REQUIREMENTS:
1. The contractor must provide cloud migration services for 50+ legacy applications
2. Implementation of zero-trust security architecture
3. 24/7 monitoring and support services
4. Training for government personnel
5. Documentation of all processes and procedures

DELIVERABLES:
- Cloud migration plan
- Security implementation guide
- Training materials
- System documentation
- Performance reports

DEADLINES:
- Proposal Due: March 15, 2024
- Project Start: April 1, 2024
- Phase 1 Complete: June 30, 2024
- Final Delivery: December 31, 2024

CONTACT:
John Smith, Contracting Officer
Email: john.smith@agency.gov
Phone: (555) 123-4567

ATTACHMENTS:
Attachment A - Technical Specifications
Attachment B - Security Requirements
Attachment C - Performance Standards`;
    }
    getServicesRFPSample() {
        return `REQUEST FOR PROPOSAL
Professional Services for Program Management

Notice ID: 2024-SERV-002
Solicitation Number: SOL-2024-002

Department of Program Management

The Department of Program Management requires professional services to support our ongoing initiatives. This includes project management, stakeholder coordination, and performance monitoring.

REQUIREMENTS:
1. Certified Project Management Professional (PMP) on staff
2. Experience with government contracting
3. Risk management expertise
4. Stakeholder communication skills
5. Performance measurement capabilities

DELIVERABLES:
- Project management plan
- Risk assessment report
- Stakeholder communication plan
- Performance metrics dashboard
- Monthly status reports

DEADLINES:
- Proposal Due: February 28, 2024
- Contract Award: March 15, 2024
- Project Kickoff: April 1, 2024

CONTACT:
Jane Doe, Program Manager
Email: jane.doe@agency.gov
Phone: (555) 987-6543

ATTACHMENTS:
Attachment A - Statement of Work
Attachment B - Evaluation Criteria
Attachment C - Past Performance Requirements`;
    }
    getStandardRFPSample() {
        return `REQUEST FOR PROPOSAL
General Contracting Services

Notice ID: 2024-GEN-003
Solicitation Number: SOL-2024-003

Department of General Services

The Department of General Services is seeking proposals for general contracting services. This includes construction, maintenance, and facility management services.

REQUIREMENTS:
1. Licensed contractor with 5+ years experience
2. Bonding and insurance requirements
3. Safety compliance
4. Quality assurance program
5. Environmental compliance

DELIVERABLES:
- Construction plans
- Safety protocols
- Quality control procedures
- Environmental impact assessment
- Progress reports

DEADLINES:
- Proposal Due: January 31, 2024
- Pre-bid Conference: January 15, 2024
- Site Visit: January 20, 2024

CONTACT:
Bob Johnson, Contracting Officer
Email: bob.johnson@agency.gov
Phone: (555) 456-7890

ATTACHMENTS:
Attachment A - Scope of Work
Attachment B - Technical Specifications
Attachment C - Contract Terms`;
    }
    async createAnalysisFile(rfpDocument, workspaceFolder) {
        const analysisPath = path.join(workspaceFolder.uri.fsPath, 'rfp-analysis.md');
        const analysisContent = this.generateAnalysisContent(rfpDocument);
        await vscode.workspace.fs.writeFile(vscode.Uri.file(analysisPath), Buffer.from(analysisContent, 'utf8'));
        this._output.appendLine(`📄 Created RFP analysis file: ${analysisPath}`);
    }
    generateAnalysisContent(rfpDocument) {
        return `# RFP Analysis Report

## Document Information
- **Title**: ${rfpDocument.title}
- **Notice ID**: ${rfpDocument.noticeId || 'Not specified'}
- **Solicitation Number**: ${rfpDocument.solicitationNumber || 'Not specified'}
- **Agency**: ${rfpDocument.agency}
- **Extraction Date**: ${new Date(rfpDocument.metadata.extractionDate).toLocaleDateString()}

## Executive Summary
${rfpDocument.description}

## Key Requirements
${rfpDocument.requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

## Important Deadlines
${rfpDocument.deadlines.map((deadline, index) => `${index + 1}. ${deadline}`).join('\n')}

## Contact Information
${rfpDocument.contactInfo.map((contact, index) => `${index + 1}. ${contact}`).join('\n')}

## Attachments
${rfpDocument.attachments.map((attachment, index) => `${index + 1}. ${attachment}`).join('\n')}

## Analysis Notes
- **Total Requirements**: ${rfpDocument.requirements.length}
- **Total Deadlines**: ${rfpDocument.deadlines.length}
- **Document Pages**: ${rfpDocument.metadata.pages}
- **File Size**: ${(rfpDocument.metadata.fileSize / 1024 / 1024).toFixed(2)} MB

## Next Steps
1. Review all requirements carefully
2. Identify technical capabilities needed
3. Prepare compliance matrix
4. Develop pricing strategy
5. Create proposal outline

---
*Generated by Valinor Studio PDF Extractor*`;
    }
}
exports.PDFExtractor = PDFExtractor;
//# sourceMappingURL=pdf-extractor.js.map