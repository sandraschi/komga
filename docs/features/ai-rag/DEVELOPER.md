# AI/RAG Integration - Developer Documentation

## Architecture Overview

The AI/RAG (Retrieval-Augmented Generation) system in Komga is designed with a modular architecture to support various AI models and processing pipelines.

### Core Components

1. **Content Processor**
   - Handles text extraction from different book formats
   - Chunks content into manageable segments
   - Applies preprocessing (tokenization, cleaning, etc.)

2. **Embedding Service**
   - Converts text into vector embeddings
   - Supports multiple embedding models (local and cloud-based)
   - Handles batch processing for efficiency

3. **Vector Store**
   - Stores and indexes vector embeddings
   - Enables efficient similarity search
   - Supports multiple backends (FAISS, Chroma, etc.)

4. **LLM Integration**
   - Interfaces with large language models
   - Manages API calls and rate limiting
   - Handles response processing and caching

5. **RAG Pipeline**
   - Combines retrieval and generation
   - Manages context windows and prompt engineering
   - Handles fallback mechanisms

## Implementation Details

### Data Models

```kotlin
// Content chunk with metadata and embedding
@Document(collection = "content_chunks")
data class ContentChunk(
    @Id
    val id: String = UUID.randomUUID().toString(),
    val bookId: String,
    val libraryId: String,
    val content: String,
    val pageNumber: Int? = null,
    val chunkIndex: Int,
    val embedding: FloatArray,
    val metadata: Map<String, Any> = emptyMap(),
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now()
)

// Search result with relevance score
data class SearchResult(
    val chunk: ContentChunk,
    val score: Float,
    val metadata: Map<String, Any> = emptyMap()
)
```

### API Endpoints

#### Search Content

```http
POST /api/v1/ai/search
Content-Type: application/json

{
  "query": "space exploration",
  "filters": {
    "libraryIds": ["lib1", "lib2"],
    "contentTypes": ["book", "comic"]
  },
  "limit": 10,
  "includeContext": true
}
```

#### Generate Summary

```http
POST /api/v1/ai/summarize
Content-Type: application/json

{
  "bookId": "book123",
  "length": "short", // short, medium, long
  "style": "descriptive" // descriptive, concise, academic
}
```

#### Get Similar Books

```http
GET /api/v1/ai/similar/{bookId}?limit=5
```

### Configuration

```yaml
ai:
  enabled: true
  provider: openai # or 'local', 'azure', 'anthropic'
  openai:
    apiKey: ${OPENAI_API_KEY}
    model: gpt-4
    embeddingModel: text-embedding-3-large
  local:
    modelPath: "./models/llama-2-7b"
    device: cuda # or cpu, mps
    contextWindow: 4096
  vectorStore:
    type: faiss # or 'chroma', 'qdrant'
    path: "./data/vector_store"
  processing:
    batchSize: 32
    maxConcurrent: 4
    chunkSize: 1000
    chunkOverlap: 200
```

## Integration Points

### Book Processing Pipeline

1. **On Book Add/Update**
   - Extract text content
   - Split into chunks
   - Generate embeddings
   - Store in vector database

2. **On Book Delete**
   - Remove associated chunks and embeddings

### Search Integration

```kotlin
interface AISearchService {
    suspend fun search(
        query: String,
        filters: SearchFilters,
        limit: Int = 10
    ): List<SearchResult>
    
    suspend fun findSimilar(
        bookId: String,
        limit: Int = 5
    ): List<SearchResult>
}
```

## Performance Considerations

1. **Embedding Generation**
   - Use batch processing for bulk operations
   - Cache embeddings when possible
   - Consider model size vs. accuracy trade-offs

2. **Vector Search**
   - Use approximate nearest neighbor (ANN) for large datasets
   - Optimize index building parameters
   - Consider sharding for very large libraries

3. **LLM Usage**
   - Implement rate limiting
   - Cache common queries
   - Use streaming for long-running generations

## Testing

### Unit Tests

- Test individual components in isolation
- Mock external services
- Test edge cases and error conditions

### Integration Tests

- Test the full pipeline with sample data
- Verify behavior with different model configurations
- Test performance with various input sizes

## Security Considerations

1. **Data Privacy**
   - Never log sensitive content
   - Implement proper access controls
   - Support data retention policies

2. **API Security**
   - Validate all inputs
   - Implement rate limiting
   - Use secure API key management

3. **Model Security**
   - Sanitize inputs to prevent prompt injection
   - Monitor for abuse
   - Implement content filtering

## Future Enhancements

- Support for custom models
- Fine-tuning on user's library
- Multi-modal analysis (images + text)
- Real-time collaboration features
- Advanced analytics and insights

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for general guidelines. For AI-specific contributions:

1. Document any new dependencies
2. Include performance benchmarks
3. Add tests for new features
4. Update documentation
