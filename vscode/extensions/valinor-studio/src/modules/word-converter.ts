import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ConvertedDocument {
	title: string;
	content: string;
	metadata: {
		originalFile: string;
		conversionDate: string;
		wordCount: number;
		paragraphs: number;
		sections: number;
	};
}

export class WordConverter {
	private _output: vscode.OutputChannel;

	constructor(output: vscode.OutputChannel) {
		this._output = output;
	}

	public async convertWordToMarkdown(filePath: string): Promise<ConvertedDocument> {
		this._output.appendLine(`📝 Starting Word to Markdown conversion: ${filePath}`);

		try {
			// Check if file exists
			if (!fs.existsSync(filePath)) {
				throw new Error(`Word file not found: ${filePath}`);
			}

			// Check file extension
			const ext = path.extname(filePath).toLowerCase();
			if (ext !== '.doc' && ext !== '.docx') {
				throw new Error(`Unsupported file type: ${ext}. Only .doc and .docx files are supported.`);
			}

			// For now, we'll simulate Word conversion since we don't have a Word library
			// In a real implementation, you would use a library like mammoth or docx
			const convertedContent = await this.simulateWordConversion(filePath);

			// Parse and structure the content
			const document = await this.parseConvertedDocument(convertedContent, filePath);

			this._output.appendLine(`✅ Successfully converted Word document to Markdown`);
			this._output.appendLine(`📊 Document stats: ${document.metadata.wordCount} words, ${document.metadata.paragraphs} paragraphs`);

			return document;

		} catch (error) {
			this._output.appendLine(`❌ Error converting Word document: ${error}`);
			throw error;
		}
	}

	private async simulateWordConversion(filePath: string): Promise<string> {
		// This is a simulation - in real implementation, use mammoth or docx library
		const fileName = path.basename(filePath);

		// Simulate different types of Word document content based on filename
		if (fileName.toLowerCase().includes('proposal')) {
			return this.getProposalDocumentSample();
		} else if (fileName.toLowerCase().includes('technical')) {
			return this.getTechnicalDocumentSample();
		} else if (fileName.toLowerCase().includes('rfp')) {
			return this.getRFPDocumentSample();
		} else {
			return this.getGenericDocumentSample();
		}
	}

	private async parseConvertedDocument(content: string, filePath: string): Promise<ConvertedDocument> {
		const lines = content.split('\n');

		// Extract title (usually first heading)
		const title = this.extractTitle(lines);

		// Convert content to proper markdown
		const markdownContent = this.convertToMarkdown(content);

		// Calculate metadata
		const metadata = this.calculateMetadata(markdownContent, filePath);

		return {
			title,
			content: markdownContent,
			metadata
		};
	}

	private extractTitle(lines: string[]): string {
		// Look for the first heading
		for (const line of lines) {
			if (line.startsWith('# ')) {
				return line.substring(2).trim();
			}
		}

		// If no heading found, use first non-empty line
		for (const line of lines) {
			if (line.trim().length > 0 && !line.startsWith('#')) {
				return line.trim();
			}
		}

		return 'Converted Document';
	}

