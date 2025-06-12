const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');

class LLMService {
  /**
   * Create a new conversation
   * @param {Object} options - Conversation options
   * @returns {Promise<Object>} The created conversation
   */
  async createConversation({
    title = 'New Conversation',
    participants = [],
    metadata = {},
  } = {}) {
    try {
      const conversationId = uuidv4();
      const now = new Date().toISOString();
      
      await db.run(
        `INSERT INTO llm_conversations (
          id, title, participants, metadata, created_at, updated_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          conversationId,
          title,
          JSON.stringify(participants),
          JSON.stringify(metadata),
          now,
          now,
          true,
        ]
      );
      
      logger.info('Created new conversation', { conversationId, title });
      
      return this.getConversation(conversationId);
      
    } catch (error) {
      logger.error('Error creating conversation', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get a conversation by ID
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object>} The conversation
   */
  async getConversation(conversationId) {
    try {
      const conversation = await db.get(
        'SELECT * FROM llm_conversations WHERE id = ?',
        [conversationId]
      );
      
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }
      
      // Get messages for this conversation
      const messages = await db.all(
        'SELECT * FROM llm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      );
      
      return this._formatConversation(conversation, messages);
      
    } catch (error) {
      logger.error('Error getting conversation', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * List conversations with pagination
   * @param {Object} options - Pagination and filtering options
   * @returns {Promise<Object>} Paginated list of conversations
   */
  async listConversations({
    page = 1,
    limit = 20,
    isActive = true,
  } = {}) {
    try {
      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
      
      // Get conversations
      const conversations = await db.all(
        `SELECT * FROM llm_conversations 
         WHERE is_active = ? 
         ORDER BY updated_at DESC 
         LIMIT ? OFFSET ?`,
        [isActive, parseInt(limit), offset]
      );
      
      // Get total count for pagination
      const countResult = await db.get(
        'SELECT COUNT(*) as total FROM llm_conversations WHERE is_active = ?',
        [isActive]
      );
      
      const total = countResult ? countResult.total : 0;
      const totalPages = Math.ceil(total / limit);
      
      // Format conversations with message counts
      const formattedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const messageCount = await this._getMessageCount(conv.id);
          return {
            ...this._formatConversation(conv),
            messageCount,
          };
        })
      );
      
      return {
        data: formattedConversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      };
      
    } catch (error) {
      logger.error('Error listing conversations', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} The updated conversation
   */
  async updateConversation(conversationId, updates) {
    const { title, participants, metadata, isActive } = updates;
    
    try {
      // Get existing conversation
      const existing = await this.getConversation(conversationId);
      
      // Build update query
      const updateFields = [];
      const params = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        params.push(title);
      }
      
      if (participants !== undefined) {
        updateFields.push('participants = ?');
        params.push(JSON.stringify(participants));
      }
      
      if (metadata !== undefined) {
        updateFields.push('metadata = ?');
        params.push(JSON.stringify({
          ...(existing.metadata || {}),
          ...metadata,
        }));
      }
      
      if (isActive !== undefined) {
        updateFields.push('is_active = ?');
        params.push(isActive);
      }
      
      if (updateFields.length === 0) {
        return existing; // No updates
      }
      
      // Add updated_at and conversationId to params
      updateFields.push('updated_at = ?');
      params.push(new Date().toISOString(), conversationId);
      
      // Execute update
      await db.run(
        `UPDATE llm_conversations 
         SET ${updateFields.join(', ')} 
         WHERE id = ?`,
        params
      );
      
      logger.info('Updated conversation', { conversationId });
      
      // Return updated conversation
      return this.getConversation(conversationId);
      
    } catch (error) {
      logger.error('Error updating conversation', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Delete a conversation
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteConversation(conversationId) {
    try {
      // Check if conversation exists
      await this.getConversation(conversationId);
      
      // Delete all messages in the conversation
      await db.run(
        'DELETE FROM llm_messages WHERE conversation_id = ?',
        [conversationId]
      );
      
      // Delete the conversation
      await db.run(
        'DELETE FROM llm_conversations WHERE id = ?',
        [conversationId]
      );
      
      logger.info('Deleted conversation', { conversationId });
      
      return {
        success: true,
        message: 'Conversation deleted successfully',
      };
      
    } catch (error) {
      logger.error('Error deleting conversation', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Object} message - The message to add
   * @returns {Promise<Object>} The added message
   */
  async addMessage(conversationId, { role, content, metadata = {} }) {
    try {
      // Validate role
      if (!['user', 'assistant', 'system'].includes(role)) {
        throw new ValidationError('Invalid message role');
      }
      
      // Check if conversation exists and is active
      const conversation = await db.get(
        'SELECT * FROM llm_conversations WHERE id = ? AND is_active = ?',
        [conversationId, true]
      );
      
      if (!conversation) {
        throw new NotFoundError('Active conversation not found');
      }
      
      const messageId = uuidv4();
      const now = new Date().toISOString();
      
      // Add the message
      await db.run(
        `INSERT INTO llm_messages (
          id, conversation_id, role, content, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          messageId,
          conversationId,
          role,
          content,
          JSON.stringify(metadata),
          now,
        ]
      );
      
      // Update conversation's updated_at
      await db.run(
        'UPDATE llm_conversations SET updated_at = ? WHERE id = ?',
        [now, conversationId]
      );
      
      logger.debug('Added message to conversation', {
        conversationId,
        messageId,
        role,
        contentLength: content.length,
      });
      
      // Return the created message
      return this.getMessage(messageId);
      
    } catch (error) {
      logger.error('Error adding message to conversation', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get a message by ID
   * @param {string} messageId - The message ID
   * @returns {Promise<Object>} The message
   */
  async getMessage(messageId) {
    try {
      const message = await db.get(
        'SELECT * FROM llm_messages WHERE id = ?',
        [messageId]
      );
      
      if (!message) {
        throw new NotFoundError('Message not found');
      }
      
      return this._formatMessage(message);
      
    } catch (error) {
      logger.error('Error getting message', {
        messageId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * List messages in a conversation with pagination
   * @param {string} conversationId - The conversation ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated list of messages
   */
  async listMessages(conversationId, {
    page = 1,
    limit = 50,
    before,
  } = {}) {
    try {
      // Check if conversation exists
      await this.getConversation(conversationId);
      
      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
      
      // Build query
      let query = 'SELECT * FROM llm_messages WHERE conversation_id = ?';
      const params = [conversationId];
      
      if (before) {
        query += ' AND created_at < ?';
        params.push(before);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      // Get messages
      const messages = await db.all(query, params);
      
      // Get total count for pagination
      const countResult = await db.get(
        'SELECT COUNT(*) as total FROM llm_messages WHERE conversation_id = ?',
        [conversationId]
      );
      
      const total = countResult ? countResult.total : 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: messages.map(this._formatMessage),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      };
      
    } catch (error) {
      logger.error('Error listing messages', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Generate a response using an LLM
   * @param {string} conversationId - The conversation ID
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} The generated response
   */
  async generateResponse(conversationId, {
    model = 'llama3',
    temperature = 0.7,
    maxTokens = 2048,
    stream = false,
    systemPrompt,
  } = {}) {
    try {
      // Get conversation with messages
      const conversation = await this.getConversation(conversationId);
      
      // Prepare messages for the LLM
      const messages = [];
      
      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      
      // Add conversation messages
      messages.push(...conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })));
      
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
            num_predict: maxTokens,
          },
        };
      } else {
        // OpenAI-compatible format (LM Studio, vLLM, etc.)
        payload = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream,
        };
      }
      
      logger.debug('Sending request to LLM', {
        conversationId,
        model,
        messageCount: messages.length,
        stream,
      });
      
      // Make the request to the LLM
      const response = await axios.post(llmUrl, payload, { 
        headers,
        responseType: stream ? 'stream' : 'json',
        timeout: 300000, // 5 minute timeout
      });
      
      // Handle streaming response
      if (stream) {
        return response.data; // Return the stream
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
      
      // Add the assistant's response to the conversation
      const assistantMessage = result.choices[0].message;
      await this.addMessage(conversationId, {
        role: 'assistant',
        content: assistantMessage.content,
        metadata: {
          model,
          temperature,
          maxTokens,
          usage: result.usage,
          finishReason: result.choices[0].finish_reason,
        },
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error generating LLM response', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });
      
      // Format error response
      let statusCode = 500;
      let errorMessage = 'Failed to generate response';
      
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
  }

  /**
   * Get available LLM models
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      // Check which LLM service is available
      if (config.llm.ollama.enabled) {
        try {
          const response = await axios.get(`${config.llm.ollama.url}/api/tags`);
          return response.data.models.map(model => ({
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
          // Continue with empty array
        }
      }
      
      if (config.llm.lmstudio.enabled) {
        try {
          const response = await axios.get(`${config.llm.lmstudio.url}/v1/models`);
          return response.data.data.map(model => ({
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
          // Continue with empty array
        }
      }
      
      // If no models found from any provider, return some defaults
      return [
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
      
    } catch (error) {
      logger.error('Error getting available models', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get message count for a conversation
   * @private
   */
  async _getMessageCount(conversationId) {
    try {
      const result = await db.get(
        'SELECT COUNT(*) as count FROM llm_messages WHERE conversation_id = ?',
        [conversationId]
      );
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Error getting message count', {
        conversationId,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Format a conversation
   * @private
   */
  _formatConversation(conversation, messages) {
    return {
      id: conversation.id,
      title: conversation.title,
      participants: JSON.parse(conversation.participants || '[]'),
      metadata: JSON.parse(conversation.metadata || '{}'),
      isActive: Boolean(conversation.is_active),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: messages ? messages.map(this._formatMessage) : [],
    };
  }

  /**
   * Format a message
   * @private
   */
  _formatMessage(message) {
    return {
      id: message.id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      metadata: JSON.parse(message.metadata || '{}'),
      createdAt: message.created_at,
    };
  }
}

module.exports = new LLMService();
