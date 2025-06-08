# AI Extensions - Part 1: LLM Integration

This Komga fork integrates robust support for Large Language Models (LLMs), enabling a variety of advanced AI-driven features. The integration is designed to be flexible, supporting multiple LLM backends, including both local and cloud-based providers.

## 1. Overview of LLM Support

The LLM integration module allows Komga to leverage the power of generative AI for tasks such as:

*   Content analysis and summarization.
*   Semantic search and question answering about book content.
*   Generating descriptions or tagging suggestions.
*   Powering conversational interfaces related to the library.

The system is built with the following principles:

*   **Provider Agnostic:** Easily switch between different LLM providers.
*   **Unified API:** A consistent internal API for interacting with LLMs, regardless of the backend.
*   **Asynchronous Operations:** Ensures that LLM processing does not block main application threads, maintaining UI responsiveness.
*   **Extensibility:** Designed to allow for the addition of new LLM providers as they emerge.

## 2. Supported LLM Providers and Configuration

Komga's LLM module supports a range of providers. Configuration is primarily managed via a dedicated YAML file (e.g., `application-llm.yml` or similar, located in the Komga configuration directory) and can often be overridden or supplemented by environment variables for sensitive information like API keys.

*(The following information is largely based on the internal `llm-README.md` and may be subject to change based on the latest development version.)*

### Common Configuration Settings

Typically, there's a common section in the YAML configuration for settings applicable to all LLM providers:

```yaml
komga:
  llm:
    enabled: true  # Master switch for all LLM functionality
    default-provider: OPENAI  # Specifies the default LLM provider to use
    common:
      system-prompt: |
        You are a helpful assistant that analyzes books, comics, and other media.
        Provide detailed, insightful, and accurate responses.
      default-max-tokens: 1000 # Default maximum tokens for LLM responses
      default-temperature: 0.7  # Default creativity/randomness for LLM responses
      default-timeout: 30       # Default request timeout in seconds
      debug: false              # Enable/disable debug logging for the LLM module
```

### Provider-Specific Configurations

Below are examples of how individual providers might be configured. Note that `enabled: true` must be set for each provider you intend to use.

#### a. OpenAI

*   **Features:** Access to powerful models like GPT-3.5, GPT-4, and embedding models.
*   **Requires:** OpenAI API Key.

```yaml
openai:
  enabled: true
  api-key: ${OPENAI_API_KEY:}  # Best set via environment variable
  organization-id: ${OPENAI_ORGANIZATION_ID:} # Optional, via environment variable
  api-url: https://api.openai.com/v1
  model: gpt-4 # Or other preferred model
  embedding-model: text-embedding-ada-002
  temperature: 0.7
  max-tokens: 1000
  timeout-seconds: 30
  # Additional settings like max-retries, rate-limits may be available
```

#### b. Ollama (Local LLMs)

*   **Features:** Run open-source LLMs locally (e.g., Llama, Mistral).
*   **Requires:** Ollama service running and accessible.

```yaml
ollama:
  enabled: true
  api-url: http://localhost:11434 # Default Ollama API endpoint
  model: llama3:8b-instruct-q4_K_M # Example model, ensure it's pulled in Ollama
  temperature: 0.7
  max-tokens: 2000
  timeout-seconds: 120
  context-window: 4096 # Varies by model
```

#### c. LM Studio (Local LLMs)

*   **Features:** Interface with models run via the LM Studio application.
*   **Requires:** LM Studio running with its local server enabled.

```yaml
lmstudio:
  enabled: true
  api-url: http://localhost:1234/v1 # Default LM Studio server endpoint
  model: local-model # Model identifier as configured in LM Studio
  temperature: 0.7
  max-tokens: 2000
  timeout-seconds: 120
```

#### d. vLLM (Local LLMs)

*   **Features:** High-throughput serving of LLMs.
*   **Requires:** vLLM Python server running.

