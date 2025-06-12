// Local AIPersona type to avoid external dependencies
type AIPersona = {
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
};

export interface ChatMessage {
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

export interface ChatParticipant extends AIPersona {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
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
  messages: ChatMessage[];
  metadata?: Record<string, any>;
  isArchived?: boolean;
  isPinned?: boolean;
}
