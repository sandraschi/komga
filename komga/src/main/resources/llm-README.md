# LLM Integration Module

This module provides integration with various Large Language Model (LLM) providers for Komga. It supports multiple LLM backends, including OpenAI, Ollama, LM Studio, vLLM, and Google NoteLM.

## Features

- **Multiple Provider Support**: Switch between different LLM providers with minimal configuration changes
- **Unified API**: Consistent interface for interacting with different LLM providers
- **Automatic Retry**: Built-in retry logic for transient failures
- **Asynchronous**: Non-blocking operations for better performance
- **Extensible**: Easy to add support for additional LLM providers

## Configuration

Edit the `application-llm.yml` file to configure the LLM providers. By default, all providers are disabled. You need to explicitly enable the providers you want to use.

### Common Configuration

```yaml
komga:
  llm:
    enabled: true  # Master switch for LLM functionality
    default-provider: OPENAI  # Default provider to use
    
    # Common settings for all providers
    common:
      system-prompt: |
        You are a helpful assistant that analyzes books, comics, and other media.
        Provide detailed, insightful, and accurate responses.
      default-max-tokens: 1000
      default-temperature: 0.7
      default-timeout: 30
      debug: false
```

### OpenAI Configuration

```yaml
openai:
  enabled: true
  api-key: ${OPENAI_API_KEY:}  # Required
  organization-id: ${OPENAI_ORGANIZATION_ID:}  # Optional
  api-url: https://api.openai.com/v1
  model: gpt-4
  embedding-model: text-embedding-ada-002
  temperature: 0.7
  max-tokens: 1000
  timeout-seconds: 30
  max-retries: 3
  rate-limit-requests-per-minute: 60
```

### Ollama Configuration

```yaml
ollama:
  enabled: true
  api-url: http://localhost:11434
  model: llama2
  temperature: 0.7
  max-tokens: 2000
  timeout-seconds: 120
  context-window: 4096
```

### LM Studio Configuration

```yaml
lmstudio:
  enabled: true
  api-url: http://localhost:1234/v1
  model: local-model
  temperature: 0.7
  max-tokens: 2000
  timeout-seconds: 120
```

### vLLM Configuration

```yaml
vllm:
  enabled: true
  api-url: http://localhost:8000/v1
  model: gpt2
  temperature: 0.7
  max-tokens: 2000
  timeout-seconds: 120
```

### Google NoteLM Configuration

```yaml
google-note-lm:
  enabled: true
  api-key: ${GOOGLE_NOTE_LM_API_KEY:}  # Base64-encoded service account JSON
  project-id: ${GOOGLE_NOTE_LM_PROJECT_ID:}
  location: us-central1
  model: note-lm
  temperature: 0.7
  max-tokens: 1024
  timeout-seconds: 60
  api-url: https://us-central1-aiplatform.googleapis.com/v1
```

## Environment Variables

All sensitive configuration should be provided via environment variables. The following environment variables are supported:

### Common

- `LLM_ENABLED`: Enable/disable the LLM module (default: `false`)
- `LLM_DEFAULT_PROVIDER`: Default provider to use (e.g., `OPENAI`, `OLLAMA`)
- `LLM_DEBUG`: Enable debug logging (default: `false`)

### OpenAI

- `OPENAI_ENABLED`: Enable OpenAI provider (default: `false`)
- `OPENAI_API_KEY`: Your OpenAI API key (required if enabled)
- `OPENAI_ORGANIZATION_ID`: Your OpenAI organization ID (optional)
- `OPENAI_API_URL`: OpenAI API URL (default: `https://api.openai.com/v1`)
- `OPENAI_MODEL`: Model to use (default: `gpt-4`)
- `OPENAI_EMBEDDING_MODEL`: Embedding model to use (default: `text-embedding-ada-002`)
- `OPENAI_TEMPERATURE`: Temperature for generation (default: `0.7`)
- `OPENAI_MAX_TOKENS`: Maximum tokens to generate (default: `1000`)
- `OPENAI_TIMEOUT`: Request timeout in seconds (default: `30`)
- `OPENAI_MAX_RETRIES`: Maximum number of retries (default: `3`)
- `OPENAI_RETRY_DELAY`: Initial delay between retries in milliseconds (default: `1000`)
- `OPENAI_RETRY_MULTIPLIER`: Multiplier for retry delay (default: `2.0`)
- `OPENAI_RATE_LIMIT`: Maximum requests per minute (default: `60`)

