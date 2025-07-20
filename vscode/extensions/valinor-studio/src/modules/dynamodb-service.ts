import * as vscode from 'vscode';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

// Simple unmarshall function for DynamoDB items
function unmarshallDynamoDBItem(item: any): any {
	const result: any = {};
	for (const [key, value] of Object.entries(item)) {
		if (value && typeof value === 'object' && 'S' in value) {
			result[key] = (value as any).S;
		} else if (value && typeof value === 'object' && 'N' in value) {
			result[key] = parseFloat((value as any).N);
		} else if (value && typeof value === 'object' && 'BOOL' in value) {
			result[key] = (value as any).BOOL;
		} else if (value && typeof value === 'object' && 'L' in value) {
			result[key] = (value as any).L.map((item: any) => unmarshallDynamoDBItem(item));
		} else if (value && typeof value === 'object' && 'M' in value) {
			result[key] = unmarshallDynamoDBItem((value as any).M);
		} else {
			result[key] = value;
		}
	}
	return result;
}

interface DynamoDBConfig {
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	tableName: string;
}

interface ContractSearchResult {
	noticeId: string;
	title: string;
	description: string;
	postedDate: string;
	responseDate: string;
	agency: string;
	classificationCode: string;
	setAside: string;
	naicsCode: string;
	pointOfContact: string;
	fullText: string;
}

export class DynamoDBService {
	private client: DynamoDBClient;
	private config: DynamoDBConfig;
	private output: vscode.OutputChannel;

	constructor(output: vscode.OutputChannel) {
		this.output = output;
		this.config = this.getConfig();
		this.client = new DynamoDBClient({
			region: this.config.region,
			credentials: {
				accessKeyId: this.config.accessKeyId,
				secretAccessKey: this.config.secretAccessKey
			}
		});
	}

	private getConfig(): DynamoDBConfig {
		// Use environment variables first, then fall back to VS Code settings
		const region = process.env.AWS_REGION || vscode.workspace.getConfiguration('valinorStudio').get('awsRegion') || 'us-east-1';
		const accessKeyId = process.env.AWS_ACCESS_KEY_ID || vscode.workspace.getConfiguration('valinorStudio').get('awsAccessKeyId') || '';
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || vscode.workspace.getConfiguration('valinorStudio').get('awsSecretAccessKey') || '';

		this.logToTerminal(`🔧 DynamoDB Config - Region: ${region}, Access Key: ${accessKeyId ? 'SET' : 'NOT SET'}`, 'info');

		return {
			region: region,
			accessKeyId: accessKeyId,
			secretAccessKey: secretAccessKey,
			tableName: 'GovContracts' // Use the table with 52,232 contracts
		};
	}

