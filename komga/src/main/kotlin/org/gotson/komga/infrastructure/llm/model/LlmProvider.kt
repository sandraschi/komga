package org.gotson.komga.infrastructure.llm.model

/**
 * Represents different LLM providers.
 *
 * Each provider represents a different service or platform that provides
 * access to large language models with their own APIs and capabilities.
 */
enum class LlmProvider {
    /**
     * OpenAI's language models (e.g., GPT-4, GPT-3.5)
     *
     * Official API documentation: https://platform.openai.com/docs/api-reference
     */
    OPENAI,
    
    /**
     * Local models running via Ollama
     *
     * Ollama allows running models locally with a simple API.
     * GitHub: https://github.com/ollama/ollama
     */
    OLLAMA,
    
    /**
     * Local models running via LM Studio
     *
     * LM Studio provides a local server that mimics the OpenAI API.
     * Website: https://lmstudio.ai/
     */
    LM_STUDIO,
    
    /**
     * Local models running via vLLM
     *
     * vLLM is a high-throughput and memory-efficient inference and serving engine for LLMs.
     * GitHub: https://github.com/vllm-project/vllm
     */
    VLLM,
    
    /**
     * Google's NoteLM service
     *
     * NoteLM is a family of models designed for document understanding and question answering.
     * Website: https://noteable.google/
     */
    GOOGLE_NOTE_LM
}
