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
exports.CommentPanelProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class CommentPanelProvider {
    constructor(_extensionUri, collaborationManager) {
        this._extensionUri = _extensionUri;
        this._currentFile = null;
        this._collaborationManager = collaborationManager;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'addComment':
                    this.handleAddComment(message.content, message.severity);
                    break;
                case 'replyToComment':
                    this.handleReplyToComment(message.commentId, message.content);
                    break;
                case 'resolveComment':
                    this.handleResolveComment(message.commentId);
                    break;
                case 'navigateToComment':
                    this.handleNavigateToComment(message.commentId);
                    break;
                case 'refreshComments':
                    this.refreshComments();
                    break;
            }
        });
        // Initial load
        this.refreshComments();
    }
    async handleAddComment(content, severity) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        try {
            await this._collaborationManager.addComment(editor, content, severity);
            this.refreshComments();
            vscode.window.showInformationMessage('💬 Comment added successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error adding comment: ${error}`);
        }
    }
    async handleReplyToComment(commentId, content) {
        try {
            await this._collaborationManager.replyToComment(commentId, content);
            this.refreshComments();
            vscode.window.showInformationMessage('💬 Reply added successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error adding reply: ${error}`);
        }
    }
    async handleResolveComment(commentId) {
        try {
            await this._collaborationManager.resolveComment(commentId);
            this.refreshComments();
            vscode.window.showInformationMessage('✅ Comment resolved');
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error resolving comment: ${error}`);
        }
    }
    async handleNavigateToComment(commentId) {
        const comment = this._collaborationManager.getCommentById(commentId);
        if (!comment) {
            vscode.window.showWarningMessage('Comment not found');
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(comment.filePath);
            const editor = await vscode.window.showTextDocument(document);
            // Reveal the comment range
            editor.revealRange(comment.range, vscode.TextEditorRevealType.InCenter);
            // Set selection to the comment range
            editor.selection = new vscode.Selection(comment.range.start, comment.range.end);
            vscode.window.showInformationMessage(`📍 Navigated to comment by ${comment.author}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error navigating to comment: ${error}`);
        }
    }
    async refreshComments() {
        if (!this._view)
            return;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this._view.webview.postMessage({ command: 'updateComments', comments: [] });
            return;
        }
        const filePath = editor.document.uri.fsPath;
        this._currentFile = filePath;
        // Load comments for the current file
        await this._collaborationManager.loadCommentsFromFile(filePath);
        const comments = this._collaborationManager.getCommentsForFile(filePath);
        this._view.webview.postMessage({
            command: 'updateComments',
            comments: comments,
            fileName: path.basename(filePath)
        });
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comments</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .file-name {
            font-weight: bold;
            color: var(--vscode-foreground);
        }

        .add-comment-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }

        .add-comment-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .comment {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            margin-bottom: 10px;
            padding: 10px;
        }

        .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .comment-author {
            font-weight: bold;
            color: var(--vscode-foreground);
        }

        .comment-timestamp {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .comment-severity {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
        }

        .severity-info { background-color: #007acc; color: white; }
        .severity-warning { background-color: #ffc107; color: black; }
        .severity-error { background-color: #dc3545; color: white; }
        .severity-suggestion { background-color: #28a745; color: white; }

        .comment-content {
            margin-bottom: 10px;
            line-height: 1.4;
        }

        .comment-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .action-btn {
            background: none;
            border: 1px solid var(--vscode-panel-border);
            color: var(--vscode-foreground);
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .action-btn:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .replies {
            margin-left: 20px;
            border-left: 2px solid var(--vscode-panel-border);
            padding-left: 10px;
        }

        .reply {
            background-color: var(--vscode-list-hoverBackground);
            border-radius: 3px;
            padding: 8px;
            margin-bottom: 8px;
        }

        .reply-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }

        .reply-author {
            font-weight: bold;
            font-size: 12px;
        }

        .reply-timestamp {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }

        .reply-content {
            font-size: 12px;
            line-height: 1.3;
        }

        .add-reply-form {
            margin-top: 10px;
            padding: 10px;
            background-color: var(--vscode-input-background);
            border-radius: 3px;
        }

        .reply-input {
            width: 100%;
            min-height: 60px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            padding: 5px;
            font-family: inherit;
            font-size: 12px;
            resize: vertical;
        }

        .reply-buttons {
            display: flex;
            gap: 5px;
            margin-top: 5px;
        }

        .reply-submit {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .reply-cancel {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .no-comments {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
            font-style: italic;
        }

        .resolved {
            opacity: 0.6;
        }

        .resolved .comment-header::after {
            content: " ✅";
            color: var(--vscode-textPreformat-foreground);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="file-name" id="fileName">No file selected</div>
        <button class="add-comment-btn" onclick="showAddCommentForm()">💬 Add Comment</button>
    </div>

    <div id="comments-container">
        <div class="no-comments">No comments yet. Select text and add a comment to get started.</div>
    </div>

    <div id="add-comment-form" style="display: none;">
        <div class="add-reply-form">
            <textarea class="reply-input" id="commentContent" placeholder="Enter your comment..."></textarea>
            <div style="margin-top: 5px;">
                <label for="commentSeverity">Severity:</label>
                <select id="commentSeverity" style="margin-left: 5px; background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 2px;">
                    <option value="info">Info</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                </select>
            </div>
            <div class="reply-buttons">
                <button class="reply-submit" onclick="submitComment()">Add Comment</button>
                <button class="reply-cancel" onclick="hideAddCommentForm()">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentComments = [];

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'updateComments':
                    currentComments = message.comments;
                    document.getElementById('fileName').textContent = message.fileName || 'No file selected';
                    renderComments();
                    break;
            }
        });

        function renderComments() {
            const container = document.getElementById('comments-container');

            if (currentComments.length === 0) {
                container.innerHTML = '<div class="no-comments">No comments yet. Select text and add a comment to get started.</div>';
                return;
            }

            container.innerHTML = currentComments.map(comment => \`
                <div class="comment \${comment.resolved ? 'resolved' : ''}" data-comment-id="\${comment.id}">
                    <div class="comment-header">
                        <div>
                            <span class="comment-author">\${comment.author}</span>
                            <span class="comment-severity severity-\${comment.severity}">\${comment.severity}</span>
                        </div>
                        <div>
                            <span class="comment-timestamp">\${formatDate(comment.timestamp)}</span>
                        </div>
                    </div>
                    <div class="comment-content">\${comment.content}</div>
                    <div class="comment-actions">
                        <button class="action-btn" onclick="navigateToComment('\${comment.id}')">📍 Navigate</button>
                        <button class="action-btn" onclick="showReplyForm('\${comment.id}')">💬 Reply</button>
                        \${!comment.resolved ? '<button class="action-btn" onclick="resolveComment(\'' + comment.id + '\')">✅ Resolve</button>' : ''}
                    </div>
                    \${comment.replies.length > 0 ? \`
                        <div class="replies">
                            \${comment.replies.map(reply => \`
                                <div class="reply">
                                    <div class="reply-header">
                                        <span class="reply-author">\${reply.author}</span>
                                        <span class="reply-timestamp">\${formatDate(reply.timestamp)}</span>
                                    </div>
                                    <div class="reply-content">\${reply.content}</div>
                                </div>
                            \`).join('')}
                        </div>
                    \` : ''}
                    <div id="reply-form-\${comment.id}" class="add-reply-form" style="display: none;">
                        <textarea class="reply-input" id="reply-content-\${comment.id}" placeholder="Enter your reply..."></textarea>
                        <div class="reply-buttons">
                            <button class="reply-submit" onclick="submitReply('\${comment.id}')">Reply</button>
                            <button class="reply-cancel" onclick="hideReplyForm('\${comment.id}')">Cancel</button>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString();
        }

        function showAddCommentForm() {
            document.getElementById('add-comment-form').style.display = 'block';
            document.getElementById('commentContent').focus();
        }

        function hideAddCommentForm() {
            document.getElementById('add-comment-form').style.display = 'none';
            document.getElementById('commentContent').value = '';
        }

        function submitComment() {
            const content = document.getElementById('commentContent').value.trim();
            const severity = document.getElementById('commentSeverity').value;

            if (!content) {
                alert('Please enter a comment');
                return;
            }

            vscode.postMessage({
                command: 'addComment',
                content: content,
                severity: severity
            });

            hideAddCommentForm();
        }

        function showReplyForm(commentId) {
            document.getElementById('reply-form-' + commentId).style.display = 'block';
            document.getElementById('reply-content-' + commentId).focus();
        }

        function hideReplyForm(commentId) {
            document.getElementById('reply-form-' + commentId).style.display = 'none';
            document.getElementById('reply-content-' + commentId).value = '';
        }

        function submitReply(commentId) {
            const content = document.getElementById('reply-content-' + commentId).value.trim();

            if (!content) {
                alert('Please enter a reply');
                return;
            }

            vscode.postMessage({
                command: 'replyToComment',
                commentId: commentId,
                content: content
            });

            hideReplyForm(commentId);
        }

        function resolveComment(commentId) {
            if (confirm('Are you sure you want to resolve this comment?')) {
                vscode.postMessage({
                    command: 'resolveComment',
                    commentId: commentId
                });
            }
        }

        function navigateToComment(commentId) {
            vscode.postMessage({
                command: 'navigateToComment',
                commentId: commentId
            });
        }

        // Handle Enter key in textareas
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'TEXTAREA' && e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                const textarea = e.target;
                const commentId = textarea.id.replace('reply-content-', '');

                if (textarea.id === 'commentContent') {
                    submitComment();
                } else if (commentId) {
                    submitReply(commentId);
                }
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.CommentPanelProvider = CommentPanelProvider;
CommentPanelProvider.viewType = 'valinorStudio.commentPanel';
//# sourceMappingURL=comment-panel.js.map