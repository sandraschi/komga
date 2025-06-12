import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Paper,
  useTheme,
  Divider,
  Badge,
  Tooltip,
} from '@mui/material';
import { PersonRemove, Mic, MicOff, Videocam, VideocamOff } from '@mui/icons-material';
import { AIPersona } from '../types';

interface DebateParticipantsProps {
  participants: AIPersona[];
  currentSpeakerId?: string;
  onRemoveParticipant?: (participantId: string) => void;
  onToggleMute?: (participantId: string) => void;
  onToggleVideo?: (participantId: string) => void;
  currentUserId?: string;
}

export const DebateParticipants: React.FC<DebateParticipantsProps> = ({
  participants = [],
  currentSpeakerId,
  onRemoveParticipant,
  onToggleMute,
  onToggleVideo,
  currentUserId,
}) => {
  const theme = useTheme();

  if (participants.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No participants yet. Add someone to start the debate!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <List dense>
        {participants.map((participant) => {
          const isCurrentSpeaker = participant.id === currentSpeakerId;
          const isCurrentUser = participant.id === currentUserId;
          const isMuted = false; // This would come from participant state
          const isVideoOn = true; // This would come from participant state

          return (
            <React.Fragment key={participant.id}>
              <ListItem
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {onToggleMute && (
                      <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                        <IconButton
                          edge="end"
                          aria-label={isMuted ? 'unmute' : 'mute'}
                          onClick={() => onToggleMute(participant.id)}
                          size="small"
                        >
                          {isMuted ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    )}
                    {onToggleVideo && (
                      <Tooltip title={isVideoOn ? 'Turn off video' : 'Turn on video'}>
                        <IconButton
                          edge="end"
                          aria-label={isVideoOn ? 'turn off video' : 'turn on video'}
                          onClick={() => onToggleVideo(participant.id)}
                          size="small"
                        >
                          {isVideoOn ? (
                            <Videocam fontSize="small" />
                          ) : (
                            <VideocamOff fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {onRemoveParticipant && !isCurrentUser && (
                      <Tooltip title="Remove participant">
                        <IconButton
                          edge="end"
                          aria-label="remove"
                          onClick={() => onRemoveParticipant(participant.id)}
                          size="small"
                        >
                          <PersonRemove fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
                sx={{
                  bgcolor: isCurrentSpeaker ? 'action.selected' : 'transparent',
                  transition: 'background-color 0.2s ease-in-out',
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={isCurrentSpeaker ? 'success' : 'default'}
                    invisible={!isCurrentSpeaker}
                  >
                    <Avatar
                      src={participant.avatar}
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 40,
                        height: 40,
                      }}
                    >
                      {participant.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="subtitle2"
                        component="span"
                        sx={{ fontWeight: isCurrentSpeaker ? 'bold' : 'normal' }}
                      >
                        {participant.name}
                        {isCurrentUser && ' (You)'}
                      </Typography>
                      {isCurrentSpeaker && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 0.6 },
                              '50%': { opacity: 1 },
                              '100%': { opacity: 0.6 },
                            },
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      {participant.role || 'Participant'}
                      {isMuted && (
                        <Tooltip title="Muted">
                          <MicOff fontSize="inherit" color="disabled" />
                        </Tooltip>
                      )}
                      {!isVideoOn && (
                        <Tooltip title="Camera off">
                          <VideocamOff fontSize="inherit" color="disabled" />
                        </Tooltip>
                      )}
                    </Typography>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default DebateParticipants;
