const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');
const llmService = require('./llmService');

class TeamsService {
  /**
   * Process an incoming message from Teams
   * @param {Object} message - The incoming message
   * @returns {Promise<Object>} Processing result
   */
  async processIncomingMessage(message) {
    const startTime = Date.now();
    let messageId;
    
    try {
      // Validate the message
      this._validateMessage(message);
      
      const { channelId, from, text, metadata = {} } = message;
      
      // Save the message to the database
      messageId = await this._saveMessage({
        channelId,
        from,
        text,
        metadata,
        status: 'received',
      });
      
      // Check if this is a reply to a previous message
      let inReplyTo = null;
      if (metadata.inReplyToId) {
        inReplyTo = await this._getMessage(metadata.inReplyToId);
      }
      
      // Determine if we should respond to this message
      const shouldRespond = await this._shouldRespondToMessage(message, inReplyTo);
      
      if (!shouldRespond) {
        return {
          success: true,
          message: 'Message processed (no response needed)',
          messageId,
        };
      }
      
      // Generate a response using the LLM
      const responseText = await this._generateResponse(message, inReplyTo);
      
      // Send the response back to Teams
      const responseMessage = await this._sendMessageToTeams({
        channelId,
        text: responseText,
        metadata: {
          inReplyToId: messageId,
          isAIResponse: true,
        },
      });
      
      const duration = Date.now() - startTime;
      
      logger.info('Processed Teams message', {
        messageId,
        channelId,
        responseMessageId: responseMessage.id,
        responseLength: responseText.length,
        duration: `${duration}ms`,
      });
      
      return {
        success: true,
        message: 'Message processed and responded to',
        messageId,
        responseMessageId: responseMessage.id,
      };
      
    } catch (error) {
      logger.error('Error processing Teams message', {
        message,
        error: error.message,
        stack: error.stack,
      });
      
      // Update message status to error
      if (messageId) {
        await this._updateMessageStatus(messageId, 'error', error.message);
      }
      
      throw error;
    }
  }

  /**
   * Send a message to a Teams channel
   * @param {Object} options - Message options
   * @returns {Promise<Object>} The sent message
   */
  async sendMessage({
    channelId,
    text,
    metadata = {},
  } = {}) {
    let messageId;
    
    try {
      // Validate input
      if (!channelId) {
        throw new ValidationError('Channel ID is required');
      }
      
      if (!text) {
        throw new ValidationError('Message text is required');
      }
      
      // Save the message to our database first
      messageId = await this._saveMessage({
        channelId,
        from: { id: 'system', name: 'System' },
        text,
        metadata: {
          ...metadata,
          isOutgoing: true,
        },
        status: 'sending',
      });
      
      // Send the message to Teams
      const response = await this._sendToTeamsApi({
        channelId,
        text,
        metadata: {
          ...metadata,
          messageId,
        },
      });
      
      // Update the message status to sent
      await this._updateMessageStatus(messageId, 'sent', null, response.id);
      
      logger.info('Sent message to Teams', {
        messageId,
        channelId,
        teamsMessageId: response.id,
      });
      
      return {
        id: messageId,
        teamsMessageId: response.id,
        channelId,
        text,
        metadata,
        status: 'sent',
        sentAt: new Date().toISOString(),
      };
      
    } catch (error) {
      logger.error('Error sending message to Teams', {
        channelId,
        error: error.message,
        stack: error.stack,
      });
      
      // Update message status to error if we have a messageId
      if (messageId) {
        await this._updateMessageStatus(messageId, 'error', error.message);
      }
      
      throw error;
    }
  }

