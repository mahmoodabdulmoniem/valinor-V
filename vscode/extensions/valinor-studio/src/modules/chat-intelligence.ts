import * as vscode from 'vscode';

export interface ConversationContext {
	userProfile: UserProfile;
	projectContext: ProjectContext;
	conversationHistory: ConversationTurn[];
	currentFocus: string;
	preferences: UserPreferences;
	workspaceState: WorkspaceState;
}

export interface UserProfile {
	name: string;
	role: string;
	experience: 'beginner' | 'intermediate' | 'expert';
	preferredStyle: 'detailed' | 'concise' | 'visual';
	technicalBackground: string[];
	contractTypes: string[];
	preferredAgencies: string[];
}

export interface ProjectContext {
	currentRFP: RFPData | null;
	activeDocuments: DocumentContext[];
	recentSearches: string[];
	generatedContent: GeneratedContent[];
	projectGoals: string[];
	deadlines: Deadline[];
}

export interface RFPData {
	noticeId: string;
	title: string;
	agency: string;
	description: string;
	requirements: string[];
	background: string;
	deadline: string;
	estimatedValue: string;
	naicsCodes: string[];
	keywords: string[];
	attachments: Attachment[];
}

export interface DocumentContext {
	uri: vscode.Uri;
	content: string;
	lastModified: Date;
	sections: DocumentSection[];
	wordCount: number;
	completionStatus: number;
}

export interface DocumentSection {
	name: string;
	content: string;
	status: 'draft' | 'review' | 'complete';
	aiGenerated: boolean;
	lastModified: Date;
}

export interface GeneratedContent {
	id: string;
	type: 'section' | 'summary' | 'analysis' | 'recommendation';
	content: string;
	source: string;
	timestamp: Date;
	status: 'draft' | 'approved' | 'rejected';
	feedback: string[];
}

export interface Deadline {
	title: string;
	date: Date;
	type: 'submission' | 'question' | 'pre-proposal' | 'internal';
	priority: 'high' | 'medium' | 'low';
	status: 'pending' | 'completed' | 'overdue';
}

export interface Attachment {
	name: string;
	type: string;
	size: number;
	url: string;
	content?: string;
}

export interface ConversationTurn {
	id: string;
	timestamp: Date;
	role: 'user' | 'assistant' | 'system';
	content: string;
	context: {
		activeDocument?: string;
		cursorPosition?: vscode.Position;
		selectedText?: string;
		workspaceFiles?: string[];
	};
	metadata: {
		intent: string;
		confidence: number;
		entities: string[];
		sentiment: 'positive' | 'neutral' | 'negative';
		requiresAction: boolean;
	};
	actions: ConversationAction[];
}

export interface ConversationAction {
	type: 'navigate' | 'generate' | 'insert' | 'analyze' | 'search' | 'explain' | 'suggest';
	description: string;
	parameters: any;
	executed: boolean;
	result?: any;
}

export interface UserPreferences {
	aiModel: string;
	responseLength: 'short' | 'medium' | 'long';
	detailLevel: 'basic' | 'detailed' | 'comprehensive';
	includeExamples: boolean;
	includeCode: boolean;
	includeVisuals: boolean;
	notificationLevel: 'minimal' | 'normal' | 'verbose';
}

export interface WorkspaceState {
	openFiles: string[];
	activeEditor: string;
	recentCommands: string[];
	userActivity: ActivityLog[];
	projectProgress: ProjectProgress;
}

export interface ActivityLog {
	timestamp: Date;
	action: string;
	details: any;
	duration?: number;
}

export interface ProjectProgress {
	overallCompletion: number;
	sectionProgress: { [section: string]: number };
	timeSpent: number;
	aiInteractions: number;
	contentGenerated: number;
}

export class ChatIntelligence {
	private context: ConversationContext;
	private output: vscode.OutputChannel;
	private conversationMemory: Map<string, any> = new Map();
	private userPatterns: UserPatterns = new UserPatterns();
	private contextAnalyzer: ContextAnalyzer;
	private responseGenerator: ResponseGenerator;
	private actionExecutor: ActionExecutor;

