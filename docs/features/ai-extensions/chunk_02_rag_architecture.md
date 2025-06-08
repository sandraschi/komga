# AI Extensions - Part 2: RAG Architecture and Implementation

Retrieval Augmented Generation (RAG) is a key AI technique employed in this Komga fork to provide advanced understanding and interaction with your library's content. RAG enhances the capabilities of Large Language Models (LLMs) by grounding them in specific information retrieved from your books, leading to more accurate, relevant, and context-aware responses.

## 1. RAG System Overview

The RAG system in Komga allows users to perform semantic searches, ask questions about book content, and receive AI-generated analyses. It works by:

1.  **Indexing:** Processing books in your library, extracting text, dividing it into manageable chunks, and converting these chunks into numerical representations (embeddings) stored in a specialized database.
2.  **Retrieval:** When a user poses a query, the system converts the query into an embedding and searches the database for the most similar (semantically relevant) text chunks from your books.
3.  **Generation:** The retrieved text chunks, along with the original query and a carefully crafted prompt, are then fed to an LLM, which generates a coherent answer or analysis based on the provided context.

This approach ensures that the LLM's responses are not just based on its general training data but are specifically informed by the content of your Komga library.

### Conceptual Architecture

*(Referencing the architecture described in `komga/docs/rag_and_ai_analysis.md`)*

A typical RAG flow involves:

*   **Komga Server:** Initiates book processing or receives user queries.
*   **Document Processor:** Handles the ingestion of books.
    *   **Text Extractor:** Extracts raw text from various file formats (EPUB, PDF, etc.).
    *   **Chunking Service:** Splits the extracted text into smaller, semantically meaningful segments.
*   **Embedding Generator:** Converts text chunks into vector embeddings using a chosen model.
*   **Vector Database (e.g., ChromaDB):** Stores and indexes the embeddings for efficient similarity search.
*   **RAG Service:** Orchestrates the retrieval and generation process.
    *   Receives user query.
    *   Queries the Vector Database for relevant chunks.
    *   Constructs a prompt for the LLM using the query and retrieved context.
    *   Interacts with the configured **Local or Cloud LLM** to get the final response.
*   **(Optional) External APIs/Analysis Cache:** May be used for further context enrichment or caching results.

## 2. Document Processing Pipeline

For the RAG system to function, book content needs to be processed and indexed. This pipeline is crucial for preparing the data.

### a. Text Extraction

Komga needs to extract plain text from various book formats. This is typically achieved using a combination of libraries:

*   **EPUB:** Libraries like `ebooklib` (Python) can parse EPUB files, access their HTML content, and then tools like `BeautifulSoup` can strip HTML tags to get plain text.
*   **PDF:** Libraries like `PyMuPDF` (Fitz) or `pdfminer.six` are commonly used to extract text content from PDF files. OCR (Optical Character Recognition) might be needed for image-based PDFs, though this adds complexity.
*   **Other Formats (CBZ/CBR, TXT, etc.):**
    *   For comic archives (CBZ/CBR), if `ComicInfo.xml` contains detailed summaries or text, that could be extracted. OCR on comic pages is a more advanced and resource-intensive possibility.
    *   Plain text files are straightforward.

The system likely employs a `TextExtractor` class or service that intelligently handles different file extensions.

### b. Chunking Strategy

Once text is extracted, it's too long to be fed directly into an LLM or efficiently embedded. It needs to be broken down into smaller chunks.

*   **Method:** A common approach is `RecursiveCharacterTextSplitter` (e.g., from Langchain), which tries to split text based on a hierarchy of separators (like newlines, sentences, words) to keep semantic units together.
*   **Parameters:**
    *   `chunk_size`: The target size for each chunk (e.g., 500-1000 characters or tokens).
    *   `chunk_overlap`: A small overlap between consecutive chunks (e.g., 100-200 characters) helps maintain context across chunk boundaries.
    *   `length_function`: How the size of a chunk is measured (e.g., `len` for characters).
*   **Metadata:** Each chunk should retain metadata linking it back to the original book and its position within the book (e.g., page number, start index).

A `DocumentChunker` class or service would manage this process.

### c. Embedding Generation

Text chunks are converted into dense vector embeddings, which capture their semantic meaning.

*   **Embedding Model:** A specialized model is used for this (e.g., `nomic-embed-text`, `text-embedding-ada-002`, or models available via Ollama/LM Studio).
The choice of embedding model is important for the quality of semantic search.
*   **Process:** The `EmbeddingGenerator` service takes text chunks and uses the chosen embedding model (often via an API call to a local or cloud LLM provider) to produce a vector for each chunk.

## 3. Core RAG Components

These components work together to answer user queries.

### a. Vector Database

*   **Purpose:** Stores the embeddings of all document chunks and allows for efficient similarity searches.
*   **Implementation Example (ChromaDB):**
    *   **Client:** A ChromaDB client is initialized, often configured to persist data to disk.
    *   **Collection:** A collection is created within ChromaDB to hold the embeddings and their associated metadata (like book ID, chunk ID, original text).
    *   **Adding Data:** The `VectorStore` service takes the generated embeddings and their metadata and adds them to the collection.
    *   **Querying:** When a user query is received, its embedding is used to query the collection for the `n_results` (e.g., top 3-5) most similar chunks.

### b. RAG Service / System

This is the central orchestrator:

1.  **Input:** Takes a user's natural language query and optional filters (e.g., specific book ID).
2.  **Query Embedding:** Uses the `EmbeddingGenerator` to convert the user's query into an embedding.
3.  **Context Retrieval:** Queries the `VectorStore` with the query embedding to retrieve relevant text chunks.
4.  **Prompt Engineering:** Constructs a detailed prompt for the LLM. This prompt typically includes:
    *   A system message defining the LLM's role (e.g., "You are a helpful AI assistant...").
    *   The retrieved text chunks as context.
    *   The original user query.
5.  **LLM Interaction:** Sends the constructed prompt to the configured LLM (via the `LlmService` detailed in Part 1) to generate a response.
6.  **Output:** Returns the LLM's generated response, possibly along with source information (e.g., which book chunks were used as context).

## 4. RAG-Related UI Components and User Interactions

*(This section outlines potential UI elements. Actual implementation may vary.)*

*   **Semantic Search Bar:**
    *   Allows users to type natural language questions or descriptive searches (e.g., "books about space travel with a strong female protagonist" or "what are the main themes in Dune?").
    *   Results would not just be keyword matches but books or sections of books that are semantically relevant.
*   **Book-Specific Q&A:**
    *   On a book's detail page, an interface to ask questions specifically about that book's content.
    *   Example: "What was the main character's motivation for their actions in chapter 5?"
*   **Display of RAG Results:**
    *   Clear presentation of answers generated by the RAG system.
    *   Ideally, includes citations or links back to the source passages in the books that provided context for the answer, allowing users to verify or explore further.
*   **Analysis Sections:**
    *   Dedicated sections on book detail pages for AI-generated content like:
        *   Summaries (short, detailed).
        *   Key themes and motifs.
        *   Character analyses and relationships.
        *   Plot points.
*   **Feedback Mechanisms:**
    *   Options for users to rate the helpfulness or accuracy of RAG-generated responses, which could be used for future system improvements.

These UI components aim to make the powerful RAG capabilities accessible and useful to the end-user, transforming how they discover and interact with their Komga library.
