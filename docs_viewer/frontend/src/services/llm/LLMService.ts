import { v4 as uuidv4 } from 'uuid';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  name?: string;
  id?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'hybrid';
  models: string[];
  baseUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
}

class LLMService {
  private static instance: LLMService;
  private providers: LLMProvider[] = [];
  private activeProvider: LLMProvider | null = null;

  private constructor() {
    this.initializeDefaultProviders();
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private initializeDefaultProviders() {
    // Local Ollama provider
    this.addProvider({
      id: 'ollama',
      name: 'Ollama (Local)',
      type: 'local',
      baseUrl: 'http://localhost:11434',
      models: ['llama2', 'mistral', 'codellama'],
      isDefault: true,
    });

    // OpenAI provider
    this.addProvider({
      id: 'openai',
      name: 'OpenAI',
      type: 'cloud',
      baseUrl: 'https://api.openai.com/v1',
      models: ['gpt-4', 'gpt-3.5-turbo'],
    });
  }

  public addProvider(provider: Omit<LLMProvider, 'id'> & { id?: string }) {
    const newProvider = {
      id: provider.id || `provider-${uuidv4()}`,
      ...provider,
    };

    if (provider.isDefault) {
      this.providers = this.providers.map(p => ({
        ...p,
        isDefault: false,
      }));
    }

    this.providers = [
      ...this.providers.filter(p => p.id !== newProvider.id),
      newProvider,
    ];

    if (!this.activeProvider || newProvider.isDefault) {
      this.activeProvider = newProvider;
    }

    return newProvider;
  }

  public getProviders(): LLMProvider[] {
    return [...this.providers];
  }

  public getActiveProvider(): LLMProvider | null {
    return this.activeProvider || this.providers[0] || null;
  }

  public setActiveProvider(providerId: string): boolean {
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      this.activeProvider = provider;
      return true;
    }
    return false;
  }

  public async complete(
    messages: LLMMessage[],
    model: string = '',
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<LLMResponse> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active LLM provider');
    }

    const selectedModel = model || provider.models[0];
    if (!selectedModel) {
      throw new Error('No model specified and no default model available');
    }

    try {
      if (provider.type === 'local') {
        return this.completeLocal(provider, selectedModel, messages, options);
      } else {
        return this.completeCloud(provider, selectedModel, messages, options);
      }
    } catch (error) {
      console.error('LLM completion error:', error);
      throw new Error(`LLM request failed: ${error.message}`);
    }
  }

  private async completeLocal(
    provider: LLMProvider,
    model: string,
    messages: LLMMessage[],
    options: any
  ): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        stream: options.stream || false,
        options: {
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local LLM error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      model: data.model || model,
    };
  }

  private async completeCloud(
    provider: LLMProvider,
    model: string,
    messages: LLMMessage[],
    options: any
  ): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: options.stream || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cloud LLM error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage && {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private formatMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
    }));
  }

  // Helper method for streaming responses
  public async *streamComplete(
    messages: LLMMessage[],
    model: string = '',
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active LLM provider');
    }

    const selectedModel = model || provider.models[0];
    if (!selectedModel) {
      throw new Error('No model specified and no default model available');
    }

    const response = await fetch(
      provider.type === 'local'
        ? `${provider.baseUrl}/api/chat`
        : `${provider.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.apiKey && { 'Authorization': `Bearer ${provider.apiKey}` }),
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: this.formatMessages(messages),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM stream error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to read stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = provider.type === 'local' 
                ? data.message?.content || ''
                : data.choices?.[0]?.delta?.content || '';
              
              if (content) {
                yield content;
              }
            } catch (e) {
              console.warn('Failed to parse stream data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default LLMService.getInstance();
