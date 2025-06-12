export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

export enum ChatMode {
  STANDARD = 'standard',
  DEBATE = 'debate',
  FUTURE_SELF = 'future_self',
  TEAMS = 'teams',
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sender: string;
  metadata?: Record<string, any>;
  isError?: boolean;
  isTyping?: boolean;
  parentId?: string;
  childrenIds?: string[];
  reactions?: Record<string, string[]>; // emoji -> [userId, ...]
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  isAI?: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  participants: ChatParticipant[];
  messages: Message[];
  mode: ChatMode;
  metadata?: Record<string, any>;
  isArchived?: boolean;
  isPinned?: boolean;
  unreadCount?: number;
}

export interface AIPersona {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  systemPrompt: string;
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

export interface DebateSettings {
  topic: string;
  participants: string[]; // AI persona IDs
  maxTurns?: number;
  timeLimit?: number; // in minutes
  allowInterruptions?: boolean;
  requireCitations?: boolean;
  scoringCriteria?: string[];
}

export interface FutureSelfSettings {
  targetDate: string; // ISO date string
  currentContext: string;
  goals: string[];
  concerns: string[];
  timeTravelInterval?: number; // in days
  includeMemories?: boolean;
  includeDocuments?: boolean;
}

export interface TeamsChatSettings {
  participants: Array<{
    id: string;
    personaId: string;
    role?: string;
    isRequired?: boolean;
  }>;
  meetingAgenda?: string;
  duration?: number; // in minutes
  allowSideConversations?: boolean;
  recordTranscript?: boolean;
}

export interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  systemMessage: string;
  useRAG: boolean;
  ragCollections: string[];
  ragDocuments: string[];
  ragK: number;
  ragScoreThreshold: number;
}
