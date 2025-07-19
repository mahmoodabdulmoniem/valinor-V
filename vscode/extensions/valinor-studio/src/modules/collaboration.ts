import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface Comment {
	id: string;
	author: string;
	authorId: string;
	timestamp: Date;
	content: string;
	range: vscode.Range;
	filePath: string;
	threadId: string;
	replies: CommentReply[];
	resolved: boolean;
	severity: 'info' | 'warning' | 'error' | 'suggestion';
}

export interface CommentReply {
	id: string;
	author: string;
	authorId: string;
	timestamp: Date;
	content: string;
}

export interface CollaborationSession {
	id: string;
	participants: CollaborationParticipant[];
	activeFile: string;
	lastActivity: Date;
	comments: Comment[];
	shared: boolean;
}

export interface CollaborationParticipant {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	status: 'online' | 'offline' | 'away';
	lastSeen: Date;
	cursorPosition?: vscode.Position;
	selections?: vscode.Range[];
}

export class CollaborationManager {
	private _comments: Map<string, Comment[]> = new Map();
	private _sessions: Map<string, CollaborationSession> = new Map();
	private _participants: Map<string, CollaborationParticipant> = new Map();
	private _decorations: Map<string, vscode.TextEditorDecorationType> = new Map();
	private _output: vscode.OutputChannel;
	private _currentUser: CollaborationParticipant;
	private _activeSession: string | null = null;

	constructor(output: vscode.OutputChannel) {
		this._output = output;
		this._currentUser = this.initializeCurrentUser();
		this.initializeDecorations();
	}

	private initializeCurrentUser(): CollaborationParticipant {
		return {
			id: this.generateUserId(),
			name: process.env.USER || 'Anonymous User',
			email: process.env.EMAIL || 'user@example.com',
			status: 'online',
			lastSeen: new Date()
		};
	}

