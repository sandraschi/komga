export interface AIPersona {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  role?: string;
  personalityTraits?: string[];
  knowledgeAreas?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isAI?: boolean;
  isTyping?: boolean;
  citations?: string[];
  context?: any;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  reactions?: {
    [emoji: string]: string[]; // emoji -> array of user IDs
  };
  replyTo?: string; // ID of the message being replied to
  attachments?: Array<{
    id: string;
    type: 'image' | 'document' | 'audio' | 'video' | 'file';
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }>;
}

export interface DebateSettings {
  turnDuration: number;
  maxTurns: number;
  allowInterruptions: boolean;
}

export interface DocumentReference {
  id: string;
  title: string;
  type: string;
  url?: string;
}

export interface DebateParticipant extends AIPersona {
  isSpeaking?: boolean;
  isActive?: boolean;
  lastSpoken?: Date;
}

export interface DebateViewProps {
  documentId: string;
  onClose?: () => void;
  onAddToChat?: (message: string) => void;
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  onAddParticipant?: (participant: AIPersona) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onStartDebate?: () => void;
  onStopDebate?: () => void;
  onPauseDebate?: () => void;
  onResumeDebate?: () => void;
  onResetDebate?: () => void;
  onTopicChange?: (topic: string) => void;
  onMessageChange?: (message: string) => void;
  onTogglePersonalitySelector?: () => void;
  showPersonalitySelector?: boolean;
  onToggleSettings?: () => void;
  showSettings?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onToggleMute?: () => void;
  isMuted?: boolean;
  onToggleVideo?: () => void;
  isVideoEnabled?: boolean;
  onToggleScreenShare?: () => void;
  isScreenSharing?: boolean;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  onToggleParticipants?: () => void;
  showParticipants?: boolean;
  onToggleReactions?: () => void;
  showReactions?: boolean;
  onToggleEmojiPicker?: () => void;
  showEmojiPicker?: boolean;
  onToggleAttachFile?: () => void;
  showAttachFile?: boolean;
  onToggleMoreOptions?: () => void;
  showMoreOptions?: boolean;
  onToggleHelp?: () => void;
  showHelp?: boolean;
  onToggleInfo?: () => void;
  showInfo?: boolean;
  onToggleBookmark?: () => void;
  isBookmarked?: boolean;
  onToggleFlag?: () => void;
  isFlagged?: boolean;
  onToggleReport?: () => void;
  isReported?: boolean;
  onToggleBlock?: () => void;
  isBlocked?: boolean;
  onToggleVolume?: () => void;
  isVolumeOn?: boolean;
  onToggleMic?: () => void;
  isMicOn?: boolean;
  onToggleCamera?: () => void;
  isCameraOn?: boolean;
  initialTopic?: string;
  initialParticipants?: AIPersona[];
  initialMessages?: ChatMessage[];
  initialSettings?: DebateSettings;
}
