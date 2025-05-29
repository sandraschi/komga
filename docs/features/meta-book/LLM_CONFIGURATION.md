# LLM Configuration for Meta Book Feature

The Meta Book feature supports both local and cloud-based LLMs for generating book analyses. This document explains how to configure each option.

## Table of Contents
- [Local LLM Setup](#local-llm-setup)
  - [Using Ollama](#using-ollama)
  - [Using LocalAI](#using-localai)
- [Cloud LLM Setup](#cloud-llm-setup)
  - [OpenAI API](#openai-api)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)

## Local LLM Setup

### Using Ollama

1. **Install Ollama**
   - Download and install from [Ollama's GitHub](https://github.com/ollama/ollama)
   - Start the Ollama server:
     ```bash
     ollama serve
     ```

2. **Pull a model**
   ```bash
   ollama pull llama3
   ```

3. **Configure Komga**
   Add to `application.yml` or set as environment variables:
   ```yaml
   komga:
     llm:
       local:
         enabled: true
         api-url: http://localhost:11434
         model: llama3
   ```

### Using LocalAI

1. **Install LocalAI**
   Follow the [LocalAI Quickstart](https://localai.io/basics/getting_started/)

2. **Configure Komga**
   ```yaml
   komga:
     llm:
       local:
         enabled: true
         api-url: http://localhost:8080
         model: your-model-name
   ```

## Cloud LLM Setup

### OpenAI API

1. **Get an API key**
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Create an API key in the dashboard

2. **Configure Komga**
   Set the API key as an environment variable or in `application.yml`:
   ```yaml
   komga:
     llm:
       openai:
         api-key: ${OPENAI_API_KEY}
         model: gpt-4
   ```

## Configuration Reference

### Local LLM Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `komga.llm.local.enabled` | `false` | Enable local LLM |
| `komga.llm.local.api-url` | `http://localhost:11434` | Local LLM server URL |
| `komga.llm.local.model` | `llama3` | Model to use |
| `komga.llm.local.temperature` | `0.7` | Generation temperature (0.0 to 1.0) |
| `komga.llm.local.timeout-seconds` | `300` | Request timeout |
| `komga.llm.local.max-tokens` | `2000` | Maximum tokens to generate |

### OpenAI Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `komga.llm.openai.api-key` | - | OpenAI API key (required) |
| `komga.llm.openai.model` | `gpt-4` | Model to use |
| `komga.llm.openai.api-url` | `https://api.openai.com` | OpenAI API URL |

## Troubleshooting

### Local LLM Issues

1. **Connection Refused**
   - Ensure the local LLM server is running
   - Verify the API URL and port

2. **Slow Responses**
   - Increase `timeout-seconds`
   - Reduce `max-tokens`
   - Use a smaller model

3. **Model Not Found**
   - Verify the model name is correct
   - For Ollama, ensure the model is downloaded

### OpenAI API Issues

1. **Authentication Failed**
   - Verify the API key is correct
   - Check for billing issues

2. **Rate Limited**
   - Implement rate limiting
   - Consider upgrading your plan

3. **Model Unavailable**
   - Check if the model name is correct
   - Verify your account has access to the model

## Performance Considerations

- Local LLMs require significant RAM and CPU/GPU resources
- Cloud LLMs have latency but require less local resources
- Adjust `max-tokens` based on your needs to balance quality and performance

## Security Considerations

- For OpenAI, use environment variables for API keys
- Local LLMs keep data on-premises
- Review the privacy policy of any cloud LLM provider

## Advanced Configuration

### Custom System Prompt

You can customize the system prompt for local LLMs:

```yaml
komga:
  llm:
    local:
      system-prompt: |
        You are an expert literary analyst. Provide detailed and insightful
        analyses of books, focusing on themes, characters, and narrative style.
        Be concise but thorough in your responses.
```

### Fallback Configuration

To fall back to OpenAI if local LLM fails:

```yaml
komga:
  llm:
    openai:
      api-key: ${OPENAI_API_KEY:}
    local:
      enabled: true
      api-url: http://localhost:11434
      model: llama3
      fallback-to-openai: true
```