	private logToTerminal(message: string, type: 'info' | 'debug' | 'warning' | 'error' | 'success' = 'info') {
		const timestamp = new Date().toISOString();
		const colors = {
			info: '\x1b[36m',    // Cyan
			debug: '\x1b[35m',   // Magenta
			warning: '\x1b[33m', // Yellow
			error: '\x1b[31m',   // Red
			success: '\x1b[32m'  // Green
		};

		const banner = `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                VALINOR STUDIO                                ║
    ║                              DynamoDB Service                                ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
    `;

		const color = colors[type];
		const reset = '\x1b[0m';
		const logMessage = `${banner}${color}[${timestamp}] [${type.toUpperCase()}] ${message}${reset}`;

		console.log(logMessage);
		this.output.appendLine(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
	}

	async searchContractByNoticeId(noticeId: string): Promise<ContractSearchResult | null> {
		this.logToTerminal(`🔍 Searching DynamoDB GovContracts table for Notice ID: ${noticeId}`, 'info');

		try {
			// First, try exact match search
			const exactResult = await this.exactSearch(noticeId);
			if (exactResult) {
				this.logToTerminal(`✅ Found contract with exact match: ${noticeId}`, 'success');
				return exactResult;
			}

			// If no exact match, try fuzzy search
			this.logToTerminal(`🔍 No exact match found, trying fuzzy search for: ${noticeId}`, 'debug');
			const fuzzyResult = await this.fuzzySearch(noticeId);
			if (fuzzyResult) {
				this.logToTerminal(`✅ Found contract with fuzzy match: ${noticeId}`, 'success');
				return fuzzyResult;
			}

			// If still no match, try solicitation number search
			this.logToTerminal(`🔍 No fuzzy match found, trying solicitation number search for: ${noticeId}`, 'debug');
			const solicitationResult = await this.solicitationNumberSearch(noticeId);
			if (solicitationResult) {
				this.logToTerminal(`✅ Found contract with solicitation number match: ${noticeId}`, 'success');
				return solicitationResult;
			}

			this.logToTerminal(`❌ No contract found in DynamoDB for Notice ID: ${noticeId}`, 'error');
			return null;

		} catch (error) {
			this.logToTerminal(`❌ Error searching DynamoDB: ${error}`, 'error');
			throw error;
		}
	}

	private async exactSearch(noticeId: string): Promise<ContractSearchResult | null> {
		try {
			this.logToTerminal(`🔍 Executing exact match search...`, 'debug');

			// Try different field names for exact match
			const searchFields = ['noticeId', 'notice_id', 'solicitationNumber', 'solicitation_number'];

			for (const field of searchFields) {
				const command = new ScanCommand({
					TableName: this.config.tableName,
					FilterExpression: `#field = :value`,
					ExpressionAttributeNames: {
						'#field': field
					},
					ExpressionAttributeValues: {
						':value': { S: noticeId }
					},
					Limit: 1
				});

				const response = await this.client.send(command);

				if (response.Items && response.Items.length > 0) {
					const item = unmarshallDynamoDBItem(response.Items[0]);
					return this.mapDynamoDBItemToContract(item);
				}
			}

			return null;
		} catch (error) {
			this.logToTerminal(`❌ Error in exact search: ${error}`, 'error');
			throw error;
		}
	}

	private async fuzzySearch(noticeId: string): Promise<ContractSearchResult | null> {
		try {
			this.logToTerminal(`🔍 Executing fuzzy search...`, 'debug');

			// Use contains filter for fuzzy matching
			const command = new ScanCommand({
				TableName: this.config.tableName,
				FilterExpression: `contains(#noticeId, :value) OR contains(#title, :value) OR contains(#description, :value)`,
				ExpressionAttributeNames: {
					'#noticeId': 'noticeId',
					'#title': 'title',
					'#description': 'description'
				},
				ExpressionAttributeValues: {
					':value': { S: noticeId }
				},
				Limit: 10
			});

			const response = await this.client.send(command);

			if (response.Items && response.Items.length > 0) {
				// Find the best match (highest similarity)
				let bestMatch = null;
				let bestScore = 0;

				for (const item of response.Items) {
					const contract = unmarshallDynamoDBItem(item);
					const score = this.calculateSimilarity(noticeId, contract.noticeId || '');

					if (score > bestScore) {
						bestScore = score;
						bestMatch = contract;
					}
				}

				if (bestMatch && bestScore > 0.5) { // 50% similarity threshold
					return this.mapDynamoDBItemToContract(bestMatch);
				}
			}

			return null;
		} catch (error) {
			this.logToTerminal(`❌ Error in fuzzy search: ${error}`, 'error');
			throw error;
		}
	}

	private async solicitationNumberSearch(noticeId: string): Promise<ContractSearchResult | null> {
		try {
			this.logToTerminal(`🔍 Executing solicitation number search...`, 'debug');

			const command = new ScanCommand({
				TableName: this.config.tableName,
				FilterExpression: `contains(#solicitationNumber, :value) OR contains(#fullText, :value)`,
				ExpressionAttributeNames: {
					'#solicitationNumber': 'solicitationNumber',
					'#fullText': 'fullText'
				},
				ExpressionAttributeValues: {
					':value': { S: noticeId }
				},
				Limit: 10
			});

			const response = await this.client.send(command);

			if (response.Items && response.Items.length > 0) {
				// Find the best match
				let bestMatch = null;
				let bestScore = 0;

				for (const item of response.Items) {
					const contract = unmarshallDynamoDBItem(item);
					const score = this.calculateSimilarity(noticeId, contract.solicitationNumber || '');

					if (score > bestScore) {
						bestScore = score;
						bestMatch = contract;
					}
				}

				if (bestMatch && bestScore > 0.5) {
					return this.mapDynamoDBItemToContract(bestMatch);
				}
			}

			return null;
		} catch (error) {
			this.logToTerminal(`❌ Error in solicitation number search: ${error}`, 'error');
			throw error;
		}
	}

	private calculateSimilarity(str1: string, str2: string): number {
		if (!str1 || !str2) return 0;

		const s1 = str1.toLowerCase();
		const s2 = str2.toLowerCase();

		if (s1 === s2) return 1.0;
		if (s1.includes(s2) || s2.includes(s1)) return 0.8;

		// Simple similarity calculation
		const longer = s1.length > s2.length ? s1 : s2;
		const shorter = s1.length > s2.length ? s2 : s1;

		if (longer.length === 0) return 1.0;

		return (longer.length - this.editDistance(longer, shorter)) / longer.length;
	}

	private editDistance(s1: string, s2: string): number {
		const matrix = [];

		for (let i = 0; i <= s2.length; i++) {
			matrix[i] = [i];
		}

		for (let j = 0; j <= s1.length; j++) {
			matrix[0][j] = j;
		}

		for (let i = 1; i <= s2.length; i++) {
			for (let j = 1; j <= s1.length; j++) {
				if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1,
						matrix[i][j - 1] + 1,
						matrix[i - 1][j] + 1
					);
				}
			}
		}

