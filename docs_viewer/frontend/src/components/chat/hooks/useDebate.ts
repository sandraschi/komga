import { useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AIPersona, ChatMessage, DebateSettings } from '../types';
import { useDebateLogic } from './useDebateLogic';

type Timeout = ReturnType<typeof setTimeout>;

export const useDebate = (initialParticipants: AIPersona[] = []) => {
  // Define the message type for the queue
  interface QueuedMessage extends Omit<ChatMessage, 'id' | 'timestamp'> {
    typingIndicatorId?: string;
  }

  // Refs for tracking state without re-renders
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const isProcessingQueueRef = useRef(false);
  const typingTimeoutsRef = useRef<Record<string, Timeout>>({});
  const activeTypingIndicators = useRef<Set<string>>(new Set());

  // Use the core debate logic
  const {
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
    addMessage: addMessageToDebate,
    addParticipant,
    removeParticipant,
    updateSettings,
    endTurn,
  } = useDebateLogic({
    initialParticipants,
    onDebateStateChange: (isActive) => {
      if (isActive) {
        processMessageQueue();
      }
    },
    onTurnChange: (participantId) => {
      // Handle turn changes (e.g., highlight current speaker)
      console.log('Turn changed to participant:', participantId);
    },
  });

  // Define processMessageQueue using useRef to avoid circular dependencies
  const processMessageQueueRef = useRef<() => void>();
  
  // Initialize the message queue processor
  processMessageQueueRef.current = async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const message = messageQueueRef.current.shift();
    
    if (message) {
      // Add typing indicator
      const typingIndicatorId = `typing-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      // Add typing indicator
      addMessageToDebate({
        id: typingIndicatorId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: '...',
        isAI: message.isAI,
        isTyping: true,
        timestamp: new Date(),
      });
      
      // Simulate typing delay (0.5-2 seconds)
      const typingDelay = 500 + Math.random() * 1500;
      
      // Clear any existing timeout for this sender
      if (typingTimeoutsRef.current[message.senderId]) {
        clearTimeout(typingTimeoutsRef.current[message.senderId]);
      }
      
      // Set new timeout
      typingTimeoutsRef.current[message.senderId] = window.setTimeout(() => {
        // Add the actual message
        const newMessage: ChatMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          isTyping: false,
        };
        
        // Add the actual message
        addMessageToDebate(newMessage);
        
        // Process next message in queue
        isProcessingQueueRef.current = false;
        if (processMessageQueueRef.current) {
          processMessageQueueRef.current();
        }
      }, typingDelay);
    } else {
      isProcessingQueueRef.current = false;
    }
  };

  // Process the message queue
  const processMessageQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const message = messageQueueRef.current[0]; // Peek at the first message
    
    if (!message) {
      isProcessingQueueRef.current = false;
      return;
    }

    // Skip if this message already has a typing indicator
    if (message.typingIndicatorId) {
      isProcessingQueueRef.current = false;
      return;
    }

    // Create a typing indicator
    const typingIndicatorId = `typing-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    message.typingIndicatorId = typingIndicatorId;
    activeTypingIndicators.current.add(typingIndicatorId);
    
    // Add typing indicator to the UI
    const typingMessage: ChatMessage = {
      id: typingIndicatorId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: '...',
      isAI: message.isAI,
      isTyping: true,
      timestamp: new Date(),
    };
    addMessageToDebate(typingMessage);
    
    // Simulate typing delay (0.5-2 seconds)
    const typingDelay = 500 + Math.random() * 1500;
    
    // Clear any existing timeout for this sender
    const existingTimeout = typingTimeoutsRef.current[message.senderId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout with proper typing
    typingTimeoutsRef.current[message.senderId] = window.setTimeout(() => {
      // Remove the typing indicator from active set
      activeTypingIndicators.current.delete(typingIndicatorId);
      
      // Remove the message from the queue
      const removedMessage = messageQueueRef.current.shift();
      if (!removedMessage) {
        isProcessingQueueRef.current = false;
        return;
      }
      
      // Add the actual message
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${uuidv4()}`,
        senderId: removedMessage.senderId,
        senderName: removedMessage.senderName,
        content: removedMessage.content,
        isAI: removedMessage.isAI,
        isTyping: false,
        timestamp: new Date(),
      };
      
      addMessageToDebate(newMessage);
      
      // Process next message in queue
      isProcessingQueueRef.current = false;
      processMessageQueue();
    }, typingDelay);
  }, [addMessageToDebate]);

  // Add a message to the debate (with queuing support)
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    // Create a new message object without modifying the original
    const queuedMessage: QueuedMessage = {
      ...message,
      typingIndicatorId: undefined
    };
    
    // Add the message to the queue
    messageQueueRef.current = [...messageQueueRef.current, queuedMessage];
    
    // Process the queue if the debate is active and not paused
    if (isDebateActive && !isPaused) {
      void processMessageQueue();
    }
  }, [isDebateActive, isPaused, processMessageQueue]);
  
  // Clean up timeouts and typing indicators on unmount
  useEffect(() => {
    const timeouts = typingTimeoutsRef.current;
    const typingIndicators = activeTypingIndicators.current;
    
    return () => {
      // Clear all timeouts
      Object.values(timeouts).forEach(timeoutId => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      
      // Clear any active typing indicators
      typingIndicators.clear();
      
      // Reset processing state
      isProcessingQueueRef.current = false;
    };
  }, []);

  // Generate AI response (simplified - would integrate with your AI service)
  const generateAIResponse = useCallback(async (message: string, context: any = {}) => {
    if (!isDebateActive || isPaused) return;
    
    // In a real implementation, this would call your AI service
    // For now, we'll simulate a response
    const currentSpeaker = participants[currentSpeakerIndex];
    if (!currentSpeaker) return;
    
    const response: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: currentSpeaker.id,
      senderName: currentSpeaker.name,
      content: `This is a simulated response to: "${message}"`,
      isAI: true,
      context,
    };
    
    addMessage(response);
    
    // End turn after response
    setTimeout(() => {
      endTurn();
    }, 1000);
  }, [participants, currentSpeakerIndex, isDebateActive, isPaused, addMessage, endTurn]);

  // Handle user message (from the current user)
  const handleUserMessage = useCallback((message: string, context: any = {}) => {
    if (!isDebateActive || isPaused) return;
    
    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: 'user',
      senderName: 'You',
      content: message,
      isAI: false,
      context,
    };
    
    addMessage(userMessage);
    
    // Generate AI response after a short delay
    setTimeout(() => {
      generateAIResponse(message, context);
    }, 500);
  }, [isDebateActive, isPaused, addMessage, generateAIResponse]);

  // Update debate settings
  const setSettings = useCallback((newSettings: Partial<DebateSettings>) => {
    updateSettings(newSettings);
  }, [updateSettings]);

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
    handleUserMessage,
    addParticipant,
    removeParticipant,
    setSettings,
    endTurn,
  };
};
