import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PricingData {
	item: string;
	proposedPrice: number;
	unit: string;
	category: string;
	quantity?: number;
	totalPrice?: number;
	justification?: string;
}

export interface MarketData {
	item: string;
	averagePrice: number;
	range: { min: number; max: number };
	source: string;
	lastUpdated: string;
	confidence: 'high' | 'medium' | 'low';
}

export interface PricingAnalysis {
	proposedPricing: PricingData[];
	marketComparison: {
		item: string;
		proposedPrice: number;
		marketAverage: number;
		marketRange: { min: number; max: number };
		percentageDiff: number;
		recommendation: 'competitive' | 'high' | 'low' | 'unknown';
	}[];
	summary: {
		totalProposed: number;
		totalMarket: number;
		overallCompetitiveness: number;
		riskLevel: 'low' | 'medium' | 'high';
		recommendations: string[];
	};
}

export interface PricingValidationResult {
	valid: boolean;
	issues: string[];
	warnings: string[];
	suggestions: string[];
	marketData?: MarketData[];
}

export class PricingAnalyzer {
	private _output: vscode.OutputChannel;
	private _marketData: Map<string, MarketData> = new Map();

	constructor(output: vscode.OutputChannel) {
		this._output = output;
		this.initializeMarketData();
	}

	private initializeMarketData(): void {
		// Initialize with sample market data
		// In a real implementation, this would come from external APIs or databases

		// Labor categories
		this._marketData.set('senior-developer', {
			item: 'Senior Software Developer',
			averagePrice: 125,
			range: { min: 100, max: 150 },
			source: 'GSA Schedule 70',
			lastUpdated: '2024-01-15',
			confidence: 'high'
		});

		this._marketData.set('project-manager', {
			item: 'Project Manager',
			averagePrice: 150,
			range: { min: 120, max: 180 },
			source: 'GSA Schedule 70',
			lastUpdated: '2024-01-15',
			confidence: 'high'
		});

		this._marketData.set('security-specialist', {
			item: 'Security Specialist',
			averagePrice: 140,
			range: { min: 110, max: 170 },
			source: 'GSA Schedule 70',
			lastUpdated: '2024-01-15',
			confidence: 'high'
		});

		// Hardware and software
		this._marketData.set('server-hardware', {
			item: 'Server Hardware',
			averagePrice: 5000,
			range: { min: 3000, max: 8000 },
			source: 'GSA IT Schedule 70',
			lastUpdated: '2024-01-15',
			confidence: 'medium'
		});

		this._marketData.set('cloud-services', {
			item: 'Cloud Services (Monthly)',
			averagePrice: 2000,
			range: { min: 1000, max: 5000 },
			source: 'AWS/Azure Pricing',
			lastUpdated: '2024-01-15',
			confidence: 'high'
		});

		// Services
		this._marketData.set('consulting-hourly', {
			item: 'Consulting Services (Hourly)',
			averagePrice: 180,
			range: { min: 120, max: 250 },
			source: 'Industry Survey',
			lastUpdated: '2024-01-15',
			confidence: 'medium'
		});

		this._marketData.set('training-per-day', {
			item: 'Training Services (Per Day)',
			averagePrice: 2500,
			range: { min: 1800, max: 3500 },
			source: 'Training Industry Report',
			lastUpdated: '2024-01-15',
			confidence: 'medium'
		});
	}

	public async analyzePricing(prices: string[]): Promise<PricingAnalysis> {
		this._output.appendLine(`💲 Starting pricing analysis for ${prices.length} items`);

		try {
			// Parse pricing data from strings
			const proposedPricing = this.parsePricingData(prices);

			// Perform market comparison
			const marketComparison = this.performMarketComparison(proposedPricing);

			// Generate summary
			const summary = this.generateSummary(proposedPricing, marketComparison);

			const analysis: PricingAnalysis = {
				proposedPricing,
				marketComparison,
				summary
			};

			this._output.appendLine(`✅ Pricing analysis completed`);
			this._output.appendLine(`📊 Overall competitiveness: ${summary.overallCompetitiveness}%`);
			this._output.appendLine(`⚠️ Risk level: ${summary.riskLevel}`);

			return analysis;

		} catch (error) {
			this._output.appendLine(`❌ Error during pricing analysis: ${error}`);
			throw error;
		}
	}