```yaml
vllm:
  enabled: true
  api-url: http://localhost:8000/v1 # Example vLLM server endpoint
  model: gpt2 # Or other model served by vLLM
  temperature: 0.7
  max-tokens: 2000
  timeout-seconds: 120
```

#### e. Google Vertex AI (NoteLM / Gemini - Cloud LLMs)

*   **Features:** Access to Google's LLMs like Gemini.
*   **Requires:** Google Cloud Project, enabled Vertex AI API, and authentication (e.g., service account key).

```yaml
google-note-lm: # Or a more generic name like 'google-vertex-ai'
  enabled: true
  api-key: ${GOOGLE_VERTEX_AI_API_KEY:} # Base64-encoded service account JSON, via env var
  project-id: ${GOOGLE_VERTEX_AI_PROJECT_ID:} # Via env var
  location: us-central1 # Or your preferred GCP region
  model: gemini-pro # Example model
  temperature: 0.7
  max-tokens: 1024
  timeout-seconds: 60
  api-url: https://us-central1-aiplatform.googleapis.com/v1 # Varies by region/API
```

**Note on Environment Variables:** It is best practice to supply sensitive information like API keys and project IDs through environment variables rather than hardcoding them in YAML files. The configuration examples use `${VAR_NAME:}` syntax to indicate this.

## 3. LLM-Related UI Components and User Interactions

*(This section will describe the current and planned UI elements. Specific details will depend on the actual implementation.)*

### Current UI (Status: To Be Verified)

*   **LLM Configuration Panel:** An administrative section within Komga's settings to:
    *   Select the active LLM provider.
    *   Input API keys or server URLs (though environment variables are preferred for sensitive data).
    *   Test LLM connectivity.
    *   Adjust basic parameters like default model, temperature, max tokens if not using provider defaults.
*   **(Potentially) Semantic Search Bar:** An enhanced search input that allows natural language queries for books or content within books.
*   **(Potentially) Book Analysis View:** A section on a book's detail page to display LLM-generated summaries, themes, or character analyses.

### Planned UI Enhancements

*   **Interactive Q&A Interface:** Allow users to "chat" with a book or a selection of books.
*   **Automated Tagging Suggestions:** UI for reviewing and applying LLM-suggested tags.
*   **Content Generation Tools:** (e.g., for fan fiction, alternative summaries, based on book content).
*   **Batch Analysis Controls:** UI to trigger and monitor LLM-based analysis for multiple books or entire libraries.
*   **User Feedback Mechanisms:** Allow users to rate the quality of LLM-generated content or provide corrections.

## 4. API Endpoints for LLM Interaction

The LLM module exposes REST API endpoints for internal and potentially external interactions. Examples (derived from `llm-README.md`):

*   `GET /api/v1/llm/providers`: List all configured and available LLM providers.
*   `GET /api/v1/llm/provider/active`: Get the currently active LLM provider.
*   `POST /api/v1/llm/provider/{providerId}/switch`: Switch the active LLM provider.
*   `POST /api/v1/llm/completions`: Endpoint to generate a text completion based on a prompt.
*   `POST /api/v1/llm/chat/completions`: Endpoint for chat-style completions with a history of messages.
*   `POST /api/v1/llm/embeddings`: Endpoint to create text embeddings.

These endpoints are used by the Komga backend to power AI features and could potentially be used by third-party tools or scripts interacting with your Komga instance if authentication/authorization allows.

## 5. Adding a New LLM Provider

The system is designed to be extensible. Adding a new provider generally involves:

1.  Creating a new Kotlin service class that implements the common `LlmService` interface.
2.  Adding necessary configuration properties (e.g., in `LlmConfig.kt` or a similar configuration class).
3.  Updating the `LlmServiceFactory` (or equivalent mechanism) to instantiate and manage the new provider.
4.  Adding auto-configuration logic if needed.
5.  Updating documentation and providing clear instructions for users.

This modular design ensures Komga can adapt to the rapidly evolving landscape of LLM providers and models.
