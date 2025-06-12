const express = require('express');
const router = express.Router();
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

/**
 * POST /api/llm/chat
 * Chat with an LLM
 */
router.post('/chat', asyncHandler(async (req, res) => {
  const { 
    messages, 
    model = 'llama3',
    temperature = 0.7,
    max_tokens = 2048,
    stream = false
  } = req.body;

  // Validate request
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('Messages array is required');
  }

  // Determine which LLM provider to use
  let llmUrl;
  let headers = { 'Content-Type': 'application/json' };
  
  // Check which LLM service is available
  if (config.llm.ollama.enabled) {
    llmUrl = `${config.llm.ollama.url}/api/chat`;
  } else if (config.llm.lmstudio.enabled) {
    llmUrl = `${config.llm.lmstudio.url}/v1/chat/completions`;
    headers['Authorization'] = 'Bearer not-needed';
  } else if (config.llm.vllm.enabled) {
    llmUrl = `${config.llm.vllm.url}/v1/chat/completions`;
  } else {
    throw new Error('No LLM service is configured or enabled');
  }

  try {
    // Prepare request payload based on the LLM provider
    let payload;
    if (llmUrl.includes('ollama')) {
      // Ollama format
      const lastMessage = messages[messages.length - 1];
      payload = {
        model,
        messages: [lastMessage], // Ollama typically only needs the last message
        stream: false,
        options: {
          temperature,
          num_predict: max_tokens,
        },
      };
    } else {
      // OpenAI-compatible format (LM Studio, vLLM, etc.)
      payload = {
        model,
        messages,
        temperature,
        max_tokens,
        stream,
      };
    }

    logger.debug('Sending request to LLM', {
      url: llmUrl,
      model,
      messageCount: messages.length,
    });

    // Make the request to the LLM
    const response = await axios.post(llmUrl, payload, { 
      headers,
      responseType: stream ? 'stream' : 'json',
      timeout: 300000, // 5 minute timeout
    });

    // Handle streaming response
    if (stream) {
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in Nginx

      // Pipe the LLM response to the client
      response.data.pipe(res);
      
      // Handle connection close
      req.on('close', () => {
        logger.debug('Client disconnected during streaming');
        response.data.destroy(); // Clean up the stream
      });
      
      return;
    }

    // Handle non-streaming response
    let result;
    if (llmUrl.includes('ollama')) {
      // Ollama response format
      result = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.data.message?.content || '',
          },
          finish_reason: response.data.done ? 'stop' : null,
        }],
        usage: {
          prompt_tokens: 0, // Ollama doesn't provide token counts
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    } else {
      // OpenAI-compatible response format
      result = response.data;
    }

    res.json(result);

  } catch (error) {
    logger.error('Error calling LLM', {
      error: error.message,
      stack: error.stack,
      llmUrl,
      model,
    });
    
    // Format error response
    let statusCode = 500;
    let errorMessage = 'Failed to process request';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || error.message;
      
      logger.error('LLM API error response', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from LLM service';
      logger.error('No response from LLM service', {
        url: llmUrl,
        error: error.message,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
    }
    
    const err = new Error(errorMessage);
    err.statusCode = statusCode;
    throw err;
  }
}));

/**
 * GET /api/llm/models
 * Get available LLM models
 */
router.get('/models', asyncHandler(async (req, res) => {
  // Check which LLM service is available
  let models = [];
  
  if (config.llm.ollama.enabled) {
    try {
      const response = await axios.get(`${config.llm.ollama.url}/api/tags`);
      models = response.data.models.map(model => ({
        id: model.name,
        name: model.name,
        provider: 'ollama',
        details: {
          modified_at: model.modified_at,
          size: model.size,
          digest: model.digest,
        },
      }));
    } catch (error) {
      logger.error('Failed to fetch models from Ollama', {
        error: error.message,
        stack: error.stack,
      });
      // Continue with empty models array
    }
  }
  
  if (config.llm.lmstudio.enabled && models.length === 0) {
    try {
      const response = await axios.get(`${config.llm.lmstudio.url}/v1/models`);
      models = response.data.data.map(model => ({
        id: model.id,
        name: model.id.split('/').pop(),
        provider: 'lmstudio',
        details: {
          created: model.created,
          owned_by: model.owned_by,
        },
      }));
    } catch (error) {
      logger.error('Failed to fetch models from LM Studio', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
  
  // If no models found from any provider, return some defaults
  if (models.length === 0) {
    models = [
      {
        id: 'llama3',
        name: 'llama3',
        provider: 'ollama',
        details: {},
      },
      {
        id: 'mistral',
        name: 'mistral',
        provider: 'ollama',
        details: {},
      },
    ];
  }
  
  res.json({
    object: 'list',
    data: models,
  });
}));

/**
 * POST /api/llm/embed
 * Generate embeddings for text
 */
router.post('/embed', asyncHandler(async (req, res) => {
  const { text, model = 'all-mpnet-base-v2' } = req.body;
  
  if (!text) {
    throw new ValidationError('Text is required');
  }
  
  // In a real implementation, this would call an embedding model
  // For now, we'll return a dummy embedding
  const embedding = Array(768).fill(0).map(() => Math.random());
  
  res.json({
    object: 'embedding',
    data: [{
      object: 'embedding',
      embedding,
      index: 0,
    }],
    model,
    usage: {
      prompt_tokens: text.split(/\s+/).length,
      total_tokens: text.split(/\s+/).length,
    },
  });
}));

module.exports = router;
