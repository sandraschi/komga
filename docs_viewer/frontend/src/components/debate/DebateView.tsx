import React, { useState, useRef, useEffect, useCallback } from 'react';
import logger from '../../../utils/logger';
import { Box, styled, Snackbar, Alert, Typography, Button } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

// Types
import { 
  DebateViewProps, 
  DebateParticipant, 
  DebateSettings,
  defaultPersonas, 
  defaultDebateSettings,
  DebateMessage
} from './types';

// Hooks
import { useDebate } from './hooks/useDebate';

// Services
import LLMService from '../../services/llm/LLMService';

// Components
import ErrorBoundary from '../common/ErrorBoundary';
import DebateHeader from './components/DebateHeader';
import DebateChat from './components/DebateChat';
import DebateControls from './components/DebateControls';
import DebateSettingsDialog from './components/DebateSettingsDialog';
import ChatPersonalitySelector from '../chat/ChatPersonalitySelector';

// Styled components
const DebateContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: 'background.paper',
  borderRadius: 1,
  overflow: 'hidden',
});

// Wrapper component to handle errors in the debate view
const DebateViewContent: React.FC<DebateViewProps> = ({
  documentId,
  onClose = () => {},
  onAddToChat,
  initialMessages = [],
  initialParticipants = [],
  initialTopic = 'The impact of AI on society',
  initialSettings = defaultDebateSettings,
}) => {
  // State
  const [topic, setTopic] = useState(initialTopic);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [settings, setSettings] = useState<DebateSettings>({
    ...defaultDebateSettings,
    ...(initialSettings || {}),
  });
  const [participants, setParticipants] = useState<DebateParticipant[]>(
    initialParticipants.length > 0 ? initialParticipants : defaultPersonas
  );
  // Error handling state
  const [error, setError] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  
  // Initialize LLM service
  useEffect(() => {
    const initializeLLM = async () => {
      try {
        setLlmStatus('loading');
        // Check if we have any available LLM providers
        const providers = LLMService.getProviders();
        if (providers.length === 0) {
          setError('No LLM providers available. Please configure at least one LLM provider.');
          setLlmStatus('error');
          return;
        }
        setLlmStatus('idle');
      } catch (err) {
        logger.error('Failed to initialize LLM service:', err);
        setError(`Failed to initialize LLM service: ${err.message}`);
        setLlmStatus('error');
      }
    };

    initializeLLM();
  }, []);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Custom hooks
  const {
    messages,
    isDebateActive,
    isPaused,
    startDebate,
    stopDebate,
    togglePause,
    sendMessage,
  } = useDebate({
    initialMessages,
    participants,
    settings,
  });

  // Handlers
  const handleStartStop = useCallback(() => {
    if (isDebateActive) {
      stopDebate();
    } else {
      startDebate();
    }
  }, [isDebateActive, startDebate, stopDebate]);

  const handlePauseResume = useCallback(() => {
    togglePause();
  }, [togglePause]);

  const handleAddParticipant = (persona: AIPersona) => {
    const newParticipant: DebateParticipant = {
      ...persona,
      id: uuidv4(),
      isActive: true,
      isMuted: false,
      isSpeaking: false,
      // Ensure required fields are set
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPrompt: persona.systemPrompt || '',
      description: persona.description || '',
    };
    setParticipants(prev => [...prev, newParticipant]);
    setShowParticipantSelector(false);
  };

  const handleRemoveParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleToggleMute = useCallback((id: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isMuted: !p.isMuted } : p
      )
    );
  }, []);

  const handleSaveSettings = (newSettings: Partial<DebateSettings>) => {
    setSettings(prev => ({
      ...defaultDebateSettings,
      ...prev,
      ...newSettings,
    }));
    setShowSettings(false);
  };

  // Effects
  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle error close
  const handleErrorClose = () => {
    setError(null);
  };

  if (llmStatus === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography>Initializing LLM service...</Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary 
      onError={(error) => {
        logger.error('DebateView error boundary caught:', error);
        setError('An unexpected error occurred. Please try again.');
      }}
    >
      <DebateContainer>
        <DebateHeader
          topic={topic}
          onSettingsClick={() => setShowSettings(true)}
          onClose={onClose}
        />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <DebateChat
            messages={messages}
            participants={participants}
            chatContainerRef={chatContainerRef}
          />
        </Box>
        <DebateControls
          isDebateActive={isDebateActive}
          isPaused={isPaused}
          onStartStop={handleStartStop}
          onPauseResume={handlePauseResume}
          onAddParticipant={() => setShowParticipantSelector(true)}
          canStart={participants.length > 0}
        />
        <DebateSettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={handleSaveSettings}
        />
        <ChatPersonalitySelector
          open={showParticipantSelector}
          onClose={() => setShowParticipantSelector(false)}
          onSelectPersona={handleAddParticipant}
        />
        
        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleErrorClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleErrorClose} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </DebateContainer>
    </ErrorBoundary>
  );
};

// Main DebateView component with error boundary
const DebateView: React.FC<DebateViewProps> = (props) => {
  return (
    <ErrorBoundary
      fallback={
        <Box p={2}>
          <Typography variant="h6" color="error">
            Oops! Something went wrong with the debate view.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Reload Debate
          </Button>
        </Box>
      }
    >
      <DebateViewContent {...props} />
    </ErrorBoundary>
  );
};

export default DebateView;