	constructor(output: vscode.OutputChannel) {
		this.output = output;
		this.context = this.initializeContext();
		this.contextAnalyzer = new ContextAnalyzer(this.context);
		this.responseGenerator = new ResponseGenerator(this.context);
		this.actionExecutor = new ActionExecutor(this.context, output);
	}

	private initializeContext(): ConversationContext {
		return {
			userProfile: {
				name: 'Contract Specialist',
				role: 'Proposal Manager',
				experience: 'intermediate',
				preferredStyle: 'detailed',
				technicalBackground: ['Government Contracts', 'Proposal Writing'],
				contractTypes: ['Services', 'IT', 'Construction'],
				preferredAgencies: ['DoD', 'GSA', 'NASA']
			},
			projectContext: {
				currentRFP: null,
				activeDocuments: [],
				recentSearches: [],
				generatedContent: [],
				projectGoals: [],
				deadlines: []
			},
			conversationHistory: [],
			currentFocus: 'general',
			preferences: {
				aiModel: 'GPT-4',
				responseLength: 'medium',
				detailLevel: 'detailed',
				includeExamples: true,
				includeCode: false,
				includeVisuals: true,
				notificationLevel: 'normal'
			},
			workspaceState: {
				openFiles: [],
				activeEditor: '',
				recentCommands: [],
				userActivity: [],
				projectProgress: {
					overallCompletion: 0,
					sectionProgress: {},
					timeSpent: 0,
					aiInteractions: 0,
					contentGenerated: 0
				}
			}
		};
	}

	public async processUserMessage(message: string, activeEditor?: vscode.TextEditor): Promise<ConversationResponse> {
		// Update context with current state
		this.updateContext(activeEditor);

		// Analyze user intent and context
		const analysis = await this.contextAnalyzer.analyzeMessage(message, this.context);

		// Create conversation turn
		const turn: ConversationTurn = {
			id: this.generateId(),
			timestamp: new Date(),
			role: 'user',
			content: message,
			context: {
				activeDocument: activeEditor?.document.uri.fsPath,
				cursorPosition: activeEditor?.selection.active,
				selectedText: activeEditor?.document.getText(activeEditor.selection),
				workspaceFiles: this.getWorkspaceFiles()
			},
			metadata: analysis,
			actions: []
		};

		// Add to conversation history
		this.context.conversationHistory.push(turn);

		// Generate intelligent response
		const response = await this.responseGenerator.generateResponse(turn, this.context);

		// Execute any required actions
		const executedActions = await this.actionExecutor.executeActions(response.actions);

		// Update conversation memory
		this.updateConversationMemory(turn, response, executedActions);

		// Update user patterns
		this.userPatterns.updatePatterns(turn, response);

		return {
			content: response.content,
			sources: response.sources,
			actions: response.actions,
			suggestions: this.generateSuggestions(turn, response),
			context: this.getRelevantContext(turn),
			confidence: response.confidence
		};
	}

	private updateContext(activeEditor?: vscode.TextEditor) {
		if (activeEditor) {
			this.context.workspaceState.activeEditor = activeEditor.document.uri.fsPath;
			this.context.workspaceState.openFiles = vscode.workspace.textDocuments.map(doc => doc.uri.fsPath);
		}
	}

