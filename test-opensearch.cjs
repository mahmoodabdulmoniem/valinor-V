const https = require('https');

// OpenSearch configuration
const OPENSEARCH_ENDPOINT = 'https://vpc-opengovtbids-search-v2pceb2yuesaz5u52bmsybahtq.us-east-1.es.amazonaws.com';
const OPENSEARCH_USERNAME = 'admin';
const OPENSEARCH_PASSWORD = 'OpenGovtBids123!';

// Test function to check OpenSearch connection
async function testOpenSearchConnection() {
	console.log('🔍 Testing OpenSearch connection...');

	try {
		const auth = Buffer.from(`${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD}`).toString('base64');

		const response = await new Promise((resolve, reject) => {
			const req = https.get(`${OPENSEARCH_ENDPOINT}/_cluster/health`, {
				headers: {
					'Authorization': `Basic ${auth}`
				}
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${data}`));
					}
				});
			});

			req.on('error', reject);
			req.setTimeout(10000, () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});
		});

		console.log('✅ OpenSearch connection successful!');
		console.log('📊 Cluster status:', response.data.status);
		console.log('📊 Number of nodes:', response.data.number_of_nodes);
		console.log('📊 Active shards:', response.data.active_shards);

		return true;
	} catch (error) {
		console.log('❌ OpenSearch connection failed:', error.message);
		return false;
	}
}

// Test function to search for a contract
async function testContractSearch(noticeId) {
	console.log(`🔍 Testing contract search for: ${noticeId}`);

	try {
		const auth = Buffer.from(`${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD}`).toString('base64');

		// Try exact match first
		const exactQuery = {
			query: {
				bool: {
					must: [
						{
							term: {
								noticeId: noticeId
							}
						}
					]
				}
			},
			size: 1
		};

		const response = await new Promise((resolve, reject) => {
			const postData = JSON.stringify(exactQuery);

			const req = https.request(`${OPENSEARCH_ENDPOINT}/contracts/_search`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Basic ${auth}`,
					'Content-Length': Buffer.byteLength(postData)
				}
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${data}`));
					}
				});
			});

			req.on('error', reject);
			req.write(postData);
			req.end();

			req.setTimeout(15000, () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});
		});

		console.log('📊 Search results:', response.data.hits?.total?.value || 0, 'matches');

		if (response.data.hits?.hits?.length > 0) {
			const contract = response.data.hits.hits[0]._source;
			console.log('✅ Found contract!');
			console.log('📋 Notice ID:', contract.noticeId || contract.notice_id);
			console.log('📋 Title:', contract.title || contract.solicitationTitle);
			console.log('📋 Agency:', contract.agency || contract.contractingOffice);
			console.log('📋 Posted Date:', contract.postedDate || contract.posted_date);
			return contract;
		} else {
			console.log('❌ No exact match found, trying fuzzy search...');

			// Try fuzzy search
			const fuzzyQuery = {
				query: {
					bool: {
						should: [
							{
								match: {
									noticeId: {
										query: noticeId,
										fuzziness: "AUTO"
									}
								}
							},
							{
								match: {
									title: {
										query: noticeId,
										fuzziness: "AUTO"
									}
								}
							}
						],
						minimum_should_match: 1
					}
				},
				size: 5
			};

			const fuzzyResponse = await new Promise((resolve, reject) => {
				const postData = JSON.stringify(fuzzyQuery);

				const req = https.request(`${OPENSEARCH_ENDPOINT}/contracts/_search`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Basic ${auth}`,
						'Content-Length': Buffer.byteLength(postData)
					}
				}, (res) => {
					let data = '';
					res.on('data', chunk => data += chunk);
					res.on('end', () => {
						if (res.statusCode >= 200 && res.statusCode < 300) {
							resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
						} else {
							reject(new Error(`HTTP ${res.statusCode}: ${data}`));
						}
					});
				});

				req.on('error', reject);
				req.write(postData);
				req.end();

				req.setTimeout(15000, () => {
					req.destroy();
					reject(new Error('Request timeout'));
				});
			});

			console.log('📊 Fuzzy search results:', fuzzyResponse.data.hits?.total?.value || 0, 'matches');

			if (fuzzyResponse.data.hits?.hits?.length > 0) {
				console.log('✅ Found potential matches:');
				fuzzyResponse.data.hits.hits.forEach((hit, index) => {
					const contract = hit._source;
					console.log(`  ${index + 1}. Notice ID: ${contract.noticeId || contract.notice_id}`);
					console.log(`     Title: ${contract.title || contract.solicitationTitle}`);
					console.log(`     Score: ${hit._score}`);
				});
				return fuzzyResponse.data.hits.hits[0]._source;
			}
		}

		console.log('❌ No contract found in OpenSearch');
		return null;

	} catch (error) {
		console.log('❌ Search failed:', error.message);
		return null;
	}
}

// Test function to check available indices
async function testIndices() {
	console.log('🔍 Checking available indices...');

	try {
		const auth = Buffer.from(`${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD}`).toString('base64');

		const response = await new Promise((resolve, reject) => {
			const req = https.get(`${OPENSEARCH_ENDPOINT}/_cat/indices?v`, {
				headers: {
					'Authorization': `Basic ${auth}`
				}
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						resolve({ statusCode: res.statusCode, data });
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${data}`));
					}
				});
			});

			req.on('error', reject);
			req.setTimeout(10000, () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});
		});

		console.log('📊 Available indices:');
		console.log(response.data);

	} catch (error) {
		console.log('❌ Failed to get indices:', error.message);
	}
}

// Main test function
async function runTests() {
	console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
	console.log('║                                VALINOR STUDIO                                ║');
	console.log('║                              OpenSearch Test Suite                           ║');
	console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

	// Test 1: Connection
	console.log('\n🔍 Test 1: OpenSearch Connection');
	const isConnected = await testOpenSearchConnection();

	if (!isConnected) {
		console.log('❌ Cannot proceed with tests - OpenSearch connection failed');
		return;
	}

	// Test 2: Check indices
	console.log('\n🔍 Test 2: Available Indices');
	await testIndices();

	// Test 3: Search for specific contracts
	console.log('\n🔍 Test 3: Contract Search Tests');

	const testContracts = [
		'FA527025R0012',
		'36C25925Q0577',
		'FA527025R0012', // Test the one we know exists
		'W912GB25R0001'
	];

	for (const contractId of testContracts) {
		console.log(`\n--- Testing contract: ${contractId} ---`);
		const result = await testContractSearch(contractId);
		if (result) {
			console.log('✅ SUCCESS: Found contract in OpenSearch!');
		} else {
			console.log('❌ FAILED: Contract not found in OpenSearch');
		}
	}

	console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
	console.log('║                                    TEST COMPLETE                              ║');
	console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
}

// Run the tests
runTests().catch(console.error);
