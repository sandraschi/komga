import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message as ChatMessage } from '../../../../types/chat';
import { DebateParticipant, DebateSettings } from '../types';

interface UseDebateProps {
  initialMessages?: DebateMessage[];
  participants: DebateParticipant[];
  settings: DebateSettings;
}

interface UseDebateReturn {
  messages: DebateMessage[];
  isDebateActive: boolean;
  isPaused: boolean;
  startDebate: () => void;
  stopDebate: () => void;
  togglePause: () => void;
  sendMessage: (content: string, senderId?: string) => void;
}

const useDebate = ({
  initialMessages = [],
  participants,
  settings,
}: UseDebateProps): UseDebateReturn => {
  // State
  const [messages, setMessages] = useState<DebateMessage[]>(initialMessages);
  const [isDebateActive, setIsDebateActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);
  
  // Refs
  const debateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized values
  const activeParticipants = useMemo(() => 
    participants.filter(p => p.isActive && !p.isMuted),
    [participants]
  );

  // Add a new message to the debate
  const addMessage = useCallback((content: string, senderId: string): DebateMessage => {
    const newMessage: DebateMessage = {
      id: uuidv4(),
      content,
      senderId,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Process the next turn in the debate
  const processNextTurn = useCallback(() => {
    if (!isDebateActive || isPaused || activeParticipants.length === 0) {
      return;
    }

    // Get the next speaker (round-robin)
    const nextSpeakerIndex = (currentSpeakerIndex + 1) % activeParticipants.length;
    const currentSpeaker = activeParticipants[currentSpeakerIndex];
    setCurrentSpeakerIndex(nextSpeakerIndex);

    // Simulate AI response (in a real app, this would call your AI service)
    const thinkingTime = Math.max(500, Math.random() * 2000); // 0.5s - 2.5s
    
    const simulateParticipantResponse = async (participant: DebateParticipant) => {
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = `This is a simulated response from ${participant.name}`;
      addMessage(response, participant.id);
    };

    debateTimerRef.current = setTimeout(async () => {
      if (!isDebateActive || isPaused) return;
      
      await simulateParticipantResponse(currentSpeaker);
      
      // Schedule next turn if debate is still active
      if (isDebateActive && !isPaused) {
        debateTimerRef.current = setTimeout(processNextTurn, settings.turnDuration * 1000);
      }
    }, thinkingTime);
  }, [isDebateActive, isPaused, currentSpeakerIndex, activeParticipants, settings.turnDuration, addMessage, processNextTurn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debateTimerRef.current) {
        clearTimeout(debateTimerRef.current);
      }
    };
  }, []);

  // Start the debate
  const startDebate = useCallback(() => {
    if (isDebateActive || activeParticipants.length === 0) return;
    
    setIsDebateActive(true);
    setIsPaused(false);
    setCurrentSpeakerIndex(0);
    
    // Start with the first participant
    processNextTurn();
  }, [isDebateActive, activeParticipants.length, processNextTurn]);

  // Stop the debate
  const stopDebate = useCallback(() => {
    if (debateTimerRef.current) {
      clearTimeout(debateTimerRef.current);
      debateTimerRef.current = null;
    }
    
    setIsDebateActive(false);
    setIsPaused(false);
  }, []);

  // Toggle pause state
  const togglePause = useCallback(() => {
    if (!isDebateActive) return;
    
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      // Pausing - clear any pending turn
      if (debateTimerRef.current) {
        clearTimeout(debateTimerRef.current);
        debateTimerRef.current = null;
      }
      addMessage("The debate has been paused.", 'system');
    } else {
      // Resuming - continue with next turn
      addMessage("The debate has been resumed.", 'system');
      processNextTurn();
    }
  }, [isDebateActive, isPaused, processNextTurn, addMessage]);

  // Send a message (from user or AI)
  const sendMessage = useCallback((content: string, senderId: string = 'user') => {
    if (!content.trim()) return;
    
    addMessage(content, senderId);
    
    // If the debate is active and the message is from the user, process next turn
    if (isDebateActive && !isPaused && senderId === 'user') {
      if (debateTimerRef.current) {
        clearTimeout(debateTimerRef.current);
        debateTimerRef.current = null;
      }
      processNextTurn();
    }
  }, [addMessage, isDebateActive, isPaused, processNextTurn]);

  return {
    messages,
    isDebateActive,
    isPaused,
    startDebate,
    stopDebate,
    togglePause,
    sendMessage,
  };
};

export { useDebate };