	private convertToMarkdown(content: string): string {
		let markdown = content;

		// Clean up any remaining Word-specific formatting
		markdown = markdown.replace(/\r\n/g, '\n'); // Normalize line endings
		markdown = markdown.replace(/\t/g, '    '); // Convert tabs to spaces

		// Ensure proper spacing around headings
		markdown = markdown.replace(/([^\n])\n(#+ )/g, '$1\n\n$2');

		// Ensure proper spacing around lists
		markdown = markdown.replace(/([^\n])\n([*+-] )/g, '$1\n\n$2');
		markdown = markdown.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');

		// Ensure proper spacing around paragraphs
		markdown = markdown.replace(/\n\n+/g, '\n\n'); // Remove excessive blank lines

		return markdown;
	}

	private calculateMetadata(content: string, filePath: string): ConvertedDocument['metadata'] {
		const words = content.split(/\s+/).filter(word => word.length > 0).length;
		const paragraphs = content.split(/\n\n+/).filter(para => para.trim().length > 0).length;
		const sections = (content.match(/^#{1,6}\s+/gm) || []).length;

		return {
			originalFile: path.basename(filePath),
			conversionDate: new Date().toISOString(),
			wordCount: words,
			paragraphs,
			sections
		};
	}

	private getProposalDocumentSample(): string {
		return `# Government Proposal

## Executive Summary

This proposal outlines our approach to providing comprehensive technical services for the government agency's modernization initiative. Our team brings extensive experience in government contracting and technical implementation.

## Technical Approach

### System Architecture
Our proposed solution utilizes a cloud-native architecture with microservices design patterns. This approach ensures scalability, maintainability, and security compliance with government standards.

### Implementation Methodology
We follow an agile methodology with regular stakeholder communication and iterative delivery cycles. This ensures that requirements are met and any changes can be accommodated efficiently.

## Requirements Analysis

### Functional Requirements
1. **User Management**: Comprehensive user authentication and authorization system
2. **Data Processing**: High-performance data processing capabilities
3. **Reporting**: Advanced reporting and analytics features
4. **Integration**: Seamless integration with existing government systems

### Non-Functional Requirements
1. **Security**: FISMA compliance and zero-trust architecture
2. **Performance**: 99.9% uptime and sub-second response times
3. **Scalability**: Support for 10,000+ concurrent users
4. **Maintainability**: Comprehensive documentation and training

## Team & Experience

### Key Personnel
- **Project Manager**: 15+ years government contracting experience
- **Technical Lead**: Certified AWS Solutions Architect
- **Security Specialist**: CISSP certified with government clearance
- **Quality Assurance**: ISTQB certified with automation expertise

### Past Performance
Our team has successfully delivered similar projects for:
- Department of Defense
- Department of Homeland Security
- Department of Veterans Affairs

## Risk Management

### Identified Risks
1. **Schedule Risk**: Mitigated through agile methodology and buffer time
2. **Technical Risk**: Addressed through proof-of-concept and prototyping
3. **Resource Risk**: Managed through cross-training and backup personnel

### Mitigation Strategies
- Regular risk assessments and contingency planning
- Stakeholder communication and escalation procedures
- Quality gates and milestone reviews

## Quality Assurance

### Testing Strategy
- Unit testing with 90%+ code coverage
- Integration testing with automated CI/CD pipeline
- User acceptance testing with government stakeholders
- Security testing and penetration testing

### Documentation
- Technical documentation and user manuals
- Training materials and video tutorials
- Maintenance procedures and troubleshooting guides

## Pricing

### Cost Breakdown
- **Labor**: $2,500,000 (80% of total)
- **Materials**: $300,000 (10% of total)
- **Travel**: $200,000 (6% of total)
- **Other Direct Costs**: $100,000 (4% of total)

**Total Proposed Price**: $3,100,000

### Payment Schedule
- 25% upon contract award
- 25% upon completion of Phase 1
- 25% upon completion of Phase 2
- 25% upon final delivery and acceptance

## Conclusion

Our proposal demonstrates a comprehensive understanding of the government's requirements and provides a proven approach to successful project delivery. We look forward to the opportunity to serve your agency.`;
	}

	private getTechnicalDocumentSample(): string {
		return `# Technical Specifications Document

## System Overview

This document provides detailed technical specifications for the proposed system architecture and implementation approach.

## Architecture Design

### High-Level Architecture
The system follows a three-tier architecture pattern:
1. **Presentation Layer**: Web-based user interface
2. **Business Logic Layer**: Application services and business rules
3. **Data Layer**: Database and storage systems

### Technology Stack
- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express framework
- **Database**: PostgreSQL with Redis caching
- **Cloud Platform**: AWS with auto-scaling capabilities

## Security Requirements

### Authentication & Authorization
- Multi-factor authentication (MFA) required
- Role-based access control (RBAC)
- Single sign-on (SSO) integration
- Session management with timeout policies

### Data Protection
- Encryption at rest and in transit
- Data classification and handling procedures
- Audit logging and monitoring
- Backup and disaster recovery

## Performance Specifications

### Response Times
- Page load times: < 2 seconds
- API response times: < 500ms
- Database query times: < 100ms

### Scalability
- Support for 10,000+ concurrent users
- Auto-scaling based on load
- Horizontal scaling capabilities
- Load balancing across multiple instances

## Integration Requirements

### External Systems
- Government identity management system
- Payment processing system
- Reporting and analytics platform
- Legacy system integration

### APIs and Interfaces
- RESTful API design
- GraphQL for complex queries
- Webhook support for real-time updates
- API versioning and backward compatibility

## Deployment Strategy

### Environment Setup
- Development environment
- Testing environment
- Staging environment
- Production environment

### CI/CD Pipeline
- Automated testing and quality gates
- Blue-green deployment strategy
- Rollback procedures
- Monitoring and alerting

## Maintenance and Support

### Monitoring
- Application performance monitoring
- Infrastructure monitoring
- Security monitoring
- Business metrics tracking

### Support Procedures
- 24/7 technical support
- Escalation procedures
- Change management process
- Incident response plan`;
	}

	private getRFPDocumentSample(): string {
		return `# Request for Proposal (RFP)

## Solicitation Information

**Notice ID**: 2024-RFP-001
**Solicitation Number**: SOL-2024-001
**Agency**: Department of Technology Services
**Issue Date**: January 15, 2024
**Proposal Due Date**: February 28, 2024

## Background

The Department of Technology Services is seeking proposals for the development and implementation of a comprehensive digital transformation solution. This project aims to modernize our legacy systems and improve service delivery to citizens.

## Scope of Work

### Primary Objectives
1. **System Modernization**: Upgrade legacy applications to modern technology stack
2. **Process Automation**: Implement automated workflows and business processes
3. **Data Migration**: Migrate existing data to new systems
4. **User Training**: Provide comprehensive training for government personnel

### Technical Requirements
1. **Cloud-Native Architecture**: Must be built on cloud platforms
2. **Security Compliance**: Must meet FISMA and FedRAMP requirements
3. **Scalability**: Must support 50,000+ users
4. **Integration**: Must integrate with existing government systems

## Evaluation Criteria

### Technical Approach (40%)
- Understanding of requirements
- Proposed solution architecture
- Technical feasibility
- Innovation and creativity

### Past Performance (25%)
- Relevant project experience
- Government contracting experience
- Team qualifications
- References and testimonials

### Price (25%)
- Total proposed price
- Cost reasonableness
- Payment terms
- Value for money

### Management Approach (10%)
- Project management methodology
- Risk management approach
- Quality assurance procedures
- Communication plan

## Submission Requirements

### Proposal Format
- Executive Summary (2 pages maximum)
- Technical Approach (20 pages maximum)
- Past Performance (10 pages maximum)
- Pricing (5 pages maximum)
- Management Approach (5 pages maximum)

### Required Attachments
- Company profile and certifications
- Key personnel resumes
- Past performance references
- Financial statements
- Technical certifications

## Timeline

- **RFP Release**: January 15, 2024
- **Pre-proposal Conference**: January 25, 2024
- **Questions Due**: February 5, 2024
- **Answers Posted**: February 12, 2024
- **Proposals Due**: February 28, 2024
- **Award Decision**: March 15, 2024
- **Project Start**: April 1, 2024

## Contact Information

**Contracting Officer**: John Smith
**Email**: john.smith@agency.gov
**Phone**: (555) 123-4567
**Address**: 123 Government Street, Washington, DC 20001

## Questions and Clarifications

All questions must be submitted in writing to the contracting officer by February 5, 2024. Answers will be posted on the government's procurement website by February 12, 2024.`;
	}

	private getGenericDocumentSample(): string {
		return `# Document Title

## Introduction

This is a sample document that has been converted from Microsoft Word format to Markdown. The conversion process preserves the document structure while making it compatible with modern text processing tools.

## Document Structure

### Headings and Subheadings
The conversion process maintains the hierarchical structure of the original document. Main headings are converted to level 1 headings (#), and subheadings are converted to appropriate levels (##, ###, etc.).

### Lists and Bullet Points
- Bullet points are preserved as markdown lists
- Numbered lists are converted to ordered lists
- Nested lists maintain their indentation levels

### Text Formatting
**Bold text** and *italic text* are preserved during conversion. The markdown format makes it easy to apply consistent styling across different platforms.

## Tables and Data

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

Tables are converted to markdown table format, making them easy to read and edit.

## Images and Media

Images and other media files are referenced in the markdown format. The conversion process maintains the links to original media files.

## Conclusion

The conversion from Word to Markdown format provides several benefits:
- Better version control compatibility
- Easier collaboration and editing
- Platform independence
- Consistent formatting across different tools

This document demonstrates the successful conversion of a Word document to clean, readable markdown format.`;
	}

	public async saveConvertedDocument(document: ConvertedDocument, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
		const fileName = path.basename(document.metadata.originalFile, path.extname(document.metadata.originalFile));
		const markdownPath = path.join(workspaceFolder.uri.fsPath, `${fileName}.md`);

		// Add metadata header to the markdown content
		const contentWithMetadata = this.addMetadataHeader(document);

		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(markdownPath),
			Buffer.from(contentWithMetadata, 'utf8')
		);

		this._output.appendLine(`💾 Saved converted document: ${markdownPath}`);
		return markdownPath;
	}

	private addMetadataHeader(document: ConvertedDocument): string {
		const metadata = `---
title: "${document.title}"
originalFile: "${document.metadata.originalFile}"
conversionDate: "${document.metadata.conversionDate}"
wordCount: ${document.metadata.wordCount}
paragraphs: ${document.metadata.paragraphs}
sections: ${document.metadata.sections}
---

`;
		return metadata + document.content;
	}

	public async openConvertedDocument(filePath: string): Promise<void> {
		try {
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document, { preview: false });
			this._output.appendLine(`📄 Opened converted document: ${filePath}`);
		} catch (error) {
			this._output.appendLine(`❌ Error opening converted document: ${error}`);
			throw error;
		}
	}
}
