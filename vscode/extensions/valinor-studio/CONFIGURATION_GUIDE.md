# 🚀 Valinor Studio Configuration Guide

Welcome to Valinor Studio! This guide will help you configure the extension with the necessary API keys and endpoints to unlock all features.

## 📋 Required Configuration

To use Valinor Studio effectively, you need to configure the following settings:

### 🔑 Essential API Keys

1. **SAM.gov API Key** (Required)
   - **Purpose**: Access government contract data
   - **How to get**: Visit https://sam.gov/api/
   - **Steps**:
     1. Register for a SAM.gov account
     2. Navigate to the API section
     3. Generate an API key
     4. Copy the key to your VS Code settings

2. **OpenSearch Configuration** (Required)
   - **Purpose**: Efficient contract searching and data storage
   - **Components**:
     - OpenSearch Endpoint URL
     - Username
     - Password
   - **Setup**: Configure your OpenSearch instance or use a cloud service

### 🤖 Optional AI Features

3. **OpenAI API Key** (Optional)
   - **Purpose**: AI chat and content generation
   - **How to get**: Visit https://platform.openai.com/
   - **Features enabled**: GPT-4, GPT-3.5 models

4. **AWS Credentials** (Optional)
   - **Purpose**: Claude models via AWS Bedrock
   - **Required**: AWS Access Key ID, Secret Access Key
   - **Features enabled**: Claude-2, Claude-3 models

5. **Google AI API Key** (Optional)
   - **Purpose**: Gemini models
   - **How to get**: Visit https://makersuite.google.com/
   - **Features enabled**: Gemini-Pro model

## ⚙️ How to Configure

### Method 1: VS Code Settings UI (Recommended)

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "Valinor Studio"
3. Configure each setting with your API keys and endpoints
4. Settings are automatically saved

### Method 2: Command Palette

1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Type "Valinor Studio: Open Configuration"
3. This will open the settings page directly

### Method 3: Settings JSON

You can also edit your `settings.json` file directly:

```json
{
  "valinorStudio.samApiKey": "your_sam_api_key_here",
  "valinorStudio.opensearchEndpoint": "https://your-opensearch-endpoint.com",
  "valinorStudio.opensearchUsername": "your_username",
  "valinorStudio.opensearchPassword": "your_password",
  "valinorStudio.openaiApiKey": "your_openai_api_key_here",
  "valinorStudio.awsAccessKeyId": "your_aws_access_key_id",
  "valinorStudio.awsSecretAccessKey": "your_aws_secret_access_key",
  "valinorStudio.awsRegion": "us-east-1",
  "valinorStudio.googleAiApiKey": "your_google_ai_api_key"
}
```

## 🔧 Configuration Settings

| Setting | Type | Required | Description |
|---------|------|----------|-------------|
| `valinorStudio.samApiKey` | string | ✅ | SAM.gov API key |
| `valinorStudio.opensearchEndpoint` | string | ✅ | OpenSearch endpoint URL |
| `valinorStudio.opensearchUsername` | string | ✅ | OpenSearch username |
| `valinorStudio.opensearchPassword` | string | ✅ | OpenSearch password |
| `valinorStudio.openaiApiKey` | string | ❌ | OpenAI API key for AI features |
| `valinorStudio.awsAccessKeyId` | string | ❌ | AWS Access Key ID |
| `valinorStudio.awsSecretAccessKey` | string | ❌ | AWS Secret Access Key |
| `valinorStudio.awsRegion` | string | ❌ | AWS region (default: us-east-1) |
| `valinorStudio.googleAiApiKey` | string | ❌ | Google AI API key |
| `valinorStudio.nodeEnv` | string | ❌ | Environment (development/production) |

## 🚨 Security Notes

- **API keys are stored securely** in VS Code's encrypted settings
- **Settings are application-scoped** (not synced across machines)
- **Never commit API keys** to version control
- **Use environment-specific keys** for development vs production

## 🧪 Testing Your Configuration

After configuring your settings:

1. **Restart VS Code** to ensure settings are loaded
2. **Try importing an RFP** using the command palette
3. **Check the output panel** for any configuration errors
4. **Test AI features** by opening the chat panel

## 🔍 Troubleshooting

### Common Issues

1. **"No contract data found"**
   - Check your SAM API key is correct
   - Verify OpenSearch endpoint is accessible
   - Ensure OpenSearch credentials are valid

2. **"AI features not working"**
   - Verify your AI API keys are configured
   - Check API key quotas and limits
   - Ensure network connectivity

3. **"Configuration not loading"**
   - Restart VS Code after changing settings
   - Check for typos in API keys
   - Verify JSON syntax in settings.json

### Getting Help

- Check the **Output Panel** for detailed error messages
- Use the **Chat Panel** to ask questions about configuration
- Review the **README.md** for additional setup information

## 🎯 Next Steps

Once configured:

1. **Import your first RFP** using the Import RFP command
2. **Create a new proposal** to get started
3. **Explore AI features** in the chat panel
4. **Try pricing validation** on your proposal content

Happy proposing! 🚀
