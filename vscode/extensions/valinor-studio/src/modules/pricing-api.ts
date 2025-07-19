import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { PricingValidationRequest, PricingValidationResponse, HistoricalAward } from './pricing-validation';

export class PricingAPIService {
	private samApiKey: string;
	private usaspendingApiKey: string;
	private output: vscode.OutputChannel;
	private server: any;
	private port: number = 3002;

	constructor(output: vscode.OutputChannel) {
		this.samApiKey = process.env.SAM_API_KEY || '';
		this.usaspendingApiKey = process.env.USASPENDING_API_KEY || '';
		this.output = output;
	}

	// Start the API server
	async startServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server = http.createServer(async (req, res) => {
				try {
					await this.handleRequest(req, res);
				} catch (error) {
					this.output.appendLine(`❌ API Server Error: ${error}`);
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Internal server error' }));
				}
			});

			this.server.listen(this.port, () => {
				this.output.appendLine(`[INFO] Pricing API server started on port ${this.port}`);
				resolve();
			});

			this.server.on('error', (error: any) => {
				if (error.code === 'EADDRINUSE') {
					this.port++;
					this.server.listen(this.port);
				} else {
					reject(error);
				}
			});
		});
	}

	// Stop the API server
	stopServer(): void {
		if (this.server) {
			this.server.close();
			this.output.appendLine('🛑 Pricing API server stopped');
		}
	}

	// Handle incoming requests
	private async handleRequest(req: any, res: any): Promise<void> {
		// Enable CORS
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		if (req.method === 'OPTIONS') {
			res.writeHead(200);
			res.end();
			return;
		}

		// Parse URL
		const url = new URL(req.url, `http://localhost:${this.port}`);
		const path = url.pathname;

		if (path === '/api/pricing/validate' && req.method === 'GET') {
			await this.handlePricingValidation(req, res, url);
		} else if (path === '/api/pricing/batch' && req.method === 'POST') {
			await this.handleBatchPricingValidation(req, res);
		} else if (path === '/api/pricing/health' && req.method === 'GET') {
			await this.handleHealthCheck(req, res);
		} else {
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Endpoint not found' }));
		}
	}

	// Handle pricing validation request
	private async handlePricingValidation(req: any, res: any, url: URL): Promise<void> {
		try {
			const item = url.searchParams.get('item');
			const unitPrice = url.searchParams.get('unit_price');
			const naicsCode = url.searchParams.get('naics');

			if (!item || !unitPrice) {
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					error: 'Missing required parameters: item and unit_price'
				}));
				return;
			}

			const request: PricingValidationRequest = {
				item: decodeURIComponent(item),
				unitPrice: parseFloat(unitPrice),
				naicsCode: naicsCode ? decodeURIComponent(naicsCode) : undefined
			};

			this.output.appendLine(`[INFO] API: Validating pricing for ${request.item} at $${request.unitPrice}`);

			const response = await this.validatePricing(request);

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(response));

		} catch (error) {
			this.output.appendLine(`❌ Pricing validation API error: ${error}`);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				error: 'Pricing validation failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			}));
		}
	}

	// Handle batch pricing validation
	private async handleBatchPricingValidation(req: any, res: any): Promise<void> {
		try {
			let body = '';
			req.on('data', (chunk: any) => {
				body += chunk.toString();
			});

			req.on('end', async () => {
				try {
					const requests: PricingValidationRequest[] = JSON.parse(body);

					if (!Array.isArray(requests)) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Expected array of pricing requests' }));
						return;
					}

					this.output.appendLine(`[INFO] API: Batch validating ${requests.length} pricing entries`);

					const results = await Promise.all(
						requests.map(request => this.validatePricing(request))
					);

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ results }));

				} catch (parseError) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
				}
			});

		} catch (error) {
			this.output.appendLine(`❌ Batch pricing validation API error: ${error}`);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				error: 'Batch pricing validation failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			}));
		}
	}

	// Handle health check
	private async handleHealthCheck(req: any, res: any): Promise<void> {
		const health = {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			services: {
				sam: this.samApiKey ? 'configured' : 'not_configured',
				usaspending: this.usaspendingApiKey ? 'configured' : 'not_configured'
			}
		};

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(health));
	}

	// Main validation method
	private async validatePricing(request: PricingValidationRequest): Promise<PricingValidationResponse> {
		try {
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

	// Get server URL for client requests
	getServerUrl(): string {
		return `http://localhost:${this.port}`;
	}
}