	private getWorkspaceFiles(): string[] {
		return vscode.workspace.textDocuments.map(doc => doc.uri.fsPath);
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	private updateConversationMemory(turn: ConversationTurn, response: any, executedActions: any[]) {
		const key = `${turn.metadata.intent}_${turn.content.substring(0, 50)}`;
		this.conversationMemory.set(key, {
			turn,
			response,
			executedActions,
			timestamp: new Date()
		});
	}

	private generateSuggestions(turn: ConversationTurn, response: any): string[] {
		const suggestions: string[] = [];

		// Context-aware suggestions
		if (turn.metadata.intent === 'generate_content') {
			suggestions.push('Would you like me to insert this into your proposal?');
			suggestions.push('Should I create a similar section for other parts?');
		}

		if (turn.metadata.intent === 'analyze_requirements') {
			suggestions.push('I can help you create a compliance matrix');
			suggestions.push('Would you like me to identify potential risks?');
		}

		if (this.context.projectContext.currentRFP) {
			suggestions.push('I can analyze the competition landscape');
			suggestions.push('Should I create a win theme analysis?');
		}

		return suggestions;
	}

	private getRelevantContext(turn: ConversationTurn): any {
		return {
			currentRFP: this.context.projectContext.currentRFP,
			activeDocument: turn.context.activeDocument,
			recentActivity: this.context.workspaceState.userActivity.slice(-5),
			projectProgress: this.context.workspaceState.projectProgress
		};
	}

	public setRFPData(rfpData: RFPData) {
		this.context.projectContext.currentRFP = rfpData;
		this.output.appendLine(`📋 RFP context loaded: ${rfpData.title}`);
	}

	public getUserProfile(): UserProfile {
		return this.context.userProfile;
	}

	public updateUserProfile(updates: Partial<UserProfile>) {
		this.context.userProfile = { ...this.context.userProfile, ...updates };
	}

	public getConversationHistory(): ConversationTurn[] {
		return this.context.conversationHistory;
	}

	public clearConversation() {
		this.context.conversationHistory = [];
		this.conversationMemory.clear();
		this.output.appendLine('🗑️ Conversation history cleared');
	}
}

export interface ConversationResponse {
	content: string;
	sources: SourceLink[];
	actions: ConversationAction[];
	suggestions: string[];
	context: any;
	confidence: number;
}

export interface SourceLink {
	text: string;
	section: string;
	lineNumber?: number;
	filePath?: string;
	relevance: number;
}

class UserPatterns {
	private patterns: Map<string, number> = new Map();
	private preferences: Map<string, any> = new Map();

	updatePatterns(turn: ConversationTurn, response: any) {
		// Track user preferences and patterns
		const intent = turn.metadata.intent;
		this.patterns.set(intent, (this.patterns.get(intent) || 0) + 1);

		// Update preferences based on interaction
		if (response.confidence > 0.8) {
			this.preferences.set('preferred_intent', intent);
		}
	}

	getPreferredStyle(): string {
		return this.preferences.get('preferred_intent') || 'general';
	}
}

class ContextAnalyzer {
	private context: ConversationContext;

	constructor(context: ConversationContext) {
		this.context = context;
	}

	async analyzeMessage(message: string, context: ConversationContext): Promise<any> {
		const intent = this.detectIntent(message);
		const entities = this.extractEntities(message);
		const sentiment = this.analyzeSentiment(message);
		const confidence = this.calculateConfidence(message, intent);

		return {
			intent,
			confidence,
			entities,
			sentiment,
			requiresAction: this.requiresAction(intent)
		};
	}

	private detectIntent(message: string): string {
		const lowerMessage = message.toLowerCase();

		if (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('write')) {
			return 'generate_content';
		}
		if (lowerMessage.includes('analyze') || lowerMessage.includes('review') || lowerMessage.includes('examine')) {
			return 'analyze_content';
		}
		if (lowerMessage.includes('insert') || lowerMessage.includes('add') || lowerMessage.includes('put')) {
			return 'insert_content';
		}
		if (lowerMessage.includes('explain') || lowerMessage.includes('what') || lowerMessage.includes('how')) {
			return 'explain_concept';
		}
		if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look')) {
			return 'search_information';
		}
		if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
			return 'request_help';
		}

