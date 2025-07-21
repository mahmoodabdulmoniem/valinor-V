// AI Contract Search Service
// This service handles AI-powered contract search using OpenAI GPT-3.5 and AWS Bedrock Claude

const { Client } = require('@opensearch-project/opensearch');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const axios = require('axios');

class AIContractService {
	constructor() {
		this.client = null;
		this.indexName = 'contracts';
		this.openaiApiKey = process.env.OPENAI_API_KEY;
		this.bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-v2';
		this.awsRegion = process.env.AWS_REGION || 'us-east-1';
		this.dynamoTableName = process.env.DYNAMODB_TABLE || 'GovContracts';

		// Initialize AI clients
		this.initializeBedrockClient();
		this.initializeDynamoClient();
		this.initializeClient();
	}

	initializeBedrockClient() {
		try {
			// Only initialize if AWS credentials are available
			if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
				this.bedrockClient = new BedrockRuntimeClient({
					region: this.awsRegion,
					credentials: {
						accessKeyId: process.env.AWS_ACCESS_KEY_ID,
						secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
					}
				});
				console.log('AWS Bedrock client initialized');
			} else {
				console.log('AWS credentials not found, Bedrock client not initialized');
				this.bedrockClient = null;
			}
		} catch (error) {
			console.error('Failed to initialize Bedrock client:', error);
			this.bedrockClient = null;
		}
	}

	initializeDynamoClient() {
		try {
			// Only initialize if AWS credentials are available
			if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
				this.dynamoClient = new DynamoDBClient({
					region: this.awsRegion,
					credentials: {
						accessKeyId: process.env.AWS_ACCESS_KEY_ID,
						secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
					}
				});
				console.log('AWS DynamoDB client initialized');
			} else {
				console.log('AWS credentials not found, DynamoDB client not initialized');
				this.dynamoClient = null;
			}
		} catch (error) {
			console.error('Failed to initialize DynamoDB client:', error);
			this.dynamoClient = null;
		}
	}

	async initializeClient() {
		try {
			// Only initialize if OpenSearch endpoint is configured
			const endpoint = process.env.OPENSEARCH_ENDPOINT || 'https://localhost:9200';

			this.client = new Client({
				node: endpoint,
				auth: {
					username: process.env.OPENSEARCH_USERNAME || 'admin',
					password: process.env.OPENSEARCH_PASSWORD || 'admin'
				},
				ssl: {
					rejectUnauthorized: false // For development
				},
				requestTimeout: 10000, // 10 second timeout
				maxRetries: 1
			});

			// Test the connection and check if the index exists
			try {
				await this.client.ping();
				console.log('OpenSearch client initialized and connected');

				// Check if the govcontracts index exists
				const indexExists = await this.client.indices.exists({
					index: 'govcontracts'
				});

				if (indexExists.body) {
					console.log('govcontracts index found');
					this.indexName = 'govcontracts'; // Use the correct index name
				} else {
					console.log('govcontracts index not found, using fallback mode');
					this.client = null;
				}
			} catch (pingError) {
				console.log('OpenSearch client initialized but connection failed - will use fallback mode');
				this.client = null;
			}
		} catch (error) {
			console.error('Failed to initialize OpenSearch client:', error);
			this.client = null;
		}
	}

	async askAI({ question, userId, sessionId }) {
		try {
			console.log(`Processing AI question: ${question.substring(0, 100)}...`);

			// Try to get context from OpenSearch first (with timeout)
			let context = null;
			try {
				const contextPromise = this.getContextForQuestion(question);
				const timeoutPromise = new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Context timeout')), 5000)
				);
				context = await Promise.race([contextPromise, timeoutPromise]);
			} catch (error) {
				console.log('OpenSearch context retrieval failed or timed out, proceeding without context');
			}

			// Generate AI response using Claude via Bedrock
			const aiResponse = await this.generateAIResponse(question, context);

			// Format the response
			const response = {
				answer: aiResponse.answer,
				context: aiResponse.context,
				contracts: aiResponse.contracts || [],
				confidence: aiResponse.confidence || 0.8,
				note: aiResponse.note
			};

			return response;

		} catch (error) {
			console.error('Error in askAI:', error);
			// Return a fallback response instead of throwing
			return this.generateFallbackResponse(question, null);
		}
	}

	async getContextForQuestion(question) {
		try {
			// Extract potential Notice ID or Solicitation Number from question
			const noticeIdMatch = question.match(/\b[A-Z0-9]{10,}\b/g);
			const solicitationMatch = question.match(/\b[A-Z0-9]{8,}\b/g);

			if (noticeIdMatch || solicitationMatch) {
				const searchId = noticeIdMatch?.[0] || solicitationMatch?.[0];
				console.log(`Searching for contract ID: ${searchId}`);

				// Try OpenSearch first if available
				if (this.client) {
					try {
						console.log('Trying OpenSearch search...');
						const results = await this.searchOpenSearch(searchId);
						if (results && results.length > 0) {
							console.log(`Found ${results.length} contracts in OpenSearch`);
							return results;
						}
					} catch (error) {
						console.error('OpenSearch search failed:', error);
					}
				}

				// Fallback to DynamoDB search if OpenSearch is not available
				if (this.dynamoClient) {
					try {
						console.log('Trying DynamoDB search...');
						const results = await this.searchDynamoDB(searchId);
						if (results && results.length > 0) {
							console.log(`Found ${results.length} contracts in DynamoDB`);
							return results;
						}
					} catch (error) {
						console.error('DynamoDB search failed:', error);
					}
				}
			}

			// Fallback to mock data if no search method works
			console.log('Using mock data as fallback');
			return this.getMockContractData(noticeIdMatch?.[0] || solicitationMatch?.[0]);

		} catch (error) {
			console.error('Error getting context:', error);
			return this.getMockContractData();
		}
	}

	async searchOpenSearch(searchId) {
		try {
			// Search OpenSearch for contracts matching the search ID
			const searchBody = {
				query: {
					bool: {
						should: [
							{
								term: {
									noticeId: searchId
								}
							},
							{
								term: {
									solicitationNumber: searchId
								}
							},
							{
								match: {
									title: {
										query: searchId,
										fuzziness: 'AUTO'
									}
								}
							},
							{
								match: {
									description: {
										query: searchId,
										fuzziness: 'AUTO'
									}
								}
							}
						],
						minimum_should_match: 1
					}
				},
				size: 3,
				sort: [
					{ _score: { order: 'desc' } }
				]
			};

			const response = await this.client.search({
				index: this.indexName,
				body: searchBody
			});

			if (response.body.hits.hits.length > 0) {
				return response.body.hits.hits.map(hit => {
					const source = hit._source;
					return {
						noticeId: source.noticeId || source._id || 'Unknown',
						solicitationNumber: source.solicitationNumber || source.noticeId || 'Unknown',
						title: source.title || 'Government Contract',
						description: source.description || 'Contract description not available',
						agency: source.agency || 'Unknown Agency',
						postedDate: source.postedDate || 'Unknown',
						responseDate: source.responseDate || 'Unknown',
						classificationCode: source.classificationCode || 'Unknown',
						setAside: source.setAside || 'Unknown',
						naicsCode: source.naicsCode || 'Unknown',
						pointOfContact: source.pointOfContact || 'Contact information not available',
						fullText: source.raw ? JSON.stringify(source.raw) : 'Full text not available',
						status: source.status || 'Unknown',
						value: source.value || 0,
						score: hit._score
					};
				});
			}

			return [];
		} catch (error) {
			console.error('Error searching OpenSearch:', error);
			return [];
		}
	}

	async searchDynamoDB(searchId) {
		try {
			console.log(`Searching DynamoDB table: ${this.dynamoTableName}`);

			// Search for contracts with matching solicitationNumber
			const command = new ScanCommand({
				TableName: this.dynamoTableName,
				FilterExpression: 'contains(solicitationNumber, :solicitationNumber)',
				ExpressionAttributeValues: {
					':solicitationNumber': { S: searchId }
				},
				Limit: 3
			});

			const response = await this.dynamoClient.send(command);
			console.log(`DynamoDB scan returned ${response.Items?.length || 0} items`);

			if (response.Items && response.Items.length > 0) {
				return response.Items.map(item => this.formatDynamoContractData(unmarshall(item)));
			}

			return [];
		} catch (error) {
			console.error('Error searching DynamoDB:', error);
			return [];
		}
	}

	formatDynamoContractData(dynamoItem) {
		try {
			console.log('Formatting DynamoDB item:', JSON.stringify(dynamoItem, null, 2));

			// Parse the JSON data field if it exists
			let contractData = {};
			if (dynamoItem.data) {
				try {
					contractData = JSON.parse(dynamoItem.data);
					console.log('Parsed contract data:', JSON.stringify(contractData, null, 2));
				} catch (e) {
					console.log('Failed to parse data field, using raw data');
					contractData = {};
				}
			}

			const formatted = {
				noticeId: dynamoItem.id || dynamoItem.solicitationId || contractData.noticeId || 'Unknown',
				solicitationNumber: dynamoItem.solicitationNumber || dynamoItem.solicitationId || contractData.solicitationNumber || 'Unknown',
				title: contractData.title || dynamoItem.title || 'Government Contract',
				description: contractData.description || dynamoItem.description || 'Contract description not available',
				agency: dynamoItem.agency || contractData.agency || 'Unknown Agency',
				postedDate: contractData.postedDate || dynamoItem.postedDate || 'Unknown',
				responseDate: contractData.responseDate || dynamoItem.responseDate || 'Unknown',
				classificationCode: contractData.classificationCode || dynamoItem.classificationCode || 'Unknown',
				setAside: contractData.setAside || dynamoItem.setAside || 'Unknown',
				naicsCode: contractData.naicsCode || dynamoItem.naicsCode || 'Unknown',
				pointOfContact: contractData.pointOfContact || dynamoItem.pointOfContact || 'Contact information not available',
				fullText: dynamoItem.data || 'Full text not available',
				status: dynamoItem.status || 'Unknown',
				value: contractData.value || dynamoItem.value || 0
			};

			console.log('Formatted contract:', JSON.stringify(formatted, null, 2));
			return formatted;
		} catch (error) {
			console.error('Error formatting DynamoDB contract data:', error);
			return this.getMockContractData()[0];
		}
	}

	getMockContractData(searchId = 'SPE7L525T3092') {
		return [{
			noticeId: searchId,
			solicitationNumber: searchId,
			title: 'Sample Government Contract for IT Services',
			description: 'This is a sample contract description based on your search query.',
			agency: 'Department of Defense',
			postedDate: '2025-01-15',
			responseDate: '2025-02-15',
			classificationCode: 'R499',
			setAside: 'No Set-Aside',
			naicsCode: '541519',
			pointOfContact: 'John Doe, john.doe@agency.gov',
			fullText: 'Full contract text would be here...',
			status: 'open',
			value: 500000
		}];
	}

	async generateAIResponse(question, context = null) {
		try {
			// Try Claude first, fallback to GPT-3.5, then fallback response
			if (this.bedrockClient && this.bedrockModelId) {
				try {
					return await this.askClaude(question, context);
				} catch (error) {
					console.log('Claude failed, trying GPT-3.5...');
				}
			}

			if (this.openaiApiKey) {
				try {
					return await this.askGPT35(question, context);
				} catch (error) {
					console.log('GPT-3.5 failed, using fallback...');
				}
			}

			return this.generateFallbackResponse(question, context);
		} catch (error) {
			console.error('Error generating AI response:', error);
			return this.generateFallbackResponse(question, context);
		}
	}

	async askClaude(question, context) {
		try {
			let prompt = `You are a government contract expert assistant. `;

			if (context && context.length > 0) {
				prompt += `\n\nContext from government contracts database:\n`;
				context.forEach((contract, index) => {
					prompt += `\nContract ${index + 1}:\n`;
					prompt += `Notice ID: ${contract.noticeId}\n`;
					prompt += `Title: ${contract.title}\n`;
					prompt += `Agency: ${contract.agency}\n`;
					prompt += `Description: ${contract.description}\n`;
					prompt += `Posted Date: ${contract.postedDate}\n`;
				});
			}

			prompt += `\n\nUser Question: ${question}\n\nPlease provide a helpful answer based on the context provided. If the context doesn't contain relevant information, provide general guidance about government contracts.`;

			const input = {
				modelId: this.bedrockModelId,
				contentType: "application/json",
				accept: "application/json",
				body: JSON.stringify({
					prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
					max_tokens_to_sample: 1000,
					temperature: 0.7,
					top_p: 0.9
				})
			};

			const command = new InvokeModelCommand(input);
			const response = await this.bedrockClient.send(command);
			const responseBody = JSON.parse(new TextDecoder().decode(response.body));

			return {
				answer: responseBody.completion,
				context: context ? `Found ${context.length} relevant contracts` : 'No specific context found',
				contracts: context || [],
				confidence: 0.9
			};

		} catch (error) {
			console.error('Claude API error:', error);
			throw error;
		}
	}

	async askGPT35(question, context) {
		try {
			let messages = [
				{
					role: 'system',
					content: 'You are a government contract expert assistant. Provide helpful and accurate information about government contracts.'
				}
			];

			if (context && context.length > 0) {
				let contextContent = 'Context from government contracts database:\n';
				context.forEach((contract, index) => {
					contextContent += `\nContract ${index + 1}:\n`;
					contextContent += `Notice ID: ${contract.noticeId}\n`;
					contextContent += `Title: ${contract.title}\n`;
					contextContent += `Agency: ${contract.agency}\n`;
					contextContent += `Description: ${contract.description}\n`;
					contextContent += `Posted Date: ${contract.postedDate}\n`;
				});

				messages.push({
					role: 'user',
					content: contextContent + `\n\nUser Question: ${question}`
				});
			} else {
				messages.push({
					role: 'user',
					content: question
				});
			}

			const response = await axios.post(
				'https://api.openai.com/v1/chat/completions',
				{
					model: 'gpt-3.5-turbo',
					messages: messages,
					max_tokens: 1000,
					temperature: 0.7
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.openaiApiKey}`
					}
				}
			);

			return {
				answer: response.data.choices[0].message.content,
				context: context ? `Found ${context.length} relevant contracts` : 'No specific context found',
				contracts: context || [],
				confidence: 0.85
			};

		} catch (error) {
			console.error('GPT-3.5 API error:', error);
			throw error;
		}
	}

	generateFallbackResponse(question, context) {
		// Create a more intelligent fallback response based on the question
		let answer = '';

		if (question.toLowerCase().includes('notice id') || question.toLowerCase().includes('contract id')) {
			answer = `I can help you search for government contracts by Notice ID. Notice IDs are unique identifiers for government contract opportunities. You can search for contracts using the Notice ID format (e.g., 75H70425Q00027) in the SAM.gov database. The Notice ID helps you find specific contract details including title, description, agency, and important dates.`;
		} else if (question.toLowerCase().includes('agency') || question.toLowerCase().includes('department')) {
			answer = `Government contracts are published by various federal agencies including the Department of Defense, Department of Homeland Security, Department of Health and Human Services, and many others. Each agency has specific contracting requirements and procedures. You can filter contracts by agency to find opportunities relevant to your business.`;
		} else if (question.toLowerCase().includes('date') || question.toLowerCase().includes('deadline')) {
			answer = `Government contracts have important dates including the posting date, response deadline, and award date. It's crucial to monitor these dates to ensure timely submission of proposals. The response deadline is particularly important as late submissions are typically not accepted.`;
		} else if (question.toLowerCase().includes('set aside') || question.toLowerCase().includes('small business')) {
			answer = `Set-aside contracts are reserved for specific business categories like small businesses, women-owned businesses, veteran-owned businesses, and others. These programs help ensure fair competition and opportunities for diverse businesses. Check the set-aside designation in contract notices to see if you qualify.`;
		} else {
			answer = `I understand you're asking about: "${question}". Government contracts are published on SAM.gov and include details like Notice ID, title, description, agency, classification codes, set-aside designations, and important dates. You can search contracts by keywords, agency, date range, or Notice ID to find relevant opportunities.`;
		}

		return {
			answer: answer,
			context: context ? `Found ${context.length} relevant contracts in database` : 'No specific contract data available - using general guidance',
			contracts: context || [],
			confidence: context && context.length > 0 ? 0.7 : 0.5,
			note: 'AI services are currently unavailable. This response provides general guidance about government contracts.'
		};
	}

	async searchContracts(query, filters = {}) {
		try {
			if (!this.client) {
				throw new Error('OpenSearch client not initialized');
			}

			const searchBody = {
				query: {
					bool: {
						must: [
							{
								multi_match: {
									query: query,
									fields: ['title^2', 'description', 'fullText'],
									type: 'best_fields',
									fuzziness: 'AUTO'
								}
							}
						]
					}
				},
				size: 10
			};

			// Add filters if provided
			if (filters.agency) {
				searchBody.query.bool.filter = searchBody.query.bool.filter || [];
				searchBody.query.bool.filter.push({
					term: { agency: filters.agency }
				});
			}

			if (filters.dateRange) {
				searchBody.query.bool.filter = searchBody.query.bool.filter || [];
				searchBody.query.bool.filter.push({
					range: {
						postedDate: {
							gte: filters.dateRange.start,
							lte: filters.dateRange.end
						}
					}
				});
			}

			const response = await this.client.search({
				index: this.indexName,
				body: searchBody
			});

			return response.body.hits.hits.map(hit => ({
				...hit._source,
				score: hit._score
			}));

		} catch (error) {
			console.error('Error searching contracts:', error);
			throw new Error(`Contract search failed: ${error.message}`);
		}
	}

	async getContractByNoticeId(noticeId) {
		try {
			if (!this.client) {
				throw new Error('OpenSearch client not initialized');
			}

			const response = await this.client.search({
				index: this.indexName,
				body: {
					query: {
						term: {
							noticeId: noticeId
						}
					}
				}
			});

			const hits = response.body.hits.hits;
			return hits.length > 0 ? hits[0]._source : null;

		} catch (error) {
			console.error('Error getting contract by Notice ID:', error);
			throw new Error(`Contract retrieval failed: ${error.message}`);
		}
	}
}

// Create singleton instance
const aiService = new AIContractService();

// Export the askAI function
async function askAI(params) {
	return await aiService.askAI(params);
}

module.exports = {
	askAI,
	AIContractService
};