	public async validatePricingAtPosition(lineNumber: number, lineText: string): Promise<PricingValidationResult> {
		this._output.appendLine(`🔍 Validating pricing at line ${lineNumber + 1}`);

		try {
			// Extract pricing information from the line
			const pricingInfo = this.extractPricingFromLine(lineText);

			if (!pricingInfo) {
				return {
					valid: false,
					issues: ['No pricing information found on this line'],
					warnings: [],
					suggestions: ['Add pricing information in format: $X,XXX or $X,XXX/hour']
				};
			}

			// Validate the pricing
			const validation = await this.validatePricingData([pricingInfo]);

			this._output.appendLine(`✅ Pricing validation completed for line ${lineNumber + 1}`);

			return validation;

		} catch (error) {
			this._output.appendLine(`❌ Error during pricing validation: ${error}`);
			throw error;
		}
	}

	private parsePricingData(prices: string[]): PricingData[] {
		const pricingData: PricingData[] = [];

		for (const price of prices) {
			const parsed = this.parsePriceString(price);
			if (parsed) {
				pricingData.push(parsed);
			}
		}

		return pricingData;
	}

	private parsePriceString(priceString: string): PricingData | null {
		// Extract price patterns
		const pricePatterns = [
			/\$([\d,]+(?:\.\d{2})?)/g,
			/(\d+(?:\.\d{2})?)\s*(?:dollars?|USD)/gi,
			/(\d+(?:\.\d{2})?)\s*per\s*(hour|day|month|year)/gi
		];

		for (const pattern of pricePatterns) {
			const matches = priceString.match(pattern);
			if (matches) {
				const price = parseFloat(matches[0].replace(/[$,]/g, ''));
				if (!isNaN(price)) {
					return {
						item: this.extractItemName(priceString),
						proposedPrice: price,
						unit: this.extractUnit(priceString),
						category: this.categorizeItem(priceString),
						justification: 'Proposed pricing'
					};
				}
			}
		}

		return null;
	}

	private extractItemName(text: string): string {
		// Try to extract item name from context
		const words = text.split(/\s+/);
		const priceIndex = words.findIndex(word => word.includes('$') || /^\d+/.test(word));

		if (priceIndex > 0) {
			return words.slice(0, priceIndex).join(' ').trim();
		}

		return 'Unspecified Item';
	}

	private extractUnit(text: string): string {
		const lowerText = text.toLowerCase();

		if (lowerText.includes('per hour') || lowerText.includes('/hour')) {
			return 'hour';
		} else if (lowerText.includes('per day') || lowerText.includes('/day')) {
			return 'day';
		} else if (lowerText.includes('per month') || lowerText.includes('/month')) {
			return 'month';
		} else if (lowerText.includes('per year') || lowerText.includes('/year')) {
			return 'year';
		} else if (lowerText.includes('per unit') || lowerText.includes('/unit')) {
			return 'unit';
		}

		return 'lump sum';
	}

	private categorizeItem(text: string): string {
		const lowerText = text.toLowerCase();

		if (lowerText.includes('developer') || lowerText.includes('programmer') || lowerText.includes('engineer')) {
			return 'Labor - Technical';
		} else if (lowerText.includes('manager') || lowerText.includes('lead') || lowerText.includes('director')) {
			return 'Labor - Management';
		} else if (lowerText.includes('server') || lowerText.includes('hardware') || lowerText.includes('equipment')) {
			return 'Hardware';
		} else if (lowerText.includes('software') || lowerText.includes('license') || lowerText.includes('application')) {
			return 'Software';
		} else if (lowerText.includes('cloud') || lowerText.includes('hosting') || lowerText.includes('infrastructure')) {
			return 'Infrastructure';
		} else if (lowerText.includes('training') || lowerText.includes('education') || lowerText.includes('workshop')) {
			return 'Training';
		} else if (lowerText.includes('consulting') || lowerText.includes('advisory') || lowerText.includes('support')) {
			return 'Services';
		}

		return 'Other';
	}

