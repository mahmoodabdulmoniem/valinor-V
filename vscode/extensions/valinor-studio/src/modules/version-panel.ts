import * as vscode from 'vscode';
import * as path from 'path';
import { VersionHistoryManager, VersionEntry, DiffResult } from './version-history';

export class VersionPanelProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'valinorStudio.versionPanel';

	private _view?: vscode.WebviewView;
	private _versionManager: VersionHistoryManager;
	private _currentFile: string | null = null;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		versionManager: VersionHistoryManager
	) {
		this._versionManager = versionManager;
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'loadVersionHistory':
						this.handleLoadVersionHistory();
						break;
					case 'restoreVersion':
						this.handleRestoreVersion(message.commitHash);
						break;
					case 'showDiff':
						this.handleShowDiff(message.fromHash, message.toHash);
						break;
					case 'createVersion':
						this.handleCreateVersion(message.message);
						break;
					case 'refreshHistory':
						this.refreshVersionHistory();
						break;
				}
			}
		);

		// Initial load
		this.refreshVersionHistory();
	}

	private async handleLoadVersionHistory(): Promise<void> {
		await this.refreshVersionHistory();
	}

	private async handleRestoreVersion(commitHash: string): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		try {
			await this._versionManager.restoreToVersion(editor.document.uri.fsPath, commitHash);
			this.refreshVersionHistory();
			vscode.window.showInformationMessage('✅ Document restored successfully');
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Error restoring document: ${error}`);
		}
	}

	private async handleShowDiff(fromHash: string, toHash: string): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		try {
			const diff = await this._versionManager.createDiff(editor.document.uri.fsPath, fromHash, toHash);
			await this.showDiffEditor(diff, fromHash, toHash);
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Error showing diff: ${error}`);
		}
	}

	private async handleCreateVersion(message: string): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		try {
			const commitHash = await this._versionManager.createVersion(editor.document.uri.fsPath, message);
			this.refreshVersionHistory();
			vscode.window.showInformationMessage(`✅ Version created: ${commitHash.substring(0, 8)}`);
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Error creating version: ${error}`);
		}
	}

	private async showDiffEditor(diff: DiffResult, fromHash: string, toHash: string): Promise<void> {
		// Create a new document for the diff
		const diffContent = this.formatDiffContent(diff, fromHash, toHash);
		const document = await vscode.workspace.openTextDocument({
			content: diffContent,
			language: 'diff'
		});

		await vscode.window.showTextDocument(document, { preview: false });
	}

	private formatDiffContent(diff: DiffResult, fromHash: string, toHash: string): string {
		let content = `# Version Comparison\n`;
		content += `From: ${fromHash.substring(0, 8)} - ${diff.summary.deleted} lines deleted\n`;
		content += `To: ${toHash.substring(0, 8)} - ${diff.summary.added} lines added\n`;
		content += `Modified: ${diff.summary.modified} lines\n\n`;

		content += `## Changes:\n\n`;

		for (const change of diff.changes) {
			switch (change.type) {
				case 'added':
					content += `+ Line ${change.lineNumber}: ${change.content}\n`;
					break;
				case 'deleted':
					content += `- Line ${change.lineNumber}: ${change.content}\n`;
					break;
				case 'modified':
					content += `~ Line ${change.lineNumber}: ${change.originalContent} → ${change.content}\n`;
					break;
			}
		}

		return content;
	}

	public async refreshVersionHistory(): Promise<void> {
		if (!this._view) return;

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			this._view.webview.postMessage({ command: 'updateHistory', versions: [], fileName: 'No file selected' });
			return;
		}

		const filePath = editor.document.uri.fsPath;
		this._currentFile = filePath;

		try {
			const versions = await this._versionManager.getVersionHistory(filePath);
			this._view.webview.postMessage({
				command: 'updateHistory',
				versions: versions,
				fileName: path.basename(filePath),
				gitEnabled: this._versionManager.isGitEnabled()
			});
		} catch (error) {
			this._view.webview.postMessage({
				command: 'updateHistory',
				versions: [],
				fileName: path.basename(filePath),
				gitEnabled: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Version History</title>
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

					.create-version-btn {
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						padding: 5px 10px;
						border-radius: 3px;
						cursor: pointer;
						font-size: 12px;
					}

					.create-version-btn:hover {
						background-color: var(--vscode-button-hoverBackground);
					}

					.version {
						background-color: var(--vscode-editor-background);
						border: 1px solid var(--vscode-panel-border);
						border-radius: 5px;
						margin-bottom: 10px;
						padding: 10px;
					}

					.version-header {
						display: flex;
						justify-content: space-between;
						align-items: center;
						margin-bottom: 8px;
					}

					.version-hash {
						font-family: monospace;
						font-size: 11px;
						color: var(--vscode-textPreformat-foreground);
						background-color: var(--vscode-textPreformat-background);
						padding: 2px 4px;
						border-radius: 2px;
					}

					.version-date {
						font-size: 11px;
						color: var(--vscode-descriptionForeground);
					}

					.version-author {
						font-weight: bold;
						color: var(--vscode-foreground);
					}

					.version-message {
						margin-bottom: 10px;
						line-height: 1.4;
						font-style: italic;
					}

					.version-actions {
						display: flex;
						gap: 10px;
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

					.action-btn.danger {
						border-color: var(--vscode-errorForeground);
						color: var(--vscode-errorForeground);
					}

					.action-btn.danger:hover {
						background-color: var(--vscode-errorForeground);
						color: var(--vscode-errorBackground);
					}

					.no-versions {
						text-align: center;
						color: var(--vscode-descriptionForeground);
						padding: 20px;
						font-style: italic;
					}

					.git-error {
						background-color: var(--vscode-inputValidation-errorBackground);
						color: var(--vscode-inputValidation-errorForeground);
						padding: 10px;
						border-radius: 3px;
						margin-bottom: 10px;
					}

					.create-version-form {
						background-color: var(--vscode-input-background);
						border: 1px solid var(--vscode-input-border);
						border-radius: 3px;
						padding: 10px;
						margin-bottom: 15px;
					}

					.version-input {
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

					.version-buttons {
						display: flex;
						gap: 5px;
						margin-top: 5px;
					}

					.version-submit {
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						padding: 3px 8px;
						border-radius: 3px;
						cursor: pointer;
						font-size: 11px;
					}

					.version-cancel {
						background-color: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
						border: none;
						padding: 3px 8px;
						border-radius: 3px;
						cursor: pointer;
						font-size: 11px;
					}

					.changes-summary {
						font-size: 11px;
						color: var(--vscode-descriptionForeground);
						margin-top: 5px;
					}
				</style>
			</head>
			<body>
				<div class="header">
					<div class="file-name" id="fileName">No file selected</div>
					<button class="create-version-btn" onclick="showCreateVersionForm()">📝 Create Version</button>
				</div>

				<div id="git-error" class="git-error" style="display: none;">
					⚠️ Git repository not initialized. Version history requires Git to be set up.
				</div>

				<div id="create-version-form" class="create-version-form" style="display: none;">
					<textarea class="version-input" id="versionMessage" placeholder="Enter commit message..."></textarea>
					<div class="version-buttons">
						<button class="version-submit" onclick="submitVersion()">Create Version</button>
						<button class="version-cancel" onclick="hideCreateVersionForm()">Cancel</button>
					</div>
				</div>

				<div id="versions-container">
					<div class="no-versions">No version history available. Create a version to get started.</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					let currentVersions = [];
					let gitEnabled = true;

					// Handle messages from extension
					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'updateHistory':
								currentVersions = message.versions || [];
								gitEnabled = message.gitEnabled !== false;
								document.getElementById('fileName').textContent = message.fileName || 'No file selected';

								if (message.error) {
									document.getElementById('git-error').textContent = '⚠️ ' + message.error;
									document.getElementById('git-error').style.display = 'block';
								} else {
									document.getElementById('git-error').style.display = 'none';
								}

								renderVersions();
								break;
						}
					});

					function renderVersions() {
						const container = document.getElementById('versions-container');

						if (!gitEnabled) {
							container.innerHTML = '<div class="no-versions">Git repository not available. Initialize Git to enable version history.</div>';
							return;
						}

						if (currentVersions.length === 0) {
							container.innerHTML = '<div class="no-versions">No version history available. Create a version to get started.</div>';
							return;
						}

						container.innerHTML = currentVersions.map((version, index) => {
							const isLatest = index === 0;
							const changes = version.changes[0] || { linesAdded: 0, linesDeleted: 0 };

							return \`
								<div class="version">
									<div class="version-header">
										<div>
											<span class="version-hash">\${version.hash.substring(0, 8)}</span>
											<span class="version-author">\${version.author}</span>
										</div>
										<div>
											<span class="version-date">\${formatDate(version.date)}</span>
										</div>
									</div>
									<div class="version-message">\${version.message}</div>
									<div class="changes-summary">
										\${changes.linesAdded > 0 ? '+' + changes.linesAdded + ' lines added ' : ''}
										\${changes.linesDeleted > 0 ? '-' + changes.linesDeleted + ' lines deleted ' : ''}
									</div>
									<div class="version-actions">
										<button class="action-btn" onclick="showDiff('\${version.hash}', '\${isLatest ? 'HEAD' : currentVersions[index - 1].hash}')">🔍 Show Diff</button>
										\${!isLatest ? '<button class="action-btn danger" onclick="restoreVersion(\'' + version.hash + '\')">⏮️ Restore</button>' : ''}
									</div>
								</div>
							\`;
						}).join('');
					}

					function formatDate(dateString) {
						const date = new Date(dateString);
						return date.toLocaleString();
					}

					function showCreateVersionForm() {
						if (!gitEnabled) {
							alert('Git repository not available');
							return;
						}
						document.getElementById('create-version-form').style.display = 'block';
						document.getElementById('versionMessage').focus();
					}

					function hideCreateVersionForm() {
						document.getElementById('create-version-form').style.display = 'none';
						document.getElementById('versionMessage').value = '';
					}

					function submitVersion() {
						const message = document.getElementById('versionMessage').value.trim();

						if (!message) {
							alert('Please enter a commit message');
							return;
						}

						vscode.postMessage({
							command: 'createVersion',
							message: message
						});

						hideCreateVersionForm();
					}

					function restoreVersion(commitHash) {
						if (confirm('Are you sure you want to restore to this version? This will overwrite the current file.')) {
							vscode.postMessage({
								command: 'restoreVersion',
								commitHash: commitHash
							});
						}
					}

					function showDiff(fromHash, toHash) {
						vscode.postMessage({
							command: 'showDiff',
							fromHash: fromHash,
							toHash: toHash
						});
					}

					// Handle Enter key in textarea
					document.addEventListener('keydown', function(e) {
						if (e.target.tagName === 'TEXTAREA' && e.key === 'Enter' && e.ctrlKey) {
							e.preventDefault();
							submitVersion();
						}
					});
				</script>
			</body>
			</html>`;
	}
}
