# AI Extensions - Part 3: Data Backend and Semantic Search

Effective AI-powered features, particularly those involving Retrieval Augmented Generation (RAG), rely heavily on a well-structured data backend for storing processed book content and robust semantic search capabilities. This section delves into how this Komga fork handles these aspects.

## 1. Vector Database: ChromaDB

A vector database is essential for RAG as it stores and allows efficient searching of vector embeddings, which are numerical representations of text chunks. This Komga fork utilizes ChromaDB for this purpose, as indicated in the technical documentation (`komga/docs/rag_and_ai_analysis.md`).

### a. Why ChromaDB?

ChromaDB is an open-source embedding database designed to be simple to use and integrate. Key features that make it suitable include:

*   **Ease of Setup:** Can be run locally with minimal configuration.
*   **Persistence:** Supports persisting data to disk (e.g., using DuckDB + Parquet for local storage).
*   **Metadata Storage:** Allows storing metadata alongside embeddings, crucial for linking chunks back to their source books and filtering searches.
*   **Python Client:** Provides a convenient Python client for interaction, fitting well with typical ML/NLP development stacks.

### b. Configuration and Setup

Setting up ChromaDB within the Komga ecosystem typically involves:

1.  **Installation:** ChromaDB can be installed as a Python package.
2.  **Client Initialization:** A `chromadb.Client` instance is created. Configuration might include:
    *   `persist_directory`: Specifies the on-disk location for database files (e.g., `./chroma_db`).
    *   `chroma_db_impl`: Defines the backend implementation (e.g., `duckdb+parquet`).
    *   `anonymized_telemetry`: Option to disable telemetry.
    ```python
    # Example from rag_and_ai_analysis.md
    import chromadb
    from chromadb.config import Settings

    client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory="./chroma_db_directory", # Ensure this path is correctly configured
        anonymized_telemetry=False
    ))
    ```
3.  **Collection Management:**
    *   A named **collection** is usually created to store embeddings for the Komga library (e.g., `komga_book_chunks`).
    *   The collection can be configured with a specific embedding function or model if ChromaDB is to handle embedding generation itself, though often embeddings are pre-generated by Komga's `EmbeddingGenerator` service.
    ```python
    # Example: Get or create a collection
    collection_name = "komga_library_embeddings"
    embedding_function = ... # Potentially a custom embedding function or a pre-defined one
    collection = client.get_or_create_collection(
        name=collection_name,
        # embedding_function=embedding_function, # If ChromaDB handles embeddings
        metadata={"hnsw:space": "cosine"} # Specify distance metric
    )
    ```

### c. Storing Data

When books are processed:

1.  Text is extracted and chunked.
2.  Embeddings are generated for each chunk.
3.  Each chunk's embedding, its original text content, and relevant metadata are added to the ChromaDB collection.
    *   **IDs:** Each entry needs a unique ID (e.g., `bookId_chunkIndex`).
    *   **Embeddings:** The numerical vector.
    *   **Documents:** The original text of the chunk.
    *   **Metadatas:** A dictionary containing information like `book_id`, `series_id`, `chunk_source_page`, `start_index` within the book, etc. This is vital for filtering and providing context.

    ```python
    # Example: Adding data to collection
    collection.add(
        ids=["book1_chunk1", "book1_chunk2"],
        embeddings=[[0.1, 0.2, ...], [0.3, 0.4, ...]],
        documents=["Text of chunk 1...", "Text of chunk 2..."],
        metadatas=[
            {"book_id": "book1", "page": 1, "source": "chapter_1"},
            {"book_id": "book1", "page": 2, "source": "chapter_1"}
        ]
    )
    ```

### d. Querying Data

When a semantic search or RAG query is performed:

1.  The user's query is converted into an embedding.
2.  This query embedding is used to search the ChromaDB collection.
    *   `query_embeddings`: The list of query embeddings (usually one).
    *   `n_results`: The number of most similar chunks to retrieve (e.g., 3-10).
    *   `where` (optional): A filter based on metadata (e.g., `{"book_id": "specific_book_id"}`) to restrict the search to a particular book or set of books.

    ```python
    # Example: Querying the collection
    query_embedding = [0.15, 0.25, ...] # Embedding of the user's query
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5,
        where={"book_id": "book_of_interest"} # Optional filter
    )
    # 'results' will contain the retrieved chunks, their distances, metadata, etc.
    ```

## 2. Text Chunking Strategies

Breaking down large texts into smaller, coherent chunks is critical for effective RAG. The quality of chunks directly impacts the relevance of retrieved context and, consequently, the LLM's output.