		return 'general_inquiry';
	}

	private extractEntities(message: string): string[] {
		const entities: string[] = [];

		// Extract technical terms
		const technicalTerms = ['RFP', 'proposal', 'contract', 'requirements', 'technical', 'cost', 'management'];
		technicalTerms.forEach(term => {
			if (message.toLowerCase().includes(term.toLowerCase())) {
				entities.push(term);
			}
		});

		// Extract section names
		const sections = ['executive summary', 'background', 'requirements', 'technical approach', 'management plan'];
		sections.forEach(section => {
			if (message.toLowerCase().includes(section.toLowerCase())) {
				entities.push(section);
			}
		});

		return entities;
	}

	private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
		const positiveWords = ['great', 'excellent', 'good', 'perfect', 'amazing', 'wonderful'];
		const negativeWords = ['bad', 'terrible', 'awful', 'wrong', 'incorrect', 'failed'];

		const lowerMessage = message.toLowerCase();
		const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
		const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

		if (positiveCount > negativeCount) return 'positive';
		if (negativeCount > positiveCount) return 'negative';
		return 'neutral';
	}

	private calculateConfidence(message: string, intent: string): number {
		// Simple confidence calculation based on message length and intent clarity
		const baseConfidence = Math.min(message.length / 100, 1);
		const intentConfidence = intent !== 'general_inquiry' ? 0.8 : 0.5;
		return (baseConfidence + intentConfidence) / 2;
	}

	private requiresAction(intent: string): boolean {
		return ['generate_content', 'insert_content', 'search_information'].includes(intent);
	}
}

class ResponseGenerator {
	private context: ConversationContext;

	constructor(context: ConversationContext) {
		this.context = context;
	}

	async generateResponse(turn: ConversationTurn, context: ConversationContext): Promise<any> {
		const intent = turn.metadata.intent;
		const userProfile = context.userProfile;
		const projectContext = context.projectContext;

		let content = '';
		let actions: ConversationAction[] = [];
		let sources: SourceLink[] = [];
		let confidence = turn.metadata.confidence;

		switch (intent) {
			case 'generate_content':
				const generationResult = await this.generateContent(turn, context);
				content = generationResult.content;
				actions = generationResult.actions;
				sources = generationResult.sources;
				break;

			case 'analyze_content':
				const analysisResult = await this.analyzeContent(turn, context);
				content = analysisResult.content;
				actions = analysisResult.actions;
				sources = analysisResult.sources;
				break;

			case 'explain_concept':
				content = await this.explainConcept(turn, context);
				break;

			case 'search_information':
				const searchResult = await this.searchInformation(turn, context);
				content = searchResult.content;
				sources = searchResult.sources;
				break;

			default:
				content = await this.generateGeneralResponse(turn, context);
		}

		// Personalize response based on user profile
		content = this.personalizeResponse(content, userProfile);

		return {
			content,
			actions,
			sources,
			confidence
		};
	}

	private async generateContent(turn: ConversationTurn, context: ConversationContext): Promise<any> {
		const rfpData = context.projectContext.currentRFP;
		const userMessage = turn.content.toLowerCase();

		let content = '';
		let actions: ConversationAction[] = [];
		let sources: SourceLink[] = [];

		if (userMessage.includes('executive summary')) {
			content = this.generateExecutiveSummary(rfpData);
			actions.push({
				type: 'insert',
				description: 'Insert executive summary into proposal',
				parameters: { section: 'Executive Summary', content },
				executed: false
			});
		} else if (userMessage.includes('technical approach')) {
			content = this.generateTechnicalApproach(rfpData);
			actions.push({
				type: 'insert',
				description: 'Insert technical approach into proposal',
				parameters: { section: 'Technical Approach', content },
				executed: false
			});
		} else if (userMessage.includes('requirements')) {
			content = this.generateRequirementsAnalysis(rfpData);
			actions.push({
				type: 'insert',
				description: 'Insert requirements analysis into proposal',
				parameters: { section: 'Requirements', content },
				executed: false
			});
		}

		if (rfpData) {
			sources.push({
				text: 'RFP Requirements',
				section: 'Requirements',
				relevance: 0.9
			});
		}

		return { content, actions, sources };
	}

