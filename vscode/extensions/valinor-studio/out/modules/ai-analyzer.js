"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModelConfig = exports.getAvailableModels = exports.analyzeContractWithAI = void 0;
const https = __importStar(require("https"));
const api_config_1 = require("../config/api-config");
// Helper function to make HTTPS requests
async function makeHttpsRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve(parsedData);
                }
                catch (error) {
                    reject(new Error(`Failed to parse response: ${responseData}`));
                }
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}
// Function to call OpenAI API
async function callOpenAI(model, prompt, output) {
    const config = (0, api_config_1.getModelConfig)(model);
    if (!config) {
        throw new Error(`Model ${model} not configured`);
    }
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }
    const requestData = {
        model: config.modelId,
        messages: [
            {
                role: 'system',
                content: 'You are an expert government contract analyst. Provide detailed, professional analysis of government contracts and RFPs.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: 4000,
        temperature: 0.7
    };
    try {
        output.appendLine(`🤖 Calling OpenAI API with model: ${model}`);
        const response = await makeHttpsRequest(config.endpoint, {
            method: 'POST',
            headers: config.headers
        }, requestData);
        if (response.choices && response.choices[0] && response.choices[0].message) {
            return response.choices[0].message.content;
        }
        else if (response.error) {
            throw new Error(`OpenAI API Error: ${response.error.message || response.error.type}`);
        }
        else {
            throw new Error('Invalid response format from OpenAI');
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        output.appendLine(`❌ OpenAI API Error: ${errorMessage}`);
        // Return a fallback response instead of throwing
        return `I apologize, but I encountered an error while processing your request: ${errorMessage}.

Here's what I can tell you about government contract analysis:

**Key Areas to Focus On:**
- Technical requirements and compliance
- Past performance and experience
- Pricing strategy and competitiveness
- Risk assessment and mitigation
- Proposal structure and organization

**Best Practices:**
- Thoroughly review all requirements
- Address each evaluation criterion
- Provide specific examples and metrics
- Ensure compliance with all regulations
- Create a compelling executive summary

Would you like me to help you with any specific aspect of contract analysis or proposal development?`;
    }
}
// Function to call Claude API (Bedrock)
async function callClaude(model, prompt, output) {
    const config = (0, api_config_1.getModelConfig)(model);
    if (!config) {
        throw new Error(`Model ${model} not configured`);
    }
    const requestData = {
        modelId: config.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
            max_tokens_to_sample: 4000,
            temperature: 0.7,
            top_p: 1,
            top_k: 250,
            stop_sequences: ['\n\nHuman:']
        })
    };
    try {
        const response = await makeHttpsRequest(config.endpoint, {
            method: 'POST',
            headers: config.headers
        }, requestData);
        if (response.completion) {
            return response.completion.trim();
        }
        else {
            throw new Error('Invalid response format from Claude');
        }
    }
    catch (error) {
        output.appendLine(`❌ Claude API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}
// Function to call Gemini API
async function callGemini(prompt, output) {
    const config = (0, api_config_1.getModelConfig)('Gemini-Pro');
    if (!config) {
        throw new Error('Gemini-Pro not configured');
    }
    const url = `${config.endpoint}?key=${config.apiKey}`;
    const requestData = {
        contents: [
            {
                parts: [
                    {
                        text: `You are an expert government contract analyst. Provide detailed, professional analysis of government contracts and RFPs.\n\n${prompt}`
                    }
                ]
            }
        ],
        generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.7
        }
    };
    try {
        const response = await makeHttpsRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, requestData);
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            return response.candidates[0].content.parts[0].text;
        }
        else {
            throw new Error('Invalid response format from Gemini');
        }
    }
    catch (error) {
        output.appendLine(`❌ Gemini API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}
// Main function to analyze contract with AI
async function analyzeContractWithAI(contractData, output, chatProvider, selectedModel = 'GPT-4') {
    try {
        // Validate model configuration
        if (!(0, api_config_1.validateModelConfig)(selectedModel)) {
            output.appendLine(`⚠️ Model ${selectedModel} not properly configured, falling back to GPT-4`);
            selectedModel = 'GPT-4';
        }
        output.appendLine(`🤖 Analyzing contract with ${selectedModel}...`);
        // Create comprehensive prompt for contract analysis
        const prompt = createContractAnalysisPrompt(contractData);
        let analysis;
        // Call appropriate API based on selected model
        if (selectedModel === 'GPT-4' || selectedModel === 'GPT-3.5') {
            analysis = await callOpenAI(selectedModel, prompt, output);
        }
        else if (selectedModel === 'Claude-3' || selectedModel === 'Claude-2') {
            analysis = await callClaude(selectedModel, prompt, output);
        }
        else if (selectedModel === 'Gemini-Pro') {
            analysis = await callGemini(prompt, output);
        }
        else {
            // Fallback to GPT-4
            analysis = await callOpenAI('GPT-4', prompt, output);
        }
        // Add analysis to chat
        chatProvider.addMessage('ai', analysis, selectedModel);
        output.appendLine(`✅ Contract analysis completed with ${selectedModel}`);
        output.appendLine(`📊 Analysis length: ${analysis.length} characters`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        output.appendLine(`❌ AI Analysis Error: ${errorMessage}`);
        // Add error message to chat
        chatProvider.addMessage('ai', `❌ Sorry, I encountered an error while analyzing the contract: ${errorMessage}`, selectedModel);
    }
}
exports.analyzeContractWithAI = analyzeContractWithAI;
// Function to create comprehensive contract analysis prompt
function createContractAnalysisPrompt(contractData) {
    return `Please provide a comprehensive analysis of the following government contract opportunity:

CONTRACT DETAILS:
- Title: ${contractData.title || 'N/A'}
- Notice ID: ${contractData.noticeId || 'N/A'}
- Agency: ${contractData.department || contractData.agency || 'N/A'}
- Posted Date: ${contractData.postedDate || 'N/A'}
- Response Deadline: ${contractData.responseDeadLine || 'N/A'}
- Solicitation Number: ${contractData.solicitationNumber || 'N/A'}
- Set Aside: ${contractData.setAside || 'N/A'}
- NAICS Code: ${contractData.naicsCode || 'N/A'}
- Contract Type: ${contractData.type || 'N/A'}
- Estimated Value: ${contractData.estimatedContractValue || contractData.valueRange || 'N/A'}

DESCRIPTION:
${contractData.description || 'No description provided.'}

POINT OF CONTACT:
${contractData.pointOfContact && contractData.pointOfContact.length > 0
        ? contractData.pointOfContact.map((contact, index) => `${index + 1}. ${contact.name || 'N/A'} - Email: ${contact.email || 'N/A'} - Phone: ${contact.phone || 'N/A'}`).join('\n')
        : 'No contact information provided.'}

Please provide a detailed analysis including:

1. **Executive Summary** - High-level overview and strategic assessment
2. **Requirements Analysis** - Key technical and business requirements
3. **Competitive Analysis** - Market position and competition assessment
4. **Risk Assessment** - Potential risks and mitigation strategies
5. **Opportunity Assessment** - Strategic value and business potential
6. **Action Items** - Immediate next steps and recommendations
7. **Resource Requirements** - Team, technology, and budget needs
8. **Timeline** - Key milestones and deadlines
9. **Compliance Considerations** - Regulatory and certification requirements
10. **Success Metrics** - KPIs and performance indicators

Please format your response with clear headings, bullet points, and professional language suitable for business decision-making.`;
}
// Function to get available models
function getAvailableModels() {
    return ['GPT-4', 'GPT-3.5', 'Claude-3', 'Claude-2', 'Gemini-Pro'];
}
exports.getAvailableModels = getAvailableModels;
// Function to validate model configuration
function validateModelConfig(model) {
    return (0, api_config_1.validateModelConfig)(model);
}
exports.validateModelConfig = validateModelConfig;
//# sourceMappingURL=ai-analyzer.js.map