const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

// DynamoDB configuration
const AWS_REGION = 'us-east-1';
const AWS_ACCESS_KEY_ID = 'AKIAZK7WOGQQWPJA6WSP';
const AWS_SECRET_ACCESS_KEY = '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';
const TABLE_NAME = 'GovContracts';

// Initialize DynamoDB client
const client = new DynamoDBClient({
	region: AWS_REGION,
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY
	}
});

// Simple unmarshall function for DynamoDB items
function unmarshallDynamoDBItem(item) {
	const result = {};
	for (const [key, value] of Object.entries(item)) {
		if (value && typeof value === 'object' && 'S' in value) {
			result[key] = value.S;
		} else if (value && typeof value === 'object' && 'N' in value) {
			result[key] = parseFloat(value.N);
		} else if (value && typeof value === 'object' && 'BOOL' in value) {
			result[key] = value.BOOL;
		} else if (value && typeof value === 'object' && 'L' in value) {
			result[key] = value.L.map(item => unmarshallDynamoDBItem(item));
		} else if (value && typeof value === 'object' && 'M' in value) {
			result[key] = unmarshallDynamoDBItem(value.M);
		} else {
			result[key] = value;
		}
	}
	return result;
}

// Test function to check DynamoDB connection and table stats
async function testDynamoDBConnection() {
	console.log('🔍 Testing DynamoDB connection...');

	try {
		const command = new ScanCommand({
			TableName: TABLE_NAME,
			Select: 'COUNT'
		});

		const response = await client.send(command);
		const count = response.Count || 0;

		console.log('✅ DynamoDB connection successful!');
		console.log('📊 Table name:', TABLE_NAME);
		console.log('📊 Total contracts:', count);
		console.log('📊 Scanned count:', response.ScannedCount);

		return { success: true, count };
	} catch (error) {
		console.log('❌ DynamoDB connection failed:', error.message);
		return { success: false, error: error.message };
	}
}

// Test function to search for a contract by Notice ID
async function testContractSearch(noticeId) {
	console.log(`🔍 Testing contract search for: ${noticeId}`);

	try {
		// Try exact match first
		const exactCommand = new ScanCommand({
			TableName: TABLE_NAME,
			FilterExpression: '#noticeId = :value',
			ExpressionAttributeNames: {
				'#noticeId': 'noticeId'
			},
			ExpressionAttributeValues: {
				':value': { S: noticeId }
			},
			Limit: 1
		});

		const exactResponse = await client.send(exactCommand);

		if (exactResponse.Items && exactResponse.Items.length > 0) {
			const contract = unmarshallDynamoDBItem(exactResponse.Items[0]);
			console.log('✅ Found contract with exact match!');
			console.log('📋 Notice ID:', contract.noticeId);
			console.log('📋 Title:', contract.title);
			console.log('📋 Agency:', contract.agency);
			console.log('📋 Posted Date:', contract.postedDate);
			return contract;
		}

		// Try fuzzy search if exact match fails
		console.log('❌ No exact match found, trying fuzzy search...');

		const fuzzyCommand = new ScanCommand({
			TableName: TABLE_NAME,
			FilterExpression: 'contains(#noticeId, :value) OR contains(#title, :value)',
			ExpressionAttributeNames: {
				'#noticeId': 'noticeId',
				'#title': 'title'
			},
			ExpressionAttributeValues: {
				':value': { S: noticeId }
			},
			Limit: 5
		});

		const fuzzyResponse = await client.send(fuzzyCommand);

		if (fuzzyResponse.Items && fuzzyResponse.Items.length > 0) {
			console.log('✅ Found potential matches:');
			fuzzyResponse.Items.forEach((item, index) => {
				const contract = unmarshallDynamoDBItem(item);
				console.log(`  ${index + 1}. Notice ID: ${contract.noticeId}`);
				console.log(`     Title: ${contract.title}`);
				console.log(`     Agency: ${contract.agency}`);
			});
			return unmarshallDynamoDBItem(fuzzyResponse.Items[0]);
		}

		console.log('❌ No contract found in DynamoDB');
		return null;

	} catch (error) {
		console.log('❌ Search failed:', error.message);
		return null;
	}
}

// Test function to get a sample of contracts
async function testSampleContracts() {
	console.log('🔍 Getting sample contracts...');

	try {
		const command = new ScanCommand({
			TableName: TABLE_NAME,
			Limit: 5
		});

		const response = await client.send(command);

		if (response.Items && response.Items.length > 0) {
			console.log('✅ Sample contracts:');
			response.Items.forEach((item, index) => {
				const contract = unmarshallDynamoDBItem(item);
				console.log(`  ${index + 1}. Notice ID: ${contract.noticeId || 'N/A'}`);
				console.log(`     Title: ${contract.title || 'N/A'}`);
				console.log(`     Agency: ${contract.agency || 'N/A'}`);
				console.log(`     Posted Date: ${contract.postedDate || 'N/A'}`);
				console.log('');
			});
			return response.Items.length;
		} else {
			console.log('❌ No contracts found in table');
			return 0;
		}

	} catch (error) {
		console.log('❌ Failed to get sample contracts:', error.message);
		return 0;
	}
}

// Main test function
async function runTests() {
	console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
	console.log('║                                VALINOR STUDIO                                ║');
	console.log('║                              DynamoDB Test Suite                            ║');
	console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

	// Test 1: Connection and table stats
	console.log('\n🔍 Test 1: DynamoDB Connection and Table Stats');
	const connectionResult = await testDynamoDBConnection();

	if (!connectionResult.success) {
		console.log('❌ Cannot proceed with tests - DynamoDB connection failed');
		return;
	}

	// Test 2: Sample contracts
	console.log('\n🔍 Test 2: Sample Contracts');
	await testSampleContracts();

	// Test 3: Search for specific contracts
	console.log('\n🔍 Test 3: Contract Search Tests');

	const testContracts = [
		'FA527025R0012',
		'36C25925Q0577',
		'W912GB25R0001',
		'FA527025R0012' // Test the one we know exists
	];

	for (const contractId of testContracts) {
		console.log(`\n--- Testing contract: ${contractId} ---`);
		const result = await testContractSearch(contractId);
		if (result) {
			console.log('✅ SUCCESS: Found contract in DynamoDB!');
		} else {
			console.log('❌ FAILED: Contract not found in DynamoDB');
		}
	}

	console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
	console.log('║                                    TEST COMPLETE                              ║');
	console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
}

// Run the tests
runTests().catch(console.error);
