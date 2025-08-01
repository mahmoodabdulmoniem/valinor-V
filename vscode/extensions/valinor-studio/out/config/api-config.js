"use strict";
// API Configuration for Valinor Studio
// Environment variables will override these default values
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableModels = exports.validateModelConfig = exports.getModelConfig = exports.MODEL_CONFIGS = exports.API_CONFIG = void 0;
exports.API_CONFIG = {
    // OpenAI Configuration
    OPENAI: {
        API_KEY: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
        ENDPOINT: 'https://api.openai.com/v1/chat/completions',
        MODELS: {
            'GPT-4': 'gpt-4',
            'GPT-3.5': 'gpt-3.5-turbo'
        }
    },
    // AWS Bedrock Configuration
    BEDROCK: {
        REGION: 'us-east-1',
        ENDPOINT: 'https://bedrock-runtime.us-east-1.amazonaws.com/invoke',
        MODELS: {
            'Claude-2': 'anthropic.claude-v2',
            'Claude-3': 'anthropic.claude-3-sonnet-20240229-v1:0'
        }
    },
    // Google AI Configuration
    GOOGLE_AI: {
        ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        MODELS: {
            'Gemini-Pro': 'gemini-pro'
        }
    },
    // SAM.gov Configuration
    SAM: {
        API_KEY: process.env.SAM_API_KEY || '',
        ENDPOINT: 'https://api.sam.gov/entity-information/v3/entities'
    },
    // OpenSearch Configuration
    OPENSEARCH: {
        ENDPOINT: process.env.OPENSEARCH_ENDPOINT || '',
        USERNAME: process.env.OPENSEARCH_USERNAME || '',
        PASSWORD: process.env.OPENSEARCH_PASSWORD || ''
    }
};
// Model configurations with API details
exports.MODEL_CONFIGS = {
    'GPT-4': {
        name: 'GPT-4',
        provider: 'OpenAI',
        apiKey: exports.API_CONFIG.OPENAI.API_KEY,
        endpoint: exports.API_CONFIG.OPENAI.ENDPOINT,
        modelId: exports.API_CONFIG.OPENAI.MODELS['GPT-4'],
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${exports.API_CONFIG.OPENAI.API_KEY}`
        }
    },
    'GPT-3.5': {
        name: 'GPT-3.5',
        provider: 'OpenAI',
        apiKey: exports.API_CONFIG.OPENAI.API_KEY,
        endpoint: exports.API_CONFIG.OPENAI.ENDPOINT,
        modelId: exports.API_CONFIG.OPENAI.MODELS['GPT-3.5'],
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${exports.API_CONFIG.OPENAI.API_KEY}`
        }
    },
    'Claude-3': {
        name: 'Claude-3',
        provider: 'Anthropic',
        apiKey: process.env.AWS_ACCESS_KEY_ID || '',
        endpoint: exports.API_CONFIG.BEDROCK.ENDPOINT,
        modelId: exports.API_CONFIG.BEDROCK.MODELS['Claude-3'],
        headers: {
            'Content-Type': 'application/json',
            'X-Amz-Target': 'com.amazonaws.bedrock.runtime.model.InvokeModel'
        }
    },
    'Claude-2': {
        name: 'Claude-2',
        provider: 'Anthropic',
        apiKey: process.env.AWS_ACCESS_KEY_ID || '',
        endpoint: exports.API_CONFIG.BEDROCK.ENDPOINT,
        modelId: exports.API_CONFIG.BEDROCK.MODELS['Claude-2'],
        headers: {
            'Content-Type': 'application/json',
            'X-Amz-Target': 'com.amazonaws.bedrock.runtime.model.InvokeModel'
        }
    },
    'Gemini-Pro': {
        name: 'Gemini-Pro',
        provider: 'Google',
        apiKey: process.env.GOOGLE_AI_API_KEY || '',
        endpoint: exports.API_CONFIG.GOOGLE_AI.ENDPOINT,
        modelId: exports.API_CONFIG.GOOGLE_AI.MODELS['Gemini-Pro'],
        headers: {
            'Content-Type': 'application/json'
        }
    }
};
// Function to get model configuration
function getModelConfig(modelName) {
    return exports.MODEL_CONFIGS[modelName];
}
exports.getModelConfig = getModelConfig;
// Function to validate model configuration
function validateModelConfig(modelName) {
    const config = getModelConfig(modelName);
    if (!config)
        return false;
    // Check if API key is available
    if (modelName === 'GPT-4' || modelName === 'GPT-3.5') {
        return !!exports.API_CONFIG.OPENAI.API_KEY && exports.API_CONFIG.OPENAI.API_KEY !== 'your_openai_api_key_here';
    }
    else if (modelName === 'Claude-3' || modelName === 'Claude-2') {
        return !!process.env.AWS_ACCESS_KEY_ID;
    }
    else if (modelName === 'Gemini-Pro') {
        return !!process.env.GOOGLE_AI_API_KEY;
    }
    return false;
}
exports.validateModelConfig = validateModelConfig;
// Function to get available models
function getAvailableModels() {
    return Object.keys(exports.MODEL_CONFIGS);
}
exports.getAvailableModels = getAvailableModels;
//# sourceMappingURL=api-config.js.map