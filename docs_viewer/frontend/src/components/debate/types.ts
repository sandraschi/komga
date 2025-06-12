// Local types to avoid external dependencies
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  sender: string;
  metadata?: Record<string, any>;
  isError?: boolean;
  isTyping?: boolean;
  parentId?: string;
  childrenIds?: string[];
  reactions?: Record<string, string[]>;
}

interface AIPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  avatar?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebateParticipant extends AIPersona {
  id: string;
  name: string;
  isActive: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  description: string;
  systemPrompt: string;
  avatar?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebateMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  isError?: boolean;
  isTyping?: boolean;
}

export interface DebateViewProps {
  documentId?: string;
  onClose?: () => void;
  onAddToChat?: (message: string) => void;
  initialMessages?: DebateMessage[];
  initialParticipants?: DebateParticipant[];
  initialTopic?: string;
  initialSettings?: DebateSettings;
}

export interface DebateSettings {
  topic: string;
  participants: string[];
  turnDuration: number;
  maxTurns: number;
  timeLimit: number;
  allowInterruptions: boolean;
  requireCitations: boolean;
  scoringCriteria: string[];
}

export const defaultDebateSettings: DebateSettings = {
  topic: 'The impact of AI on society',
  participants: [],
  turnDuration: 60,
  maxTurns: 5,
  timeLimit: 30,
  allowInterruptions: true,
  requireCitations: false,
  scoringCriteria: ['clarity', 'relevance', 'evidence', 'engagement']
};

export const defaultPersonas: DebateParticipant[] = [
  {
    id: 'optimist',
    name: 'AI Optimist',
    description: 'Believes AI will have a positive impact on society',
    systemPrompt: 'You are an AI optimist. Focus on the benefits and positive potential of AI.',
    avatar: '/avatars/optimist.png',
    isActive: true,
    isMuted: false,
    isSpeaking: false,
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    stopSequences: ['\n\n'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'skeptic',
    name: 'AI Skeptic',
    description: 'Concerned about potential negative impacts of AI',
    systemPrompt: 'You are an AI skeptic. Focus on the risks and challenges of AI development.',
    avatar: '/avatars/skeptic.png',
    isActive: true,
    isMuted: false,
    isSpeaking: false,
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    stopSequences: ['\n\n'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
