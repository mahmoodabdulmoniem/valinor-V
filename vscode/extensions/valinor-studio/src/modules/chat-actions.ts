import * as vscode from 'vscode';

export interface ChatAction {
	id: string;
	type: 'fix' | 'create' | 'improve' | 'explain' | 'refactor' | 'generate';
	title: string;
	description: string;
	icon: string;
	command: string;
	arguments: any[];
	priority: 'high' | 'medium' | 'low';
	context?: any;
}

export interface AutoFix {
	id: string;
	title: string;
	description: string;
	icon: string;
	changes: CodeChange[];
	confidence: number;
	explanation: string;
}

export interface CodeChange {
	filePath: string;
	range: vscode.Range;
	newText: string;
	description: string;
}

export interface InChatCreation {
	type: 'file' | 'section' | 'component' | 'function' | 'class';
	name: string;
	content: string;
	template: string;
	location: string;
	metadata: any;
}

export class ChatActionProvider {
	private output: vscode.OutputChannel;

	constructor(output: vscode.OutputChannel) {
		this.output = output;
	}

	// Generate auto-fixes for code issues
	async generateAutoFixes(document: vscode.TextDocument, selectedText?: string): Promise<AutoFix[]> {
		const fixes: AutoFix[] = [];
		const text = selectedText || document.getText();

		// Detect common proposal writing issues
		if (text.includes('we will') || text.includes('we can')) {
			fixes.push({
				id: 'passive-voice',
				title: 'Improve Active Voice',
				description: 'Replace passive voice with active voice for stronger impact',
				icon: '⚡',
				changes: [{
					filePath: document.uri.fsPath,
					range: this.findTextRange(document, 'we will'),
					newText: text.replace(/we will/g, 'we will'),
					description: 'Convert to active voice'
				}],
				confidence: 0.9,
				explanation: 'Active voice makes your proposal more direct and impactful.'
			});
		}

		if (text.includes('very') || text.includes('really')) {
			fixes.push({
				id: 'remove-filler',
				title: 'Remove Filler Words',
				description: 'Remove unnecessary filler words for more professional tone',
				icon: '🎯',
				changes: [{
					filePath: document.uri.fsPath,
					range: this.findTextRange(document, 'very'),
					newText: text.replace(/\b(very|really)\b/g, ''),
					description: 'Remove filler words'
				}],
				confidence: 0.8,
				explanation: 'Removing filler words creates more professional and concise content.'
			});
		}

		if (text.length > 200 && !text.includes('•') && !text.includes('-')) {
			fixes.push({
				id: 'add-bullets',
				title: 'Add Bullet Points',
				description: 'Break long paragraphs into bullet points for better readability',
				icon: '📋',
				changes: [{
					filePath: document.uri.fsPath,
					range: this.findTextRange(document, text.substring(0, 50)),
					newText: this.convertToBullets(text),
					description: 'Convert to bullet points'
				}],
				confidence: 0.7,
				explanation: 'Bullet points improve readability and make key points stand out.'
			});
		}

		return fixes;
	}

	// Generate in-chat creation options
	async generateInChatCreations(context: any): Promise<InChatCreation[]> {
		const creations: InChatCreation[] = [];

		// Executive Summary creation
		creations.push({
			type: 'section',
			name: 'Executive Summary',
			content: this.generateExecutiveSummaryTemplate(),
			template: 'executive-summary',
			location: 'proposal.md',
			metadata: {
				section: 'Executive Summary',
				wordCount: 150,
				keyElements: ['value proposition', 'key strengths', 'approach overview']
			}
		});

		// Technical Approach creation
		creations.push({
			type: 'section',
			name: 'Technical Approach',
			content: this.generateTechnicalApproachTemplate(),
			template: 'technical-approach',
			location: 'proposal.md',
			metadata: {
				section: 'Technical Approach',
				wordCount: 300,
				keyElements: ['methodology', 'phases', 'quality assurance']
			}
		});

		// Compliance Matrix creation
		creations.push({
			type: 'file',
			name: 'compliance-matrix.md',
			content: this.generateComplianceMatrixTemplate(),
			template: 'compliance-matrix',
			location: './',
			metadata: {
				type: 'compliance',
				format: 'markdown-table',
				keyElements: ['requirements', 'page references', 'compliance status']
			}
		});

		return creations;
	}

