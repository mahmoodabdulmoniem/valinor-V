import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface SuggestionRecord {
	id: string;
	section: string;
	model: string;
	timestamp: Date;
	originalContent: string;
	suggestedContent: string;
	filePath: string;
	contractId?: string;
}

export class SuggestionHistoryProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'valinorStudio.suggestionHistory';
	private _view?: vscode.WebviewView;
	private static instance: SuggestionHistoryProvider;
	private historyFile: string;

	constructor(private readonly _extensionUri: vscode.Uri) {
		this.historyFile = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.valinor', 'suggestion-history.json');
		SuggestionHistoryProvider.instance = this;
	}

	public static getInstance(): SuggestionHistoryProvider {
		return SuggestionHistoryProvider.instance;
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case 'loadHistory':
					this.loadHistory();
					break;
				case 'openDiff':
					this.openDiffEditor(data.suggestion);
					break;
				case 'deleteSuggestion':
					this.deleteSuggestion(data.id);
					break;
				case 'filterHistory':
					this.filterHistory(data.filter);
					break;
			}
		});

		// Load initial history
		this.loadHistory();
	}

	private async loadHistory() {
		if (!this._view) return;

		try {
			const history = await this.getHistory();
			this._view.webview.postMessage({
				type: 'updateHistory',
				history: history
			});
		} catch (error) {
			console.error('Error loading suggestion history:', error);
		}
	}

	private async filterHistory(filter: { section?: string; model?: string; dateRange?: { start: Date; end: Date } }) {
		if (!this._view) return;

		try {
			const history = await this.getHistory();
			let filtered = history;

			if (filter.section) {
				filtered = filtered.filter(item =>
					item.section.toLowerCase().includes(filter.section!.toLowerCase())
				);
			}

			if (filter.model) {
				filtered = filtered.filter(item =>
					item.model.toLowerCase().includes(filter.model!.toLowerCase())
				);
			}

			if (filter.dateRange) {
				filtered = filtered.filter(item =>
					item.timestamp >= filter.dateRange!.start &&
					item.timestamp <= filter.dateRange!.end
				);
			}

			this._view.webview.postMessage({
				type: 'updateHistory',
				history: filtered
			});
		} catch (error) {
			console.error('Error filtering suggestion history:', error);
		}
	}

	private async openDiffEditor(suggestion: SuggestionRecord) {
		try {
			// Create temporary files for diff
			const tempDir = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.valinor', 'temp');
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}

			const originalFile = path.join(tempDir, `original_${suggestion.id}.md`);
			const suggestedFile = path.join(tempDir, `suggested_${suggestion.id}.md`);

			fs.writeFileSync(originalFile, suggestion.originalContent);
			fs.writeFileSync(suggestedFile, suggestion.suggestedContent);

			const originalUri = vscode.Uri.file(originalFile);
			const suggestedUri = vscode.Uri.file(suggestedFile);

			await vscode.commands.executeCommand('vscode.diff', originalUri, suggestedUri,
				`Suggestion History - ${suggestion.section} (${suggestion.model})`,
				{ preview: true }
			);

			// Clean up temp files after a delay
			setTimeout(() => {
				try {
					if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
					if (fs.existsSync(suggestedFile)) fs.unlinkSync(suggestedFile);
				} catch (error) {
					console.error('Error cleaning up temp files:', error);
				}
			}, 30000); // 30 seconds

		} catch (error) {
			console.error('Error opening diff editor:', error);
			vscode.window.showErrorMessage('Failed to open diff editor');
		}
	}

	private async deleteSuggestion(id: string) {
		try {
			const history = await this.getHistory();
			const filtered = history.filter(item => item.id !== id);
			await this.saveHistory(filtered);

			vscode.window.showInformationMessage('Suggestion deleted from history');
			this.loadHistory();
		} catch (error) {
			console.error('Error deleting suggestion:', error);
			vscode.window.showErrorMessage('Failed to delete suggestion');
		}
	}

	public async addSuggestion(suggestion: Omit<SuggestionRecord, 'id' | 'timestamp'>) {
		try {
			const history = await this.getHistory();
			const newSuggestion: SuggestionRecord = {
				...suggestion,
				id: this.generateId(),
				timestamp: new Date()
			};

			history.unshift(newSuggestion); // Add to beginning
			await this.saveHistory(history);

			// Update the view if it's open
			if (this._view) {
				this._view.webview.postMessage({
					type: 'addSuggestion',
					suggestion: newSuggestion
				});
			}
		} catch (error) {
			console.error('Error adding suggestion to history:', error);
		}
	}

	private async getHistory(): Promise<SuggestionRecord[]> {
		try {
			if (!fs.existsSync(this.historyFile)) {
				return [];
			}

			const data = fs.readFileSync(this.historyFile, 'utf8');
			const history = JSON.parse(data);

			// Convert timestamp strings back to Date objects
			return history.map((item: any) => ({
				...item,
				timestamp: new Date(item.timestamp)
			}));
		} catch (error) {
			console.error('Error reading suggestion history:', error);
			return [];
		}
	}

	private async saveHistory(history: SuggestionRecord[]) {
		try {
			const dir = path.dirname(this.historyFile);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
		} catch (error) {
			console.error('Error saving suggestion history:', error);
		}
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));

		return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Suggestion History</title>
            <link href="${styleResetUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    margin: 0;
                    padding: 16px;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }

                .controls {
                    display: flex;
                    gap: 8px;
                }

                .filter-input {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-input-foreground);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                }

                .clear-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-secondaryBorder);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .clear-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .suggestion-list {
                    max-height: calc(100vh - 120px);
                    overflow-y: auto;
                }

                .suggestion-item {
                    background: var(--vscode-list-hoverBackground);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .suggestion-item:hover {
                    background: var(--vscode-list-activeSelectionBackground);
                    border-color: var(--vscode-focusBorder);
                }

                .suggestion-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                }

                .suggestion-title {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    margin: 0;
                }

                .suggestion-meta {
                    display: flex;
                    gap: 12px;
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }

                .suggestion-model {
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                }

                .suggestion-timestamp {
                    color: var(--vscode-descriptionForeground);
                }

                .suggestion-file {
                    color: var(--vscode-textLink-foreground);
                    font-size: 11px;
                    margin-top: 4px;
                }

                .suggestion-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }

                .action-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-secondaryBorder);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.2s ease;
                }

                .action-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .action-btn.danger {
                    background: var(--vscode-errorForeground);
                    color: var(--vscode-button-secondaryForeground);
                    border-color: var(--vscode-errorForeground);
                }

                .action-btn.danger:hover {
                    background: var(--vscode-errorForeground);
                    opacity: 0.8;
                }

                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--vscode-descriptionForeground);
                }

                .empty-state-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .loading {
                    text-align: center;
                    padding: 20px;
                    color: var(--vscode-descriptionForeground);
                }

                .spinner {
                    border: 2px solid var(--vscode-progressBar-background);
                    border-top: 2px solid var(--vscode-progressBar-foreground);
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 8px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">Suggestion History</div>
                <div class="controls">
                    <input type="text" class="filter-input" placeholder="Filter by section..." id="sectionFilter">
                    <input type="text" class="filter-input" placeholder="Filter by model..." id="modelFilter">
                    <button class="clear-btn" id="clearFilters">Clear</button>
                </div>
            </div>

            <div class="suggestion-list" id="suggestionList">
                <div class="loading">
                    <div class="spinner"></div>
                    Loading suggestion history...
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentHistory = [];

                // Load history on page load
                vscode.postMessage({ type: 'loadHistory' });

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateHistory':
                            currentHistory = message.history;
                            renderHistory(currentHistory);
                            break;
                        case 'addSuggestion':
                            currentHistory.unshift(message.suggestion);
                            renderHistory(currentHistory);
                            break;
                    }
                });

                // Filter functionality
                document.getElementById('sectionFilter').addEventListener('input', (e) => {
                    applyFilters();
                });

                document.getElementById('modelFilter').addEventListener('input', (e) => {
                    applyFilters();
                });

                document.getElementById('clearFilters').addEventListener('click', () => {
                    document.getElementById('sectionFilter').value = '';
                    document.getElementById('modelFilter').value = '';
                    renderHistory(currentHistory);
                });

                function applyFilters() {
                    const sectionFilter = document.getElementById('sectionFilter').value.toLowerCase();
                    const modelFilter = document.getElementById('modelFilter').value.toLowerCase();

                    const filtered = currentHistory.filter(item => {
                        const sectionMatch = !sectionFilter || item.section.toLowerCase().includes(sectionFilter);
                        const modelMatch = !modelFilter || item.model.toLowerCase().includes(modelFilter);
                        return sectionMatch && modelMatch;
                    });

                    renderHistory(filtered);
                }

                function renderHistory(history) {
                    const container = document.getElementById('suggestionList');

                    if (history.length === 0) {
                        container.innerHTML = \`
                            <div class="empty-state">
                                <div class="empty-state-icon">📝</div>
                                <div>No suggestions in history</div>
                                <div style="font-size: 12px; margin-top: 8px;">
                                    Accepted suggestions will appear here
                                </div>
                            </div>
                        \`;
                        return;
                    }

                    container.innerHTML = history.map(item => \`
                        <div class="suggestion-item" data-id="\${item.id}">
                            <div class="suggestion-header">
                                <div>
                                    <div class="suggestion-title">\${escapeHtml(item.section)}</div>
                                    <div class="suggestion-meta">
                                        <span class="suggestion-model">\${escapeHtml(item.model)}</span>
                                        <span class="suggestion-timestamp">\${formatDate(item.timestamp)}</span>
                                    </div>
                                    <div class="suggestion-file">\${escapeHtml(item.filePath)}</div>
                                </div>
                            </div>
                            <div class="suggestion-actions">
                                <button class="action-btn" onclick="openDiff('\${item.id}')">
                                    📋 Open Diff
                                </button>
                                <button class="action-btn danger" onclick="deleteSuggestion('\${item.id}')">
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    \`).join('');
                }

                function openDiff(id) {
                    const suggestion = currentHistory.find(item => item.id === id);
                    if (suggestion) {
                        vscode.postMessage({
                            type: 'openDiff',
                            suggestion: suggestion
                        });
                    }
                }

                function deleteSuggestion(id) {
                    if (confirm('Are you sure you want to delete this suggestion from history?')) {
                        vscode.postMessage({
                            type: 'deleteSuggestion',
                            id: id
                        });
                    }
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                function formatDate(dateString) {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now - date;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffDays === 0) {
                        return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else if (diffDays === 1) {
                        return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else if (diffDays < 7) {
                        return diffDays + ' days ago';
                    } else {
                        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                }
            </script>
        </body>
        </html>`;
	}
}

export function registerSuggestionHistory(context: vscode.ExtensionContext) {
	const provider = new SuggestionHistoryProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SuggestionHistoryProvider.viewType,
			provider
		)
	);

	// Register command to open suggestion history
	context.subscriptions.push(
		vscode.commands.registerCommand('valinorStudio.openSuggestionHistory', () => {
			vscode.commands.executeCommand('valinorStudio.suggestionHistory.focus');
		})
	);

	return provider;
}
