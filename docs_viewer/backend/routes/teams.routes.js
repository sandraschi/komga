const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');

/**
 * POST /api/teams/webhook
 * Handle incoming webhooks from Microsoft Teams
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const { value } = req.body;
  
  if (!value || !Array.isArray(value)) {
    throw new ValidationError('Invalid webhook payload');
  }
  
  // Process each message in the webhook
  const results = await Promise.all(
    value.map(async (item) => {
      try {
        const { text, from, channelId, channelData, timestamp } = item;
        
        // Log the incoming message
        const messageId = uuidv4();
        await db.run(
          `INSERT INTO teams_messages (
            id, message_text, from_user, channel_id, 
            channel_data, created_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            text,
            JSON.stringify(from),
            channelId,
            JSON.stringify(channelData || {}),
            new Date(timestamp).toISOString() || new Date().toISOString(),
            'received'
          ]
        );
        
        logger.info('Received Teams message', {
          messageId,
          channelId,
          from: from?.name || 'unknown',
          text: text?.substring(0, 100) + (text?.length > 100 ? '...' : '')
        });
        
        // Process the message (e.g., send to LLM, trigger actions)
        await processTeamsMessage(messageId, text, from, channelId, channelData);
        
        return { success: true, messageId };
        
      } catch (error) {
        logger.error('Error processing Teams webhook item', {
          error: error.message,
          stack: error.stack,
          item,
        });
        return { success: false, error: error.message };
      }
    })
  );
  
  res.json({ results });
}));

/**
 * POST /api/teams/messages/:messageId/reply
 * Reply to a Teams message
 */
router.post('/messages/:messageId/reply', asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { text, attachments = [] } = req.body;
  
  if (!text && (!attachments || attachments.length === 0)) {
    throw new ValidationError('Either text or attachments must be provided');
  }
  
  // Get the original message
  const message = await db.get(
    'SELECT * FROM teams_messages WHERE id = ?',
    [messageId]
  );
  
  if (!message) {
    throw new NotFoundError('Message not found');
  }
  
  try {
    // In a real implementation, you would use the Microsoft Graph API
    // or Bot Framework to send the reply
    // This is a simplified example
    
    const replyId = uuidv4();
    const channelId = message.channel_id;
    const replyData = {
      text,
      attachments,
      inReplyToId: messageId,
      channelId,
    };
    
    // Log the reply in the database
    await db.run(
      `INSERT INTO teams_messages (
        id, message_text, from_user, channel_id, 
        channel_data, in_reply_to_id, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        replyId,
        text,
        JSON.stringify({ name: 'Docs Viewer Bot', id: 'docs-viewer-bot' }),
        channelId,
        JSON.stringify({ type: 'outgoing' }),
        messageId,
        new Date().toISOString(),
        'sent'
      ]
    );
    
    logger.info('Sending Teams reply', {
      replyId,
      originalMessageId: messageId,
      channelId,
      text: text?.substring(0, 100) + (text?.length > 100 ? '...' : '')
    });
    
    // Simulate sending the message
    // In a real implementation, you would call the Microsoft Graph API here
    await simulateSendMessage(replyData);
    
    // Update the message status
    await db.run(
      'UPDATE teams_messages SET status = ? WHERE id = ?',
      ['delivered', replyId]
    );
    
    res.json({
      success: true,
      messageId: replyId,
      status: 'delivered',
    });
    
  } catch (error) {
    logger.error('Error sending Teams reply', {
      messageId,
      error: error.message,
      stack: error.stack,
    });
    
    // Update the message status to failed
    try {
      await db.run(
        'UPDATE teams_messages SET status = ?, error = ? WHERE id = ?',
        ['failed', error.message, messageId]
      );
    } catch (dbError) {
      logger.error('Failed to update message status', {
        messageId,
        error: dbError.message,
      });
    }
    
    throw error;
  }
}));

/**
 * GET /api/teams/conversations
 * List all conversations
 */
router.get('/conversations', asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  // Get unique conversations based on channel_id
  const conversations = await db.all(
    `SELECT 
      channel_id as id,
      MAX(created_at) as last_activity,
      COUNT(*) as message_count,
      (SELECT message_text FROM teams_messages 
       WHERE channel_id = t.channel_id 
       ORDER BY created_at DESC LIMIT 1) as last_message_preview
    FROM teams_messages t
    GROUP BY channel_id
    ORDER BY last_activity DESC
    LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );
  
  // Get total count for pagination
  const countResult = await db.get(
    'SELECT COUNT(DISTINCT channel_id) as total FROM teams_messages'
  );
  
  res.json({
    data: conversations,
    pagination: {
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
}));

/**
 * GET /api/teams/conversations/:channelId/messages
 * Get messages in a conversation
 */
router.get('/conversations/:channelId/messages', asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { limit = 50, before } = req.query;
  
  let query = `
    SELECT * FROM teams_messages 
    WHERE channel_id = ?
  `;
  
  const params = [channelId];
  
  if (before) {
    query += ' AND created_at < ?';
    params.push(before);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const messages = await db.all(query, params);
  
  // Format the response
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    text: msg.message_text,
    from: JSON.parse(msg.from_user || '{}'),
    channelId: msg.channel_id,
    channelData: JSON.parse(msg.channel_data || '{}'),
    inReplyToId: msg.in_reply_to_id,
    createdAt: msg.created_at,
    status: msg.status,
    error: msg.error,
  }));
  
  res.json({
    data: formattedMessages,
    pagination: {
      limit: parseInt(limit),
      hasMore: messages.length >= limit,
    },
  });
}));

