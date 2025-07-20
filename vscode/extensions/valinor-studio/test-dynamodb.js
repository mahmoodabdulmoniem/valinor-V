// Test script for DynamoDB connection
require('dotenv').config();
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

// Set AWS credentials from environment variables
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
// AWS credentials should be set via environment variables or .env file
// process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
// process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';

console.log('🔧 Testing DynamoDB connection...');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');

// Create DynamoDB client
const client = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	}
});

async function testDynamoDBConnection() {
	try {
		console.log('🔍 Testing connection to GovContracts table...');

		// Test with a simple scan command
		const command = new ScanCommand({
			TableName: 'GovContracts',
			Limit: 1
		});

		const response = await client.send(command);

		if (response.Items && response.Items.length > 0) {
			console.log('✅ DynamoDB connection successful!');
			console.log('📊 Found items in table');
			console.log('🔢 Total items (approximate):', response.Count || 'Unknown');
		} else {
			console.log('⚠️ Connection successful but no items found');
		}

	} catch (error) {
		console.error('❌ DynamoDB connection failed:', error.message);

		if (error.name === 'UnrecognizedClientException') {
			console.error('🔑 This usually means invalid AWS credentials');
		} else if (error.name === 'ResourceNotFoundException') {
			console.error('📋 Table "GovContracts" not found');
		} else if (error.name === 'AccessDeniedException') {
			console.error('🚫 Access denied - check IAM permissions');
		}
	}
}

testDynamoDBConnection();