	private generateExecutiveSummary(rfpData: RFPData | null): string {
		if (!rfpData) {
			return `# Executive Summary

## Project Overview
[Company Name] is pleased to submit this proposal for [Contract Title]. Our approach combines innovative solutions with proven methodologies to deliver exceptional results.

## Key Strengths
- **Proven Experience**: [X] years of successful contract performance
- **Technical Excellence**: Cutting-edge solutions and methodologies
- **Cost Effectiveness**: Competitive pricing with maximum value
- **Risk Mitigation**: Comprehensive risk management approach

## Value Proposition
We offer the best value through our combination of technical expertise, competitive pricing, and commitment to customer success.

*Note: This is a template. Please customize with specific RFP details.*`;
		}

		return `# Executive Summary

## Project Overview
[Company Name] is pleased to submit this proposal for **${rfpData.title}** (Notice ID: ${rfpData.noticeId}). Our comprehensive approach addresses all requirements while delivering exceptional value to ${rfpData.agency}.

## Key Strengths
- **Agency Expertise**: Deep understanding of ${rfpData.agency} requirements and processes
- **Technical Excellence**: Proven methodologies and innovative solutions
- **Cost Effectiveness**: Competitive pricing with maximum value delivery
- **Risk Mitigation**: Comprehensive risk management and quality assurance

## Technical Approach
Our approach focuses on [specific technical elements from requirements], ensuring successful delivery of all contract objectives.

## Value Proposition
We offer the best value through our combination of technical expertise, competitive pricing, and commitment to ${rfpData.agency} success.`;
	}

	private generateTechnicalApproach(rfpData: RFPData | null): string {
		return `# Technical Approach

## Methodology
Our technical approach follows industry best practices and proven methodologies:

### Phase 1: Planning and Setup
- Comprehensive project planning
- Team assembly and resource allocation
- Infrastructure setup and configuration

### Phase 2: Implementation
- Systematic execution of technical requirements
- Quality assurance and testing
- Continuous monitoring and optimization

### Phase 3: Delivery and Support
- Final delivery and acceptance
- Knowledge transfer and training
- Ongoing support and maintenance

## Quality Assurance
- Rigorous testing protocols
- Continuous monitoring and feedback
- Regular stakeholder communication

## Risk Management
- Proactive risk identification
- Mitigation strategies and contingency plans
- Regular risk assessment and updates`;
	}

	private generateRequirementsAnalysis(rfpData: RFPData | null): string {
		if (!rfpData) {
			return `# Requirements Analysis

## Overview
This section provides a comprehensive analysis of the contract requirements and our approach to meeting them.

## Key Requirements
- [Requirement 1]: [Our approach]
- [Requirement 2]: [Our approach]
- [Requirement 3]: [Our approach]

## Compliance Strategy
Our approach ensures 100% compliance with all stated requirements through:
- Detailed requirement mapping
- Comprehensive solution design
- Rigorous quality assurance

*Note: This is a template. Please customize with specific RFP requirements.*`;
		}

		return `# Requirements Analysis

## Overview
This section provides a comprehensive analysis of the ${rfpData.title} requirements and our approach to meeting them.

## Key Requirements
${rfpData.requirements.map((req, index) => `- **Requirement ${index + 1}**: ${req}`).join('\n')}

## Compliance Strategy
Our approach ensures 100% compliance with all stated requirements through:
- Detailed requirement mapping and traceability
- Comprehensive solution design and implementation
- Rigorous quality assurance and testing protocols
- Continuous monitoring and validation

## Technical Solutions
For each requirement, we provide:
- Detailed technical approach
- Implementation methodology
- Quality assurance measures
- Risk mitigation strategies`;
	}