/**
 * Process an incoming Teams message
 */
async function processTeamsMessage(messageId, text, from, channelId, channelData) {
  try {
    // Update message status to processing
    await db.run(
      'UPDATE teams_messages SET status = ? WHERE id = ?',
      ['processing', messageId]
    );
    
    // Simple echo bot for demonstration
    // In a real implementation, you would integrate with your LLM or other services
    if (text) {
      const responseText = `You said: ${text}`;
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save the response
      const replyId = uuidv4();
      await db.run(
        `INSERT INTO teams_messages (
          id, message_text, from_user, channel_id, 
          channel_data, in_reply_to_id, created_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          replyId,
          responseText,
          JSON.stringify({ name: 'Docs Viewer Bot', id: 'docs-viewer-bot' }),
          channelId,
          JSON.stringify({ type: 'outgoing' }),
          messageId,
          new Date().toISOString(),
          'pending'
        ]
      );
      
      // Simulate sending the message
      await simulateSendMessage({
        text: responseText,
        channelId,
        inReplyToId: messageId,
      });
      
      // Update status to sent
      await db.run(
        'UPDATE teams_messages SET status = ? WHERE id = ?',
        ['sent', replyId]
      );
    }
    
    // Update message status to processed
    await db.run(
      'UPDATE teams_messages SET status = ? WHERE id = ?',
      ['processed', messageId]
    );
    
  } catch (error) {
    logger.error('Error processing Teams message', {
      messageId,
      error: error.message,
      stack: error.stack,
    });
    
    // Update message status to error
    await db.run(
      'UPDATE teams_messages SET status = ?, error = ? WHERE id = ?',
      ['error', error.message, messageId]
    );
    
    throw error;
  }
}

/**
 * Simulate sending a message to Teams
 * In a real implementation, this would call the Microsoft Graph API
 */
async function simulateSendMessage(message) {
  logger.debug('Simulating Teams message send', {
    channelId: message.channelId,
    text: message.text,
    inReplyToId: message.inReplyToId,
  });
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real implementation, you would use:
  // const response = await axios.post(
  //   'https://graph.microsoft.com/v1.0/teams/{team-id}/channels/{channel-id}/messages',
  //   {
  //     body: {
  //       content: message.text,
  //       contentType: 'text',
  //     },
  //   },
  //   {
  //     headers: {
  //       'Authorization': `Bearer ${accessToken}`,
  //       'Content-Type': 'application/json',
  //     },
  //   }
  // );
  
  return { success: true };
}

module.exports = router;
