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
exports.CollaborationManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class CollaborationManager {
    constructor(output) {
        this._comments = new Map();
        this._sessions = new Map();
        this._participants = new Map();
        this._decorations = new Map();
        this._activeSession = null;
        this._output = output;
        this._currentUser = this.initializeCurrentUser();
        this.initializeDecorations();
    }
    initializeCurrentUser() {
        return {
            id: this.generateUserId(),
            name: process.env.USER || 'Anonymous User',
            email: process.env.EMAIL || 'user@example.com',
            status: 'online',
            lastSeen: new Date()
        };
    }
    initializeDecorations() {
        // Comment decoration
        this._decorations.set('comment', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getCommentIcon(),
            gutterIconSize: 'contain',
            after: {
                contentText: ' 💬',
                color: new vscode.ThemeColor('editorInfo.foreground'),
                margin: '0 0 0 1em'
            }
        }));
        // Resolved comment decoration
        this._decorations.set('resolved', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getResolvedIcon(),
            gutterIconSize: 'contain',
            after: {
                contentText: ' ✅',
                color: new vscode.ThemeColor('editorInfo.foreground'),
                margin: '0 0 0 1em'
            }
        }));
        // Warning comment decoration
        this._decorations.set('warning', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getWarningIcon(),
            gutterIconSize: 'contain',
            after: {
                contentText: ' ⚠️',
                color: new vscode.ThemeColor('editorWarning.foreground'),
                margin: '0 0 0 1em'
            }
        }));
        // Error comment decoration
        this._decorations.set('error', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getErrorIcon(),
            gutterIconSize: 'contain',
            after: {
                contentText: ' ❌',
                color: new vscode.ThemeColor('editorError.foreground'),
                margin: '0 0 0 1em'
            }
        }));
    }
    getCommentIcon() {
        // Create a simple SVG icon for comments
        const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="7" fill="#007acc" stroke="none"/>
			<path d="M4 6h8M4 8h6M4 10h4" stroke="white" stroke-width="1.5" fill="none"/>
		</svg>`;
        const iconPath = path.join(__dirname, 'comment-icon.svg');
        fs.writeFileSync(iconPath, svg);
        return vscode.Uri.file(iconPath);
    }
    getResolvedIcon() {
        const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="7" fill="#28a745" stroke="none"/>
			<path d="M5 8l2 2 4-4" stroke="white" stroke-width="1.5" fill="none"/>
		</svg>`;
        const iconPath = path.join(__dirname, 'resolved-icon.svg');
        fs.writeFileSync(iconPath, svg);
        return vscode.Uri.file(iconPath);
    }
    getWarningIcon() {
        const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<path d="M8 1L15 14H1L8 1Z" fill="#ffc107" stroke="none"/>
			<path d="M8 6v4M8 12h0" stroke="#000" stroke-width="1" fill="none"/>
		</svg>`;
        const iconPath = path.join(__dirname, 'warning-icon.svg');
        fs.writeFileSync(iconPath, svg);
        return vscode.Uri.file(iconPath);
    }
    getErrorIcon() {
        const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="7" fill="#dc3545" stroke="none"/>
			<path d="M5 5l6 6M11 5l-6 6" stroke="white" stroke-width="1.5" fill="none"/>
		</svg>`;
        const iconPath = path.join(__dirname, 'error-icon.svg');
        fs.writeFileSync(iconPath, svg);
        return vscode.Uri.file(iconPath);
    }
    // Add comment to current selection
    async addComment(editor, content, severity = 'info') {
        const selection = editor.selection;
        const filePath = editor.document.uri.fsPath;
        const comment = {
            id: this.generateCommentId(),
            author: this._currentUser.name,
            authorId: this._currentUser.id,
            timestamp: new Date(),
            content,
            range: selection,
            filePath,
            threadId: this.generateThreadId(),
            replies: [],
            resolved: false,
            severity
        };
        // Store comment
        if (!this._comments.has(filePath)) {
            this._comments.set(filePath, []);
        }
        this._comments.get(filePath).push(comment);
        // Update decorations
        await this.updateDecorations(editor);
        // Save to file
        await this.saveCommentsToFile(filePath);
        this._output.appendLine(`💬 Comment added by ${this._currentUser.name}: ${content.substring(0, 50)}...`);
        return comment;
    }
    // Reply to a comment
    async replyToComment(commentId, content) {
        const reply = {
            id: this.generateReplyId(),
            author: this._currentUser.name,
            authorId: this._currentUser.id,
            timestamp: new Date(),
            content
        };
        // Find and update the comment
        for (const [filePath, comments] of this._comments) {
            const comment = comments.find(c => c.id === commentId);
            if (comment) {
                comment.replies.push(reply);
                await this.saveCommentsToFile(filePath);
                await this.updateDecorationsForFile(filePath);
                break;
            }
        }
        this._output.appendLine(`💬 Reply added by ${this._currentUser.name}: ${content.substring(0, 50)}...`);
        return reply;
    }
    // Resolve a comment
    async resolveComment(commentId) {
        for (const [filePath, comments] of this._comments) {
            const comment = comments.find(c => c.id === commentId);
            if (comment) {
                comment.resolved = true;
                await this.saveCommentsToFile(filePath);
                await this.updateDecorationsForFile(filePath);
                this._output.appendLine(`✅ Comment resolved by ${this._currentUser.name}`);
                break;
            }
        }
    }
    // Get comments for a file
    getCommentsForFile(filePath) {
        return this._comments.get(filePath) || [];
    }
    // Get comment by ID
    getCommentById(commentId) {
        for (const comments of this._comments.values()) {
            const comment = comments.find(c => c.id === commentId);
            if (comment)
                return comment;
        }
        return undefined;
    }
    // Update decorations for an editor
    async updateDecorations(editor) {
        const filePath = editor.document.uri.fsPath;
        const comments = this.getCommentsForFile(filePath);
        // Clear existing decorations
        for (const decorationType of this._decorations.values()) {
            editor.setDecorations(decorationType, []);
        }
        // Apply new decorations
        for (const comment of comments) {
            const decorationType = this._decorations.get(comment.resolved ? 'resolved' : comment.severity) || this._decorations.get('comment');
            editor.setDecorations(decorationType, [comment.range]);
        }
    }
    // Update decorations for a specific file
    async updateDecorationsForFile(filePath) {
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.fsPath === filePath);
        if (editor) {
            await this.updateDecorations(editor);
        }
    }
    // Load comments from file
    async loadCommentsFromFile(filePath) {
        const commentsFilePath = this.getCommentsFilePath(filePath);
        try {
            if (fs.existsSync(commentsFilePath)) {
                const data = fs.readFileSync(commentsFilePath, 'utf8');
                const comments = JSON.parse(data, (key, value) => {
                    if (key === 'timestamp' || key === 'lastSeen') {
                        return new Date(value);
                    }
                    return value;
                });
                this._comments.set(filePath, comments);
            }
        }
        catch (error) {
            this._output.appendLine(`❌ Error loading comments: ${error}`);
        }
    }
    // Save comments to file
    async saveCommentsToFile(filePath) {
        const comments = this.getCommentsForFile(filePath);
        const commentsFilePath = this.getCommentsFilePath(filePath);
        try {
            // Ensure directory exists
            const dir = path.dirname(commentsFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(commentsFilePath, JSON.stringify(comments, null, 2));
        }
        catch (error) {
            this._output.appendLine(`❌ Error saving comments: ${error}`);
        }
    }
    // Get comments file path
    getCommentsFilePath(filePath) {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, path.extname(filePath));
        return path.join(dir, `.${name}.comments.json`);
    }
    // Collaboration session management
    async createSession(participants) {
        const session = {
            id: this.generateSessionId(),
            participants: [this._currentUser, ...participants],
            activeFile: '',
            lastActivity: new Date(),
            comments: [],
            shared: false
        };
        this._sessions.set(session.id, session);
        this._activeSession = session.id;
        // Add participants to global list
        participants.forEach(p => this._participants.set(p.id, p));
        this._output.appendLine(`🤝 Collaboration session created: ${session.id}`);
        return session;
    }
    // Join existing session
    async joinSession(sessionId) {
        const session = this._sessions.get(sessionId);
        if (session) {
            session.participants.push(this._currentUser);
            session.lastActivity = new Date();
            this._activeSession = sessionId;
            this._output.appendLine(`🤝 Joined collaboration session: ${sessionId}`);
            return session;
        }
        return null;
    }
    // Share session
    async shareSession(sessionId) {
        const session = this._sessions.get(sessionId);
        if (session) {
            session.shared = true;
            session.lastActivity = new Date();
            const shareUrl = `valinor://collaborate/${sessionId}`;
            this._output.appendLine(`🔗 Session shared: ${shareUrl}`);
            return shareUrl;
        }
        throw new Error('Session not found');
    }
    // Get active session
    getActiveSession() {
        return this._activeSession ? this._sessions.get(this._activeSession) || null : null;
    }
    // Get current user
    getCurrentUser() {
        return this._currentUser;
    }
    // Get all participants
    getParticipants() {
        return Array.from(this._participants.values());
    }
    // Update user status
    updateUserStatus(status) {
        this._currentUser.status = status;
        this._currentUser.lastSeen = new Date();
    }
    // Update cursor position for collaboration
    updateCursorPosition(position, selections) {
        this._currentUser.cursorPosition = position;
        this._currentUser.selections = selections;
    }
    // Generate unique IDs
    generateCommentId() {
        return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateReplyId() {
        return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateThreadId() {
        return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Cleanup
    dispose() {
        for (const decorationType of this._decorations.values()) {
            decorationType.dispose();
        }
        this._decorations.clear();
    }
}
exports.CollaborationManager = CollaborationManager;
//# sourceMappingURL=collaboration.js.map