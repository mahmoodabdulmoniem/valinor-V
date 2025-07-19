import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

export interface PricingValidationRequest {
	item: string;
	unitPrice: number;
	naicsCode?: string;
	quantity?: number;
}

export interface PricingValidationResponse {
	submittedPrice: number;
	historicAvg: number;
	historicMin: number;
	historicMax: number;
	variance: string;
	variancePercent: number;
	isWithinRange: boolean;
	confidence: 'high' | 'medium' | 'low';
	sampleSize: number;
	lastUpdated: string;
	sources: string[];
	warnings?: string[];
}

export interface HistoricalAward {
	awardId: string;
	awardAmount: number;
	unitPrice: number;
	awardDate: string;
	awardee: string;
	contractingAgency: string;
	naicsCode: string;
	itemDescription: string;
}

export class PricingValidationService {
	private samApiKey: string;
	private usaspendingApiKey: string;
	private output: vscode.OutputChannel;

	constructor(output: vscode.OutputChannel) {
		this.samApiKey = process.env.SAM_API_KEY || '';
		this.usaspendingApiKey = process.env.USASPENDING_API_KEY || '';
		this.output = output;
	}

	// Main validation method
	async validatePricing(request: PricingValidationRequest): Promise<PricingValidationResponse> {
		try {
			this.output.appendLine(`🔍 Validating pricing for item: ${request.item} at $${request.unitPrice}`);

			// Get historical data from multiple sources
			const [samData, usaspendingData] = await Promise.all([
				this.getSAMHistoricalData(request),
				this.getUSASpendingHistoricalData(request)
			]);

			// Combine and analyze data
			const allHistoricalData = [...samData, ...usaspendingData];

			if (allHistoricalData.length === 0) {
				return this.createNoDataResponse(request.unitPrice);
			}

			// Calculate statistics
			const stats = this.calculatePricingStatistics(allHistoricalData, request.unitPrice);

			// Determine confidence level
			const confidence = this.determineConfidenceLevel(allHistoricalData);

			// Generate warnings
			const warnings = this.generateWarnings(stats, request);

			return {
				submittedPrice: request.unitPrice,
				historicAvg: stats.average,
				historicMin: stats.min,
				historicMax: stats.max,
				variance: stats.variance,
				variancePercent: stats.variancePercent,
				isWithinRange: stats.isWithinRange,
				confidence,
				sampleSize: allHistoricalData.length,
				lastUpdated: new Date().toISOString(),
				sources: ['SAM.gov', 'USAspending.gov'],
				warnings
			};

		} catch (error) {
			this.output.appendLine(`❌ Pricing validation error: ${error}`);
			throw new Error(`Pricing validation failed: ${error}`);
		}
	}

	// Get historical data from SAM.gov
	private async getSAMHistoricalData(request: PricingValidationRequest): Promise<HistoricalAward[]> {
		if (!this.samApiKey) {
			this.output.appendLine('⚠️ SAM API key not configured');
			return [];
		}

		try {
			const naicsCode = request.naicsCode || this.getNAICSCodeFromItem(request.item);
			const url = new URL('https://api.sam.gov/contracts/v1/contracts');
			url.searchParams.set('fields', 'awardee,baseAndAllOptionsValue,awardingAgency,naics,contractAwardDate,contractAwardDateSigned,contractAwardDateEffective');
			url.searchParams.set('naics', naicsCode);
			url.searchParams.set('limit', '50');
			url.searchParams.set('api_key', this.samApiKey);

			const response = await this.makeHttpRequest(url.toString());
			const data = JSON.parse(response);

			if (!data.contractData || !Array.isArray(data.contractData)) {
				return [];
			}

			return data.contractData
				.filter((contract: any) => contract.baseAndAllOptionsValue > 0)
				.map((contract: any) => ({
					awardId: contract.contractId || contract.id,
					awardAmount: parseFloat(contract.baseAndAllOptionsValue),
					unitPrice: this.estimateUnitPrice(contract.baseAndAllOptionsValue, request.item),
					awardDate: contract.contractAwardDate || contract.contractAwardDateSigned || contract.contractAwardDateEffective,
					awardee: contract.awardee || 'Unknown',
					contractingAgency: contract.awardingAgency || 'Unknown',
					naicsCode: contract.naics || naicsCode,
					itemDescription: request.item
				}))
				.filter((award: HistoricalAward) => award.unitPrice > 0);

		} catch (error) {
			this.output.appendLine(`❌ SAM.gov API error: ${error}`);
			return [];
		}
	}

