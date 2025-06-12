import { AIPersona } from './chat';

export enum DebateFormat {
  OPEN_DEBATE = 'open',
  MODERATED = 'moderated',
  TIMED = 'timed',
  PANEL = 'panel',
}

export interface DocumentReference {
  id: string;
  title: string;
  excerpt: string;
  page?: number;
}

export interface DebateSettings {
  format: DebateFormat;
  maxTurns: number;
  timeLimit: number; // minutes
  currentTurn: number;
  allowInterruptions: boolean;
  requireCitations: boolean;
  useRAG: boolean;
  maxResponseLength: number; // sentences
  selectedDocuments: string[];
}

export interface DebateParticipant {
  id: string;
  name: string;
  isAI: boolean;
  metadata: {
    personaId: string;
  };
}

export interface DebateViewProps {
  initialTopic?: string;
  initialParticipants?: AIPersona[];
}

export const defaultDebateSettings: DebateSettings = {
  format: DebateFormat.MODERATED,
  maxTurns: 6,
  timeLimit: 30, // minutes
  currentTurn: 0,
  allowInterruptions: true,
  requireCitations: true,
  useRAG: true,
  maxResponseLength: 3, // sentences
  selectedDocuments: ['doc1'],
};
