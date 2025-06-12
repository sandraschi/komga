import React from 'react';
import { Box, Typography, Avatar, Paper, useTheme } from '@mui/material';
import { ChatMessage } from '../types';

interface DebateChatProps {
  messages: ChatMessage[];
  participants: Array<{ id: string; name: string; avatar?: string }>;
  currentUserId?: string;
}

export const DebateChat: React.FC<DebateChatProps> = ({
  messages = [],
  participants = [],
  currentUserId,
}) => {
  const theme = useTheme();

  const getParticipant = (participantId: string) => {
    return participants.find(p => p.id === participantId) || { name: 'Unknown', avatar: '' };
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {messages.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">No messages yet. Start the debate to see messages appear here.</Typography>
        </Box>
      ) : (
        messages.map((message) => {
          const participant = getParticipant(message.senderId);
          const isCurrentUser = message.senderId === currentUserId;
          const isAI = message.isAI;

          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 1,
                  mb: 1,
                }}
              >
                <Avatar
                  src={participant.avatar}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: isAI ? theme.palette.primary.main : theme.palette.grey[500],
                  }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{
                      display: 'block',
                      textAlign: isCurrentUser ? 'right' : 'left',
                      mb: 0.5,
                    }}
                  >
                    {participant.name}
                  </Typography>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isCurrentUser
                        ? theme.palette.primary.main
                        : theme.palette.background.paper,
                      color: isCurrentUser ? theme.palette.primary.contrastText : 'inherit',
                      border: `1px solid ${theme.palette.divider}`,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Typography variant="body2" component="div">
                      {message.content}
                    </Typography>
                    {message.citations && message.citations.length > 0 && (
                      <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="caption" color="textSecondary">
                          Sources:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, mt: 0.5 }}>
                          {message.citations.map((citation, idx) => (
                            <Typography key={idx} variant="caption" component="li">
                              {citation}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{
                      display: 'block',
                      textAlign: isCurrentUser ? 'right' : 'left',
                      mt: 0.5,
                      fontSize: '0.7rem',
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default DebateChat;