### Ollama

- `OLLAMA_ENABLED`: Enable Ollama provider (default: `false`)
- `OLLAMA_API_URL`: Ollama API URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model to use (default: `llama2`)
- `OLLAMA_TEMPERATURE`: Temperature for generation (default: `0.7`)
- `OLLAMA_MAX_TOKENS`: Maximum tokens to generate (default: `2000`)
- `OLLAMA_TIMEOUT`: Request timeout in seconds (default: `120`)
- `OLLAMA_CONTEXT_WINDOW`: Context window size in tokens (default: `4096`)

### LM Studio

- `LM_STUDIO_ENABLED`: Enable LM Studio provider (default: `false`)
- `LM_STUDIO_API_URL`: LM Studio API URL (default: `http://localhost:1234/v1`)
- `LM_STUDIO_MODEL`: Model to use (default: `local-model`)
- `LM_STUDIO_TEMPERATURE`: Temperature for generation (default: `0.7`)
- `LM_STUDIO_MAX_TOKENS`: Maximum tokens to generate (default: `2000`)
- `LM_STUDIO_TIMEOUT`: Request timeout in seconds (default: `120`)

### vLLM

- `VLLM_ENABLED`: Enable vLLM provider (default: `false`)
- `VLLM_API_URL`: vLLM API URL (default: `http://localhost:8000/v1`)
- `VLLM_MODEL`: Model to use (default: `gpt2`)
- `VLLM_TEMPERATURE`: Temperature for generation (default: `0.7`)
- `VLLM_MAX_TOKENS`: Maximum tokens to generate (default: `2000`)
- `VLLM_TIMEOUT`: Request timeout in seconds (default: `120`)

### Google NoteLM

- `GOOGLE_NOTE_LM_ENABLED`: Enable Google NoteLM provider (default: `false`)
- `GOOGLE_NOTE_LM_API_KEY`: Base64-encoded service account JSON (required if enabled)
- `GOOGLE_NOTE_LM_PROJECT_ID`: Google Cloud project ID (required if enabled)
- `GOOGLE_NOTE_LM_LOCATION`: Google Cloud location (default: `us-central1`)
- `GOOGLE_NOTE_LM_MODEL`: Model to use (default: `note-lm`)
- `GOOGLE_NOTE_LM_TEMPERATURE`: Temperature for generation (default: `0.7`)
- `GOOGLE_NOTE_LM_MAX_TOKENS`: Maximum tokens to generate (default: `1024`)
- `GOOGLE_NOTE_LM_TIMEOUT`: Request timeout in seconds (default: `60`)
- `GOOGLE_NOTE_LM_API_URL`: Google Cloud API URL (default: `https://us-central1-aiplatform.googleapis.com/v1`)

## API Endpoints

The following REST endpoints are available:

- `GET /api/v1/llm/providers`: List all available LLM providers
- `GET /api/v1/llm/provider/active`: Get the currently active provider
- `POST /api/v1/llm/provider/{providerId}/switch`: Switch to a different provider
- `POST /api/v1/llm/completions`: Generate a completion
- `POST /api/v1/llm/chat/completions`: Generate a chat completion
- `POST /api/v1/llm/embeddings`: Create an embedding

## Usage Example

```kotlin
// Inject the LLM service
@Autowired
private lateinit var llmService: LlmService

// Generate a completion
val completion = llmService.generateCompletion(
    prompt = "Tell me about Komga",
    maxTokens = 500,
    temperature = 0.7
)

// Generate a chat completion
val messages = listOf(
    ChatMessage(
        role = ChatMessage.Role.SYSTEM,
        content = "You are a helpful assistant that knows about Komga."
    ),
    ChatMessage(
        role = ChatMessage.Role.USER,
        content = "What is Komga?"
    )
)

val chatCompletion = llmService.generateChatCompletion(
    messages = messages,
    maxTokens = 500,
    temperature = 0.7
)

// Create an embedding
val embedding = llmService.createEmbedding("This is a test")
```

## Adding a New Provider

1. Create a new service class that implements the `LlmService` interface
2. Add configuration properties in `LlmConfig.kt`
3. Update `LlmServiceFactory` to support the new provider
4. Add auto-configuration in `LlmAutoConfiguration.kt`
5. Update the documentation

## License

This module is part of the Komga project and is licensed under the MIT License.