	// Get historical data from USAspending.gov
	private async getUSASpendingHistoricalData(request: PricingValidationRequest): Promise<HistoricalAward[]> {
		try {
			const naicsCode = request.naicsCode || this.getNAICSCodeFromItem(request.item);

			const requestBody = {
				filters: {
					naics_codes: [naicsCode],
					time_period: [
						{
							start_date: this.getDateTwoYearsAgo(),
							end_date: new Date().toISOString().split('T')[0]
						}
					],
					award_type_codes: ['A', 'B', 'C', 'D'] // Contract awards
				},
				fields: [
					'award_id',
					'total_obligation',
					'period_of_performance_start_date',
					'recipient_name',
					'awarding_agency_name',
					'naics_code',
					'naics_description'
				],
				page: 1,
				limit: 100,
				sort: 'total_obligation',
				order: 'desc'
			};

			const response = await this.makeHttpRequest(
				'https://api.usaspending.gov/api/v2/search/spending_by_award',
				'POST',
				JSON.stringify(requestBody),
				{ 'Content-Type': 'application/json' }
			);

			const data = JSON.parse(response);

			if (!data.results || !Array.isArray(data.results)) {
				return [];
			}

			return data.results
				.filter((award: any) => award.total_obligation > 0)
				.map((award: any) => ({
					awardId: award.award_id,
					awardAmount: parseFloat(award.total_obligation),
					unitPrice: this.estimateUnitPrice(award.total_obligation, request.item),
					awardDate: award.period_of_performance_start_date,
					awardee: award.recipient_name || 'Unknown',
					contractingAgency: award.awarding_agency_name || 'Unknown',
					naicsCode: award.naics_code || naicsCode,
					itemDescription: request.item
				}))
				.filter((award: HistoricalAward) => award.unitPrice > 0);

		} catch (error) {
			this.output.appendLine(`❌ USAspending.gov API error: ${error}`);
			return [];
		}
	}

	// Calculate pricing statistics
	private calculatePricingStatistics(data: HistoricalAward[], submittedPrice: number) {
		const prices = data.map(award => award.unitPrice).filter(price => price > 0);

		if (prices.length === 0) {
			return {
				average: 0,
				min: 0,
				max: 0,
				variance: '0%',
				variancePercent: 0,
				isWithinRange: true
			};
		}

		const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
		const min = Math.min(...prices);
		const max = Math.max(...prices);
		const variancePercent = ((submittedPrice - average) / average) * 100;
		const variance = `${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(2)}%`;
		const isWithinRange = submittedPrice >= min && submittedPrice <= max;

		return {
			average: parseFloat(average.toFixed(2)),
			min: parseFloat(min.toFixed(2)),
			max: parseFloat(max.toFixed(2)),
			variance,
			variancePercent: parseFloat(variancePercent.toFixed(2)),
			isWithinRange
		};
	}

	// Determine confidence level based on data quality
	private determineConfidenceLevel(data: HistoricalAward[]): 'high' | 'medium' | 'low' {
		if (data.length >= 20) return 'high';
		if (data.length >= 10) return 'medium';
		return 'low';
	}

	// Generate warnings based on pricing analysis
	private generateWarnings(stats: any, request: PricingValidationRequest): string[] {
		const warnings: string[] = [];

		if (!stats.isWithinRange) {
			warnings.push(`Price is outside historical range ($${stats.min} - $${stats.max})`);
		}

		if (Math.abs(stats.variancePercent) > 50) {
			warnings.push(`Price variance is ${Math.abs(stats.variancePercent).toFixed(1)}% from historical average`);
		}

		if (stats.variancePercent > 100) {
			warnings.push('Price is more than double the historical average');
		}

		if (stats.variancePercent < -50) {
			warnings.push('Price is significantly below historical average - may be underpriced');
		}

		return warnings;
	}

	// Create response when no historical data is available
	private createNoDataResponse(submittedPrice: number): PricingValidationResponse {
		return {
			submittedPrice,
			historicAvg: 0,
			historicMin: 0,
			historicMax: 0,
			variance: '0%',
			variancePercent: 0,
			isWithinRange: true,
			confidence: 'low',
			sampleSize: 0,
			lastUpdated: new Date().toISOString(),
			sources: [],
			warnings: ['No historical pricing data available for comparison']
		};
	}