	private async analyzeContent(turn: ConversationTurn, context: ConversationContext): Promise<any> {
		const content = turn.content;
		const selectedText = turn.context.selectedText;

		let analysis = '';
		let actions: ConversationAction[] = [];
		let sources: SourceLink[] = [];

		if (selectedText) {
			analysis = `## Content Analysis

### Selected Text
"${selectedText.substring(0, 200)}${selectedText.length > 200 ? '...' : ''}"

### Analysis
- **Word Count**: ${selectedText.split(' ').length} words
- **Readability**: [Analysis based on content complexity]
- **Key Themes**: [Extracted themes and topics]
- **Suggestions**: [Improvement recommendations]

### Recommendations
1. **Clarity**: [Specific clarity improvements]
2. **Structure**: [Structural recommendations]
3. **Content**: [Content enhancement suggestions]`;
		} else {
			analysis = `## General Analysis

I can help you analyze content in several ways:

### Text Analysis
- Select text in your document and ask me to analyze it
- I'll provide insights on clarity, structure, and content

### Document Analysis
- Ask me to analyze entire documents or sections
- I'll provide comprehensive feedback and recommendations

### RFP Analysis
- I can analyze RFP requirements and provide insights
- Help identify key themes, requirements, and opportunities

### Proposal Analysis
- Analyze your proposal for completeness and competitiveness
- Identify gaps and improvement opportunities`;
		}

		return { content: analysis, actions, sources };
	}

	private async explainConcept(turn: ConversationTurn, context: ConversationContext): Promise<string> {
		const message = turn.content.toLowerCase();

		if (message.includes('evaluation criteria')) {
			return `# Government Contract Evaluation Criteria

## Overview
Government contracts are typically evaluated using a structured approach with multiple factors.

## Common Evaluation Factors

### Technical Evaluation (40-50%)
- **Technical Approach**: Methodology and solution design
- **Past Performance**: Relevant experience and track record
- **Key Personnel**: Qualifications and experience of proposed team
- **Understanding**: Demonstrated understanding of requirements

### Cost Evaluation (30-40%)
- **Total Evaluated Price**: Overall cost to the government
- **Cost Realism**: Reasonableness of proposed costs
- **Price Competitiveness**: Comparison with other offers

### Management Evaluation (10-20%)
- **Project Management**: Approach to managing the contract
- **Quality Assurance**: Quality control and assurance plans
- **Risk Management**: Identification and mitigation of risks

## Evaluation Process
1. **Initial Screening**: Basic compliance and responsiveness
2. **Technical Evaluation**: Detailed assessment of technical merit
3. **Cost Evaluation**: Analysis of pricing and cost realism
4. **Best Value Determination**: Trade-off analysis for final selection

## Tips for Success
- Address all evaluation criteria explicitly
- Provide specific examples and evidence
- Demonstrate clear understanding of requirements
- Offer competitive but realistic pricing`;
		}

		if (message.includes('compliance matrix')) {
			return `# Compliance Matrix

## What is a Compliance Matrix?
A compliance matrix is a structured document that maps your proposal response to each RFP requirement, ensuring complete coverage and traceability.

## Benefits
- **Complete Coverage**: Ensures no requirements are missed
- **Easy Evaluation**: Helps evaluators find specific responses
- **Quality Assurance**: Identifies gaps and missing information
- **Competitive Advantage**: Demonstrates thorough understanding

## Structure
| Requirement | Page/Section | Response | Status |
|-------------|--------------|----------|---------|
| R1.1 | 5 | Technical Approach | ✓ |
| R1.2 | 8 | Management Plan | ✓ |
| R2.1 | 12 | Past Performance | ✓ |

## Best Practices
1. **Be Specific**: Reference exact page numbers and sections
2. **Use Clear Status**: ✓ (Compliant), △ (Partially Compliant), ✗ (Non-Compliant)
3. **Provide Cross-References**: Link to detailed responses
4. **Include Evidence**: Reference past performance and examples`;
		}

		return `# General Explanation

I can explain various government contracting concepts:

## Common Topics
- **Evaluation Criteria**: How government contracts are evaluated
- **Compliance Matrix**: Mapping requirements to responses
- **Win Themes**: Key differentiators and competitive advantages
- **Risk Management**: Identifying and mitigating project risks
- **Quality Assurance**: Ensuring proposal and project quality

## How to Get Specific Explanations
- Ask about specific concepts: "Explain evaluation criteria"
- Request examples: "Show me a compliance matrix example"
- Ask for best practices: "What are best practices for win themes?"

I'm here to help you understand any aspect of government contracting!`;
	}

