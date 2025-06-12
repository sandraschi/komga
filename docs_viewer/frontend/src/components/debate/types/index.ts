import { AIPersona, Message as ChatMessage } from '../../../../types/chat';

export interface DebateSettings {
  turnDuration: number;
  maxTurns: number;
  allowInterruptions: boolean;
}

export interface DebateParticipant extends AIPersona {
  isSpeaking?: boolean;
  isMuted?: boolean;
  isActive?: boolean;
}

export interface DebateMessage extends ChatMessage {
  participantId: string;
  timestamp: Date;
}

export interface DebateViewProps {
  documentId?: string;
  onClose?: () => void;
  onAddToChat?: (message: ChatMessage) => void;
  initialMessages?: ChatMessage[];
  initialParticipants?: DebateParticipant[];
  initialTopic?: string;
  initialSettings?: Partial<DebateSettings>;
}

export interface DebateHeaderProps {
  topic: string;
  isDebateActive: boolean;
  onSettingsClick: () => void;
  onClose: () => void;
}

export interface DebateChatProps {
  messages: ChatMessage[];
  participants: DebateParticipant[];
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

export interface DebateControlsProps {
  isDebateActive: boolean;
  isPaused: boolean;
  onStartStop: () => void;
  onPauseResume: () => void;
  onAddParticipant: () => void;
  canStart: boolean;
}

export interface DebateParticipantsProps {
  participants: DebateParticipant[];
  onRemoveParticipant: (id: string) => void;
  onToggleMute: (id: string) => void;
}

export interface DebateSettingsDialogProps {
  open: boolean;
  settings: DebateSettings;
  onClose: () => void;
  onSave: (settings: DebateSettings) => void;
}

// Default debate settings
export const defaultDebateSettings: DebateSettings = {
  turnDuration: 60,
  maxTurns: 10,
  allowInterruptions: true,
};

// Default AI personas for the debate
export const defaultPersonas: DebateParticipant[] = [
  {
    id: '1',
    name: 'Alex',
    role: 'AI Assistant',
    avatar: '/avatars/ai1.png',
    description: 'Helpful and informative AI assistant',
    isSpeaking: false,
    isMuted: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Jordan',
    role: 'AI Debater',
    avatar: '/avatars/ai2.png',
    description: 'Analytical and logical debater',
    isSpeaking: false,
    isMuted: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
