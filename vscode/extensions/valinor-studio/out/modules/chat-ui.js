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
exports.ValinorChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ai_analyzer_1 = require("./ai-analyzer");
const chat_intelligence_1 = require("./chat-intelligence");
const chat_actions_1 = require("./chat-actions");
// Webview View Provider for the right-side chat panel
class ValinorChatViewProvider {
    constructor(_extensionUri, output) {
        this._extensionUri = _extensionUri;
        this._messages = [];
        this._selectedModel = 'GPT-4';
        this._currentRFPData = null;
        this._isProcessing = false;
        this._output = output;
        this._chatIntelligence = new chat_intelligence_1.ChatIntelligence(output);
        this._actionProvider = new chat_actions_1.ChatActionProvider(output);
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'sendMessage':
                    this.handleUserMessage(message.text);
                    break;
                case 'newChat':
                    this.clearMessages();
                    break;
                case 'addContext':
                    this.handleAddContext();
                    break;
                case 'changeModel':
                    this._selectedModel = message.model;
                    this.updateModelStatus();
                    break;
                case 'insertIntoDocument':
                    this.handleInsertIntoDocument(message.messageId, message.section);
                    break;
                case 'navigateToSource':
                    this.handleNavigateToSource(message.source);
                    break;
                case 'copyToClipboard':
                    this.handleCopyToClipboard(message.text);
                    break;
                case 'applyAutoFix':
                    this.handleApplyAutoFix(message.fixId);
                    break;
                case 'createFromChat':
                    this.handleCreateFromChat(message.creationId);
                    break;
                case 'executeAction':
                    this.handleExecuteAction(message.actionId);
                    break;
                case 'showAutoFixes':
                    this.handleShowAutoFixes();
                    break;
                case 'showInChatCreations':
                    this.handleShowInChatCreations();
                    break;
            }
        });
        this._render();
        this.updateModelStatus();
    }
    addMessage(role, text, model, sources, actions, suggestions, context) {
        const message = {
            role,
            text,
            timestamp: new Date(),
            model: model || this._selectedModel,
            sources,
            actions,
            suggestions,
            context
        };
        this._messages.push(message);
        this._render();
    }
    // Set current RFP data for contextual responses
    setRFPData(rfpData) {
        this._currentRFPData = rfpData;
        this._chatIntelligence.setRFPData(rfpData);
        this._output.appendLine('📋 RFP data loaded for contextual chat');
    }
    getActionIcon(actionType) {
        const iconMap = {
            'insert': chat_actions_1.SleekIcons.INSERT,
            'generate': chat_actions_1.SleekIcons.GENERATE,
            'analyze': chat_actions_1.SleekIcons.ANALYZE,
            'search': chat_actions_1.SleekIcons.ANALYZE,
            'explain': chat_actions_1.SleekIcons.EXPLAIN,
            'suggest': chat_actions_1.SleekIcons.LIGHTBULB,
            'navigate': chat_actions_1.SleekIcons.OPEN,
            'improve': chat_actions_1.SleekIcons.IMPROVE,
            'create': chat_actions_1.SleekIcons.CREATE,
            'fix': chat_actions_1.SleekIcons.FIX,
            'refactor': chat_actions_1.SleekIcons.REFACTOR
        };
        return iconMap[actionType] || chat_actions_1.SleekIcons.ROCKET;
    }
    async handleUserMessage(text) {
        if (this._isProcessing) {
            return; // Prevent multiple simultaneous processing
        }
        this._isProcessing = true;
        this.addMessage('user', text);
        // Show typing indicator
        this.showTypingIndicator();
        try {
            // Get active editor for context
            const activeEditor = vscode.window.activeTextEditor;
            // Use advanced chat intelligence
            const response = await this._chatIntelligence.processUserMessage(text, activeEditor);
            // Hide typing indicator
            this.hideTypingIndicator();
            // Convert ConversationAction to MessageAction format
            const messageActions = response.actions.map(action => ({
                id: action.type,
                label: action.description,
                icon: this.getActionIcon(action.type),
                command: `valinorStudio.executeAction`,
                arguments: [action]
            }));
            // Add AI response with enhanced features
            this.addMessage('ai', response.content, this._selectedModel, response.sources, messageActions, response.suggestions, response.context);
        }
        catch (error) {
            this.hideTypingIndicator();
            this.addMessage('ai', `I apologize, but I encountered an error: ${error}. Please try again.`, this._selectedModel);
        }
        finally {
            this._isProcessing = false;
        }
    }
    async generateContextualResponse(userQuestion) {
        // Create a mock output channel for the AI analyzer
        const output = {
            appendLine: (text) => {
                this._output.appendLine(text);
            }
        };
        // Prepare context from current RFP data
        let context = '';
        let sources = [];
        let actions = [];
        if (this._currentRFPData) {
            context = `Current RFP Context:
Title: ${this._currentRFPData.title || 'Unknown'}
Notice ID: ${this._currentRFPData.noticeId || 'Unknown'}
Description: ${this._currentRFPData.description || 'No description available'}
Requirements: ${this._currentRFPData.requirements || 'No requirements specified'}
Background: ${this._currentRFPData.background || 'No background information'}

User Question: ${userQuestion}

Please provide a comprehensive response based on the RFP context above.`;
            // Add source links based on RFP sections
            if (this._currentRFPData.requirements) {
                sources.push({
                    text: 'Requirements Section',
                    section: 'Requirements',
                    lineNumber: 1
                });
            }
            if (this._currentRFPData.background) {
                sources.push({
                    text: 'Background Section',
                    section: 'Background',
                    lineNumber: 1
                });
            }
        }
        else {
            context = `User Question: ${userQuestion}

Note: No RFP data is currently loaded. Please use the "Import RFP" command to load contract data for contextual responses.`;
        }
        // Generate AI response
        const mockContractData = this._currentRFPData || {
            title: 'Contextual Chat',
            noticeId: 'CHAT_QUERY',
            description: userQuestion
        };
        // Use the AI analyzer to generate response
        let aiResponse = '';
        const originalAddMessage = this.addMessage.bind(this);
        this.addMessage = (type, content, model) => {
            if (type === 'ai') {
                aiResponse = content;
            }
        };
        try {
            await (0, ai_analyzer_1.analyzeContractWithAI)(mockContractData, output, this, this._selectedModel);
        }
        finally {
            // Restore the original method
            this.addMessage = originalAddMessage;
        }
        // Add document insertion action for relevant responses
        if (this.isDocumentInsertionRelevant(userQuestion)) {
            actions.push({
                id: 'insertIntoDocument',
                label: 'Insert into Document',
                icon: '📄',
                command: 'valinorStudio.insertChatResponse',
                arguments: [aiResponse, userQuestion]
            });
        }
        // Add copy action
        actions.push({
            id: 'copyToClipboard',
            label: 'Copy',
            icon: '📋',
            command: 'valinorStudio.copyToClipboard',
            arguments: [aiResponse]
        });
        return {
            text: aiResponse || this.generateFallbackResponse(userQuestion),
            sources,
            actions
        };
    }
    isDocumentInsertionRelevant(question) {
        const insertionKeywords = [
            'generate', 'create', 'write', 'draft', 'summary', 'executive summary',
            'technical approach', 'requirements', 'background', 'proposal',
            'insert', 'add to document', 'put in', 'include in'
        ];
        const questionLower = question.toLowerCase();
        return insertionKeywords.some(keyword => questionLower.includes(keyword));
    }
    generateFallbackResponse(question) {
        const responses = {
            'evaluation criteria': `Based on typical government contract evaluation criteria, here are the key factors:

## **Technical Evaluation (40-50%)**
- Technical approach and methodology
- Past performance and experience
- Key personnel qualifications
- Understanding of requirements

## **Cost Evaluation (30-40%)**
- Total evaluated price
- Cost realism and reasonableness
- Price competitiveness

## **Management Evaluation (10-20%)**
- Project management approach
- Quality assurance plan
- Risk management strategy

*Note: Specific weights vary by contract type and agency.*`,
            'summarize background': `Here's a 3-bullet summary of the background information:

• **Contract Purpose**: [Contract objective and scope]
• **Current Situation**: [Existing conditions or challenges]
• **Expected Outcomes**: [Desired results and deliverables]

*Note: This is a template response. Load RFP data for specific background information.*`,
            'requirements': `Based on the RFP requirements, here are the key deliverables:

## **Technical Requirements**
- [Specific technical specifications]
- [Performance standards]
- [Compliance requirements]

## **Deliverables**
- [Required reports and documentation]
- [Timeline and milestones]
- [Quality standards]

*Note: Load RFP data for specific requirements analysis.*`
        };
        const questionLower = question.toLowerCase();
        for (const [key, response] of Object.entries(responses)) {
            if (questionLower.includes(key)) {
                return response;
            }
        }
        return `I understand you're asking about "${question}". To provide a more specific and contextual response, please:

1. **Import RFP Data**: Use the "Import RFP" command to load contract information
2. **Ask Specific Questions**: Once RFP data is loaded, I can provide detailed analysis
3. **Request Document Insertion**: Ask me to generate content and insert it into your proposal

I'm here to help you analyze government contracts and create compelling proposals!`;
    }
    handleInsertIntoDocument(messageId, section) {
        const message = this._messages.find(m => m.timestamp.getTime().toString() === messageId);
        if (!message || message.role !== 'ai') {
            vscode.window.showErrorMessage('Message not found or not an AI response');
            return;
        }
        // Show section selection if not provided
        if (!section) {
            const sections = ['Requirements', 'Background', 'Technical Approach', 'Executive Summary', 'Management Plan'];
            vscode.window.showQuickPick(sections, {
                placeHolder: 'Select section to insert content'
            }).then(selectedSection => {
                if (selectedSection) {
                    this.insertContentIntoDocument(message.text, selectedSection);
                }
            });
        }
        else {
            this.insertContentIntoDocument(message.text, section);
        }
    }
    async insertContentIntoDocument(content, section) {
        try {
            // Find or create proposal.md file
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }
            const proposalPath = path.join(workspaceFolder.uri.fsPath, 'proposal.md');
            const proposalUri = vscode.Uri.file(proposalPath);
            // Check if file exists, create if not
            try {
                await vscode.workspace.fs.stat(proposalUri);
            }
            catch {
                // File doesn't exist, create it
                const initialContent = `# Government Contract Proposal

## Executive Summary

## Background

## Requirements

## Technical Approach

## Management Plan

## Cost Proposal

## Past Performance

## Risk Assessment
`;
                await vscode.workspace.fs.writeFile(proposalUri, Buffer.from(initialContent, 'utf8'));
            }
            // Open the document
            const document = await vscode.workspace.openTextDocument(proposalUri);
            const editor = await vscode.window.showTextDocument(document);
            // Find the section and insert content
            const text = document.getText();
            const lines = text.split('\n');
            let sectionStart = -1;
            // Find section header
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === `## ${section}`) {
                    sectionStart = i;
                    break;
                }
            }
            if (sectionStart === -1) {
                // Section not found, add it at the end
                const edit = new vscode.WorkspaceEdit();
                edit.insert(proposalUri, new vscode.Position(lines.length, 0), `\n## ${section}\n\n${content}\n`);
                await vscode.workspace.applyEdit(edit);
            }
            else {
                // Find end of section
                let sectionEnd = lines.length;
                for (let i = sectionStart + 1; i < lines.length; i++) {
                    if (lines[i].startsWith('## ')) {
                        sectionEnd = i;
                        break;
                    }
                }
                // Insert content after section header
                const edit = new vscode.WorkspaceEdit();
                edit.insert(proposalUri, new vscode.Position(sectionStart + 1, 0), `\n${content}\n`);
                await vscode.workspace.applyEdit(edit);
            }
            vscode.window.showInformationMessage(`✅ Content inserted into ${section} section`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to insert content: ${error}`);
        }
    }
    handleNavigateToSource(source) {
        if (source.filePath) {
            vscode.workspace.openTextDocument(source.filePath).then(document => {
                vscode.window.showTextDocument(document).then(editor => {
                    if (source.lineNumber) {
                        const position = new vscode.Position(source.lineNumber - 1, 0);
                        editor.revealRange(new vscode.Range(position, position));
                        editor.selection = new vscode.Selection(position, position);
                    }
                });
            });
        }
        else {
            vscode.window.showInformationMessage(`Source: ${source.text} (${source.section})`);
        }
    }
    handleCopyToClipboard(text) {
        vscode.env.clipboard.writeText(text).then(() => {
            vscode.window.showInformationMessage('✅ Content copied to clipboard');
        });
    }
    async handleApplyAutoFix(fixId) {
        // This would apply the specific auto-fix
        vscode.window.showInformationMessage(`🔧 Applying auto-fix: ${fixId}`);
    }
    async handleCreateFromChat(creationId) {
        // This would create content from chat
        vscode.window.showInformationMessage(`⚡ Creating from chat: ${creationId}`);
    }
    async handleExecuteAction(actionId) {
        // This would execute the specific action
        vscode.window.showInformationMessage(`🎯 Executing action: ${actionId}`);
    }
    async handleShowAutoFixes() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('No active editor to analyze');
            return;
        }
        const fixes = await this._actionProvider.generateAutoFixes(activeEditor.document);
        if (fixes.length > 0) {
            this.addMessage('ai', this.formatAutoFixesMessage(fixes), this._selectedModel);
        }
        else {
            vscode.window.showInformationMessage('✨ No auto-fixes available for this content');
        }
    }
    async handleShowInChatCreations() {
        const context = {
            currentRFP: this._currentRFPData,
            activeDocuments: vscode.workspace.textDocuments.map(doc => doc.uri.fsPath)
        };
        const creations = await this._actionProvider.generateInChatCreations(context);
        if (creations.length > 0) {
            this.addMessage('ai', this.formatInChatCreationsMessage(creations), this._selectedModel);
        }
        else {
            vscode.window.showInformationMessage('⚡ No creation options available');
        }
    }
    formatAutoFixesMessage(fixes) {
        let message = `## ${chat_actions_1.SleekIcons.FIX} Auto-Fixes Available\n\n`;
        fixes.forEach((fix, index) => {
            message += `### ${fix.icon} ${fix.title}\n`;
            message += `${fix.description}\n\n`;
            message += `**Confidence**: ${Math.round(fix.confidence * 100)}%\n`;
            message += `**Explanation**: ${fix.explanation}\n\n`;
            message += `Click **Apply Fix** to implement this improvement.\n\n`;
        });
        return message;
    }
    formatInChatCreationsMessage(creations) {
        let message = `## ${chat_actions_1.SleekIcons.CREATE} In-Chat Creation Options\n\n`;
        creations.forEach((creation, index) => {
            message += `### ${chat_actions_1.SleekIcons.SECTION} ${creation.name}\n`;
            message += `**Type**: ${creation.type}\n`;
            message += `**Location**: ${creation.location}\n`;
            message += `**Template**: ${creation.template}\n\n`;
            message += `Click **Create** to generate this content.\n\n`;
        });
        return message;
    }
    showTypingIndicator() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'showTyping'
            });
        }
    }
    hideTypingIndicator() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'hideTyping'
            });
        }
    }
    clearMessages() {
        this._messages = [];
        this._render();
    }
    handleAddContext() {
        vscode.window.showInformationMessage('Add context functionality will be implemented');
    }
    updateModelStatus() {
        // Update the status bar with current model
        vscode.commands.executeCommand('setContext', 'valinorStudio.currentModel', this._selectedModel);
    }
    _render() {
        if (!this._view)
            return;
        const chatHtml = this._messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const text = this.formatMessageText(msg.text);
            const time = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const messageId = msg.timestamp.getTime().toString();
            // Generate sources HTML with modern styling
            const sourcesHtml = msg.sources && msg.sources.length > 0 ? `
				<div class="message-sources">
					<div class="sources-header">
						<svg class="sources-icon" viewBox="0 0 16 16">
							<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
							<path d="M7 7h2v5H7zm0-4h2v2H7z"/>
						</svg>
						<span>Sources</span>
					</div>
					<div class="sources-list">
						${msg.sources.map(source => `
							<button class="source-link" onclick="navigateToSource('${messageId}', '${source.text}', '${source.section}')">
								<svg class="source-icon" viewBox="0 0 16 16">
									<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
									<path d="M7 7h2v5H7zm0-4h2v2H7z"/>
								</svg>
								${source.text}
							</button>
						`).join('')}
					</div>
				</div>
			` : '';
            // Generate actions HTML with modern styling
            const actionsHtml = msg.actions && msg.actions.length > 0 ? `
				<div class="message-actions">
					${msg.actions.map(action => `
						<button class="action-button" onclick="executeAction('${messageId}', '${action.id}', '${action.command}')" title="${action.label}">
							<span class="action-icon">${action.icon}</span>
							<span class="action-label">${action.label}</span>
						</button>
					`).join('')}
				</div>
			` : '';
            return `<div class="message ${isUser ? 'user-message' : 'ai-message'}" data-message-id="${messageId}">
				<div class="message-avatar">
					${isUser ? `
						<div class="user-avatar">
							<svg viewBox="0 0 24 24">
								<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
							</svg>
						</div>
					` : `
						<div class="ai-avatar">
							<svg viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
							</svg>
						</div>
					`}
				</div>
				<div class="message-content-wrapper">
					<div class="message-content">
						${text}
					</div>
					${sourcesHtml}
					${actionsHtml}
					<div class="message-meta">
						<span class="message-time">${time}</span>
						${!isUser ? `<span class="message-model">${msg.model || this._selectedModel}</span>` : ''}
					</div>
				</div>
			</div>`;
        }).join('');
        this._view.webview.html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					* {
						box-sizing: border-box;
						margin: 0;
						padding: 0;
					}

					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
						background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
						color: #e1e1e1;
						font-size: 14px;
						line-height: 1.6;
						height: 100vh;
						overflow: hidden;
						user-select: none;
						-webkit-font-smoothing: antialiased;
						-moz-osx-font-smoothing: grayscale;
					}

					.chat-container {
						display: flex;
						flex-direction: column;
						height: 100vh;
						max-height: 100vh;
						background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
					}

					.header {
						background: rgba(26, 26, 26, 0.95);
						backdrop-filter: blur(20px);
						border-bottom: 1px solid rgba(255, 255, 255, 0.1);
						padding: 16px 20px;
						display: flex;
						align-items: center;
						justify-content: space-between;
						flex-shrink: 0;
						position: relative;
					}

					.header::before {
						content: '';
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						height: 1px;
						background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
					}

					.header-left {
						display: flex;
						align-items: center;
						gap: 12px;
					}

					.header-icon {
						width: 32px;
						height: 32px;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						border-radius: 8px;
						display: flex;
						align-items: center;
						justify-content: center;
						color: white;
						font-size: 16px;
						font-weight: bold;
						box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
						position: relative;
						overflow: hidden;
					}

					.header-icon::before {
						content: '';
						position: absolute;
						top: 0;
						left: -100%;
						width: 100%;
						height: 100%;
						background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
						animation: shimmer 2s infinite;
					}

					@keyframes shimmer {
						0% { left: -100%; }
						100% { left: 100%; }
					}

					.header-title {
						font-weight: 600;
						font-size: 16px;
						color: #ffffff;
						letter-spacing: -0.02em;
					}

					.model-selector {
						display: flex;
						align-items: center;
						gap: 8px;
						background: rgba(255, 255, 255, 0.05);
						border: 1px solid rgba(255, 255, 255, 0.1);
						border-radius: 8px;
						padding: 6px 12px;
						backdrop-filter: blur(10px);
					}

					.model-label {
						font-size: 12px;
						color: rgba(255, 255, 255, 0.6);
						font-weight: 500;
					}

					.model-dropdown {
						background: transparent;
						border: none;
						color: #ffffff;
						font-size: 12px;
						font-weight: 500;
						cursor: pointer;
						transition: all 0.2s ease;
						min-width: 80px;
						outline: none;
					}

					.model-dropdown:hover {
						color: #667eea;
					}

					.messages-container {
						flex: 1;
						overflow-y: auto;
						padding: 24px 20px;
						display: flex;
						flex-direction: column;
						gap: 24px;
						background: transparent;
						scroll-behavior: smooth;
					}

					.messages-container::-webkit-scrollbar {
						width: 6px;
					}

					.messages-container::-webkit-scrollbar-track {
						background: transparent;
					}

					.messages-container::-webkit-scrollbar-thumb {
						background: rgba(255, 255, 255, 0.1);
						border-radius: 3px;
					}

					.messages-container::-webkit-scrollbar-thumb:hover {
						background: rgba(255, 255, 255, 0.2);
					}

					.message {
						display: flex;
						gap: 12px;
						max-width: 100%;
						animation: messageSlideIn 0.4s ease-out;
					}

					@keyframes messageSlideIn {
						from {
							opacity: 0;
							transform: translateY(20px);
						}
						to {
							opacity: 1;
							transform: translateY(0);
						}
					}

					.user-message {
						flex-direction: row-reverse;
					}

					.message-avatar {
						flex-shrink: 0;
						width: 36px;
						height: 36px;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						position: relative;
					}

					.user-avatar {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
					}

					.ai-avatar {
						background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
						box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
					}

					.message-avatar svg {
						width: 20px;
						height: 20px;
						fill: white;
					}

					.message-content-wrapper {
						flex: 1;
						max-width: calc(100% - 48px);
					}

					.message-content {
						padding: 16px 20px;
						border-radius: 18px;
						word-wrap: break-word;
						line-height: 1.6;
						font-size: 14px;
						position: relative;
						backdrop-filter: blur(10px);
						border: 1px solid rgba(255, 255, 255, 0.1);
						box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
					}

					.user-message .message-content {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: #ffffff;
						border-color: rgba(102, 126, 234, 0.3);
						box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
					}

					.ai-message .message-content {
						background: rgba(255, 255, 255, 0.05);
						color: #e1e1e1;
						border-color: rgba(255, 255, 255, 0.1);
					}

					.message-sources {
						margin-top: 12px;
						padding: 12px 16px;
						background: rgba(255, 255, 255, 0.03);
						border-radius: 12px;
						border: 1px solid rgba(255, 255, 255, 0.08);
						backdrop-filter: blur(10px);
					}

					.sources-header {
						display: flex;
						align-items: center;
						gap: 6px;
						margin-bottom: 8px;
						font-size: 12px;
						color: rgba(255, 255, 255, 0.6);
						font-weight: 500;
					}

					.sources-icon {
						width: 14px;
						height: 14px;
						fill: currentColor;
					}

					.sources-list {
						display: flex;
						flex-wrap: wrap;
						gap: 6px;
					}

					.source-link {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						border-radius: 6px;
						padding: 6px 10px;
						font-size: 11px;
						cursor: pointer;
						transition: all 0.2s ease;
						display: flex;
						align-items: center;
						gap: 4px;
						box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
					}

					.source-link:hover {
						transform: translateY(-1px);
						box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
					}

					.source-icon {
						width: 12px;
						height: 12px;
						fill: currentColor;
					}

					.message-actions {
						margin-top: 12px;
						display: flex;
						gap: 8px;
						flex-wrap: wrap;
					}

					.action-button {
						background: rgba(255, 255, 255, 0.08);
						color: #e1e1e1;
						border: 1px solid rgba(255, 255, 255, 0.1);
						border-radius: 8px;
						padding: 8px 12px;
						font-size: 12px;
						cursor: pointer;
						transition: all 0.2s ease;
						display: flex;
						align-items: center;
						gap: 6px;
						backdrop-filter: blur(10px);
					}

					.action-button:hover {
						background: rgba(255, 255, 255, 0.12);
						border-color: rgba(102, 126, 234, 0.3);
						transform: translateY(-1px);
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
					}

					.action-icon {
						font-size: 14px;
					}

					.action-label {
						font-weight: 500;
					}

					.message-meta {
						display: flex;
						align-items: center;
						gap: 8px;
						margin-top: 8px;
						font-size: 11px;
						color: rgba(255, 255, 255, 0.4);
						font-weight: 500;
					}

					.message-time {
						opacity: 0.8;
					}

					.message-model {
						background: rgba(102, 126, 234, 0.2);
						color: #667eea;
						padding: 2px 6px;
						border-radius: 4px;
						font-size: 10px;
						font-weight: 600;
					}

					.typing-indicator {
						display: none;
						align-items: center;
						gap: 8px;
						padding: 16px 20px;
						background: rgba(255, 255, 255, 0.05);
						border-radius: 18px;
						max-width: 85%;
						border: 1px solid rgba(255, 255, 255, 0.1);
						margin-top: 24px;
						backdrop-filter: blur(10px);
					}

					.typing-indicator.show {
						display: flex;
						animation: messageSlideIn 0.4s ease-out;
					}

					.typing-dot {
						width: 8px;
						height: 8px;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						border-radius: 50%;
						animation: typing 1.4s infinite ease-in-out;
					}

					.typing-dot:nth-child(1) { animation-delay: -0.32s; }
					.typing-dot:nth-child(2) { animation-delay: -0.16s; }

					@keyframes typing {
						0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
						40% { transform: scale(1); opacity: 1; }
					}

					.input-section {
						background: rgba(26, 26, 26, 0.95);
						backdrop-filter: blur(20px);
						border-top: 1px solid rgba(255, 255, 255, 0.1);
						padding: 20px;
						flex-shrink: 0;
						position: relative;
					}

					.input-section::before {
						content: '';
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						height: 1px;
						background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
					}

					.input-container {
						position: relative;
						background: rgba(255, 255, 255, 0.05);
						border: 1px solid rgba(255, 255, 255, 0.1);
						border-radius: 16px;
						padding: 12px 16px;
						display: flex;
						align-items: flex-end;
						gap: 12px;
						min-height: 52px;
						transition: all 0.3s ease;
						backdrop-filter: blur(10px);
					}

					.input-container:focus-within {
						border-color: rgba(102, 126, 234, 0.5);
						box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
						background: rgba(255, 255, 255, 0.08);
					}

					.input-left-controls {
						display: flex;
						align-items: center;
						gap: 6px;
						flex-shrink: 0;
						margin-bottom: 2px;
					}

					.control-button {
						background: transparent;
						border: none;
						color: rgba(255, 255, 255, 0.6);
						padding: 8px;
						border-radius: 8px;
						cursor: pointer;
						transition: all 0.2s ease;
						font-size: 16px;
						display: flex;
						align-items: center;
						justify-content: center;
					}

					.control-button:hover {
						background: rgba(255, 255, 255, 0.1);
						color: rgba(255, 255, 255, 0.9);
						transform: translateY(-1px);
					}

					.control-button svg {
						width: 18px;
						height: 18px;
						fill: currentColor;
					}

					.input-field {
						flex: 1;
						background: transparent;
						border: none;
						color: #e1e1e1;
						font-size: 14px;
						line-height: 1.5;
						resize: none;
						outline: none;
						font-family: inherit;
						min-height: 24px;
						max-height: 120px;
						overflow-y: auto;
					}

					.input-field::placeholder {
						color: rgba(255, 255, 255, 0.4);
					}

					.input-field::-webkit-scrollbar {
						width: 4px;
					}

					.input-field::-webkit-scrollbar-track {
						background: transparent;
					}

					.input-field::-webkit-scrollbar-thumb {
						background: rgba(255, 255, 255, 0.1);
						border-radius: 2px;
					}

					.input-right-controls {
						display: flex;
						align-items: center;
						gap: 8px;
						flex-shrink: 0;
					}

					.send-button {
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						border-radius: 12px;
						width: 40px;
						height: 40px;
						cursor: pointer;
						transition: all 0.2s ease;
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
					}

					.send-button:hover {
						transform: translateY(-2px);
						box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
					}

					.send-button:active {
						transform: translateY(0);
					}

					.send-button svg {
						width: 20px;
						height: 20px;
						fill: currentColor;
					}

					.bottom-controls {
						display: flex;
						align-items: center;
						justify-content: space-between;
						margin-top: 12px;
						padding: 0 4px;
					}

					.left-controls, .right-controls {
						display: flex;
						align-items: center;
						gap: 8px;
					}

					.control-text {
						background: transparent;
						border: none;
						color: rgba(255, 255, 255, 0.5);
						font-size: 11px;
						cursor: pointer;
						transition: all 0.2s ease;
						padding: 4px 8px;
						border-radius: 6px;
					}

					.control-text:hover {
						color: rgba(255, 255, 255, 0.8);
						background: rgba(255, 255, 255, 0.05);
					}

					.auto-pill {
						background: rgba(102, 126, 234, 0.2);
						color: #667eea;
						font-weight: 500;
					}

					.new-chat-text {
						color: rgba(255, 255, 255, 0.4);
						font-size: 11px;
					}

					/* Professional text formatting */
					.message-content h1, .message-content h2, .message-content h3 {
						margin: 0 0 16px 0;
						font-weight: 600;
						color: inherit;
						letter-spacing: -0.02em;
					}

					.message-content h1 {
						font-size: 20px;
						border-bottom: 1px solid rgba(255, 255, 255, 0.1);
						padding-bottom: 12px;
					}

					.message-content h2 {
						font-size: 18px;
						margin-top: 20px;
					}

					.message-content h3 {
						font-size: 16px;
						margin-top: 16px;
					}

					.message-content p {
						margin: 0 0 16px 0;
						line-height: 1.7;
					}

					.message-content p:last-child {
						margin-bottom: 0;
					}

					.message-content ul, .message-content ol {
						margin: 12px 0 16px 24px;
						padding-left: 0;
					}

					.message-content li {
						margin: 6px 0;
						line-height: 1.6;
					}

					.message-content strong {
						font-weight: 600;
						color: #ffffff;
					}

					.message-content em {
						font-style: italic;
						opacity: 0.9;
					}

					.message-content code {
						background: rgba(0, 0, 0, 0.3);
						padding: 3px 8px;
						border-radius: 6px;
						font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
						font-size: 12px;
						color: #e1e1e1;
						border: 1px solid rgba(255, 255, 255, 0.1);
					}

					.message-content pre {
						background: rgba(0, 0, 0, 0.3);
						padding: 16px;
						border-radius: 12px;
						overflow-x: auto;
						margin: 16px 0;
						border: 1px solid rgba(255, 255, 255, 0.1);
						backdrop-filter: blur(10px);
					}

					.message-content pre code {
						background: none;
						padding: 0;
						border: none;
						font-size: 12px;
					}

					.message-content blockquote {
						border-left: 3px solid #667eea;
						padding-left: 16px;
						margin: 16px 0;
						opacity: 0.9;
						font-style: italic;
						background: rgba(102, 126, 234, 0.05);
						padding: 12px 16px;
						border-radius: 8px;
					}

					.message-content .emoji {
						font-size: 18px;
						margin: 0 2px;
					}

					.message-content .highlight {
						background: rgba(102, 126, 234, 0.2);
						padding: 2px 6px;
						border-radius: 4px;
						color: #667eea;
						font-weight: 500;
					}

					/* Responsive design */
					@media (max-width: 768px) {
						.header {
							padding: 12px 16px;
						}

						.messages-container {
							padding: 16px;
							gap: 16px;
						}

						.input-section {
							padding: 16px;
						}

						.message-content {
							padding: 12px 16px;
							font-size: 13px;
						}
					}
				</style>
			</head>
			<body>
				<div class="chat-container">
					<div class="header">
						<div class="header-left">
							<div class="header-icon">V</div>
							<div class="header-title">Valinor Studio AI</div>
						</div>
						<div class="model-selector">
							<span class="model-label">Model:</span>
							<select class="model-dropdown" id="modelDropdown" onchange="changeModel()">
								<option value="GPT-4" ${this._selectedModel === 'GPT-4' ? 'selected' : ''}>GPT-4</option>
								<option value="GPT-3.5" ${this._selectedModel === 'GPT-3.5' ? 'selected' : ''}>GPT-3.5</option>
								<option value="Claude-3" ${this._selectedModel === 'Claude-3' ? 'selected' : ''}>Claude-3</option>
								<option value="Claude-2" ${this._selectedModel === 'Claude-2' ? 'selected' : ''}>Claude-2</option>
								<option value="Gemini-Pro" ${this._selectedModel === 'Gemini-Pro' ? 'selected' : ''}>Gemini-Pro</option>
							</select>
						</div>
					</div>

					<div class="messages-container" id="messages">
						${chatHtml}
						<div class="typing-indicator" id="typingIndicator">
							<div class="typing-dot"></div>
							<div class="typing-dot"></div>
							<div class="typing-dot"></div>
						</div>
					</div>

					<div class="input-section">
						<div class="input-container">
							<div class="input-left-controls">
								<button class="control-button" onclick="showAutoFixes()" title="Auto-fixes">
									<svg viewBox="0 0 24 24">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
									</svg>
								</button>
								<button class="control-button" onclick="showInChatCreations()" title="In-chat creations">
									<svg viewBox="0 0 24 24">
										<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
									</svg>
								</button>
								<button class="control-button" onclick="addContext()" title="Add context">
									<svg viewBox="0 0 24 24">
										<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
									</svg>
								</button>
								<button class="control-button" onclick="addImage()" title="Add image">
									<svg viewBox="0 0 24 24">
										<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
									</svg>
								</button>
							</div>

							<textarea
								class="input-field"
								id="messageInput"
								placeholder="Ask about evaluation criteria, summarize background, generate content..."
								rows="1"
								onkeydown="handleKeyDown(event)"
								oninput="autoResize()"
							></textarea>

							<div class="input-right-controls">
								<button class="send-button" onclick="sendMessage()" id="sendButton" title="Send message">
									<svg viewBox="0 0 24 24">
										<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
									</svg>
								</button>
							</div>
						</div>

						<div class="bottom-controls">
							<div class="left-controls">
								<button class="control-text">∞ Agent x1</button>
								<button class="control-text auto-pill">Auto</button>
							</div>
							<div class="right-controls">
								<span class="new-chat-text">Start a new chat for better results.</span>
								<button class="control-text" onclick="newChat()">New Chat</button>
							</div>
						</div>
					</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					const textarea = document.getElementById('messageInput');
					const sendButton = document.getElementById('sendButton');
					const messagesContainer = document.getElementById('messages');
					const modelDropdown = document.getElementById('modelDropdown');
					const typingIndicator = document.getElementById('typingIndicator');

					function autoResize() {
						textarea.style.height = 'auto';
						textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
					}

					function handleKeyDown(event) {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							sendMessage();
						}
					}

					function sendMessage() {
						const message = textarea.value.trim();
						if (message) {
							vscode.postMessage({
								command: 'sendMessage',
								text: message
							});
							textarea.value = '';
							autoResize();
							textarea.focus();
						}
					}

					function newChat() {
						vscode.postMessage({
							command: 'newChat'
						});
					}

					function addContext() {
						vscode.postMessage({
							command: 'addContext'
						});
					}

					function addImage() {
						// TODO: Implement image upload
						console.log('Add image functionality');
					}

					function showAutoFixes() {
						vscode.postMessage({
							command: 'showAutoFixes'
						});
					}

					function showInChatCreations() {
						vscode.postMessage({
							command: 'showInChatCreations'
						});
					}

					function changeModel() {
						const selectedModel = modelDropdown.value;
						vscode.postMessage({
							command: 'changeModel',
							model: selectedModel
						});
					}

					function navigateToSource(messageId, sourceText, sourceSection) {
						vscode.postMessage({
							command: 'navigateToSource',
							source: {
								text: sourceText,
								section: sourceSection
							}
						});
					}

					function executeAction(messageId, actionId, command) {
						vscode.postMessage({
							command: command,
							messageId: messageId
						});
					}

					// Handle messages from extension
					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'showTyping':
								typingIndicator.classList.add('show');
								scrollToBottom();
								break;
							case 'hideTyping':
								typingIndicator.classList.remove('show');
								break;
						}
					});

					// Auto-focus the input
					setTimeout(() => {
						textarea.focus();
					}, 100);

					// Scroll to bottom when new messages are added
					function scrollToBottom() {
						messagesContainer.scrollTop = messagesContainer.scrollHeight;
					}

					// Observe changes to messages container
					const observer = new MutationObserver(scrollToBottom);
					observer.observe(messagesContainer, { childList: true, subtree: true });
				</script>
			</body>
			</html>
		`;
    }
    // Professional text formatting function
    formatMessageText(text) {
        // Convert markdown-style formatting to HTML
        let formattedText = text
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Emojis
            .replace(/(🔍|📊|📋|💡|✅|❌|⚠️|🚀|🏛️|📅|⏰)/g, '<span class="emoji">$1</span>')
            // Highlight important terms
            .replace(/\b(Notice ID|Contract|Requirements|Analysis|Deadline)\b/gi, '<span class="highlight">$1</span>');
        // Wrap in paragraphs if not already wrapped
        if (!formattedText.includes('<h1>') && !formattedText.includes('<h2>') && !formattedText.includes('<h3>') && !formattedText.includes('<pre>')) {
            formattedText = `<p>${formattedText}</p>`;
        }
        // Wrap lists properly
        formattedText = formattedText.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
        return formattedText;
    }
}
exports.ValinorChatViewProvider = ValinorChatViewProvider;
ValinorChatViewProvider.viewType = 'valinorStudio.chat';
//# sourceMappingURL=chat-ui.js.map