	private async searchInformation(turn: ConversationTurn, context: ConversationContext): Promise<any> {
		const message = turn.content.toLowerCase();
		const rfpData = context.projectContext.currentRFP;

		let content = '';
		let sources: SourceLink[] = [];

		if (rfpData) {
			if (message.includes('requirements')) {
				content = `## Requirements Found in RFP

${rfpData.requirements.map((req, index) => `**Requirement ${index + 1}**: ${req}`).join('\n\n')}

### Summary
- **Total Requirements**: ${rfpData.requirements.length}
- **Key Themes**: ${this.extractThemes(rfpData.requirements)}
- **Complexity Level**: ${this.assessComplexity(rfpData.requirements)}`;

				sources.push({
					text: 'RFP Requirements Section',
					section: 'Requirements',
					relevance: 0.9
				});
			} else if (message.includes('background')) {
				content = `## Background Information

**Project Title**: ${rfpData.title}
**Agency**: ${rfpData.agency}
**Notice ID**: ${rfpData.noticeId}
**Estimated Value**: ${rfpData.estimatedValue}

### Project Description
${rfpData.description}

### Background Context
${rfpData.background}

### Key Information
- **NAICS Codes**: ${rfpData.naicsCodes.join(', ')}
- **Keywords**: ${rfpData.keywords.join(', ')}
- **Deadline**: ${rfpData.deadline}`;

				sources.push({
					text: 'RFP Background Section',
					section: 'Background',
					relevance: 0.8
				});
			}
		} else {
			content = `## Information Search

I can help you search for information in several ways:

### RFP Information
- **Requirements**: Search for specific requirements
- **Background**: Find background and context information
- **Deadlines**: Important dates and timelines
- **Evaluation Criteria**: How the contract will be evaluated

### Proposal Information
- **Generated Content**: Find previously generated content
- **Section Status**: Check completion status of sections
- **Recent Activity**: View recent changes and updates

### To Get Started
1. **Import RFP**: Use the "Import RFP" command to load contract data
2. **Ask Specific Questions**: "What are the requirements?" or "Show me the background"
3. **Search Generated Content**: "Find my executive summary" or "Show technical approach"`;
		}

		return { content, sources };
	}

	private async generateGeneralResponse(turn: ConversationTurn, context: ConversationContext): Promise<string> {
		const userProfile = context.userProfile;
		const projectContext = context.projectContext;

		if (projectContext.currentRFP) {
			return `Hello ${userProfile.name}! 👋

I see you're working on the **${projectContext.currentRFP.title}** contract. I'm here to help you create a winning proposal!

## What I Can Help With
- **📝 Generate Content**: Executive summaries, technical approaches, requirements analysis
- **🔍 Analyze Requirements**: Break down complex requirements and identify key themes
- **📊 Create Compliance Matrix**: Map your responses to RFP requirements
- **💡 Provide Insights**: Competitive analysis and win theme development
- **📋 Insert Content**: Seamlessly add generated content to your proposal

## Quick Actions
- Ask me to "Generate executive summary"
- Request "Analyze the requirements"
- Say "Create technical approach"
- Ask "What are the key evaluation criteria?"

What would you like to work on today?`;
		} else {
			return `Hello ${userProfile.name}! 👋

Welcome to Valinor Studio! I'm your AI assistant for government contract proposals.

## Getting Started
1. **Import RFP**: Use the "Import RFP" command to load contract data
2. **Ask Questions**: I can help with any aspect of proposal development
3. **Generate Content**: I'll create sections, analyze requirements, and provide insights

## What I Can Do
- **📋 RFP Analysis**: Break down requirements and identify opportunities
- **📝 Content Generation**: Create compelling proposal sections
- **🔍 Competitive Analysis**: Help you stand out from the competition
- **📊 Compliance Tracking**: Ensure your proposal meets all requirements
- **💡 Strategic Insights**: Provide recommendations for success

## Quick Start
Try asking me to:
- "Import an RFP" (I'll guide you through the process)
- "Explain evaluation criteria"
- "Show me proposal best practices"

Ready to create a winning proposal? Let's get started!`;
		}
	}

