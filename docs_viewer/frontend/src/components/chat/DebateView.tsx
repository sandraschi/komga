import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { styled, useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  Avatar,
  Tooltip,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PersonAdd as PersonAddIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Flag as FlagIcon,
  Report as ReportIcon,
  Block as BlockIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  MoreHoriz as MoreHorizIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon,
  ArrowDropDownCircle as ArrowDropDownCircleIcon,
  ArrowDropUpCircle as ArrowDropUpCircleIcon,
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosNewIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  MoreHoriz as MoreHorizIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

// Types
import { AIPersona, Message as ChatMessage, MessageRole } from '../../types/chat';
import { DebateSettings, DebateParticipant } from '../../types/debate';

// Hooks
import { useDebate } from './hooks/useDebate';

// Styles
const DebateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  '& > * + *': {
    marginTop: theme.spacing(1),
  },
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isAI',
})<{ isUser?: boolean; isAI?: boolean }>(({ theme, isUser, isAI }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  '& > * + *': {
    marginLeft: theme.spacing(1),
  },
}));
  Person as PersonIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Flag as FlagIcon,
  Report as ReportIcon,
  Block as BlockIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  MoreHoriz as MoreHorizIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  AttachFile as AttachFileIcon,
  InsertPhoto as InsertPhotoIcon,
  InsertLink as InsertLinkIcon,
  Mood as MoodIcon,
  MoodBad as MoodBadIcon,
  SentimentSatisfied as SentimentSatisfiedIcon,
  SentimentDissatisfied as SentimentDissatisfiedIcon,
  SentimentVerySatisfied as SentimentVerySatisfiedIcon,
  SentimentVeryDissatisfied as SentimentVeryDissatisfiedIcon,
  ThumbUpAlt as ThumbUpAltIcon,
  ThumbDownAlt as ThumbDownAltIcon
} from '@mui/icons-material';

// Alias Slider to avoid conflict with HTML Slider type
const Slider = MuiSlider;

const DebateContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: theme.shadows[3],
  position: 'relative',
}));

const StyledMessageContent = styled(Box)({
  lineHeight: 1.5,
});

const StyledInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => !['isAI', 'isUser'].includes(prop as string),
})<{ isAI?: boolean; isUser?: boolean }>(
  ({ theme, isAI, isUser }) => ({
    maxWidth: '80%',
    padding: theme.spacing(1.5, 2),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    backgroundColor: isUser 
      ? theme.palette.primary.main 
      : isAI 
        ? theme.palette.grey[200] 
        : theme.palette.background.paper,
    color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
    boxShadow: theme.shadows[1],
    '&:last-child': {
      marginBottom: 0,
    },
  })
);

const StyledMessageTime = styled(Box)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginTop: 4,
  textAlign: 'right',
}));

const StyledParticipantChip = styled(Chip)(({ theme }) => ({
  '& .MuiChip-avatar': {
    width: 24,
    height: 24,
    marginLeft: 4,
  },
}));

const StyledDebateContent = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflowY: 'auto',
  padding: 16,
});

const StyledMessageHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: 8,
  fontWeight: 600,
});

const StyledMessageText = styled(Typography)({
  wordWrap: 'break-word',
  whiteSpace: 'pre-wrap',
});

const StyledMessagesContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: 16,
});

const StyledMessageInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

interface DebateViewProps {
  // Add any props if needed
}

