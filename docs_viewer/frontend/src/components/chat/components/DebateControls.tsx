import React, { useState, useCallback, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrowOutlined as PlayArrowOutlinedIcon,
  Refresh as RefreshIcon,
  Mood as MoodIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

interface DebateControlsProps {
  message: string;
  isDebateActive: boolean;
  isPaused: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onAddParticipant: () => void;
  onStartDebate: () => void;
  onStopDebate: () => void;
  onPauseDebate: () => void;
  onResumeDebate: () => void;
  onResetDebate: () => void;
  onToggleEmojiPicker: () => void;
  onToggleAttachFile: () => void;
  isSending?: boolean;
}

export const DebateControls: React.FC<DebateControlsProps> = ({
  message = '',
  isDebateActive = false,
  isPaused = false,
  onMessageChange,
  onSendMessage,
  onAddParticipant,
  onStartDebate,
  onStopDebate,
  onPauseDebate,
  onResumeDebate,
  onResetDebate,
  onToggleEmojiPicker,
  onToggleAttachFile,
  isSending = false,
}) => {
  const theme = useTheme();
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        onSendMessage();
      }
    },
    [isComposing, onSendMessage]
  );

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {!isDebateActive ? (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={onStartDebate}
              startIcon={<PlayArrowIcon />}
              size="small"
            >
              Start Debate
            </Button>
            <Tooltip title="Add Participant">
              <IconButton onClick={onAddParticipant} size="small">
                <PersonAddIcon />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={isPaused ? 'Resume' : 'Pause'}>
              <IconButton
                onClick={isPaused ? onResumeDebate : onPauseDebate}
                color="primary"
                size="small"
              >
                {isPaused ? <PlayArrowOutlinedIcon /> : <PauseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Stop">
              <IconButton onClick={onStopDebate} color="secondary" size="small">
                <StopIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset">
              <IconButton onClick={onResetDebate} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <Tooltip title="Add emoji">
          <IconButton onClick={onToggleEmojiPicker} size="small">
            <MoodIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Attach file">
          <IconButton onClick={onToggleAttachFile} size="small">
            <AttachFileIcon />
          </IconButton>
        </Tooltip>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={!isDebateActive}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              bgcolor: 'background.paper',
            },
          }}
        />
        <Tooltip title="Send">
          <span>
            <IconButton
              color="primary"
              onClick={onSendMessage}
              disabled={!message.trim() || isSending || !isDebateActive}
              size="large"
            >
              {isSending ? (
                <CircularProgress size={24} />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default DebateControls;
