import React from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';

interface DebateControlsProps {
  isDebateActive: boolean;
  isPaused: boolean;
  onStartStop: () => void;
  onPauseResume: () => void;
  onAddParticipant: () => void;
  canStart: boolean;
}

const DebateControls: React.FC<DebateControlsProps> = ({
  isDebateActive,
  isPaused,
  onStartStop,
  onPauseResume,
  onAddParticipant,
  canStart,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {isDebateActive ? (
        <>
          <Tooltip title={isPaused ? 'Resume debate' : 'Pause debate'}>
            <IconButton
              onClick={onPauseResume}
              color="primary"
              size="large"
            >
              {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Stop debate">
            <IconButton onClick={onStartStop} color="error" size="large">
              <StopIcon />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={onStartStop}
          disabled={!canStart}
          fullWidth
        >
          Start Debate
        </Button>
      )}
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="Add participant">
        <IconButton onClick={onAddParticipant} size="large">
          <PersonAddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default DebateControls;