	// Estimate unit price from total award amount
	private estimateUnitPrice(totalAmount: number, item: string): number {
		const quantity = this.extractQuantityFromItem(item) || 1;
		return totalAmount / quantity;
	}

	// Extract quantity from item description
	private extractQuantityFromItem(item: string): number | null {
		const quantityMatch = item.match(/(\d+)\s*(count|units?|pieces?|items?)/i);
		return quantityMatch ? parseInt(quantityMatch[1]) : null;
	}

	// Get NAICS code from item description
	private getNAICSCodeFromItem(item: string): string {
		const itemLower = item.toLowerCase();

		if (itemLower.includes('fiber') || itemLower.includes('optic')) {
			return '517311'; // Telecommunications Resellers
		}
		if (itemLower.includes('software') || itemLower.includes('it')) {
			return '541511'; // Custom Computer Programming Services
		}
		if (itemLower.includes('construction') || itemLower.includes('building')) {
			return '236220'; // Commercial Building Construction
		}

		return '517311'; // Default to Telecommunications
	}

	// Get date from two years ago
	private getDateTwoYearsAgo(): string {
		const date = new Date();
		date.setFullYear(date.getFullYear() - 2);
		return date.toISOString().split('T')[0];
	}

	// Make HTTP request with proper error handling
	private makeHttpRequest(url: string, method: string = 'GET', body?: string, headers?: any): Promise<string> {
		return new Promise((resolve, reject) => {
			const urlObj = new URL(url);
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method,
				headers: {
					'User-Agent': 'Valinor-Studio/1.0',
					...headers
				}
			};

			const client = urlObj.protocol === 'https:' ? https : http;
			const req = client.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => data += chunk);
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve(data);
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${data}`));
					}
				});
			});

			req.on('error', reject);
			if (body) {
				req.write(body);
			}
			req.end();
		});
	}
}

// VS Code extension integration with hover functionality
export class PricingValidationProvider {
	private service: PricingValidationService;
	private decorations: vscode.TextEditorDecorationType[] = [];
	private hoverProvider!: vscode.HoverProvider;
	private codeActionProvider!: vscode.CodeActionProvider;
	private validationCache: Map<string, PricingValidationResponse> = new Map();

	constructor(output: vscode.OutputChannel) {
		this.service = new PricingValidationService(output);
		this.createDecorations();
		this.createHoverProvider();
		this.createCodeActionProvider();
	}

	// Create decoration types for pricing validation
	private createDecorations() {
		this.decorations = [
			// Good price (green)
			vscode.window.createTextEditorDecorationType({
				backgroundColor: new vscode.ThemeColor('charts.green'),
				color: new vscode.ThemeColor('charts.green'),
				after: {
					contentText: ' ✓',
					color: new vscode.ThemeColor('charts.green')
				}
			}),
			// Warning price (yellow)
			vscode.window.createTextEditorDecorationType({
				backgroundColor: new vscode.ThemeColor('charts.orange'),
				color: new vscode.ThemeColor('charts.orange'),
				after: {
					contentText: ' ⚠',
					color: new vscode.ThemeColor('charts.orange')
				}
			}),
			// Bad price (red)
			vscode.window.createTextEditorDecorationType({
				backgroundColor: new vscode.ThemeColor('charts.red'),
				color: new vscode.ThemeColor('charts.red'),
				after: {
					contentText: ' ✗',
					color: new vscode.ThemeColor('charts.red')
				}
			}),
			// Validate icon (blue)
			vscode.window.createTextEditorDecorationType({
				after: {
					contentText: ' 🔍',
					color: new vscode.ThemeColor('charts.blue'),
					margin: '0 0 0 5px'
				}
			})
		];
	}

	// Create hover provider for pricing validation
	private createHoverProvider() {
		this.hoverProvider = {
			provideHover: async (document, position, token) => {
				const pricingInfo = this.extractPricingInfo(document.lineAt(position.line).text, position.character);
				if (!pricingInfo) {
					return null;
				}

				// Check cache first
				const cacheKey = `${pricingInfo.item}-${pricingInfo.unitPrice}`;
				let validationResult = this.validationCache.get(cacheKey);

				if (!validationResult) {
					// Show loading hover
					const loadingHover = new vscode.Hover([
						'**Pricing Validation**',
						'*Loading market data...*',
						'Click 🔍 to validate pricing'
					]);
					return loadingHover;
				}

				// Create hover content based on validation result
				const hoverContent = this.createHoverContent(validationResult);
				return new vscode.Hover(hoverContent);
			}
		};
	}

	// Create code action provider for validate button
	private createCodeActionProvider() {
		this.codeActionProvider = {
			provideCodeActions: (document, range, context, token) => {
				const line = document.lineAt(range.start.line);
				const pricingInfo = this.extractPricingInfo(line.text, range.start.character);

				if (!pricingInfo) {
					return [];
				}

				const validateAction = new vscode.CodeAction(
					'🔍 Validate Pricing',
					vscode.CodeActionKind.QuickFix
				);
				validateAction.command = {
					command: 'valinorStudio.validatePricingAtPosition',
					title: 'Validate Pricing',
					arguments: [pricingInfo, document.uri, range.start]
				};

				return [validateAction];
			}
		};
	}

	// Create hover content for pricing validation
	private createHoverContent(result: PricingValidationResponse): vscode.MarkdownString[] {
		const content: vscode.MarkdownString[] = [];

		// Header
		const header = new vscode.MarkdownString();
		header.appendMarkdown(`**💰 Pricing Validation**\n\n`);
		content.push(header);

		// Price comparison
		const priceInfo = new vscode.MarkdownString();
		priceInfo.appendMarkdown(`**Submitted Price:** $${result.submittedPrice}\n`);
		priceInfo.appendMarkdown(`**Market Average:** $${result.historicAvg}\n`);
		priceInfo.appendMarkdown(`**Market Range:** $${result.historicMin} - $${result.historicMax}\n`);
		priceInfo.appendMarkdown(`**Variance:** ${result.variance}\n\n`);
		content.push(priceInfo);

		// Confidence and sample size
		const confidenceInfo = new vscode.MarkdownString();
		const confidenceColor = result.confidence === 'high' ? '🟢' : result.confidence === 'medium' ? '🟡' : '🔴';
		confidenceInfo.appendMarkdown(`${confidenceColor} **Confidence:** ${result.confidence.toUpperCase()} (${result.sampleSize} contracts)\n\n`);
		content.push(confidenceInfo);

		// Warnings or success message
		if (result.warnings && result.warnings.length > 0) {
			const warningInfo = new vscode.MarkdownString();
			warningInfo.appendMarkdown(`⚠️ **Warnings:**\n`);
			result.warnings.forEach(warning => {
				warningInfo.appendMarkdown(`• ${warning}\n`);
			});
			warningInfo.appendMarkdown(`\n`);
			content.push(warningInfo);
		} else {
			const successInfo = new vscode.MarkdownString();
			successInfo.appendMarkdown(`✅ **Price appears competitive**\n\n`);
			content.push(successInfo);
		}

		// Data sources
		const sourcesInfo = new vscode.MarkdownString();
		sourcesInfo.appendMarkdown(`**Data Sources:** ${result.sources.join(', ')}\n`);
		sourcesInfo.appendMarkdown(`**Last Updated:** ${new Date(result.lastUpdated).toLocaleString()}\n`);
		content.push(sourcesInfo);

		return content;
	}

	// Register commands and providers
	registerCommands(context: vscode.ExtensionContext) {
		// Register the main section generation command
		const validateCommand = vscode.commands.registerCommand(
			'valinorStudio.validatePricing',
			() => this.validatePricingAtCursor()
		);

		// Register validate at position command
		const validateAtPositionCommand = vscode.commands.registerCommand(
			'valinorStudio.validatePricingAtPosition',
			(pricingInfo: any, uri: vscode.Uri, position: vscode.Position) => {
				this.validatePricingAtPosition(pricingInfo, uri, position);
			}
		);

		// Register validate all pricing command
		const validateAllCommand = vscode.commands.registerCommand(
			'valinorStudio.validateAllPricing',
			() => this.validateAllPricing()
		);

		// Register hover provider
		const hoverRegistration = vscode.languages.registerHoverProvider(
			{ pattern: '**/*.{md,txt,json}' },
			this.hoverProvider
		);

		// Register code action provider
		const codeActionRegistration = vscode.languages.registerCodeActionsProvider(
			{ pattern: '**/*.{md,txt,json}' },
			this.codeActionProvider,
			{
				providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
			}
		);

		context.subscriptions.push(
			validateCommand,
			validateAtPositionCommand,
			validateAllCommand,
			hoverRegistration,
			codeActionRegistration
		);
	}

	// Validate pricing at current cursor position
	async validatePricingAtCursor() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const position = editor.selection.active;
		const line = editor.document.lineAt(position.line);
		const pricingInfo = this.extractPricingInfo(line.text, position.character);

		if (!pricingInfo) {
			vscode.window.showErrorMessage('No pricing information found at cursor position');
			return;
		}

		await this.validatePricingAtPosition(pricingInfo, editor.document.uri, position);
	}

	// Validate pricing at specific position
	async validatePricingAtPosition(pricingInfo: any, uri: vscode.Uri, position: vscode.Position) {
		try {
			// Show progress
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `Validating pricing for ${pricingInfo.item}...`,
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0 });

				const request = {
					item: pricingInfo.item,
					unitPrice: pricingInfo.unitPrice
				};

				progress.report({ increment: 50 });

				const response = await this.service.validatePricing(request);

				progress.report({ increment: 100 });

				// Cache the result
				const cacheKey = `${pricingInfo.item}-${pricingInfo.unitPrice}`;
				this.validationCache.set(cacheKey, response);

				// Apply decoration
				this.applyDecoration(uri, position, response);

				// Show notification
				this.showValidationNotification(response);

				// Trigger hover refresh
				vscode.commands.executeCommand('editor.action.showHover');
			});

		} catch (error) {
			vscode.window.showErrorMessage(`Pricing validation failed: ${error}`);
		}
	}

	// Validate all pricing in the document
	async validateAllPricing() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const document = editor.document;
		const pricingInfos: Array<{ info: any; position: vscode.Position }> = [];

		// Find all pricing information in the document
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const matches = this.findAllPricingMatches(line.text);

			matches.forEach(match => {
				pricingInfos.push({
					info: match,
					position: new vscode.Position(i, match.startIndex)
				});
			});
		}

		if (pricingInfos.length === 0) {
			vscode.window.showInformationMessage('No pricing information found in document');
			return;
		}

		// Show progress and validate all pricing
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Validating ${pricingInfos.length} pricing entries...`,
			cancellable: false
		}, async (progress) => {
			for (let i = 0; i < pricingInfos.length; i++) {
				const { info, position } = pricingInfos[i];
				progress.report({ increment: 100 / pricingInfos.length, message: `Validating ${info.item}...` });

				await this.validatePricingAtPosition(info, document.uri, position);
				await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
			}
		});

		vscode.window.showInformationMessage(`✅ Validated ${pricingInfos.length} pricing entries`);
	}

	// Extract pricing information from text
	private extractPricingInfo(text: string, cursorPosition: number): any {
		// Enhanced patterns to match various pricing formats
		const patterns = [
			// Standard pricing patterns
			/(?:item|product|service):\s*([^,\n]+?)(?:,\s*price|,\s*cost|:\s*\$):\s*\$?(\d+\.?\d*)/gi,
			/([^,\n]+?)\s*\$(\d+\.?\d*)/gi,
			/\$(\d+\.?\d*)\s*for\s*([^,\n]+)/gi,
			// Unit pricing patterns
			/\$(\d+\.?\d*)\s*\/\s*(unit|piece|item|count)/gi,
			/(\d+\.?\d*)\s*\/\s*(unit|piece|item|count)\s*@\s*\$(\d+\.?\d*)/gi,
			// Line item patterns
			/([^,\n]+?)\s*@\s*\$(\d+\.?\d*)/gi,
			// Quantity and price patterns
			/(\d+)\s*x\s*\$(\d+\.?\d*)/gi,
			/(\d+)\s*units?\s*@\s*\$(\d+\.?\d*)/gi
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				const startIndex = match.index;
				const endIndex = startIndex + match[0].length;

				if (cursorPosition >= startIndex && cursorPosition <= endIndex) {
					return {
						item: match[1] || match[2] || 'Unknown Item',
						unitPrice: parseFloat(match[2] || match[1] || match[3]),
						startIndex,
						endIndex,
						fullMatch: match[0]
					};
				}
			}
		}

		return null;
	}

	// Find all pricing matches in text
	private findAllPricingMatches(text: string): any[] {
		const patterns = [
			/(?:item|product|service):\s*([^,\n]+?)(?:,\s*price|,\s*cost|:\s*\$):\s*\$?(\d+\.?\d*)/gi,
			/([^,\n]+?)\s*\$(\d+\.?\d*)/gi,
			/\$(\d+\.?\d*)\s*for\s*([^,\n]+)/gi,
			/\$(\d+\.?\d*)\s*\/\s*(unit|piece|item|count)/gi,
			/(\d+\.?\d*)\s*\/\s*(unit|piece|item|count)\s*@\s*\$(\d+\.?\d*)/gi,
			/([^,\n]+?)\s*@\s*\$(\d+\.?\d*)/gi,
			/(\d+)\s*x\s*\$(\d+\.?\d*)/gi,
			/(\d+)\s*units?\s*@\s*\$(\d+\.?\d*)/gi
		];

		const matches: any[] = [];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				matches.push({
					item: match[1] || match[2] || 'Unknown Item',
					unitPrice: parseFloat(match[2] || match[1] || match[3]),
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					fullMatch: match[0]
				});
			}
		}

		return matches;
	}

	// Apply decoration to the editor
	private applyDecoration(uri: vscode.Uri, position: vscode.Position, response: PricingValidationResponse) {
		const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
		if (!editor) {
			return;
		}

		const range = new vscode.Range(position, position.translate(0, 1));

		// Clear existing decorations
		this.decorations.forEach(decoration => {
			editor.setDecorations(decoration, []);
		});

		// Apply appropriate decoration
		let decorationIndex = 0; // Default to good

		if (response.warnings && response.warnings.length > 0) {
			if (response.variancePercent > 50 || !response.isWithinRange) {
				decorationIndex = 2; // Bad (red)
			} else {
				decorationIndex = 1; // Warning (yellow)
			}
		}

		editor.setDecorations(this.decorations[decorationIndex], [range]);
	}

	// Show validation notification
	private showValidationNotification(response: PricingValidationResponse) {
		const message = `Pricing Validation: $${response.submittedPrice} (${response.variance} from avg)`;

		if (response.warnings && response.warnings.length > 0) {
			vscode.window.showWarningMessage(message, 'View Details').then(selection => {
				if (selection === 'View Details') {
					this.showDetailedValidationInfo(response);
				}
			});
		} else {
			vscode.window.showInformationMessage(message);
		}
	}

	// Show detailed validation information
	private showDetailedValidationInfo(response: PricingValidationResponse) {
		const panel = vscode.window.createWebviewPanel(
			'pricingValidation',
			'Pricing Validation Details',
			vscode.ViewColumn.One,
			{}
		);

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
					.header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
					.stat { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
					.warning { color: #d73a49; background: #ffeef0; padding: 10px; border-radius: 5px; margin: 10px 0; }
					.success { color: #28a745; background: #f0fff4; padding: 10px; border-radius: 5px; margin: 10px 0; }
					.confidence { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; }
					.confidence.high { background: #28a745; }
					.confidence.medium { background: #ffc107; }
					.confidence.low { background: #dc3545; }
				</style>
			</head>
			<body>
				<div class="header">Pricing Validation Results</div>

				<div class="stat">
					<strong>Submitted Price:</strong> $${response.submittedPrice}
				</div>

				<div class="stat">
					<strong>Historical Average:</strong> $${response.historicAvg}
				</div>

				<div class="stat">
					<strong>Historical Range:</strong> $${response.historicMin} - $${response.historicMax}
				</div>

				<div class="stat">
					<strong>Variance:</strong> ${response.variance}
				</div>

				<div class="stat">
					<strong>Confidence:</strong>
					<span class="confidence ${response.confidence}">${response.confidence.toUpperCase()}</span>
				</div>

				<div class="stat">
					<strong>Sample Size:</strong> ${response.sampleSize} contracts
				</div>

				<div class="stat">
					<strong>Data Sources:</strong> ${response.sources.join(', ')}
				</div>

				${response.warnings && response.warnings.length > 0 ?
				`<div class="warning">
						<strong>Warnings:</strong><br>
						${response.warnings.map(w => `• ${w}`).join('<br>')}
					</div>` :
				'<div class="success"><strong>✓ Price appears to be within normal range</strong></div>'
			}

				<div class="stat">
					<strong>Last Updated:</strong> ${new Date(response.lastUpdated).toLocaleString()}
				</div>
			</body>
			</html>
		`;

		panel.webview.html = html;
	}
}
