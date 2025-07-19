# API Configuration Setup for Valinor Studio

## 🔐 Setting Up API Keys

To use the multi-model AI functionality in Valinor Studio, you need to configure your API keys.

### Step 1: Copy the Template
```bash
cp src/config/api-config.template.ts src/config/api-config.ts
```

### Step 2: Configure Your API Keys

Edit `src/config/api-config.ts` and add your real API keys:

#### OpenAI Configuration
```typescript
OPENAI: {
    API_KEY: 'sk-your-actual-openai-api-key-here',
    // ... rest of config
}
```

#### AWS Bedrock Configuration (for Claude models)
Set these environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_aws_access_key
export AWS_SECRET_ACCESS_KEY=your_aws_secret_key
export AWS_REGION=us-east-1
```

#### Google AI Configuration (for Gemini)
Set this environment variable:
```bash
export GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Step 3: Available Models

Once configured, you can use these AI models:

- **GPT-4** (Default) - Most capable OpenAI model
- **GPT-3.5** - Fast and efficient OpenAI model
- **Claude-3** - Latest Anthropic model via AWS Bedrock
- **Claude-2** - Anthropic model via AWS Bedrock
- **Gemini-Pro** - Google's AI model

### Step 4: Model Selection

- **Status Bar**: Click the model indicator in the status bar
- **Chat UI**: Use the dropdown in the chat header
- **Command Palette**: Use "Valinor Studio: Select Model"

## 🔒 Security Notes

- The `api-config.ts` file is excluded from git via `.gitignore`
- Never commit real API keys to version control
- Use environment variables for sensitive data when possible
- The template file (`api-config.template.ts`) is safe to commit

## 🚀 Testing

After configuration, test the setup by:
1. Opening the chat panel
2. Selecting a model from the dropdown
3. Pasting a Notice ID to trigger contract analysis

The system will automatically use the selected model for AI analysis.
