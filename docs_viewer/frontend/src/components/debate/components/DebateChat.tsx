import React, { useEffect } from 'react';
import { Box, Typography, Paper, Avatar, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ChatMessage } from '../types/chat';
import type { DebateParticipant } from '../types';

interface DebateChatProps {
  messages: ChatMessage[];
  participants: DebateParticipant[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  currentParticipantId?: string;
  onAddMessage?: (content: string) => void;
}

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isAI',
})<{ isUser?: boolean; isAI?: boolean }>(({ theme, isUser, isAI }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  '& > * + *': {
    marginTop: theme.spacing(1),
  },
}));

const MessageWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  '&.user-message': {
    alignItems: 'flex-end',
  },
}));

const MessageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(0.5),
  '& > * + *': {
    marginLeft: theme.spacing(1),
  },
}));

const DebateChat: React.FC<DebateChatProps> = ({
  messages,
  participants,
  chatContainerRef,
}) => {
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, chatContainerRef]);

  const getParticipantById = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  return (
    <MessageContainer ref={chatContainerRef}>
      {messages.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No messages yet
          </Typography>
          <Typography variant="body2">
            Start the debate to see the conversation unfold
          </Typography>
        </Box>
      ) : (
        messages.map((message) => {
          const participant = getParticipantById(message.sender);
          const isUser = message.role === 'user';

          return (
            <MessageWrapper
              key={message.id}
              className={isUser ? 'user-message' : ''}
            >
              {message.sender === participant?.id && participant && (
                <MessageHeader>
                  <Avatar
                    src={participant.avatar}
                    alt={participant.name}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Typography variant="subtitle2">
                    {participant.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </MessageHeader>
              )}
              <MessageBubble
                elevation={1}
                isUser={isUser}
                isAI={!isUser}
              >
                <Typography variant="body1">{message.content}</Typography>
              </MessageBubble>
            </MessageWrapper>
          );
        })
      )}
    </MessageContainer>
  );
};

export default DebateChat;
