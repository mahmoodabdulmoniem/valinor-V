import * as vscode from 'vscode';
import * as https from 'https';

export interface APIResponse {
	success: boolean;
	data?: any;
	error?: string;
}

export class APIService {
	private output: vscode.OutputChannel;

	constructor(output: vscode.OutputChannel) {
		this.output = output;
	}

	// Generic HTTPS request function
	private async makeRequest(url: string, options: any = {}): Promise<APIResponse> {
		return new Promise((resolve) => {
			const urlObj = new URL(url);

			const requestOptions = {
				hostname: urlObj.hostname,
				port: urlObj.port || 443,
				path: urlObj.pathname + urlObj.search,
				method: options.method || 'GET',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Valinor-Studio/1.0',
					...options.headers
				}
			};

			const req = https.request(requestOptions, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					try {
						const jsonData = JSON.parse(data);
						resolve({
							success: res.statusCode! >= 200 && res.statusCode! < 300,
							data: jsonData,
							error: res.statusCode! >= 400 ? `HTTP ${res.statusCode}: ${jsonData.message || 'Request failed'}` : undefined
						});
					} catch (error) {
						resolve({
							success: false,
							error: `Failed to parse response: ${error}`
						});
					}
				});
			});

			req.on('error', (error) => {
				resolve({
					success: false,
					error: `Request failed: ${error.message}`
				});
			});

			if (options.body) {
				req.write(JSON.stringify(options.body));
			}

			req.end();
		});
	}

	// Get contract data from external API
	async getContractData(noticeId: string): Promise<APIResponse> {
		try {
			this.output.appendLine(`🔍 Fetching contract data for Notice ID: ${noticeId}`);

			// Example API call - replace with actual endpoint
			const response = await this.makeRequest(`https://api.sam.gov/entity-api/v2/entities?samRegistrationNumber=${noticeId}`, {
				headers: {
					'X-API-KEY': process.env.SAM_API_KEY || ''
				}
			});

			if (response.success) {
				this.output.appendLine(`✅ Contract data retrieved successfully`);
			} else {
				this.output.appendLine(`❌ Failed to retrieve contract data: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.output.appendLine(`❌ Error fetching contract data: ${error}`);
			return {
				success: false,
				error: `Error fetching contract data: ${error}`
			};
		}
	}

	// Get market analysis data
	async getMarketAnalysis(industry: string): Promise<APIResponse> {
		try {
			this.output.appendLine(`📊 Fetching market analysis for: ${industry}`);

			// Example API call - replace with actual endpoint
			const response = await this.makeRequest(`https://api.example.com/market-analysis?industry=${encodeURIComponent(industry)}`);

			if (response.success) {
				this.output.appendLine(`✅ Market analysis retrieved successfully`);
			} else {
				this.output.appendLine(`❌ Failed to retrieve market analysis: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.output.appendLine(`❌ Error fetching market analysis: ${error}`);
			return {
				success: false,
				error: `Error fetching market analysis: ${error}`
			};
		}
	}

	// Get pricing recommendations
	async getPricingRecommendations(contractType: string, budget: number): Promise<APIResponse> {
		try {
			this.output.appendLine(`💰 Fetching pricing recommendations for: ${contractType}`);

			// Example API call - replace with actual endpoint
			const response = await this.makeRequest(`https://api.example.com/pricing?type=${encodeURIComponent(contractType)}&budget=${budget}`);

			if (response.success) {
				this.output.appendLine(`✅ Pricing recommendations retrieved successfully`);
			} else {
				this.output.appendLine(`❌ Failed to retrieve pricing recommendations: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.output.appendLine(`❌ Error fetching pricing recommendations: ${error}`);
			return {
				success: false,
				error: `Error fetching pricing recommendations: ${error}`
			};
		}
	}

	// Get compliance requirements
	async getComplianceRequirements(contractType: string, agency: string): Promise<APIResponse> {
		try {
			this.output.appendLine(`📋 Fetching compliance requirements for: ${contractType} at ${agency}`);

			// Example API call - replace with actual endpoint
			const response = await this.makeRequest(`https://api.example.com/compliance?type=${encodeURIComponent(contractType)}&agency=${encodeURIComponent(agency)}`);

			if (response.success) {
				this.output.appendLine(`✅ Compliance requirements retrieved successfully`);
			} else {
				this.output.appendLine(`❌ Failed to retrieve compliance requirements: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.output.appendLine(`❌ Error fetching compliance requirements: ${error}`);
			return {
				success: false,
				error: `Error fetching compliance requirements: ${error}`
			};
		}
	}

	// Get competitor analysis
	async getCompetitorAnalysis(industry: string, region: string): Promise<APIResponse> {
		try {
			this.output.appendLine(`🏢 Fetching competitor analysis for: ${industry} in ${region}`);

			// Example API call - replace with actual endpoint
			const response = await this.makeRequest(`https://api.example.com/competitors?industry=${encodeURIComponent(industry)}&region=${encodeURIComponent(region)}`);

			if (response.success) {
				this.output.appendLine(`✅ Competitor analysis retrieved successfully`);
			} else {
				this.output.appendLine(`❌ Failed to retrieve competitor analysis: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.output.appendLine(`❌ Error fetching competitor analysis: ${error}`);
			return {
				success: false,
				error: `Error fetching competitor analysis: ${error}`
			};
		}
	}
}