	private personalizeResponse(content: string, userProfile: UserProfile): string {
		// Add personal touches based on user profile
		let personalized = content;

		// Add name if available
		if (userProfile.name && userProfile.name !== 'Contract Specialist') {
			personalized = personalized.replace(/Hello!/, `Hello ${userProfile.name}!`);
		}

		// Adjust detail level based on experience
		if (userProfile.experience === 'beginner') {
			personalized += '\n\n💡 **Pro Tip**: I can explain any concept in more detail if needed. Just ask!';
		} else if (userProfile.experience === 'expert') {
			personalized += '\n\n🚀 **Advanced**: I can provide deeper analysis and strategic insights.';
		}

		// Add agency-specific insights if available
		if (userProfile.preferredAgencies.length > 0) {
			personalized += `\n\n🏛️ **Agency Focus**: I have insights specific to ${userProfile.preferredAgencies.join(', ')} contracts.`;
		}

		return personalized;
	}

	private extractThemes(requirements: string[]): string {
		const themes = new Set<string>();
		requirements.forEach(req => {
			if (req.toLowerCase().includes('technical')) themes.add('Technical');
			if (req.toLowerCase().includes('management')) themes.add('Management');
			if (req.toLowerCase().includes('cost')) themes.add('Cost');
			if (req.toLowerCase().includes('quality')) themes.add('Quality');
		});
		return Array.from(themes).join(', ');
	}

	private assessComplexity(requirements: string[]): string {
		const avgLength = requirements.reduce((sum, req) => sum + req.length, 0) / requirements.length;
		if (avgLength > 200) return 'High';
		if (avgLength > 100) return 'Medium';
		return 'Low';
	}
}

class ActionExecutor {
	private context: ConversationContext;
	private output: vscode.OutputChannel;

	constructor(context: ConversationContext, output: vscode.OutputChannel) {
		this.context = context;
		this.output = output;
	}

	async executeActions(actions: ConversationAction[]): Promise<any[]> {
		const results = [];

		for (const action of actions) {
			try {
				const result = await this.executeAction(action);
				action.executed = true;
				action.result = result;
				results.push(result);
			} catch (error) {
				this.output.appendLine(`❌ Action execution failed: ${error}`);
				action.executed = false;
				action.result = { error: error instanceof Error ? error.message : String(error) };
			}
		}

		return results;
	}

	private async executeAction(action: ConversationAction): Promise<any> {
		switch (action.type) {
			case 'insert':
				return await this.insertContent(action.parameters);
			case 'generate':
				return await this.generateContent(action.parameters);
			case 'analyze':
				return await this.analyzeContent(action.parameters);
			case 'search':
				return await this.searchContent(action.parameters);
			default:
				return { status: 'not_implemented' };
		}
	}

	private async insertContent(parameters: any): Promise<any> {
		// This would integrate with the document insertion system
		return { status: 'insertion_queued', section: parameters.section };
	}

	private async generateContent(parameters: any): Promise<any> {
		// This would trigger content generation
		return { status: 'generation_started', type: parameters.type };
	}

	private async analyzeContent(parameters: any): Promise<any> {
		// This would perform content analysis
		return { status: 'analysis_complete', insights: [] };
	}

	private async searchContent(parameters: any): Promise<any> {
		// This would search through documents
		return { status: 'search_complete', results: [] };
	}
}