// Default debate participants
const defaultPersonas: AIPersona[] = [
  {
    id: '1',
    name: 'Debate Moderator',
    description: 'Neutral moderator who facilitates the debate',
    role: 'Moderator',
    systemPrompt: 'You are a neutral moderator. Guide the discussion fairly and keep participants on topic.',
    avatar: '/avatars/moderator.png',
    isDefault: true,
    model: 'gpt-4',
    temperature: 0.5,
    maxTokens: 300,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    name: 'AI Expert',
    description: 'Expert in artificial intelligence and machine learning',
    role: 'AI Specialist',
    systemPrompt: 'You are an AI expert. Provide technical insights and analysis.',
    avatar: '/avatars/ai-expert.png',
    isDefault: true,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 400,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '3',
    name: 'Ethics Professor',
    description: 'Expert in ethics and philosophy of technology',
    role: 'Ethicist',
    systemPrompt: 'You are an ethics professor. Consider the moral implications of the topic.',
    avatar: '/avatars/ethics-professor.png',
    isDefault: true,
    model: 'gpt-4',
    temperature: 0.6,
    maxTokens: 400,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '4',
    name: 'Debater A',
    description: 'Logical and analytical debater',
    name: 'Debater A',
    description: 'Logical and analytical debater',
    systemPrompt: 'You are a logical and analytical debater. Present clear arguments with evidence.',
    avatar: '/avatars/robot1.png',
    isDefault: true,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 500,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'debater-2',
    name: 'Debater B',
    description: 'Creative and persuasive debater',
    systemPrompt: 'You are a creative and persuasive debater. Use rhetorical devices and emotional appeals.',
    avatar: '/avatars/robot2.png',
    isDefault: true,
    model: 'gpt-4',
    temperature: 0.8,
    maxTokens: 500,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

const MessageInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// Core debate view component with essential props and state
// Core debate view component with essential props and state
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Drawer, 
  useMediaQuery, 
  useTheme, 
  Typography 
} from '@mui/material';

// Components
import { DebateHeader } from './components/DebateHeader';
import { DebateChat } from './components/DebateChat';
import { DebateControls } from './components/DebateControls';
import { DebateParticipants } from './components/DebateParticipants';
import { DebateSettings } from './components/DebateSettings';
import ChatPersonalitySelector from './ChatPersonalitySelector';

// Types and Hooks
import { 
  AIPersona, 
  ChatMessage, 
  DebateViewProps, 
  DebateSettings as IDebateSettings 
} from './types';
import { useDebate } from './hooks/useDebate';

// Default personas
const defaultPersonas: AIPersona[] = [
  {
    id: '1',
    name: 'Debate Moderator',
    description: 'Neutral moderator who facilitates the debate',
    role: 'Moderator',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'AI Expert',
    description: 'Expert in artificial intelligence and machine learning',
    role: 'AI Specialist',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Ethics Professor',
    description: 'Expert in ethics and philosophy of technology',
    role: 'Ethicist',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultSettings: IDebateSettings = {
  turnDuration: 60,
  maxTurns: 10,
  allowInterruptions: true,
};

const DebateView: React.FC<DebateViewProps> = ({
  documentId,
  onClose,
  onAddToChat,
  initialMessages = [],
  initialParticipants = [],
  initialTopic = 'The impact of AI on society',
  initialSettings = {
    turnDuration: 60,
    maxTurns: 10,
    allowInterruptions: true,
  },
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [topic, setTopic] = useState(initialTopic);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);
  const [settings, setSettings] = useState<IDebateSettings>(initialSettings);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use the custom hook for debate logic
  const {
    isDebateActive,
    isPaused,
    currentSpeakerIndex,
    messages,
    participants,
    addParticipant,
    removeParticipant,
    startDebate,
    stopDebate,
    togglePause,
    addMessage,
  } = useDebate([...defaultPersonas, ...initialParticipants]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Event handlers
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: 'current-user',
      senderName: 'You',
      content: inputMessage,
      isAI: false,
    };

    addMessage(newMessage);
    setInputMessage('');

    // Simulate AI response after a delay if debate is active
    if (isDebateActive && !isPaused) {
      setTimeout(() => {
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        const aiMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          senderId: randomParticipant.id,
          senderName: randomParticipant.name,
          content: `This is a simulated response from ${randomParticipant.name} regarding "${inputMessage}"`,
          isAI: true,
        };
        addMessage(aiMessage);
      }, 1000);
    }
  }, [inputMessage, isDebateActive, isPaused, participants, addMessage]);

  const handleAddParticipant = useCallback((participant: AIPersona) => {
    addParticipant(participant);
    onAddToChat?.(participant);
    setShowPersonalitySelector(false);
  }, [addParticipant, onAddToChat]);

  const handleRemoveParticipant = useCallback((participantId: string) => {
    removeParticipant(participantId);
  }, [removeParticipant]);

  const handleStartDebate = useCallback(() => {
    startDebate();
    // Add a welcome message from the moderator
    addMessage({
      senderId: '1', // Moderator ID
      senderName: 'Debate Moderator',
      content: `Welcome to the debate on "${topic}". Let's begin!`,
      isAI: true,
    });
  }, [startDebate, topic, addMessage]);

  const handleStopDebate = useCallback(() => {
    stopDebate();
    // Add a closing message from the moderator
    addMessage({
      senderId: '1', // Moderator ID
      senderName: 'Debate Moderator',
      content: 'This debate has concluded. Thank you all for participating!',
      isAI: true,
    });
  }, [stopDebate, addMessage]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [topic, setTopic] = useState(initialTopic);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [settings, setSettings] = useState<IDebateSettings>(initialSettings);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isVolumeOn, setIsVolumeOn] = useState(true);

  // Use the custom hook for debate logic
  const {
    isDebateActive,
    isPaused,
    currentSpeakerIndex,
    messages,
    participants,
    addParticipant,
    removeParticipant,
    startDebate,
    stopDebate,
    togglePause,
    addMessage,
  } = useDebate([...defaultPersonas, ...initialParticipants]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Combined handlers
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: 'current-user',
      senderName: 'You',
      content: inputMessage,
      isAI: false,
    };

    addMessage(newMessage);
    setInputMessage('');

    // Simulate AI response after a delay
    if (isDebateActive && !isPaused) {
      setTimeout(() => {
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        const aiMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          senderId: randomParticipant.id,
          senderName: randomParticipant.name,
          content: `This is a simulated response from ${randomParticipant.name} regarding "${inputMessage}"`,
          isAI: true,
        };
        addMessage(aiMessage);
      }, 1000);
    }
  }, [inputMessage, isDebateActive, isPaused, participants, addMessage]);

  const handleAddParticipant = useCallback((participant: AIPersona) => {
    addParticipant(participant);
    onAddToChat(participant);
    setShowPersonalitySelector(false);
  }, [addParticipant, onAddToChat]);

  const handleRemoveParticipant = useCallback((participantId: string) => {
    removeParticipant(participantId);
    onRemoveParticipant(participantId);
  }, [removeParticipant, onRemoveParticipant]);

  const handleStartDebate = useCallback(() => {
    startDebate();
    // Add a welcome message from the moderator
    addMessage({
      senderId: '1', // Moderator ID
      senderName: 'Debate Moderator',
      content: `Welcome to the debate on "${topic}". Let's begin!`,
      isAI: true,
    });
  }, [startDebate, topic, addMessage]);

  const handleStopDebate = useCallback(() => {
    stopDebate();
    // Add a closing message from the moderator
    addMessage({
      senderId: '1', // Moderator ID
      senderName: 'Debate Moderator',
      content: 'This debate has concluded. Thank you all for participating!',
      isAI: true,
    });
  }, [stopDebate, addMessage]);

  const handleTogglePause = useCallback(() => {
    togglePause();
    addMessage({
      senderId: '1', // Moderator ID
      senderName: 'Debate Moderator',
      content: isPaused ? 'The debate has been resumed.' : 'The debate has been paused.',
      isAI: true,
    });
  }, [togglePause, isPaused, addMessage]);

  const handleSaveSettings = useCallback((newSettings: IDebateSettings) => {
    setSettings(newSettings);
    setShowSettings(false);
    // Notify participants of settings change
    addMessage({
      senderId: '1', // Moderator ID
      senderName: 'Debate Moderator',
      content: 'Debate settings have been updated.',
      isAI: true,
    });
  }, [addMessage]);

  // Toggle handlers
  const handleToggleSettings = useCallback(() => setShowSettings(prev => !prev), []);
  const handleTogglePersonalitySelector = useCallback(() => setShowPersonalitySelector(prev => !prev), []);
  const handleToggleParticipants = useCallback(() => setShowParticipants(prev => !prev), []);
  const handleToggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);
  const handleToggleMute = useCallback(() => setIsMuted(prev => !prev), []);
  const handleToggleMic = useCallback(() => setIsMicOn(prev => !prev), []);
  const handleToggleCamera = useCallback(() => setIsCameraOn(prev => !prev), []);
  const handleToggleScreenShare = useCallback(() => setIsScreenSharing(prev => !prev), []);
  const handleToggleBookmark = useCallback(() => setIsBookmarked(prev => !prev), []);
  const handleToggleFlag = useCallback(() => setIsFlagged(prev => !prev), []);
  const handleToggleReport = useCallback(() => setIsReported(prev => !prev), []);
  const handleToggleBlock = useCallback(() => setIsBlocked(prev => !prev), []);
  const handleToggleVolume = useCallback(() => setIsVolumeOn(prev => !prev), []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      {/* Header */}
      <DebateHeader
        title={`Debate: ${topic}`}
        isFullscreen={isFullscreen}
        isMuted={isMuted}
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        isBookmarked={isBookmarked}
        isFlagged={isFlagged}
        isReported={isReported}
        onClose={onClose}
        onToggleSettings={handleToggleSettings}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleMute={handleToggleMute}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleParticipants={handleToggleParticipants}
        onToggleBookmark={handleToggleBookmark}
        onToggleFlag={handleToggleFlag}
        onToggleReport={handleToggleReport}
        onToggleBlock={handleToggleBlock}
        onToggleVolume={handleToggleVolume}
      />

      {/* Main Content */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Chat Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <DebateChat
            messages={messages}
            participants={participants}
            currentUserId="current-user"
          />
          <div ref={messagesEndRef} />
        </Box>

        {/* Participants Sidebar */}
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          anchor="right"
          open={showParticipants}
          onClose={handleToggleParticipants}
          sx={{
            width: 300,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6">Participants</Typography>
          </Box>
          <DebateParticipants
            participants={participants}
            currentSpeakerId={participants[currentSpeakerIndex]?.id}
            onRemoveParticipant={handleRemoveParticipant}
            currentUserId="current-user"
          />
        </Drawer>
      </Box>

      {/* Controls */}
      <DebateControls
        message={inputMessage}
        isDebateActive={isDebateActive}
        isPaused={isPaused}
        onMessageChange={setInputMessage}
        onSendMessage={handleSendMessage}
        onAddParticipant={handleTogglePersonalitySelector}
        onStartDebate={handleStartDebate}
        onStopDebate={handleStopDebate}
        onPauseDebate={handleTogglePause}
        onResumeDebate={handleTogglePause}
        onResetDebate={stopDebate}
        onToggleEmojiPicker={() => {}}
        onToggleAttachFile={() => {}}
      />

      {/* Modals and Dialogs */}
      <ChatPersonalitySelector
        open={showPersonalitySelector}
        onClose={handleTogglePersonalitySelector}
        onSelect={handleAddParticipant}
        selectedPersonas={participants}
      />

      <Drawer
        anchor="right"
        open={showSettings}
        onClose={handleToggleSettings}
        sx={{
          width: 500,
          maxWidth: '90vw',
          '& .MuiDrawer-paper': {
            width: 500,
            maxWidth: '90vw',
            boxSizing: 'border-box',
          },
        }}
      >
        <DebateSettings
          settings={settings}
          onSettingsChange={setSettings}
          onSave={handleSaveSettings}
          onCancel={handleToggleSettings}
          onResetToDefaults={() => setSettings(defaultSettings)}
        />
      </Drawer>
    </Box>
  );
};

export default DebateView;
      <Header>
        <Box display="flex" alignItems="center" gap={2}>
          <AIIcon color="primary" />
          <Typography variant="h6">AI Debate</Typography>
          {isDebateActive && (
            <Chip
              label={`Round ${debateSettings.currentTurn + 1} of ${debateSettings.maxTurns}`}
              color="primary"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={1}>
          {isDebateActive ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                onClick={togglePause}
                disabled={isLoading || isStreaming}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={endDebate}
                disabled={isLoading || isStreaming}
              >
                End Debate
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartDebate}
              disabled={isLoading || isStreaming || debateParticipants.length < 2}
            >
              Start Debate
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<RestartIcon />}
            onClick={resetDebate}
            disabled={isDebateActive}
          >
            Reset
          </Button>
        </Box>
      </Header>

      <Content>
        {/* Debate Topic */}
        <Box mb={3}>
          <TextField
            fullWidth
            variant="outlined"
            label="Debate Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isDebateActive}
            multiline
            rows={2}
            InputProps={{
              style: { fontWeight: 'bold', fontSize: '1.1rem' },
            }}
          />
        </Box>

        {/* Participants */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              Participants ({setParticipantsState(updatedParticipants);.length})
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowPersonalitySelector(true)}
              disabled={isDebateActive}
            >
              Add
            </Button>
          </Box>
          <Grid container spacing={2}>
            {debateParticipants.map((participant, index) => (
              <Grid item xs={12} sm={6} md={4} key={participant.id}>
                <ParticipantCard isActive={currentSpeakerIndex === index && isDebateActive}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.light,
                            mr: 1,
                            width: 32,
                            height: 32,
                          }}
                        >
                          <AIIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle2">{participant.name}</Typography>
                      </Box>
                      {!isDebateActive && (
                        <IconButton
                          size="small"
                          onClick={() => removeParticipant(participant.id)}
                          disabled={participant.isDefault}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {participant.description}
                    </Typography>
                  </CardContent>
                </ParticipantCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Debate Settings */}
        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Debate Settings
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                Rounds: {debateSettings.maxTurns}
              </Typography>
              <Slider
                value={debateSettings.maxTurns}
                onChange={(_, value) =>
                  setDebateSettings((prev) => ({
                    ...prev,
                    maxTurns: value as number,
                  }))
                }
                min={1}
                max={10}
                step={1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} ${value === 1 ? 'round' : 'rounds'}`}
                disabled={isDebateActive}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={debateSettings.requireCitations}
                    onChange={(e) =>
                      setDebateSettings((prev) => ({
                        ...prev,
                        requireCitations: e.target.checked,
                      }))
                    }
                    disabled={isDebateActive}
                  />
                }
                label="Require citations"
              />
              <Typography variant="caption" display="block" color="textSecondary">
                When enabled, debaters will be asked to provide sources for their claims.
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Messages */}
        <Box flex={1} overflow="auto" bgcolor="action.hover" borderRadius={1} p={2}>
          {messages.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              textAlign="center"
              p={4}
              color="text.secondary"
            >
              <AIIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                Start a Debate
              </Typography>
              <Typography variant="body2">
                Set your topic, add participants, and click "Start Debate" to begin.
              </Typography>
            </Box>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                isUser={message.role === MessageRole.USER}
                isSystem={message.role === MessageRole.SYSTEM}
                isActive={
                  isDebateActive &&
                  currentSpeakerIndex >= 0 &&
                  debateParticipants[currentSpeakerIndex]?.name === message.sender
                }
                sx={{ mb: 1 }}
              >
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {message.sender}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
                <Typography variant="body2">{message.content}</Typography>
              </MessageBubble>
            ))
          )}
        </Box>
      </Content>

      <Controls>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Add a comment or question..."
            disabled={!isDebateActive || isPaused}
            InputProps={{
              startAdornment: (
                <IconButton size="small" disabled>
                  <MicIcon />
                </IconButton>
              ),
              endAdornment: (
                <>
                  <IconButton size="small" disabled={!isDebateActive || isPaused}>
                    <EmojiEmotionsIcon />
                  </IconButton>
                  <IconButton size="small" disabled={!isDebateActive || isPaused}>
                    <AttachFileIcon />
                  </IconButton>
                </>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            disabled={!isDebateActive || isPaused}
            endIcon={<SendIcon />}
          >
            Send
          </Button>
        </Box>
      </Controls>

      {/* Personality Selector */}
      <ChatPersonalitySelector
        open={showPersonalitySelector}
        onClose={() => setShowPersonalitySelector(false)}
        onSelectPersona={handleAddParticipant}
      />
    </DebateContainer>
  );
};

export default DebateView;
