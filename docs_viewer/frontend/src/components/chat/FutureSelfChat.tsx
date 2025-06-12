import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Slider,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Avatar,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  EmojiObjects as InsightsIcon,
  Send as SendIcon,
  Mic as MicIcon,
  AttachFile as AttachFileIcon,
  Mood as MoodIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format, addYears, formatDistanceToNow } from 'date-fns';
import { useChat } from '../../hooks/useChat';
import { AIPersona, Message, MessageRole } from '../../types/chat';
import ChatPersonalitySelector from './ChatPersonalitySelector';

const FutureSelfContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: theme.shadows[3],
}));

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: theme.palette.background.paper,
}));

const Content = styled(Box)({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
});

const Sidebar = styled(Box)(({ theme }) => ({
  width: 300,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  overflowY: 'auto',
}));

const MainContent = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const MessagesContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

const Controls = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => !['isUser', 'isSystem', 'isFutureSelf'].includes(prop as string),
})<{ isUser?: boolean; isSystem?: boolean; isFutureSelf?: boolean }>(
  ({ theme, isUser, isSystem, isFutureSelf }) => ({
    maxWidth: '80%',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    backgroundColor: isUser
      ? theme.palette.primary.main
      : isSystem
      ? theme.palette.grey[200]
      : theme.palette.background.paper,
    color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: theme.shadows[1],
    position: 'relative',
    '&:hover': {
      boxShadow: theme.shadows[2],
    },
    ...(isFutureSelf && {
      borderLeft: `4px solid ${theme.palette.secondary.main}`,
    }),
  })
);

const TimeIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: theme.spacing(2, 0),
  '&::before, &::after': {
    content: '""',
    flex: 1,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& > *': {
    margin: theme.spacing(0, 2),
  },
}));

