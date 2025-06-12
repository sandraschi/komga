import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export const chatApi = {
  sendMessage: async (sessionId: string, message: string, options = {}) => {
    const response = await api.post(`/api/chat/send`, {
      session_id: sessionId,
      message,
      ...options,
    });
    return response.data;
  },
  
  streamMessage: (sessionId: string, message: string, options = {}) => {
    const eventSource = new EventSource(
      `${API_BASE_URL}/api/chat/stream?session_id=${sessionId}&message=${encodeURIComponent(message)}`
    );
    return eventSource;
  },
  
  startDebate: async (topic: string, participants: string[], options = {}) => {
    const response = await api.post('/api/chat/debate/start', {
      topic,
      participants,
      ...options,
    });
    return response.data;
  },
  
  getPersonas: async () => {
    const response = await api.get('/api/chat/personas');
    return response.data;
  },
};

// Document API
export const documentApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  search: async (query: string, filters = {}) => {
    const response = await api.post('/api/documents/search', {
      query,
      ...filters,
    });
    return response.data;
  },
  
  getDocument: async (id: string) => {
    const response = await api.get(`/api/documents/${id}`);
    return response.data;
  },
};

// AI Playground API
export const playgroundApi = {
  generateCompletion: async (prompt: string, options = {}) => {
    const response = await api.post('/api/playground/completions', {
      prompt,
      ...options,
    });
    return response.data;
  },
  
  getModels: async () => {
    const response = await api.get('/api/playground/models');
    return response.data;
  },
  
  startTeamsChat: async (participants: any[], options = {}) => {
    const response = await api.post('/api/playground/teams-chat', {
      participants,
      ...options,
    });
    return response.data;
  },
};

// Future Self API
export const futureSelfApi = {
  createSession: async (details: any) => {
    const response = await api.post('/api/future-self/session', details);
    return response.data;
  },
  
  sendMessage: async (sessionId: string, message: string) => {
    const response = await api.post(`/api/future-self/session/${sessionId}/message`, { message });
    return response.data;
  },
  
  getSessions: async () => {
    const response = await api.get('/api/future-self/sessions');
    return response.data;
  },
};

export default api;
