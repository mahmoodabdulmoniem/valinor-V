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
exports.ChatSync = void 0;
const vscode = __importStar(require("vscode"));
class ChatSync {
    constructor(chatProvider) {
        this._disposables = [];
        this._currentSection = '';
        this._currentContext = '';
        this._chatProvider = chatProvider;
        this.initializeChatSync();
    }
    initializeChatSync() {
        // Track cursor position changes
        this._disposables.push(vscode.window.onDidChangeTextEditorSelection((event) => {
            this.onCursorPositionChanged(event);
        }));
        // Track active editor changes
        this._disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.onActiveEditorChanged(editor);
            }
        }));
        // Track document changes
        this._disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            this.onDocumentChanged(event);
        }));
    }
    onCursorPositionChanged(event) {
        const editor = event.textEditor;
        const position = event.selections[0]?.active;
        if (!position) {
            return;
        }
        const document = editor.document;
        const line = document.lineAt(position.line);
        const lineText = line.text;
        // Detect current section (markdown heading)
        const currentSection = this.detectCurrentSection(document, position.line);
        if (currentSection !== this._currentSection) {
            this._currentSection = currentSection;
            this.updateChatContext();
        }
        // Detect current context (selected text, word under cursor, etc.)
        const currentContext = this.detectCurrentContext(editor, position);
        if (currentContext !== this._currentContext) {
            this._currentContext = currentContext;
            this.updateChatContext();
        }
    }
    onActiveEditorChanged(editor) {
        const document = editor.document;
        // Reset context when switching editors
        this._currentSection = '';
        this._currentContext = '';
        // Update context for new editor
        const position = editor.selection.active;
        this._currentSection = this.detectCurrentSection(document, position.line);
        this._currentContext = this.detectCurrentContext(editor, position);
        this.updateChatContext();
    }
    onDocumentChanged(event) {
        // Update context when document content changes
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
            const position = editor.selection.active;
            this._currentSection = this.detectCurrentSection(event.document, position.line);
            this._currentContext = this.detectCurrentContext(editor, position);
            this.updateChatContext();
        }
    }
    detectCurrentSection(document, lineNumber) {
        // Look for the most recent heading above the current line
        for (let i = lineNumber; i >= 0; i--) {
            const line = document.lineAt(i);
            const text = line.text.trim();
            // Match markdown headings
            const headingMatch = text.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                return headingMatch[2].trim();
            }
        }
        return '';
    }
    detectCurrentContext(editor, position) {
        const document = editor.document;
        const selection = editor.selection;
        // If there's selected text, use that as context
        if (!selection.isEmpty) {
            const selectedText = document.getText(selection);
            return selectedText.trim();
        }
        // Otherwise, get the word under cursor
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange) {
            const word = document.getText(wordRange);
            return word;
        }
        // Or get the current line
        const line = document.lineAt(position.line);
        return line.text.trim();
    }
    updateChatContext() {
        // Update chat provider with current context
        if (this._chatProvider && this._chatProvider.updateContext) {
            const context = {
                section: this._currentSection,
                context: this._currentContext,
                timestamp: new Date().toISOString()
            };
            this._chatProvider.updateContext(context);
        }
    }
    getCurrentSection() {
        return this._currentSection;
    }
    getCurrentContext() {
        return this._currentContext;
    }
    async askAboutCurrentSection() {
        if (!this._currentSection) {
            vscode.window.showWarningMessage('No section detected. Please place your cursor within a section.');
            return;
        }
        const question = await vscode.window.showInputBox({
            prompt: `Ask about "${this._currentSection}"`,
            placeHolder: 'What would you like to know about this section?'
        });
        if (question) {
            // Send question to chat with context
            const contextualQuestion = `About the section "${this._currentSection}": ${question}`;
            if (this._chatProvider && this._chatProvider.addMessage) {
                this._chatProvider.addMessage('user', contextualQuestion);
                // The chat provider should handle the AI response
            }
        }
    }
    async askAboutSelectedText() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('Please select some text to ask about');
            return;
        }
        const selectedText = editor.document.getText(selection).trim();
        if (!selectedText) {
            vscode.window.showWarningMessage('No text selected');
            return;
        }
        const question = await vscode.window.showInputBox({
            prompt: 'Ask about the selected text',
            placeHolder: 'What would you like to know about this content?'
        });
        if (question) {
            const contextualQuestion = `About this text: "${selectedText}"\n\nQuestion: ${question}`;
            if (this._chatProvider && this._chatProvider.addMessage) {
                this._chatProvider.addMessage('user', contextualQuestion);
                // The chat provider should handle the AI response
            }
        }
    }
    async suggestImprovements() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        const document = editor.document;
        const selection = editor.selection;
        let content = '';
        if (!selection.isEmpty) {
            content = document.getText(selection);
        }
        else {
            // Get current paragraph or section
            const position = editor.selection.active;
            const line = document.lineAt(position.line);
            content = line.text;
        }
        if (!content.trim()) {
            vscode.window.showWarningMessage('No content to improve');
            return;
        }
        const improvementRequest = `Please suggest improvements for this content:\n\n${content}`;
        if (this._chatProvider && this._chatProvider.addMessage) {
            this._chatProvider.addMessage('user', improvementRequest);
            // The chat provider should handle the AI response
        }
    }
    async checkCompliance() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        const document = editor.document;
        const selection = editor.selection;
        let content = '';
        if (!selection.isEmpty) {
            content = document.getText(selection);
        }
        else {
            // Get current section
            const position = editor.selection.active;
            content = this.getSectionContent(document, position.line);
        }
        if (!content.trim()) {
            vscode.window.showWarningMessage('No content to check');
            return;
        }
        const complianceRequest = `Please check this content for compliance with government proposal requirements:\n\n${content}`;
        if (this._chatProvider && this._chatProvider.addMessage) {
            this._chatProvider.addMessage('user', complianceRequest);
            // The chat provider should handle the AI response
        }
    }
    getSectionContent(document, lineNumber) {
        const lines = [];
        let currentLine = lineNumber;
        // Get content from current line to next heading or end of document
        while (currentLine < document.lineCount) {
            const line = document.lineAt(currentLine);
            const text = line.text.trim();
            // Stop at next heading
            if (text.match(/^(#{1,6})\s+(.+)$/)) {
                break;
            }
            lines.push(line.text);
            currentLine++;
        }
        return lines.join('\n');
    }
    getContextSummary() {
        const parts = [];
        if (this._currentSection) {
            parts.push(`Section: ${this._currentSection}`);
        }
        if (this._currentContext) {
            parts.push(`Context: ${this._currentContext.substring(0, 100)}${this._currentContext.length > 100 ? '...' : ''}`);
        }
        return parts.join(' | ');
    }
    dispose() {
        this._disposables.forEach(disposable => disposable.dispose());
    }
}
exports.ChatSync = ChatSync;
//# sourceMappingURL=chat-sync.js.map