  /**
   * Get messages from a channel
   * @param {string} channelId - The channel ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of messages
   */
  async getChannelMessages(channelId, {
    limit = 50,
    before,
    after,
    include = [],
  } = {}) {
    try {
      if (!channelId) {
        throw new ValidationError('Channel ID is required');
      }
      
      // Build the query
      let query = 'SELECT * FROM teams_messages WHERE channel_id = ?';
      const params = [channelId];
      
      if (before) {
        query += ' AND created_at < ?';
        params.push(before);
      }
      
      if (after) {
        query += ' AND created_at > ?';
        params.push(after);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(parseInt(limit, 10));
      
      // Execute the query
      const messages = await db.all(query, params);
      
      // Format the messages
      const formattedMessages = messages.map(msg => this._formatMessage(msg));
      
      // Include additional data if requested
      if (include.includes('userDetails')) {
        // In a real implementation, you might fetch user details from a user service
        // For now, we'll just return the basic message data
      }
      
      return formattedMessages;
      
    } catch (error) {
      logger.error('Error getting channel messages', {
        channelId,
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
      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }
      
      const message = await db.get(
        'SELECT * FROM teams_messages WHERE id = ?',
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
   * Get channel information
   * @param {string} channelId - The channel ID
   * @returns {Promise<Object>} Channel information
   */
  async getChannelInfo(channelId) {
    try {
      if (!channelId) {
        throw new ValidationError('Channel ID is required');
      }
      
      // In a real implementation, you would fetch this from the Teams API
      // For now, we'll return a mock response
      return {
        id: channelId,
        name: `Channel ${channelId.substring(0, 8)}`,
        type: 'standard',
        created: new Date().toISOString(),
        memberCount: 5, // Mock value
        isMember: true,
        metadata: {},
      };
      
    } catch (error) {
      logger.error('Error getting channel info', {
        channelId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validate a Teams message
   * @private
   */
  _validateMessage(message) {
    if (!message) {
      throw new ValidationError('Message is required');
    }
    
    if (!message.channelId) {
      throw new ValidationError('channelId is required');
    }
    
    if (!message.from || !message.from.id || !message.from.name) {
      throw new ValidationError('Invalid sender information');
    }
    
    if (!message.text && !message.attachments?.length) {
      throw new ValidationError('Message must have text or attachments');
    }
  }

  /**
   * Save a message to the database
   * @private
   */
  async _saveMessage({
    channelId,
    from,
    text,
    metadata = {},
    status = 'received',
  }) {
    const messageId = uuidv4();
    const now = new Date().toISOString();
    
    try {
      await db.run(
        `INSERT INTO teams_messages (
          id, message_text, from_user, channel_id, channel_data, 
          in_reply_to_id, created_at, metadata, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageId,
          text,
          JSON.stringify(from),
          channelId,
          JSON.stringify(metadata.channelData || {}),
          metadata.inReplyToId || null,
          now,
          JSON.stringify(metadata),
          status,
        ]
      );
      
      return messageId;
      
    } catch (error) {
      logger.error('Error saving message to database', {
        channelId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update a message status
   * @private
   */
  async _updateMessageStatus(messageId, status, error = null, externalId = null) {
    try {
      const updates = ['status = ?'];
      const params = [status];
      
      if (error) {
        updates.push('error = ?');
        params.push(error);
      }
      
      if (externalId) {
        updates.push('external_id = ?');
        params.push(externalId);
      }
      
      params.push(messageId);
      
      await db.run(
        `UPDATE teams_messages 
         SET ${updates.join(', ')} 
         WHERE id = ?`,
        params
      );
      
    } catch (error) {
      logger.error('Error updating message status', {
        messageId,
        status,
        error: error.message,
      });
      // Don't throw, as this is a non-critical operation
    }
  }

  /**
   * Determine if we should respond to a message
   * @private
   */
  async _shouldRespondToMessage(message, inReplyTo) {
    // Don't respond to our own messages
    if (message.from.id === 'system' || message.metadata.isOutgoing) {
      return false;
    }
    
    // Check if this is a direct mention or reply to the bot
    const isMentioned = this._isBotMentioned(message.text);
    const isReplyToBot = inReplyTo?.metadata?.isAIResponse;
    
    // Only respond to direct mentions or replies to our messages
    return isMentioned || isReplyToBot;
  }

  /**
   * Check if the bot is mentioned in the message
   * @private
   */
  _isBotMentioned(text) {
    if (!text) return false;
    
    // Check for @mention of the bot (case-insensitive)
    const botMentionRegex = new RegExp(`@${config.teams.botName}`, 'i');
    return botMentionRegex.test(text);
  }

  /**
   * Generate a response to a message using the LLM
   * @private
   */
  async _generateResponse(message, inReplyTo) {
    try {
      // Get conversation context (last 10 messages)
      const context = await this.getChannelMessages(message.channelId, {
        limit: 10,
        include: ['userDetails'],
      });
      
      // Prepare the conversation history for the LLM
      const messages = context.reverse().map(msg => ({
        role: msg.from.id === 'system' ? 'assistant' : 'user',
        content: msg.text,
        name: msg.from.name,
      }));
      
      // Add a system prompt
      const systemPrompt = this._getSystemPrompt(message.channelId);
      messages.unshift({
        role: 'system',
        content: systemPrompt,
      });
      
      // Generate a response using the LLM
      const response = await llmService.generateResponse({
        messages,
        temperature: 0.7,
        maxTokens: 500,
      });
      
      return response.choices[0].message.content;
      
    } catch (error) {
      logger.error('Error generating response', {
        messageId: message.id,
        error: error.message,
        stack: error.stack,
      });
      
      // Return a friendly error message
      return "I'm sorry, I encountered an error while processing your message. Please try again later.";
    }
  }

  /**
   * Get the system prompt for a channel
   * @private
   */
  _getSystemPrompt(channelId) {
    // In a real implementation, you might customize the prompt based on the channel
    return `You are a helpful AI assistant in a Microsoft Teams channel. 
Be concise and helpful in your responses. 
Format your responses in Markdown.`;
  }

  /**
   * Send a message to the Teams API
   * @private
   */
  async _sendToTeamsApi({ channelId, text, metadata = {} }) {
    try {
      // In a real implementation, you would call the Microsoft Graph API
      // or your Teams webhook URL here
      const response = await axios.post(
        `${config.teams.apiUrl}/channels/${channelId}/messages`,
        { text, metadata },
        {
          headers: {
            'Authorization': `Bearer ${config.teams.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
      
    } catch (error) {
      logger.error('Error sending message to Teams API', {
        channelId,
        error: error.message,
        response: error.response?.data,
      });
      
      throw new Error('Failed to send message to Teams');
    }
  }

  /**
   * Format a message from the database
   * @private
   */
  _formatMessage(dbMessage) {
    if (!dbMessage) return null;
    
    return {
      id: dbMessage.id,
      text: dbMessage.message_text,
      from: JSON.parse(dbMessage.from_user || '{}'),
      channelId: dbMessage.channel_id,
      channelData: JSON.parse(dbMessage.channel_data || '{}'),
      inReplyToId: dbMessage.in_reply_to_id,
      createdAt: dbMessage.created_at,
      status: dbMessage.status,
      error: dbMessage.error,
      metadata: JSON.parse(dbMessage.metadata || '{}'),
    };
  }
}

module.exports = new TeamsService();