	// Generate chat actions based on context
	async generateChatActions(context: any): Promise<ChatAction[]> {
		const actions: ChatAction[] = [];

		// Common proposal actions
		actions.push({
			id: 'improve-section',
			type: 'improve',
			title: 'Improve Section',
			description: 'Enhance the current section with better language and structure',
			icon: '✨',
			command: 'valinorStudio.improveSection',
			arguments: [context.currentSection],
			priority: 'high'
		});

		actions.push({
			id: 'add-win-themes',
			type: 'create',
			title: 'Add Win Themes',
			description: 'Identify and add compelling win themes to your proposal',
			icon: '🏆',
			command: 'valinorStudio.addWinThemes',
			arguments: [context.rfpData],
			priority: 'high'
		});

		actions.push({
			id: 'create-compliance-matrix',
			type: 'create',
			title: 'Create Compliance Matrix',
			description: 'Generate a comprehensive compliance matrix',
			icon: '📊',
			command: 'valinorStudio.createComplianceMatrix',
			arguments: [context.rfpData],
			priority: 'medium'
		});

		actions.push({
			id: 'analyze-competition',
			type: 'explain',
			title: 'Analyze Competition',
			description: 'Provide competitive analysis and positioning insights',
			icon: '🔍',
			command: 'valinorStudio.analyzeCompetition',
			arguments: [context.rfpData],
			priority: 'medium'
		});

		actions.push({
			id: 'generate-past-performance',
			type: 'generate',
			title: 'Generate Past Performance',
			description: 'Create compelling past performance narratives',
			icon: '📈',
			command: 'valinorStudio.generatePastPerformance',
			arguments: [context.companyProfile],
			priority: 'high'
		});

		return actions;
	}

	// Apply auto-fix to document
	async applyAutoFix(fix: AutoFix): Promise<boolean> {
		try {
			const edit = new vscode.WorkspaceEdit();

			fix.changes.forEach(change => {
				const uri = vscode.Uri.file(change.filePath);
				edit.replace(uri, change.range, change.newText);
			});

			await vscode.workspace.applyEdit(edit);
			this.output.appendLine(`✅ Applied auto-fix: ${fix.title}`);
			return true;
		} catch (error) {
			this.output.appendLine(`❌ Failed to apply auto-fix: ${error}`);
			return false;
		}
	}

	// Create file from in-chat creation
	async createFromChat(creation: InChatCreation): Promise<boolean> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				throw new Error('No workspace folder found');
			}

			const filePath = vscode.Uri.joinPath(workspaceFolder.uri, creation.location, creation.name);
			await vscode.workspace.fs.writeFile(filePath, Buffer.from(creation.content, 'utf8'));

			// Open the created file
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document);

			this.output.appendLine(`✅ Created: ${creation.name}`);
			return true;
		} catch (error) {
			this.output.appendLine(`❌ Failed to create file: ${error}`);
			return false;
		}
	}

	private findTextRange(document: vscode.TextDocument, searchText: string): vscode.Range {
		const text = document.getText();
		const index = text.indexOf(searchText);
		if (index === -1) {
			return new vscode.Range(0, 0, 0, 0);
		}

		const startPos = document.positionAt(index);
		const endPos = document.positionAt(index + searchText.length);
		return new vscode.Range(startPos, endPos);
	}

	private convertToBullets(text: string): string {
		// Simple conversion to bullet points
		const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
		return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
	}

	private generateExecutiveSummaryTemplate(): string {
		return `# Executive Summary

## Project Overview
[Company Name] is pleased to submit this proposal for [Contract Title]. Our approach combines innovative solutions with proven methodologies to deliver exceptional results.

## Key Strengths
• **Proven Experience**: [X] years of successful contract performance
• **Technical Excellence**: Cutting-edge solutions and methodologies
• **Cost Effectiveness**: Competitive pricing with maximum value
• **Risk Mitigation**: Comprehensive risk management approach

## Value Proposition
We offer the best value through our combination of technical expertise, competitive pricing, and commitment to customer success.

## Technical Approach
Our approach focuses on [specific technical elements], ensuring successful delivery of all contract objectives.

## Management Approach
Our experienced team will provide dedicated project management and ensure seamless communication throughout the contract period.`;
	}

	private generateTechnicalApproachTemplate(): string {
		return `# Technical Approach

## Methodology Overview
Our technical approach follows industry best practices and proven methodologies to ensure successful project delivery.

## Phase 1: Planning and Setup
• **Comprehensive Project Planning**: Detailed project plan with milestones and deliverables
• **Team Assembly**: Experienced professionals with relevant expertise
• **Infrastructure Setup**: Required systems and tools configuration

## Phase 2: Implementation
• **Systematic Execution**: Methodical approach to technical requirements
• **Quality Assurance**: Continuous testing and validation
• **Monitoring and Optimization**: Real-time performance monitoring

## Phase 3: Delivery and Support
• **Final Delivery**: Complete system delivery and acceptance
• **Knowledge Transfer**: Comprehensive training and documentation
• **Ongoing Support**: Continuous support and maintenance services

## Quality Assurance
• **Rigorous Testing Protocols**: Comprehensive testing at all levels
• **Continuous Monitoring**: Real-time performance and quality monitoring
• **Stakeholder Communication**: Regular updates and feedback sessions

## Risk Management
• **Proactive Risk Identification**: Early identification of potential issues
• **Mitigation Strategies**: Comprehensive risk mitigation plans
• **Regular Assessment**: Ongoing risk evaluation and updates`;
	}

	private generateComplianceMatrixTemplate(): string {
		return `# Compliance Matrix

## Overview
This compliance matrix maps our proposal response to each RFP requirement, ensuring complete coverage and traceability.

## Compliance Status Legend
- ✓ **Compliant**: Fully addresses the requirement
- △ **Partially Compliant**: Addresses most aspects of the requirement
- ✗ **Non-Compliant**: Does not address the requirement

## Requirements Matrix

| Requirement | Page/Section | Response | Status | Notes |
|-------------|--------------|----------|---------|-------|
| R1.1 | 5 | Technical Approach | ✓ | Comprehensive methodology provided |
| R1.2 | 8 | Management Plan | ✓ | Detailed project management approach |
| R2.1 | 12 | Past Performance | ✓ | Relevant experience demonstrated |
| R2.2 | 15 | Key Personnel | ✓ | Qualified team members identified |
| R3.1 | 18 | Cost Proposal | ✓ | Competitive pricing provided |

## Summary
- **Total Requirements**: [X]
- **Compliant**: [X]
- **Partially Compliant**: [X]
- **Non-Compliant**: [X]
- **Compliance Rate**: [X]%`;
	}
}

