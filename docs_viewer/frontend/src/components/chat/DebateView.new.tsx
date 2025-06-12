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
    avatar: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'AI Expert',
    description: 'Expert in artificial intelligence and machine learning',
    role: 'AI Specialist',
    avatar: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Ethics Professor',
    description: 'Expert in ethics and philosophy of technology',
    role: 'Ethicist',
    avatar: '',
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
  onClose = () => {},
  onAddToChat = () => {},
  initialMessages = [],
  initialParticipants = [],
  initialTopic = 'The impact of AI on society',
  initialSettings: initialSettingsProp = defaultSettings,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [topic, setTopic] = useState(initialTopic);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [settings, setSettings] = useState<IDebateSettings>(initialSettingsProp);
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
    setShowPersonalitySelector(false);
  }, [addParticipant]);

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
          onSave={() => handleSaveSettings(settings)}
          onCancel={handleToggleSettings}
          onResetToDefaults={() => setSettings(defaultSettings)}
        />
      </Drawer>
    </Box>
  );
};

export default DebateView;
