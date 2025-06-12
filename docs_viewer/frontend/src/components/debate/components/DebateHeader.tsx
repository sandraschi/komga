import React from 'react';
import { Box, Typography, IconButton, Toolbar, AppBar } from '@mui/material';
import { Settings as SettingsIcon, Close as CloseIcon } from '@mui/icons-material';
import { DebateHeaderProps } from '../types';

const DebateHeader: React.FC<DebateHeaderProps> = ({
  topic,
  isDebateActive,
  onSettingsClick,
  onClose,
}) => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div" noWrap>
            {topic || 'Debate'}
          </Typography>
          {isDebateActive && (
            <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  mr: 1,
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.6 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.6 },
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Live
              </Typography>
            </Box>
          )}
        </Box>
        <IconButton onClick={onSettingsClick} size="large" color="inherit">
          <SettingsIcon />
        </IconButton>
        <IconButton onClick={onClose} size="large" edge="end" color="inherit">
          <CloseIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default DebateHeader;