		return matrix[s2.length][s1.length];
	}

	private mapDynamoDBItemToContract(item: any): ContractSearchResult {
		return {
			noticeId: item.noticeId || item.notice_id || '',
			title: item.title || item.solicitationTitle || '',
			description: item.description || item.solicitationDescription || '',
			postedDate: item.postedDate || item.posted_date || item.publishedDate || '',
			responseDate: item.responseDate || item.response_date || item.dueDate || '',
			agency: item.agency || item.contractingOffice || '',
			classificationCode: item.classificationCode || item.classification_code || '',
			setAside: item.setAside || item.set_aside || '',
			naicsCode: item.naicsCode || item.naics_code || '',
			pointOfContact: item.pointOfContact || item.point_of_contact || '',
			fullText: item.fullText || item.full_text || item.description || ''
		};
	}

	async searchContractsByDateRange(startDate: string, endDate: string, limit: number = 1000): Promise<ContractSearchResult[]> {
		this.logToTerminal(`🔍 Searching contracts from ${startDate} to ${endDate}`, 'info');

		try {
			const command = new ScanCommand({
				TableName: this.config.tableName,
				FilterExpression: `#postedDate BETWEEN :startDate AND :endDate`,
				ExpressionAttributeNames: {
					'#postedDate': 'postedDate'
				},
				ExpressionAttributeValues: {
					':startDate': { S: startDate },
					':endDate': { S: endDate }
				},
				Limit: limit
			});

			const response = await this.client.send(command);
			const results: ContractSearchResult[] = [];

			if (response.Items) {
				for (const item of response.Items) {
					const contract = unmarshallDynamoDBItem(item);
					results.push(this.mapDynamoDBItemToContract(contract));
				}
			}

			this.logToTerminal(`✅ Found ${results.length} contracts in date range`, 'success');
			return results;

		} catch (error) {
			this.logToTerminal(`❌ Error searching by date range: ${error}`, 'error');
			throw error;
		}
	}

	async getTableStats(): Promise<{ count: number; tableName: string }> {
		try {
			this.logToTerminal(`🔍 Getting table statistics for: ${this.config.tableName}`, 'info');

			const command = new ScanCommand({
				TableName: this.config.tableName,
				Select: 'COUNT'
			});

			const response = await this.client.send(command);
			const count = response.Count || 0;

			this.logToTerminal(`📊 Table ${this.config.tableName} has ${count} contracts`, 'success');
			return { count, tableName: this.config.tableName };

		} catch (error) {
			this.logToTerminal(`❌ Error getting table stats: ${error}`, 'error');
			throw error;
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			this.logToTerminal(`🔍 Testing DynamoDB connection to table: ${this.config.tableName}`, 'info');

			const stats = await this.getTableStats();
			this.logToTerminal(`✅ DynamoDB connection successful. Table has ${stats.count} contracts`, 'success');
			return true;

		} catch (error) {
			this.logToTerminal(`❌ DynamoDB connection failed: ${error}`, 'error');
			return false;
		}
	}
}
