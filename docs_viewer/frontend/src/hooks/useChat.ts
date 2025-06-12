import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatApi } from '../services/api';
import { Message, MessageRole, ChatParticipant, AIPersona, ChatMode } from '../types/chat';

interface UseChatOptions {
  initialMessages?: Message[];
  sessionId?: string;
  autoStart?: boolean;
  onNewMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}

const useChat = (options: UseChatOptions = {}) => {
  const {
    initialMessages = [],
    sessionId: initialSessionId,
    autoStart = true,
    onNewMessage,
    onError,
  } = options;

  const [sessionId] = useState(initialSessionId || `sess-${uuidv4()}`);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [mode, setMode] = useState<ChatMode>('standard');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize chat session
  useEffect(() => {
    if (autoStart) {
      initializeSession();
    }

    return () => {
      // Clean up any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoStart]);

  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      // TODO: Initialize chat session with backend
      // const session = await chatApi.initializeSession(sessionId);
      // setMessages(session.messages || []);
      // setParticipants(session.participants || []);
      // setMode(session.mode || 'standard');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    onError?.(error);
    console.error('Chat error:', error);
  }, [onError]);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>): Message => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    onNewMessage?.(newMessage);
    return newMessage;
  }, [onNewMessage]);

  const sendMessage = useCallback(async (content: string, options: {
    role?: MessageRole;
    sender?: string;
    metadata?: Record<string, any>;
    stream?: boolean;
  } = {}) => {
    const {
      role = MessageRole.USER,
      sender = 'You',
      metadata = {},
      stream = true,
    } = options;

    const userMessage = addMessage({
      role,
      content,
      sender,
      metadata,
    });

    if (role === MessageRole.USER) {
      await sendToAI(content, {
        stream,
        parentMessageId: userMessage.id,
      });
    }

    return userMessage;
  }, [addMessage]);

  const sendToAI = useCallback(async (
    content: string,
    options: {
      stream?: boolean;
      parentMessageId?: string;
      personaId?: string;
    } = {}
  ) => {
    const {
      stream = true,
      parentMessageId,
      personaId,
    } = options;

    setIsLoading(true);
    setError(null);

    // Create a placeholder for the AI's response
    const responseId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const responseMessage: Message = {
      id: responseId,
      role: MessageRole.ASSISTANT,
      content: '',
      sender: 'AI',
      timestamp: new Date(),
      isTyping: true,
      parentId: parentMessageId,
    };

    setMessages(prev => [...prev, responseMessage]);

    try {
      if (stream) {
        // Use streaming response
        await streamAIResponse(responseId, content, {
          personaId,
          parentMessageId,
        });
      } else {
        // Use regular API call
        const response = await chatApi.sendMessage(sessionId, content, {
          personaId,
          parentMessageId,
        });

        updateMessage(responseId, {
          content: response.message,
          isTyping: false,
          metadata: response.metadata,
        });
      }
    } catch (err) {
      handleError(err);
      updateMessage(responseId, {
        content: 'Sorry, there was an error processing your message.',
        isError: true,
        isTyping: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const streamAIResponse = useCallback(async (
    messageId: string,
    content: string,
    options: {
      personaId?: string;
      parentMessageId?: string;
    } = {}
  ) => {
    const { personaId, parentMessageId } = options;
    
    try {
      setIsStreaming(true);
      
      // Create a new AbortController for this request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: content,
          personaId,
          parentMessageId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Convert the Uint8Array to a string
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                fullResponse = data.content;
                updateMessage(messageId, {
                  content: fullResponse,
                  isTyping: true,
                });
              } else if (data.type === 'done') {
                updateMessage(messageId, {
                  content: fullResponse,
                  isTyping: false,
                  metadata: data.metadata,
                });
                return;
              }
            } catch (err) {
              console.error('Error parsing SSE message:', err);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        handleError(err);
        updateMessage(messageId, {
          content: 'Sorry, there was an error processing your message.',
          isError: true,
          isTyping: false,
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [sessionId]);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Debated LLMs feature
  const startDebate = useCallback(async (topic: string, personas: AIPersona[]) => {
    if (personas.length < 2) {
      throw new Error('At least two personas are required for a debate');
    }

    setMode('debate');
    
    // Add system message about the debate
    addMessage({
      role: MessageRole.SYSTEM,
      content: `Starting a debate on: ${topic}`,
      sender: 'System',
    });

    // Let each AI participant introduce themselves
    for (const persona of personas) {
      await sendMessage(
        `I am ${persona.name}. ${persona.description} Let's discuss: ${topic}`,
        {
          role: MessageRole.ASSISTANT,
          sender: persona.name,
          metadata: { personaId: persona.id },
          stream: false,
        }
      );
    }

    // Start the debate with the first participant
    await sendToAI(topic, {
      personaId: personas[0].id,
      stream: true,
    });
  }, [addMessage, sendMessage, sendToAI]);

  // Future Self feature
  const startFutureSelfChat = useCallback(async (settings: {
    targetDate: string;
    currentContext: string;
    goals: string[];
  }) => {
    setMode('future_self');
    
    // Add system message about the future self chat
    addMessage({
      role: MessageRole.SYSTEM,
      content: `Starting a conversation with your future self from ${settings.targetDate}.`,
      sender: 'System',
    });

    // Initialize the future self persona
    const futureSelfPersona: AIPersona = {
      id: 'future-self',
      name: 'Future You',
      description: `This is you from ${settings.targetDate}, with insights from the future.`,
      systemPrompt: `You are the user's future self from ${settings.targetDate}. ` +
        `The user's current context: ${settings.currentContext}. ` +
        `Their goals: ${settings.goals.join(', ')}. ` +
        `Provide wise, thoughtful advice as if you are their future self looking back.`,
      temperature: 0.7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Have the future self introduce themselves
    await sendMessage(
      `Hello from ${settings.targetDate}! I'm you from the future. ` +
      `I'm here to share insights and advice based on your current path. ` +
      `What would you like to know about your future?`,
      {
        role: MessageRole.ASSISTANT,
        sender: futureSelfPersona.name,
        metadata: { personaId: futureSelfPersona.id },
        stream: false,
      }
    );
  }, [addMessage, sendMessage]);

  // Teams Chat feature
  const startTeamsChat = useCallback(async (participants: Array<{
    id: string;
    persona: AIPersona;
    role?: string;
  }>) => {
    setMode('teams');
    
    // Add system message about the teams chat
    addMessage({
      role: MessageRole.SYSTEM,
      content: 'Starting a Teams-style meeting with the following participants: ' +
        participants.map(p => p.persona.name).join(', '),
      sender: 'System',
    });

    // Add each participant to the chat
    for (const { persona, role } of participants) {
      await sendMessage(
        role ? `${persona.name} (${role}) has joined the meeting.` : `${persona.name} has joined the meeting.`,
        {
          role: MessageRole.SYSTEM,
          sender: 'System',
          stream: false,
        }
      );
    }

    // Start the meeting with the first participant
    await sendToAI("Let's get started with the meeting. What's the first topic?", {
      personaId: participants[0]?.persona.id,
      stream: true,
    });
  }, [addMessage, sendMessage, sendToAI]);

  return {
    // State
    sessionId,
    messages,
    isLoading,
    isStreaming,
    participants,
    mode,
    error,
    
    // Methods
    sendMessage,
    sendToAI,
    addMessage,
    updateMessage,
    startDebate,
    startFutureSelfChat,
    startTeamsChat,
    setParticipants,
    setMode,
  };
};

export default useChat;
