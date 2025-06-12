import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  People as PeopleIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  HelpOutline as HelpOutlineIcon,
  InfoOutlined as InfoOutlinedIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  FlagOutlined as FlagOutlinedIcon,
  Flag as FlagIcon,
  ReportProblemOutlined as ReportProblemOutlinedIcon,
  ReportProblem as ReportProblemIcon,
  Block as BlockIcon,
} from '@mui/icons-material';

interface DebateHeaderProps {
  title: string;
  isFullscreen?: boolean;
  isMuted?: boolean;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  isBookmarked?: boolean;
  isFlagged?: boolean;
  isReported?: boolean;
  onClose?: () => void;
  onToggleSettings?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onToggleParticipants?: () => void;
  onToggleEmojiPicker?: () => void;
  onToggleAttachFile?: () => void;
  onToggleMoreOptions?: () => void;
  onToggleHelp?: () => void;
  onToggleInfo?: () => void;
  onToggleBookmark?: () => void;
  onToggleFlag?: () => void;
  onToggleReport?: () => void;
  onToggleBlock?: () => void;
}

export const DebateHeader: React.FC<DebateHeaderProps> = ({
  title,
  isFullscreen = false,
  isMuted = false,
  isMicOn = true,
  isCameraOn = true,
  isScreenSharing = false,
  isBookmarked = false,
  isFlagged = false,
  isReported = false,
  onClose,
  onToggleSettings,
  onToggleFullscreen,
  onToggleMute,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleParticipants,
  onToggleEmojiPicker,
  onToggleAttachFile,
  onToggleMoreOptions,
  onToggleHelp,
  onToggleInfo,
  onToggleBookmark,
  onToggleFlag,
  onToggleReport,
  onToggleBlock,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {onToggleSettings && (
          <Tooltip title="Settings">
            <IconButton onClick={onToggleSettings} size="small">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleFullscreen && (
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            <IconButton onClick={onToggleFullscreen} size="small">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleMute && (
          <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
            <IconButton onClick={onToggleMute} size="small">
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleMic && (
          <Tooltip title={isMicOn ? 'Mute mic' : 'Unmute mic'}>
            <IconButton onClick={onToggleMic} size="small">
              {isMicOn ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleCamera && (
          <Tooltip title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}>
            <IconButton onClick={onToggleCamera} size="small">
              {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleScreenShare && (
          <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
            <IconButton onClick={onToggleScreenShare} size="small">
              {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleParticipants && (
          <Tooltip title="Participants">
            <IconButton onClick={onToggleParticipants} size="small">
              <PeopleIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleEmojiPicker && (
          <Tooltip title="Emoji">
            <IconButton onClick={onToggleEmojiPicker} size="small">
              <EmojiEmotionsIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleAttachFile && (
          <Tooltip title="Attach file">
            <IconButton onClick={onToggleAttachFile} size="small">
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleMoreOptions && (
          <Tooltip title="More options">
            <IconButton onClick={onToggleMoreOptions} size="small">
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleHelp && (
          <Tooltip title="Help">
            <IconButton onClick={onToggleHelp} size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleInfo && (
          <Tooltip title="Info">
            <IconButton onClick={onToggleInfo} size="small">
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
        )}

        {onToggleBookmark && (
          <Tooltip title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
            <IconButton onClick={onToggleBookmark} size="small">
              {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleFlag && (
          <Tooltip title={isFlagged ? 'Remove flag' : 'Flag'}>
            <IconButton onClick={onToggleFlag} size="small">
              {isFlagged ? <FlagIcon color="error" /> : <FlagOutlinedIcon />}
            </IconButton>
          </Tooltip>
        )}

        {onToggleReport && (
          <Tooltip title={isReported ? 'Reported' : 'Report'}>
            <IconButton onClick={onToggleReport} size="small">
              {isReported ? (
                <ReportProblemIcon color="error" />
              ) : (
                <ReportProblemOutlinedIcon />
              )}
            </IconButton>
          </Tooltip>
        )}

        {onToggleBlock && (
          <Tooltip title="Block">
            <IconButton onClick={onToggleBlock} size="small">
              <BlockIcon />
            </IconButton>
          </Tooltip>
        )}

        {onClose && (
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default DebateHeader;
