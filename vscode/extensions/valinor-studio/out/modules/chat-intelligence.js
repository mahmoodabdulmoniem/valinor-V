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
exports.ChatIntelligence = void 0;
const vscode = __importStar(require("vscode"));
class ChatIntelligence {
    constructor(output) {
        this.conversationMemory = new Map();
        this.userPatterns = new UserPatterns();
        this.output = output;
        this.context = this.initializeContext();
        this.contextAnalyzer = new ContextAnalyzer(this.context);
        this.responseGenerator = new ResponseGenerator(this.context);
        this.actionExecutor = new ActionExecutor(this.context, output);
    }
    initializeContext() {
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
    async processUserMessage(message, activeEditor) {
        // Update context with current state
        this.updateContext(activeEditor);
        // Analyze user intent and context
        const analysis = await this.contextAnalyzer.analyzeMessage(message, this.context);
        // Create conversation turn
        const turn = {
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
        // Generate intelligent response with AI integration
        const response = await this.generateAIResponse(message, turn);
        // Execute any required actions
        const executedActions = await this.actionExecutor.executeActions(response.actions || []);
        // Update conversation memory
        this.updateConversationMemory(turn, response, executedActions);
        // Update user patterns
        this.userPatterns.updatePatterns(turn, response);
        return {
            content: response.content,
            sources: response.sources || [],
            actions: response.actions || [],
            suggestions: this.generateSuggestions(turn, response),
            context: this.getRelevantContext(turn),
            confidence: response.confidence || 0.8
        };
    }
    async generateAIResponse(message, turn) {
        try {
            // Check if this is a contract-related query
            if (this.context.projectContext.currentRFP) {
                // Use contextual response for contract data
                return {
                    content: this.generateContextualResponse(message),
                    sources: this.generateSources(),
                    actions: this.generateActions(message),
                    confidence: 0.9
                };
            }
            else {
                // Try to use AI for general responses, but fallback to local responses
                try {
                    const aiResponse = await this.callAIForResponse(message);
                    return {
                        content: aiResponse,
                        sources: [],
                        actions: [],
                        confidence: 0.8
                    };
                }
                catch (aiError) {
                    this.output.appendLine(`⚠️ AI response failed, using fallback: ${aiError}`);
                    return {
                        content: this.generateGeneralResponse(message),
                        sources: [],
                        actions: [],
                        confidence: 0.7
                    };
                }
            }
        }
        catch (error) {
            this.output.appendLine(`❌ Error generating AI response: ${error}`);
            return {
                content: this.generateFallbackResponse(message),
                sources: [],
                actions: [],
                confidence: 0.5
            };
        }
    }
    async callAIForResponse(message) {
        try {
            // Import the AI analyzer functions
            const { analyzeContractWithAI } = await Promise.resolve().then(() => __importStar(require('./ai-analyzer')));
            // Create a mock output channel for logging
            const output = {
                appendLine: (text) => {
                    this.output.appendLine(text);
                }
            };
            // Create a simple prompt for general questions
            const prompt = `User Question: ${message}

Please provide a helpful response about government contract analysis, proposal writing, or related topics. Keep the response professional and informative.`;
            // For now, return a contextual response since AI might not be configured
            return this.generateGeneralResponse(message);
        }
        catch (error) {
            throw new Error(`AI service not available: ${error}`);
        }
    }
    generateFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('error') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
            return `I understand you're experiencing an issue. Let me help you troubleshoot:

**Common Solutions:**
1. Check your API keys are properly configured
2. Ensure you have an active internet connection
3. Verify your AWS credentials are valid
4. Try restarting VS Code

**For Contract Analysis:**
- Use the "Import RFP" command to load contract data
- Paste a Notice ID directly in the chat
- Use the command palette (Ctrl+Shift+P) for additional features

Would you like me to help you with any specific aspect of contract analysis?`;
        }
        return `I'm here to help with government contract analysis!

**What I can do:**
- Search and analyze government contracts
- Generate proposal sections
- Provide compliance guidance
- Help with pricing strategies
- Create requirement analysis

**To get started:**
1. Use "Import RFP" command with a Notice ID
2. Ask me about specific contract requirements
3. Request help with proposal sections
4. Get guidance on compliance and best practices

How can I assist you today?`;
    }
    generateContextualResponse(message) {
        const rfp = this.context.projectContext.currentRFP;
        if (!rfp) {
            return 'I\'m here to help with government contract analysis! Please provide a Notice ID or use the "Import RFP" command to get started.';
        }
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('deadline') || lowerMessage.includes('due date')) {
            return `📅 **Deadline Information**\n\nThe contract deadline is: **${rfp.deadline}**\n\nMake sure to submit your proposal before this date to be considered for the contract.`;
        }
        if (lowerMessage.includes('requirements') || lowerMessage.includes('technical')) {
            return `📋 **Technical Requirements**\n\nThis contract has ${rfp.requirements.length} key requirements:\n\n${rfp.requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}\n\nWould you like me to analyze any specific requirement in detail?`;
        }
        if (lowerMessage.includes('agency') || lowerMessage.includes('department')) {
            return `🏛️ **Agency Information**\n\nThe contracting agency is: **${rfp.agency}**\n\nThis agency typically focuses on ${rfp.keywords.join(', ')} related projects.`;
        }
        if (lowerMessage.includes('value') || lowerMessage.includes('budget') || lowerMessage.includes('cost')) {
            return `💰 **Contract Value**\n\nThe estimated contract value is: **${rfp.estimatedValue}**\n\nThis is a significant opportunity that requires careful planning and competitive pricing.`;
        }
        return `I can help you analyze this contract! Here's what I know:\n\n**Title:** ${rfp.title}\n**Agency:** ${rfp.agency}\n**Deadline:** ${rfp.deadline}\n**Requirements:** ${rfp.requirements.length} items\n\nWhat specific aspect would you like to know more about?`;
    }
    generateGeneralResponse(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
            return `I'm Valinor Studio AI, your government contract analysis assistant! Here's what I can help you with:

🔍 **Contract Search**: Paste a Notice ID and I'll find the contract details
📊 **Requirements Analysis**: I'll break down technical requirements and compliance needs
📋 **File Generation**: I create detailed analysis files for each contract
💡 **AI Insights**: Get AI-powered recommendations and action items
📝 **Section Generation**: Right-click on section headers to generate content
🏢 **Business Profile**: Insert your company profile into proposals
💬 **Interactive Chat**: Ask questions about contracts and get instant answers

To get started, try pasting a Notice ID or use the "Import RFP" command!`;
        }
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return `Hello! 👋 I'm here to help you with government contract analysis. How can I assist you today?`;
        }
        return `I'm here to help with government contract analysis! You can paste a Notice ID to search for contracts, or use the "Import RFP" command for more options.`;
    }
    generateSources() {
        const rfp = this.context.projectContext.currentRFP;
        if (!rfp)
            return [];
        return [
            {
                text: rfp.title,
                section: 'Contract Title',
                relevance: 0.9
            },
            {
                text: rfp.agency,
                section: 'Agency',
                relevance: 0.8
            }
        ];
    }
    generateActions(message) {
        const actions = [];
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('generate') || lowerMessage.includes('create')) {
            actions.push({
                type: 'generate',
                description: 'Generate proposal section',
                parameters: { section: 'technical_approach' },
                executed: false
            });
        }
        if (lowerMessage.includes('analyze') || lowerMessage.includes('review')) {
            actions.push({
                type: 'analyze',
                description: 'Analyze requirements',
                parameters: { type: 'requirements_analysis' },
                executed: false
            });
        }
        return actions;
    }
    updateContext(activeEditor) {
        if (activeEditor) {
            this.context.workspaceState.activeEditor = activeEditor.document.uri.fsPath;
            this.context.workspaceState.openFiles = vscode.workspace.textDocuments.map(doc => doc.uri.fsPath);
        }
    }
    getWorkspaceFiles() {
        return vscode.workspace.textDocuments.map(doc => doc.uri.fsPath);
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    updateConversationMemory(turn, response, executedActions) {
        const key = `${turn.metadata.intent}_${turn.content.substring(0, 50)}`;
        this.conversationMemory.set(key, {
            turn,
            response,
            executedActions,
            timestamp: new Date()
        });
    }
    generateSuggestions(turn, response) {
        const suggestions = [];
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
    getRelevantContext(turn) {
        return {
            currentRFP: this.context.projectContext.currentRFP,
            activeDocument: turn.context.activeDocument,
            recentActivity: this.context.workspaceState.userActivity.slice(-5),
            projectProgress: this.context.workspaceState.projectProgress
        };
    }
    setRFPData(rfpData) {
        this.context.projectContext.currentRFP = rfpData;
        this.output.appendLine(`📋 RFP context loaded: ${rfpData.title}`);
    }
    getUserProfile() {
        return this.context.userProfile;
    }
    updateUserProfile(updates) {
        this.context.userProfile = { ...this.context.userProfile, ...updates };
    }
    getConversationHistory() {
        return this.context.conversationHistory;
    }
    clearConversation() {
        this.context.conversationHistory = [];
        this.conversationMemory.clear();
        this.output.appendLine('🗑️ Conversation history cleared');
    }
}
exports.ChatIntelligence = ChatIntelligence;
class UserPatterns {
    constructor() {
        this.patterns = new Map();
        this.preferences = new Map();
    }
    updatePatterns(turn, response) {
        // Track user preferences and patterns
        const intent = turn.metadata.intent;
        this.patterns.set(intent, (this.patterns.get(intent) || 0) + 1);
        // Update preferences based on interaction
        if (response.confidence > 0.8) {
            this.preferences.set('preferred_intent', intent);
        }
    }
    getPreferredStyle() {
        return this.preferences.get('preferred_intent') || 'general';
    }
}
class ContextAnalyzer {
    constructor(context) {
        this.context = context;
    }
    async analyzeMessage(message, context) {
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
    detectIntent(message) {
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
    extractEntities(message) {
        const entities = [];
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
    analyzeSentiment(message) {
        const positiveWords = ['great', 'excellent', 'good', 'perfect', 'amazing', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'wrong', 'incorrect', 'failed'];
        const lowerMessage = message.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
        if (positiveCount > negativeCount)
            return 'positive';
        if (negativeCount > positiveCount)
            return 'negative';
        return 'neutral';
    }
    calculateConfidence(message, intent) {
        // Simple confidence calculation based on message length and intent clarity
        const baseConfidence = Math.min(message.length / 100, 1);
        const intentConfidence = intent !== 'general_inquiry' ? 0.8 : 0.5;
        return (baseConfidence + intentConfidence) / 2;
    }
    requiresAction(intent) {
        return ['generate_content', 'insert_content', 'search_information'].includes(intent);
    }
}
class ResponseGenerator {
    constructor(context) {
        this.context = context;
    }
    async generateResponse(turn, context) {
        const intent = turn.metadata.intent;
        const userProfile = context.userProfile;
        const projectContext = context.projectContext;
        let content = '';
        let actions = [];
        let sources = [];
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
    async generateContent(turn, context) {
        const rfpData = context.projectContext.currentRFP;
        const userMessage = turn.content.toLowerCase();
        let content = '';
        let actions = [];
        let sources = [];
        if (userMessage.includes('executive summary')) {
            content = this.generateExecutiveSummary(rfpData);
            actions.push({
                type: 'insert',
                description: 'Insert executive summary into proposal',
                parameters: { section: 'Executive Summary', content },
                executed: false
            });
        }
        else if (userMessage.includes('technical approach')) {
            content = this.generateTechnicalApproach(rfpData);
            actions.push({
                type: 'insert',
                description: 'Insert technical approach into proposal',
                parameters: { section: 'Technical Approach', content },
                executed: false
            });
        }
        else if (userMessage.includes('requirements')) {
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
    generateExecutiveSummary(rfpData) {
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
    generateTechnicalApproach(rfpData) {
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
    generateRequirementsAnalysis(rfpData) {
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
    async analyzeContent(turn, context) {
        const content = turn.content;
        const selectedText = turn.context.selectedText;
        let analysis = '';
        let actions = [];
        let sources = [];
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
        }
        else {
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
    async explainConcept(turn, context) {
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
    async searchInformation(turn, context) {
        const message = turn.content.toLowerCase();
        const rfpData = context.projectContext.currentRFP;
        let content = '';
        let sources = [];
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
            }
            else if (message.includes('background')) {
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
        }
        else {
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
    async generateGeneralResponse(turn, context) {
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
        }
        else {
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
    personalizeResponse(content, userProfile) {
        // Add personal touches based on user profile
        let personalized = content;
        // Add name if available
        if (userProfile.name && userProfile.name !== 'Contract Specialist') {
            personalized = personalized.replace(/Hello!/, `Hello ${userProfile.name}!`);
        }
        // Adjust detail level based on experience
        if (userProfile.experience === 'beginner') {
            personalized += '\n\n💡 **Pro Tip**: I can explain any concept in more detail if needed. Just ask!';
        }
        else if (userProfile.experience === 'expert') {
            personalized += '\n\n🚀 **Advanced**: I can provide deeper analysis and strategic insights.';
        }
        // Add agency-specific insights if available
        if (userProfile.preferredAgencies.length > 0) {
            personalized += `\n\n🏛️ **Agency Focus**: I have insights specific to ${userProfile.preferredAgencies.join(', ')} contracts.`;
        }
        return personalized;
    }
    extractThemes(requirements) {
        const themes = new Set();
        requirements.forEach(req => {
            if (req.toLowerCase().includes('technical'))
                themes.add('Technical');
            if (req.toLowerCase().includes('management'))
                themes.add('Management');
            if (req.toLowerCase().includes('cost'))
                themes.add('Cost');
            if (req.toLowerCase().includes('quality'))
                themes.add('Quality');
        });
        return Array.from(themes).join(', ');
    }
    assessComplexity(requirements) {
        const avgLength = requirements.reduce((sum, req) => sum + req.length, 0) / requirements.length;
        if (avgLength > 200)
            return 'High';
        if (avgLength > 100)
            return 'Medium';
        return 'Low';
    }
}
class ActionExecutor {
    constructor(context, output) {
        this.context = context;
        this.output = output;
    }
    async executeActions(actions) {
        const results = [];
        for (const action of actions) {
            try {
                const result = await this.executeAction(action);
                action.executed = true;
                action.result = result;
                results.push(result);
            }
            catch (error) {
                this.output.appendLine(`❌ Action execution failed: ${error}`);
                action.executed = false;
                action.result = { error: error instanceof Error ? error.message : String(error) };
            }
        }
        return results;
    }
    async executeAction(action) {
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
    async insertContent(parameters) {
        // This would integrate with the document insertion system
        return { status: 'insertion_queued', section: parameters.section };
    }
    async generateContent(parameters) {
        // This would trigger content generation
        return { status: 'generation_started', type: parameters.type };
    }
    async analyzeContent(parameters) {
        // This would perform content analysis
        return { status: 'analysis_complete', insights: [] };
    }
    async searchContent(parameters) {
        // This would search through documents
        return { status: 'search_complete', results: [] };
    }
}
//# sourceMappingURL=chat-intelligence.js.map