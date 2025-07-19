import * as vscode from 'vscode';

// Extension configuration interface
export interface ExtensionConfig {
	// SAM.gov Configuration
	samApiKey: string;

	// OpenSearch Configuration
	opensearchEndpoint: string;
	opensearchUsername: string;
	opensearchPassword: string;

	// OpenAI Configuration
	openaiApiKey: string;

	// AWS Configuration
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsRegion: string;

	// Google AI Configuration
	googleAiApiKey: string;

	// Development Configuration
	nodeEnv: string;
}

// Default configuration values
const DEFAULT_CONFIG: ExtensionConfig = {
	samApiKey: '',
	opensearchEndpoint: '',
	opensearchUsername: '',
	opensearchPassword: '',
	openaiApiKey: '',
	awsAccessKeyId: '',
	awsSecretAccessKey: '',
	awsRegion: 'us-east-1',
	googleAiApiKey: '',
	nodeEnv: 'development'
};

// Function to get configuration from VS Code settings
export function getExtensionConfig(): ExtensionConfig {
	const config = vscode.workspace.getConfiguration('valinorStudio');

	return {
		samApiKey: config.get('samApiKey', ''),
		opensearchEndpoint: config.get('opensearchEndpoint', ''),
		opensearchUsername: config.get('opensearchUsername', ''),
		opensearchPassword: config.get('opensearchPassword', ''),
		openaiApiKey: config.get('openaiApiKey', ''),
		awsAccessKeyId: config.get('awsAccessKeyId', ''),
		awsSecretAccessKey: config.get('awsSecretAccessKey', ''),
		awsRegion: config.get('awsRegion', 'us-east-1'),
		googleAiApiKey: config.get('googleAiApiKey', ''),
		nodeEnv: config.get('nodeEnv', 'development')
	};
}

// Function to set environment variables from extension configuration
export function setEnvironmentFromConfig(): void {
	const config = getExtensionConfig();

	console.log('[Valinor Studio] Extension config values:');
	console.log('SAM API Key:', config.samApiKey ? 'SET' : 'NOT SET');
	console.log('OpenSearch Endpoint:', config.opensearchEndpoint ? 'SET' : 'NOT SET');
	console.log('OpenSearch Username:', config.opensearchUsername ? 'SET' : 'NOT SET');
	console.log('OpenSearch Password:', config.opensearchPassword ? 'SET' : 'NOT SET');

	// Set environment variables from extension configuration (only if not already set from .env)
	if (config.samApiKey && !process.env.SAM_API_KEY) process.env.SAM_API_KEY = config.samApiKey;
	if (config.opensearchEndpoint && !process.env.OPENSEARCH_ENDPOINT) process.env.OPENSEARCH_ENDPOINT = config.opensearchEndpoint;
	if (config.opensearchUsername && !process.env.OPENSEARCH_USERNAME) process.env.OPENSEARCH_USERNAME = config.opensearchUsername;
	if (config.opensearchPassword && !process.env.OPENSEARCH_PASSWORD) process.env.OPENSEARCH_PASSWORD = config.opensearchPassword;
	if (config.openaiApiKey && !process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = config.openaiApiKey;
	if (config.awsAccessKeyId && !process.env.AWS_ACCESS_KEY_ID) process.env.AWS_ACCESS_KEY_ID = config.awsAccessKeyId;
	if (config.awsSecretAccessKey && !process.env.AWS_SECRET_ACCESS_KEY) process.env.AWS_SECRET_ACCESS_KEY = config.awsSecretAccessKey;
	if (config.awsRegion && !process.env.AWS_REGION) process.env.AWS_REGION = config.awsRegion;
	if (config.googleAiApiKey && !process.env.GOOGLE_AI_API_KEY) process.env.GOOGLE_AI_API_KEY = config.googleAiApiKey;
	if (config.nodeEnv && !process.env.NODE_ENV) process.env.NODE_ENV = config.nodeEnv;

	console.log('[Valinor Studio] Environment variables after config override:');
	console.log('SAM_API_KEY:', process.env.SAM_API_KEY ? 'SET' : 'NOT SET');
	console.log('OPENSEARCH_ENDPOINT:', process.env.OPENSEARCH_ENDPOINT ? 'SET' : 'NOT SET');
	console.log('OPENSEARCH_USERNAME:', process.env.OPENSEARCH_USERNAME ? 'SET' : 'NOT SET');
	console.log('OPENSEARCH_PASSWORD:', process.env.OPENSEARCH_PASSWORD ? 'SET' : 'NOT SET');
}

// Function to validate configuration
export function validateConfig(): { isValid: boolean; missingKeys: string[] } {
	const config = getExtensionConfig();
	const missingKeys: string[] = [];

	// Check required keys
	if (!config.samApiKey) missingKeys.push('SAM API Key');
	if (!config.opensearchEndpoint) missingKeys.push('OpenSearch Endpoint');
	if (!config.opensearchUsername) missingKeys.push('OpenSearch Username');
	if (!config.opensearchPassword) missingKeys.push('OpenSearch Password');

	return {
		isValid: missingKeys.length === 0,
		missingKeys
	};
}

// Function to show configuration setup guide
export async function showConfigurationGuide(): Promise<void> {
	const message = `🚀 Valinor Studio Configuration Required

To use Valinor Studio, you need to configure your API keys and endpoints.

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "Valinor Studio"
3. Configure the following settings:
   - SAM API Key (from https://sam.gov/api/)
   - OpenSearch Endpoint
   - OpenSearch Username
   - OpenSearch Password
   - OpenAI API Key (optional, for AI features)

Would you like to open the settings now?`;

	const action = await vscode.window.showInformationMessage(message, 'Open Settings', 'Later');

	if (action === 'Open Settings') {
		vscode.commands.executeCommand('workbench.action.openSettings', 'valinorStudio');
	}
}

// Function to check if configuration is complete
export function isConfigurationComplete(): boolean {
	const validation = validateConfig();
	return validation.isValid;
}
