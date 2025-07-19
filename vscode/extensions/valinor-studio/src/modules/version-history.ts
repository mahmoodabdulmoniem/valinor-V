import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VersionEntry {
	hash: string;
	author: string;
	date: Date;
	message: string;
	filePath: string;
	changes: FileChange[];
}

export interface FileChange {
	type: 'added' | 'modified' | 'deleted';
	linesAdded: number;
	linesDeleted: number;
	content?: string;
}

export interface DiffResult {
	original: string;
	modified: string;
	changes: DiffChange[];
	summary: {
		added: number;
		deleted: number;
		modified: number;
	};
}

export interface DiffChange {
	type: 'added' | 'deleted' | 'modified';
	lineNumber: number;
	content: string;
	originalContent?: string;
}

export class VersionHistoryManager {
	private _output: vscode.OutputChannel;
	private _gitEnabled: boolean = false;
	private _repositoryPath: string | null = null;

	constructor(output: vscode.OutputChannel) {
		this._output = output;
		this.initializeGit();
	}

	private async initializeGit(): Promise<void> {
		try {
			// Check if current workspace is a git repository
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				this._output.appendLine('⚠️ No workspace folder found');
				return;
			}

			this._repositoryPath = workspaceFolder.uri.fsPath;

			// Check if git is initialized
			const { stdout } = await execAsync('git status --porcelain', { cwd: this._repositoryPath });
			this._gitEnabled = true;
			this._output.appendLine('✅ Git repository detected and initialized');
		} catch (error) {
			this._output.appendLine('⚠️ Git not initialized or not available');
			this._gitEnabled = false;
		}
	}

	// Get version history for a file
	async getVersionHistory(filePath: string): Promise<VersionEntry[]> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			const relativePath = path.relative(this._repositoryPath!, filePath);

			// Get git log for the file
			const { stdout } = await execAsync(
				`git log --follow --pretty=format:"%H|%an|%ad|%s" --date=iso -- "${relativePath}"`,
				{ cwd: this._repositoryPath! }
			);

			const versions: VersionEntry[] = [];
			const lines = stdout.trim().split('\n');

			for (const line of lines) {
				if (!line) continue;

				const [hash, author, date, message] = line.split('|');
				const version: VersionEntry = {
					hash,
					author,
					date: new Date(date),
					message,
					filePath: relativePath,
					changes: []
				};

				// Get detailed changes for this commit
				version.changes = await this.getFileChanges(hash, relativePath);
				versions.push(version);
			}

			this._output.appendLine(`📜 Found ${versions.length} versions for ${path.basename(filePath)}`);
			return versions;
		} catch (error) {
			this._output.appendLine(`❌ Error getting version history: ${error}`);
			throw error;
		}
	}

	// Get file changes for a specific commit
	private async getFileChanges(commitHash: string, filePath: string): Promise<FileChange[]> {
		try {
			const { stdout } = await execAsync(
				`git show --stat --format="" ${commitHash} -- "${filePath}"`,
				{ cwd: this._repositoryPath! }
			);

			const changes: FileChange[] = [];
			const lines = stdout.trim().split('\n');

			for (const line of lines) {
				if (line.includes('|')) {
					const match = line.match(/(\d+)\s+(\+*)(-*)/);
					if (match) {
						const [, total, additions, deletions] = match;
						changes.push({
							type: 'modified',
							linesAdded: additions.length,
							linesDeleted: deletions.length
						});
					}
				}
			}

			return changes;
		} catch (error) {
			this._output.appendLine(`❌ Error getting file changes: ${error}`);
			return [];
		}
	}

	// Get file content at a specific version
	async getFileAtVersion(filePath: string, commitHash: string): Promise<string> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			const relativePath = path.relative(this._repositoryPath!, filePath);
			const { stdout } = await execAsync(
				`git show ${commitHash}:"${relativePath}"`,
				{ cwd: this._repositoryPath! }
			);

			return stdout;
		} catch (error) {
			this._output.appendLine(`❌ Error getting file at version: ${error}`);
			throw error;
		}
	}

	// Create diff between two versions
	async createDiff(filePath: string, fromHash: string, toHash: string): Promise<DiffResult> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			const relativePath = path.relative(this._repositoryPath!, filePath);

			// Get content at both versions
			const originalContent = await this.getFileAtVersion(filePath, fromHash);
			const modifiedContent = await this.getFileAtVersion(filePath, toHash);

			// Get git diff
			const { stdout } = await execAsync(
				`git diff ${fromHash} ${toHash} -- "${relativePath}"`,
				{ cwd: this._repositoryPath! }
			);

			const changes = this.parseDiffOutput(stdout);
			const summary = this.calculateDiffSummary(changes);

			return {
				original: originalContent,
				modified: modifiedContent,
				changes,
				summary
			};
		} catch (error) {
			this._output.appendLine(`❌ Error creating diff: ${error}`);
			throw error;
		}
	}

	// Parse git diff output
	private parseDiffOutput(diffOutput: string): DiffChange[] {
		const changes: DiffChange[] = [];
		const lines = diffOutput.split('\n');
		let currentLineNumber = 0;

		for (const line of lines) {
			if (line.startsWith('@@')) {
				// Parse hunk header
				const match = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
				if (match) {
					currentLineNumber = parseInt(match[3]);
				}
			} else if (line.startsWith('+') && !line.startsWith('+++')) {
				// Added line
				changes.push({
					type: 'added',
					lineNumber: currentLineNumber++,
					content: line.substring(1)
				});
			} else if (line.startsWith('-') && !line.startsWith('---')) {
				// Deleted line
				changes.push({
					type: 'deleted',
					lineNumber: currentLineNumber,
					content: line.substring(1)
				});
			} else if (line.startsWith(' ')) {
				// Unchanged line
				currentLineNumber++;
			}
		}

		return changes;
	}

	// Calculate diff summary
	private calculateDiffSummary(changes: DiffChange[]): { added: number; deleted: number; modified: number } {
		let added = 0;
		let deleted = 0;
		let modified = 0;

		for (const change of changes) {
			switch (change.type) {
				case 'added':
					added++;
					break;
				case 'deleted':
					deleted++;
					break;
				case 'modified':
					modified++;
					break;
			}
		}

		return { added, deleted, modified };
	}

	// Restore file to a specific version
	async restoreToVersion(filePath: string, commitHash: string): Promise<void> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			const relativePath = path.relative(this._repositoryPath!, filePath);

			// Get content at the target version
			const content = await this.getFileAtVersion(filePath, commitHash);

			// Create backup of current version
			const backupPath = `${filePath}.backup.${Date.now()}`;
			fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));

			// Write the restored content
			fs.writeFileSync(filePath, content);

			// Stage the changes
			await execAsync(`git add "${relativePath}"`, { cwd: this._repositoryPath! });

			this._output.appendLine(`✅ File restored to version ${commitHash.substring(0, 8)}`);
			this._output.appendLine(`💾 Backup created at: ${backupPath}`);
		} catch (error) {
			this._output.appendLine(`❌ Error restoring file: ${error}`);
			throw error;
		}
	}

	// Create a new version (commit changes)
	async createVersion(filePath: string, message: string): Promise<string> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			const relativePath = path.relative(this._repositoryPath!, filePath);

			// Stage the file
			await execAsync(`git add "${relativePath}"`, { cwd: this._repositoryPath! });

			// Commit the changes
			const { stdout } = await execAsync(
				`git commit -m "${message}"`,
				{ cwd: this._repositoryPath! }
			);

			// Extract commit hash
			const match = stdout.match(/\[(\w+)\s+\w+\]/);
			const commitHash = match ? match[1] : '';

			this._output.appendLine(`✅ Version created: ${commitHash} - ${message}`);
			return commitHash;
		} catch (error) {
			this._output.appendLine(`❌ Error creating version: ${error}`);
			throw error;
		}
	}

	// Get current git status
	async getGitStatus(filePath?: string): Promise<string> {
		if (!this._gitEnabled || !this._repositoryPath) {
			return 'Git not available';
		}

		try {
			const command = filePath
				? `git status --porcelain "${path.relative(this._repositoryPath!, filePath)}"`
				: 'git status --porcelain';

			const { stdout } = await execAsync(command, { cwd: this._repositoryPath! });
			return stdout.trim();
		} catch (error) {
			return `Error: ${error}`;
		}
	}

	// Initialize git repository
	async initializeGitRepository(): Promise<void> {
		if (!this._repositoryPath) {
			throw new Error('No workspace folder found');
		}

		try {
			await execAsync('git init', { cwd: this._repositoryPath! });
			await execAsync('git add .', { cwd: this._repositoryPath! });
			await execAsync('git commit -m "Initial commit"', { cwd: this._repositoryPath! });

			this._gitEnabled = true;
			this._output.appendLine('✅ Git repository initialized');
		} catch (error) {
			this._output.appendLine(`❌ Error initializing git repository: ${error}`);
			throw error;
		}
	}

	// Check if git is enabled
	isGitEnabled(): boolean {
		return this._gitEnabled;
	}

	// Get repository path
	getRepositoryPath(): string | null {
		return this._repositoryPath;
	}

	// Get current branch
	async getCurrentBranch(): Promise<string> {
		if (!this._gitEnabled || !this._repositoryPath) {
			return 'unknown';
		}

		try {
			const { stdout } = await execAsync('git branch --show-current', { cwd: this._repositoryPath! });
			return stdout.trim();
		} catch (error) {
			return 'unknown';
		}
	}

	// Get recent commits
	async getRecentCommits(limit: number = 10): Promise<VersionEntry[]> {
		if (!this._gitEnabled || !this._repositoryPath) {
			return [];
		}

		try {
			const { stdout } = await execAsync(
				`git log --pretty=format:"%H|%an|%ad|%s" --date=iso -n ${limit}`,
				{ cwd: this._repositoryPath! }
			);

			const commits: VersionEntry[] = [];
			const lines = stdout.trim().split('\n');

			for (const line of lines) {
				if (!line) continue;

				const [hash, author, date, message] = line.split('|');
				commits.push({
					hash,
					author,
					date: new Date(date),
					message,
					filePath: '',
					changes: []
				});
			}

			return commits;
		} catch (error) {
			this._output.appendLine(`❌ Error getting recent commits: ${error}`);
			return [];
		}
	}

	// Create a new branch
	async createBranch(branchName: string): Promise<void> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			await execAsync(`git checkout -b "${branchName}"`, { cwd: this._repositoryPath! });
			this._output.appendLine(`✅ Created and switched to branch: ${branchName}`);
		} catch (error) {
			this._output.appendLine(`❌ Error creating branch: ${error}`);
			throw error;
		}
	}

	// Switch to a branch
	async switchBranch(branchName: string): Promise<void> {
		if (!this._gitEnabled || !this._repositoryPath) {
			throw new Error('Git not available');
		}

		try {
			await execAsync(`git checkout "${branchName}"`, { cwd: this._repositoryPath! });
			this._output.appendLine(`✅ Switched to branch: ${branchName}`);
		} catch (error) {
			this._output.appendLine(`❌ Error switching branch: ${error}`);
			throw error;
		}
	}

	// Get all branches
	async getBranches(): Promise<string[]> {
		if (!this._gitEnabled || !this._repositoryPath) {
			return [];
		}

		try {
			const { stdout } = await execAsync('git branch --format="%(refname:short)"', { cwd: this._repositoryPath! });
			return stdout.trim().split('\n').filter(branch => branch.length > 0);
		} catch (error) {
			this._output.appendLine(`❌ Error getting branches: ${error}`);
			return [];
		}
	}
}
