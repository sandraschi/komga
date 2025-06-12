import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Paper, Typography, Avatar, Tooltip } from '@mui/material';
import { Send, Settings, Person, SmartToy, Group, History, PersonAdd } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { chatApi } from '../../services/api';
import { Message, MessageRole } from '../../types/chat';
import { useDebounce } from '../../hooks/useDebounce';

const ChatContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: theme.shadows[3],
}));

const MessagesContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  '& > * + *': {
    marginTop: '12px',
  },
});

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: '16px',
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isSystem',
})<{ isUser?: boolean; isSystem?: boolean }>(({ theme, isUser, isSystem }) => ({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : isSystem 
      ? theme.palette.grey[200]
      : theme.palette.background.paper,
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  borderRadius: '18px',
  padding: '12px 16px',
  boxShadow: theme.shadows[1],
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}));

const MessageHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '4px',
  fontWeight: 'bold',
});

const MessageContent = styled(Box)({
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.5,
});

const MessageTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginTop: '4px',
  textAlign: 'right',
}));

interface ChatInterfaceProps {
  sessionId: string;
  initialMessages?: Message[];
  onNewMessage?: (message: Message) => void;
  showHeader?: boolean;
  autoScroll?: boolean;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  initialMessages = [],
  onNewMessage,
  showHeader = true,
  autoScroll = true,
  className,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update messages when initialMessages changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: MessageRole.USER,
      content: input.trim(),
      timestamp: new Date(),
      sender: 'You',
    };

    // Add user message to chat
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    onNewMessage?.(userMessage);
    setIsLoading(true);

    try {
      // Send message to API
      const response = await chatApi.sendMessage(sessionId, input);
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: MessageRole.ASSISTANT,
        content: response.message,
        timestamp: new Date(),
        sender: response.sender || 'Assistant',
        metadata: response.metadata,
      };

      setMessages([...updatedMessages, assistantMessage]);
      onNewMessage?.(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: MessageRole.SYSTEM,
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        sender: 'System',
        isError: true,
      };
      
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageAvatar = (role: MessageRole, sender?: string) => {
    switch (role) {
      case MessageRole.USER:
        return <Person color="primary" />;
      case MessageRole.ASSISTANT:
        return <SmartToy color="secondary" />;
      case MessageRole.SYSTEM:
        return <Settings color="action" />;
      default:
        return <Person />;
    }
  };

  return (
    <ChatContainer className={className}>
      {showHeader && (
        <Box 
          sx={{
            padding: '12px 16px',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6">AI Assistant</Typography>
          <Box>
            <Tooltip title="Add participant">
              <IconButton size="small">
                <PersonAdd fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      
      <MessagesContainer>
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              textAlign: 'center',
              padding: 4,
            }}
          >
            <SmartToy sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              How can I help you today?
            </Typography>
            <Typography variant="body2">
              Ask me anything or start a conversation about your documents.
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              isUser={message.role === MessageRole.USER}
              isSystem={message.role === MessageRole.SYSTEM}
              sx={message.isError ? { border: (theme) => `1px solid ${theme.palette.error.main}` } : {}}
            >
              <MessageHeader>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  {getMessageAvatar(message.role, message.sender)}
                </Box>
                <Typography variant="subtitle2">
                  {message.sender}
                </Typography>
              </MessageHeader>
              <MessageContent>
                {message.content}
              </MessageContent>
              <MessageTime>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </MessageTime>
            </MessageBubble>
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <TextField
          inputRef={inputRef}
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          multiline
          maxRows={4}
          InputProps={{
            endAdornment: (
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
              >
                <Send />
              </IconButton>
            ),
          }}
        />
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatInterface;
