const express = require('express');
const { askAI } = require('../ai/ask-ai.cjs');
const router = express.Router();

router.post('/api/ask-ai', async (req, res) => {
  const { question, userId, sessionId } = req.body;

  // Log the incoming request
  console.log('AI API Request:', { question: question?.substring(0, 100) + '...', userId, sessionId });

  try {
    // Make userId and sessionId optional with defaults
    const result = await askAI({
      question,
      userId: userId || 'default-user',
      sessionId: sessionId || 'default-session'
    });

    console.log('AI API Response sent successfully');
    res.json(result);
  } catch (err) {
    console.error('AI API Error:', err);
    // Return a fallback response instead of error
    res.json({
      answer: `I understand you're asking about: "${question}". While I'm experiencing some technical difficulties, I can help you with general information about government contracts. Government contracts are published on SAM.gov and include details like Notice ID, title, description, agency, and important dates.`,
      context: 'Service temporarily unavailable - using fallback response',
      contracts: [],
      confidence: 0.3,
      note: 'AI services are currently experiencing issues. This is a fallback response.'
    });
  }
});

// Add a health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      bedrock: !!process.env.AWS_ACCESS_KEY_ID,
      openai: !!process.env.OPENAI_API_KEY,
      opensearch: !!process.env.OPENSEARCH_ENDPOINT,
      dynamodb: !!process.env.AWS_ACCESS_KEY_ID
    },
    architecture: {
      source: 'DynamoDB (GovContracts)',
      search: 'DynamoDB Direct (OpenSearch not configured)',
      flow: 'DynamoDB → Direct Search (OpenSearch pipeline not set up)'
    },
    note: 'Currently searching DynamoDB directly since OpenSearch is not configured'
  });
});

module.exports = router;
