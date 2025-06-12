import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AIPersona, ChatMessage, DebateSettings } from '../types';

declare global {
  interface Window {
    // For browser environment
    setTimeout: (handler: TimerHandler, timeout?: number, ...args: any[]) => number;
    clearTimeout: (handle?: number) => void;
  }
}

type Timeout = ReturnType<typeof setTimeout>;

interface UseDebateLogicProps {
  initialParticipants: AIPersona[];
  initialSettings?: Partial<DebateSettings>;
  onDebateStateChange?: (isActive: boolean) => void;
  onTurnChange?: (participantId: string | null) => void;
}

export const useDebateLogic = ({
  initialParticipants,
  initialSettings = {},
  onDebateStateChange,
  onTurnChange,
}: UseDebateLogicProps) => {
  // State
  const [participants, setParticipants] = useState<AIPersona[]>(initialParticipants);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState<number>(-1);
  const [isDebateActive, setIsDebateActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [settings, setSettings] = useState<DebateSettings>({
    turnDuration: 60,
    maxTurns: 10,
    allowInterruptions: true,
    ...initialSettings,
  });

  // Refs
  const turnTimerRef = useRef<Timeout | null>(null);
  const debateTimerRef = useRef<Timeout | null>(null);
  const turnCountRef = useRef<number>(0);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      if (debateTimerRef.current) clearTimeout(debateTimerRef.current);
    };
  }, []);

  // Handle turn timeout
  const endTurn = useCallback(() => {
    if (turnTimerRef.current) {
      clearTimeout(turnTimerRef.current);
      turnTimerRef.current = null;
    }

    const nextSpeakerIndex = (currentSpeakerIndex + 1) % participants.length;
    setCurrentSpeakerIndex(nextSpeakerIndex);
    onTurnChange?.(participants[nextSpeakerIndex]?.id || null);
    turnCountRef.current += 1;

    // End debate if max turns reached
    if (turnCountRef.current >= settings.maxTurns * participants.length) {
      stopDebate();
      return;
    }

    // Start next turn
    turnTimerRef.current = setTimeout(() => {
      endTurn();
    }, settings.turnDuration * 1000);
  }, [currentSpeakerIndex, participants, settings, onTurnChange]);

  // Start debate
  const startDebate = useCallback(() => {
    if (isDebateActive) return;
    
    setIsDebateActive(true);
    setIsPaused(false);
    turnCountRef.current = 0;
    
    // Start with first participant
    const firstSpeakerIndex = 0;
    setCurrentSpeakerIndex(firstSpeakerIndex);
    onTurnChange?.(participants[firstSpeakerIndex]?.id || null);
    
    // Start first turn
    turnTimerRef.current = setTimeout(() => {
      endTurn();
    }, settings.turnDuration * 1000);
    
    onDebateStateChange?.(true);
  }, [isDebateActive, participants, settings.turnDuration, endTurn, onDebateStateChange, onTurnChange]);

  // Stop debate
  const stopDebate = useCallback(() => {
    if (turnTimerRef.current) {
      clearTimeout(turnTimerRef.current);
      turnTimerRef.current = null;
    }
    if (debateTimerRef.current) {
      clearTimeout(debateTimerRef.current);
      debateTimerRef.current = null;
    }
    
    setIsDebateActive(false);
    setIsPaused(false);
    setCurrentSpeakerIndex(-1);
    onDebateStateChange?.(false);
    onTurnChange?.(null);
  }, [onDebateStateChange, onTurnChange]);

  // Toggle pause
  const togglePause = useCallback(() => {
    if (!isDebateActive) return;
    
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState && turnTimerRef.current) {
      clearTimeout(turnTimerRef.current);
      turnTimerRef.current = null;
    } else if (!newPausedState && !turnTimerRef.current) {
      turnTimerRef.current = setTimeout(() => {
        endTurn();
      }, settings.turnDuration * 1000);
    }
  }, [isDebateActive, isPaused, settings.turnDuration, endTurn]);

  // Add message to the debate
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Add participant
  const addParticipant = useCallback((participant: AIPersona) => {
    setParticipants(prev => [...prev, { ...participant, id: uuidv4() }]);
  }, []);

  // Remove participant
  const removeParticipant = useCallback((participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    
    // If current speaker is removed, end their turn
    if (currentSpeakerIndex >= 0 && participants[currentSpeakerIndex]?.id === participantId) {
      endTurn();
    }
  }, [currentSpeakerIndex, participants, endTurn]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<DebateSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  return {
    // State
    participants,
    messages,
    currentSpeakerIndex,
    isDebateActive,
    isPaused,
    settings,
    
    // Actions
    startDebate,
    stopDebate,
    togglePause,
    addMessage,
    addParticipant,
    removeParticipant,
    updateSettings,
    endTurn,
  };
};