	private initializeDecorations(): void {
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

	private getCommentIcon(): vscode.Uri {
		// Create a simple SVG icon for comments
		const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="7" fill="#007acc" stroke="none"/>
			<path d="M4 6h8M4 8h6M4 10h4" stroke="white" stroke-width="1.5" fill="none"/>
		</svg>`;

		const iconPath = path.join(__dirname, 'comment-icon.svg');
		fs.writeFileSync(iconPath, svg);
		return vscode.Uri.file(iconPath);
	}

	private getResolvedIcon(): vscode.Uri {
		const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="7" fill="#28a745" stroke="none"/>
			<path d="M5 8l2 2 4-4" stroke="white" stroke-width="1.5" fill="none"/>
		</svg>`;

		const iconPath = path.join(__dirname, 'resolved-icon.svg');
		fs.writeFileSync(iconPath, svg);
		return vscode.Uri.file(iconPath);
	}

	private getWarningIcon(): vscode.Uri {
		const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<path d="M8 1L15 14H1L8 1Z" fill="#ffc107" stroke="none"/>
			<path d="M8 6v4M8 12h0" stroke="#000" stroke-width="1" fill="none"/>
		</svg>`;

		const iconPath = path.join(__dirname, 'warning-icon.svg');
		fs.writeFileSync(iconPath, svg);
		return vscode.Uri.file(iconPath);
	}

	private getErrorIcon(): vscode.Uri {
		const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="7" fill="#dc3545" stroke="none"/>
			<path d="M5 5l6 6M11 5l-6 6" stroke="white" stroke-width="1.5" fill="none"/>
		</svg>`;

		const iconPath = path.join(__dirname, 'error-icon.svg');
		fs.writeFileSync(iconPath, svg);
		return vscode.Uri.file(iconPath);
	}

	// Add comment to current selection
	async addComment(editor: vscode.TextEditor, content: string, severity: Comment['severity'] = 'info'): Promise<Comment> {
		const selection = editor.selection;
		const filePath = editor.document.uri.fsPath;

		const comment: Comment = {
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
		this._comments.get(filePath)!.push(comment);

		// Update decorations
		await this.updateDecorations(editor);

		// Save to file
		await this.saveCommentsToFile(filePath);

		this._output.appendLine(`💬 Comment added by ${this._currentUser.name}: ${content.substring(0, 50)}...`);

		return comment;
	}

	// Reply to a comment
	async replyToComment(commentId: string, content: string): Promise<CommentReply> {
		const reply: CommentReply = {
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
	async resolveComment(commentId: string): Promise<void> {
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
	getCommentsForFile(filePath: string): Comment[] {
		return this._comments.get(filePath) || [];
	}

	// Get comment by ID
	getCommentById(commentId: string): Comment | undefined {
		for (const comments of this._comments.values()) {
			const comment = comments.find(c => c.id === commentId);
			if (comment) return comment;
		}
		return undefined;
	}

	// Update decorations for an editor
	async updateDecorations(editor: vscode.TextEditor): Promise<void> {
		const filePath = editor.document.uri.fsPath;
		const comments = this.getCommentsForFile(filePath);

		// Clear existing decorations
		for (const decorationType of this._decorations.values()) {
			editor.setDecorations(decorationType, []);
		}

		// Apply new decorations
		for (const comment of comments) {
			const decorationType = this._decorations.get(comment.resolved ? 'resolved' : comment.severity) || this._decorations.get('comment')!;
			editor.setDecorations(decorationType, [comment.range]);
		}
	}

	// Update decorations for a specific file
	async updateDecorationsForFile(filePath: string): Promise<void> {
		const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.fsPath === filePath);
		if (editor) {
			await this.updateDecorations(editor);
		}
	}

	// Load comments from file
	async loadCommentsFromFile(filePath: string): Promise<void> {
		const commentsFilePath = this.getCommentsFilePath(filePath);

		try {
			if (fs.existsSync(commentsFilePath)) {
				const data = fs.readFileSync(commentsFilePath, 'utf8');
				const comments: Comment[] = JSON.parse(data, (key, value) => {
					if (key === 'timestamp' || key === 'lastSeen') {
						return new Date(value);
					}
					return value;
				});
				this._comments.set(filePath, comments);
			}
		} catch (error) {
			this._output.appendLine(`❌ Error loading comments: ${error}`);
		}
	}

	// Save comments to file
	async saveCommentsToFile(filePath: string): Promise<void> {
		const comments = this.getCommentsForFile(filePath);
		const commentsFilePath = this.getCommentsFilePath(filePath);

		try {
			// Ensure directory exists
			const dir = path.dirname(commentsFilePath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			fs.writeFileSync(commentsFilePath, JSON.stringify(comments, null, 2));
		} catch (error) {
			this._output.appendLine(`❌ Error saving comments: ${error}`);
		}
	}

	// Get comments file path
	private getCommentsFilePath(filePath: string): string {
		const dir = path.dirname(filePath);
		const name = path.basename(filePath, path.extname(filePath));
		return path.join(dir, `.${name}.comments.json`);
	}

	// Collaboration session management
	async createSession(participants: CollaborationParticipant[]): Promise<CollaborationSession> {
		const session: CollaborationSession = {
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
	async joinSession(sessionId: string): Promise<CollaborationSession | null> {
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
	async shareSession(sessionId: string): Promise<string> {
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
	getActiveSession(): CollaborationSession | null {
		return this._activeSession ? this._sessions.get(this._activeSession) || null : null;
	}

	// Get current user
	getCurrentUser(): CollaborationParticipant {
		return this._currentUser;
	}

	// Get all participants
	getParticipants(): CollaborationParticipant[] {
		return Array.from(this._participants.values());
	}

	// Update user status
	updateUserStatus(status: CollaborationParticipant['status']): void {
		this._currentUser.status = status;
		this._currentUser.lastSeen = new Date();
	}

	// Update cursor position for collaboration
	updateCursorPosition(position: vscode.Position, selections: vscode.Range[]): void {
		this._currentUser.cursorPosition = position;
		this._currentUser.selections = selections;
	}

	// Generate unique IDs
	private generateCommentId(): string {
		return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateReplyId(): string {
		return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateThreadId(): string {
		return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateUserId(): string {
		return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// Cleanup
	dispose(): void {
		for (const decorationType of this._decorations.values()) {
			decorationType.dispose();
		}
		this._decorations.clear();
	}
}