	private performMarketComparison(proposedPricing: PricingData[]): PricingAnalysis['marketComparison'] {
		const comparison: PricingAnalysis['marketComparison'] = [];

		for (const item of proposedPricing) {
			const marketData = this.findMarketData(item);

			if (marketData) {
				const percentageDiff = ((item.proposedPrice - marketData.averagePrice) / marketData.averagePrice) * 100;

				let recommendation: 'competitive' | 'high' | 'low' | 'unknown';
				if (percentageDiff <= 10 && percentageDiff >= -10) {
					recommendation = 'competitive';
				} else if (percentageDiff > 10) {
					recommendation = 'high';
				} else {
					recommendation = 'low';
				}

				comparison.push({
					item: item.item,
					proposedPrice: item.proposedPrice,
					marketAverage: marketData.averagePrice,
					marketRange: marketData.range,
					percentageDiff,
					recommendation
				});
			} else {
				comparison.push({
					item: item.item,
					proposedPrice: item.proposedPrice,
					marketAverage: 0,
					marketRange: { min: 0, max: 0 },
					percentageDiff: 0,
					recommendation: 'unknown'
				});
			}
		}

		return comparison;
	}

	private findMarketData(item: PricingData): MarketData | undefined {
		// Try to find matching market data
		for (const [key, data] of this._marketData) {
			if (item.item.toLowerCase().includes(key.replace('-', ' ')) ||
				key.replace('-', ' ').includes(item.item.toLowerCase())) {
				return data;
			}
		}

		// Try category-based matching
		const categoryMap: { [key: string]: string } = {
			'Labor - Technical': 'senior-developer',
			'Labor - Management': 'project-manager',
			'Hardware': 'server-hardware',
			'Infrastructure': 'cloud-services',
			'Services': 'consulting-hourly',
			'Training': 'training-per-day'
		};

		const categoryKey = categoryMap[item.category];
		if (categoryKey) {
			return this._marketData.get(categoryKey);
		}

		return undefined;
	}

	private generateSummary(proposedPricing: PricingData[], marketComparison: PricingAnalysis['marketComparison']): PricingAnalysis['summary'] {
		const totalProposed = proposedPricing.reduce((sum, item) => sum + (item.totalPrice || item.proposedPrice), 0);
		const totalMarket = marketComparison.reduce((sum, item) => sum + item.marketAverage, 0);

		const competitiveItems = marketComparison.filter(item => item.recommendation === 'competitive').length;
		const overallCompetitiveness = marketComparison.length > 0
			? Math.round((competitiveItems / marketComparison.length) * 100)
			: 0;

		let riskLevel: 'low' | 'medium' | 'high';
		if (overallCompetitiveness >= 80) {
			riskLevel = 'low';
		} else if (overallCompetitiveness >= 60) {
			riskLevel = 'medium';
		} else {
			riskLevel = 'high';
		}

		const recommendations: string[] = [];

		const highPricedItems = marketComparison.filter(item => item.recommendation === 'high');
		if (highPricedItems.length > 0) {
			recommendations.push(`Consider reducing prices for ${highPricedItems.length} items that are above market average`);
		}

		const lowPricedItems = marketComparison.filter(item => item.recommendation === 'low');
		if (lowPricedItems.length > 0) {
			recommendations.push(`Review pricing for ${lowPricedItems.length} items that are significantly below market average`);
		}

		const unknownItems = marketComparison.filter(item => item.recommendation === 'unknown');
		if (unknownItems.length > 0) {
			recommendations.push(`Obtain market data for ${unknownItems.length} items to validate pricing`);
		}

		if (recommendations.length === 0) {
			recommendations.push('Pricing appears competitive with market standards');
		}

		return {
			totalProposed,
			totalMarket,
			overallCompetitiveness,
			riskLevel,
			recommendations
		};
	}

	private extractPricingFromLine(lineText: string): PricingData | null {
		return this.parsePriceString(lineText);
	}