### a. Goals of Chunking

*   **Semantic Cohesion:** Chunks should ideally represent complete thoughts or semantic units.
*   **Manageable Size:** Chunks must be small enough to fit within the context window of embedding models and LLMs.
*   **Context Preservation:** Avoid losing critical context that spans across chunk boundaries.

### b. Implementation Details

As outlined in `komga/docs/rag_and_ai_analysis.md` and `chunk_02_rag_architecture.md`, a common approach involves:

*   **`RecursiveCharacterTextSplitter`:** (Often from libraries like Langchain) This splitter attempts to divide text along a predefined list of separators (e.g., `\n\n`, `\n`, ` ` (space), `.` (period), etc.), trying the first separator in the list, then the next if the chunks are still too large.
*   **Key Parameters:**
    *   `chunk_size`: The maximum desired size of a chunk (measured in characters or tokens).
    *   `chunk_overlap`: The number of characters/tokens that consecutive chunks will share. This helps maintain context across breaks. For example, if `chunk_size` is 1000 and `chunk_overlap` is 200, the second chunk will start 200 characters before the first one ended.
    *   `length_function`: Typically `len` for character count, but could be a tokenizer-based length for token count.
    *   `add_start_index`: Useful for including the starting position of the chunk within the original document as metadata.

```python
# Example from rag_and_ai_analysis.md (conceptual)
from langchain.text_splitter import RecursiveCharacterTextSplitter

class DocumentChunker:
    def __init__(self, chunk_size=1000, chunk_overlap=200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            add_start_index=True
        )
    
    def chunk_document(self, text: str, metadata: dict) -> list[dict]:
        # 'metadata' here could be base metadata like book_id
        # The splitter creates 'documents' (Langchain's term for chunks with content and metadata)
        langchain_documents = self.splitter.create_documents([text])
        
        processed_chunks = []
        for i, doc in enumerate(langchain_documents):
            chunk_metadata = metadata.copy() # Start with base metadata
            chunk_metadata.update(doc.metadata) # Add splitter's metadata (e.g., start_index)
            chunk_metadata['chunk_id'] = f"{metadata.get('book_id', 'unknown')}_{i}"
            processed_chunks.append({
                "text": doc.page_content,
                "metadata": chunk_metadata
            })
        return processed_chunks
```

### c. Considerations for Different Content Types

*   **Prose (Novels, Articles):** Sentence-aware or paragraph-aware splitting is often effective.
*   **Comics/Manga:** If text is primarily dialogue in bubbles, chunking might be per-page or per-panel if panel-level text extraction is feasible. Metadata linking to page/panel is crucial.
*   **Technical Documents/Code:** Chunking should respect code blocks or logical sections.

## 3. Semantic Search and LLM-Powered Query Enhancement

Semantic search goes beyond keyword matching; it aims to understand the *intent* and *meaning* behind a user's query.

### a. Core Semantic Search Flow

1.  **User Query:** User inputs a natural language query.
2.  **Query Embedding:** The query is converted into a vector embedding using the same model that embedded the document chunks.
3.  **Vector Similarity Search:** The query embedding is compared against all chunk embeddings in the vector database (ChromaDB). The database returns the top N most similar chunks.
4.  **Presenting Results:**
    *   Directly show the retrieved chunks (or snippets from them).
    *   Pass the retrieved chunks to an LLM (as in RAG) to synthesize an answer.

### b. LLM for Query Enhancement (Advanced)

LLMs can further improve semantic search by refining or expanding user queries:

*   **Query Disambiguation:** If a query is ambiguous, an LLM could ask clarifying questions or suggest alternative interpretations.
*   **Query Expansion:** An LLM could expand a short query with related terms or concepts to improve retrieval recall (e.g., user types "cat breeds," LLM expands to include "Siamese, Persian, Maine Coon, feline species").
*   **Hypothetical Document Embeddings (HyDE):** An LLM generates a hypothetical ideal answer/document for the user's query. This hypothetical document is then embedded, and its embedding is used for the similarity search. This can sometimes yield more relevant results than embedding the raw query directly.
*   **Natural Language to Structured Query:** For complex queries, an LLM could translate natural language into a structured query format that includes metadata filters for the vector database (e.g., "Find action scenes in Star Wars books published after 2010" -> search for "action scenes" + filter `series: Star Wars` AND `publication_year > 2010`).

Integrating these LLM-powered query enhancements adds another layer of sophistication to the search experience, making it more intuitive and powerful for users navigating their Komga library.