// Sleek Cursor-like icons
export const SleekIcons = {
	// Action icons
	IMPROVE: '✨',
	CREATE: '⚡',
	FIX: '🔧',
	EXPLAIN: '💡',
	ANALYZE: '🔍',
	GENERATE: '🎯',
	REFACTOR: '🔄',

	// Status icons
	SUCCESS: '✅',
	ERROR: '❌',
	WARNING: '⚠️',
	INFO: 'ℹ️',
	LOADING: '⏳',

	// Content icons
	DOCUMENT: '📄',
	SECTION: '📋',
	MATRIX: '📊',
	THEMES: '🏆',
	PERFORMANCE: '📈',
	COMPETITION: '🎯',
	COMPLIANCE: '✅',

	// Navigation icons
	OPEN: '🔗',
	COPY: '📋',
	INSERT: '📥',
	DELETE: '🗑️',
	EDIT: '✏️',
	VIEW: '👁️',

	// AI icons
	AI: '🤖',
	BRAIN: '🧠',
	LIGHTBULB: '💡',
	ROCKET: '🚀',
	STAR: '⭐',

	// Proposal icons
	PROPOSAL: '📋',
	CONTRACT: '📜',
	RFP: '📋',
	REQUIREMENTS: '📝',
	TECHNICAL: '⚙️',
	MANAGEMENT: '👥',
	COST: '💰',
	QUALITY: '🏆',
	RISK: '⚠️',
	TIMELINE: '⏰',

	// Communication icons
	CHAT: '💬',
	MESSAGE: '💌',
	NOTIFICATION: '🔔',
	ALERT: '🚨',
	HELP: '❓',

	// File icons
	FILE: '📄',
	FOLDER: '📁',
	SAVE: '💾',
	DOWNLOAD: '⬇️',
	UPLOAD: '⬆️',

	// Process icons
	START: '▶️',
	STOP: '⏹️',
	PAUSE: '⏸️',
	RESET: '🔄',
	COMPLETE: '🎉',

	// Quality icons
	CHECK: '✅',
	VERIFY: '🔍',
	APPROVE: '👍',
	REJECT: '👎',
	REVIEW: '👀',

	// Business icons
	COMPANY: '🏢',
	TEAM: '👥',
	CLIENT: '👤',
	PARTNER: '🤝',
	BUSINESS_SUCCESS: '🎯',

	// Technical icons
	CODE: '💻',
	SYSTEM: '⚙️',
	NETWORK: '🌐',
	SECURITY: '🔒',
	BACKUP: '💾',

	// Time icons
	CLOCK: '⏰',
	CALENDAR: '📅',
	DEADLINE: '⏳',
	SCHEDULE: '📅',
	TIME_LINE: '📊'
};
