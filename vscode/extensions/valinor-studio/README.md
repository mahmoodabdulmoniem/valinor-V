# Valinor Studio VS Code Extension

A VS Code extension for analyzing government contracts using SAM.gov API and OpenSearch.

## Features

- 🔍 Efficient contract search using OpenSearch
- 📊 SAM.gov API integration for contract data
- 🤖 AI-powered contract analysis
- 💬 Interactive chat interface
- 📁 Multiple file generation per contract

## Setup

### Environment Variables

Create a `.env` file in the extension root directory with the following variables:

```env
# SAM.gov API Configuration
# Get your API key from: https://sam.gov/api/
SAM_API_KEY=your_sam_api_key_here

# OpenSearch Configuration
# Your OpenSearch endpoint for efficient contract searching
OPENSEARCH_ENDPOINT=your_opensearch_endpoint_here

# OpenSearch Authentication
OPENSEARCH_USERNAME=your_opensearch_username
OPENSEARCH_PASSWORD=your_opensearch_password

# AWS SES Configuration
SES_REGION=us-east-1
```

### Required Environment Variables

1. **SAM_API_KEY**: Your SAM.gov API key for accessing government contract data
2. **OPENSEARCH_ENDPOINT**: Your OpenSearch endpoint for efficient contract searching
3. **OPENSEARCH_USERNAME**: Username for OpenSearch authentication
4. **OPENSEARCH_PASSWORD**: Password for OpenSearch authentication
5. **SES_REGION**: AWS SES region (default: us-east-1)

### Getting API Keys

1. **SAM.gov API Key**:
   - Visit https://sam.gov/api/
   - Register for an account
   - Generate an API key

2. **OpenSearch Configuration**:
   - Configure your OpenSearch instance
   - Note the endpoint URL
   - Set up authentication credentials

## Usage

1. Install the extension in VS Code
2. Configure your environment variables
3. Use the command palette to search for contracts
4. View AI analysis in the chat panel

## Development

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

## Security

- API keys and credentials are stored in environment variables
- `.env` files are gitignored to prevent accidental commits
- Sensitive data is hidden in logs
- OpenSearch requests use proper authentication

## Troubleshooting

If you encounter issues:

1. Check that all environment variables are set
2. Verify API keys are valid
3. Ensure OpenSearch endpoint is accessible
4. Verify OpenSearch credentials are correct
5. Check the output panel for detailed error messages
