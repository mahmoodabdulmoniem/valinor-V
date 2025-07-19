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
exports.SectionGenerator = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ai_analyzer_1 = require("./ai-analyzer");
class SectionGenerator {
    constructor(chatProvider) {
        this.suggestionHistory = null;
        this.activeDiffSessions = new Map();
        this.chatProvider = chatProvider;
    }
    setSuggestionHistory(history) {
        this.suggestionHistory = history;
    }
    registerCommands(context) {
        // Register the main section generation command
        const generateCommand = vscode.commands.registerCommand('valinorStudio.generateSection', (sectionName, document, position) => {
            this.generateSection(sectionName, document, position);
        });
        // Register accept/reject commands for diff editor
        const acceptCommand = vscode.commands.registerCommand('valinorStudio.acceptSectionChanges', (sessionId) => {
            this.acceptSectionChanges(sessionId);
        });
        const rejectCommand = vscode.commands.registerCommand('valinorStudio.rejectSectionChanges', (sessionId) => {
            this.rejectSectionChanges(sessionId);
        });
        // Register context menu provider
        this.registerContextMenuProvider(context);
        context.subscriptions.push(generateCommand, acceptCommand, rejectCommand);
    }
    async generateSection(sectionName, document, position) {
        try {
            // Get section information
            const sectionInfo = this.getSectionInfo(document, position);
            if (!sectionInfo) {
                vscode.window.showErrorMessage('Could not find section information. Please ensure your cursor is on a section header.');
                return;
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating content for "${sectionName}"...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                // Select AI model
                const models = ['GPT-4', 'Claude-3', 'Gemini-Pro'];
                const selectedModel = await vscode.window.showQuickPick(models, {
                    placeHolder: 'Select AI model for content generation'
                });
                if (!selectedModel) {
                    return;
                }
                progress.report({ increment: 50 });
                // Create prompt and generate content
                const prompt = this.createSectionPrompt(sectionName, sectionInfo);
                const generatedContent = await this.generateAIContent(prompt, selectedModel);
                progress.report({ increment: 100 });
                // Show diff view with accept/reject workflow
                await this.showDiffWithAcceptReject(sectionName, sectionInfo.content, generatedContent, document, position, selectedModel);
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to generate section: ${errorMessage}`);
        }
    }
    // Get section information from the document
    getSectionInfo(document, position) {
        const lines = document.getText().split('\n');
        let sectionStart = -1;
        let sectionEnd = -1;
        let sectionLevel = 0;
        let sectionName = '';
        // Look for the section header
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch && i === position.line) {
                sectionLevel = headerMatch[1].length;
                sectionName = headerMatch[2].trim();
                sectionStart = i;
                break;
            }
        }
        if (sectionStart === -1) {
            return null;
        }
        // Find the end of the section (next header of same or higher level)
        for (let i = sectionStart + 1; i < lines.length; i++) {
            const line = lines[i];
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                if (level <= sectionLevel) {
                    sectionEnd = i - 1;
                    break;
                }
            }
        }
        if (sectionEnd === -1) {
            sectionEnd = lines.length - 1;
        }
        // Extract section content
        const content = lines.slice(sectionStart, sectionEnd + 1).join('\n');
        return {
            name: sectionName,
            content: content,
            startLine: sectionStart,
            endLine: sectionEnd,
            level: sectionLevel
        };
    }
    // Create prompt for section generation
    createSectionPrompt(sectionName, sectionInfo) {
        return `Please generate comprehensive content for the "${sectionName}" section of a government contract proposal.

Current section content:
${sectionInfo.content}

Please provide detailed, professional content that:
1. Expands on the section topic with relevant information
2. Uses clear, professional language suitable for government proposals
3. Includes specific details, examples, and actionable content
4. Maintains proper markdown formatting
5. Is comprehensive but concise

Focus on making this section compelling and informative for government contract evaluators.`;
    }
    // Generate AI content for the section
    async generateAIContent(prompt, model) {
        // Create a mock output channel for the AI analyzer
        const output = {
            appendLine: (text) => {
                // Silent output for section generation
            }
        };
        // Create mock contract data for context
        const mockContractData = {
            title: 'Government Contract Proposal',
            noticeId: 'SECTION_GENERATION',
            description: 'Section generation for proposal enhancement'
        };
        // Use the AI analyzer to generate content
        let generatedContent = '';
        // Override the addMessage method temporarily to capture the response
        const originalAddMessage = this.chatProvider.addMessage.bind(this.chatProvider);
        this.chatProvider.addMessage = (type, content, model) => {
            if (type === 'ai') {
                generatedContent = content;
            }
        };
        try {
            await (0, ai_analyzer_1.analyzeContractWithAI)(mockContractData, output, this.chatProvider, model);
        }
        finally {
            // Restore the original method
            this.chatProvider.addMessage = originalAddMessage;
        }
        return generatedContent || 'Content generation failed. Please try again.';
    }
    // Show diff view with accept/reject workflow
    async showDiffWithAcceptReject(sectionName, originalContent, generatedContent, document, position, model) {
        try {
            // Create session ID
            const sessionId = `${sectionName}-${Date.now()}`;
            // Create temporary files for diff
            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const originalUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, `.${sessionId}-original.md`));
            const generatedUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, `.${sessionId}-generated.md`));
            // Write content to temporary files
            await vscode.workspace.fs.writeFile(originalUri, Buffer.from(originalContent, 'utf8'));
            await vscode.workspace.fs.writeFile(generatedUri, Buffer.from(generatedContent, 'utf8'));
            // Store session information
            const session = {
                originalUri,
                generatedUri,
                originalContent,
                generatedContent,
                sectionName,
                document,
                position,
                model
            };
            this.activeDiffSessions.set(sessionId, session);
            // Open diff view with custom title and accept/reject buttons
            const diffEditor = await vscode.commands.executeCommand('vscode.diff', originalUri, generatedUri, `${sectionName} - Review Changes`, {
                preview: true,
                viewColumn: vscode.ViewColumn.Active
            });
            // Add accept/reject buttons to the diff editor toolbar
            await this.addAcceptRejectButtons(sessionId, diffEditor);
            // Clean up temporary files after a delay if not accepted/rejected
            setTimeout(async () => {
                if (this.activeDiffSessions.has(sessionId)) {
                    try {
                        await vscode.workspace.fs.delete(originalUri);
                        await vscode.workspace.fs.delete(generatedUri);
                        this.activeDiffSessions.delete(sessionId);
                    }
                    catch (error) {
                        // Ignore cleanup errors
                    }
                }
            }, 300000); // Clean up after 5 minutes
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to show diff: ${errorMessage}`);
        }
    }
    // Add accept/reject buttons to diff editor
    async addAcceptRejectButtons(sessionId, editor) {
        // Create status bar items for accept/reject actions
        const acceptItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        acceptItem.text = "$(check) Accept";
        acceptItem.tooltip = "Accept the generated changes";
        acceptItem.command = {
            command: 'valinorStudio.acceptSectionChanges',
            title: 'Accept Changes',
            arguments: [sessionId]
        };
        acceptItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        acceptItem.show();
        const rejectItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        rejectItem.text = "$(x) Reject";
        rejectItem.tooltip = "Reject the generated changes";
        rejectItem.command = {
            command: 'valinorStudio.rejectSectionChanges',
            title: 'Reject Changes',
            arguments: [sessionId]
        };
        rejectItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        rejectItem.show();
        // Store status bar items for cleanup
        const session = this.activeDiffSessions.get(sessionId);
        if (session) {
            session.statusBarItems = [acceptItem, rejectItem];
        }
    }
    // Accept section changes
    async acceptSectionChanges(sessionId) {
        const session = this.activeDiffSessions.get(sessionId);
        if (!session) {
            vscode.window.showErrorMessage('Session not found. The diff may have expired.');
            return;
        }
        try {
            // Confirm acceptance
            const result = await vscode.window.showInformationMessage(`Accept the generated changes for "${session.sectionName}"?`, { modal: true }, 'Accept', 'Cancel');
            if (result !== 'Accept') {
                return;
            }
            // Apply changes to the original document
            const edit = new vscode.WorkspaceEdit();
            const range = new vscode.Range(new vscode.Position(session.position.line, 0), new vscode.Position(session.position.line + 1, 0));
            // Replace the section content
            edit.replace(session.document.uri, range, session.generatedContent);
            await vscode.workspace.applyEdit(edit);
            // Add to suggestion history
            if (this.suggestionHistory) {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                const filePath = workspaceFolder ? path.relative(workspaceFolder.uri.fsPath, session.document.uri.fsPath) : session.document.fileName;
                await this.suggestionHistory.addSuggestion({
                    section: session.sectionName,
                    model: session.model,
                    originalContent: session.originalContent,
                    suggestedContent: session.generatedContent,
                    filePath: filePath
                });
            }
            // Show success message
            vscode.window.showInformationMessage(`✅ Changes accepted for "${session.sectionName}"`);
            // Clean up
            await this.cleanupSession(sessionId);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to accept changes: ${errorMessage}`);
        }
    }
    // Reject section changes
    async rejectSectionChanges(sessionId) {
        const session = this.activeDiffSessions.get(sessionId);
        if (!session) {
            vscode.window.showErrorMessage('Session not found. The diff may have expired.');
            return;
        }
        try {
            // Confirm rejection
            const result = await vscode.window.showInformationMessage(`Reject the generated changes for "${session.sectionName}"?`, { modal: true }, 'Reject', 'Cancel');
            if (result !== 'Reject') {
                return;
            }
            // Show rejection message
            vscode.window.showInformationMessage(`❌ Changes rejected for "${session.sectionName}"`);
            // Clean up
            await this.cleanupSession(sessionId);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to reject changes: ${errorMessage}`);
        }
    }
    // Clean up session resources
    async cleanupSession(sessionId) {
        const session = this.activeDiffSessions.get(sessionId);
        if (!session) {
            return;
        }
        try {
            // Hide status bar items
            if (session.statusBarItems) {
                session.statusBarItems.forEach((item) => {
                    item.hide();
                    item.dispose();
                });
            }
            // Delete temporary files
            await vscode.workspace.fs.delete(session.originalUri);
            await vscode.workspace.fs.delete(session.generatedUri);
            // Remove from active sessions
            this.activeDiffSessions.delete(sessionId);
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
    // Register context menu provider for section headers
    registerContextMenuProvider(context) {
        const provider = vscode.languages.registerCodeActionsProvider({ pattern: '**/proposal.md' }, new SectionCodeActionProvider(this), {
            providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
        });
        context.subscriptions.push(provider);
    }
}
exports.SectionGenerator = SectionGenerator;
// Code action provider for section generation
class SectionCodeActionProvider {
    constructor(sectionGenerator) {
        this.sectionGenerator = sectionGenerator;
    }
    provideCodeActions(document, range, context, token) {
        const actions = [];
        // Check if the cursor is on a section header
        const line = document.lineAt(range.start.line);
        const headerMatch = line.text.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const sectionName = headerMatch[2].trim();
            const level = headerMatch[1].length;
            // Only show for level 2 headers (##) and above
            if (level >= 2) {
                const generateAction = new vscode.CodeAction(`Generate ${sectionName} Content`, vscode.CodeActionKind.Refactor);
                generateAction.command = {
                    command: 'valinorStudio.generateSection',
                    title: `Generate ${sectionName} Content`,
                    arguments: [sectionName, document, range.start]
                };
                generateAction.isPreferred = true;
                actions.push(generateAction);
            }
        }
        return actions;
    }
}
//# sourceMappingURL=section-generator.js.map