	private async validatePricingData(pricingData: PricingData[]): Promise<PricingValidationResult> {
		const issues: string[] = [];
		const warnings: string[] = [];
		const suggestions: string[] = [];
		const marketData: MarketData[] = [];

		for (const item of pricingData) {
			// Check for basic validation
			if (item.proposedPrice <= 0) {
				issues.push(`Invalid price for ${item.item}: must be greater than 0`);
			}

			if (item.proposedPrice > 1000000) {
				warnings.push(`High price for ${item.item}: $${item.proposedPrice.toLocaleString()}`);
			}

			// Check against market data
			const market = this.findMarketData(item);
			if (market) {
				marketData.push(market);

				const percentageDiff = ((item.proposedPrice - market.averagePrice) / market.averagePrice) * 100;

				if (percentageDiff > 50) {
					issues.push(`${item.item} is ${percentageDiff.toFixed(1)}% above market average`);
				} else if (percentageDiff < -50) {
					warnings.push(`${item.item} is ${Math.abs(percentageDiff).toFixed(1)}% below market average`);
				} else if (percentageDiff > 20) {
					warnings.push(`${item.item} is ${percentageDiff.toFixed(1)}% above market average`);
				}
			} else {
				suggestions.push(`No market data available for ${item.item}`);
			}
		}

		return {
			valid: issues.length === 0,
			issues,
			warnings,
			suggestions,
			marketData
		};
	}

	public async savePricingAnalysis(analysis: PricingAnalysis, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
		const analysisPath = path.join(workspaceFolder.uri.fsPath, 'pricing-analysis.md');

		const analysisContent = this.generateAnalysisContent(analysis);

		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(analysisPath),
			Buffer.from(analysisContent, 'utf8')
		);

		this._output.appendLine(`📄 Saved pricing analysis: ${analysisPath}`);
		return analysisPath;
	}

	private generateAnalysisContent(analysis: PricingAnalysis): string {
		return `# Pricing Analysis Report

## Executive Summary
- **Total Proposed Value**: $${analysis.summary.totalProposed.toLocaleString()}
- **Overall Competitiveness**: ${analysis.summary.overallCompetitiveness}%
- **Risk Level**: ${analysis.summary.riskLevel.toUpperCase()}
- **Analysis Date**: ${new Date().toLocaleDateString()}

## Market Comparison

${analysis.marketComparison.map(item => `### ${item.item}
- **Proposed Price**: $${item.proposedPrice.toLocaleString()}
- **Market Average**: $${item.marketAverage.toLocaleString()}
- **Market Range**: $${item.marketRange.min.toLocaleString()} - $${item.marketRange.max.toLocaleString()}
- **Difference**: ${item.percentageDiff > 0 ? '+' : ''}${item.percentageDiff.toFixed(1)}%
- **Status**: ${this.getStatusEmoji(item.recommendation)} ${item.recommendation.toUpperCase()}
`).join('\n')}

## Detailed Pricing Breakdown

${analysis.proposedPricing.map(item => `### ${item.item}
- **Category**: ${item.category}
- **Price**: $${item.proposedPrice.toLocaleString()} ${item.unit ? `per ${item.unit}` : ''}
- **Quantity**: ${item.quantity || 1}
- **Total**: $${(item.totalPrice || item.proposedPrice).toLocaleString()}
- **Justification**: ${item.justification || 'Not provided'}
`).join('\n')}

## Recommendations

${analysis.summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## Risk Assessment

**Risk Level**: ${analysis.summary.riskLevel.toUpperCase()}

${this.getRiskDescription(analysis.summary.riskLevel)}

## Next Steps

1. **Review High-Priced Items**: Address items significantly above market average
2. **Validate Low-Priced Items**: Ensure pricing covers all costs
3. **Obtain Market Data**: Research items without market comparison
4. **Update Pricing**: Adjust based on analysis results
5. **Document Justification**: Provide rationale for pricing decisions

---
*Generated by Valinor Studio Pricing Analyzer*`;
	}

	private getStatusEmoji(recommendation: string): string {
		switch (recommendation) {
			case 'competitive': return '✅';
			case 'high': return '⚠️';
			case 'low': return '🔍';
			default: return '❓';
		}
	}

	private getRiskDescription(riskLevel: string): string {
		switch (riskLevel) {
			case 'low':
				return 'Pricing appears competitive and reasonable. Low risk of rejection due to pricing concerns.';
			case 'medium':
				return 'Some pricing items may need adjustment. Moderate risk of pricing-related issues during evaluation.';
			case 'high':
				return 'Significant pricing concerns identified. High risk of rejection or significant price negotiations required.';
			default:
				return 'Unable to determine risk level due to insufficient market data.';
		}
	}
}