const FutureSelfChat: React.FC = () => {
  const theme = useTheme();
  const [futureYear, setFutureYear] = useState(new Date().getFullYear() + 5);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [futureSelfPersona, setFutureSelfPersona] = useState<AIPersona | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with the useChat hook
  const { messages, sendMessage, isLoading, isStreaming, setParticipants } = useChat({
    initialMessages: [],
    autoStart: true,
  });

  // Default future self persona
  const defaultFutureSelf: AIPersona = {
    id: 'future-self',
    name: 'Future You',
    description: 'Your wiser future self',
    systemPrompt: `You are the user's future self, ${futureYear - new Date().getFullYear()} years older and wiser. ` +
      'You have valuable insights and perspective to share based on the experiences you\'ve had. ' +
      'Be supportive, but also honest about the challenges and lessons learned. ' +
      'Reference specific memories and experiences when possible. ' +
      'Offer guidance that balances optimism with realism.',
    temperature: 0.7,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Set up initial future self persona
  useEffect(() => {
    setFutureSelfPersona(defaultFutureSelf);
    // Set up chat participants
    setParticipants([
      {
        id: 'user',
        name: 'You',
        isAI: false,
      },
      {
        id: 'future-self',
        name: 'Future You',
        isAI: true,
        metadata: { personaId: 'future-self' },
      },
    ]);
  }, [futureYear]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartConversation = async () => {
    if (!futureSelfPersona) return;
    
    setIsActive(true);
    
    // Add welcome message
    await sendMessage(
      `You are now speaking with your future self from the year ${futureYear}. ` +
      `That's ${futureYear - new Date().getFullYear()} years from now. ` +
      `What would you like to ask or discuss?`,
      {
        role: MessageRole.SYSTEM,
        sender: 'Future You',
        metadata: { isFutureSelf: true },
      }
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isActive || isPaused) return;

    // Add user message
    await sendMessage(inputMessage, {
      role: MessageRole.USER,
      sender: 'You',
    });

    setInputMessage('');

    // Generate response from future self
    if (futureSelfPersona) {
      try {
        const response = await fetch('/api/chat/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: `You are the user's future self in the year ${futureYear}. ` +
              `The user has just asked you: "${inputMessage}"\n\n` +
              `Respond as their future self, offering wisdom, insights, and perspective ` +
              `from ${futureYear - new Date().getFullYear()} years in the future. ` +
              `Be supportive but honest, and reference specific experiences when possible.`,
            temperature: futureSelfPersona.temperature || 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.text || 'I\'m having trouble responding right now.';

        await sendMessage(content, {
          role: MessageRole.ASSISTANT,
          sender: 'Future You',
          metadata: { isFutureSelf: true },
        });
      } catch (error) {
        console.error('Error generating response:', error);
        await sendMessage(
          'I\'m having trouble connecting to the future right now. Please try again later.',
          {
            role: MessageRole.SYSTEM,
            sender: 'System',
            isError: true,
          }
        );
      }
    }
  };

  const handleEndConversation = () => {
    if (window.confirm('Are you sure you want to end this conversation?')) {
      setIsActive(false);
      setIsPaused(false);
      
      // Add closing message
      sendMessage(
        `Your future self fades back into the year ${futureYear}. ` +
        'Remember: the future is yours to create!',
        {
          role: MessageRole.SYSTEM,
          sender: 'Future You',
          metadata: { isFutureSelf: true },
        }
      );
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleYearChange = (event: Event, newValue: number | number[]) => {
    if (isActive) {
      if (window.confirm('Changing the year will reset the conversation. Continue?')) {
        setIsActive(false);
        setFutureYear(newValue as number);
      }
    } else {
      setFutureYear(newValue as number);
    }
  };

  const handleCustomizeFutureSelf = (persona: AIPersona) => {
    setFutureSelfPersona({
      ...persona,
      id: 'future-self',
      name: `Future You (${futureYear})`,
    });
    setShowSettings(false);
  };

  const yearsFromNow = futureYear - new Date().getFullYear();
  const futureDate = addYears(new Date(), yearsFromNow);

  return (
    <FutureSelfContainer elevation={3}>
      <Header>
        <Box display="flex" alignItems="center" gap={2}>
          <TimeIcon color="primary" />
          <Box>
            <Typography variant="h6">Talk to Your Future Self</Typography>
            <Typography variant="caption" color="textSecondary">
              {isActive
                ? `Connected to ${futureYear}`
                : `Set a future year to begin`}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          {isActive ? (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                onClick={togglePause}
                disabled={!isActive || isLoading}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleEndConversation}
                disabled={isLoading}
              >
                End Chat
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartConversation}
              disabled={!futureSelfPersona}
            >
              Start Chat
            </Button>
          )}
          <IconButton
            onClick={() => setShowSettings(!showSettings)}
            color={showSettings ? 'primary' : 'default'}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Header>

      <Content>
        <Sidebar>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar
                  sx={{
                    bgcolor: theme.palette.secondary.main,
                    width: 48,
                    height: 48,
                    mr: 2,
                  }}
                >
                  <PsychologyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Future You</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {yearsFromNow} years from now
                  </Typography>
                </Box>
              </Box>

              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Jump to Year: <strong>{futureYear}</strong>
                </Typography>
                <Slider
                  value={futureYear}
                  onChange={handleYearChange}
                  min={new Date().getFullYear() + 1}
                  max={new Date().getFullYear() + 50}
                  step={1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => value}
                  marks={[
                    {
                      value: new Date().getFullYear() + 1,
                      label: '+1',
                    },
                    {
                      value: new Date().getFullYear() + 10,
                      label: '+10',
                    },
                    {
                      value: new Date().getFullYear() + 25,
                      label: '+25',
                    },
                    {
                      value: new Date().getFullYear() + 50,
                      label: '+50',
                    },
                  ]}
                />
              </Box>


              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Future Date:
                </Typography>
                <Box display="flex" alignItems="center" mb={2}>
                  <CalendarIcon
                    fontSize="small"
                    color="action"
                    sx={{ mr: 1 }}
                  />
                  <Typography>
                    {format(futureDate, 'MMMM d, yyyy')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {formatDistanceToNow(futureDate, { addSuffix: true })}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Conversation Tips
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <InsightsIcon color="primary" fontSize="small" />
                  <Typography variant="body2">
                    Ask about future challenges and how to prepare for them
                  </Typography>
                </Box>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <MoodIcon color="primary" fontSize="small" />
                  <Typography variant="body2">
                    Discuss personal growth and life lessons
                  </Typography>
                </Box>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <TimeIcon color="primary" fontSize="small" />
                  <Typography variant="body2">
                    Explore how your values and priorities might change
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Sidebar>

        <MainContent>
          <MessagesContainer>
            {isActive ? (
              messages.length > 0 ? (
                messages.map((message, index) => (
                  <React.Fragment key={message.id || index}>
                    {message.role === MessageRole.SYSTEM && message.sender === 'Future You' ? (
                      <TimeIndicator>
                        <Chip
                          size="small"
                          icon={<TimeIcon fontSize="small" />}
                          label={`Message from ${futureYear}`}
                        />
                      </TimeIndicator>
                    ) : null}
                    <MessageBubble
                      isUser={message.role === MessageRole.USER}
                      isSystem={message.role === MessageRole.SYSTEM}
                      isFutureSelf={
                        message.role === MessageRole.ASSISTANT ||
                        (message.role === MessageRole.SYSTEM && message.sender === 'Future You')
                      }
                    >
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Typography
                          variant="subtitle2"
                          fontWeight="bold"
                          color={message.role === MessageRole.USER ? 'inherit' : 'primary'}
                        >
                          {message.sender}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ ml: 1 }}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                      <Typography variant="body2" whiteSpace="pre-wrap">
                        {message.content}
                      </Typography>
                    </MessageBubble>
                  </React.Fragment>
                ))
              ) : (
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
                  <TimeIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" gutterBottom>
                    Start a Conversation with Your Future Self
                  </Typography>
                  <Typography variant="body2">
                    What would you like to ask your future self from {futureYear}?
                  </Typography>
                </Box>
              )
            ) : (
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
                <TimeIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  Connect with Your Future Self
                </Typography>
                <Typography variant="body2" paragraph>
                  Set a future year and click "Start Chat" to begin a conversation with your future self.
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                  Select a year between {new Date().getFullYear() + 1} and {new Date().getFullYear() + 50}
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </MessagesContainer>

          <Controls>
            <form onSubmit={handleSendMessage}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder={
                    isActive
                      ? `Ask your future self a question... (${futureYear})`
                      : 'Start the chat to begin messaging'
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={!isActive || isPaused || isLoading}
                  InputProps={{
                    startAdornment: (
                      <IconButton size="small" disabled>
                        <MoodIcon />
                      </IconButton>
                    ),
                    endAdornment: (
                      <>
                        <IconButton size="small" disabled={!isActive || isPaused}>
                          <MicIcon />
                        </IconButton>
                        <IconButton size="small" disabled={!isActive || isPaused}>
                          <AttachFileIcon />
                        </IconButton>
                      </>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!isActive || isPaused || isLoading || !inputMessage.trim()}
                  endIcon={<SendIcon />}
                >
                  Send
                </Button>
              </Box>
            </form>
          </Controls>
        </MainContent>
      </Content>

      {/* Future Self Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Customize Your Future Self</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Customize how your future self will respond. You can adjust the personality, knowledge
            level, and communication style.
          </DialogContentText>
          
          <Box mt={2}>
            <ChatPersonalitySelector
              open={true}
              onClose={() => setShowSettings(false)}
              onSelectPersona={handleCustomizeFutureSelf}
              selectedPersonaId={futureSelfPersona?.id}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (futureSelfPersona) {
                handleCustomizeFutureSelf(futureSelfPersona);
              }
              setShowSettings(false);
            }}
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </FutureSelfContainer>
  );
};

// Add styled-components for any missing styled components
const styledComponents = {
  FutureSelfContainer: styled(Paper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[3],
  })),
  // Add other styled components as needed
};

export default FutureSelfChat;
